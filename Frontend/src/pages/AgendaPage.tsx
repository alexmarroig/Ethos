import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Loader2, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sessionService, type Session } from "@/services/sessionService";
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

const weekDays = [
  { short: "Seg", long: "Segunda" },
  { short: "Ter", long: "Terça" },
  { short: "Qua", long: "Quarta" },
  { short: "Qui", long: "Quinta" },
  { short: "Sex", long: "Sexta" },
  { short: "Sáb", long: "Sábado" },
  { short: "Dom", long: "Domingo" },
];

const timeSlots = Array.from({ length: 12 }, (_, index) => {
  const hour = 8 + index;
  return `${String(hour).padStart(2, "0")}:00`;
});

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [draggingSessionId, setDraggingSessionId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDuration, setNewDuration] = useState("50");

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
    [weekStart]
  );

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

  const sessionsByCell = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const day of weekDaysWithDate) {
      for (const slot of timeSlots) {
        map.set(`${day.key}-${slot}`, []);
      }
    }

    for (const session of sessions) {
      const dateKey = session.date || (session.scheduled_at ? formatDate(new Date(session.scheduled_at)) : "");
      const timeKey = session.time || "00:00";
      const slotKey = `${dateKey}-${timeKey}`;
      if (!map.has(slotKey)) map.set(slotKey, []);
      map.get(slotKey)?.push(session);
    }

    return map;
  }, [sessions, weekDaysWithDate]);

  const agendaSummary = useMemo(() => {
    const total = sessions.length;
    const confirmed = sessions.filter((session) => session.status === "confirmed" || session.status === "completed").length;
    const pending = sessions.filter((session) => session.status === "pending").length;
    const newPatients = sessions.filter((session) => (session.patient_total_sessions ?? 0) <= 1).length;
    return { total, confirmed, pending, newPatients };
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
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Agenda clínica</h1>
              <p className="mt-2 text-muted-foreground">Grade horária semanal para planejar e remanejar atendimentos com clareza.</p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Agendar sessão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Agendar sessão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Paciente</label>
                    <select
                      value={newPatientId}
                      onChange={(event) => setNewPatientId(event.target.value)}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Selecione um paciente</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
                  <Input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} />
                  <Input type="number" min="20" step="10" value={newDuration} onChange={(event) => setNewDuration(event.target.value)} placeholder="Duração em minutos" />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateSession} disabled={creating || !newPatientId || !newDate || !newTime} className="gap-2">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Agendar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.header>

        <motion.div className="mb-8 grid gap-4 md:grid-cols-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="session-card">
            <p className="text-sm text-muted-foreground">Semana</p>
            <p className="mt-2 font-serif text-2xl text-foreground">{getWeekLabel()}</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatWeekRange(weekStart)}</p>
          </div>
          <div className="session-card">
            <p className="text-sm text-muted-foreground">Sessões</p>
            <p className="mt-2 font-serif text-2xl text-foreground">{agendaSummary.total}</p>
          </div>
          <div className="session-card">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="mt-2 font-serif text-2xl text-foreground">{agendaSummary.pending}</p>
          </div>
          <div className="session-card">
            <p className="text-sm text-muted-foreground">Pacientes novos</p>
            <p className="mt-2 font-serif text-2xl text-foreground">{agendaSummary.newPatients}</p>
          </div>
        </motion.div>

        <motion.div className="flex items-center justify-between mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-subtle">
            <button onClick={() => setCurrentWeek((value) => value - 1)} className="p-2 rounded-xl hover:bg-secondary transition-colors duration-200">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
            <div className="min-w-[220px] text-center">
              <p className="text-sm font-medium text-foreground">{getWeekLabel()}</p>
              <p className="text-xs text-muted-foreground">{formatWeekRange(weekStart)}</p>
            </div>
            <button onClick={() => setCurrentWeek((value) => value + 1)} className="p-2 rounded-xl hover:bg-secondary transition-colors duration-200">
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-status-validated"></span>Confirmada</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-status-pending"></span>Pendente</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-destructive"></span>Faltou</span>
          </div>
        </motion.div>

        {error ? <IntegrationUnavailable message={error.message} requestId={error.requestId} /> : null}
        {loading ? <AgendaGridSkeleton /> : null}

        {!loading && !error ? (
          <motion.div className="rounded-[28px] border border-border bg-card shadow-soft overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <div className="grid" style={{ gridTemplateColumns: "88px repeat(7, minmax(160px, 1fr))" }}>
              <div className="border-b border-r border-border bg-muted/30 p-4" />
              {weekDaysWithDate.map((day) => (
                <div
                  key={day.key}
                  className={cn("border-b border-border p-4", day.isToday && "bg-primary/5")}
                >
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
                <>
                  <div key={`label-${slot}`} className="border-r border-border bg-muted/20 px-3 py-4 text-right">
                    <span className="text-xs font-medium text-muted-foreground">{slot}</span>
                  </div>
                  {weekDaysWithDate.map((day) => {
                    const cellKey = `${day.key}-${slot}`;
                    const daySessions = sessionsByCell.get(cellKey) ?? [];
                    return (
                      <div
                        key={cellKey}
                        className={cn(
                          "min-h-[110px] border-t border-border/70 p-2",
                          day.isToday && "bg-primary/5"
                        )}
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
                          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/70 text-[11px] text-muted-foreground/60">
                            Livre
                          </div>
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
                                    draggingSessionId === session.id && "opacity-60"
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

                                  <p className="text-sm font-semibold text-foreground line-clamp-2">{session.patient_name}</p>

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
                                            : "bg-status-pending/15 text-status-pending"
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
                </>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default AgendaPage;
