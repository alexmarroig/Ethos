import React, { useCallback, useState } from 'react';
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
import { Calendar, FileText, Plus } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { fetchPatientDetail } from '../services/api/patients';
import type { EmotionalDiaryEntryRecord, PatientDetailResponse, SessionRecord } from '../services/api/types';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const moodEmoji = (mood: EmotionalDiaryEntryRecord['mood']) => {
  if (mood <= 1) return '😞';
  if (mood === 2) return '🙂';
  if (mood === 3) return '😐';
  if (mood === 4) return '😊';
  return '😄';
};

export default function PatientDetailScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const patientId = route.params?.patientId as string;

  const [detail, setDetail] = useState<PatientDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchPatientDetail(patientId);
      setDetail(response);
    } catch (loadError: any) {
      setError(loadError?.message ?? 'NÃ£o foi possÃ­vel carregar o prontuÃ¡rio do paciente.');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  const handleCreateNote = () => {
    const latestSession = detail?.sessions[0];
    if (!latestSession) {
      Alert.alert('SessÃ£o necessÃ¡ria', 'Crie uma sessÃ£o antes de iniciar uma nova nota clÃ­nica.');
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
        <Text style={[styles.errorTitle, { color: theme.foreground }]}>NÃ£o foi possÃ­vel abrir o paciente.</Text>
        <Text style={[styles.errorText, { color: theme.mutedForeground }]}>{error ?? 'Paciente nÃ£o encontrado.'}</Text>
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
        <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{detail.patient.email || 'E-mail nÃ£o informado'}</Text>
        <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{detail.patient.phone || 'Telefone nÃ£o informado'}</Text>
        {detail.patient.notes ? <Text style={[styles.notesText, { color: theme.foreground }]}>{detail.patient.notes}</Text> : null}

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
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>SessÃµes</Text>
        {detail.sessions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Nenhuma sessÃ£o vinculada ainda.</Text>
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
                  {session.duration_minutes ? `${session.duration_minutes} min • ` : ''}{session.status}
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
          <>
            <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.chartTitle, { color: theme.foreground }]}>Humor recente</Text>
              <View style={styles.chartRow}>
                {[...detail.emotional_diary].slice(0, 6).reverse().map((entry) => (
                  <View key={entry.id} style={styles.chartItem}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: 18 + entry.mood * 12,
                          backgroundColor: theme.primary,
                        },
                      ]}
                    />
                    <Text style={styles.chartEmoji}>{moodEmoji(entry.mood)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {detail.emotional_diary.slice(0, 4).map((entry) => (
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
                {entry.tags?.length ? (
                  <View style={styles.tagRow}>
                    {entry.tags.map((tag) => (
                      <View key={`${entry.id}-${tag}`} style={[styles.tag, { backgroundColor: theme.background }]}>
                        <Text style={[styles.tagText, { color: theme.primary }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Documentos</Text>
        {detail.documents.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Nenhum documento disponÃ­vel.</Text>
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
  notesText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
  listCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  chartTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  chartItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  chartBar: {
    width: '100%',
    borderRadius: 999,
    minHeight: 20,
  },
  chartEmoji: {
    fontSize: 18,
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 14,
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
