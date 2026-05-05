/**
 * DocumentBuilderScreen — Criar declarações, atestados, recibos e outros docs clínicos
 */
import React, { useCallback, useEffect, useState } from 'react';
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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FileText, Share2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { Printer } from '../lib/lucideCompat';

type DocType = 'declaracao' | 'atestado' | 'recibo' | 'relatorio_sessao';

const DOC_LABELS: Record<DocType, string> = {
  declaracao: 'Declaracao de Comparecimento',
  atestado: 'Atestado Psicologico',
  recibo: 'Recibo de Pagamento',
  relatorio_sessao: 'Relatorio de Sessao',
};

const DOC_ICONS: Record<DocType, string> = {
  declaracao: '📋',
  atestado: '🩺',
  recibo: '🧾',
  relatorio_sessao: '📝',
};

type DocFields = {
  patientName: string;
  sessionDate: string;
  sessionTime: string;
  durationMinutes: string;
  cid?: string;
  reason?: string;
  amount?: string;
  notes?: string;
};

function buildHtml(type: DocType, fields: DocFields, clinicianName: string, crp: string): string {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const shared = `
    <style>
      body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; line-height: 1.7; color: #222; }
      h1 { text-align: center; font-size: 18px; margin-bottom: 32px; }
      .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #234e5c; padding-bottom: 16px; }
      .clinic-name { font-size: 22px; font-weight: bold; color: #234e5c; }
      .subtitle { font-size: 13px; color: #555; }
      p { margin: 12px 0; }
      .signature { margin-top: 60px; text-align: center; }
      .signature-line { border-top: 1px solid #222; width: 280px; margin: 0 auto 8px; }
    </style>
    <div class="header">
      <div class="clinic-name">Ethos — Psicologia Clinica</div>
      <div class="subtitle">${clinicianName} · CRP ${crp}</div>
    </div>
    <h1>${DOC_LABELS[type].toUpperCase()}</h1>
  `;

  switch (type) {
    case 'declaracao':
      return `<!DOCTYPE html><html><body>${shared}
        <p>Declaro para os devidos fins que <strong>${fields.patientName}</strong> compareceu a consulta psicologica no dia <strong>${fields.sessionDate}</strong>, das <strong>${fields.sessionTime}</strong>, com duracao de <strong>${fields.durationMinutes} minutos</strong>.</p>
        ${fields.notes ? `<p>Observacoes: ${fields.notes}</p>` : ''}
        <p>Por ser verdade, firmo o presente.</p>
        <p>São Paulo, ${today}.</p>
        <div class="signature"><div class="signature-line"></div><p>${clinicianName}<br>CRP: ${crp}</p></div>
      </body></html>`;

    case 'atestado':
      return `<!DOCTYPE html><html><body>${shared}
        <p>Atesto que <strong>${fields.patientName}</strong> encontra-se sob acompanhamento psicologico nesta data, sendo indicado repouso e/ou afastamento de atividades pelo periodo a ser avaliado pelo medico responsavel.</p>
        ${fields.cid ? `<p>CID: ${fields.cid}</p>` : ''}
        ${fields.reason ? `<p>Motivo: ${fields.reason}</p>` : ''}
        <p>São Paulo, ${today}.</p>
        <div class="signature"><div class="signature-line"></div><p>${clinicianName}<br>CRP: ${crp}</p></div>
      </body></html>`;

    case 'recibo':
      return `<!DOCTYPE html><html><body>${shared}
        <p>Recebi de <strong>${fields.patientName}</strong> a quantia de <strong>R$ ${fields.amount ?? '0,00'}</strong> referente a consulta psicologica realizada em <strong>${fields.sessionDate}</strong>.</p>
        ${fields.notes ? `<p>Descricao: ${fields.notes}</p>` : ''}
        <p>São Paulo, ${today}.</p>
        <div class="signature"><div class="signature-line"></div><p>${clinicianName}<br>CRP: ${crp}</p></div>
      </body></html>`;

    case 'relatorio_sessao':
      return `<!DOCTYPE html><html><body>${shared}
        <p>Paciente: <strong>${fields.patientName}</strong></p>
        <p>Data da sessao: <strong>${fields.sessionDate}</strong></p>
        <p>Duracao: <strong>${fields.durationMinutes} min</strong></p>
        ${fields.notes ? `<h2>Conteudo da Sessao</h2><p>${fields.notes}</p>` : ''}
        <p>São Paulo, ${today}.</p>
        <div class="signature"><div class="signature-line"></div><p>${clinicianName}<br>CRP: ${crp}</p></div>
      </body></html>`;

    default:
      return '';
  }
}

