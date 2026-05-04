import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import {
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Filter,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fetchPatients } from '../services/api/patients';
import { fetchSessions, updateSessionStatus } from '../services/api/sessions';
import type { PatientRecord, SessionRecord } from '../services/api/types';
import {
  applyWhatsAppTemplate,
  defaultWhatsAppMessageSettings,
  loadWhatsAppMessageSettings,
  openWhatsAppLink,
} from '../services/whatsapp';

LocaleConfig.locales.pt = {
  monthNames: [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt';

type AgendaView = 'day' | 'week' | 'month';
type CommandKey = 'session' | 'prepare' | 'share' | 'today' | 'pending';
type MarkedDates = Record<string, {
  dots?: Array<{ key: string; color: string }>;
  selected?: boolean;
  selectedColor?: string;
}>;

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

const STATUS_COLOR: Record<SessionRecord['status'], string> = {
  scheduled: '#edbd2a',
  confirmed: '#3a9b73',
  completed: '#3a9b73',
  missed: '#bd3737',
};

const STATUS_LABEL: Record<SessionRecord['status'], string> = {
  scheduled: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Concluida',
  missed: 'Faltou',
};

const CHECKLIST = [
  'Queixa revisada',
  'Ultima evolucao',
  'Supervisao revisada',
  'Tarefa conferida',
  'Ficha pronta',
];

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const dateKey = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const formatTimeRange = (session: SessionRecord) => {
  const start = new Date(session.scheduled_at);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + (session.duration_minutes ?? 50));
  return `${formatTime(session.scheduled_at)} - ${end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const buildWeekDays = (selectedDate: Date) => {
  const base = startOfDay(selectedDate);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diff);

  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(monday);
    value.setDate(monday.getDate() + index);
    return {
      key: dateKey(value),
      value,
      weekday: value.toLocaleDateString('pt-BR', { weekday: 'short' }),
      day: value.toLocaleDateString('pt-BR', { day: '2-digit' }),
      isToday: dateKey(value) === dateKey(new Date()),
      active: dateKey(value) === dateKey(base),
    };
  });
};

const monthWindowFor = (monthAnchor: string) => {
  const anchor = new Date(`${monthAnchor}T12:00:00`);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: dateKey(first), to: dateKey(last) };
};

export default function CalendarScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [view, setView] = useState<AgendaView>('day');
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [prepareOpen, setPrepareOpen] = useState(false);
  const [checklistState, setChecklistState] = useState<Record<string, string[]>>({});
  const [messageSettings, setMessageSettings] = useState(defaultWhatsAppMessageSettings);

  const patientById = useMemo(() => {
    const map = new Map<string, PatientRecord>();
    patients.forEach((patient) => {
      map.set(patient.id, patient);
      if (patient.external_id) map.set(patient.external_id, patient);
    });
    return map;
  }, [patients]);

  const resolvePatient = (session: SessionRecord) => patientById.get(session.patient_id) ?? null;
  const resolvePatientName = (session: SessionRecord) => resolvePatient(session)?.label ?? 'Paciente';

  const loadAgenda = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = monthWindowFor(currentMonth);
      const [nextSessions, nextPatients, nextSettings] = await Promise.all([
        fetchSessions(range),
        fetchPatients(),
        loadWhatsAppMessageSettings(),
      ]);
      setSessions(Array.isArray(nextSessions) ? nextSessions : []);
      setPatients(Array.isArray(nextPatients) ? nextPatients : []);
      setMessageSettings(nextSettings);
    } catch (loadError: any) {
      setSessions([]);
      setError(loadError?.message ?? 'Nao foi possivel carregar a agenda.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    void loadAgenda();
  }, [loadAgenda]);

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sessions
      .filter((session) => {
        if (!term) return true;
        const patient = resolvePatient(session);
        return [
          patient?.label,
          patient?.main_complaint,
          session.status,
          dateKey(session.scheduled_at),
          formatTime(session.scheduled_at),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at));
  }, [patientById, search, sessions]);

  const selectedDaySessions = useMemo(
    () => filteredSessions.filter((session) => dateKey(session.scheduled_at) === selectedDate),
    [filteredSessions, selectedDate],
  );

  const selectedDayClinicalSessions = selectedDaySessions;
  const weekDays = useMemo(() => buildWeekDays(new Date(`${selectedDate}T12:00:00`)), [selectedDate]);

  const weekSessionsByDay = useMemo(() => {
    const map = new Map<string, SessionRecord[]>();
    weekDays.forEach((day) => map.set(day.key, []));
    filteredSessions.forEach((session) => {
      const key = dateKey(session.scheduled_at);
      if (map.has(key)) map.get(key)?.push(session);
    });
    return map;
  }, [filteredSessions, weekDays]);

  const markedDates = useMemo<MarkedDates>(() => {
    const result: MarkedDates = {};
    for (const session of filteredSessions) {
      const key = dateKey(session.scheduled_at);
      const color = STATUS_COLOR[session.status] ?? '#9ba1b0';
      if (!result[key]) result[key] = { dots: [] };
      if (!result[key].dots?.some((dot) => dot.color === color)) {
        result[key].dots?.push({ key: `${key}-${color}`, color });
      }
    }
    result[selectedDate] = {
      ...result[selectedDate],
      selected: true,
      selectedColor: theme.primary,
    };
    return result;
  }, [filteredSessions, selectedDate, theme.primary]);

  const monthSummary = useMemo(() => {
    const pending = filteredSessions.filter((session) => session.status === 'scheduled' || session.status === 'missed').length;
    const confirmed = filteredSessions.filter((session) => session.status === 'confirmed').length;
    return { total: filteredSessions.length, pending, confirmed };
  }, [filteredSessions]);

  const buildBriefingText = (session: SessionRecord) => {
    const patient = resolvePatient(session);
    const complaint = patient?.main_complaint || 'Sem queixa principal registrada.';
    const notes = patient?.notes || 'Sem observacoes recentes no cadastro.';
    return [
      `Pre-sessao - ${resolvePatientName(session)}`,
      `Horario: ${formatTimeRange(session)}`,
      `Queixa principal: ${complaint}`,
      `Evolucao/contexto: ${notes}`,
      'Revisar supervisoes, tarefas combinadas e pendencias antes de iniciar.',
    ].join('\n');
  };

  const shareDayBriefings = async () => {
    if (selectedDayClinicalSessions.length === 0) {
      Alert.alert('Sem sessoes', 'Esse dia nao tem sessoes para preparar.');
      return;
    }
    await Share.share({
      message: selectedDayClinicalSessions.map(buildBriefingText).join('\n\n---\n\n'),
    });
  };

  const openWhatsAppReminder = async (session: SessionRecord) => {
    const patient = resolvePatient(session);
    const phone = patient?.whatsapp || patient?.phone;
    if (!phone) {
      Alert.alert('Telefone necessario', 'Adicione WhatsApp ou telefone ao paciente para enviar lembrete.');
      return;
    }
    const message = applyWhatsAppTemplate(messageSettings.sessionReminderTemplate, {
      NOME: patient?.label ?? 'Paciente',
      HORARIO: formatTime(session.scheduled_at),
    });
    try {
      await openWhatsAppLink(phone, message);
    } catch (whatsAppError: any) {
      Alert.alert('Nao foi possivel abrir o WhatsApp', whatsAppError?.message ?? 'Tente novamente.');
    }
  };

  const setSessionStatus = async (session: SessionRecord, status: SessionRecord['status']) => {
    try {
      const updated = await updateSessionStatus(session.id, status);
      setSessions((current) => current.map((item) => (item.id === session.id ? updated : item)));
    } catch (statusError: any) {
      Alert.alert('Nao foi possivel atualizar', statusError?.message ?? 'Tente novamente.');
    }
  };

  const toggleChecklistItem = (sessionId: string, item: string) => {
    setChecklistState((current) => {
      const checked = new Set(current[sessionId] ?? []);
      if (checked.has(item)) checked.delete(item);
      else checked.add(item);
      return { ...current, [sessionId]: [...checked] };
    });
  };

  const runCommand = (command: CommandKey) => {
    setCommandOpen(false);
    if (command === 'session') navigation.navigate('CreateSession');
    if (command === 'prepare') setPrepareOpen(true);
    if (command === 'share') void shareDayBriefings();
    if (command === 'today') {
      const today = dateKey(new Date());
      setSelectedDate(today);
      setCurrentMonth(`${today.slice(0, 7)}-01`);
      setView('day');
    }
    if (command === 'pending') {
      setSearch('scheduled');
      setView('day');
    }
  };

  const goToSession = (session: SessionRecord) => {
    navigation.navigate('SessionHub', { sessionId: session.id, session, patientName: resolvePatientName(session) });
  };

  const renderSessionCard = (session: SessionRecord, compact = false) => {
    const patient = resolvePatient(session);
    const statusColor = STATUS_COLOR[session.status] ?? '#9ba1b0';
    const complaint = patient?.main_complaint || 'Queixa principal nao registrada.';
    return (
      <TouchableOpacity
        key={session.id}
        style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => goToSession(session)}
        activeOpacity={0.88}
      >
        <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
        <View style={styles.sessionBody}>
          <View style={styles.sessionTopRow}>
            <View style={styles.timePill}>
              <Clock size={13} color={accentTeal} />
              <Text style={styles.timePillText}>{formatTimeRange(session)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{STATUS_LABEL[session.status]}</Text>
            </View>
          </View>
          <Text style={[styles.patientName, { color: theme.foreground }]} numberOfLines={1}>
            {resolvePatientName(session)}
          </Text>
          {!compact ? (
            <Text style={[styles.complaintText, { color: theme.mutedForeground }]} numberOfLines={2}>
              {complaint}
            </Text>
          ) : null}
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.primaryAction} onPress={() => goToSession(session)}>
              <Bell size={14} color="#fff" />
              <Text style={styles.primaryActionText}>Preparar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: theme.border }]} onPress={() => void openWhatsAppReminder(session)}>
              <MessageCircle size={14} color={accentTeal} />
              <Text style={styles.secondaryActionText}>WhatsApp</Text>
            </TouchableOpacity>
            {session.status !== 'confirmed' ? (
              <TouchableOpacity style={[styles.secondaryAction, { borderColor: theme.border }]} onPress={() => void setSessionStatus(session, 'confirmed')}>
                <CheckCircle2 size={14} color={accentTeal} />
                <Text style={styles.secondaryActionText}>Confirmar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.kicker, { color: theme.mutedForeground }]}>
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={[styles.headerTitle, { color: theme.foreground }]}>Agenda clinica</Text>
        </View>
        <View style={styles.headerActions}>
          {loading ? <ActivityIndicator size="small" color={theme.primary} /> : null}
          <TouchableOpacity style={[styles.roundButton, { backgroundColor: theme.card }]} onPress={() => setCommandOpen(true)}>
            <Sparkles size={19} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roundButton, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('CreateSession')}>
            <Plus size={20} color={theme.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={17} color={theme.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar paciente, status ou queixa..."
            placeholderTextColor={theme.mutedForeground}
            style={[styles.searchInput, { color: theme.foreground }]}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={theme.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.segmented, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {(['day', 'week', 'month'] as AgendaView[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.segmentButton, view === item && { backgroundColor: theme.primary }]}
              onPress={() => setView(item)}
            >
              <Text style={[styles.segmentText, { color: view === item ? theme.primaryForeground : theme.mutedForeground }]}>
                {item === 'day' ? 'Dia' : item === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.weekStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStripInner}>
            {weekDays.map((day) => {
              const dayCount = weekSessionsByDay.get(day.key)?.length ?? 0;
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.dayChip,
                    { backgroundColor: day.active ? theme.primary : theme.card, borderColor: day.isToday ? theme.primary : theme.border },
                  ]}
                  onPress={() => {
                    setSelectedDate(day.key);
                    setView('day');
                  }}
                >
                  <Text style={[styles.dayChipWeekday, { color: day.active ? theme.primaryForeground : theme.mutedForeground }]}>
                    {day.weekday}
                  </Text>
                  <Text style={[styles.dayChipNumber, { color: day.active ? theme.primaryForeground : theme.foreground }]}>
                    {day.day}
                  </Text>
                  <Text style={[styles.dayChipCount, { color: day.active ? theme.primaryForeground : theme.mutedForeground }]}>
                    {dayCount}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Hoje</Text>
            <Text style={[styles.summaryValue, { color: theme.foreground }]}>{selectedDaySessions.length}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Mes</Text>
            <Text style={[styles.summaryValue, { color: theme.foreground }]}>{monthSummary.total}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.summaryLabel, { color: theme.mutedForeground }]}>Pend.</Text>
            <Text style={[styles.summaryValue, { color: theme.foreground }]}>{monthSummary.pending}</Text>
          </View>
        </View>

        <View style={[styles.commandCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View>
            <Text style={[styles.commandTitle, { color: theme.foreground }]}>Preparacao rapida</Text>
            <Text style={[styles.commandDescription, { color: theme.mutedForeground }]}>
              Abra o ritual do dia, copie briefings ou envie confirmacao pelo WhatsApp.
            </Text>
          </View>
          <TouchableOpacity style={styles.commandButton} onPress={() => setPrepareOpen(true)}>
            <Bell size={15} color="#fff" />
            <Text style={styles.commandButtonText}>Preparar</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={[styles.stateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.stateTitle, { color: theme.foreground }]}>Falha ao carregar</Text>
            <Text style={[styles.stateText, { color: theme.mutedForeground }]}>{error}</Text>
            <TouchableOpacity style={styles.commandButton} onPress={loadAgenda}>
              <Text style={styles.commandButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {view === 'month' ? (
          <View style={[styles.monthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Calendar
              current={currentMonth}
              onDayPress={(day: { dateString: string }) => {
                setSelectedDate(day.dateString);
                setView('day');
              }}
              onMonthChange={(month: { dateString: string }) => setCurrentMonth(month.dateString)}
              markingType="multi-dot"
              markedDates={markedDates}
              theme={{
                backgroundColor: theme.card,
                calendarBackground: theme.card,
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
          </View>
        ) : view === 'week' ? (
          <View style={styles.weekList}>
            {weekDays.map((day) => {
              const items = weekSessionsByDay.get(day.key) ?? [];
              return (
                <View key={day.key} style={[styles.weekDayBlock, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={styles.weekDayHeader}
                    onPress={() => {
                      setSelectedDate(day.key);
                      setView('day');
                    }}
                  >
                    <View>
                      <Text style={[styles.weekDayTitle, { color: theme.foreground }]}>{day.weekday}, {day.day}</Text>
                      <Text style={[styles.weekDayMeta, { color: theme.mutedForeground }]}>{items.length} item(ns)</Text>
                    </View>
                    <CalendarIcon size={18} color={theme.primary} />
                  </TouchableOpacity>
                  {items.length === 0 ? (
                    <Text style={[styles.emptyInline, { color: theme.mutedForeground }]}>Dia livre.</Text>
                  ) : (
                    items.slice(0, 3).map((session) => renderSessionCard(session, true))
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.timeline}>
            <View style={styles.timelineHeader}>
              <View>
                <Text style={[styles.sectionKicker, { color: theme.primary }]}>Linha do tempo</Text>
                <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
              <TouchableOpacity style={[styles.smallOutlineButton, { borderColor: theme.border }]} onPress={shareDayBriefings}>
                <Text style={[styles.smallOutlineText, { color: theme.primary }]}>Briefings</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={[styles.stateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ActivityIndicator color={theme.primary} />
                <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Carregando agenda...</Text>
              </View>
            ) : selectedDaySessions.length === 0 ? (
              <View style={[styles.stateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <CalendarIcon size={22} color={theme.mutedForeground} />
                <Text style={[styles.stateTitle, { color: theme.foreground }]}>Dia livre.</Text>
                <Text style={[styles.stateText, { color: theme.mutedForeground }]}>Crie uma sessao ou use este horario para administracao.</Text>
                <TouchableOpacity style={styles.commandButton} onPress={() => navigation.navigate('CreateSession')}>
                  <Plus size={15} color="#fff" />
                  <Text style={styles.commandButtonText}>Agendar sessao</Text>
                </TouchableOpacity>
              </View>
            ) : (
              selectedDaySessions.map((session) => (
                <View key={session.id} style={styles.timelineRow}>
                  <Text style={[styles.timelineTime, { color: theme.mutedForeground }]}>{formatTime(session.scheduled_at)}</Text>
                  <View style={styles.timelineCard}>{renderSessionCard(session)}</View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={commandOpen} transparent animationType="fade" onRequestClose={() => setCommandOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCommandOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.foreground }]}>Comando rapido</Text>
            <TouchableOpacity onPress={() => setCommandOpen(false)}><X size={20} color={theme.mutedForeground} /></TouchableOpacity>
          </View>
          {([
            { key: 'session', title: 'Nova sessao', subtitle: 'Agenda um atendimento.' },
            { key: 'prepare', title: 'Preparar meu dia', subtitle: 'Revisao pre-sessao em lista.' },
            { key: 'share', title: 'Compartilhar briefings', subtitle: 'Exporta os resumos do dia.' },
            { key: 'today', title: 'Ir para hoje', subtitle: 'Volta para a rotina atual.' },
            { key: 'pending', title: 'Ver pendencias', subtitle: 'Filtra itens pendentes.' },
          ] satisfies Array<{ key: CommandKey; title: string; subtitle: string }>).map(({ key, title, subtitle }) => (
            <TouchableOpacity key={key} style={[styles.commandOption, { borderColor: theme.border }]} onPress={() => runCommand(key)}>
              <Filter size={16} color={theme.primary} />
              <View>
                <Text style={[styles.commandOptionTitle, { color: theme.foreground }]}>{title}</Text>
                <Text style={[styles.commandOptionSubtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      <Modal visible={prepareOpen} transparent animationType="slide" onRequestClose={() => setPrepareOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPrepareOpen(false)} />
        <View style={[styles.sheetLarge, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.foreground }]}>Preparar meu dia</Text>
              <Text style={[styles.sheetSubtitle, { color: theme.mutedForeground }]}>{selectedDayClinicalSessions.length} sessao(oes)</Text>
            </View>
            <TouchableOpacity onPress={() => setPrepareOpen(false)}><X size={20} color={theme.mutedForeground} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedDayClinicalSessions.length === 0 ? (
              <Text style={[styles.emptyInline, { color: theme.mutedForeground }]}>Nenhuma sessao neste dia.</Text>
            ) : (
              selectedDayClinicalSessions.map((session) => {
                const patient = resolvePatient(session);
                return (
                  <View key={session.id} style={[styles.prepareCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.prepareTime, { color: theme.primary }]}>{formatTimeRange(session)}</Text>
                    <Text style={[styles.prepareName, { color: theme.foreground }]}>{resolvePatientName(session)}</Text>
                    <Text style={[styles.prepareText, { color: theme.mutedForeground }]} numberOfLines={2}>
                      {patient?.main_complaint || 'Queixa principal nao registrada.'}
                    </Text>
                    <View style={styles.checklistGrid}>
                      {CHECKLIST.map((item) => {
                        const checked = checklistState[session.id]?.includes(item) ?? false;
                        return (
                          <TouchableOpacity
                            key={item}
                            style={[
                              styles.checkItem,
                              { borderColor: checked ? theme.primary : theme.border, backgroundColor: checked ? `${theme.primary}18` : theme.card },
                            ]}
                            onPress={() => toggleChecklistItem(session.id, item)}
                          >
                            <CheckCircle2 size={14} color={checked ? theme.primary : theme.mutedForeground} />
                            <Text style={[styles.checkItemText, { color: checked ? theme.primary : theme.mutedForeground }]}>{item}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.prepareActions}>
                      <TouchableOpacity style={styles.primaryAction} onPress={() => goToSession(session)}>
                        <Bell size={14} color="#fff" />
                        <Text style={styles.primaryActionText}>Abrir ficha</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.secondaryAction, { borderColor: theme.border }]} onPress={() => void openWhatsAppReminder(session)}>
                        <MessageCircle size={14} color={accentTeal} />
                        <Text style={styles.secondaryActionText}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
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
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  kicker: { fontFamily: 'Inter', fontSize: 12, textTransform: 'capitalize' },
  headerTitle: { fontFamily: 'Lora', fontSize: 24, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 34, gap: 14 },
  searchBox: {
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, fontFamily: 'Inter', fontSize: 14 },
  segmented: { flexDirection: 'row', borderRadius: 18, borderWidth: 1, padding: 4 },
  segmentButton: { flex: 1, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  weekStrip: { marginHorizontal: -16 },
  weekStripInner: { paddingHorizontal: 16, gap: 10 },
  dayChip: { width: 62, height: 88, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayChipWeekday: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  dayChipNumber: { fontFamily: 'Inter', fontSize: 22, fontWeight: '800', marginTop: 4 },
  dayChipCount: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', marginTop: 4 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 14 },
  summaryLabel: { fontFamily: 'Inter', fontSize: 12 },
  summaryValue: { fontFamily: 'Inter', fontSize: 24, fontWeight: '800', marginTop: 2 },
  commandCard: { borderWidth: 1, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  commandTitle: { fontFamily: 'Inter', fontSize: 15, fontWeight: '800' },
  commandDescription: { fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: 210 },
  commandButton: { minHeight: 42, borderRadius: 15, backgroundColor: primaryTeal, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  commandButtonText: { color: '#fff', fontFamily: 'Inter', fontSize: 13, fontWeight: '800' },
  monthCard: { borderWidth: 1, borderRadius: 22, padding: 6, overflow: 'hidden' },
  weekList: { gap: 12 },
  weekDayBlock: { borderWidth: 1, borderRadius: 22, padding: 14, gap: 10 },
  weekDayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekDayTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  weekDayMeta: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  emptyInline: { fontFamily: 'Inter', fontSize: 13, lineHeight: 20 },
  timeline: { gap: 12 },
  timelineHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  sectionKicker: { fontFamily: 'Inter', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  sectionTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '700', textTransform: 'capitalize', maxWidth: 250 },
  smallOutlineButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, height: 36, justifyContent: 'center' },
  smallOutlineText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineTime: { width: 46, paddingTop: 18, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  timelineCard: { flex: 1 },
  stateCard: { borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'center', gap: 10 },
  stateTitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: '800' },
  stateText: { fontFamily: 'Inter', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  sessionCard: { borderWidth: 1, borderRadius: 20, flexDirection: 'row', overflow: 'hidden', marginBottom: 10 },
  statusBar: { width: 5 },
  sessionBody: { flex: 1, padding: 14, gap: 8 },
  sessionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#43929918', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  timePillText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '800', color: accentTeal },
  statusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusBadgeText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '800' },
  patientName: { fontFamily: 'Inter', fontSize: 16, fontWeight: '800' },
  complaintText: { fontFamily: 'Inter', fontSize: 12, lineHeight: 18 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  primaryAction: { minHeight: 34, borderRadius: 13, backgroundColor: primaryTeal, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryActionText: { color: '#fff', fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  secondaryAction: { minHeight: 34, borderRadius: 13, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryActionText: { color: accentTeal, fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderBottomWidth: 0, padding: 18, gap: 10 },
  sheetLarge: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderBottomWidth: 0, padding: 18, maxHeight: '82%' },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#c9ced6', alignSelf: 'center', marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sheetTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '700' },
  sheetSubtitle: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  commandOption: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  commandOptionTitle: { fontFamily: 'Inter', fontSize: 14, fontWeight: '800' },
  commandOptionSubtitle: { fontFamily: 'Inter', fontSize: 12, marginTop: 2 },
  prepareCard: { borderWidth: 1, borderRadius: 22, padding: 14, marginBottom: 12 },
  prepareTime: { fontFamily: 'Inter', fontSize: 12, fontWeight: '800' },
  prepareName: { fontFamily: 'Inter', fontSize: 17, fontWeight: '800', marginTop: 4 },
  prepareText: { fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 4 },
  checklistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  checkItem: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkItemText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '800' },
  prepareActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
