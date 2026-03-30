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
import { Calendar as CalendarIcon, CheckCircle2, Clock, MessageCircle, MoreVertical, Plus, Video } from 'lucide-react-native';

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
import { applySessionReminderState, markSessionReminderSent } from '../services/localReminders';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

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
  return `${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const isSessionReminderPending = (session: SessionRecord) => {
  const scheduledAt = Date.parse(session.scheduled_at);
  const now = Date.now();
  const withinNext24Hours = scheduledAt >= now && scheduledAt - now <= 24 * 60 * 60 * 1000;
  const actionableStatus = session.status !== 'completed' && session.status !== 'missed';

  return actionableStatus && withinNext24Hours && session.reminderSent !== true;
};

const resolvePatientName = (session: SessionRecord, patients: PatientRecord[]) =>
  patients.find((patient) => patient.id === session.patient_id || patient.external_id === session.patient_id)?.label ?? 'Paciente sem identificaÃ§Ã£o';

export default function ScheduleScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [messageSettings, setMessageSettings] = useState(defaultWhatsAppMessageSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgenda = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [sessionResponse, patientResponse, storedSettings] = await Promise.all([
        fetchSessions(),
        fetchPatients(),
        loadWhatsAppMessageSettings(),
      ]);
      setSessions(await applySessionReminderState(sessionResponse));
      setPatients(patientResponse);
      setMessageSettings(storedSettings);
    } catch (loadError: any) {
      setError(loadError?.message ?? 'NÃ£o foi possÃ­vel carregar a agenda.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAgenda();
    }, [loadAgenda]),
  );

  const weekDays = useMemo(() => buildWeekStrip(selectedDate), [selectedDate]);

  const filteredSessions = useMemo(
    () =>
      sessions
        .filter((session) => startOfDay(new Date(session.scheduled_at)).getTime() === selectedDate.getTime())
        .sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at)),
    [selectedDate, sessions],
  );

  const openSession = (session: SessionRecord) => {
    navigation.navigate('SessionHub', {
      session,
      patientName: resolvePatientName(session, patients),
    });
  };

  const handleWhatsAppReminder = async (session: SessionRecord) => {
    const patient = patients.find((item) => item.id === session.patient_id || item.external_id === session.patient_id);
    if (!patient?.phone) {
      Alert.alert('Telefone necessario', 'Adicione um telefone ao paciente para abrir o lembrete no WhatsApp.');
      return;
    }

    const sessionTime = new Date(session.scheduled_at).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const message = applyWhatsAppTemplate(messageSettings.sessionReminderTemplate, {
      NOME: patient.label,
      HORARIO: sessionTime,
    });

    try {
      await openWhatsAppLink(patient.phone, message);
      await markSessionReminderSent(session.id);
      setSessions((current) =>
        current.map((item) => (item.id === session.id ? { ...item, reminderSent: true } : item)),
      );
    } catch (openError: any) {
      Alert.alert('Nao foi possivel abrir o WhatsApp', openError?.message ?? 'Tente novamente em instantes.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.mutedForeground }]}>
            {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={[styles.title, { color: primaryTeal }]}>Agenda ClÃ­nica</Text>
        </View>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]} onPress={() => navigation.navigate('CreateSession')}>
          <Plus size={22} color={primaryTeal} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
          {weekDays.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.dayCard,
                item.active && styles.activeDayCard,
                { backgroundColor: item.active ? primaryTeal : (isDark ? '#2a2d31' : '#fff') },
              ]}
              onPress={() => setSelectedDate(startOfDay(item.value))}
            >
              <Text style={[styles.dayText, { color: item.active ? '#fff' : theme.mutedForeground }]}>
                {item.day}
              </Text>
              <Text style={[styles.dateNumber, { color: item.active ? '#fff' : primaryTeal }]}>
                {item.dateLabel}
              </Text>
              {item.active ? <View style={styles.activeDot} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: primaryTeal }]}>SessÃµes do Dia</Text>
          <View style={styles.sessionCount}>
            <Text style={styles.sessionCountText}>{filteredSessions.length} agendadas</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={primaryTeal} />
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Carregando agenda...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={[styles.stateTitle, { color: theme.foreground }]}>Falha ao carregar a agenda.</Text>
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadAgenda}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={styles.stateCard}>
            <CalendarIcon size={22} color={theme.mutedForeground} />
            <Text style={[styles.stateTitle, { color: theme.foreground }]}>Nenhuma sessÃ£o nesta data.</Text>
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Crie uma nova sessÃ£o para preencher a agenda.</Text>
          </View>
        ) : (
          filteredSessions.map((session, index) => {
            const patientName = resolvePatientName(session, patients);
            const isCompleted = session.status === 'completed';
            const isConfirmed = session.status === 'confirmed';
            const pendingReminder = isSessionReminderPending(session);

            return (
              <Animated.View key={session.id} entering={FadeInDown.delay(index * 70).duration(400)}>
                <TouchableOpacity
                  style={[styles.sessionCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}
                  onPress={() => openSession(session)}
                >
                  <View style={styles.sessionHeaderRow}>
                    <View style={styles.timeWrapper}>
                      <Clock size={14} color={accentTeal} />
                      <Text style={[styles.timeLabel, { color: accentTeal }]}>{formatSessionTime(session)}</Text>
                    </View>
                    {isConfirmed ? (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>CONFIRMADA</Text>
                      </View>
                    ) : null}
                    {isCompleted ? (
                      <View style={styles.completedBadge}>
                        <CheckCircle2 size={12} color="#16a34a" />
                        <Text style={styles.completedText}>CONCLUÃDA</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.patientRow}>
                    <View style={styles.patientInfo}>
                      <Text style={[styles.patientName, { color: primaryTeal }]}>{patientName}</Text>
                      <View style={styles.typeTag}>
                        <Video size={14} color={theme.mutedForeground} />
                        <Text style={[styles.typeText, { color: theme.mutedForeground }]}>
                          {session.duration_minutes ? `${session.duration_minutes} min` : '50 min'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.moreIcon} onPress={() => setSelectedSession(session)}>
                      <MoreVertical size={20} color={theme.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  {pendingReminder ? (
                    <View style={styles.reminderBadge}>
                      <Text style={styles.reminderBadgeText}>Lembrete pendente</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <View style={styles.footerActions}>
                      <TouchableOpacity style={styles.footerLink} onPress={() => openSession(session)}>
                        <Clock size={14} color={theme.mutedForeground} />
                        <Text style={[styles.footerLinkText, { color: theme.mutedForeground }]}>
                          Abrir Sessao
                        </Text>
                      </TouchableOpacity>
                      {pendingReminder ? (
                        <TouchableOpacity style={styles.whatsAppLink} onPress={() => handleWhatsAppReminder(session)}>
                          <MessageCircle size={14} color="#0f9d58" />
                          <Text style={styles.whatsAppLinkText}>Enviar via WhatsApp</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <SessionContextModal
        visible={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        onValidate={() => Alert.alert('Em breve', 'A validaÃ§Ã£o serÃ¡ conectada na prÃ³xima etapa.')}
        onEdit={() => navigation.navigate('CreateSession', { patientId: selectedSession?.patient_id })}
        onDelete={() => Alert.alert('Em breve', 'ExclusÃ£o de sessÃ£o ainda nÃ£o foi habilitada.')}
      />
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
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Inter',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 26,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  calendarStrip: {
    paddingVertical: 10,
    paddingBottom: 20,
  },
  calendarScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dayCard: {
    width: 65,
    height: 90,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  activeDayCard: {
    shadowColor: primaryTeal,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 5,
  },
  dayText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  dateNumber: {
    fontSize: 20,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginTop: 6,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  sessionCount: {
    backgroundColor: 'rgba(67, 146, 153, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sessionCountText: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: accentTeal,
    fontWeight: '600',
  },
  sessionCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eefbf7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '800',
    color: '#10b981',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  completedText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '800',
    color: '#16a34a',
  },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff7ed',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  reminderBadgeText: {
    color: '#ea580c',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontFamily: 'Lora',
    fontWeight: '700',
    marginBottom: 4,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 13,
    fontFamily: 'Inter',
  },
  moreIcon: {
    padding: 8,
  },
  cardFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLinkText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  whatsAppLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 157, 88, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  whatsAppLinkText: {
    color: '#0f9d58',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
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
  retryButton: {
    marginTop: 8,
    backgroundColor: primaryTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontWeight: '700',
  },
});
