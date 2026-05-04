import { useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { Bell, CalendarPlus, ChevronLeft, ChevronRight, Clock3, Filter, GripVertical, ListChecks, Monitor, Building2, Plus, Repeat2, Search, Settings2, Sparkles, Tags, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sessionService, type Session, type CalendarSuggestion } from "@/services/sessionService";
import { SessionDialog } from "@/components/SessionDialog";
import { PreSessionBriefingPanel } from "@/components/PreSessionBriefingPanel";
import { BillingConfirmDialog } from "@/components/BillingConfirmDialog";
import { financeService } from "@/services/financeService";
import { usePrivacy } from "@/hooks/usePrivacy";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { AgendaGridSkeleton } from "@/components/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import { useOnboarding } from "@/contexts/OnboardingContext";
import OnboardingCoachmark from "@/components/OnboardingCoachmark";
import { patientService, type Patient } from "@/services/patientService";
import { useAppStore } from "@/stores/appStore";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  buildPreSessionBriefing,
  formatPreSessionBriefingText,
  notifyPreSessionBriefing,
  type PreSessionBriefing,
} from "@/services/preSessionBriefingService";
import { listSupervisionNotes } from "@/services/supervisionNotesService";
import {
  agendaCategories,
  createDefaultAgendaMeta,
  getAgendaCategory,
  getAgendaColor,
  readAgendaEventMetaMap,
  readAgendaWeekCache,
  writeAgendaWeekCache,
  type AgendaCategoryId,
  type AgendaEventMeta,
} from "@/pages/agendaStorage";

interface AgendaPageProps {
  onSessionClick: (sessionId: string) => void;
  onPatientClick?: (patientId: string) => void;
}

type AgendaSettings = {
  startHour: number;
  endHour: number;
  enabledWeekdays: number[];
};

type StoredAgendaSettings = AgendaSettings & {
  suggestionsExpanded?: boolean;
  suggestionsPanelWidth?: number;
};

type CacheStatus = "idle" | "cached" | "synced";
type QuickAgendaFilter = "all" | "today" | "sessions" | "tasks" | "supervision" | "pending";
type AgendaView = "day" | "week" | "month";

const AGENDA_SETTINGS_KEY = "ethos_web_agenda_settings_v1";
const defaultAgendaSettings: AgendaSettings = {
  startHour: 8,
  endHour: 19,
  enabledWeekdays: [1, 2, 3, 4, 5],
};
const SUGGESTIONS_PANEL_MIN_WIDTH = 220;
const SUGGESTIONS_PANEL_MAX_WIDTH = 420;
const SUGGESTIONS_PANEL_DEFAULT_WIDTH = 240;
const AGENDA_SESSIONS_TIMEOUT_MS = 12_000;
const CELL_HEIGHT_PX = 116;

const weekDays = [
  { id: 1, short: "Seg", long: "Segunda" },
  { id: 2, short: "Ter", long: "Terça" },
  { id: 3, short: "Qua", long: "Quarta" },
  { id: 4, short: "Qui", long: "Quinta" },
  { id: 5, short: "Sex", long: "Sexta" },
  { id: 6, short: "Sáb", long: "Sábado" },
  { id: 0, short: "Dom", long: "Domingo" },
];

const buildTimeSlots = (startHour: number, endHour: number) => {
  const normalizedStart = Math.max(0, Math.min(startHour, 23));
  const normalizedEnd = Math.max(normalizedStart + 1, Math.min(endHour, 23));
  return Array.from({ length: normalizedEnd - normalizedStart + 1 }, (_, index) => {
    const hour = normalizedStart + index;
    return `${String(hour).padStart(2, "0")}:00`;
  });
};

function getStartOfWeek(reference: Date, weekOffset: number) {
  const start = new Date(reference);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff + weekOffset * 7);
  return start;
}

function formatDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDayNumber(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
}

function formatWeekRange(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = `${formatDayNumber(start)} ${formatMonthLabel(start)}`;
  const endLabel = sameMonth ? formatDayNumber(end) : `${formatDayNumber(end)} ${formatMonthLabel(end)}`;
  return `${startLabel} — ${endLabel}`;
}

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function getSessionDateKey(session: Session) {
  return session.date || (session.scheduled_at ? formatDate(new Date(session.scheduled_at)) : "");
}

