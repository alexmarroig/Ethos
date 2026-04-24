import { useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock3, Monitor, Building2, PanelRightClose, PanelRightOpen, Plus, Repeat2, Settings2, Sparkles, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sessionService, type Session, type CalendarSuggestion } from "@/services/sessionService";
import { SessionDialog } from "@/components/SessionDialog";
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
  readAgendaWeekCache,
  writeAgendaWeekCache,
  type AgendaDensity,
} from "@/pages/agendaStorage";

interface AgendaPageProps {
  onSessionClick: (sessionId: string) => void;
}

type AgendaSettings = {
  startHour: number;
  endHour: number;
  enabledWeekdays: number[];
};

type StoredAgendaSettings = AgendaSettings & {
  density?: AgendaDensity;
  suggestionsExpanded?: boolean;
};

type CacheStatus = "idle" | "cached" | "synced";

const AGENDA_SETTINGS_KEY = "ethos_web_agenda_settings_v1";
const defaultAgendaSettings: AgendaSettings = {
  startHour: 8,
  endHour: 19,
  enabledWeekdays: [1, 2, 3, 4, 5],
};
const SUGGESTIONS_PANEL_MIN_WIDTH = 220;
const SUGGESTIONS_PANEL_MAX_WIDTH = 420;
const SUGGESTIONS_PANEL_DEFAULT_WIDTH = 240;

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

