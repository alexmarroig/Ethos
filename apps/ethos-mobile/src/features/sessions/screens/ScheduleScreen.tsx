// apps/ethos-mobile/src/screens/ScheduleScreen.tsx

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

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  MessageCircle,
  MoreVertical,
  Plus,
  Video,
} from 'lucide-react-native';

import { colors } from '../theme/colors';
import { SessionContextModal } from '../components/SessionContextModal';

import { fetchPatients } from '../services/api/patients';
import { fetchSessions } from '../services/api/sessions';

import type { PatientRecord, SessionRecord } from '../services/api/types';

import {
  applyWhatsAppTemplate,
  defaultWhatsAppMessageSettings,
  loadWhatsAppMessageSettings,
  openWhatsAppLink,
} from '../services/whatsapp';

import {
  applySessionReminderState,
  markSessionReminderSent,
} from '../services/localReminders';

// ==========================
// CONSTANTS
// ==========================
const primaryTeal = '#234e5c';
const accentTeal = '#439299';

// ==========================
// HELPERS
// ==========================
const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const buildWeekStrip = (selectedDate: Date) => {
  const base = startOfDay(selectedDate);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() - 3 + index);

    return {
      key: date.toISOString(),
      value: date,
      day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      dateLabel: date.toLocaleDateString('pt-BR', { day: '2-digit' }),
      active: date.toDateString() === base.toDateString(),
    };
  });
};

const formatSessionTime = (session: SessionRecord) => {
  const start = new Date(session.scheduled_at);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + (session.duration_minutes ?? 50));

  return `${start.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${end.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const isSessionReminderPending = (session: SessionRecord) => {
  const scheduledAt = Date.parse(session.scheduled_at);
  const now = Date.now();

  const withinNext24Hours =
    scheduledAt >= now &&
    scheduledAt - now <= 24 * 60 * 60 * 1000;

  const actionableStatus =
    session.status !== 'completed' &&
    session.status !== 'missed';

  return actionableStatus && withinNext24Hours && session.reminderSent !== true;
};

const resolvePatientName = (
  session: SessionRecord,
  patients: PatientRecord[],
) =>
  patients.find(
    (p) =>
      p.id === session.patient_id ||
      p.external_id === session.patient_id,
  )?.label ?? 'Paciente sem identificação';

// ==========================
// COMPONENT
// ==========================
export default function ScheduleScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);

  const [messageSettings, setMessageSettings] =
    useState(defaultWhatsAppMessageSettings);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================
  // LOAD DATA
  // ==========================
  const loadAgenda = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [sessionRes, patientRes, settings] = await Promise.all([
        fetchSessions(),
        fetchPatients(),
        loadWhatsAppMessageSettings(),
      ]);

      setSessions(await applySessionReminderState(sessionRes));
      setPatients(patientRes);
      setMessageSettings(settings);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível carregar a agenda.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAgenda();
    }, [loadAgenda]),
  );

  // ==========================
  // DERIVED STATE
  // ==========================
  const weekDays = useMemo(
    () => buildWeekStrip(selectedDate),
    [selectedDate],
  );

  const filteredSessions = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            startOfDay(new Date(s.scheduled_at)).getTime() ===
            selectedDate.getTime(),
        )
        .sort(
          (a, b) =>
            Date.parse(a.scheduled_at) -
            Date.parse(b.scheduled_at),
        ),
    [selectedDate, sessions],
  );

  // ==========================
  // ACTIONS
  // ==========================
  const openSession = (session: SessionRecord) => {
    navigation.navigate('SessionHub', { session });
  };

  const handleWhatsAppReminder = async (session: SessionRecord) => {
    const patient = patients.find(
      (p) =>
        p.id === session.patient_id ||
        p.external_id === session.patient_id,
    );

    if (!patient?.phone) {
      Alert.alert(
        'Telefone necessário',
        'Adicione um telefone ao paciente.',
      );
      return;
    }

    const message = applyWhatsAppTemplate(
      messageSettings.sessionReminderTemplate,
      {
        NOME: patient.label,
        HORARIO: new Date(session.scheduled_at).toLocaleTimeString('pt-BR'),
      },
    );

    await openWhatsAppLink(patient.phone, message);
    await markSessionReminderSent(session.id);
  };

  // ==========================
  // UI
  // ==========================
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.mutedForeground }]}>
            {selectedDate.toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <Text style={[styles.title, { color: primaryTeal }]}>
            Agenda Clínica
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('CreateSession')}
        >
          <Plus size={22} color={primaryTeal} />
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <ScrollView style={{ padding: 20 }}>
        {isLoading ? (
          <ActivityIndicator color={primaryTeal} />
        ) : error ? (
          <Text>{error}</Text>
        ) : (
          filteredSessions.map((session) => (
            <Text key={session.id}>{formatSessionTime(session)}</Text>
          ))
        )}
      </ScrollView>

      <SessionContextModal
        visible={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        onValidate={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </View>
  );
}

// ==========================
// STYLES
// ==========================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Lora',
  },
  greeting: {
    fontSize: 14,
  },
  iconButton: {
    padding: 10,
  },
});