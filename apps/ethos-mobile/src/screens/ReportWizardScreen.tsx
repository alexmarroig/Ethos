/**
 * ReportWizardScreen — Wizard de 4 etapas para relatórios psicológicos
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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type Finalidade = 'profissional' | 'paciente' | 'institucional';
type TipoRelatorio = 'sessao' | 'laudo';

type ClinicalNote = {
  id: string;
  session_date: string;
  content: string;
  status: string;
};

type WizardState = {
  finalidade: Finalidade | null;
  tipoRelatorio: TipoRelatorio | null;
  selectedNoteIds: Set<string>;
  additionalNotes: string;
};

// ─── HTML builder ─────────────────────────────────────────────────────────────
function buildReportHtml(state: WizardState, notes: ClinicalNote[], patientName: string, clinicianName: string, crp: string): string {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const selectedNotes = notes.filter((n) => state.selectedNoteIds.has(n.id));

  const finalidadeText: Record<Finalidade, string> = {
    profissional: 'Uso profissional — referencia clínica interna',
    paciente: 'Entregue ao paciente',
    institucional: 'Destinado a instituicao ou orgao solicitante',
  };

  const tipoText: Record<TipoRelatorio, string> = {
    sessao: 'Relatorio de Sessao Psicologica',
    laudo: 'Laudo Psicologico Longitudinal',
  };

  const notesHtml = selectedNotes.map((n) => `
    <div style="margin-bottom: 24px; padding: 16px; border-left: 3px solid #234e5c; background: #f9f7f5;">
      <p style="font-weight: bold; margin: 0 0 8px; color: #234e5c;">${new Date(n.session_date).toLocaleDateString('pt-BR')}</p>
      <p style="margin: 0; white-space: pre-wrap;">${n.content}</p>
    </div>
  `).join('');

  return `<!DOCTYPE html><html><body style="font-family: Georgia, serif; max-width: 700px; margin: 40px auto; line-height: 1.8; color: #222;">
  <div style="text-align:center; border-bottom: 2px solid #234e5c; padding-bottom: 16px; margin-bottom: 32px;">
    <h1 style="font-size: 22px; color: #234e5c;">${tipoText[state.tipoRelatorio!]?.toUpperCase()}</h1>
    <p style="font-size: 13px; color: #555;">${clinicianName} · CRP ${crp}</p>
  </div>

  <h2>Identificacao</h2>
  <p><strong>Paciente:</strong> ${patientName}</p>
  <p><strong>Finalidade:</strong> ${finalidadeText[state.finalidade!]}</p>
  <p><strong>Data de emissao:</strong> ${today}</p>

  <h2>Conteudo Clinico</h2>
  ${notesHtml.length ? notesHtml : '<p>Nenhuma nota selecionada.</p>'}

  ${state.additionalNotes ? `<h2>Consideracoes Adicionais</h2><p style="white-space: pre-wrap;">${state.additionalNotes}</p>` : ''}

  <h2>Assinatura</h2>
  <div style="margin-top: 40px; text-align: center;">
    <div style="border-top: 1px solid #222; width: 280px; margin: 0 auto 8px;"></div>
    <p>${clinicianName}<br>CRP: ${crp}</p>
  </div>
</body></html>`;
}

// ─── Step indicators ──────────────────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps, theme }: { currentStep: number; totalSteps: number; theme: typeof colors.light }) {
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <View style={[
            styles.stepDot,
            {
              backgroundColor: i < currentStep ? theme.primary : i === currentStep ? theme.primary : theme.border,
              opacity: i === currentStep ? 1 : i < currentStep ? 0.6 : 0.3,
            },
          ]}>
            {i < currentStep && <Check size={10} color="#fff" />}
          </View>
          {i < totalSteps - 1 && (
            <View style={[styles.stepLine, { backgroundColor: i < currentStep ? theme.primary : theme.border }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReportWizardScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { user } = useAuth();
  const patientId: string | undefined = route?.params?.patientId;
  const patientName: string = route?.params?.patientName ?? 'Paciente';

  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [state, setState] = useState<WizardState>({
    finalidade: null,
    tipoRelatorio: null,
    selectedNoteIds: new Set(),
    additionalNotes: '',
  });

  const TOTAL_STEPS = 4;

  const loadNotes = useCallback(async () => {
    if (!patientId) return;
    setLoadingNotes(true);
    try {
      const res = await clinicalApiClient.request<any>(`/clinical-notes?patient_id=${patientId}`, { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setNotes(data);
    } catch {
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return state.finalidade !== null;
      case 1: return state.tipoRelatorio !== null;
      case 2: return true; // notes selection optional
      case 3: return true;
      default: return false;
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const html = buildReportHtml(state, notes, patientName, user?.name ?? 'Psicologo(a)', user?.crp ?? '00/000000');
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Relatorio gerado', `PDF salvo em: ${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel gerar o relatorio.');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Step renders ────────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.foreground }]}>Finalidade do Relatorio</Text>
      <Text style={[styles.stepSubtitle, { color: theme.mutedForeground }]}>Para que sera utilizado este relatorio?</Text>
      {([
        { value: 'profissional', label: 'Uso profissional', desc: 'Referencia clinica interna' },
        { value: 'paciente', label: 'Para o paciente', desc: 'Entregue diretamente ao paciente' },
        { value: 'institucional', label: 'Institucional', desc: 'Escola, empresa, orgao solicitante' },
      ] as { value: Finalidade; label: string; desc: string }[]).map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.optionCard,
            {
              backgroundColor: state.finalidade === opt.value ? `${theme.primary}15` : theme.card,
              borderColor: state.finalidade === opt.value ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setState((s) => ({ ...s, finalidade: opt.value }))}
        >
          <View style={styles.optionCardContent}>
            <Text style={[styles.optionCardLabel, { color: theme.foreground }]}>{opt.label}</Text>
            <Text style={[styles.optionCardDesc, { color: theme.mutedForeground }]}>{opt.desc}</Text>
          </View>
          {state.finalidade === opt.value && (
            <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
              <Check size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.foreground }]}>Tipo de Relatorio</Text>
      <Text style={[styles.stepSubtitle, { color: theme.mutedForeground }]}>Escolha o formato do documento.</Text>
      {([
        { value: 'sessao', label: 'Relatorio de Sessao', desc: 'Resumo das sessoes selecionadas' },
        { value: 'laudo', label: 'Laudo Longitudinal', desc: 'Avaliacao psicologica ao longo do tempo' },
      ] as { value: TipoRelatorio; label: string; desc: string }[]).map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.optionCard,
            {
              backgroundColor: state.tipoRelatorio === opt.value ? `${theme.primary}15` : theme.card,
              borderColor: state.tipoRelatorio === opt.value ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setState((s) => ({ ...s, tipoRelatorio: opt.value }))}
        >
          <View style={styles.optionCardContent}>
            <Text style={[styles.optionCardLabel, { color: theme.foreground }]}>{opt.label}</Text>
            <Text style={[styles.optionCardDesc, { color: theme.mutedForeground }]}>{opt.desc}</Text>
          </View>
          {state.tipoRelatorio === opt.value && (
            <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
              <Check size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.foreground }]}>Selecionar Notas</Text>
      <Text style={[styles.stepSubtitle, { color: theme.mutedForeground }]}>Escolha as notas clinicas para incluir.</Text>
      {loadingNotes ? (
        <ActivityIndicator color={theme.primary} />
      ) : notes.length === 0 ? (
        <View style={[styles.emptyNotes, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyNotesText, { color: theme.mutedForeground }]}>Nenhuma nota disponivel para este paciente.</Text>
        </View>
      ) : (
        notes.map((note) => {
          const selected = state.selectedNoteIds.has(note.id);
          return (
            <TouchableOpacity
              key={note.id}
              style={[
                styles.noteCard,
                {
                  backgroundColor: selected ? `${theme.primary}10` : theme.card,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                setState((s) => {
                  const next = new Set(s.selectedNoteIds);
                  if (next.has(note.id)) next.delete(note.id);
                  else next.add(note.id);
                  return { ...s, selectedNoteIds: next };
                });
              }}
            >
              <View style={styles.noteCardContent}>
                <Text style={[styles.noteCardDate, { color: theme.primary }]}>
                  {new Date(note.session_date).toLocaleDateString('pt-BR')}
                </Text>
                <Text style={[styles.noteCardPreview, { color: theme.mutedForeground }]} numberOfLines={2}>
                  {note.content}
                </Text>
              </View>
              <View style={[styles.noteCheckBox, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent' }]}>
                {selected && <Check size={12} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.foreground }]}>Revisao e Exportacao</Text>
      <Text style={[styles.stepSubtitle, { color: theme.mutedForeground }]}>Adicione observacoes finais e exporte.</Text>
      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Paciente</Text>
          <Text style={[styles.summaryValue, { color: theme.foreground }]}>{patientName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Finalidade</Text>
          <Text style={[styles.summaryValue, { color: theme.foreground }]}>{state.finalidade}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Tipo</Text>
          <Text style={[styles.summaryValue, { color: theme.foreground }]}>{state.tipoRelatorio}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Notas incluidas</Text>
          <Text style={[styles.summaryValue, { color: theme.foreground }]}>{state.selectedNoteIds.size}</Text>
        </View>
      </View>
      <Text style={[styles.additionalLabel, { color: theme.foreground }]}>Consideracoes adicionais (opcional)</Text>
      <TextInput
        style={[styles.additionalInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
        value={state.additionalNotes}
        onChangeText={(t) => setState((s) => ({ ...s, additionalNotes: t }))}
        multiline
        textAlignVertical="top"
        placeholder="Informacoes extras, recomendacoes, contexto institucional..."
        placeholderTextColor={theme.mutedForeground}
      />
    </View>
  );

  const STEP_RENDERS = [renderStep0, renderStep1, renderStep2, renderStep3];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.foreground }]}>
          Etapa {step + 1} de {TOTAL_STEPS}
        </Text>
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} theme={theme} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {STEP_RENDERS[step]?.()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Navigation buttons */}
      <View style={[styles.navBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.navBtnBack, { borderColor: theme.border, opacity: step === 0 ? 0.4 : 1 }]}
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft size={20} color={theme.foreground} />
          <Text style={[styles.navBtnBackText, { color: theme.foreground }]}>Voltar</Text>
        </TouchableOpacity>

        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={[styles.navBtnNext, { backgroundColor: canProceed() ? theme.primary : theme.muted }]}
            onPress={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            <Text style={styles.navBtnNextText}>Proximo</Text>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtnNext, { backgroundColor: theme.primary, opacity: generating ? 0.7 : 1 }]}
            onPress={() => void handleGenerate()}
            disabled={generating}
          >
            {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.navBtnNextText}>Exportar PDF</Text>}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  headerTitle: { fontFamily: 'Inter', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4 },
  scroll: { padding: 20 },
  stepContent: { gap: 14 },
  stepTitle: { fontFamily: 'Lora', fontSize: 22, fontWeight: '700' },
  stepSubtitle: { fontFamily: 'Inter', fontSize: 14, lineHeight: 22 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  optionCardContent: { flex: 1 },
  optionCardLabel: { fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },
  optionCardDesc: { fontFamily: 'Inter', fontSize: 13, marginTop: 3 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  noteCardContent: { flex: 1 },
  noteCardDate: { fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  noteCardPreview: { fontFamily: 'Inter', fontSize: 13, lineHeight: 20, marginTop: 2 },
  noteCheckBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotes: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyNotesText: { fontFamily: 'Inter', fontSize: 14 },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontFamily: 'Inter', fontSize: 13 },
  summaryValue: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  additionalLabel: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600', marginTop: 4 },
  additionalInput: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 22,
  },
  navBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  navBtnBack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  navBtnBackText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600' },
  navBtnNext: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  navBtnNextText: { color: '#fff', fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
});