export default function DocumentBuilderScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { user } = useAuth();
  const patientId: string | undefined = route?.params?.patientId;
  const defaultPatientName: string = route?.params?.patientName ?? '';

  const [docType, setDocType] = useState<DocType>('declaracao');
  const [fields, setFields] = useState<DocFields>({
    patientName: defaultPatientName,
    sessionDate: new Date().toLocaleDateString('pt-BR'),
    sessionTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    durationMinutes: '50',
    cid: '',
    reason: '',
    amount: '',
    notes: '',
  });
  const [generating, setGenerating] = useState(false);

  const updateField = (key: keyof DocFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const clinicianName = user?.name ?? 'Psicologo(a)';
  const crp = user?.crp ?? '00/000000';

  const handleGenerateAndShare = async () => {
    if (!fields.patientName.trim()) {
      Alert.alert('Paciente obrigatorio', 'Informe o nome do paciente.');
      return;
    }
    setGenerating(true);
    try {
      const html = buildHtml(docType, fields, clinicianName, crp);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('PDF gerado', 'O arquivo foi salvo em: ' + uri);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel gerar o documento.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!fields.patientName.trim()) {
      Alert.alert('Paciente obrigatorio', 'Informe o nome do paciente.');
      return;
    }
    setGenerating(true);
    try {
      const html = buildHtml(docType, fields, clinicianName, crp);
      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Nao foi possivel imprimir.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Doc type selector */}
        <Text style={[styles.sectionLabel, { color: theme.mutedForeground }]}>TIPO DE DOCUMENTO</Text>
        <View style={styles.docTypeGrid}>
          {(Object.keys(DOC_LABELS) as DocType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.docTypeCard,
                {
                  backgroundColor: docType === type ? `${theme.primary}15` : theme.card,
                  borderColor: docType === type ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setDocType(type)}
            >
              <Text style={styles.docTypeIcon}>{DOC_ICONS[type]}</Text>
              <Text style={[styles.docTypeLabel, { color: docType === type ? theme.primary : theme.foreground }]}>
                {DOC_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fields */}
        <Text style={[styles.sectionLabel, { color: theme.mutedForeground, marginTop: 24 }]}>DADOS DO DOCUMENTO</Text>
        <View style={[styles.fieldsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {[
            { key: 'patientName', label: 'Nome do paciente *' },
            { key: 'sessionDate', label: 'Data da sessao *' },
            { key: 'sessionTime', label: 'Horario' },
            { key: 'durationMinutes', label: 'Duracao (minutos)' },
            ...(docType === 'atestado' ? [{ key: 'cid', label: 'CID (opcional)' }] : []),
            ...(docType === 'atestado' ? [{ key: 'reason', label: 'Motivo (opcional)' }] : []),
            ...(docType === 'recibo' ? [{ key: 'amount', label: 'Valor (R$)' }] : []),
            ...(docType !== 'declaracao' ? [{ key: 'notes', label: 'Observacoes', multiline: true }] : []),
          ].map((f: any) => (
            <View key={f.key} style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>{f.label}</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  f.multiline && { minHeight: 100 },
                  { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground },
                ]}
                value={(fields as any)[f.key]}
                onChangeText={(t) => updateField(f.key as keyof DocFields, t)}
                multiline={f.multiline}
                textAlignVertical={f.multiline ? 'top' : undefined}
                placeholder="..."
                placeholderTextColor={theme.mutedForeground}
              />
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Actions */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.printBtn, { borderColor: theme.border }]}
          onPress={handlePrint}
          disabled={generating}
        >
          <Printer size={18} color={theme.primary} />
          <Text style={[styles.printBtnText, { color: theme.primary }]}>Imprimir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: theme.primary, opacity: generating ? 0.7 : 1 }]}
          onPress={handleGenerateAndShare}
          disabled={generating}
        >
          {generating ? <ActivityIndicator color="#fff" /> : (
            <>
              <Share2 size={18} color="#fff" />
              <Text style={styles.shareBtnText}>Gerar e Compartilhar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  docTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  docTypeCard: {
    width: '48%',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  docTypeIcon: { fontSize: 28 },
  docTypeLabel: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  fieldsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
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
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  printBtnText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600' },
  shareBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareBtnText: { color: '#fff', fontFamily: 'Inter', fontSize: 15, fontWeight: '700' },
});
