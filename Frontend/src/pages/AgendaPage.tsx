import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock3, Loader2, Plus, Settings2, Sparkles, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sessionService, type Session, type CalendarSuggestion } from "@/services/sessionService";
import { SessionDialog } from "@/components/SessionDialog";
import { BillingConfirmDialog } from "@/components/BillingConfirmDialog";
import { CLINICAL_BASE_URL } from "@/config/runtime";
import { readStoredAuthUser } from "@/services/authStorage";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { AgendaGridSkeleton } from "@/components/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import { patientService, type Patient } from "@/services/patientService";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AgendaPageProps {
  onSessionClick: (sessionId: string) => void;
}

type AgendaSettings = {
  startHour: number;
  endHour: number;
  enabledWeekdays: number[];
};

const AGENDA_SETTINGS_KEY = "ethos_web_agenda_settings_v1";
const defaultAgendaSettings: AgendaSettings = {
  startHour: 8,
  endHour: 19,
  enabledWeekdays: [1, 2, 3, 4, 5],
};

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
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [agendaSettings, setAgendaSettings] = useState<AgendaSettings>(defaultAgendaSettings);
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
  } | null>(null);

  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionDialogDefaults, setSessionDialogDefaults] = useState<{ date?: string; time?: string }>({});

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
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AgendaSettings>;
      setAgendaSettings({
        startHour: typeof parsed.startHour === "number" ? parsed.startHour : defaultAgendaSettings.startHour,
        endHour: typeof parsed.endHour === "number" ? parsed.endHour : defaultAgendaSettings.endHour,
        enabledWeekdays:
          Array.isArray(parsed.enabledWeekdays) && parsed.enabledWeekdays.length > 0
            ? parsed.enabledWeekdays.filter((value): value is number => typeof value === "number")
            : defaultAgendaSettings.enabledWeekdays,
      });
    } catch {
      setAgendaSettings(defaultAgendaSettings);
    }
  }, []);

  useEffect(() => {
    const loadPatients = async () => {
      const result = await patientService.list();
      if (result.success) setPatients(result.data);
    };

    void loadPatients();
  }, []);

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      const result = await sessionService.list(weekWindow);
      if (!result.success) {
        setError({ message: result.error.message, requestId: result.request_id });
      } else {
        setSessions(result.data);
        setError(null);
      }
      setLoading(false);
    };

    // Load suggestions for next week
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay() + 1) % 7 || 7);
    const weekStart = nextWeek.toISOString().split("T")[0];
    sessionService.getSuggestions(weekStart).then((r) => {
      if (r.success) setSuggestions(r.data);
    }).catch(() => {});

    void loadSessions();
  }, [weekWindow]);

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
    setDialogOpen(false);
    setNewPatientId("");
    setNewDate("");
    setNewTime("");
    setNewDuration("50");
    toast({ title: "Sessão agendada" });
    setCreating(false);
  };

  const moveSession = async (sessionId: string, date: string, time: string) => {
    const scheduledAt = combineDateTime(date, time);
    const result = await sessionService.update(sessionId, { scheduled_at: scheduledAt });

    if (!result.success) {
      toast({ title: "Erro ao mover sessão", description: result.error.message, variant: "destructive" });
      return;
    }

    setSessions((current) => current.map((session) => (session.id === sessionId ? result.data : session)));
    toast({
      title: "Sessão remarcada",
      description: `${result.data.patient_name} agora está em ${new Date(scheduledAt).toLocaleString("pt-BR", {
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
      });
    }
  };

  const toggleWeekday = (dayId: number) => {
    setAgendaSettings((current) => {
      const exists = current.enabledWeekdays.includes(dayId);
      const enabledWeekdays = exists
        ? current.enabledWeekdays.filter((value) => value !== dayId)
        : [...current.enabledWeekdays, dayId].sort((a, b) => a - b);
      return { ...current, enabledWeekdays };
    });
  };

  const handleSaveAgendaSettings = () => {
    if (agendaSettings.enabledWeekdays.length === 0) {
      toast({ title: "Selecione ao menos um dia", description: "A agenda precisa de pelo menos um dia ativo.", variant: "destructive" });
      return;
    }
    if (agendaSettings.endHour <= agendaSettings.startHour) {
      toast({ title: "Horário inválido", description: "O horário final precisa ser maior que o inicial.", variant: "destructive" });
      return;
    }

    localStorage.setItem(AGENDA_SETTINGS_KEY, JSON.stringify(agendaSettings));
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
      const timeKey = session.time || "00:00";
      const slotKey = `${dateKey}-${timeKey}`;
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

  const getStatusColor = (status: Session["status"]) => {
    switch (status) {
      case "completed":
      case "confirmed":
        return "border-status-validated/30 bg-status-validated/10 text-foreground";
      case "pending":
        return "border-status-pending/30 bg-status-pending/10 text-foreground";
      case "missed":
        return "border-destructive/30 bg-destructive/10 text-foreground";
      default:
        return "border-border bg-secondary text-foreground";
    }
  };

  const getSessionFlags = (session: Session) => {
    const flags: string[] = [];
    if ((session.patient_total_sessions ?? 0) <= 1) flags.push("Novo");
    else flags.push("Retorno");
    if (session.status === "pending") flags.push("Pendente");
    return flags;
  };

  return (
    <>
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-10 rounded-[2rem] border border-border/80 bg-card px-7 py-8 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.22)] md:px-10 md:py-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">ETHOS Web</p>
              <h1 className="text-[2.35rem] font-semibold tracking-[-0.05em] text-foreground md:text-[3.2rem]">Agenda clínica</h1>
              <p className="mt-4 max-w-2xl text-[1.02rem] leading-7 text-muted-foreground">Configure sua semana e visualize apenas os dias e horários reais de atendimento.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings2 className="w-4 h-4" strokeWidth={1.5} />
                    Configurar agenda
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl">Configurar agenda</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Início do expediente</label>
                        <select
                          value={agendaSettings.startHour}
                          onChange={(event) => setAgendaSettings((current) => ({ ...current, startHour: Number(event.target.value) }))}
                          className="flex h-11 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                        >
                          {Array.from({ length: 24 }, (_, hour) => (
                            <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Fim do expediente</label>
                        <select
                          value={agendaSettings.endHour}
                          onChange={(event) => setAgendaSettings((current) => ({ ...current, endHour: Number(event.target.value) }))}
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
                          const selected = agendaSettings.enabledWeekdays.includes(day.id);
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
                  <DialogFooter>
                    <Button onClick={handleSaveAgendaSettings}>Salvar configuração</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="secondary" className="gap-2" onClick={() => setSessionDialogOpen(true)}>
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Agendar sessão
              </Button>
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

        <motion.div className="mb-6 flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
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

          <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-status-validated"></span>Confirmada</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-status-pending"></span>Pendente</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-destructive"></span>Faltou</span>
          </div>
        </motion.div>

        {error ? <IntegrationUnavailable message={error.message} requestId={error.requestId} /> : null}
        {loading ? <AgendaGridSkeleton /> : null}

        {!loading && !error ? (
          <motion.div className="flex flex-col xl:flex-row gap-4 items-start" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <div className="flex-1 min-w-0 overflow-x-auto rounded-[2rem] border border-border bg-card shadow-[0_24px_52px_-34px_rgba(15,23,42,0.28)]">
            <div className="grid" style={{ gridTemplateColumns: `88px repeat(${visibleWeekDays.length}, minmax(140px, 1fr))` }}>
              <div className="border-b border-r border-border bg-muted/30 p-4" />
              {visibleWeekDays.map((day) => (
                <div key={day.key} className={cn("border-b border-border p-4", day.isToday && "bg-primary/5")}>
                  <p className={cn("text-xs uppercase tracking-[0.18em] text-muted-foreground", day.isToday && "text-primary")}>
                    {day.long}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-serif text-2xl text-foreground">{formatDayNumber(day.date)}</span>
                    {day.isToday ? <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">Hoje</span> : null}
                  </div>
                </div>
              ))}

              {timeSlots.map((slot) => (
                <div key={slot} className="contents">
                  <div className="border-r border-border bg-muted/20 px-3 py-4 text-right">
                    <span className="text-xs font-medium text-muted-foreground">{slot}</span>
                  </div>
                  {visibleWeekDays.map((day) => {
                    const cellKey = `${day.key}-${slot}`;
                    const daySessions = sessionsByCell.get(cellKey) ?? [];
                    return (
                      <div
                        key={cellKey}
                        className={cn("min-h-[110px] border-t border-border/70 p-2", day.isToday && "bg-primary/5")}
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
                            className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-border/70 text-[11px] text-muted-foreground/60 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary/60 min-h-[86px]"
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
                                    "w-full rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft",
                                    getStatusColor(session.status),
                                    draggingSessionId === session.id && "opacity-60",
                                    session.event_type === "block" && "border-dashed opacity-80",
                                  )}
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                      <Clock3 className="h-3.5 w-3.5" />
                                      {session.time}
                                    </span>
                                    <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
                                      {session.status === "pending" ? "Pendente" : session.status === "confirmed" ? "Confirmada" : session.status === "completed" ? "Concluída" : "Faltou"}
                                    </span>
                                  </div>

                                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{session.block_title ?? session.patient_name}</p>
                                  {session.recurrence && (
                                    <span className="text-xs opacity-60">
                                      🔁 {session.recurrence.type === "weekly" ? "semanal" : session.recurrence.type === "biweekly" ? "quinzenal" : "2×sem"}
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

                                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <UserRound className="h-3.5 w-3.5" />
                                    {session.duration ? `${session.duration} min` : "Sessão"}
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

          {suggestions.filter((s) => !dismissedSuggestions.has(`${s.patient_id}-${s.suggested_at}`)).length > 0 && (
            <div className="w-full xl:w-60 xl:shrink-0 space-y-3 xl:border-l xl:pl-4 xl:pt-2 border-t xl:border-t-0 pt-4 xl:pt-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Próxima semana</span>
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {suggestions.filter((s) => !dismissedSuggestions.has(`${s.patient_id}-${s.suggested_at}`)).length}
                </span>
              </div>

              {suggestions
                .filter((s) => !dismissedSuggestions.has(`${s.patient_id}-${s.suggested_at}`))
                .map((s) => (
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
                        <p className="font-medium leading-tight">{s.patient_name}</p>
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
                ))}
            </div>
          )}
          </motion.div>
        ) : null}
      </div>
    </div>

    <SessionDialog
      open={sessionDialogOpen}
      onOpenChange={(v) => { setSessionDialogOpen(v); if (!v) setSessionDialogDefaults({}); }}
      patients={sessions
        .filter((s, i, arr) => arr.findIndex((x) => x.patient_id === s.patient_id) === i)
        .map((s) => ({ id: s.patient_id, name: s.patient_name }))}
      defaultDate={sessionDialogDefaults.date}
      defaultTime={sessionDialogDefaults.time}
      onCreated={async () => {
        const result = await sessionService.list(weekWindow);
        if (result.success) setSessions(result.data);
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
            const token = readStoredAuthUser()?.token;
            await fetch(`${CLINICAL_BASE_URL}/financial/entry`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                patient_id: billingDialog.patientId,
                type: "receivable",
                amount: billingDialog.suggestedAmount,
                due_date: billingDialog.suggestedDueDate,
                status: "open",
                description: "Sessão clínica",
              }),
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
