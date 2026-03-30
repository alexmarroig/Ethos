import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { colors } from '../theme/colors';
import { useNotifications } from '../contexts/NotificationsContext';
import { fetchPatientDocuments, fetchPatientSessions } from '../services/api/patientPortal';
import { fetchPatientDiaryEntries } from '../services/api/emotionalDiary';
import type { ClinicalDocumentRecord, EmotionalDiaryEntryRecord, SessionRecord } from '../services/api/types';

const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function PatientDashboardScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { notifications, refreshNotifications } = useNotifications();

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocumentRecord[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<EmotionalDiaryEntryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [nextSessions, nextDocuments, nextDiaryEntries] = await Promise.all([
        fetchPatientSessions(),
        fetchPatientDocuments(),
        fetchPatientDiaryEntries(),
        refreshNotifications(),
      ]);
      setSessions(nextSessions);
      setDocuments(nextDocuments);
      setDiaryEntries(nextDiaryEntries);
    } catch (loadError: any) {
      setError(loadError?.message ?? 'Nao foi possivel carregar o portal do paciente.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshNotifications]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const nextSession = useMemo(
    () =>
      [...sessions]
        .filter((session) => Date.parse(session.scheduled_at) >= Date.now())
        .sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at))[0] ?? null,
    [sessions],
  );

  const recentSessions = useMemo(
    () =>
      [...sessions]
        .sort((left, right) => Date.parse(right.scheduled_at) - Date.parse(left.scheduled_at))
        .slice(0, 3),
    [sessions],
  );

  const recentDocuments = useMemo(
    () =>
      [...documents]
        .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
        .slice(0, 3),
    [documents],
  );

  const lastDiaryEntry = useMemo(
    () =>
      [...diaryEntries]
        .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))[0] ?? null,
    [diaryEntries],
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Portal do Paciente</Text>
        <Text style={[styles.title, { color: theme.foreground }]}>Visao geral</Text>
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Carregando suas informacoes...</Text>
        </View>
      ) : error ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.foreground }]}>Nao foi possivel carregar o painel.</Text>
          <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>{error}</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.card, styles.diaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('EmotionalDiary')}
          >
            <Text style={[styles.cardLabel, { color: theme.mutedForeground }]}>DIARIO EMOCIONAL</Text>
            <Text style={[styles.cardTitle, { color: theme.foreground }]}>Como voce esta se sentindo hoje?</Text>
            <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>
              {lastDiaryEntry
                ? `Ultimo registro: humor ${lastDiaryEntry.mood}/5 em ${formatDate(lastDiaryEntry.date)}.`
                : 'Leva menos de 10 segundos para registrar seu momento atual.'}
            </Text>
            <View style={styles.diaryButton}>
              <Text style={styles.diaryButtonText}>Registrar agora</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.mutedForeground }]}>PROXIMA SESSAO</Text>
            <Text style={[styles.cardTitle, { color: theme.foreground }]}>
              {nextSession ? formatDate(nextSession.scheduled_at) : 'Nenhuma sessao agendada'}
            </Text>
            <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>
              {nextSession ? `Status: ${nextSession.status}` : 'Assim que uma nova sessao for marcada, ela aparecera aqui.'}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.mutedForeground }]}>ULTIMAS SESSOES</Text>
            {recentSessions.length === 0 ? (
              <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>Nenhuma sessao encontrada.</Text>
            ) : (
              recentSessions.map((session) => (
                <View key={session.id} style={[styles.listRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.listTitle, { color: theme.foreground }]}>{formatDate(session.scheduled_at)}</Text>
                  <Text style={[styles.listMeta, { color: theme.mutedForeground }]}>{session.status}</Text>
                </View>
              ))
            )}
          </View>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.mutedForeground }]}>DOCUMENTOS RECENTES</Text>
            {recentDocuments.length === 0 ? (
              <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>Nenhum documento disponivel.</Text>
            ) : (
              recentDocuments.map((document) => (
                <TouchableOpacity
                  key={document.id}
                  style={[styles.listRow, { borderBottomColor: theme.border }]}
                  onPress={() => navigation.navigate('PatientDocumentDetail', { documentId: document.id })}
                >
                  <View style={styles.listTextGroup}>
                    <Text style={[styles.listTitle, { color: theme.foreground }]}>{document.title}</Text>
                    <Text style={[styles.listMeta, { color: theme.mutedForeground }]}>{document.template_id}</Text>
                  </View>
                  <Text style={[styles.listMeta, { color: theme.mutedForeground }]}>{formatDate(document.created_at)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.mutedForeground }]}>NOTIFICACOES</Text>
            {notifications.length === 0 ? (
              <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>Nenhum aviso no momento.</Text>
            ) : (
              notifications.slice(0, 3).map((notification) => (
                <View key={notification.id} style={[styles.listRow, { borderBottomColor: theme.border }]}>
                  <View style={styles.listTextGroup}>
                    <Text style={[styles.listTitle, { color: theme.foreground }]}>{notification.title}</Text>
                    <Text style={[styles.listMeta, { color: theme.mutedForeground }]}>{notification.message}</Text>
                  </View>
                  <Text style={[styles.listMeta, { color: theme.mutedForeground }]}>{formatDate(notification.created_at)}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
  header: {
    gap: 6,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  title: {
    fontFamily: 'Lora',
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  diaryCard: {
    gap: 4,
  },
  cardLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'Lora',
    fontSize: 22,
    fontWeight: '700',
  },
  bodyText: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  listRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  listTextGroup: {
    gap: 4,
  },
  listTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
  },
  listMeta: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  diaryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#234e5c',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  diaryButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },
  stateCard: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  stateText: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
});