const AgendaPage = ({ onSessionClick, onPatientClick }: AgendaPageProps) => {
  const { currentMissionId, shouldShowCoachmarks, markMissionCompleted } = useOnboarding();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { maskName } = usePrivacy();
  const setSessionCache = useAppStore((s) => s.setSessionCache);
  const upsertSession = useAppStore((s) => s.upsertSession);
  const removeSessionFromStore = useAppStore((s) => s.removeSession);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [agendaMetaByEventId, setAgendaMetaByEventId] = useState<Record<string, AgendaEventMeta>>(() => readAgendaEventMetaMap());
  const [categoryFilter, setCategoryFilter] = useState<AgendaCategoryId | "all">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickAgendaFilter>("all");
  const [selectedDayKey, setSelectedDayKey] = useState(() => formatDate(new Date()));
  const [agendaView, setAgendaView] = useState<AgendaView>("week");
  const [prepareDayOpen, setPrepareDayOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [agendaSearch, setAgendaSearch] = useState("");
  const [prepChecklist, setPrepChecklist] = useState<Record<string, string[]>>({});
  const [agendaSettings, setAgendaSettings] = useState<AgendaSettings>(defaultAgendaSettings);
  const [settingsDraft, setSettingsDraft] = useState<AgendaSettings>(defaultAgendaSettings);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [draggingSessionId, setDraggingSessionId] = useState<string | null>(null);
  const [billingDialog, setBillingDialog] = useState<{
    open: boolean;
    patientName: string;
    suggestedAmount: number;
    suggestedDueDate: string;
    patientId: string;
    sessionId: string;
  } | null>(null);
  const [selectedBriefing, setSelectedBriefing] = useState<PreSessionBriefing | null>(null);

  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [suggestionsPanelWidth, setSuggestionsPanelWidth] = useState(SUGGESTIONS_PANEL_DEFAULT_WIDTH);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>("idle");
  const [cacheFetchedAt, setCacheFetchedAt] = useState<string | null>(null);
  const [sessionDialogDefaults, setSessionDialogDefaults] = useState<{ date?: string; time?: string; eventType?: 'session' | 'task' }>({});
  const [dismissCoachmark, setDismissCoachmark] = useState(false);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const [dragCreate, setDragCreate] = useState<{ dayKey: string; startSlot: string; endSlot: string } | null>(null);
  const [resizingSession, setResizingSession] = useState<{ id: string; startY: number; originalDuration: number; currentDuration: number } | null>(null);
  const resizeDurationRef = useRef<number>(0);
  const desktopAgendaRef = useRef<HTMLDivElement | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDuration, setNewDuration] = useState("50");

  const timeSlots = useMemo(
    () => buildTimeSlots(agendaSettings.startHour, agendaSettings.endHour),
    [agendaSettings.startHour, agendaSettings.endHour],
  );

  const weekStart = useMemo(() => getStartOfWeek(new Date(), currentWeek), [currentWeek]);

  const weekWindow = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return { from: formatDate(weekStart), to: formatDate(end) };
  }, [weekStart]);

  const monthStart = useMemo(() => {
    const value = new Date();
    value.setMonth(value.getMonth() + monthOffset, 1);
    value.setHours(0, 0, 0, 0);
    return value;
  }, [monthOffset]);

  const monthWindow = useMemo(() => {
    const end = new Date(monthStart);
    end.setMonth(end.getMonth() + 1, 0);
    return { from: formatDate(monthStart), to: formatDate(end) };
  }, [monthStart]);

  const activeWindow = agendaView === "month" ? monthWindow : weekWindow;

  const weekDaysWithDate = useMemo(
    () =>
      weekDays.map((day, index) => {
        const value = new Date(weekStart);
        value.setDate(weekStart.getDate() + index);
        return {
          ...day,
          date: value,
          key: formatDate(value),
          isToday: formatDate(value) === formatDate(new Date()),
        };
      }),
    [weekStart],
  );

  const visibleWeekDays = useMemo(
    () => weekDaysWithDate.filter((day) => agendaSettings.enabledWeekdays.includes(day.id)),
    [weekDaysWithDate, agendaSettings.enabledWeekdays],
  );

  const monthDaysWithDate = useMemo(() => {
    const end = new Date(monthStart);
    end.setMonth(end.getMonth() + 1, 0);
    return Array.from({ length: end.getDate() }, (_, index) => {
      const value = new Date(monthStart);
      value.setDate(index + 1);
      const day = weekDays.find((item) => item.id === value.getDay()) ?? weekDays[0];
      return {
        ...day,
        date: value,
        key: formatDate(value),
        isToday: formatDate(value) === formatDate(new Date()),
      };
    });
  }, [monthStart]);

  const calendarDays = useMemo(() => {
    if (agendaView === "day") {
      const selected = visibleWeekDays.filter((day) => day.key === selectedDayKey);
      return selected.length > 0 ? selected : visibleWeekDays.slice(0, 1);
    }
    return visibleWeekDays;
  }, [agendaView, selectedDayKey, visibleWeekDays]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AGENDA_SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) as Partial<StoredAgendaSettings> : {};
      const nextSettings = {
        startHour: typeof parsed.startHour === "number"
            ? parsed.startHour
            : defaultAgendaSettings.startHour,
        endHour: typeof parsed.endHour === "number"
            ? parsed.endHour
            : defaultAgendaSettings.endHour,
        enabledWeekdays:
          Array.isArray(parsed.enabledWeekdays) && parsed.enabledWeekdays.length > 0
              ? parsed.enabledWeekdays.filter((value): value is number => typeof value === "number")
            : defaultAgendaSettings.enabledWeekdays,
      };
      setAgendaSettings(nextSettings);
      setSettingsDraft(nextSettings);
      setSuggestionsExpanded(parsed.suggestionsExpanded ?? true);
      if (typeof parsed.suggestionsPanelWidth === "number") {
        setSuggestionsPanelWidth(Math.max(
          SUGGESTIONS_PANEL_MIN_WIDTH,
          Math.min(SUGGESTIONS_PANEL_MAX_WIDTH, parsed.suggestionsPanelWidth),
        ));
      }
    } catch {
      setAgendaSettings(defaultAgendaSettings);
      setSettingsDraft(defaultAgendaSettings);
      setSuggestionsExpanded(true);
    } finally {
      setSettingsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!settingsHydrated) return;
    localStorage.setItem(AGENDA_SETTINGS_KEY, JSON.stringify({
      startHour: agendaSettings.startHour,
      endHour: agendaSettings.endHour,
      enabledWeekdays: agendaSettings.enabledWeekdays,
      suggestionsExpanded,
      suggestionsPanelWidth,
    }));
  }, [agendaSettings, settingsHydrated, suggestionsExpanded, suggestionsPanelWidth]);

  useEffect(() => {
    const loadPatients = async () => {
      const result = await patientService.list();
      if (result.success) setPatients(result.data);
    };

    void loadPatients();
  }, []);

  useEffect(() => {
    const cachedWeek = readAgendaWeekCache();
    const canUseWeekCache = agendaView !== "month";
    const hasUsableCache = canUseWeekCache && cachedWeek?.weekWindow.from === activeWindow.from && cachedWeek.weekWindow.to === activeWindow.to;

    if (hasUsableCache) {
      setSessions(cachedWeek.sessions);
      setAgendaMetaByEventId(readAgendaEventMetaMap());
      setSessionCache(cachedWeek.sessions);
      setCacheStatus("cached");
      setCacheFetchedAt(cachedWeek.fetchedAt);
      setLoading(false);
    }

    const loadSessions = async () => {
      setLoading(!hasUsableCache);
      try {
        const result = await sessionService.list(activeWindow, undefined, {
          timeout: AGENDA_SESSIONS_TIMEOUT_MS,
          retry: true,
        });
        if (!result.success) {
          setError({ message: result.error.message, requestId: result.request_id });
          return;
        }
        setSessions(result.data);
        setAgendaMetaByEventId(readAgendaEventMetaMap());
        setSessionCache(result.data); // sync global store
        setError(null);
        const fetchedAt = new Date().toISOString();
        if (canUseWeekCache) {
          writeAgendaWeekCache({
            version: 1,
            fetchedAt,
            weekWindow: activeWindow,
            sessions: result.data,
          });
        }
        setCacheStatus("synced");
        setCacheFetchedAt(fetchedAt);
      } finally {
        setLoading(false);
      }
    };

    // Load suggestions for next week
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay() + 1) % 7 || 7);
    const weekStart = nextWeek.toISOString().split("T")[0];
    sessionService.getSuggestions(weekStart, { timeout: 2500, retry: false }).then((r) => {
      if (r.success) setSuggestions(r.data);
    }).catch(() => {});

    void loadSessions();
  }, [activeWindow, agendaView, setSessionCache]);

  const handleCreateSession = async () => {
    if (!newPatientId || !newDate || !newTime) return;

    setCreating(true);
    const scheduledAt = combineDateTime(newDate, newTime);
    const result = await sessionService.create({
      patient_id: newPatientId,
      scheduled_at: scheduledAt,
      duration_minutes: Number(newDuration) || 50,
    });

    if (!result.success) {
      toast({ title: "Erro", description: result.error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    setSessions((prev) => [...prev, result.data]);
    upsertSession(result.data); // sync global store
    setDialogOpen(false);
    setNewPatientId("");
    setNewDate("");
    setNewTime("");
    setNewDuration("50");
    toast({ title: "Sessão agendada" });
    markMissionCompleted("schedule-session");
    setCreating(false);
  };

  const moveSession = async (sessionId: string, date: string, time: string) => {
    const scheduledAt = combineDateTime(date, time);
    const result = await sessionService.update(sessionId, { scheduled_at: scheduledAt });

    if (!result.success) {
      toast({ title: "Erro ao mover sessão", description: result.error.message, variant: "destructive" });
      return;
    }

    // After a move, re-fetch the week so clinical note indicators are fresh.
    const refreshResult = await sessionService.list(activeWindow);
    if (refreshResult.success) {
      setSessions(refreshResult.data);
      setSessionCache(refreshResult.data); // sync global store
    } else {
      // Fallback to local update
      setSessions((current) => current.map((session) => (session.id === sessionId ? result.data : session)));
      upsertSession(result.data); // sync global store
    }

    const displayName = result.data.event_type === "block"
      ? (result.data.block_title ?? "Tarefa")
      : result.data.patient_name;
    toast({
      title: result.data.event_type === "block" ? "Bloqueio remarcado" : "Sessão remarcada",
      description: `${displayName} agora está em ${new Date(scheduledAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}.`,
    });
  };

  const handleCompleteSession = async (session: Session) => {
    const result = await sessionService.updateStatus(session.id, "completed");

    if (!result.success) {
      toast({ title: "Erro ao concluir sessão", description: result.error.message, variant: "destructive" });
      return;
    }

    setSessions((current) =>
      current.map((s) => (s.id === session.id ? result.data : s)),
    );
    upsertSession(result.data); // sync global store

    const data = result.data as Session & {
      pending_billing?: boolean;
      suggested_amount?: number;
      suggested_due_date?: string;
    };

    if (data.pending_billing) {
      setBillingDialog({
        open: true,
        patientName: session.patient_name,
        suggestedAmount: data.suggested_amount ?? 0,
        suggestedDueDate: data.suggested_due_date ?? new Date().toISOString().slice(0, 10),
        patientId: session.patient_id,
        sessionId: session.id,
      });
    }
  };

  const toggleWeekday = (dayId: number) => {
    setSettingsDraft((current) => {
      const exists = current.enabledWeekdays.includes(dayId);
      const enabledWeekdays = exists
        ? current.enabledWeekdays.filter((value) => value !== dayId)
        : [...current.enabledWeekdays, dayId].sort((a, b) => a - b);
      return { ...current, enabledWeekdays };
    });
  };

  const handleSaveAgendaSettings = () => {
    if (settingsDraft.enabledWeekdays.length === 0) {
      toast({ title: "Selecione ao menos um dia", description: "A agenda precisa de pelo menos um dia ativo.", variant: "destructive" });
      return;
    }
    if (settingsDraft.endHour <= settingsDraft.startHour) {
      toast({ title: "Horário inválido", description: "O horário final precisa ser maior que o inicial.", variant: "destructive" });
      return;
    }

    setAgendaSettings(settingsDraft);
    setSettingsOpen(false);
    toast({ title: "Agenda atualizada", description: "Dias e horários de atendimento foram salvos neste navegador." });
  };

  const getAgendaMetaForSession = (session: Session) =>
    agendaMetaByEventId[session.id] ?? createDefaultAgendaMeta(session.event_type === "block" ? "task" : "session");

  const buildBriefingForSession = (session: Session) => {
    const patient =
      patients.find((item) => item.id === session.patient_id || item.external_id === session.patient_id) ??
      ({ id: session.patient_id, name: session.patient_name } as Patient);
    return buildPreSessionBriefing({
      patient,
      session,
      supervisionNotes: listSupervisionNotes(patient.id),
    });
  };

  const openBriefingForSession = (session: Session) => {
    if (session.event_type === "block") return;
    setSelectedBriefing(buildBriefingForSession(session));
  };

  const copyBriefing = async (briefing: PreSessionBriefing) => {
    await navigator.clipboard.writeText(formatPreSessionBriefingText(briefing));
    toast({ title: "Briefing copiado", description: "Resumo pre-sessao copiado para a area de transferencia." });
  };

  const notifyBriefing = async (briefing: PreSessionBriefing) => {
    const result = await notifyPreSessionBriefing(briefing, {
      requireInteraction: true,
      onClick: () => onPatientClick?.(briefing.patientId),
    });
    if (result.ok) {
      toast({ title: "Notificacao enviada", description: "O briefing interno foi exibido no navegador." });
      return;
    }
    toast({
      title: result.reason === "unsupported" ? "Notificacao indisponivel" : "Permissao necessaria",
      description: "Autorize notificacoes do navegador para receber o briefing.",
      variant: "destructive",
    });
  };

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const session of sessions) {
      getAgendaMetaForSession(session).tags.forEach((tag) => tags.add(tag));
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaMetaByEventId, sessions]);

  const filteredSessions = useMemo(() => {
    const todayKey = formatDate(new Date());
    const search = agendaSearch.trim().toLowerCase();
    return sessions.filter((session) => {
      const meta = getAgendaMetaForSession(session);
      const matchesCategory = categoryFilter === "all" || meta.categoryId === categoryFilter;
      const matchesTag = tagFilter === "all" || meta.tags.includes(tagFilter);
      const matchesSearch =
        !search ||
        [
          session.patient_name,
          session.block_title,
          session.time,
          session.date,
          session.status,
          getAgendaCategory(meta.categoryId).label,
          ...meta.tags,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      const dateKey = getSessionDateKey(session);
      const hasSupervisionContext =
        meta.categoryId === "study" ||
        meta.tags.some((tag) => /supervis|supervisao|supervisão/i.test(tag)) ||
        (session.event_type !== "block" && listSupervisionNotes(session.patient_id).some((note) => note.pinned || note.priority === "high"));
      const matchesQuick =
        quickFilter === "all" ||
        (quickFilter === "today" && dateKey === todayKey) ||
        (quickFilter === "sessions" && session.event_type !== "block") ||
        (quickFilter === "tasks" && (session.event_type === "block" || ["admin", "personal", "buffer"].includes(meta.categoryId))) ||
        (quickFilter === "supervision" && hasSupervisionContext) ||
        (quickFilter === "pending" && (session.status === "pending" || session.status === "missed" || meta.priority === "high"));
      return matchesCategory && matchesTag && matchesQuick && matchesSearch;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaMetaByEventId, agendaSearch, categoryFilter, quickFilter, sessions, tagFilter]);

  const sessionsByCell = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const day of calendarDays) {
      for (const slot of timeSlots) {
        map.set(`${day.key}-${slot}`, []);
      }
    }

    for (const session of filteredSessions) {
      const dateKey = getSessionDateKey(session);
      const [hour] = (session.time || "00:00").split(":");
      const normalizedTimeKey = `${hour}:00`;
      const slotKey = `${dateKey}-${normalizedTimeKey}`;
      
      if (!map.has(slotKey)) continue;
      map.get(slotKey)?.push(session);
    }

    return map;
  }, [calendarDays, filteredSessions, timeSlots]);

  const agendaSummary = useMemo(() => {
    const total = sessions.filter((session) => session.event_type !== "block").length;
    const tasks = sessions.filter((session) => session.event_type === "block").length;
    const pending = sessions.filter((session) => session.event_type !== "block" && session.status === "pending").length;
    const newPatients = sessions.filter((session) => (session.patient_total_sessions ?? 0) <= 1).length;
    const highPriority = sessions.filter((session) => getAgendaMetaForSession(session).priority === "high").length;
    return { total, tasks, pending, newPatients, highPriority };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaMetaByEventId, sessions]);

  const dayInsights = useMemo(() => {
    return visibleWeekDays.map((day) => {
      const daySessions = filteredSessions.filter((session) => getSessionDateKey(session) === day.key);
      const clinicalSessions = daySessions.filter((session) => session.event_type !== "block");
      const tasks = daySessions.length - clinicalSessions.length;
      const supervision = clinicalSessions.filter((session) => {
        const meta = getAgendaMetaForSession(session);
        return (
          meta.categoryId === "study" ||
          meta.tags.some((tag) => /supervis|supervisao/i.test(tag)) ||
          listSupervisionNotes(session.patient_id).some((note) => note.pinned || note.priority === "high")
        );
      }).length;
      const pending = daySessions.filter((session) => {
        const meta = getAgendaMetaForSession(session);
        return session.status === "pending" || session.status === "missed" || meta.priority === "high";
      }).length;

      return {
        day,
        sessions: daySessions,
        total: daySessions.length,
        clinical: clinicalSessions.length,
        tasks,
        supervision,
        pending,
        nextClinicalSession: clinicalSessions[0],
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaMetaByEventId, filteredSessions, visibleWeekDays]);

  const selectedDayInsight = useMemo(
    () => dayInsights.find((item) => item.day.key === selectedDayKey) ?? dayInsights.find((item) => item.day.isToday) ?? dayInsights[0] ?? null,
    [dayInsights, selectedDayKey],
  );

  const selectedDayClinicalSessions = useMemo(
    () => selectedDayInsight?.sessions.filter((session) => session.event_type !== "block") ?? [],
    [selectedDayInsight],
  );

  const monthInsights = useMemo(() => {
    return monthDaysWithDate.map((day) => {
      const daySessions = filteredSessions.filter((session) => getSessionDateKey(session) === day.key);
      const clinical = daySessions.filter((session) => session.event_type !== "block").length;
      const pending = daySessions.filter((session) => {
        const meta = getAgendaMetaForSession(session);
        return session.status === "pending" || session.status === "missed" || meta.priority === "high";
      }).length;
      return { day, sessions: daySessions, total: daySessions.length, clinical, pending };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaMetaByEventId, filteredSessions, monthDaysWithDate]);

  const openPrepareDay = () => {
    if (selectedDayClinicalSessions.length === 0) {
      toast({ title: "Sem sessoes clinicas", description: "Esse dia ainda nao tem sessoes clinicas no filtro atual." });
      return;
    }
    setPrepareDayOpen(true);
  };

  const copyConfirmationMessage = async (session: Session) => {
    const message = `Ola, ${session.patient_name}. Passando para confirmar nossa sessao de ${session.date} as ${session.time}. Se precisar remarcar, me avise com antecedencia.`;
    await navigator.clipboard.writeText(message);
    toast({ title: "Mensagem copiada", description: "Cole no WhatsApp para confirmar a sessao." });
  };

  const markSessionStatus = async (session: Session, status: Session["status"], title: string) => {
    const result = await sessionService.updateStatus(session.id, status);
    if (!result.success) {
      toast({ title: "Nao foi possivel atualizar", description: result.error.message, variant: "destructive" });
      return;
    }
    setSessions((current) => current.map((item) => (item.id === session.id ? result.data : item)));
    upsertSession(result.data);
    toast({ title });
  };

  const togglePrepChecklistItem = (sessionId: string, item: string) => {
    setPrepChecklist((current) => {
      const checked = new Set(current[sessionId] ?? []);
      if (checked.has(item)) checked.delete(item);
      else checked.add(item);
      return { ...current, [sessionId]: [...checked] };
    });
  };

  const runAgendaCommand = (command: "session" | "task" | "prepare" | "copy" | "today" | "pending") => {
    setCommandOpen(false);
    if (command === "session") {
      setSessionDialogDefaults({ date: selectedDayKey, eventType: "session" });
      setSessionDialogOpen(true);
    }
    if (command === "task") {
      setSessionDialogDefaults({ date: selectedDayKey, eventType: "task" });
      setTaskDialogOpen(true);
    }
    if (command === "prepare") openPrepareDay();
    if (command === "copy") void copySelectedDayBriefings();
    if (command === "today") {
      setCurrentWeek(0);
      setMonthOffset(0);
      setSelectedDayKey(formatDate(new Date()));
      setAgendaView("day");
      setQuickFilter("today");
    }
    if (command === "pending") setQuickFilter("pending");
  };

  const copySelectedDayBriefings = async () => {
    const clinicalSessions = selectedDayClinicalSessions;
    if (clinicalSessions.length === 0) {
      toast({ title: "Nada para copiar", description: "Esse dia ainda nao tem sessoes clinicas filtradas." });
      return;
    }

    const text = clinicalSessions
      .map((session) => formatPreSessionBriefingText(buildBriefingForSession(session)))
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    toast({ title: "Briefings copiados", description: `${clinicalSessions.length} briefing(s) do dia foram copiados.` });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key.toLowerCase() === "n") {
        setSessionDialogDefaults({ date: selectedDayKey, eventType: "session" });
        setSessionDialogOpen(true);
      }
      if (event.key.toLowerCase() === "t") {
        setSessionDialogDefaults({ date: selectedDayKey, eventType: "task" });
        setTaskDialogOpen(true);
      }
      if (event.key.toLowerCase() === "p") {
        openPrepareDay();
      }
      if (event.key.toLowerCase() === "k") {
        setCommandOpen(true);
      }
      if (event.key === "ArrowLeft") {
        agendaView === "month" ? setMonthOffset((value) => value - 1) : setCurrentWeek((value) => value - 1);
      }
      if (event.key === "ArrowRight") {
        agendaView === "month" ? setMonthOffset((value) => value + 1) : setCurrentWeek((value) => value + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaView, selectedDayClinicalSessions, selectedDayKey]);

  const getWeekLabel = () => {
    if (currentWeek === 0) return "Esta semana";
    if (currentWeek === 1) return "Próxima semana";
    if (currentWeek === -1) return "Semana passada";
    return `Semana ${currentWeek > 0 ? "+" : ""}${currentWeek}`;
  };

  const getStatusLabel = (status: Session["status"]) => {
    switch (status) {
      case "pending": return "Pendente";
      case "confirmed": return "Confirmada";
      case "completed": return "Concluída";
      case "missed": return "Faltou";
      case "cancelled_with_notice": return "Cancelado c/ aviso";
      case "cancelled_no_show": return "Cancelado s/ aviso";
      case "rescheduled_by_patient": return "Remarcado";
      case "rescheduled_by_psychologist": return "Remarcado pelo psicólogo";
      default: return "Sessão";
    }
  };

  const getStatusColor = (status: Session["status"]) => {
    switch (status) {
      case "completed":
      case "confirmed":
        return "border-status-validated/30 bg-status-validated/10 text-foreground";
      case "pending":
        return "border-status-pending/30 bg-status-pending/10 text-foreground";
      case "missed":
      case "cancelled_no_show":
        return "border-destructive/30 bg-destructive/10 text-foreground";
      case "cancelled_with_notice":
        return "border-orange-400/30 bg-orange-400/10 text-foreground";
      case "rescheduled_by_patient":
      case "rescheduled_by_psychologist":
        return "border-blue-400/30 bg-blue-400/10 text-foreground";
      default:
        return "border-border bg-secondary text-foreground";
    }
  };

  const getSessionFlags = (session: Session) => {
    if (session.event_type === "block") return [];
    const flags: string[] = [];
    if ((session.patient_total_sessions ?? 0) <= 1) flags.push("Novo");
    else flags.push("Retorno");
    if (session.status === "pending") flags.push("Pendente");
    return flags;
  };

  const getSessionClinicalContext = (session: Session) => {
    if (session.event_type === "block") return [];
    const meta = getAgendaMetaForSession(session);
    const briefing = buildBriefingForSession(session);
    const items: string[] = [];
    if (briefing.mainComplaint) items.push(`Queixa: ${briefing.mainComplaint}`);
    const supervision = briefing.supervisionHighlights[0];
    if (supervision) items.push(`Supervisão: ${supervision.nextSessionPrompt || supervision.title}`);
    if (briefing.tasks[0]) items.push(`Tarefa: ${briefing.tasks[0].title}`);
    if (briefing.adminAlerts[0]) items.push(`Pendência: ${briefing.adminAlerts[0]}`);
    if (meta.priority === "high") items.push("Prioridade alta");
    return items.slice(0, 3);
  };

  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => !dismissedSuggestions.has(`${s.patient_id}-${s.suggested_at}`)),
    [dismissedSuggestions, suggestions],
  );

  const desktopDensity = {
    gridMinWidth: 0,
    dayColumnMin: 148,
    cellMinHeight: 116,
    emptyCellMinHeight: 92,
    cellPadding: "p-2.5",
    cardPadding: "p-3",
    dayHeaderPadding: "p-4",
    cardTitleClamp: "line-clamp-3",
    metaVisible: true,
  };

  const desktopCalendarGrid = useMemo(() => {
    const dayWidth = `minmax(${desktopDensity.dayColumnMin}px, 1fr)`;
    return `72px repeat(${calendarDays.length}, ${dayWidth})`;
  }, [calendarDays.length, desktopDensity.dayColumnMin]);

  useEffect(() => {
    if (!dragCreate) return;
    const { dayKey, startSlot, endSlot } = dragCreate;
    const handlePointerUp = () => {
      const startIdx = timeSlots.indexOf(startSlot);
      const endIdx = timeSlots.indexOf(endSlot);
      const orderedStart = timeSlots[Math.min(startIdx, endIdx)];
      setSessionDialogDefaults({ date: dayKey, time: orderedStart });
      setDragCreate(null);
      setSessionDialogOpen(true);
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [dragCreate, timeSlots]);

  useEffect(() => {
    if (!resizingSession) return;
    const { id, startY, originalDuration } = resizingSession;
    const handlePointerMove = (e: PointerEvent) => {
      const delta = e.clientY - startY;
      const newDuration = Math.max(30, originalDuration + Math.round((delta / CELL_HEIGHT_PX) * 60 / 30) * 30);
      resizeDurationRef.current = newDuration;
      setResizingSession((prev) => (prev ? { ...prev, currentDuration: newDuration } : null));
    };
    const handlePointerUp = async () => {
      const finalDuration = resizeDurationRef.current;
      if (finalDuration !== originalDuration) {
        await sessionService.update(id, { duration_minutes: finalDuration });
        const result = await sessionService.list(activeWindow);
        if (result.success) {
          setSessions(result.data);
          setAgendaMetaByEventId(readAgendaEventMetaMap());
        }
      }
      setResizingSession(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizingSession?.id, resizingSession?.startY]);

  const startSuggestionsResize = (clientX: number) => {
    if (!desktopAgendaRef.current) return;
    setIsResizingPanels(true);

    const containerBounds = desktopAgendaRef.current.getBoundingClientRect();
    const handlePointerMove = (nextClientX: number) => {
      const nextWidth = containerBounds.right - nextClientX;
      const clamped = Math.max(
        SUGGESTIONS_PANEL_MIN_WIDTH,
        Math.min(SUGGESTIONS_PANEL_MAX_WIDTH, nextWidth),
      );
      setSuggestionsPanelWidth(clamped);
    };

    handlePointerMove(clientX);

    const onPointerMove = (event: PointerEvent) => handlePointerMove(event.clientX);
    const stopResize = () => {
      setIsResizingPanels(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
  };

  return (
    <>
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        {shouldShowCoachmarks && !dismissCoachmark && currentMissionId === "schedule-session" ? (
          <OnboardingCoachmark
            title="Missão 2: agende uma sessão"
            description="Crie uma nova sessão na agenda para organizar seu atendimento inicial."
            onDismiss={() => setDismissCoachmark(true)}
          />
        ) : null}
        <motion.header className="mb-10 rounded-[2rem] border border-border/80 bg-card px-4 py-5 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.22)] md:px-7 md:py-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">ETHOS Web</p>
              <h1 className="text-2xl font-semibold tracking-[-0.05em] text-foreground md:text-[2.35rem] xl:text-[3.2rem]">Agenda clínica</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[1.02rem]">Configure sua semana e visualize apenas os dias e horários reais de atendimento.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Dialog
                open={settingsOpen}
                onOpenChange={(nextOpen) => {
                  setSettingsOpen(nextOpen);
                  if (nextOpen) setSettingsDraft(agendaSettings);
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings2 className="w-4 h-4" strokeWidth={1.5} />
                    Configurar agenda
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[96vw] max-w-[680px] overflow-x-hidden p-0">
                  <div className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="space-y-2 border-b border-border/70 px-4 pb-4 pt-6 sm:px-6">
                    <DialogTitle className="font-serif text-xl sm:text-2xl">Configurar agenda</DialogTitle>
                    <p className="max-w-[56ch] text-sm leading-6 text-muted-foreground">
                      Ajuste dias e faixa de atendimento com a mesma estrutura estável usada nos outros diálogos da agenda.
                    </p>
                  </DialogHeader>
                  <div className="space-y-6 px-4 py-5 sm:px-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="min-w-0 space-y-2">
                        <label className="text-sm font-medium text-foreground">Início do expediente</label>
                        <select
                          value={settingsDraft.startHour}
                          onChange={(event) => setSettingsDraft((current) => ({ ...current, startHour: Number(event.target.value) }))}
                          className="flex h-11 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                        >
                          {Array.from({ length: 24 }, (_, hour) => (
                            <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                      <div className="min-w-0 space-y-2">
                        <label className="text-sm font-medium text-foreground">Fim do expediente</label>
                        <select
                          value={settingsDraft.endHour}
                          onChange={(event) => setSettingsDraft((current) => ({ ...current, endHour: Number(event.target.value) }))}
                          className="flex h-11 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                        >
                          {Array.from({ length: 24 }, (_, hour) => (
                            <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">Dias de atendimento</label>
                      <div className="flex flex-wrap gap-2">
                        {weekDays.map((day) => {
                          const selected = settingsDraft.enabledWeekdays.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => toggleWeekday(day.id)}
                              className={cn(
                                "rounded-full border px-3 py-2 text-sm transition-colors",
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-foreground hover:border-primary/30",
                              )}
                            >
                              {day.long}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="border-t border-border/70 px-4 py-4 sm:px-6 sm:py-5">
                    <Button variant="outline" onClick={() => setSettingsOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                    <Button onClick={handleSaveAgendaSettings} className="w-full sm:w-auto">Salvar configuração</Button>
                  </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" className="gap-2" onClick={() => {
                  setSessionDialogDefaults({ eventType: 'session' });
                  setSessionDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Agendar sessão
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setTaskDialogOpen(true)}>
                  <CalendarPlus className="w-4 h-4" strokeWidth={1.5} />
                  Agendar tarefa
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        <motion.div className="mb-8 grid gap-4 md:grid-cols-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="session-card">
            <p className="text-sm text-muted-foreground">Semana</p>
            <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground">{getWeekLabel()}</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatWeekRange(weekStart)}</p>
          </div>
          <div className="session-card">
            <p className="text-sm text-muted-foreground">Sessões</p>
            <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground">{agendaSummary.total}</p>
          </div>
          <div className="session-card">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground">{agendaSummary.pending}</p>
          </div>
          <div className="session-card">
            <p className="text-sm text-muted-foreground">Tarefas e foco</p>
            <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground">{agendaSummary.tasks}</p>
            <p className="mt-1 text-sm text-muted-foreground">{agendaSummary.highPriority} prioridade alta</p>
          </div>
        </motion.div>

        <motion.div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-subtle">
            <button
              onClick={() => agendaView === "month" ? setMonthOffset((value) => value - 1) : setCurrentWeek((value) => value - 1)}
              className="rounded-xl p-2 transition-colors duration-200 hover:bg-secondary"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
            <div className="min-w-[140px] sm:min-w-[220px] text-center">
              <p className="text-sm font-medium text-foreground">{agendaView === "month" ? "Mapa mensal" : getWeekLabel()}</p>
              <p className="text-xs text-muted-foreground">
                {agendaView === "month"
                  ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(monthStart)
                  : formatWeekRange(weekStart)}
              </p>
            </div>
            <button
              onClick={() => agendaView === "month" ? setMonthOffset((value) => value + 1) : setCurrentWeek((value) => value + 1)}
              className="rounded-xl p-2 transition-colors duration-200 hover:bg-secondary"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl border border-border bg-card p-1 shadow-subtle">
              {[
                ["day", "Dia"],
                ["week", "Semana"],
                ["month", "Mes"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAgendaView(key as AgendaView)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                    agendaView === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-subtle">
              <span className={cn("h-2.5 w-2.5 rounded-full", cacheStatus === "synced" ? "bg-status-validated" : cacheStatus === "cached" ? "bg-orange-400" : "bg-border")} />
              <span>
                {cacheStatus === "synced"
                  ? "Dados sincronizados"
                  : cacheStatus === "cached"
                    ? `Mostrando cache local${cacheFetchedAt ? ` · ${new Date(cacheFetchedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}`
                    : "Sem cache local"}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-status-validated"></span>Confirmada</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-status-pending"></span>Pendente</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-destructive"></span>Faltou</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-400"></span>Cancelado</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-400"></span>Remarcado</span>
          </div>
        </motion.div>

        <motion.section
          className="mb-6 rounded-[1.5rem] border border-border bg-card p-4 shadow-subtle"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4 text-primary" />
              Visualizar por contexto
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row xl:max-w-xl">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={agendaSearch}
                  onChange={(event) => setAgendaSearch(event.target.value)}
                  placeholder="Buscar paciente, tarefa, tag..."
                  className="h-9 rounded-full pl-9 text-sm"
                />
              </label>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setCommandOpen(true)}>
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Comando rapido
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "Todos"],
                ["today", "Hoje"],
                ["sessions", "Sessões"],
                ["tasks", "Tarefas"],
                ["supervision", "Supervisão"],
                ["pending", "Pendências"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQuickFilter(key as QuickAgendaFilter)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    quickFilter === key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 border-t border-border/70 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tipo e cor</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  categoryFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Todos
              </button>
              {agendaCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryFilter(category.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    categoryFilter === category.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", getAgendaColor(category.defaultColorId).dotClass)} />
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Tags className="h-4 w-4" />
              Filtrar tag
              <select
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground"
              >
                <option value="all">Todas</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <span className="inline-flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2">
                <ListChecks className="h-4 w-4 text-primary" />
                Blocos de foco primeiro
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2">
                <Clock3 className="h-4 w-4 text-primary" />
                Buffer entre atendimentos
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2">
                <CalendarPlus className="h-4 w-4 text-primary" />
                Admin em lote
              </span>
            </div>
          </div>
        </motion.section>

        {!loading && !error && selectedDayInsight ? (
          <motion.section
            className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-subtle">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Hoje na clinica</p>
                  <h2 className="mt-1 font-serif text-2xl text-foreground">
                    {selectedDayInsight.day.long}, {formatDayNumber(selectedDayInsight.day.date)}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Um resumo operacional do dia selecionado, com foco em sessao, supervisao e pendencias.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCurrentWeek(0);
                      setSelectedDayKey(formatDate(new Date()));
                      setQuickFilter("today");
                    }}
                  >
                    Hoje
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!selectedDayInsight.nextClinicalSession}
                    onClick={() => selectedDayInsight.nextClinicalSession && openBriefingForSession(selectedDayInsight.nextClinicalSession)}
                  >
                    <Bell className="mr-1 h-3.5 w-3.5" />
                    Preparar primeira
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={selectedDayClinicalSessions.length === 0}
                    onClick={openPrepareDay}
                  >
                    Preparar meu dia
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={selectedDayClinicalSessions.length === 0}
                    onClick={copySelectedDayBriefings}
                  >
                    Copiar briefings
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {[
                  ["Total", selectedDayInsight.total],
                  ["Sessoes", selectedDayInsight.clinical],
                  ["Supervisao", selectedDayInsight.supervision],
                  ["Pendencias", selectedDayInsight.pending],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-border bg-background/60 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {selectedDayInsight.sessions.length === 0 ? (
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-dashed border-border px-4 py-5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => {
                      setSessionDialogDefaults({ date: selectedDayInsight.day.key });
                      setSessionDialogOpen(true);
                    }}
                  >
                    Dia livre no filtro atual. Clique para criar uma sessao ou tarefa nesse dia.
                  </button>
                ) : (
                  selectedDayInsight.sessions.slice(0, 4).map((session) => {
                    const meta = getAgendaMetaForSession(session);
                    const color = getAgendaColor(meta.colorId);
                    const context = getSessionClinicalContext(session).slice(0, 2);
                    return (
                      <div key={session.id} className={cn("rounded-2xl border p-3", color.cardClass)}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">{session.time} · {session.event_type === "block" ? "Tarefa" : getStatusLabel(session.status)}</p>
                            <p className="mt-1 truncate text-sm font-semibold text-foreground">{session.block_title ?? maskName(session.patient_name)}</p>
                            {context.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {context.map((item) => (
                                  <span key={item} className="max-w-full truncate rounded-full bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          {session.event_type !== "block" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              onClick={() => openBriefingForSession(session)}
                            >
                              Preparar
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-subtle">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Acoes rapidas</p>
              </div>
              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setSessionDialogDefaults({ date: selectedDayInsight.day.key });
                    setSessionDialogOpen(true);
                  }}
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Nova sessao nesse dia
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setSessionDialogDefaults({ date: selectedDayInsight.day.key, eventType: "task" });
                    setTaskDialogOpen(true);
                  }}
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  Nova tarefa de agenda
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => setQuickFilter("pending")}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Ver pendencias
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  disabled={selectedDayClinicalSessions.length === 0}
                  onClick={openPrepareDay}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Ritual pre-sessao
                </Button>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Atalhos: N nova sessao, T nova tarefa, P preparar o dia, setas mudam periodo.
              </p>
            </div>
          </motion.section>
        ) : null}

        {!loading && !error && agendaView === "day" && selectedDayInsight ? (
          <motion.section
            className="mb-6 rounded-[1.5rem] border border-border bg-card p-4 shadow-subtle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Linha do tempo do dia</p>
                <h2 className="font-serif text-2xl text-foreground">Rotina em ordem de atendimento</h2>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={openPrepareDay} disabled={selectedDayClinicalSessions.length === 0}>
                Preparar meu dia
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {selectedDayInsight.sessions.length === 0 ? (
                <button
                  type="button"
                  className="w-full rounded-2xl border border-dashed border-border px-4 py-5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => {
                    setSessionDialogDefaults({ date: selectedDayInsight.day.key });
                    setSessionDialogOpen(true);
                  }}
                >
                  Sem itens nesse dia. Clique para começar a montar a rotina.
                </button>
              ) : (
                selectedDayInsight.sessions
                  .slice()
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((session) => {
                    const meta = getAgendaMetaForSession(session);
                    const color = getAgendaColor(meta.colorId);
                    const clinicalContext = getSessionClinicalContext(session).slice(0, 2);
                    return (
                      <div key={session.id} className="grid gap-3 sm:grid-cols-[76px_1fr]">
                        <div className="pt-3 text-sm font-semibold text-muted-foreground">{session.time}</div>
                        <div className={cn("rounded-2xl border p-4", color.cardClass)}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-foreground">{session.block_title ?? maskName(session.patient_name)}</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", color.chipClass)}>
                                  {getAgendaCategory(meta.categoryId).label}
                                </span>
                                <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", getStatusColor(session.status))}>
                                  {session.event_type === "block" ? "Tarefa" : getStatusLabel(session.status)}
                                </span>
                                {meta.priority === "high" ? <span className="rounded-full bg-destructive/15 px-2 py-1 text-[10px] font-semibold text-destructive">Alta prioridade</span> : null}
                              </div>
                              {clinicalContext.length > 0 ? (
                                <div className="mt-3 space-y-1">
                                  {clinicalContext.map((item) => (
                                    <p key={item} className="rounded-xl bg-background/70 px-3 py-2 text-xs text-muted-foreground">{item}</p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            {session.event_type !== "block" ? (
                              <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-56">
                                <Button size="sm" onClick={() => openBriefingForSession(session)}>Preparar</Button>
                                <Button size="sm" variant="outline" onClick={() => void copyConfirmationMessage(session)}>WhatsApp</Button>
                                <Button size="sm" variant="outline" onClick={() => void markSessionStatus(session, "confirmed", "Sessao confirmada")}>Confirmar</Button>
                                <Button size="sm" variant="secondary" onClick={() => void handleCompleteSession(session)}>Concluir</Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </motion.section>
        ) : null}

        {error ? <IntegrationUnavailable message={error.message} requestId={error.requestId} /> : null}
        {loading ? <AgendaGridSkeleton /> : null}

        {!loading && !error && agendaView === "month" ? (
          <motion.div
            className="rounded-[2rem] border border-border bg-card p-4 shadow-subtle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mapa mensal</p>
                <h2 className="font-serif text-2xl text-foreground">
                  {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(monthStart)}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">Clique em um dia para abrir a visao diaria e preparar a rotina.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {monthInsights.map((item) => (
                <button
                  key={item.day.key}
                  type="button"
                  onClick={() => {
                    setSelectedDayKey(item.day.key);
                    const baseWeek = getStartOfWeek(new Date(), 0).getTime();
                    const targetWeek = getStartOfWeek(item.day.date, 0).getTime();
                    setCurrentWeek(Math.round((targetWeek - baseWeek) / (7 * 24 * 60 * 60 * 1000)));
                    setAgendaView("day");
                  }}
                  className={cn(
                    "min-h-[128px] rounded-2xl border border-border bg-background/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft",
                    item.day.isToday && "border-primary/50 bg-primary/5",
                    item.pending > 0 && "border-status-pending/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.day.short}</p>
                      <p className="mt-1 font-serif text-2xl text-foreground">{formatDayNumber(item.day.date)}</p>
                    </div>
                    {item.day.isToday ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Hoje</span> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">{item.clinical} sessoes</span>
                    {item.pending > 0 ? <span className="rounded-full bg-status-pending/15 px-2 py-1 text-[10px] font-semibold text-status-pending">{item.pending} pend.</span> : null}
                  </div>
                  <div className="mt-3 space-y-1">
                    {item.sessions.slice(0, 2).map((session) => (
                      <p key={session.id} className="truncate rounded-lg bg-card px-2 py-1 text-[11px] text-muted-foreground">
                        {session.time} · {session.block_title ?? maskName(session.patient_name)}
                      </p>
                    ))}
                    {item.sessions.length > 2 ? <p className="text-[11px] text-muted-foreground">+{item.sessions.length - 2} itens</p> : null}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        {!loading && !error && agendaView !== "month" && isMobile ? (
          <motion.div className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            {calendarDays.map((day) => {
              const daySessions = filteredSessions.filter((s) => getSessionDateKey(s) === day.key);
              return (
                <div key={day.key} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedDayKey(day.key)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-primary/5",
                      day.isToday && "bg-primary/5",
                      selectedDayKey === day.key && "ring-1 ring-inset ring-primary/30",
                    )}
                  >
                    <span className={cn("text-xs uppercase tracking-[0.18em] text-muted-foreground", day.isToday && "text-primary")}>{day.long}</span>
                    <span className={cn("font-serif text-xl text-foreground", day.isToday && "text-primary")}>{formatDayNumber(day.date)}</span>
                    {day.isToday ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Hoje</span> : null}
                    <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{daySessions.length}</span>
                  </button>
                  {daySessions.length === 0 ? (
                    <button
                      type="button"
                      className="w-full px-4 py-5 text-sm text-muted-foreground/50 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => { setSessionDialogDefaults({ date: day.key }); setSessionDialogOpen(true); }}
                    >
                      Livre — toque para agendar
                    </button>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {daySessions.map((session) => {
                        const meta = getAgendaMetaForSession(session);
                        const color = getAgendaColor(meta.colorId);
                        const category = getAgendaCategory(meta.categoryId);
                        return (
                          <div
                            key={session.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSessionClick(session.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") onSessionClick(session.id);
                            }}
                            className={cn(
                              "w-full px-4 py-3 text-left transition-colors hover:bg-muted/30",
                              color.cardClass,
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock3 className="h-3.5 w-3.5" />{session.time}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {session.event_type === "session" && session.location_type && (
                                  <span className="text-muted-foreground">
                                    {session.location_type === "remote" ? <Monitor className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                  </span>
                                )}
                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", color.chipClass)}>
                                  {category.label}
                                </span>
                                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
                                  {session.event_type === "block" ? "Tarefa" : getStatusLabel(session.status)}
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-foreground">{session.block_title ?? maskName(session.patient_name)}</p>
                            {session.event_type !== "block" ? (
                              <div className="mt-2 space-y-1">
                                {getSessionClinicalContext(session).map((item) => (
                                  <p key={item} className="line-clamp-1 rounded-lg bg-background/60 px-2 py-1 text-[11px] text-muted-foreground">
                                    {item}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                            {session.event_type !== "block" ? (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  className="h-8 gap-1"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openBriefingForSession(session);
                                  }}
                                >
                                  <Bell className="h-3.5 w-3.5" />
                                  Preparar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void copyConfirmationMessage(session);
                                  }}
                                >
                                  WhatsApp
                                </Button>
                              </div>
                            ) : null}
                            {meta.tags.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {meta.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        ) : null}

        {!loading && !error && agendaView !== "month" && !isMobile ? (
          <motion.div
            ref={desktopAgendaRef}
            className={cn("flex flex-col gap-4 xl:flex-row xl:items-start", isResizingPanels && "select-none")}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
          <div className="min-w-0 flex-1 rounded-[2rem] border border-border bg-card shadow-[0_24px_52px_-34px_rgba(15,23,42,0.28)]">
            <div className="grid w-full min-w-0" style={{ gridTemplateColumns: desktopCalendarGrid }}>
              <div className="border-b border-r border-border bg-muted/30 p-3" />
              {calendarDays.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDayKey(day.key)}
                  className={cn(
                    "min-w-0 border-b border-border text-left transition-colors hover:bg-primary/5",
                    desktopDensity.dayHeaderPadding,
                    day.isToday && "bg-primary/5",
                    selectedDayKey === day.key && "ring-1 ring-inset ring-primary/30",
                  )}
                >
                  <p className={cn("truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground", day.isToday && "text-primary")}>
                    {day.long}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-serif text-2xl text-foreground">{formatDayNumber(day.date)}</span>
                    {day.isToday ? <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">Hoje</span> : null}
                  </div>
                </button>
              ))}

              {timeSlots.map((slot) => (
                <div key={slot} className="contents">
                  <div className="border-r border-border bg-muted/20 px-3 py-4 text-right">
                    <span className="text-xs font-medium text-muted-foreground">{slot}</span>
                  </div>
                  {calendarDays.map((day) => {
                    const cellKey = `${day.key}-${slot}`;
                    const daySessions = sessionsByCell.get(cellKey) ?? [];
                    return (
                      <div
                        key={cellKey}
                        className={cn(desktopDensity.cellPadding, "min-w-0 border-t border-border/70", day.isToday && "bg-primary/5")}
                        style={{ minHeight: `${desktopDensity.cellMinHeight}px` }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={async (event) => {
                          event.preventDefault();
                          const sessionId = event.dataTransfer.getData("text/plain");
                          if (!sessionId) return;
                          setDraggingSessionId(null);
                          await moveSession(sessionId, day.key, slot);
                        }}
                      >
                        {daySessions.length === 0 ? (
                          <button
                            type="button"
                            className={cn(
                              "flex h-full w-full items-center justify-center rounded-xl border border-dashed px-3 text-center text-[11px] transition-colors",
                              (() => {
                                if (!dragCreate || dragCreate.dayKey !== day.key) return "border-border/70 text-muted-foreground/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary/60";
                                const si = timeSlots.indexOf(dragCreate.startSlot);
                                const ei = timeSlots.indexOf(dragCreate.endSlot);
                                const ci = timeSlots.indexOf(slot);
                                return ci >= Math.min(si, ei) && ci <= Math.max(si, ei)
                                  ? "border-primary/60 bg-primary/10 text-primary/70"
                                  : "border-border/70 text-muted-foreground/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary/60";
                              })(),
                            )}
                            style={{ minHeight: `${desktopDensity.emptyCellMinHeight}px` }}
                            onPointerDown={() => setDragCreate({ dayKey: day.key, startSlot: slot, endSlot: slot })}
                            onPointerEnter={() => {
                              if (dragCreate && dragCreate.dayKey === day.key) {
                                setDragCreate((prev) => (prev ? { ...prev, endSlot: slot } : null));
                              }
                            }}
                          >
                            {dragCreate?.dayKey === day.key && (() => {
                              const si = timeSlots.indexOf(dragCreate.startSlot);
                              const ei = timeSlots.indexOf(dragCreate.endSlot);
                              const ci = timeSlots.indexOf(slot);
                              return ci === Math.min(si, ei) && si !== ei;
                            })() ? `${(Math.abs(timeSlots.indexOf(dragCreate.endSlot) - timeSlots.indexOf(dragCreate.startSlot)) + 1) * 60} min` : "Livre"}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {daySessions.map((session) => {
                              const flags = getSessionFlags(session);
                              const meta = getAgendaMetaForSession(session);
                              const color = getAgendaColor(meta.colorId);
                              const category = getAgendaCategory(meta.categoryId);
                              const isResizing = resizingSession?.id === session.id;
                              const displayDuration = isResizing ? resizingSession.currentDuration : session.duration;
                              return (
                                <div key={session.id} className="relative">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    draggable={!isResizing}
                                    onDragStart={(event) => {
                                      event.dataTransfer.setData("text/plain", session.id);
                                      setDraggingSessionId(session.id);
                                    }}
                                    onDragEnd={() => setDraggingSessionId(null)}
                                    onClick={() => onSessionClick(session.id)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" || event.key === " ") onSessionClick(session.id);
                                    }}
                                    className={cn(
                                      "w-full min-w-0 rounded-2xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft",
                                      desktopDensity.cardPadding,
                                      color.cardClass,
                                      draggingSessionId === session.id && "opacity-60",
                                      session.event_type === "block" && "border-dashed opacity-80",
                                      isResizing && "select-none pb-4",
                                    )}
                                  >
                                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        {session.time}
                                      </span>
                                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                                        {session.event_type === "session" && session.location_type && (
                                          <span className="text-muted-foreground">
                                            {session.location_type === "remote" ? <Monitor className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                          </span>
                                        )}
                                        <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", color.chipClass)}>
                                          {category.label}
                                        </span>
                                        <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
                                          {session.event_type === "block" ? "Tarefa" : getStatusLabel(session.status)}
                                        </span>
                                      </div>
                                    </div>

                                    <p className={cn(desktopDensity.cardTitleClamp, "break-words text-sm font-semibold leading-5 text-foreground")}>{session.block_title ?? maskName(session.patient_name)}</p>
                                    {session.event_type !== "block" ? (
                                      <div className="mt-2 space-y-1">
                                        {getSessionClinicalContext(session).map((item) => (
                                          <p key={item} className="line-clamp-1 rounded-lg bg-background/60 px-2 py-1 text-[11px] text-muted-foreground">
                                            {item}
                                          </p>
                                        ))}
                                      </div>
                                    ) : null}
                                    {session.series_id && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                        <Repeat2 className="h-3 w-3" />
                                        {session.recurrence
                                          ? session.recurrence.type === "weekly" ? "Semanal"
                                            : session.recurrence.type === "biweekly" ? "Quinzenal"
                                            : "2× sem"
                                          : "Série"}
                                      </span>
                                    )}

                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {flags.map((flag) => (
                                        <span
                                          key={flag}
                                          className={cn(
                                            "rounded-full px-2 py-1 text-[10px] font-semibold",
                                            flag === "Novo"
                                              ? "bg-accent/15 text-accent"
                                              : flag === "Retorno"
                                                ? "bg-primary/10 text-primary"
                                                : "bg-status-pending/15 text-status-pending",
                                          )}
                                        >
                                          {flag}
                                        </span>
                                      ))}
                                      {meta.priority === "high" ? (
                                        <span className="rounded-full bg-destructive/15 px-2 py-1 text-[10px] font-semibold text-destructive">
                                          Alta prioridade
                                        </span>
                                      ) : null}
                                      {meta.tags.map((tag) => (
                                        <span
                                          key={tag}
                                          className="rounded-full bg-background/70 px-2 py-1 text-[10px] font-semibold text-muted-foreground"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>

                                    <div className="mt-3 inline-flex max-w-full flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                                      {session.event_type === "block"
                                        ? <CalendarPlus className="h-3.5 w-3.5" />
                                        : <UserRound className="h-3.5 w-3.5" />}
                                      {session.event_type === "block"
                                        ? (displayDuration ? `${displayDuration} min` : "Tarefa")
                                        : (displayDuration ? `${displayDuration} min` : "Sessão")}
                                      {session.event_type === "session" && session.location_type && (
                                        <span className="ml-1 opacity-70">
                                          · {session.location_type === "remote" ? "Remoto" : "Presencial"}
                                        </span>
                                      )}
                                    </div>
                                    {session.event_type !== "block" ? (
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <Button
                                          type="button"
                                          variant="default"
                                          size="sm"
                                          className="h-8 gap-1"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openBriefingForSession(session);
                                          }}
                                        >
                                          <Bell className="h-3.5 w-3.5" />
                                          Preparar
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-8"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void copyConfirmationMessage(session);
                                          }}
                                        >
                                          Confirmar
                                        </Button>
                                      </div>
                                    ) : null}
                                  </div>

                                  {/* Resize grip */}
                                  <div
                                    className={cn(
                                      "absolute bottom-0 left-0 right-0 flex h-3 cursor-row-resize items-center justify-center rounded-b-2xl transition-colors",
                                      isResizing ? "bg-primary/30" : "bg-transparent hover:bg-primary/15",
                                    )}
                                    onPointerDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      const dur = session.duration ?? 50;
                                      resizeDurationRef.current = dur;
                                      setResizingSession({ id: session.id, startY: e.clientY, originalDuration: dur, currentDuration: dur });
                                    }}
                                  >
                                    <span className="h-0.5 w-6 rounded-full bg-current opacity-30" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Grip handle — always visible at xl+, independent of suggestions */}
          <button
            type="button"
            className={cn(
              "hidden min-h-16 shrink-0 cursor-col-resize items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-1.5 text-primary shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/10 xl:flex",
              isResizingPanels && "border-primary/70 bg-primary/15",
            )}
            style={{ alignSelf: "stretch", width: 28 }}
            onPointerDown={(event) => {
              event.preventDefault();
              startSuggestionsResize(event.clientX);
            }}
            title="Arraste para ajustar o tamanho da agenda"
            aria-label="Redimensionar painel lateral da agenda"
          >
            <GripVertical className="h-5 w-5" strokeWidth={1.8} />
          </button>

          {visibleSuggestions.length > 0 ? (
            /* Panel with suggestions — original structure preserved */
            <div className="w-full space-y-3 border-t pt-4 xl:shrink-0 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-2" style={{ flexBasis: `${suggestionsPanelWidth}px` }}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Próxima semana</span>
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{visibleSuggestions.length}</span>
              </div>
              {visibleSuggestions.map((s) => (
                <div
                  key={`${s.patient_id}-${s.suggested_at}`}
                  className={cn(
                    "rounded-lg border p-3 text-sm space-y-2",
                    s.source === "rule"
                      ? "border-l-4 border-l-teal-500 bg-teal-50 dark:bg-teal-950/30"
                      : "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="font-medium leading-tight">{maskName(s.patient_name)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.suggested_at).toLocaleString("pt-BR", {
                          weekday: "short", day: "2-digit", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      {s.source === "pattern" && s.confidence !== undefined && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          detectado · {s.confidence}% conf.
                        </p>
                      )}
                      {s.recurrence_type && (
                        <p className="text-xs text-teal-600 dark:text-teal-400">{s.recurrence_type}</p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setDismissedSuggestions((prev) => new Set([...prev, `${s.patient_id}-${s.suggested_at}`]))
                      }
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={async () => {
                      await sessionService.create({
                        patient_id: s.patient_id,
                        scheduled_at: s.suggested_at,
                        duration_minutes: s.duration_minutes,
                      });
                      setDismissedSuggestions((prev) => new Set([...prev, `${s.patient_id}-${s.suggested_at}`]));
                      const result = await sessionService.list(activeWindow);
                      if (result.success) {
                        setSessions(result.data);
                        setAgendaMetaByEventId(readAgendaEventMetaMap());
                      }
                    }}
                  >
                    Confirmar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state — desktop only, same flex item sizing */
            <div className="hidden xl:block xl:shrink-0 xl:border-l xl:pl-4 xl:pt-2 space-y-3" style={{ flexBasis: `${suggestionsPanelWidth}px` }}>
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Próxima semana</span>
              </div>
              <p className="text-sm text-muted-foreground">Sem sessões agendadas para a próxima semana.</p>
            </div>
          )}
          </motion.div>
        ) : null}
      </div>
    </div>

    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Comando rapido da agenda</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          {[
            ["session", "Nova sessao", "Agenda uma sessao no dia selecionado."],
            ["task", "Nova tarefa", "Cria um bloco administrativo, pessoal ou de supervisao."],
            ["prepare", "Preparar meu dia", "Abre o ritual pre-sessao do dia selecionado."],
            ["copy", "Copiar briefings", "Copia todos os briefings clinicos do dia."],
            ["today", "Ir para hoje", "Volta para hoje na visao diaria."],
            ["pending", "Ver pendencias", "Filtra sessoes pendentes, faltas e alta prioridade."],
          ].map(([key, label, description]) => (
            <button
              key={key}
              type="button"
              onClick={() => runAgendaCommand(key as "session" | "task" | "prepare" | "copy" | "today" | "pending")}
              className="rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Atalho: K abre este menu.</p>
      </DialogContent>
    </Dialog>

    <SessionDialog
      open={sessionDialogOpen}
      onOpenChange={(v) => { setSessionDialogOpen(v); if (!v) setSessionDialogDefaults({}); }}
      patients={patients}
      mode="session"
      defaultDate={sessionDialogDefaults.date}
      defaultTime={sessionDialogDefaults.time}
      defaultEventType={sessionDialogDefaults.eventType as 'session' | 'task' | undefined}
      onCreated={async () => {
        const result = await sessionService.list(activeWindow);
        if (result.success) {
          setSessions(result.data);
          setAgendaMetaByEventId(readAgendaEventMetaMap());
          setSessionCache(result.data); // sync global store
        }
      }}
    />

    <SessionDialog
      open={taskDialogOpen}
      onOpenChange={(v) => { setTaskDialogOpen(v); if (!v) setSessionDialogDefaults({}); }}
      patients={patients}
      mode="task"
      defaultDate={sessionDialogDefaults.date}
      defaultTime={sessionDialogDefaults.time}
      defaultEventType={sessionDialogDefaults.eventType as 'session' | 'task' | undefined}
      onCreated={async () => {
        const result = await sessionService.list(activeWindow);
        if (result.success) {
          setSessions(result.data);
          setAgendaMetaByEventId(readAgendaEventMetaMap());
          setSessionCache(result.data);
        }
      }}
    />

    <Dialog open={prepareDayOpen} onOpenChange={setPrepareDayOpen}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Preparar meu dia</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-secondary/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              {selectedDayInsight ? `${selectedDayInsight.day.long}, ${formatDayNumber(selectedDayInsight.day.date)}` : "Dia selecionado"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Revise cada atendimento, copie mensagens de confirmacao e abra o briefing quando precisar.
            </p>
          </div>

          {selectedDayClinicalSessions.map((session, index) => {
            const briefing = buildBriefingForSession(session);
            return (
              <div key={session.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sessao {index + 1}</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">{session.time} · {maskName(session.patient_name)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{briefing.mainComplaint || "Sem queixa principal registrada."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openBriefingForSession(session)}>Abrir briefing</Button>
                    <Button size="sm" variant="outline" onClick={() => void copyConfirmationMessage(session)}>Copiar WhatsApp</Button>
                    <Button size="sm" variant="outline" onClick={() => void markSessionStatus(session, "confirmed", "Sessao confirmada")}>Confirmada</Button>
                    <Button size="sm" variant="secondary" onClick={() => void handleCompleteSession(session)}>Concluir</Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <div className="rounded-xl bg-background/70 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Evolucao</p>
                    <p className="mt-1 line-clamp-3 text-sm text-foreground">{briefing.clinicalEvolution || "Sem sintese recente."}</p>
                  </div>
                  <div className="rounded-xl bg-background/70 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Supervisao</p>
                    <p className="mt-1 line-clamp-3 text-sm text-foreground">
                      {briefing.supervisionHighlights[0]?.nextSessionPrompt || briefing.supervisionHighlights[0]?.title || "Sem anotacao fixada."}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background/70 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Pendencias</p>
                    <p className="mt-1 line-clamp-3 text-sm text-foreground">
                      {[...briefing.tasks.map((task) => task.title), ...briefing.adminAlerts].slice(0, 2).join(" · ") || "Nada critico para antes da sessao."}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-border/70 bg-background/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Checklist pre-sessao</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      "Queixa revisada",
                      "Evolucao revisada",
                      "Supervisao revisada",
                      "Tarefa/homework conferida",
                      "Ficha pronta",
                    ].map((item) => {
                      const checked = prepChecklist[session.id]?.includes(item) ?? false;
                      return (
                        <label
                          key={item}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors",
                            checked ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePrepChecklistItem(session.id, item)}
                            className="h-3.5 w-3.5"
                          />
                          {item}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={!!selectedBriefing} onOpenChange={(open) => !open && setSelectedBriefing(null)}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Briefing pre-sessao</DialogTitle>
        </DialogHeader>
        {selectedBriefing ? (
          <PreSessionBriefingPanel
            briefing={selectedBriefing}
            onCopy={() => void copyBriefing(selectedBriefing)}
            onNotify={() => void notifyBriefing(selectedBriefing)}
            onOpenPatient={onPatientClick ? () => onPatientClick(selectedBriefing.patientId) : undefined}
          />
        ) : null}
      </DialogContent>
    </Dialog>

    {billingDialog && (
      <BillingConfirmDialog
        open={billingDialog.open}
        patientName={billingDialog.patientName}
        suggestedAmount={billingDialog.suggestedAmount}
        suggestedDueDate={billingDialog.suggestedDueDate}
        onConfirm={async () => {
          try {
            await financeService.createEntry({
              patient_id: billingDialog.patientId,
              session_id: billingDialog.sessionId,
              amount: billingDialog.suggestedAmount,
              due_date: billingDialog.suggestedDueDate,
              status: "open",
              description: "Sessão de psicoterapia",
            });
          } catch (e) {
            console.error(e);
          }
          setBillingDialog(null);
        }}
        onDismiss={() => setBillingDialog(null)}
      />
    )}
    </>
  );
};

export default AgendaPage;
