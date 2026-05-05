/**
 * SupervisionNotesScreen — Notas de supervisão clínica por paciente
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { BookOpen, ChevronDown, ChevronUp, Edit3, Plus, Trash2, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';
import { Pin, Tag } from '../lib/lucideCompat';

type Priority = 'low' | 'medium' | 'high';

type SupervisionNote = {
  id: string;
  patient_id: string;
  content: string;
  tags: string[];
  priority: Priority;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#6b9f78' },
  medium: { label: 'Média', color: '#edbd2a' },
  high: { label: 'Alta', color: '#bd3737' },
};

const PRESET_TAGS = [
  'Transferência', 'Resistência', 'Sonho', 'Insight', 'Crise',
  'Progresso', 'Regressão', 'Vínculo', 'Trauma', 'Limites',
];

// ─── Note Card ────────────────────────────────────────────────────────────────
function NoteCard({
  note,
  theme,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  note: SupervisionNote;
  theme: typeof colors.light;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pCfg = PRIORITY_CONFIG[note.priority];
  const preview = note.content.length > 120 ? note.content.slice(0, 120) + '...' : note.content;
  const needsExpand = note.content.length > 120;

  return (
    <View style={[styles.noteCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Top row */}
      <View style={styles.noteTop}>
        <View style={styles.noteTopLeft}>
          {note.pinned && (
            <View style={[styles.pinnedBadge, { backgroundColor: `${theme.primary}20` }]}>
              <Pin size={10} color={theme.primary} />
              <Text style={[styles.pinnedText, { color: theme.primary }]}>Fixada</Text>
            </View>
          )}
          <View style={[styles.priorityBadge, { backgroundColor: `${pCfg.color}20` }]}>
            <Text style={[styles.priorityText, { color: pCfg.color }]}>{pCfg.label}</Text>
          </View>
        </View>
        <View style={styles.noteActions}>
          <TouchableOpacity onPress={onTogglePin} style={styles.actionBtn}>
            <Pin size={16} color={note.pinned ? theme.primary : theme.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Edit3 size={16} color={theme.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Excluir nota?', 'Esta ação não pode ser desfeita.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: onDelete },
              ]);
            }}
            style={styles.actionBtn}
          >
            <Trash2 size={16} color={theme.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <Text style={[styles.noteContent, { color: theme.foreground }]}>
        {expanded || !needsExpand ? note.content : preview}
      </Text>
      {needsExpand && (
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={styles.expandBtn}>
          {expanded ? (
            <ChevronUp size={14} color={theme.mutedForeground} />
          ) : (
            <ChevronDown size={14} color={theme.mutedForeground} />
          )}
          <Text style={[styles.expandText, { color: theme.mutedForeground }]}>
            {expanded ? 'Mostrar menos' : 'Mostrar mais'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {note.tags.map((tag) => (
            <View key={tag} style={[styles.tagChip, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
              <Text style={[styles.tagText, { color: theme.foreground }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <Text style={[styles.noteDate, { color: theme.mutedForeground }]}>
        {new Date(note.updated_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

// ─── Note Editor Modal ────────────────────────────────────────────────────────
function NoteEditorModal({
  visible,
  note,
  patientId,
  onClose,
  onSaved,
  theme,
}: {
  visible: boolean;
  note: SupervisionNote | null;
  patientId: string;
  onClose: () => void;
  onSaved: (saved: SupervisionNote) => void;
  theme: typeof colors.light;
}) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [customTag, setCustomTag] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setSelectedTags(new Set(note.tags));
      setPriority(note.priority);
      setPinned(note.pinned);
    } else {
      setContent('');
      setSelectedTags(new Set());
      setPriority('medium');
      setPinned(false);
    }
    setCustomTag('');
  }, [note, visible]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (!tag) return;
    setSelectedTags((prev) => new Set([...prev, tag]));
    setCustomTag('');
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Conteúdo obrigatório', 'Escreva o conteúdo da nota antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        content: content.trim(),
        tags: Array.from(selectedTags),
        priority,
        pinned,
      };
      let res: SupervisionNote;
      if (note) {
        res = await clinicalApiClient.request<SupervisionNote>(
          `/supervision-notes/${note.id}`,
          { method: 'PATCH', body: payload },
        );
      } else {
        res = await clinicalApiClient.request<SupervisionNote>(
          `/patients/${patientId}/supervision-notes`,
          { method: 'POST', body: payload },
        );
      }
      onSaved(res);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar a nota.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.foreground }]}>
            {note ? 'Editar nota' : 'Nova nota de supervisão'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={theme.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
          {/* Content */}
          <Text style={[styles.fieldLabel, { color: theme.foreground }]}>Conteúdo</Text>
          <TextInput
            style={[styles.contentInput, { backgroundColor: theme.background, color: theme.foreground, borderColor: theme.border }]}
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="Observações clínicas para supervisão..."
            placeholderTextColor={theme.mutedForeground}
            textAlignVertical="top"
          />

          {/* Priority */}
          <Text style={[styles.fieldLabel, { color: theme.foreground }]}>Prioridade</Text>
          <View style={styles.priorityRow}>
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
              const cfg = PRIORITY_CONFIG[p];
              const active = priority === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: active ? cfg.color : theme.secondary,
                      borderColor: active ? cfg.color : theme.border,
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityChipText, { color: active ? '#fff' : theme.foreground }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Pin toggle */}
          <TouchableOpacity
            style={[styles.pinToggle, { borderColor: theme.border, backgroundColor: pinned ? `${theme.primary}15` : theme.secondary }]}
            onPress={() => setPinned((v) => !v)}
          >
            <Pin size={16} color={pinned ? theme.primary : theme.mutedForeground} />
            <Text style={[styles.pinToggleText, { color: pinned ? theme.primary : theme.foreground }]}>
              {pinned ? 'Nota fixada no topo' : 'Fixar nota no topo'}
            </Text>
          </TouchableOpacity>

          {/* Tags */}
          <Text style={[styles.fieldLabel, { color: theme.foreground }]}>Tags</Text>
          <View style={styles.tagsGrid}>
            {PRESET_TAGS.map((tag) => {
              const active = selectedTags.has(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: active ? theme.primary : theme.secondary,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, { color: active ? '#fff' : theme.foreground }]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom tag */}
          <View style={[styles.customTagRow, { borderColor: theme.border }]}>
            <TextInput
              style={[styles.customTagInput, { color: theme.foreground }]}
              value={customTag}
              onChangeText={setCustomTag}
              placeholder="Tag personalizada..."
              placeholderTextColor={theme.mutedForeground}
              onSubmitEditing={addCustomTag}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={addCustomTag} style={[styles.addTagBtn, { backgroundColor: theme.primary }]}>
              <Plus size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Active custom tags */}
          {Array.from(selectedTags).filter((t) => !PRESET_TAGS.includes(t)).length > 0 && (
            <View style={styles.customTagsList}>
              {Array.from(selectedTags)
                .filter((t) => !PRESET_TAGS.includes(t))
                .map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagText, { color: '#fff' }]}>{tag} ×</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{note ? 'Salvar alterações' : 'Criar nota'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
type Props = {
  route: { params: { patientId: string; patientName?: string } };
};

export default function SupervisionNotesScreen({ route }: Props) {
  const { patientId, patientName } = route.params;
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [notes, setNotes] = useState<SupervisionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<SupervisionNote | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicalApiClient.request<any>(
        `/patients/${patientId}/supervision-notes`,
        { method: 'GET' },
      );
      const data: SupervisionNote[] = Array.isArray(res) ? res : res?.data ?? [];
      setNotes(data);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const handleTogglePin = async (note: SupervisionNote) => {
    try {
      const updated = await clinicalApiClient.request<SupervisionNote>(
        `/supervision-notes/${note.id}`,
        { method: 'PATCH', body: { pinned: !note.pinned } },
      );
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível atualizar a nota.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await clinicalApiClient.request(`/supervision-notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível excluir a nota.');
    }
  };

  const handleSaved = (saved: SupervisionNote) => {
    setNotes((prev) => {
      const exists = prev.find((n) => n.id === saved.id);
      if (exists) return prev.map((n) => (n.id === saved.id ? saved : n));
      return [saved, ...prev];
    });
    setShowEditor(false);
    setEditingNote(null);
  };

  // Sort: pinned first, then by date desc
  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              theme={theme}
              onEdit={() => {
                setEditingNote(item);
                setShowEditor(true);
              }}
              onDelete={() => void handleDelete(item.id)}
              onTogglePin={() => void handleTogglePin(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <BookOpen size={48} color={theme.muted} />
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Sem notas de supervisão</Text>
              <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
                Registre observações clínicas para supervisão de {patientName ?? 'este paciente'}.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => {
          setEditingNote(null);
          setShowEditor(true);
        }}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <NoteEditorModal
        visible={showEditor}
        note={editingNote}
        patientId={patientId}
        onClose={() => {
          setShowEditor(false);
          setEditingNote(null);
        }}
        onSaved={handleSaved}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12, paddingBottom: 80 },
  noteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  noteTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteTopLeft: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  pinnedText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  noteActions: { flexDirection: 'row', gap: 0 },
  actionBtn: { padding: 6 },
  noteContent: { fontFamily: 'Inter', fontSize: 14, lineHeight: 22 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandText: { fontFamily: 'Inter', fontSize: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600' },
  noteDate: { fontFamily: 'Inter', fontSize: 11 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '700', flex: 1 },
  modalBody: { flex: 1 },
  fieldLabel: { fontFamily: 'Inter', fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  contentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  priorityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
  },
  priorityChipText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  pinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  pinToggleText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  customTagInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'Inter', fontSize: 13 },
  addTagBtn: { padding: 12 },
  customTagsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 12, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
