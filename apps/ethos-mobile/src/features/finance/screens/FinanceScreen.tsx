<<<<<<< HEAD:apps/ethos-mobile/src/screens/FinanceScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
=======
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Banknote, TrendingUp, TrendingDown, ChevronRight, Plus, Download, Filter, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4:apps/ethos-mobile/src/features/finance/screens/FinanceScreen.tsx
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ArrowDownLeft, ArrowUpRight, Download, MessageCircle, Plus, TrendingDown, TrendingUp } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { fetchFinanceSummary } from '../services/api/finance';
import { fetchPatients } from '../services/api/patients';
import type { FinanceSummary, PatientRecord } from '../services/api/types';
import {
  applyWhatsAppTemplate,
  defaultWhatsAppMessageSettings,
  loadWhatsAppMessageSettings,
  openWhatsAppLink,
} from '../services/whatsapp';
import { applyFinanceReminderState, markFinanceReminderSent } from '../services/localReminders';

const primaryTeal = '#234e5c';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const isPaymentReminderPending = (entry: FinanceSummary['entries'][number]) => {
  const isPendingReceivable = entry.type === 'receivable' && entry.status !== 'paid';
  if (!isPendingReceivable) return false;

  const overdueMs = Date.now() - Date.parse(entry.due_date);
  return overdueMs > 3 * 24 * 60 * 60 * 1000;
};

