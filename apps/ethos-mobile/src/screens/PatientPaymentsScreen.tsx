/**
 * PatientPaymentsScreen — Histórico de cobranças para o paciente
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fetchFinancialEntries } from '../services/api/finance';

type Payment = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_at?: string;
  status: 'pending' | 'paid' | 'overdue';
};

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: '#edbd2a', Icon: Clock },
  paid: { label: 'Pago', color: '#3a9b73', Icon: CheckCircle },
  overdue: { label: 'Vencido', color: '#bd3737', Icon: AlertCircle },
};

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export default function PatientPaymentsScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFinancialEntries();
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPayments(); }, [loadPayments]);

  const pending = payments.filter((p) => p.status !== 'paid');
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const nextDue = pending.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  const renderPayment = ({ item }: { item: Payment }) => {
    const cfg = STATUS_CONFIG[item.status];
    return (
      <View style={[styles.paymentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.statusIconWrapper, { backgroundColor: `${cfg.color}20` }]}>
          <cfg.Icon size={20} color={cfg.color} />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={[styles.paymentDesc, { color: theme.foreground }]}>{item.description}</Text>
          <Text style={[styles.paymentDate, { color: theme.mutedForeground }]}>
            Vencimento: {new Date(item.due_date).toLocaleDateString('pt-BR')}
            {item.paid_at ? ` · Pago: ${new Date(item.paid_at).toLocaleDateString('pt-BR')}` : ''}
          </Text>
        </View>
        <View style={styles.paymentRight}>
          <Text style={[styles.paymentAmount, { color: theme.foreground }]}>{formatCurrency(item.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}20` }]}>
            <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Summary cards */}
      <View style={[styles.summaryBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.destructive }]}>{formatCurrency(totalPending)}</Text>
          <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Total Pendente</Text>
        </View>
        {nextDue && (
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
        )}
        {nextDue && (
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.foreground }]}>
              {new Date(nextDue.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Proximo Vencimento</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={[...payments].sort((a, b) => {
            // Pending first, then by date
            if (a.status !== 'paid' && b.status === 'paid') return -1;
            if (a.status === 'paid' && b.status !== 'paid') return 1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          })}
          renderItem={renderPayment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CheckCircle size={48} color={theme.muted} />
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Sem cobranças</Text>
              <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
                Nenhuma cobrança registrada ainda.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryBar: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    gap: 24,
  },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: { fontFamily: 'Inter', fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontFamily: 'Inter', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDivider: { width: 1, alignSelf: 'stretch' },
  list: { padding: 16, gap: 10 },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  statusIconWrapper: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  paymentInfo: { flex: 1 },
  paymentDesc: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  paymentDate: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  paymentRight: { alignItems: 'flex-end', gap: 6 },
  paymentAmount: { fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center' },
});
