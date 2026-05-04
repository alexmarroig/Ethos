/**
 * FormResponsesScreen — Visualizar respostas de formulários
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { ChevronDown, ChevronRight, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';

type FieldAnswer = {
  field_id: string;
  label: string;
  answer: string | number;
};

type FormResponse = {
  id: string;
  patient_name: string;
  patient_id: string;
  submitted_at: string;
  answers: FieldAnswer[];
};

export default function FormResponsesScreen({ route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const formId: string = route?.params?.formId;
  const formTitle: string = route?.params?.formTitle ?? 'Formulario';

  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadResponses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicalApiClient.request<any>(`/forms/${formId}/responses`, { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setResponses(data);
    } catch {
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    void loadResponses();
  }, [loadResponses]);

  const renderResponse = ({ item }: { item: FormResponse }) => {
    const isExpanded = expandedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.responseCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.85}
      >
        <View style={styles.responseHeader}>
          <View style={[styles.responseAvatar, { backgroundColor: `${theme.primary}20` }]}>
            <User size={16} color={theme.primary} />
          </View>
          <View style={styles.responseInfo}>
            <Text style={[styles.responsePatient, { color: theme.foreground }]}>{item.patient_name}</Text>
            <Text style={[styles.responseDate, { color: theme.mutedForeground }]}>
              {new Date(item.submitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          {isExpanded ? <ChevronDown size={18} color={theme.mutedForeground} /> : <ChevronRight size={18} color={theme.mutedForeground} />}
        </View>

        {isExpanded && (
          <View style={[styles.answersContainer, { borderTopColor: theme.border }]}>
            {item.answers.map((ans, idx) => (
              <View key={idx} style={styles.answerRow}>
                <Text style={[styles.answerLabel, { color: theme.mutedForeground }]}>{ans.label}</Text>
                <Text style={[styles.answerValue, { color: theme.foreground }]}>{String(ans.answer)}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.statsBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{responses.length}</Text>
          <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>Respostas</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={responses}
          renderItem={renderResponse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Sem respostas ainda</Text>
              <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
                As respostas aparecerão aqui quando os pacientes preencherem o formulário.
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
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontFamily: 'Inter', fontSize: 24, fontWeight: '700' },
  statLabel: { fontFamily: 'Inter', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  listContent: { padding: 16, gap: 10 },
  responseCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  responseHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  responseAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  responseInfo: { flex: 1 },
  responsePatient: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600' },
  responseDate: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  answersContainer: { borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  answerRow: { gap: 4 },
  answerLabel: { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  answerValue: { fontFamily: 'Inter', fontSize: 14, lineHeight: 21 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