export default function FinanceScreen() {
<<<<<<< HEAD:apps/ethos-mobile/src/screens/FinanceScreen.tsx
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
=======
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4:apps/ethos-mobile/src/features/finance/screens/FinanceScreen.tsx

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [messageSettings, setMessageSettings] = useState(defaultWhatsAppMessageSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFinance = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [response, patientResponse, storedSettings] = await Promise.all([
        fetchFinanceSummary(),
        fetchPatients(),
        loadWhatsAppMessageSettings(),
      ]);
      setSummary({
        ...response,
        entries: await applyFinanceReminderState(response.entries),
      });
      setPatients(patientResponse);
      setMessageSettings(storedSettings);
    } catch (loadError: any) {
      setError(loadError?.message ?? 'NÃ£o foi possÃ­vel carregar o financeiro.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFinance();
    }, [loadFinance]),
  );

  const totals = useMemo(() => {
    const entries = summary?.entries ?? [];
    const paidValue = entries.filter((entry) => entry.status === 'paid').reduce((sum, entry) => sum + entry.amount, 0);
    const pendingValue = entries.filter((entry) => entry.status !== 'paid').reduce((sum, entry) => sum + entry.amount, 0);
    return { paidValue, pendingValue };
  }, [summary?.entries]);

  const handlePaymentReminder = async (entryId: string, patientId: string, amount: number) => {
    const patient = patients.find((item) => item.id === patientId || item.external_id === patientId);
    if (!patient?.phone) {
      Alert.alert('Telefone necessario', 'Adicione um telefone ao paciente para abrir a cobranca no WhatsApp.');
      return;
    }

    if (!messageSettings.pixKey.trim()) {
      Alert.alert('Chave PIX necessaria', 'Cadastre a chave PIX nas configuracoes antes de enviar a cobranca.');
      return;
    }

    const message = applyWhatsAppTemplate(messageSettings.paymentReminderTemplate, {
      NOME: patient.label,
      VALOR: formatCurrency(amount),
      CHAVE: messageSettings.pixKey.trim(),
    });

    try {
      await openWhatsAppLink(patient.phone, message);
      const lastReminderAt = await markFinanceReminderSent(entryId);
      setSummary((current) =>
        current
          ? {
              ...current,
              entries: current.entries.map((entry) =>
                entry.id === entryId
                  ? { ...entry, lastReminderAt }
                  : entry,
              ),
            }
          : current,
      );
    } catch (openError: any) {
      Alert.alert('Nao foi possivel abrir o WhatsApp', openError?.message ?? 'Tente novamente em instantes.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Fluxo de Caixa</Text>
          <Text style={[styles.title, { color: primaryTeal }]}>Financeiro</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]} onPress={loadFinance}>
            <Download size={20} color={primaryTeal} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]} onPress={loadFinance}>
            <Plus size={20} color={primaryTeal} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600)} style={[styles.mainCard, { backgroundColor: primaryTeal }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Total Recebido ({summary?.month ?? 'mÃªs atual'})</Text>
            <View style={styles.monthBadge}>
              <Text style={styles.monthText}>Este MÃªs</Text>
            </View>
          </View>
          <Text style={styles.mainValue}>{formatCurrency(summary?.total_per_month ?? 0)}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <TrendingUp size={16} color="#4ade80" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>SessÃµes pagas</Text>
                <Text style={styles.summaryValue}>{summary?.paid_sessions ?? 0}</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <TrendingDown size={16} color="#f87171" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>SessÃµes pendentes</Text>
                <Text style={styles.summaryValue}>{summary?.pending_sessions ?? 0}</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Pago: {formatCurrency(totals.paidValue)} • Pendente: {formatCurrency(totals.pendingValue)}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
            <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>Pendentes</Text>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{formatCurrency(totals.pendingValue)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
            <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>Pagos</Text>
            <Text style={[styles.statValue, { color: primaryTeal }]}>{formatCurrency(totals.paidValue)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: primaryTeal }]}>LanÃ§amentos</Text>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={primaryTeal} />
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Carregando financeiro...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={[styles.stateTitle, { color: theme.foreground }]}>Falha ao carregar o financeiro.</Text>
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>{error}</Text>
          </View>
        ) : (summary?.entries.length ?? 0) === 0 ? (
          <View style={styles.stateCard}>
            <Text style={[styles.stateTitle, { color: theme.foreground }]}>Nenhum lanÃ§amento encontrado.</Text>
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Os valores aparecerÃ£o aqui conforme as sessÃµes forem registradas no backend.</Text>
          </View>
        ) : (
          summary?.entries.map((item, index) => {
            const patientName = patients.find((patient) => patient.id === item.patient_id || patient.external_id === item.patient_id)?.label;
            const pendingReminder = isPaymentReminderPending(item);

            return (
              <Animated.View key={item.id} entering={FadeInUp.delay(index * 90).duration(400)}>
              <TouchableOpacity style={[styles.transactionCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                <View style={[styles.transIcon, { backgroundColor: item.type === 'receivable' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)' }]}>
                  {item.type === 'receivable'
                    ? <ArrowUpRight size={20} color="#16a34a" />
                    : <ArrowDownLeft size={20} color="#dc2626" />}
                </View>
                <View style={styles.transInfo}>
                  <Text style={[styles.transTitle, { color: primaryTeal }]}>{item.description || 'LanÃ§amento financeiro'}</Text>
                  <Text style={[styles.transDate, { color: theme.mutedForeground }]}>
                    {new Date(item.due_date).toLocaleDateString('pt-BR')}
                    {patientName ? ` - ${patientName}` : ''}
                  </Text>
                  {pendingReminder ? (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Cobranca pendente</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.transValueColumn}>
                  <Text style={[styles.transValue, { color: item.type === 'receivable' ? '#16a34a' : '#dc2626' }]}>
                    {item.type === 'receivable' ? '+' : '-'} {formatCurrency(item.amount)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'paid' ? '#f0fdf4' : '#fff7ed' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'paid' ? '#16a34a' : '#ea580c' }]}>
                      {item.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Text>
                  </View>
                  {pendingReminder ? (
                    <TouchableOpacity style={styles.whatsAppButton} onPress={() => handlePaymentReminder(item.id, item.patient_id, item.amount)}>
                      <MessageCircle size={12} color="#0f9d58" />
                      <Text style={styles.whatsAppButtonText}>Cobrar via WhatsApp</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.lastReminderAt ? (
                    <Text style={styles.reminderMeta}>
                      Ultimo lembrete: {new Date(item.lastReminderAt).toLocaleDateString('pt-BR')}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  mainCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    shadowColor: primaryTeal,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  monthBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  monthText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mainValue: {
    color: '#fff',
    fontSize: 36,
    fontFamily: 'Lora',
    fontWeight: '700',
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: 'Inter',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  progressContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  progressText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'Inter',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  transIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transInfo: {
    flex: 1,
  },
  transTitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '700',
    marginBottom: 4,
  },
  transDate: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingBadgeText: {
    color: '#ea580c',
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  transValueColumn: {
    alignItems: 'flex-end',
  },
  transValue: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(15, 157, 88, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  whatsAppButtonText: {
    color: '#0f9d58',
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  reminderMeta: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'Inter',
  },
  stateCard: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  stateTitle: {
    fontFamily: 'Lora',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
