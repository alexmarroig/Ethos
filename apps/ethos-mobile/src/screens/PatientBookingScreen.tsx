/**
 * PatientBookingScreen — Agendamento de sessão pelo paciente
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { CheckCircle, Clock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { clinicalApiClient } from '../services/api/clinicalClient';

// LocaleConfig should already be set from CalendarScreen, but set defensively
if (!LocaleConfig.defaultLocale) {
  LocaleConfig.defaultLocale = 'pt';
}

type Slot = {
  id: string;
  date: string;
  time: string;
  duration_minutes: number;
  available: boolean;
};

type BookingRequest = {
  id: string;
  slot_date: string;
  slot_time: string;
  status: 'pending' | 'confirmed' | 'declined';
  created_at: string;
};

const STATUS_LABEL: Record<BookingRequest['status'], string> = {
  pending: 'Aguardando confirmacao',
  confirmed: 'Confirmado',
  declined: 'Recusado',
};
const STATUS_COLOR: Record<BookingRequest['status'], string> = {
  pending: '#edbd2a',
  confirmed: '#3a9b73',
  declined: '#bd3737',
};

export default function PatientBookingScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'requests'>('calendar');

  const loadAvailableDates = useCallback(async () => {
    try {
      const res = await clinicalApiClient.request<any>('/patient/available-dates', { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.dates ?? [];
      setAvailableDates(data);
    } catch {
      setAvailableDates([]);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const res = await clinicalApiClient.request<any>('/patient/bookings', { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setRequests(data);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    void loadAvailableDates();
    void loadRequests();
  }, [loadAvailableDates, loadRequests]);

  const loadSlotsForDate = useCallback(async (date: string) => {
    setLoadingSlots(true);
    try {
      const res = await clinicalApiClient.request<any>(`/patient/slots?date=${date}`, { method: 'GET' });
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    void loadSlotsForDate(day.dateString);
  };

  const handleBook = async (slot: Slot) => {
    Alert.alert(
      'Solicitar horario?',
      `${slot.date} às ${slot.time} — ${slot.duration_minutes} min`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: async () => {
            setSubmitting(true);
            try {
              await clinicalApiClient.request('/patient/bookings', {
                method: 'POST',
                body: { slot_id: slot.id, date: slot.date, time: slot.time },
              });
              Alert.alert('Solicitacao enviada!', 'Aguarde a confirmacao do psicólogo.');
              void loadRequests();
            } catch (err: any) {
              Alert.alert('Erro', err?.message ?? 'Nao foi possivel enviar a solicitacao.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const markedDates = useMemo(() => {
    const result: Record<string, any> = {};
    for (const date of availableDates) {
      result[date] = { marked: true, dotColor: theme.statusValidated };
    }
    if (selectedDate) {
      result[selectedDate] = { ...(result[selectedDate] ?? {}), selected: true, selectedColor: theme.primary };
    }
    return result;
  }, [availableDates, selectedDate, theme.primary, theme.statusValidated]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {(['calendar', 'requests'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.primary : theme.mutedForeground }]}>
              {tab === 'calendar' ? 'Agendar' : `Solicitacoes (${requests.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'calendar' ? (
        <>
          <Calendar
            onDayPress={handleDayPress}
            markingType="custom"
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
              arrowColor: theme.primary,
              monthTextColor: theme.foreground,
              textDayFontFamily: 'Inter',
              textMonthFontFamily: 'Lora',
              textDayHeaderFontFamily: 'Inter',
            }}
          />

          {selectedDate && (
            <View style={[styles.slotsContainer, { borderTopColor: theme.border }]}>
              <Text style={[styles.slotsTitle, { color: theme.foreground }]}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              {loadingSlots ? (
                <ActivityIndicator color={theme.primary} style={{ margin: 16 }} />
              ) : slots.length === 0 ? (
                <Text style={[styles.noSlots, { color: theme.mutedForeground }]}>Nenhum horario disponivel neste dia.</Text>
              ) : (
                <FlatList
                  data={slots}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(s) => s.id}
                  contentContainerStyle={styles.slotsList}
                  renderItem={({ item: slot }) => (
                    <TouchableOpacity
                      style={[styles.slotCard, {
                        backgroundColor: slot.available ? theme.card : theme.secondary,
                        borderColor: slot.available ? theme.primary : theme.border,
                        opacity: slot.available ? 1 : 0.5,
                      }]}
                      onPress={() => slot.available && void handleBook(slot)}
                      disabled={!slot.available || submitting}
                      activeOpacity={0.8}
                    >
                      <Clock size={14} color={theme.primary} />
                      <Text style={[styles.slotTime, { color: theme.foreground }]}>{slot.time}</Text>
                      <Text style={[styles.slotDuration, { color: theme.mutedForeground }]}>{slot.duration_minutes} min</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
        </>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.requestsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Sem solicitacoes</Text>
              <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>Suas solicitacoes de horario aparecerão aqui.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.requestCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.requestInfo}>
                <Text style={[styles.requestDate, { color: theme.foreground }]}>
                  {new Date(item.slot_date).toLocaleDateString('pt-BR')} às {item.slot_time}
                </Text>
                <Text style={[styles.requestCreated, { color: theme.mutedForeground }]}>
                  Solicitado em {new Date(item.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <View style={[styles.requestStatus, { backgroundColor: `${STATUS_COLOR[item.status]}20` }]}>
                <Text style={[styles.requestStatusText, { color: STATUS_COLOR[item.status] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },
  slotsContainer: { padding: 16, borderTopWidth: 1 },
  slotsTitle: { fontFamily: 'Inter', fontSize: 15, fontWeight: '700', marginBottom: 12, textTransform: 'capitalize' },
  noSlots: { fontFamily: 'Inter', fontSize: 14 },
  slotsList: { gap: 10, paddingBottom: 8 },
  slotCard: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
    minWidth: 80,
  },
  slotTime: { fontFamily: 'Inter', fontSize: 16, fontWeight: '700' },
  slotDuration: { fontFamily: 'Inter', fontSize: 11 },
  requestsList: { padding: 16, gap: 10 },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  requestInfo: { flex: 1 },
  requestDate: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600' },
  requestCreated: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  requestStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 12 },
  requestStatusText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { fontFamily: 'Lora', fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center' },
});
