import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { createClinicalNote, fetchClinicalNote, updateClinicalNote } from '../services/api/clinicalNotes';
import { fetchPatientDetail } from '../services/api/patients';
import type { ClinicalNoteRecord, ClinicalNoteStructuredData, PatientDetailResponse } from '../services/api/types';

const EMPTY_VALUE = 'Nao informado';
const DEFAULT_TYPE = 'Sessao clinica';
const DEFAULT_MODALITY = 'Nao informada';
const DEFAULT_FREQUENCY = 'Nao informada';
const AUTO_SAVE_DELAY_MS = 2000;

const QUICK_MODE_SECTIONS = new Set([
  'complaint',
  'context',
  'soap',
  'events',
  'additional',
]);

type OpenSectionsState = {
  complaint: boolean;
  context: boolean;
  objectives: boolean;
  anamnesis: boolean;
  plan: boolean;
  soap: boolean;
  events: boolean;
  attachments: boolean;
  closure: boolean;
  additional: boolean;
};

type NoteMeta = {
  patientName: string;
  patientContact: string;
  psychologistName: string;
  psychologistCrp: string;
  sessionDate: string;
  modality: string;
  sessionType: string;
  frequency: string;
};

type CompletionMetric = {
  label: string;
  filled: boolean;
};

const cleanText = (value?: string | null) => value?.replace(/\r\n?/g, '\n').trim() ?? '';
const hasText = (value?: string | null) => cleanText(value).length > 0;
const hasNestedValues = (value?: Record<string, string | undefined>) =>
  Object.values(value ?? {}).some((item) => hasText(item));

const formatSessionDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Sessao nao informada';

const formatSessionDateOnly = (value?: string) =>
  value
    ? new Date(value).toISOString().slice(0, 10)
    : EMPTY_VALUE;

const formatTimeLabel = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const extractSection = (content: string, heading: RegExp, endHeadings: RegExp[]) => {
  const match = heading.exec(content);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  let end = rest.length;

  for (const pattern of endHeadings) {
    const result = pattern.exec(rest);
    if (result && result.index < end) {
      end = result.index;
    }
  }

  return cleanText(rest.slice(0, end));
};

