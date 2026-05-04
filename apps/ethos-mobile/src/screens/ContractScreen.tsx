/**
 * ContractScreen — Criar, visualizar e enviar contratos terapêuticos
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Check, FileText, Send } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';
import { useAuth } from '../contexts/AuthContext';

type ContractStatus = 'rascunho' | 'enviado' | 'assinado';

type Contract = {
  id: string;
  patient_id: string;
  patient_name: string;
  monthly_fee: string;
  session_duration: string;
  frequency: string;
  absence_policy: string;
  payment_method: string;
  status: ContractStatus;
  created_at: string;
};

const STATUS_LABEL: Record<ContractStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  assinado: 'Assinado',
};
const STATUS_COLOR: Record<ContractStatus, string> = {
  rascunho: '#d19747',
  enviado: '#edbd2a',
  assinado: '#3a9b73',
};

function buildContractHtml(contract: Contract, clinicianName: string, crp: string): string {
  const today = new Date().toLocaleDateString('pt-BR', { day: 'long', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html><body style="font-family: Georgia, serif; max-width: 700px; margin: 40px auto; line-height: 1.8; color: #222;">
  <div style="text-align:center; border-bottom: 2px solid #234e5c; padding-bottom: 16px; margin-bottom: 32px;">
    <h1 style="font-size: 22px; color: #234e5c;">CONTRATO TERAPEUTICO</h1>
    <p style="font-size: 13px; color: #555;">${clinicianName} · CRP ${crp}</p>
  </div>

  <p>Pelo presente contrato, fica estabelecida a relacao terapeutica entre o(a) Psicologo(a) <strong>${clinicianName}</strong> (CRP: ${crp}) e o(a) paciente <strong>${contract.patient_name}</strong>.</p>

  <h2>1. Consultas e Honorarios</h2>
  <p>As sessoes terao duracao de <strong>${contract.session_duration} minutos</strong>, com frequencia <strong>${contract.frequency}</strong>.</p>
  <p>Os honorarios mensais serao de <strong>R$ ${contract.monthly_fee}</strong>, pagos via ${contract.payment_method}.</p>

  <h2>2. Politica de Cancelamento</h2>
  <p>${contract.absence_policy}</p>

  <h2>3. Sigilo Profissional</h2>
  <p>O(A) psicologo(a) se compromete a manter o sigilo de todas as informacoes compartilhadas durante as sessoes, conforme o Codigo de Etica Profissional do Psicologo (CFP).</p>

  <h2>4. Rescisao</h2>
  <p>Qualquer das partes podera rescindir este contrato mediante aviso previo de 30 dias.</p>

  <div style="margin-top: 60px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 45%;">
      <div style="border-top: 1px solid #222; margin-bottom: 8px;"></div>
      <p>${clinicianName}<br>CRP: ${crp}</p>
    </div>
    <div style="text-align: center; width: 45%;">
      <div style="border-top: 1px solid #222; margin-bottom: 8px;"></div>
      <p>${contract.patient_name}<br>Paciente</p>
    </div>
  </div>
  <p style="text-align: center; margin-top: 24px; color: #555;">Sao Paulo, ${today}.</p>
</body></html>`;
}

export default function ContractScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { user } = useAuth();
  const patientId: string | undefined = route?.params?.patientId;
  const defaultPatientName: string = route?.params?.patientName ?? '';

  const [patientName, setPatientName] = useState(defaultPatientName);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [sessionDuration, setSessionDuration] = useState('50');
  const [frequency, setFrequency] = useState('semanal');
  const [absencePolicy, setAbsencePolicy] = useState(
    'O cancelamento deve ser feito com no minimo 24 horas de antecedencia. Faltas sem aviso previo serao cobradas integralmente.',
  );
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const loadContracts = useCallback(async () => {
    setLoadingList(true);
    try {
      const path = patientId ? `/contracts?patient_id=${patientId}` : '/contracts';
      const res = await clinicalApiClient.request<any>(path, { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setContracts(data);
    } catch {
      setContracts([]);
    } finally {
      setLoadingList(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  const handleCreate = async () => {
    if (!patientName.trim() || !monthlyFee.trim()) {
      Alert.alert('Campos obrigatorios', 'Informe o nome do paciente e o valor da consulta.');
      return;
    }
    setSaving(true);
    try {
      await clinicalApiClient.request('/contracts', {
        method: 'POST',
        body: {
          patient_id: patientId,
          patient_name: patientName.trim(),
          monthly_fee: monthlyFee,
          session_duration: sessionDuration,
          frequency,
          absence_policy: absencePolicy,
          payment_method: paymentMethod,
          status: 'rascunho',
        },
      });
      Alert.alert('Contrato criado!', 'O contrato foi salvo como rascunho.');
      void loadContracts();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel criar o contrato.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async (contract: Contract) => {
    try {
      const clinicianName = user?.name ?? 'Psicologo(a)';
      const crp = user?.crp ?? '00/000000';
      const html = buildContractHtml(contract, clinicianName, crp);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel compartilhar.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Create form */}
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>NOVO CONTRATO</Text>
        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {[
            { label: 'Nome do paciente *', value: patientName, setter: setPatientName, placeholder: 'Nome completo' },
            { label: 'Valor da consulta (R$) *', value: monthlyFee, setter: setMonthlyFee, placeholder: '150,00', keyboardType: 'numeric' as const },
            { label: 'Duracao da sessao (min)', value: sessionDuration, setter: setSessionDuration, placeholder: '50' },
            { label: 'Frequencia', value: frequency, setter: setFrequency, placeholder: 'semanal, quinzenal...' },
            { label: 'Metodo de pagamento', value: paymentMethod, setter: setPaymentMethod, placeholder: 'PIX, dinheiro, cartao...' },
          ].map((f) => (
            <View key={f.label} style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>{f.label}</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
                value={f.value}
                onChangeText={f.setter}
                placeholder={f.placeholder}
                placeholderTextColor={theme.mutedForeground}
                keyboardType={f.keyboardType}
              />
            </View>
          ))}

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: theme.foreground }]}>Politica de cancelamento</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti, { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground }]}
              value={absencePolicy}
              onChangeText={setAbsencePolicy}
              multiline
              textAlignVertical="top"
              placeholderTextColor={theme.mutedForeground}
            />
          </View>

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={() => void handleCreate()}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <FileText size={18} color="#fff" />
                <Text style={styles.createBtnText}>Criar Contrato</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing contracts */}
        {contracts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.mutedForeground, marginTop: 24 }]}>CONTRATOS</Text>
            {contracts.map((c) => (
              <View key={c.id} style={[styles.contractCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.contractHeader}>
                  <View style={styles.contractInfo}>
                    <Text style={[styles.contractPatient, { color: theme.foreground }]}>{c.patient_name}</Text>
                    <Text style={[styles.contractMeta, { color: theme.mutedForeground }]}>
                      R$ {c.monthly_fee} · {c.frequency} · {c.session_duration} min
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[c.status]}20` }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[c.status] }]}>
                      {STATUS_LABEL[c.status]}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.shareBtn, { borderColor: theme.border }]}
                  onPress={() => void handleShare(c)}
                >
                  <Send size={15} color={theme.primary} />
                  <Text style={[styles.shareBtnText, { color: theme.primary }]}>Compartilhar PDF</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  formCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  fieldRow: { gap: 6 },
  fieldLabel: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
  fieldInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter',
    fontSize: 14,
  },
  fieldInputMulti: { minHeight: 100 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  createBtnText: { color: '#fff', fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
  contractCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  contractHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  contractInfo: { flex: 1 },
  contractPatient: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
  contractMeta: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 12 },
  statusBadgeText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareBtnText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },
});
