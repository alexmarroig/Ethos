/**
 * AnamnesisScreen — Anamnese estruturada com templates
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { ChevronDown, ChevronRight, Save } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';

type TemplateType = 'inicial' | 'seguimento' | 'infantil';

type AnamnesisSection = {
  id: string;
  title: string;
  fields: Array<{ key: string; label: string; multiline?: boolean }>;
};

const TEMPLATES: Record<TemplateType, AnamnesisSection[]> = {
  inicial: [
    {
      id: 'identification',
      title: 'Identificacao',
      fields: [
        { key: 'nome', label: 'Nome completo' },
        { key: 'data_nascimento', label: 'Data de nascimento' },
        { key: 'estado_civil', label: 'Estado civil' },
        { key: 'profissao', label: 'Profissao' },
        { key: 'escolaridade', label: 'Escolaridade' },
        { key: 'religiao', label: 'Religiao (opcional)' },
      ],
    },
    {
      id: 'queixa',
      title: 'Queixa e Demanda',
      fields: [
        { key: 'queixa_principal', label: 'Queixa principal', multiline: true },
        { key: 'inicio_sintomas', label: 'Quando iniciaram os sintomas', multiline: true },
        { key: 'expectativa', label: 'O que espera da psicoterapia', multiline: true },
      ],
    },
    {
      id: 'historico',
      title: 'Historico Clinico',
      fields: [
        { key: 'tratamentos_anteriores', label: 'Tratamentos psicologicos anteriores', multiline: true },
        { key: 'medicamentos', label: 'Medicamentos em uso', multiline: true },
        { key: 'problemas_saude', label: 'Problemas de saude relevantes', multiline: true },
        { key: 'historico_familiar', label: 'Historico familiar de saude mental', multiline: true },
      ],
    },
    {
      id: 'social',
      title: 'Historia Social e Familiar',
      fields: [
        { key: 'composicao_familiar', label: 'Composicao familiar', multiline: true },
        { key: 'relacionamentos', label: 'Relacionamentos afetivos', multiline: true },
        { key: 'trabalho', label: 'Situacao profissional e satisfacao', multiline: true },
        { key: 'suporte_social', label: 'Rede de suporte social', multiline: true },
      ],
    },
    {
      id: 'habitos',
      title: 'Habitos e Estilo de Vida',
      fields: [
        { key: 'sono', label: 'Qualidade e padrao do sono' },
        { key: 'alimentacao', label: 'Habitos alimentares' },
        { key: 'atividade_fisica', label: 'Atividade fisica' },
        { key: 'substancias', label: 'Uso de alcool, tabaco ou outras substancias' },
      ],
    },
  ],
  seguimento: [
    {
      id: 'evolucao',
      title: 'Evolucao desde ultima sessao',
      fields: [
        { key: 'eventos_relevantes', label: 'Eventos relevantes no periodo', multiline: true },
        { key: 'humor_geral', label: 'Humor e estado emocional geral' },
        { key: 'sono_apetite', label: 'Sono e apetite' },
        { key: 'sintomas', label: 'Sintomas presentes ou ausentes', multiline: true },
      ],
    },
    {
      id: 'objetivos',
      title: 'Objetivos Terapeuticos',
      fields: [
        { key: 'progresso', label: 'Progresso nos objetivos definidos', multiline: true },
        { key: 'dificuldades', label: 'Dificuldades encontradas', multiline: true },
        { key: 'proximos_passos', label: 'Proximos passos propostos', multiline: true },
      ],
    },
  ],
  infantil: [
    {
      id: 'crianca',
      title: 'Dados da Crianca',
      fields: [
        { key: 'nome', label: 'Nome da crianca' },
        { key: 'idade', label: 'Idade' },
        { key: 'escola', label: 'Escola e serie' },
        { key: 'convive_com', label: 'Com quem convive' },
      ],
    },
    {
      id: 'gestacao',
      title: 'Historia Gestacional e do Desenvolvimento',
      fields: [
        { key: 'gestacao', label: 'Intercorrencias na gestacao', multiline: true },
        { key: 'parto', label: 'Tipo de parto e intercorrencias' },
        { key: 'amamentacao', label: 'Amamentacao' },
        { key: 'marcos_desenvolvimento', label: 'Marcos do desenvolvimento (fala, marcha, controle esfincteriano)', multiline: true },
      ],
    },
    {
      id: 'queixa_infantil',
      title: 'Queixa e Demanda',
      fields: [
        { key: 'queixa_responsavel', label: 'Queixa do responsavel', multiline: true },
        { key: 'queixa_crianca', label: 'Como a crianca relata o problema (quando aplicavel)', multiline: true },
        { key: 'relacoes_familiares', label: 'Relacoes familiares e dinamica', multiline: true },
        { key: 'escola_relacoes', label: 'Relacoes na escola com colegas e professores', multiline: true },
      ],
    },
  ],
};

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  inicial: 'Anamnese Inicial',
  seguimento: 'Seguimento',
  infantil: 'Infantil',
};

export default function AnamnesisScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const patientId: string = route?.params?.patientId;
  const patientName: string = route?.params?.patientName ?? 'Paciente';

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('inicial');
  const [data, setData] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['identification', 'evolucao', 'crianca']));
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const doSave = useCallback(
    async (silent = false) => {
      if (!patientId) return;
      if (!silent) setSaving(true);
      try {
        await clinicalApiClient.request(`/patients/${patientId}/anamnesis`, {
          method: 'POST',
          body: {
            template: selectedTemplate,
            data: dataRef.current,
            recorded_at: new Date().toISOString(),
          },
        });
        setLastSaved(new Date());
      } catch (err: any) {
        if (!silent) Alert.alert('Erro ao salvar', err?.message ?? 'Tente novamente.');
      } finally {
        if (!silent) setSaving(false);
      }
    },
    [patientId, selectedTemplate],
  );

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => void doSave(true), 10000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [data, doSave]);

  const updateField = (key: string, value: string) => {
    setData((prev) => ({ ...prev, [`${selectedTemplate}_${key}`]: value }));
  };

  const getFieldValue = (key: string) => data[`${selectedTemplate}_${key}`] ?? '';

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sections = TEMPLATES[selectedTemplate];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.foreground }]}>Anamnese</Text>
          <Text style={[styles.headerPatient, { color: theme.mutedForeground }]}>{patientName}</Text>
        </View>
        {lastSaved && (
          <Text style={[styles.savedText, { color: theme.mutedForeground }]}>
            Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>

      {/* Template selector */}
      <View style={[styles.templateRow, { borderBottomColor: theme.border }]}>
        {(Object.keys(TEMPLATE_LABELS) as TemplateType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.templateChip,
              {
                backgroundColor: selectedTemplate === t ? theme.primary : theme.secondary,
                borderColor: selectedTemplate === t ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setSelectedTemplate(t)}
          >
            <Text style={[styles.templateChipText, { color: selectedTemplate === t ? '#fff' : theme.foreground }]}>
              {TEMPLATE_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section) => (
          <View key={section.id} style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTitle, { color: theme.foreground }]}>{section.title}</Text>
              {expandedSections.has(section.id) ? (
                <ChevronDown size={18} color={theme.mutedForeground} />
              ) : (
                <ChevronRight size={18} color={theme.mutedForeground} />
              )}
            </TouchableOpacity>

            {expandedSections.has(section.id) && (
              <View style={[styles.fieldsContainer, { borderTopColor: theme.border }]}>
                {section.fields.map((field) => (
                  <View key={field.key} style={styles.fieldRow}>
                    <Text style={[styles.fieldLabel, { color: theme.foreground }]}>{field.label}</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        field.multiline && styles.fieldInputMulti,
                        { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground },
                      ]}
                      value={getFieldValue(field.key)}
                      onChangeText={(t) => updateField(field.key, t)}
                      multiline={field.multiline}
                      textAlignVertical={field.multiline ? 'top' : undefined}
                      placeholder="..."
                      placeholderTextColor={theme.mutedForeground}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom save */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={() => void doSave(false)}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Save size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Salvar Anamnese</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '700' },
  headerPatient: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  savedText: { fontFamily: 'Inter', fontSize: 12 },
  templateRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  templateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  templateChipText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600' },
  scroll: { padding: 16, gap: 12 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600' },
  fieldsContainer: { borderTopWidth: 1, padding: 14, gap: 12 },
  fieldRow: { gap: 6 },
  fieldLabel: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  fieldInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter',
    fontSize: 14,
  },
  fieldInputMulti: { minHeight: 100 },
  footer: { padding: 16, borderTopWidth: 1 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: { color: '#fff', fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },
});