const parseSoapField = (content: string, key: 'Subjetivo' | 'Objetivo' | 'Analise' | 'Plano') =>
  extractSection(
    content,
    new RegExp(`${key}\\):\\s*`, 'i'),
    [/^[SOAP] \(/m, /^## /m],
  );

const stripBulletLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)
    .join('\n');

const parseLegacyNote = (content: string) => {
  const normalized = cleanText(content);
  if (!normalized) {
    return {
      structuredData: {} as ClinicalNoteStructuredData,
      additionalNotes: '',
    };
  }

  const complaint =
    extractSection(normalized, /^## 3\. QUEIXA PRINCIPAL\s*/im, [/^## /im, /^S \(/im])
    || extractSection(normalized, /^## QUEIXA PRINCIPAL\s*/im, [/^## /im, /^S \(/im]);
  const context =
    extractSection(normalized, /^## 4\. CONTEXTO\s*/im, [/^## /im, /^S \(/im])
    || extractSection(normalized, /^## CONTEXTO ATUAL\s*/im, [/^## /im, /^S \(/im]);
  const objectivesRaw = extractSection(normalized, /^## 5\. OBJETIVOS\s*/im, [/^## /im]);
  const events = extractSection(normalized, /^## (9\. EVENTOS IMPORTANTES|PONTOS IMPORTANTES DA SESSAO)\s*/im, [/^## /im]);
  const additionalNotes = extractSection(normalized, /^## OBSERVACOES ADICIONAIS\s*/im, [/^## /im]);

  const structuredData: ClinicalNoteStructuredData = {
    complaint: complaint || undefined,
    context: context || undefined,
    objectives: objectivesRaw
      ? objectivesRaw
          .split('\n')
          .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
          .filter(Boolean)
      : undefined,
    soap: {
      subjective: parseSoapField(normalized, 'Subjetivo') || undefined,
      objective: parseSoapField(normalized, 'Objetivo') || undefined,
      assessment: parseSoapField(normalized, 'Analise') || undefined,
      plan: parseSoapField(normalized, 'Plano') || undefined,
    },
    events: events ? stripBulletLines(events) : undefined,
  };

  return {
    structuredData,
    additionalNotes: additionalNotes || (!complaint && !context && !events ? normalized : ''),
  };
};

const normalizeStructuredData = (value?: ClinicalNoteStructuredData | null): ClinicalNoteStructuredData => ({
  complaint: cleanText(value?.complaint) || undefined,
  context: cleanText(value?.context) || undefined,
  objectives: (value?.objectives ?? []).map((item) => cleanText(item)).filter(Boolean),
  anamnesis: {
    personal: cleanText(value?.anamnesis?.personal) || undefined,
    family: cleanText(value?.anamnesis?.family) || undefined,
    psychiatric: cleanText(value?.anamnesis?.psychiatric) || undefined,
    medication: cleanText(value?.anamnesis?.medication) || undefined,
    events: cleanText(value?.anamnesis?.events) || undefined,
  },
  plan: {
    approach: cleanText(value?.plan?.approach) || undefined,
    strategies: cleanText(value?.plan?.strategies) || undefined,
    interventions: cleanText(value?.plan?.interventions) || undefined,
  },
  soap: {
    subjective: cleanText(value?.soap?.subjective) || undefined,
    objective: cleanText(value?.soap?.objective) || undefined,
    assessment: cleanText(value?.soap?.assessment) || undefined,
    plan: cleanText(value?.soap?.plan) || undefined,
  },
  events: cleanText(value?.events) || undefined,
  closure: {
    date: cleanText(value?.closure?.date) || undefined,
    reason: cleanText(value?.closure?.reason) || undefined,
    summary: cleanText(value?.closure?.summary) || undefined,
    results: cleanText(value?.closure?.results) || undefined,
    recommendations: cleanText(value?.closure?.recommendations) || undefined,
  },
});

const bulletList = (items?: string[]) =>
  items && items.length > 0 ? items.map((item) => `- ${item}`) : ['- Nenhum objetivo registrado.'];

const valueOrFallback = (value?: string) => cleanText(value) || EMPTY_VALUE;

const buildFormattedContent = (
  structuredData: ClinicalNoteStructuredData,
  additionalNotes: string,
  meta: NoteMeta,
) => {
  const normalized = normalizeStructuredData(structuredData);

  return [
    '## 1. IDENTIFICACAO',
    `Paciente: ${meta.patientName}`,
    `Idade: ${EMPTY_VALUE}`,
    `Contato: ${meta.patientContact}`,
    `Psicologo(a): ${meta.psychologistName}`,
    `CRP: ${meta.psychologistCrp}`,
    '',
    '## 2. DADOS DA SESSAO',
    `Data: ${meta.sessionDate}`,
    `Modalidade: ${meta.modality}`,
    `Tipo: ${meta.sessionType}`,
    `Frequencia: ${meta.frequency}`,
    '',
    '## 3. QUEIXA PRINCIPAL',
    valueOrFallback(normalized.complaint),
    '',
    '## 4. CONTEXTO',
    valueOrFallback(normalized.context),
    '',
    '## 5. OBJETIVOS',
    ...bulletList(normalized.objectives),
    '',
    '## 6. ANAMNESE',
    `Historico pessoal: ${valueOrFallback(normalized.anamnesis?.personal)}`,
    `Historico familiar: ${valueOrFallback(normalized.anamnesis?.family)}`,
    `Historico psiquiatrico: ${valueOrFallback(normalized.anamnesis?.psychiatric)}`,
    `Medicacao: ${valueOrFallback(normalized.anamnesis?.medication)}`,
    `Eventos relevantes: ${valueOrFallback(normalized.anamnesis?.events)}`,
    '',
    '## 7. PLANO TERAPEUTICO',
    `Abordagem: ${valueOrFallback(normalized.plan?.approach)}`,
    `Estrategias: ${valueOrFallback(normalized.plan?.strategies)}`,
    `Intervencoes planejadas: ${valueOrFallback(normalized.plan?.interventions)}`,
    '',
    '## 8. EVOLUCAO DA SESSAO (SOAP)',
    `S (Subjetivo):\n${valueOrFallback(normalized.soap?.subjective)}`,
    '',
    `O (Objetivo):\n${valueOrFallback(normalized.soap?.objective)}`,
    '',
    `A (Analise):\n${valueOrFallback(normalized.soap?.assessment)}`,
    '',
    `P (Plano):\n${valueOrFallback(normalized.soap?.plan)}`,
    '',
    '## 9. EVENTOS IMPORTANTES',
    valueOrFallback(normalized.events),
    '',
    '## 10. ANEXOS',
    'Placeholder preparado para anexos futuros.',
    '',
    '## 11. ENCERRAMENTO',
    `Data: ${valueOrFallback(normalized.closure?.date)}`,
    `Motivo: ${valueOrFallback(normalized.closure?.reason)}`,
    `Resumo: ${valueOrFallback(normalized.closure?.summary)}`,
    `Resultados: ${valueOrFallback(normalized.closure?.results)}`,
    `Recomendacoes: ${valueOrFallback(normalized.closure?.recommendations)}`,
    ...(cleanText(additionalNotes)
      ? ['', '## OBSERVACOES ADICIONAIS', cleanText(additionalNotes)]
      : []),
  ].join('\n').trim();
};

const buildSnapshot = (
  structuredData: ClinicalNoteStructuredData,
  additionalNotes: string,
  meta: NoteMeta,
  targetSessionId?: string,
) =>
  JSON.stringify({
    sessionId: targetSessionId ?? '',
    meta,
    additionalNotes: cleanText(additionalNotes),
    structuredData: normalizeStructuredData(structuredData),
  });

const hasMeaningfulContent = (structuredData: ClinicalNoteStructuredData, additionalNotes: string) =>
  hasText(structuredData.complaint)
  || hasText(structuredData.context)
  || (structuredData.objectives ?? []).some((item) => hasText(item))
  || hasNestedValues(structuredData.anamnesis as Record<string, string | undefined> | undefined)
  || hasNestedValues(structuredData.plan as Record<string, string | undefined> | undefined)
  || hasNestedValues(structuredData.soap as Record<string, string | undefined> | undefined)
  || hasText(structuredData.events)
  || hasNestedValues(structuredData.closure as Record<string, string | undefined> | undefined)
  || hasText(additionalNotes);

const collectAiSuggestedFieldKeys = (structuredData: ClinicalNoteStructuredData) => {
  const fieldKeys = new Set<string>();
  const hasGeneratedSoap = hasNestedValues(structuredData.soap as Record<string, string | undefined> | undefined);

  if (!hasGeneratedSoap) return fieldKeys;

  if (hasText(structuredData.complaint)) fieldKeys.add('complaint');
  if (hasText(structuredData.context)) fieldKeys.add('context');
  if (hasText(structuredData.events)) fieldKeys.add('events');
  if (hasText(structuredData.soap?.subjective)) fieldKeys.add('soap.subjective');
  if (hasText(structuredData.soap?.objective)) fieldKeys.add('soap.objective');
  if (hasText(structuredData.soap?.assessment)) fieldKeys.add('soap.assessment');
  if (hasText(structuredData.soap?.plan)) fieldKeys.add('soap.plan');

  return fieldKeys;
};

const buildCompletionMetrics = (
  structuredData: ClinicalNoteStructuredData,
  additionalNotes: string,
): CompletionMetric[] => [
  { label: 'Queixa', filled: hasText(structuredData.complaint) },
  { label: 'Contexto', filled: hasText(structuredData.context) },
  { label: 'Objetivos', filled: (structuredData.objectives ?? []).some((item) => hasText(item)) },
  { label: 'Anamnese', filled: hasNestedValues(structuredData.anamnesis as Record<string, string | undefined> | undefined) },
  { label: 'Plano terapeutico', filled: hasNestedValues(structuredData.plan as Record<string, string | undefined> | undefined) },
  { label: 'SOAP', filled: hasNestedValues(structuredData.soap as Record<string, string | undefined> | undefined) },
  { label: 'Eventos', filled: hasText(structuredData.events) },
  { label: 'Encerramento', filled: hasNestedValues(structuredData.closure as Record<string, string | undefined> | undefined) },
  { label: 'Notas adicionais', filled: hasText(additionalNotes) },
];

const timelineLabel = (kind: string) => {
  if (kind === 'session') return 'Sessao';
  if (kind === 'clinical_note') return 'Nota';
  if (kind === 'document') return 'Documento';
  return 'Registro';
};

type SectionCardProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  theme: typeof colors.light;
  badge?: string;
};

function SectionCard({ title, open, onToggle, children, theme, badge }: SectionCardProps) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: theme.foreground }]}>{title}</Text>
          {badge ? <Text style={[styles.sectionBadge, { color: theme.primary }]}>{badge}</Text> : null}
        </View>
        {open ? <ChevronUp size={18} color={theme.mutedForeground} /> : <ChevronDown size={18} color={theme.mutedForeground} />}
      </TouchableOpacity>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

type LabeledInputProps = {
  label: string;
  value?: string;
  onChangeText?: (value: string) => void;
  theme: typeof colors.light;
  multiline?: boolean;
  editable?: boolean;
  highlight?: boolean;
  minHeight?: number;
};

function LabeledInput({
  label,
  value,
  onChangeText,
  theme,
  multiline = false,
  editable = true,
  highlight = false,
  minHeight,
}: LabeledInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: theme.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          minHeight ? { minHeight } : null,
          {
            color: theme.foreground,
            backgroundColor: editable ? theme.background : theme.card,
            borderColor: highlight ? theme.primary : theme.border,
            opacity: editable ? 1 : 0.9,
          },
        ]}
        value={value ?? ''}
        editable={editable}
        multiline={multiline}
        onChangeText={onChangeText}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={theme.mutedForeground}
      />
    </View>
  );
}

export default function ClinicalNoteEditorScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { user } = useAuth();

  const noteId = route.params?.noteId as string | undefined;
  const patientId = route.params?.patientId as string | undefined;
  const sessionId = route.params?.sessionId as string | undefined;
  const initialContent = route.params?.initialContent as string | undefined;

  const [detail, setDetail] = useState<PatientDetailResponse | null>(null);
  const [note, setNote] = useState<ClinicalNoteRecord | null>(null);
  const [structuredData, setStructuredData] = useState<ClinicalNoteStructuredData>({});
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [openSections, setOpenSections] = useState<OpenSectionsState>({
    complaint: true,
    context: false,
    objectives: false,
    anamnesis: false,
    plan: false,
    soap: true,
    events: false,
    attachments: false,
    closure: false,
    additional: false,
  });
  const [isQuickMode, setIsQuickMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const autoSaveReadyRef = useRef(false);
  const aiSuggestedFieldKeysRef = useRef<Set<string>>(new Set());
  const isSavingRef = useRef(false);

  useEffect(() => {
    let active = true;

    lastSavedSnapshotRef.current = null;
    autoSaveReadyRef.current = false;
    aiSuggestedFieldKeysRef.current = new Set();
    setAutoSaveError(null);
    setLastSavedAt(null);
    setIsLoading(true);

    const loadScreen = async () => {
      try {
        const [patientDetail, existingNote] = await Promise.all([
          patientId ? fetchPatientDetail(patientId) : Promise.resolve(null),
          noteId ? fetchClinicalNote(noteId) : Promise.resolve(null),
        ]);

        if (!active) return;

        const parsedInitial = initialContent ? parseLegacyNote(initialContent) : { structuredData: {}, additionalNotes: '' };
        const parsedExisting = existingNote?.content ? parseLegacyNote(existingNote.content) : { structuredData: {}, additionalNotes: '' };
        const initialStructuredData = normalizeStructuredData(
          existingNote?.structuredData
          ?? parsedExisting.structuredData
          ?? parsedInitial.structuredData,
        );
        const initialAdditionalNotes =
          parsedExisting.additionalNotes
          || parsedInitial.additionalNotes
          || '';

        aiSuggestedFieldKeysRef.current = collectAiSuggestedFieldKeys(initialStructuredData);
        setDetail(patientDetail);
        setNote(existingNote);
        setStructuredData(initialStructuredData);
        setAdditionalNotes(initialAdditionalNotes);
        setLastSavedAt(existingNote?.created_at ?? null);
      } catch (error: any) {
        if (active) {
          Alert.alert('Erro', error?.message ?? 'Nao foi possivel carregar a nota clinica.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadScreen();

    return () => {
      active = false;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [initialContent, noteId, patientId]);

  const currentSession = useMemo(
    () => detail?.sessions.find((session) => session.id === (note?.session_id ?? sessionId)) ?? null,
    [detail?.sessions, note?.session_id, sessionId],
  );

  const noteMeta = useMemo<NoteMeta>(() => ({
    patientName: detail?.patient.label ?? route.params?.patientName ?? EMPTY_VALUE,
    patientContact: [detail?.patient.phone, detail?.patient.email].filter(Boolean).join(' | ') || EMPTY_VALUE,
    psychologistName: user?.name ?? EMPTY_VALUE,
    psychologistCrp: ((user as any)?.crp as string | undefined) ?? EMPTY_VALUE,
    sessionDate: formatSessionDateOnly(currentSession?.scheduled_at),
    modality: ((currentSession as any)?.modality as string | undefined) ?? DEFAULT_MODALITY,
    sessionType: ((currentSession as any)?.type as string | undefined) ?? DEFAULT_TYPE,
    frequency: ((currentSession as any)?.frequency as string | undefined) ?? DEFAULT_FREQUENCY,
  }), [currentSession, detail?.patient.email, detail?.patient.label, detail?.patient.phone, route.params?.patientName, user]);

  const normalizedStructuredData = useMemo(
    () => normalizeStructuredData(structuredData),
    [structuredData],
  );

  const completionMetrics = useMemo(
    () => buildCompletionMetrics(normalizedStructuredData, additionalNotes),
    [additionalNotes, normalizedStructuredData],
  );

  const completionCount = completionMetrics.filter((metric) => metric.filled).length;
  const completionRatio = completionMetrics.length > 0 ? completionCount / completionMetrics.length : 0;

  const previousSessionLabel = useMemo(() => {
    const previousSession = [...(detail?.sessions ?? [])]
      .filter((session) => session.id !== currentSession?.id)
      .sort((left, right) => Date.parse(right.scheduled_at) - Date.parse(left.scheduled_at))[0];

    return previousSession ? formatSessionDate(previousSession.scheduled_at) : 'Primeira sessao registrada';
  }, [currentSession?.id, detail?.sessions]);

  const recentHistoryItems = useMemo(
    () =>
      (detail?.timeline ?? [])
        .filter((item) => item.related_id !== currentSession?.id && item.related_id !== note?.id)
        .slice(0, 2),
    [currentSession?.id, detail?.timeline, note?.id],
  );

  const quickHistoryPreview = useMemo(() => ({
    patientNotes: cleanText(detail?.patient.notes) || 'Sem historico resumido no cadastro.',
    noteCount: detail?.clinical_notes.length ?? 0,
    documentCount: detail?.documents.length ?? 0,
  }), [detail?.clinical_notes.length, detail?.documents.length, detail?.patient.notes]);

  const saveSnapshot = useMemo(
    () => buildSnapshot(normalizedStructuredData, additionalNotes, noteMeta, note?.session_id ?? sessionId),
    [additionalNotes, normalizedStructuredData, note?.session_id, noteMeta, sessionId],
  );

  const saveStatusLabel = useMemo(() => {
    if (isSubmitting || isAutoSaving) return 'Salvando silenciosamente...';
    if (autoSaveError) return 'Auto-save pausado. Toque em salvar se precisar confirmar.';
    if (lastSavedAt) return `Ultimo salvamento as ${formatTimeLabel(lastSavedAt)}`;
    return 'Alteracoes serao salvas automaticamente em 2 segundos.';
  }, [autoSaveError, isAutoSaving, isSubmitting, lastSavedAt]);

  const hasSoapPrefill = useMemo(
    () => hasNestedValues(normalizedStructuredData.soap as Record<string, string | undefined> | undefined),
    [normalizedStructuredData.soap],
  );

  useEffect(() => {
    if (isLoading || autoSaveReadyRef.current) return;
    lastSavedSnapshotRef.current = saveSnapshot;
    autoSaveReadyRef.current = true;
  }, [isLoading, saveSnapshot]);

  useEffect(() => {
    if (isLoading || !autoSaveReadyRef.current) return;
    if (lastSavedSnapshotRef.current === saveSnapshot) return;
    if (!note?.id && !hasMeaningfulContent(normalizedStructuredData, additionalNotes)) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      void persistNote('silent');
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [additionalNotes, isLoading, normalizedStructuredData, note?.id, saveSnapshot]);

  const isAiSuggestedField = (fieldKey: string) => aiSuggestedFieldKeysRef.current.has(fieldKey);

  const toggleSection = (key: keyof OpenSectionsState) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const updateStructuredData = (patch: Partial<ClinicalNoteStructuredData>) => {
    setAutoSaveError(null);
    setStructuredData((current) => ({ ...current, ...patch }));
  };

  const updateNestedSection = (
    key: 'anamnesis' | 'plan' | 'soap' | 'closure',
    patch: Record<string, string>,
  ) => {
    setAutoSaveError(null);
    setStructuredData((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? {}),
        ...patch,
      },
    }));
  };

  const updateObjective = (index: number, value: string) => {
    const nextObjectives = [...(normalizedStructuredData.objectives ?? [''])];
    nextObjectives[index] = value;
    updateStructuredData({ objectives: nextObjectives });
  };

  const addObjective = () => {
    updateStructuredData({ objectives: [...(normalizedStructuredData.objectives ?? []), ''] });
    setOpenSections((current) => ({ ...current, objectives: true }));
  };

  const removeObjective = (index: number) => {
    updateStructuredData({
      objectives: (normalizedStructuredData.objectives ?? []).filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const persistNote = async (mode: 'silent' | 'manual') => {
    const targetSessionId = note?.session_id ?? sessionId;
    if (!targetSessionId) {
      if (mode === 'manual') {
        Alert.alert('Sessao indisponivel', 'Nao foi possivel identificar a sessao desta nota.');
      }
      return null;
    }

    if (isSavingRef.current) {
      return null;
    }

    const formattedContent = buildFormattedContent(normalizedStructuredData, additionalNotes, noteMeta);
    const snapshot = buildSnapshot(normalizedStructuredData, additionalNotes, noteMeta, targetSessionId);

    if (mode === 'silent' && !note?.id && !hasMeaningfulContent(normalizedStructuredData, additionalNotes)) {
      return null;
    }

    try {
      isSavingRef.current = true;
      setAutoSaveError(null);
      if (mode === 'manual') {
        setIsSubmitting(true);
      } else {
        setIsAutoSaving(true);
      }

      const savedNote = note?.id
        ? await updateClinicalNote(note.id, {
            content: formattedContent,
            structuredData: normalizedStructuredData,
          })
        : await createClinicalNote({
            sessionId: targetSessionId,
            content: formattedContent,
            structuredData: normalizedStructuredData,
          });

      setNote(savedNote);
      setLastSavedAt(new Date().toISOString());
      lastSavedSnapshotRef.current = snapshot;
      return savedNote;
    } catch (error: any) {
      if (mode === 'manual') {
        Alert.alert('Erro', error?.message ?? 'Nao foi possivel salvar a nota clinica.');
      } else {
        setAutoSaveError(error?.message ?? 'Falha ao salvar automaticamente.');
      }
      return null;
    } finally {
      isSavingRef.current = false;
      if (mode === 'manual') {
        setIsSubmitting(false);
      } else {
        setIsAutoSaving(false);
      }
    }
  };

  const handleSave = async () => {
    const savedNote = await persistNote('manual');
    if (savedNote) {
      navigation.goBack();
    }
  };

  const shouldRenderSection = (sectionKey: keyof OpenSectionsState) =>
    !isQuickMode || QUICK_MODE_SECTIONS.has(sectionKey);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.metaCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>Paciente</Text>
          <Text style={[styles.metaValue, { color: theme.foreground }]}>{noteMeta.patientName}</Text>
          <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>Sessao</Text>
          <Text style={[styles.metaValue, { color: theme.foreground }]}>{formatSessionDate(currentSession?.scheduled_at)}</Text>
          <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>Responsavel</Text>
          <Text style={[styles.metaValue, { color: theme.foreground }]}>{noteMeta.psychologistName}</Text>
        </View>

        <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.historyTitle, { color: theme.foreground }]}>Historico rapido</Text>
          <Text style={[styles.historyLine, { color: theme.foreground }]}>Ultima sessao: {previousSessionLabel}</Text>
          <Text style={[styles.historyLine, { color: theme.foreground }]}>Notas registradas: {quickHistoryPreview.noteCount}</Text>
          <Text style={[styles.historyLine, { color: theme.foreground }]}>Documentos vinculados: {quickHistoryPreview.documentCount}</Text>
          <Text style={[styles.historyNotes, { color: theme.mutedForeground }]} numberOfLines={3}>
            {quickHistoryPreview.patientNotes}
          </Text>
          {recentHistoryItems.length > 0 ? (
            <View style={styles.recentList}>
              {recentHistoryItems.map((item) => (
                <Text key={item.id} style={[styles.recentItem, { color: theme.mutedForeground }]}>
                  {timelineLabel(item.kind)}: {item.title} ({new Date(item.date).toLocaleDateString('pt-BR')})
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.statusTitle, { color: theme.foreground }]}>Andamento da nota</Text>
            <Text style={[styles.statusValue, { color: theme.primary }]}>{completionCount}/{completionMetrics.length}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${Math.max(10, completionRatio * 100)}%` }]} />
          </View>
          <Text style={[styles.statusCaption, { color: autoSaveError ? '#c65a57' : theme.mutedForeground }]}>
            {saveStatusLabel}
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor: isQuickMode ? `${theme.primary}18` : theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setIsQuickMode((current) => !current)}
          >
            <Text style={[styles.toggleButtonText, { color: isQuickMode ? theme.primary : theme.foreground }]}>
              {isQuickMode ? 'Modo rapido ativo' : 'Modo rapido desativado'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setIsQuickMode((current) => !current)}
          >
            <Text style={[styles.toggleButtonText, { color: theme.foreground }]}>
              {isQuickMode ? 'Expandir nota completa' : 'Voltar ao modo rapido'}
            </Text>
          </TouchableOpacity>
        </View>

        {shouldRenderSection('complaint') ? (
          <SectionCard
            title="3. Queixa principal"
            open={openSections.complaint}
            onToggle={() => toggleSection('complaint')}
            theme={theme}
            badge={isAiSuggestedField('complaint') ? 'Sugestao de IA' : undefined}
          >
            <LabeledInput
              label="Descricao"
              value={normalizedStructuredData.complaint}
              onChangeText={(value) => updateStructuredData({ complaint: value })}
              theme={theme}
              multiline
              highlight={isAiSuggestedField('complaint')}
              minHeight={100}
            />
          </SectionCard>
        ) : null}

        {shouldRenderSection('context') ? (
          <SectionCard
            title="4. Contexto"
            open={openSections.context}
            onToggle={() => toggleSection('context')}
            theme={theme}
            badge={isAiSuggestedField('context') ? 'Sugestao de IA' : undefined}
          >
            <LabeledInput
              label="Contexto atual"
              value={normalizedStructuredData.context}
              onChangeText={(value) => updateStructuredData({ context: value })}
              theme={theme}
              multiline
              highlight={isAiSuggestedField('context')}
              minHeight={110}
            />
          </SectionCard>
        ) : null}

        {!isQuickMode ? (
          <SectionCard title="1. Identificacao" open theme={theme} onToggle={() => {}}>
            <LabeledInput label="Paciente" value={noteMeta.patientName} editable={false} theme={theme} />
            <LabeledInput label="Idade" value={EMPTY_VALUE} editable={false} theme={theme} />
            <LabeledInput label="Contato" value={noteMeta.patientContact} editable={false} theme={theme} />
            <LabeledInput label="Psicologo(a)" value={noteMeta.psychologistName} editable={false} theme={theme} />
            <LabeledInput label="CRP" value={noteMeta.psychologistCrp} editable={false} theme={theme} />
          </SectionCard>
        ) : null}

        {!isQuickMode ? (
          <SectionCard title="2. Dados da sessao" open theme={theme} onToggle={() => {}}>
            <LabeledInput label="Data" value={noteMeta.sessionDate} editable={false} theme={theme} />
            <LabeledInput label="Modalidade" value={noteMeta.modality} editable={false} theme={theme} />
            <LabeledInput label="Tipo" value={noteMeta.sessionType} editable={false} theme={theme} />
            <LabeledInput label="Frequencia" value={noteMeta.frequency} editable={false} theme={theme} />
          </SectionCard>
        ) : null}

        {!isQuickMode ? (
          <SectionCard title="5. Objetivos" open={openSections.objectives} onToggle={() => toggleSection('objectives')} theme={theme}>
            {(normalizedStructuredData.objectives ?? ['']).map((objective, index) => (
              <View key={`objective-${index}`} style={styles.objectiveRow}>
                <View style={styles.objectiveInput}>
                  <LabeledInput
                    label={`Objetivo ${index + 1}`}
                    value={objective}
                    onChangeText={(value) => updateObjective(index, value)}
                    theme={theme}
                  />
                </View>
                <TouchableOpacity style={[styles.smallIconButton, { borderColor: theme.border }]} onPress={() => removeObjective(index)}>
                  <Trash2 size={16} color={theme.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={addObjective}>
              <Plus size={16} color={theme.primary} />
              <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Adicionar objetivo</Text>
            </TouchableOpacity>
          </SectionCard>
        ) : null}

        {!isQuickMode ? (
          <SectionCard title="6. Anamnese" open={openSections.anamnesis} onToggle={() => toggleSection('anamnesis')} theme={theme}>
            <LabeledInput label="Historico pessoal" value={normalizedStructuredData.anamnesis?.personal} onChangeText={(value) => updateNestedSection('anamnesis', { personal: value })} theme={theme} multiline minHeight={90} />
            <LabeledInput label="Historico familiar" value={normalizedStructuredData.anamnesis?.family} onChangeText={(value) => updateNestedSection('anamnesis', { family: value })} theme={theme} multiline minHeight={90} />
            <LabeledInput label="Historico psiquiatrico" value={normalizedStructuredData.anamnesis?.psychiatric} onChangeText={(value) => updateNestedSection('anamnesis', { psychiatric: value })} theme={theme} multiline minHeight={90} />
            <LabeledInput label="Medicacao" value={normalizedStructuredData.anamnesis?.medication} onChangeText={(value) => updateNestedSection('anamnesis', { medication: value })} theme={theme} multiline minHeight={90} />
            <LabeledInput label="Eventos relevantes" value={normalizedStructuredData.anamnesis?.events} onChangeText={(value) => updateNestedSection('anamnesis', { events: value })} theme={theme} multiline minHeight={90} />
          </SectionCard>
        ) : null}

        {!isQuickMode ? (
          <SectionCard title="7. Plano terapeutico" open={openSections.plan} onToggle={() => toggleSection('plan')} theme={theme}>
            <LabeledInput label="Abordagem" value={normalizedStructuredData.plan?.approach} onChangeText={(value) => updateNestedSection('plan', { approach: value })} theme={theme} multiline minHeight={80} />
            <LabeledInput label="Estrategias" value={normalizedStructuredData.plan?.strategies} onChangeText={(value) => updateNestedSection('plan', { strategies: value })} theme={theme} multiline minHeight={80} />
            <LabeledInput label="Intervencoes planejadas" value={normalizedStructuredData.plan?.interventions} onChangeText={(value) => updateNestedSection('plan', { interventions: value })} theme={theme} multiline minHeight={80} />
          </SectionCard>
        ) : null}

        {shouldRenderSection('soap') ? (
          <SectionCard
            title="8. Evolucao da sessao (SOAP)"
            open={openSections.soap}
            onToggle={() => toggleSection('soap')}
            theme={theme}
            badge={hasSoapPrefill ? 'Preenchido pela transcricao' : undefined}
          >
            {hasSoapPrefill ? (
              <View style={[styles.highlightBanner, { backgroundColor: `${theme.primary}18` }]}>
                <Sparkles size={16} color={theme.primary} />
                <Text style={[styles.highlightText, { color: theme.primary }]}>Campos com sugestao de IA devem ser revisados antes de concluir a sessao.</Text>
              </View>
            ) : null}
            <LabeledInput label="Subjetivo" value={normalizedStructuredData.soap?.subjective} onChangeText={(value) => updateNestedSection('soap', { subjective: value })} theme={theme} multiline highlight={isAiSuggestedField('soap.subjective')} minHeight={110} />
            <LabeledInput label="Objetivo" value={normalizedStructuredData.soap?.objective} onChangeText={(value) => updateNestedSection('soap', { objective: value })} theme={theme} multiline highlight={isAiSuggestedField('soap.objective')} minHeight={110} />
            <LabeledInput label="Analise" value={normalizedStructuredData.soap?.assessment} onChangeText={(value) => updateNestedSection('soap', { assessment: value })} theme={theme} multiline highlight={isAiSuggestedField('soap.assessment')} minHeight={110} />
            <LabeledInput label="Plano" value={normalizedStructuredData.soap?.plan} onChangeText={(value) => updateNestedSection('soap', { plan: value })} theme={theme} multiline highlight={isAiSuggestedField('soap.plan')} minHeight={110} />
          </SectionCard>
        ) : null}

        {shouldRenderSection('events') ? (
          <SectionCard
            title="9. Eventos importantes"
            open={openSections.events}
            onToggle={() => toggleSection('events')}
            theme={theme}
            badge={isAiSuggestedField('events') ? 'Sugestao de IA' : undefined}
          >
            <LabeledInput
              label="Eventos relevantes"
              value={normalizedStructuredData.events}
              onChangeText={(value) => updateStructuredData({ events: value })}
              theme={theme}
              multiline
              highlight={isAiSuggestedField('events')}
              minHeight={110}
            />
          </SectionCard>
        ) : null}

        {!isQuickMode ? (
          <SectionCard title="10. Anexos" open={openSections.attachments} onToggle={() => toggleSection('attachments')} theme={theme}>
            <Text style={[styles.placeholderText, { color: theme.mutedForeground }]}>Espaco reservado para anexos e documentos de apoio em uma etapa futura.</Text>
          </SectionCard>
        ) : null}

        {!isQuickMode ? (
          <SectionCard title="11. Encerramento" open={openSections.closure} onToggle={() => toggleSection('closure')} theme={theme}>
            <LabeledInput label="Data" value={normalizedStructuredData.closure?.date} onChangeText={(value) => updateNestedSection('closure', { date: value })} theme={theme} />
            <LabeledInput label="Motivo" value={normalizedStructuredData.closure?.reason} onChangeText={(value) => updateNestedSection('closure', { reason: value })} theme={theme} multiline minHeight={80} />
            <LabeledInput label="Resumo" value={normalizedStructuredData.closure?.summary} onChangeText={(value) => updateNestedSection('closure', { summary: value })} theme={theme} multiline minHeight={90} />
            <LabeledInput label="Resultados" value={normalizedStructuredData.closure?.results} onChangeText={(value) => updateNestedSection('closure', { results: value })} theme={theme} multiline minHeight={90} />
            <LabeledInput label="Recomendacoes" value={normalizedStructuredData.closure?.recommendations} onChangeText={(value) => updateNestedSection('closure', { recommendations: value })} theme={theme} multiline minHeight={90} />
          </SectionCard>
        ) : null}

        {shouldRenderSection('additional') ? (
          <SectionCard title="Observacoes adicionais" open={openSections.additional} onToggle={() => toggleSection('additional')} theme={theme}>
            <LabeledInput
              label="Texto livre"
              value={additionalNotes}
              onChangeText={(value) => {
                setAutoSaveError(null);
                setAdditionalNotes(value);
              }}
              theme={theme}
              multiline
              minHeight={isQuickMode ? 180 : 220}
            />
          </SectionCard>
        ) : null}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={isSubmitting || isAutoSaving}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Salvar nota</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 14,
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  metaLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  metaValue: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 6,
  },
  historyTitle: {
    fontFamily: 'Lora',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyLine: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
  },
  historyNotes: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  recentList: {
    marginTop: 4,
    gap: 4,
  },
  recentItem: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
  },
  statusValue: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  statusCaption: {
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitleRow: {
    flex: 1,
    paddingRight: 12,
  },
  sectionTitle: {
    fontFamily: 'Lora',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionBadge: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter',
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 96,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  objectiveInput: {
    flex: 1,
  },
  smallIconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },
  highlightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  highlightText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
  },
  placeholderText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#234e5c',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
  },
});
