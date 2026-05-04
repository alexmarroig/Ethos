/**
 * PatientDreamDiaryScreen — Diário de sonhos em wizard de 4 etapas
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { ChevronLeft, ChevronRight, Moon, Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';

type DreamEntry = {
  id: string;
  title: string;
  narrative: string;
  emotions: string[];
  characters: string;
  setting: string;
  is_recurrent: boolean;
  interpretation: string;
  sleep_state: string;
  recorded_at: string;
};

type DraftEntry = {
  title: string;
  narrative: string;
  emotions: string[];
  emotionIntensity: number;
  characters: string;
  setting: string;
  is_recurrent: boolean;
  interpretation: string;
  sleep_state: string;
};

const EMOTION_OPTIONS = [
  { emoji: '😰', label: 'Ansiedade' },
  { emoji: '😢', label: 'Tristeza' },
  { emoji: '😄', label: 'Alegria' },
  { emoji: '😨', label: 'Medo' },
  { emoji: '😡', label: 'Raiva' },
  { emoji: '😊', label: 'Paz' },
  { emoji: '😕', label: 'Confusao' },
  { emoji: '🤩', label: 'Maravilhamento' },
  { emoji: '💔', label: 'Perda' },
  { emoji: '❤️', label: 'Amor' },
];

const SLEEP_STATES = ['Bem descansado', 'Cansado', 'Agitado', 'Aliviado', 'Perturbado'];

const EMPTY_DRAFT: DraftEntry = {
  title: '',
  narrative: '',
  emotions: [],
  emotionIntensity: 5,
  characters: '',
  setting: '',
  is_recurrent: false,
  interpretation: '',
  sleep_state: '',
};

function StepBar({ step, total, theme }: { step: number; total: number; theme: typeof colors.light }) {
  return (
    <View style={styles.stepBarRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stepBarSegment,
            {
              backgroundColor: i <= step ? theme.primary : theme.border,
              flex: 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function PatientDreamDiaryScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [entries, setEntries] = useState<DreamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState<DraftEntry>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const TOTAL_STEPS = 4;

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicalApiClient.request<any>('/patient/dream-diary', { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadEntries(); }, [loadEntries]);

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.narrative.trim()) {
      Alert.alert('Campos obrigatorios', 'Informe o titulo e a narrativa do sonho.');
      return;
    }
    setSaving(true);
    try {
      await clinicalApiClient.request('/patient/dream-diary', {
        method: 'POST',
        body: { ...draft, recorded_at: new Date().toISOString() },
      });
      setShowWizard(false);
      setDraft(EMPTY_DRAFT);
      setWizardStep(0);
      void loadEntries();
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err?.message ?? 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Wizard steps ─────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.foreground }]}>Basico</Text>
      <Text style={[styles.stepSubtitle, { color: theme.mutedForeground }]}>Data e narrativa do sonho</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
        value={draft.title}
        onChangeText={(t) => setDraft((d) => ({ ...d, title: t }))}
        placeholder="Titulo do sonho"
        placeholderTextColor={theme.mutedForeground}
      />
      <TextInput
        style={[styles.input, styles.inputMulti, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
        value={draft.narrative}
        onChangeText={(t) => setDraft((d) => ({ ...d, narrative: t }))}
        placeholder="Escreva a narrativa do sonho com detalhes..."
        placeholderTextColor={theme.mutedForeground}
        multiline
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.foreground }]}>Emocoes</Text>
      <Text style={[styles.stepSubtitle, { color: theme.mutedForeground }]}>O que você sentiu no sonho?</Text>
      <View style={styles.emotionsGrid}>
        {EMOTION_OPTIONS.map((opt) => {
          const selected = draft.emotions.includes(opt.label);
          return (
            <TouchableOpacity
              key={opt.label}
              style={[
                styles.emotionChip,
                {
                  backgroundColor: selected ? `${theme.primary}20` : theme.card,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                setDraft((d) => ({
                  ...d,
                  emotions: selected
                    ? d.emotions.filter((e) => e !== opt.label)
                    : [...d.emotions, opt.label],
                }));
              }}
            >
              <Text style={styles.emotionEmoji}>{opt.emoji}</Text>
              <Text style={[styles.emotionLabel, { color: selected ? theme.primary : theme.foreground }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.inputLabel, { color: theme.foreground }]}>Intensidade emocional: {draft.emotionIntensity}/10</Text>
      <View style={styles.intensityRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
          <TouchableOpacity
            key={v}
            style={[
              styles.intensityBtn,
              { backgroundColor: v <= draft.emotionIntensity ? theme.primary : theme.secondary },
            ]}
            onPress={() => setDraft((d) => ({ ...d, emotionIntensity: v }))}
          >
            <Text style={[styles.intensityBtnText, { color: v <= draft.emotionIntensity ? '#fff' : theme.mutedForeground }]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.foreground }]}>Detalhes</Text>
      <Text style={[styles.stepSubtitle, { color: theme.mutedForeground }]}>Personagens, cenario e recorrencia</Text>
      <Text style={[styles.inputLabel, { color: theme.foreground }]}>Personagens presentes</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
        value={draft.characters}
        onChangeText={(t) => setDraft((d) => ({ ...d, characters: t }))}
        placeholder="Quem apareceu no sonho?"
        placeholderTextColor={theme.mutedForeground}
      />
      <Text style={[styles.inputLabel, { color: theme.foreground }]}>Cenario</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
        value={draft.setting}
        onChangeText={(t) => setDraft((d) => ({ ...d, setting: t }))}
        placeholder="Onde se passou o sonho?"
        placeholderTextColor={theme.mutedForeground}
      />
      <TouchableOpacity
        style={[styles.toggleRow, { borderColor: theme.border }]}
        onPress={() => setDraft((d) => ({ ...d, is_recurrent: !d.is_recurrent }))}
      >
        <Text style={[styles.toggleLabel, { color: theme.foreground }]}>Sonho recorrente</Text>
        <View style={[styles.toggleBox, { backgroundColor: draft.is_recurrent ? theme.primary : theme.secondary, borderColor: draft.is_recurrent ? theme.primary : theme.border }]}>
          <Text style={{ color: draft.is_recurrent ? '#fff' : theme.mutedForeground, fontFamily: 'Inter', fontSize: 12 }}>
            {draft.is_recurrent ? 'Sim' : 'Nao'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.foreground }]}>Reflexao</Text>
      <Text style={[styles.stepSubtitle, { color: theme.mutedForeground }]}>Interpretacao e estado ao acordar</Text>
      <Text style={[styles.inputLabel, { color: theme.foreground }]}>Interpretacao pessoal (opcional)</Text>
      <TextInput
        style={[styles.input, styles.inputMulti, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
        value={draft.interpretation}
        onChangeText={(t) => setDraft((d) => ({ ...d, interpretation: t }))}
        placeholder="Como você interpreta este sonho?"
        placeholderTextColor={theme.mutedForeground}
        multiline
        textAlignVertical="top"
      />
      <Text style={[styles.inputLabel, { color: theme.foreground }]}>Estado ao acordar</Text>
      <View style={styles.sleepStatesRow}>
        {SLEEP_STATES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sleepChip, {
              backgroundColor: draft.sleep_state === s ? `${theme.primary}20` : theme.card,
              borderColor: draft.sleep_state === s ? theme.primary : theme.border,
            }]}
            onPress={() => setDraft((d) => ({ ...d, sleep_state: s }))}
          >
            <Text style={[styles.sleepChipText, { color: draft.sleep_state === s ? theme.primary : theme.foreground }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const STEP_RENDERS = [renderStep0, renderStep1, renderStep2, renderStep3];

  // ─── Main render ────────────────────────────────────────────────────────────
  if (showWizard) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.wizardHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => setShowWizard(false)}>
            <ChevronLeft size={24} color={theme.foreground} />
          </TouchableOpacity>
          <Text style={[styles.wizardHeaderTitle, { color: theme.foreground }]}>Novo Sonho</Text>
          <View style={{ width: 24 }} />
        </View>
        <StepBar step={wizardStep} total={TOTAL_STEPS} theme={theme} />
        <ScrollView contentContainerStyle={styles.wizardScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {STEP_RENDERS[wizardStep]?.()}
          <View style={{ height: 100 }} />
        </ScrollView>
        <View style={[styles.wizardNav, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.navBack, { borderColor: theme.border, opacity: wizardStep === 0 ? 0.4 : 1 }]}
            onPress={() => setWizardStep((s) => Math.max(0, s - 1))}
            disabled={wizardStep === 0}
          >
            <ChevronLeft size={20} color={theme.foreground} />
            <Text style={[styles.navBackText, { color: theme.foreground }]}>Voltar</Text>
          </TouchableOpacity>
          {wizardStep < TOTAL_STEPS - 1 ? (
            <TouchableOpacity
              style={[styles.navNext, { backgroundColor: theme.primary }]}
              onPress={() => setWizardStep((s) => s + 1)}
            >
              <Text style={styles.navNextText}>Proximo</Text>
              <ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navNext, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.navNextText}>Salvar Sonho</Text>}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.entriesList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Moon size={48} color={theme.muted} />
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Nenhum sonho registrado</Text>
              <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
                Registre seus sonhos para compartilhar com seu psicologo.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.entryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.entryHeader}>
                <View style={styles.entryHeaderLeft}>
                  <Text style={styles.entryEmoji}>
                    {item.emotions?.[0] ? EMOTION_OPTIONS.find((e) => e.label === item.emotions[0])?.emoji ?? '💭' : '💭'}
                  </Text>
                  <View>
                    <Text style={[styles.entryTitle, { color: theme.foreground }]}>{item.title}</Text>
                    <Text style={[styles.entryDate, { color: theme.mutedForeground }]}>
                      {new Date(item.recorded_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>
                {item.is_recurrent && (
                  <View style={[styles.recurrentBadge, { backgroundColor: `${theme.accent}20` }]}>
                    <Text style={[styles.recurrentText, { color: theme.accent }]}>Recorrente</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.entryNarrative, { color: theme.mutedForeground }]} numberOfLines={3}>
                {item.narrative}
              </Text>
              {item.emotions?.length > 0 && (
                <View style={styles.entryEmotions}>
                  {item.emotions.slice(0, 4).map((em) => (
                    <Text key={em} style={styles.entryEmotionChip}>
                      {EMOTION_OPTIONS.find((e) => e.label === em)?.emoji} {em}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        />
      )}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => { setDraft(EMPTY_DRAFT); setWizardStep(0); setShowWizard(true); }}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  entriesList: { padding: 16, gap: 12, paddingBottom: 80 },
  entryCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  entryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryEmoji: { fontSize: 32 },
  entryTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },
  entryDate: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  recurrentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  recurrentText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  entryNarrative: { fontFamily: 'Inter', fontSize: 13, lineHeight: 21 },
  entryEmotions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  entryEmotionChip: { fontFamily: 'Inter', fontSize: 12 },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  // Wizard
  wizardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  wizardHeaderTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '700' },
  stepBarRow: { flexDirection: 'row', height: 4, marginHorizontal: 0, gap: 2 },
  stepBarSegment: { height: 4 },
  wizardScroll: { padding: 20, gap: 16 },
  stepContent: { gap: 14 },
  stepTitle: { fontFamily: 'Lora', fontSize: 22, fontWeight: '700' },
  stepSubtitle: { fontFamily: 'Inter', fontSize: 14, lineHeight: 22 },
  input: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Inter', fontSize: 14,
  },
  inputMulti: { minHeight: 120 },
  inputLabel: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  emotionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emotionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  emotionEmoji: { fontSize: 18 },
  emotionLabel: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600' },
  intensityRow: { flexDirection: 'row', gap: 4 },
  intensityBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  intensityBtnText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
  toggleLabel: { fontFamily: 'Inter', fontSize: 15 },
  toggleBox: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  sleepStatesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sleepChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  sleepChipText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  wizardNav: {
    flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1,
  },
  navBack: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  navBackText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600' },
  navNext: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14,
  },
  navNextText: { color: '#fff', fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
});
