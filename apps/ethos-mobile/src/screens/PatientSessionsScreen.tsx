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

import { colors } from '../theme/colors';
import { fetchPatientSessions } from '../services/api/patientPortal';
import type { SessionRecord } from '../services/api/types';

const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function PatientSessionsScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSessions(await fetchPatientSessions());
    } catch (loadError: any) {
      setError(loadError?.message ?? 'Nao foi possivel carregar suas sessoes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSessions();
    }, [loadSessions]),
  );

  const orderedSessions = useMemo(
    () => [...sessions].sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at)),
    [sessions],
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.foreground }]}>Sessoes</Text>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Carregando sessoes...</Text>
        </View>
      ) : error ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.foreground }]}>Nao foi possivel carregar.</Text>
          <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>{error}</Text>
        </View>
      ) : orderedSessions.length === 0 ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.foreground }]}>Nenhuma sessao agendada.</Text>
          <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>Quando houver novas sessoes, elas aparecerao aqui.</Text>
        </View>
      ) : (
        orderedSessions.map((session) => (
          <View key={session.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.foreground }]}>{formatDate(session.scheduled_at)}</Text>
            <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>Status: {session.status}</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              onPress={() => Alert.alert('Em breve', 'A confirmacao de presenca sera conectada em uma proxima etapa.')}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Confirmar presenca</Text>
            </TouchableOpacity>
          </View>
        ))
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
  title: {
    fontFamily: 'Lora',
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 10,
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
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
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
