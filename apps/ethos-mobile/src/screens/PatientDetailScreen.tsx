import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, FileText, PenSquare, Plus, Save, X } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { fetchPatientDetail, updatePatient } from '../services/api/patients';
import { createDocument } from '../services/api/documents';
import { createContract, sendContract } from '../services/api/contracts';
import { createReport } from '../services/api/reports';
import type { EmotionalDiaryEntryRecord, PatientDetailResponse, SessionRecord } from '../services/api/types';

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Nao definido';

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Nao definido';

const formatCurrency = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    : 'Nao definido';

const moodEmoji = (mood: EmotionalDiaryEntryRecord['mood']) => {
  if (mood <= 1) return '😞';
  if (mood === 2) return '🙂';
  if (mood === 3) return '😐';
  if (mood === 4) return '😊';
  return '😁';
};

type PatientFormState = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  birth_date: string;
  address: string;
  cpf: string;
  main_complaint: string;
  psychiatric_medications: string;
  has_psychiatric_followup: boolean;
  psychiatrist_name: string;
  psychiatrist_contact: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
  billing_mode: 'per_session' | 'package';
  session_price: string;
  package_total_price: string;
  package_session_count: string;
};

const emptyForm: PatientFormState = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  birth_date: '',
  address: '',
  cpf: '',
  main_complaint: '',
  psychiatric_medications: '',
  has_psychiatric_followup: false,
  psychiatrist_name: '',
  psychiatrist_contact: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  notes: '',
  billing_mode: 'per_session',
  session_price: '',
  package_total_price: '',
  package_session_count: '',
};

const toInputDate = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const buildDocumentTitle = (patientName: string, label: string) => `${label} - ${patientName}`;