const AgendaPage = ({ onSessionClick }: AgendaPageProps) => {
  const { currentMissionId, shouldShowCoachmarks, markMissionCompleted } = useOnboarding();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { maskName } = usePrivacy();
  const setSessionCache = useAppStore((s) => s.setSessionCache);
  const upsertSession = useAppStore((s) => s.upsertSession);
  const removeSessionFromStore = useAppStore((s) => s.removeSession);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
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

  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [suggestionsPanelWidth, setSuggestionsPanelWidth] = useState(SUGGESTIONS_PANEL_DEFAULT_WIDTH);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [density, setDensity] = useState<AgendaDensity>("comfortable");
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>("idle");
  const [cacheFetchedAt, setCacheFetchedAt] = useState<string | null>(null);
  const [sessionDialogDefaults, setSessionDialogDefaults] = useState<{ date?: string; time?: string; eventType?: 'session' | 'task' }>({});
  const [dismissCoachmark, setDismissCoachmark] = useState(false);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
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
      setDensity(parsed.density ?? "comfortable");
      setSuggestionsExpanded(parsed.suggestionsExpanded ?? true);
    } catch {
      setAgendaSettings(defaultAgendaSettings);
      setSettingsDraft(defaultAgendaSettings);
      setDensity("comfortable");
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
      density,
      suggestionsExpanded,
    }));
  }, [agendaSettings, density, settingsHydrated, suggestionsExpanded]);

  useEffect(() => {
    const loadPatients = async () => {
      const result = await patientService.list();
      if (result.success) setPatients(result.data);
    };

    void loadPatients();
  }, []);

  useEffect(() => {
    const cachedWeek = readAgendaWeekCache();
    if (cachedWeek?.weekWindow.from === weekWindow.from && cachedWeek.weekWindow.to === weekWindow.to) {
      setSessions(cachedWeek.sessions);
      setSessionCache(cachedWeek.sessions);
      setCacheStatus("cached");
      setCacheFetchedAt(cachedWeek.fetchedAt);
      setLoading(false);
    }

    const loadSessions = async () => {
      setLoading(!cachedWeek);
      try {
        const result = await sessionService.list(weekWindow, undefined, { timeout: 4000, retry: false });
        if (!result.success) {
          setError({ message: result.error.message, requestId: result.request_id });
          return;
        }
        setSessions(result.data);
        setSessionCache(result.data); // sync global store
        setError(null);
        const fetchedAt = new Date().toISOString();
        writeAgendaWeekCache({
          version: 1,
          fetchedAt,
          weekWindow,
          sessions: result.data,
        });
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
  }, [setSessionCache, weekWindow]);

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
    const refreshResult = await sessionService.list(weekWindow);
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

  const sessionsByCell = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const day of visibleWeekDays) {
      for (const slot of timeSlots) {
        map.set(`${day.key}-${slot}`, []);
      }
    }

    for (const session of sessions) {
      const dateKey = session.date || (session.scheduled_at ? formatDate(new Date(session.scheduled_at)) : "");
      const [hour] = (session.time || "00:00").split(":");
      const normalizedTimeKey = `${hour}:00`;
      const slotKey = `${dateKey}-${normalizedTimeKey}`;
      
      if (!map.has(slotKey)) continue;
      map.get(slotKey)?.push(session);
    }

    return map;
  }, [sessions, visibleWeekDays, timeSlots]);

  const agendaSummary = useMemo(() => {
    const total = sessions.length;
    const pending = sessions.filter((session) => session.status === "pending").length;
    const newPatients = sessions.filter((session) => (session.patient_total_sessions ?? 0) <= 1).length;
    return { total, pending, newPatients };
  }, [sessions]);

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

  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => !dismissedSuggestions.has(`${s.patient_id}-${s.suggested_at}`)),
    [dismissedSuggestions, suggestions],
  );

  const desktopDensity = density === "compact"
    ? {
        gridMinWidth: 0,
        dayColumnMin: 122,
        cellMinHeight: 88,
        emptyCellMinHeight: 72,
        cellPadding: "p-2",
        cardPadding: "p-2.5",
        dayHeaderPadding: "p-3",
        cardTitleClamp: "line-clamp-2",
        metaVisible: false,
      }
    : {
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
    return `72px repeat(${visibleWeekDays.length}, ${dayWidth})`;
  }, [desktopDensity.dayColumnMin, visibleWeekDays.length]);

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
            <p className="text-sm text-muted-foreground">Agenda ativa</p>
            <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground">{agendaSettings.enabledWeekdays.length} dias</p>
            <p className="mt-1 text-sm text-muted-foreground">{String(agendaSettings.startHour).padStart(2, "0")}:00 às {String(agendaSettings.endHour).padStart(2, "0")}:00</p>
          </div>
        </motion.div>

        <motion.div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-subtle">
            <button onClick={() => setCurrentWeek((value) => value - 1)} className="rounded-xl p-2 transition-colors duration-200 hover:bg-secondary">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
            <div className="min-w-[140px] sm:min-w-[220px] text-center">
              <p className="text-sm font-medium text-foreground">{getWeekLabel()}</p>
              <p className="text-xs text-muted-foreground">{formatWeekRange(weekStart)}</p>
            </div>
            <button onClick={() => setCurrentWeek((value) => value + 1)} className="rounded-xl p-2 transition-colors duration-200 hover:bg-secondary">
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl border border-border bg-card p-1 shadow-subtle">
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                  density === "compact" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                Compacta
              </button>
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                  density === "comfortable" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                Confortável
              </button>
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

        {error ? <IntegrationUnavailable message={error.message} requestId={error.requestId} /> : null}
        {loading ? <AgendaGridSkeleton /> : null}

        {!loading && !error && isMobile ? (
          <motion.div className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            {visibleWeekDays.map((day) => {
              const daySessions = sessions.filter((s) => (s.date || (s.scheduled_at ? formatDate(new Date(s.scheduled_at)) : "")) === day.key);
              return (
                <div key={day.key} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className={cn("flex items-center gap-3 px-4 py-3 border-b border-border", day.isToday && "bg-primary/5")}>
                    <span className={cn("text-xs uppercase tracking-[0.18em] text-muted-foreground", day.isToday && "text-primary")}>{day.long}</span>
                    <span className={cn("font-serif text-xl text-foreground", day.isToday && "text-primary")}>{formatDayNumber(day.date)}</span>
                    {day.isToday ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Hoje</span> : null}
                  </div>
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
                      {daySessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => onSessionClick(session.id)}
                          className={cn(
                            "w-full px-4 py-3 text-left transition-colors hover:bg-muted/30",
                            getStatusColor(session.status),
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
                              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
                                {session.event_type === "block" ? "Tarefa" : getStatusLabel(session.status)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">{session.block_title ?? maskName(session.patient_name)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        ) : null}

        {!loading && !error && !isMobile ? (
          <motion.div
            ref={desktopAgendaRef}
            className={cn("flex flex-col gap-4 xl:flex-row xl:items-start", isResizingPanels && "select-none")}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
          <div className="w-full min-w-0 rounded-[2rem] border border-border bg-card shadow-[0_24px_52px_-34px_rgba(15,23,42,0.28)]">
            <div className="grid w-full min-w-0" style={{ gridTemplateColumns: desktopCalendarGrid }}>
              <div className="border-b border-r border-border bg-muted/30 p-3" />
              {visibleWeekDays.map((day) => (
                <div key={day.key} className={cn("min-w-0 border-b border-border", desktopDensity.dayHeaderPadding, day.isToday && "bg-primary/5")}>
                  <p className={cn("truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground", day.isToday && "text-primary")}>
                    {density === "compact" ? day.short : day.long}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn("font-serif text-foreground", density === "compact" ? "text-xl" : "text-2xl")}>{formatDayNumber(day.date)}</span>
                    {day.isToday ? <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">Hoje</span> : null}
                  </div>
                </div>
              ))}

              {timeSlots.map((slot) => (
                <div key={slot} className="contents">
                  <div className={cn("border-r border-border bg-muted/20 px-2 text-right", density === "compact" ? "py-3" : "px-3 py-4")}>
                    <span className="text-xs font-medium text-muted-foreground">{slot}</span>
                  </div>
                  {visibleWeekDays.map((day) => {
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
                            className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-border/70 px-3 text-center text-[11px] text-muted-foreground/60 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary/60"
                            style={{ minHeight: `${desktopDensity.emptyCellMinHeight}px` }}
                            onClick={() => {
                              setSessionDialogDefaults({ date: day.key, time: slot });
                              setSessionDialogOpen(true);
                            }}
                          >
                            Livre
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {daySessions.map((session) => {
                              const flags = getSessionFlags(session);
                              return (
                                <button
                                  key={session.id}
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    event.dataTransfer.setData("text/plain", session.id);
                                    setDraggingSessionId(session.id);
                                  }}
                                  onDragEnd={() => setDraggingSessionId(null)}
                                  onClick={() => onSessionClick(session.id)}
                                  className={cn(
                                    "w-full min-w-0 rounded-2xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft",
                                    desktopDensity.cardPadding,
                                    getStatusColor(session.status),
                                    draggingSessionId === session.id && "opacity-60",
                                    session.event_type === "block" && "border-dashed opacity-80",
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
                                      <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
                                        {session.event_type === "block" ? "Tarefa" : getStatusLabel(session.status)}
                                      </span>
                                    </div>
                                  </div>

                                  <p className={cn(desktopDensity.cardTitleClamp, "break-words text-sm font-semibold leading-5 text-foreground")}>{session.block_title ?? maskName(session.patient_name)}</p>
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
                                  </div>

                                  <div className="mt-3 inline-flex max-w-full flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                                    {session.event_type === "block"
                                      ? <CalendarPlus className="h-3.5 w-3.5" />
                                      : <UserRound className="h-3.5 w-3.5" />}
                                    {session.event_type === "block"
                                      ? (session.duration ? `${session.duration} min` : "Tarefa")
                                      : (session.duration ? `${session.duration} min` : "Sessão")}
                                    {session.event_type === "session" && session.location_type && (
                                      <span className="ml-1 opacity-70">
                                        · {session.location_type === "remote" ? "Remoto" : "Presencial"}
                                      </span>
                                    )}
                                  </div>
                                </button>
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
          <div
            className="hidden xl:flex xl:shrink-0 xl:cursor-col-resize xl:flex-col xl:items-center xl:justify-center xl:gap-1.5 xl:rounded-md xl:px-1 xl:transition-colors xl:hover:bg-accent"
            style={{ alignSelf: "stretch", width: 20 }}
            onPointerDown={(event) => {
              event.preventDefault();
              startSuggestionsResize(event.clientX);
            }}
            aria-label="Redimensionar painel lateral da agenda"
          >
            <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
          </div>

          {/* Suggestions panel — always visible at xl+; on mobile only when there are suggestions */}
          <div
            className={cn(
              "space-y-3",
              visibleSuggestions.length === 0 && "hidden",
              "xl:block xl:shrink-0 xl:border-l xl:pl-4 xl:pt-2",
              visibleSuggestions.length > 0 && "border-t pt-4",
            )}
            style={{ flexBasis: `${suggestionsPanelWidth}px` }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Próxima semana</span>
              {visibleSuggestions.length > 0 && (
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{visibleSuggestions.length}</span>
              )}
            </div>

            {visibleSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem sessões agendadas para a próxima semana.</p>
            ) : (
              visibleSuggestions.map((s) => (
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
                      const result = await sessionService.list(weekWindow);
                      if (result.success) setSessions(result.data);
                    }}
                  >
                    Confirmar
                  </Button>
                </div>
              ))
            )}
          </div>
          </motion.div>
        ) : null}
      </div>
    </div>

    <SessionDialog
      open={sessionDialogOpen}
      onOpenChange={(v) => { setSessionDialogOpen(v); if (!v) setSessionDialogDefaults({}); }}
      patients={patients}
      mode="session"
      defaultDate={sessionDialogDefaults.date}
      defaultTime={sessionDialogDefaults.time}
      defaultEventType={sessionDialogDefaults.eventType as 'session' | 'task' | undefined}
      onCreated={async () => {
        const result = await sessionService.list(weekWindow);
        if (result.success) {
          setSessions(result.data);
          setSessionCache(result.data); // sync global store
        }
      }}
    />

    <SessionDialog
      open={taskDialogOpen}
      onOpenChange={setTaskDialogOpen}
      patients={patients}
      mode="task"
      onCreated={async () => {
        const result = await sessionService.list(weekWindow);
        if (result.success) {
          setSessions(result.data);
          setSessionCache(result.data);
        }
      }}
    />

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
