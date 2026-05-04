/**
 * ProntuarioScreen — Prontuário clínico completo
 * 4 seções expansíveis + auto-save + modal de validação ética
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { ChevronDown, ChevronRight, Lock, Save, Shield, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { saveClinicalNote, updateSessionStatus } from '../services/api/sessions';

// ─── Types ────────────────────────────────────────────────────────────────────
type SectionKey = 'queixa' | 'observacoes' | 'evolucao' | 'plano';

type NoteData = {
  queixa: string;
  observacoes: string;
  evolucao: string;
  plano: string;
  comentariosPrivados: string;
};

const SECTION_LABELS: Record<SectionKey, string> = {
  queixa: 'Queixa Principal',
  observacoes: 'Observacoes Clinicas',
  evolucao: 'Evolucao Terapeutica',
  plano: 'Plano Terapeutico',
};

const SECTION_PLACEHOLDERS: Record<SectionKey, string> = {
  queixa: 'Descreva a queixa principal do paciente nesta sessao...',
  observacoes: 'Observacoes sobre o comportamento, humor e apresentacao...',
  evolucao: 'Evolucao desde a ultima sessao, progressos e retrocessos...',
  plano: 'Intervencoes planejadas, proximos passos e objetivos...',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const serializeNote = (data: NoteData, patientName: string, sessionTime: string): string =>
  [
    `Paciente: ${patientName}`,
    `Sessao: ${sessionTime}`,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
    '=== QUEIXA PRINCIPAL ===',
    data.queixa || '(nao preenchido)',
    '',
    '=== OBSERVACOES CLINICAS ===',
    data.observacoes || '(nao preenchido)',
    '',
    '=== EVOLUCAO TERAPEUTICA ===',
    data.evolucao || '(nao preenchido)',
    '',
    '=== PLANO TERAPEUTICO ===',
    data.plano || '(nao preenchido)',
    '',
    '=== COMENTARIOS PRIVADOS ===',
    data.comentariosPrivados || '(nenhum)',
  ].join('\n');

// ─── Accordion Section ────────────────────────────────────────────────────────
function AccordionSection({
  sectionKey,
  isOpen,
  onToggle,
  value,
  onChange,
  theme,
}: {
  sectionKey: SectionKey;
  isOpen: boolean;
  onToggle: () => void;
  value: string;
  onChange: (text: string) => void;
  theme: typeof colors.light;
}) {
  return (
    <View style={[styles.accordionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.accordionTitle, { color: theme.foreground }]}>
          {SECTION_LABELS[sectionKey]}
        </Text>
        {isOpen ? (
          <ChevronDown size={18} color={theme.mutedForeground} />
        ) : (
          <ChevronRight size={18} color={theme.mutedForeground} />
        )}
      </TouchableOpacity>

      {isOpen && (
        <TextInput
          style={[styles.sectionInput, { color: theme.foreground, borderTopColor: theme.border }]}
          multiline
          value={value}
          onChangeText={onChange}
          placeholder={SECTION_PLACEHOLDERS[sectionKey]}
          placeholderTextColor={theme.mutedForeground}
          textAlignVertical="top"
        />
      )}
    </View>
  );
}

// ─── Ethics Modal ─────────────────────────────────────────────────────────────
function EthicsModal({
  visible,
  onClose,
  onConfirm,
  patientName,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  patientName: string;
  theme: typeof colors.light;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.ethicsModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.ethicsIcon}>
            <Shield size={32} color={theme.statusValidated} />
          </View>
          <Text style={[styles.ethicsTitle, { color: theme.foreground }]}>Validacao Etica</Text>
          <Text style={[styles.ethicsBody, { color: theme.mutedForeground }]}>
            Ao validar, confirmo que este prontuario de {patientName} foi registrado com precisao clinica,
            responsabilidade profissional e de acordo com o Codigo de Etica do Psicologo (CFP).
          </Text>

          <View style={styles.ethicsCommitments}>
            {[
              'Informacoes coletadas com consentimento',
              'Dados armazenados com sigilo profissional',
              'Registro fiel ao que ocorreu na sessao',
              'Conforme resolucao CFP 001/2009',
            ].map((item) => (
              <View key={item} style={styles.ethicsCommitmentRow}>
                <View style={[styles.ethicsCheckDot, { backgroundColor: theme.statusValidated }]} />
                <Text style={[styles.ethicsCommitmentText, { color: theme.foreground }]}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ethicsButtons}>
            <TouchableOpacity
              style={[styles.ethicsCancelBtn, { borderColor: theme.border }]}
              onPress={onClose}
            >
              <Text style={[styles.ethicsCancelText, { color: theme.mutedForeground }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ethicsConfirmBtn, { backgroundColor: theme.statusValidated }]}
              onPress={onConfirm}
            >
              <Lock size={16} color="#fff" />
              <Text style={styles.ethicsConfirmText}>Validar e Assinar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProntuarioScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const sessionId: string | undefined = route?.params?.sessionId;
  const patientName: string = route?.params?.patientName ?? 'Paciente';
  const sessionTime: string =
    route?.params?.sessionTime ??
    new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const initialContent: string = route?.params?.initialContent ?? '';

  // Note state
  const [noteData, setNoteData] = useState<NoteData>({
    queixa: initialContent,
    observacoes: '',
    evolucao: '',
    plano: '',
    comentariosPrivados: '',
  });
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(['queixa']));
  const [isSaving, setIsSaving] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [showEthicsModal, setShowEthicsModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPrivateComments, setShowPrivateComments] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteDataRef = useRef(noteData);
  noteDataRef.current = noteData;

  const doSave = useCallback(
    async (silent = false) => {
      if (!sessionId) return;
      if (!silent) setIsSaving(true);
      try {
        const content = serializeNote(noteDataRef.current, patientName, sessionTime);
        await saveClinicalNote(sessionId, content);
        setLastSaved(new Date());
      } catch (err: any) {
        if (!silent) Alert.alert('Nao foi possivel salvar', err?.message ?? 'Tente novamente.');
      } finally {
        if (!silent) setIsSaving(false);
      }
    },
    [sessionId, patientName, sessionTime],
  );

  // Auto-save after 10s of inactivity
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void doSave(true);
    }, 10000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [noteData, doSave]);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateSection = (key: SectionKey | 'comentariosPrivados', text: string) => {
    setNoteData((prev) => ({ ...prev, [key]: text }));
  };

  const handleValidate = () => {
    if (isValidated) {
      Alert.alert('Ja validado', 'Este prontuario ja foi validado e assinado.');
      return;
    }
    setShowEthicsModal(true);
  };

  const handleConfirmValidation = async () => {
    setShowEthicsModal(false);
    await doSave(false);
    if (sessionId) {
      try {
        await updateSessionStatus(sessionId, 'completed');
      } catch {}
    }
    setIsValidated(true);
    Alert.alert('Prontuario validado', 'O prontuario foi assinado e arquivado com sucesso.');
  };

  const statusText = isValidated
    ? 'Validado'
    : lastSaved
    ? `Rascunho — salvo às ${lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Rascunho';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.foreground }]}>{patientName}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.mutedForeground }]}>{sessionTime}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isValidated ? `${theme.statusValidated}20` : `${theme.statusDraft}20` }]}>
          <Text style={[styles.statusBadgeText, { color: isValidated ? theme.statusValidated : theme.statusDraft }]}>
            {statusText}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Sections */}
        {(['queixa', 'observacoes', 'evolucao', 'plano'] as SectionKey[]).map((key) => (
          <AccordionSection
            key={key}
            sectionKey={key}
            isOpen={openSections.has(key)}
            onToggle={() => toggleSection(key)}
            value={noteData[key]}
            onChange={(text) => updateSection(key, text)}
            theme={theme}
          />
        ))}

        {/* Private Comments */}
        <View style={[styles.accordionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setShowPrivateComments((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={styles.privateHeaderRow}>
              <Lock size={14} color={theme.mutedForeground} />
              <Text style={[styles.accordionTitle, { color: theme.foreground }]}>Comentarios Privados</Text>
            </View>
            {showPrivateComments ? (
              <ChevronDown size={18} color={theme.mutedForeground} />
            ) : (
              <ChevronRight size={18} color={theme.mutedForeground} />
            )}
          </TouchableOpacity>
          {showPrivateComments && (
            <TextInput
              style={[styles.sectionInput, { color: theme.foreground, borderTopColor: theme.border }]}
              multiline
              value={noteData.comentariosPrivados}
              onChangeText={(t) => updateSection('comentariosPrivados', t)}
              placeholder="Notas internas — nao compoe o prontuario oficial..."
              placeholderTextColor={theme.mutedForeground}
              textAlignVertical="top"
            />
          )}
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { borderColor: theme.border }]}
          onPress={() => void doSave(false)}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Save size={18} color={theme.primary} />
          )}
          <Text style={[styles.saveBtnText, { color: theme.primary }]}>Salvar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.validateBtn, { backgroundColor: isValidated ? theme.muted : theme.statusValidated }]}
          onPress={handleValidate}
          disabled={isValidated}
        >
          <Shield size={18} color="#fff" />
          <Text style={styles.validateBtnText}>{isValidated ? 'Validado' : 'Validar'}</Text>
        </TouchableOpacity>
      </View>

      <EthicsModal
        visible={showEthicsModal}
        onClose={() => setShowEthicsModal(false)}
        onConfirm={() => void handleConfirmValidation()}
        patientName={patientName}
        theme={theme}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 12,
  },
  statusBadgeText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  accordionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accordionTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
  },
  privateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionInput: {
    minHeight: 140,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 22,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  saveBtnText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600' },
  validateBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  validateBtnText: { color: '#fff', fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },

  // Ethics Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  ethicsModal: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  ethicsIcon: { alignItems: 'center', marginBottom: 4 },
  ethicsTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  ethicsBody: { fontFamily: 'Inter', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  ethicsCommitments: { gap: 10, marginVertical: 4 },
  ethicsCommitmentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ethicsCheckDot: { width: 8, height: 8, borderRadius: 4 },
  ethicsCommitmentText: { fontFamily: 'Inter', fontSize: 13, flex: 1 },
  ethicsButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  ethicsCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  ethicsCancelText: { fontFamily: 'Inter', fontSize: 14 },
  ethicsConfirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ethicsConfirmText: { color: '#fff', fontFamily: 'Inter', fontSize: 14, fontWeight: '700' },
});