export default function PatientDetailScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { user } = useAuth();
  const patientId = route.params?.patientId as string;

  const [detail, setDetail] = useState<PatientDetailResponse | null>(null);
  const [form, setForm] = useState<PatientFormState>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [shortcutLoading, setShortcutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrateForm = (response: PatientDetailResponse) => {
    setForm({
      name: response.patient.label,
      email: response.patient.email ?? '',
      phone: response.patient.phone ?? '',
      whatsapp: response.patient.whatsapp ?? response.patient.phone ?? '',
      birth_date: toInputDate(response.patient.birth_date),
      address: response.patient.address ?? '',
      cpf: response.patient.cpf ?? '',
      main_complaint: response.patient.main_complaint ?? '',
      psychiatric_medications: response.patient.psychiatric_medications ?? '',
      has_psychiatric_followup: Boolean(response.patient.has_psychiatric_followup),
      psychiatrist_name: response.patient.psychiatrist_name ?? '',
      psychiatrist_contact: response.patient.psychiatrist_contact ?? '',
      emergency_contact_name: response.patient.emergency_contact_name ?? '',
      emergency_contact_phone: response.patient.emergency_contact_phone ?? '',
      notes: response.patient.notes ?? '',
      billing_mode: response.patient.billing?.mode ?? 'per_session',
      session_price: response.patient.billing?.session_price?.toString() ?? '',
      package_total_price: response.patient.billing?.package_total_price?.toString() ?? '',
      package_session_count: response.patient.billing?.package_session_count?.toString() ?? '',
    });
  };

  const loadDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchPatientDetail(patientId);
      setDetail(response);
      hydrateForm(response);
    } catch (loadError: any) {
      setError(loadError?.message ?? 'Nao foi possivel carregar a ficha do paciente.');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  const latestSession = useMemo(
    () => detail?.summary?.last_session ?? detail?.summary?.next_session ?? detail?.sessions[0] ?? null,
    [detail],
  );

  const updateFormField = <K extends keyof PatientFormState>(key: K, value: PatientFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!detail || !form.name.trim()) {
      Alert.alert('Campo obrigatorio', 'Informe o nome do paciente.');
      return;
    }

    try {
      setIsSaving(true);
      await updatePatient(detail.patient.id, {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        birth_date: form.birth_date || undefined,
        address: form.address.trim() || undefined,
        cpf: form.cpf.trim() || undefined,
        main_complaint: form.main_complaint.trim() || undefined,
        psychiatric_medications: form.psychiatric_medications.trim() || undefined,
        has_psychiatric_followup: form.has_psychiatric_followup,
        psychiatrist_name: form.psychiatrist_name.trim() || undefined,
        psychiatrist_contact: form.psychiatrist_contact.trim() || undefined,
        emergency_contact_name: form.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
        billing: {
          mode: form.billing_mode,
          session_price: form.billing_mode === 'per_session' && form.session_price ? Number(form.session_price) : undefined,
          package_total_price: form.billing_mode === 'package' && form.package_total_price ? Number(form.package_total_price) : undefined,
          package_session_count: form.billing_mode === 'package' && form.package_session_count ? Number(form.package_session_count) : undefined,
        },
        notes: form.notes.trim() || undefined,
      });

      setIsEditing(false);
      await loadDetail();
      Alert.alert('Ficha atualizada', 'Os dados do paciente foram salvos com sucesso.');
    } catch (saveError: any) {
      Alert.alert('Erro', saveError?.message ?? 'Nao foi possivel salvar a ficha do paciente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (detail) hydrateForm(detail);
    setIsEditing(false);
  };

  const handleCreateNote = () => {
    if (!latestSession) {
      Alert.alert('Sessao necessaria', 'Crie uma sessao antes de iniciar uma nova nota clinica.');
      return;
    }

    navigation.navigate('ClinicalNoteEditor', {
      patientId: detail?.patient.id,
      sessionId: latestSession.id,
      patientName: detail?.patient.label,
    });
  };

  const openSession = (session: SessionRecord) => {
    navigation.navigate('SessionHub', {
      session,
      patientName: detail?.patient.label,
    });
  };

  const handleCreateDocument = async (templateId: string, label: string) => {
    if (!detail) return;
    try {
      setShortcutLoading(templateId);
      const document = await createDocument({
        patient_id: detail.patient.id,
        case_id: detail.patient.id,
        template_id: templateId,
        title: buildDocumentTitle(detail.patient.label, label),
      });
      await loadDetail();
      navigation.navigate('DocumentDetail', { documentId: document.id });
    } catch (shortcutError: any) {
      Alert.alert('Erro', shortcutError?.message ?? `Nao foi possivel criar ${label.toLowerCase()}.`);
    } finally {
      setShortcutLoading(null);
    }
  };

  const handleCreateContract = async () => {
    if (!detail) return;
    try {
      setShortcutLoading('contract');
      const contract = await createContract({
        patient_id: detail.patient.id,
        psychologist: {
          name: user?.name ?? 'Psicologo responsavel',
          license: user?.crp ?? '',
          email: user?.email ?? '',
        },
        patient: {
          name: detail.patient.label,
          email: detail.patient.email ?? '',
          document: detail.patient.cpf ?? '',
        },
        terms: {
          value:
            form.billing_mode === 'package'
              ? `${formatCurrency(Number(form.package_total_price || 0))} por pacote de ${form.package_session_count || '0'} sessoes`
              : `${formatCurrency(Number(form.session_price || 0))} por sessao`,
          periodicity: form.billing_mode === 'package' ? 'pacote' : 'sessao',
          absence_policy: 'Cancelamentos devem ser informados com antecedencia minima de 24 horas.',
          payment_method: 'A combinar',
        },
      });

      if (detail.patient.email) {
        await sendContract(contract.id);
        Alert.alert('Contrato criado', 'O contrato foi criado e o portal de aceite foi preparado.');
      } else {
        Alert.alert('Contrato criado', 'O paciente nao tem e-mail. O envio pode ser feito depois.');
      }
    } catch (contractError: any) {
      Alert.alert('Erro', contractError?.message ?? 'Nao foi possivel criar o contrato.');
    } finally {
      setShortcutLoading(null);
    }
  };

  const handleCreateReport = async () => {
    if (!detail) return;
    try {
      setShortcutLoading('report');
      await createReport({
        patient_id: detail.patient.id,
        purpose: 'profissional',
        content: `Relatorio psicologico em elaboracao referente ao acompanhamento clinico de ${detail.patient.label}.`,
      });
      Alert.alert('Relatorio criado', 'O relatorio inicial ja foi vinculado ao paciente.');
    } catch (reportError: any) {
      Alert.alert('Erro', reportError?.message ?? 'Nao foi possivel criar o relatorio.');
    } finally {
      setShortcutLoading(null);
    }
  };

  const renderField = (
    label: string,
    key: keyof PatientFormState,
    options?: { multiline?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' },
  ) => {
    const value = form[key];
    const displayValue = typeof value === 'boolean' ? (value ? 'Sim' : 'Nao') : value || 'Nao informado';

    return (
      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: theme.mutedForeground }]}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[
              options?.multiline ? styles.textarea : styles.input,
              { color: theme.foreground, backgroundColor: theme.background, borderColor: theme.border },
            ]}
            value={typeof value === 'string' ? value : ''}
            onChangeText={(text) => updateFormField(key as any, text)}
            multiline={options?.multiline}
            textAlignVertical={options?.multiline ? 'top' : 'center'}
            keyboardType={options?.keyboardType}
            placeholderTextColor={theme.mutedForeground}
          />
        ) : (
          <Text style={[styles.fieldValue, { color: theme.foreground }]}>{displayValue}</Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background, padding: 24 }]}>
        <Text style={[styles.errorTitle, { color: theme.foreground }]}>Nao foi possivel abrir o paciente.</Text>
        <Text style={[styles.errorText, { color: theme.mutedForeground }]}>{error ?? 'Paciente nao encontrado.'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={loadDetail}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.patientName, { color: theme.foreground }]}>{detail.patient.label}</Text>
        <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{detail.patient.email || 'E-mail nao informado'}</Text>
        <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{detail.patient.whatsapp || detail.patient.phone || 'WhatsApp nao informado'}</Text>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.background }]}>
            <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Total</Text>
            <Text style={[styles.summaryValue, { color: theme.foreground }]}>{detail.summary.total_sessions}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.background }]}>
            <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Proxima</Text>
            <Text style={[styles.summaryValueSmall, { color: theme.foreground }]}>{formatDate(detail.summary.next_session?.scheduled_at)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.background }]}>
            <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Ultima</Text>
            <Text style={[styles.summaryValueSmall, { color: theme.foreground }]}>{formatDate(detail.summary.last_session?.scheduled_at)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('CreateSession', { patientId: detail.patient.id })}>
            <Calendar size={16} color="#fff" />
            <Text style={styles.primaryActionText}>Nova Sessao</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryAction, { borderColor: theme.border }]} onPress={handleCreateNote}>
            <Plus size={16} color={theme.primary} />
            <Text style={[styles.secondaryActionText, { color: theme.primary }]}>Nova Nota Clinica</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.primaryAction} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Save size={16} color="#fff" />}
                <Text style={styles.primaryActionText}>Salvar Ficha</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryAction, { borderColor: theme.border }]} onPress={handleCancelEdit}>
                <X size={16} color={theme.primary} />
                <Text style={[styles.secondaryActionText, { color: theme.primary }]}>Cancelar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: theme.border }]} onPress={() => setIsEditing(true)}>
              <PenSquare size={16} color={theme.primary} />
              <Text style={[styles.secondaryActionText, { color: theme.primary }]}>Editar ficha</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Identificacao</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderField('Nome do paciente', 'name')}
          {renderField('WhatsApp', 'whatsapp', { keyboardType: 'phone-pad' })}
          {renderField('E-mail', 'email', { keyboardType: 'email-address' })}
          {renderField('Telefone legado', 'phone', { keyboardType: 'phone-pad' })}
          {renderField('Data de nascimento', 'birth_date')}
          {renderField('CPF', 'cpf')}
          {renderField('Endereco', 'address', { multiline: true })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Clinico</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderField('Queixa principal', 'main_complaint', { multiline: true })}
          {renderField('Remedios psiquiatricos', 'psychiatric_medications', { multiline: true })}
          {renderField('Observacoes adicionais', 'notes', { multiline: true })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Cobranca</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.fieldLabel, { color: theme.mutedForeground }]}>Tipo de cobranca</Text>
          {isEditing ? (
            <View style={styles.billingToggleRow}>
              <TouchableOpacity
                style={[
                  styles.billingToggle,
                  {
                    backgroundColor: form.billing_mode === 'per_session' ? theme.primary : theme.background,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => updateFormField('billing_mode', 'per_session')}
              >
                <Text style={[styles.billingToggleText, { color: form.billing_mode === 'per_session' ? '#fff' : theme.foreground }]}>Sessao</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.billingToggle,
                  {
                    backgroundColor: form.billing_mode === 'package' ? theme.primary : theme.background,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => updateFormField('billing_mode', 'package')}
              >
                <Text style={[styles.billingToggleText, { color: form.billing_mode === 'package' ? '#fff' : theme.foreground }]}>Pacote</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.fieldValue, { color: theme.foreground }]}>{form.billing_mode === 'package' ? 'Pacote' : 'Sessao avulsa'}</Text>
          )}

          {form.billing_mode === 'per_session'
            ? renderField('Valor por sessao', 'session_price', { keyboardType: 'numeric' })
            : (
              <>
                {renderField('Valor total do pacote', 'package_total_price', { keyboardType: 'numeric' })}
                {renderField('Quantidade de sessoes', 'package_session_count', { keyboardType: 'numeric' })}
              </>
            )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Psiquiatria e emergencia</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.switchRow}>
            <Text style={[styles.fieldLabel, { color: theme.mutedForeground }]}>Acompanhamento psiquiatrico</Text>
            {isEditing ? (
              <Switch value={form.has_psychiatric_followup} onValueChange={(value) => updateFormField('has_psychiatric_followup', value)} />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.foreground }]}>{form.has_psychiatric_followup ? 'Sim' : 'Nao'}</Text>
            )}
          </View>
          {renderField('Nome do psiquiatra', 'psychiatrist_name')}
          {renderField('Contato do psiquiatra', 'psychiatrist_contact', { keyboardType: 'phone-pad' })}
          {renderField('Contato de emergencia', 'emergency_contact_name')}
          {renderField('Telefone de emergencia', 'emergency_contact_phone', { keyboardType: 'phone-pad' })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Documentos</Text>
        <View style={styles.shortcutRow}>
          <TouchableOpacity style={[styles.shortcutButton, { borderColor: theme.border }]} onPress={() => void handleCreateDocument('payment-receipt', 'Recibo')} disabled={Boolean(shortcutLoading)}>
            <Text style={[styles.shortcutText, { color: theme.primary }]}>{shortcutLoading === 'payment-receipt' ? 'Criando...' : 'Recibo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutButton, { borderColor: theme.border }]} onPress={() => void handleCreateDocument('attendance-declaration', 'Declaracao')} disabled={Boolean(shortcutLoading)}>
            <Text style={[styles.shortcutText, { color: theme.primary }]}>{shortcutLoading === 'attendance-declaration' ? 'Criando...' : 'Declaracao'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutButton, { borderColor: theme.border }]} onPress={() => void handleCreateDocument('psychological-certificate', 'Atestado psicologico')} disabled={Boolean(shortcutLoading)}>
            <Text style={[styles.shortcutText, { color: theme.primary }]}>{shortcutLoading === 'psychological-certificate' ? 'Criando...' : 'Atestado'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutButton, { borderColor: theme.border }]} onPress={() => void handleCreateContract()} disabled={Boolean(shortcutLoading)}>
            <Text style={[styles.shortcutText, { color: theme.primary }]}>{shortcutLoading === 'contract' ? 'Criando...' : 'Contrato'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shortcutButton, { borderColor: theme.border }]} onPress={() => void handleCreateReport()} disabled={Boolean(shortcutLoading)}>
            <Text style={[styles.shortcutText, { color: theme.primary }]}>{shortcutLoading === 'report' ? 'Criando...' : 'Relatorio'}</Text>
          </TouchableOpacity>
        </View>

        {detail.documents.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Nenhum documento disponivel.</Text>
          </View>
        ) : (
          detail.documents.map((document) => (
            <TouchableOpacity
              key={document.id}
              style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation.navigate('DocumentDetail', { documentId: document.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.listTitle, { color: theme.foreground }]} numberOfLines={1}>{document.title}</Text>
                <Text style={[styles.listSubtitle, { color: theme.mutedForeground }]}>{formatDateTime(document.created_at)}</Text>
              </View>
              <FileText size={18} color={theme.primary} />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Sessoes</Text>
        {detail.sessions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Nenhuma sessao vinculada ainda.</Text>
          </View>
        ) : (
          detail.sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => openSession(session)}
            >
              <View>
                <Text style={[styles.listTitle, { color: theme.foreground }]}>{formatDateTime(session.scheduled_at)}</Text>
                <Text style={[styles.listSubtitle, { color: theme.mutedForeground }]}>
                  {session.duration_minutes ? `${session.duration_minutes} min · ` : ''}{session.status}
                </Text>
              </View>
              <Calendar size={18} color={theme.primary} />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Diario Emocional</Text>
        {detail.emotional_diary.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Nenhum registro emocional disponivel ainda.</Text>
          </View>
        ) : (
          detail.emotional_diary.slice(0, 4).map((entry) => (
            <View key={entry.id} style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.diaryHeader}>
                <Text style={styles.diaryEmoji}>{moodEmoji(entry.mood)}</Text>
                <View style={styles.diaryCopy}>
                  <Text style={[styles.listTitle, { color: theme.foreground }]}>
                    {formatDateTime(entry.date)} · Humor {entry.mood}/5
                  </Text>
                  <Text style={[styles.listSubtitle, { color: theme.mutedForeground }]}>
                    Intensidade {entry.intensity}/10
                  </Text>
                </View>
              </View>
              <Text style={[styles.diaryBody, { color: theme.mutedForeground }]}>
                {entry.description || entry.thoughts || 'Sem descricao adicional.'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
  },
  patientName: {
    fontFamily: 'Lora',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaText: {
    fontFamily: 'Inter',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
  },
  summaryLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontFamily: 'Lora',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  summaryValueSmall: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#234e5c',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  primaryActionText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  secondaryActionText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: 'Lora',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter',
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter',
    fontSize: 14,
    minHeight: 92,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  billingToggle: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  billingToggleText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
  },
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  shortcutButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shortcutText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  listTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
  },
  listSubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    marginTop: 4,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  diaryHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  diaryEmoji: {
    fontSize: 24,
  },
  diaryCopy: {
    flex: 1,
  },
  diaryBody: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
  },
  errorTitle: {
    fontFamily: 'Lora',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#234e5c',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },
});
