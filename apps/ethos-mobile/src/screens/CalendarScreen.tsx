import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Plus, X, Clock, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fetchSessions } from '../services/api/sessions';

// Configure Portuguese locale
LocaleConfig.locales['pt'] = {
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt';

type Session = {
  id: string;
  patient_name?: string;
  patient_id?: string;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  duration_minutes?: number;
};

type MarkedDates = Record<string, {
  dots?: Array<{ key: string; color: string }>;
  selected?: boolean;
  selectedColor?: string;
}>;

const STATUS_COLOR: Record<Session['status'], string> = {
  completed: '#3a9b73',
  confirmed: '#3a9b73',
  pending: '#edbd2a',
  cancelled: '#bd3737',
};

const STATUS_LABEL: Record<Session['status'], string> = {
  completed: 'Realizada',
  confirmed: 'Confirmada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function toDateKey(iso: string): string {
  return iso.split('T')[0];
}

export default function CalendarScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const d = new Date(currentMonth);
      const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const to = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const data = await fetchSessions({ from, to });
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const markedDates = useMemo<MarkedDates>(() => {
    const result: MarkedDates = {};
    for (const session of sessions) {
      const key = toDateKey(session.scheduled_at);
      if (!result[key]) result[key] = { dots: [] };
      const existing = result[key].dots ?? [];
      const color = STATUS_COLOR[session.status] ?? '#9ba1b0';
      if (!existing.some((d) => d.color === color)) {
        existing.push({ key: `${key}-${color}`, color });
      }
      result[key].dots = existing;
    }
    if (selectedDate) {
      result[selectedDate] = {
        ...result[selectedDate],
        selected: true,
        selectedColor: theme.primary,
      };
    }
    return result;
  }, [sessions, selectedDate, theme.primary]);

  const selectedDaySessions = useMemo<Session[]>(() => {
    if (!selectedDate) return [];
    return sessions.filter((s) => toDateKey(s.scheduled_at) === selectedDate);
  }, [sessions, selectedDate]);

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    setBottomSheetVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.foreground }]}>Agenda</Text>
        {loading && <ActivityIndicator size="small" color={theme.primary} />}
      </View>

      {/* Calendar */}
      <Calendar
        current={currentMonth}
        onDayPress={handleDayPress}
        onMonthChange={(month: { dateString: string }) => setCurrentMonth(month.dateString)}
        markingType="multi-dot"
        markedDates={markedDates}
        theme={{
          backgroundColor: theme.background,
          calendarBackground: theme.background,
          textSectionTitleColor: theme.mutedForeground,
          selectedDayBackgroundColor: theme.primary,
          selectedDayTextColor: theme.primaryForeground,
          todayTextColor: theme.primary,
          dayTextColor: theme.foreground,
          textDisabledColor: theme.muted,
          dotColor: theme.accent,
          selectedDotColor: theme.primaryForeground,
          arrowColor: theme.primary,
          monthTextColor: theme.foreground,
          indicatorColor: theme.primary,
          textDayFontFamily: 'Inter',
          textMonthFontFamily: 'Lora',
          textDayHeaderFontFamily: 'Inter',
          textDayFontSize: 15,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 12,
        }}
        style={styles.calendar}
      />

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: theme.border }]}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendLabel, { color: theme.mutedForeground }]}>
              {STATUS_LABEL[status as Session['status']]}
            </Text>
          </View>
        ))}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('CreateSession')}
        activeOpacity={0.85}
      >
        <Plus size={24} color={theme.primaryForeground} />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Modal
        visible={bottomSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBottomSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBottomSheetVisible(false)}
        />
        <View style={[styles.bottomSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.foreground }]}>
              {selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : ''}
            </Text>
            <TouchableOpacity onPress={() => setBottomSheetVisible(false)}>
              <X size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bottomSheetList} showsVerticalScrollIndicator={false}>
            {selectedDaySessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.mutedForeground }]}>
                  Nenhuma sessao neste dia.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyStateButton, { borderColor: theme.primary }]}
                  onPress={() => {
                    setBottomSheetVisible(false);
                    navigation.navigate('CreateSession');
                  }}
                >
                  <Text style={[styles.emptyStateButtonText, { color: theme.primary }]}>
                    Agendar sessao
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              selectedDaySessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[styles.sessionCard, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => {
                    setBottomSheetVisible(false);
                    navigation.navigate('SessionHub', { sessionId: session.id });
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.statusBar, { backgroundColor: STATUS_COLOR[session.status] }]} />
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionRow}>
                      <User size={14} color={theme.mutedForeground} />
                      <Text style={[styles.sessionPatient, { color: theme.foreground }]}>
                        {session.patient_name ?? 'Paciente'}
                      </Text>
                    </View>
                    <View style={styles.sessionRow}>
                      <Clock size={14} color={theme.mutedForeground} />
                      <Text style={[styles.sessionTime, { color: theme.mutedForeground }]}>
                        {formatTime(session.scheduled_at)}
                        {session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[session.status]}20` }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[session.status] }]}>
                      {STATUS_LABEL[session.status]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: 'Lora',
    fontSize: 22,
    fontWeight: '600',
  },
  calendar: {
    paddingBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    maxHeight: '60%',
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 12,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  bottomSheetTitle: {
    fontFamily: 'Lora',
    fontSize: 17,
    fontWeight: '600',
    textTransform: 'capitalize',
    flex: 1,
  },
  bottomSheetList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  emptyStateText: {
    fontFamily: 'Inter',
    fontSize: 15,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  emptyStateButtonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  statusBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  sessionInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionPatient: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
  },
  sessionTime: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  statusBadge: {
    marginRight: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
  },
});
