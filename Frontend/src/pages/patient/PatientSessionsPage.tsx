import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock3, Calendar as CalendarIcon, List, ExternalLink, CalendarPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { patientPortalService, type PatientSession, type PatientTask as ApiPatientTask } from "@/services/patientPortalService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { cn } from "@/lib/utils";
import { generateGoogleLink, generateOutlookLink, downloadICal } from "@/lib/calendarUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deletePatientTask, readPatientTasks, type PatientTask, upsertPatientTask, writePatientTasks } from "@/pages/agendaStorage";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const isoDate = (iso: string) => iso.slice(0, 10);
const PROFESSIONAL_FALLBACK = "Profissional não informado";
const getProfessionalName = (session: PatientSession) =>
  session.provider_name ?? session.psychologist_name ?? PROFESSIONAL_FALLBACK;

const sessionStatusLabel = (status: string) => {
  switch (status) {
    case "confirmed": return "Confirmada";
    case "completed": return "Concluída";
    case "missed": return "Faltou";
    case "pending":
    case "scheduled": return "Agendada";
    case "cancelled_with_notice": return "Cancelado c/ aviso";
    case "cancelled_no_show": return "Cancelado s/ aviso";
    case "rescheduled_by_patient": return "Remarcado";
    case "rescheduled_by_psychologist": return "Remarcado p/ psicólogo";
    default: return "Sessão";
  }
};

const sessionColor = (status: string) => {
  switch (status) {
    case "confirmed": return "bg-emerald-500";
    case "completed": return "bg-blue-400";
    case "missed":
    case "cancelled_no_show": return "bg-red-400";
    case "cancelled_with_notice": return "bg-orange-400";
    case "rescheduled_by_patient":
    case "rescheduled_by_psychologist": return "bg-sky-400";
    default: return "bg-primary";
  }
};

export default function PatientSessionsPage() {
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [agendaView, setAgendaView] = useState<"sessions" | "tasks" | "all">("all");

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    const load = async () => {
      const res = await patientPortalService.getSessions();
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setSessions(res.data);
        // Auto-open nearest upcoming session day
        const upcoming = res.data.filter((s) => s.scheduled_at && new Date(s.scheduled_at) >= today);
        if (upcoming.length > 0) {
          const nearest = upcoming.sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))[0];
          if (nearest.scheduled_at) {
            const d = new Date(nearest.scheduled_at);
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
            setSelectedDay(isoDate(nearest.scheduled_at));
          }
        }
      }
      setLoading(false);
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTasks(readPatientTasks());
    const sync = async () => {
      const res = await patientPortalService.getTasks();
      if (res.success && res.data.length > 0) {
        const normalized: PatientTask[] = res.data.map((t: ApiPatientTask) => ({
          id: t.id,
          title: t.title,
          date: t.date,
          time: t.time,
          completed: t.completed,
          createdAt: t.created_at ?? new Date().toISOString(),
          updatedAt: t.updated_at ?? new Date().toISOString(),
        }));
        writePatientTasks(normalized);
        setTasks(normalized);
      }
    };
    void sync();
  }, []);

  const saveTask = async (task: Omit<PatientTask, "createdAt" | "updatedAt">) => {
    const saved = upsertPatientTask(task);
    setTasks(readPatientTasks());
    const remotePayload = { title: saved.title, date: saved.date, time: saved.time, completed: saved.completed };
    const remote = await patientPortalService.updateTask(saved.id, remotePayload);
    if (!remote.success && remote.status === 404) await patientPortalService.createTask(remotePayload);
  };

  const handleConfirm = async (sessionId: string) => {
    const res = await patientPortalService.confirmSession(sessionId);
    if (res.success) {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, confirmed: true, status: "confirmed" } : s)),
      );
    }
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando sessões...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="mb-6 font-serif text-3xl font-medium text-foreground">Sessões</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  // Build session map: date string → sessions[]
  const sessionsByDate = new Map<string, PatientSession[]>();
  for (const s of sessions) {
    if (!s.scheduled_at) continue;
    const key = isoDate(s.scheduled_at);
    sessionsByDate.set(key, [...(sessionsByDate.get(key) ?? []), s]);
  }

  // Calendar math
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = isoDate(today.toISOString());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectedSessions = selectedDay ? (sessionsByDate.get(selectedDay) ?? []) : [];
  const tasksByDate = new Map<string, PatientTask[]>();
  for (const task of tasks) tasksByDate.set(task.date, [...(tasksByDate.get(task.date) ?? []), task]);
  const selectedTasks = selectedDay ? (tasksByDate.get(selectedDay) ?? []) : [];

  const upcoming = sessions.filter((s) => s.scheduled_at && new Date(s.scheduled_at) >= today);

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Sessões</h1>
            <p className="mt-2 text-muted-foreground">Visualize e confirme seus atendimentos.</p>
          </div>
          
          <div className="flex items-center rounded-2xl bg-muted/40 p-1 border border-border/50">
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all",
                viewMode === "calendar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Calendário
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all",
                viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
          </div>
        </motion.header>

        {viewMode === "calendar" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Calendar */}
            <motion.div
              className="rounded-[32px] border border-border bg-card p-8 shadow-[0_18px_48px_rgba(0,0,0,0.05)]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Month nav */}
              <div className="mb-8 flex items-center justify-between">
                <button onClick={prevMonth} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background hover:bg-muted transition-all active:scale-95 shadow-sm">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="font-serif text-2xl font-medium text-foreground">
                  {MONTHS[viewMonth]} {viewYear}
                </h2>
                <button onClick={nextMonth} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background hover:bg-muted transition-all active:scale-95 shadow-sm">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 grid grid-cols-7 text-center">
                {WEEKDAYS.map((d) => (
                  <p key={d} className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground py-2">{d}</p>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="h-16 md:h-24" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const daySessions = sessionsByDate.get(dateStr) ?? [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDay;
                  const dayTasks = tasksByDate.get(dateStr) ?? [];
                  const hasSessions = daySessions.length > 0;
                  const hasTasks = dayTasks.length > 0;
                  const shouldShowSessions = agendaView === "sessions" || agendaView === "all";
                  const shouldShowTasks = agendaView === "tasks" || agendaView === "all";
                  const hasItems = (shouldShowSessions && hasSessions) || (shouldShowTasks && hasTasks);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                      className={cn(
                        "relative flex h-16 md:h-24 flex-col items-center rounded-2xl p-2 text-sm transition-all group",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105 z-10"
                          : isToday
                            ? "bg-primary/5 text-primary border border-primary/20 font-bold"
                            : hasItems
                              ? "bg-muted/40 text-foreground hover:bg-muted/60 border border-border/50"
                              : "text-foreground/60 hover:bg-muted/30 border border-transparent hover:border-border/50",
                      )}
                    >
                      <span className="text-sm md:text-base font-semibold">{day}</span>
                      {hasItems && (
                        <div className="mt-auto flex flex-col gap-1 w-full overflow-hidden">
                          {shouldShowSessions && daySessions.slice(0, 1).map((s) => (
                            <div
                              key={s.id}
                              className={cn(
                                "hidden md:block h-1.5 w-full rounded-full opacity-60",
                                isSelected ? "bg-primary-foreground" : sessionColor(s.status),
                              )}
                            />
                          ))}
                          {shouldShowTasks && dayTasks.slice(0, 1).map((t) => (
                            <div key={t.id} className={cn("hidden md:block h-1.5 w-full rounded-full opacity-80", isSelected ? "bg-primary-foreground" : t.completed ? "bg-emerald-300" : "bg-violet-400")} />
                          ))}
                          <div className={cn(
                            "flex justify-center md:hidden gap-0.5",
                          )}>
                            {shouldShowSessions && daySessions.map((s) => (
                              <span key={s.id} className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-primary-foreground" : sessionColor(s.status))} />
                            ))}
                            {shouldShowTasks && dayTasks.map((t) => (
                              <span key={t.id} className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-primary-foreground" : t.completed ? "bg-emerald-300" : "bg-violet-400")} />
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-wrap gap-6 border-t border-border pt-6">
                <div className="flex items-center rounded-xl border border-border bg-background p-1">
                  {[
                    { key: "sessions", label: "Sessões" },
                    { key: "tasks", label: "Tarefas" },
                    { key: "all", label: "Tudo" },
                  ].map((item) => (
                    <button key={item.key} onClick={() => setAgendaView(item.key as typeof agendaView)} className={cn("px-3 py-1 text-xs rounded-lg", agendaView === item.key ? "bg-muted text-foreground" : "text-muted-foreground")}>{item.label}</button>
                  ))}
                </div>
                {[
                  { color: "bg-primary", label: "Agendada" },
                  { color: "bg-emerald-500", label: "Confirmada" },
                  { color: "bg-blue-400", label: "Concluída" },
                  { color: "bg-red-400", label: "Faltou" },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className={cn("h-3 w-3 rounded-full", color)} />
                    {label}
                  </span>
                ))}
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="h-3 w-3 rounded-full bg-violet-400" />
                  Tarefa
                </span>
              </div>
            </motion.div>

            {/* Side panel */}
            <motion.div className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              {selectedDay ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-medium text-foreground">
                      {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!selectedDay) return;
                        const title = window.prompt("Título da tarefa:");
                        if (!title) return;
                        const time = window.prompt("Horário (opcional, HH:MM):") ?? "";
                        void saveTask({
                          id: crypto.randomUUID(),
                          title,
                          date: selectedDay,
                          time: time || undefined,
                          completed: false,
                        });
                      }}
                    >
                      Nova tarefa
                    </Button>
                  </div>
                  {selectedSessions.length === 0 && selectedTasks.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-border py-12 text-center bg-muted/20">
                      <p className="text-sm text-muted-foreground">Nenhum item neste dia.</p>
                    </div>
                  ) : (
                    <>
                    {selectedSessions.map((s) => (
                      <div key={s.id} className="rounded-[28px] border border-border bg-card p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Clock3 className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="block text-lg font-semibold text-foreground">
                              {s.scheduled_at ? formatTime(s.scheduled_at) : s.time}
                            </span>
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              s.status === "confirmed" || s.confirmed ? "bg-emerald-100 text-emerald-700"
                                : s.status === "completed" ? "bg-blue-100 text-blue-700"
                                : s.status === "missed" ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700",
                            )}>
                              {sessionStatusLabel(s.status)}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {getProfessionalName(s)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 pt-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl">
                                <CalendarPlus className="h-4 w-4" />
                                Exportar para Agenda
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] rounded-xl">
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(generateGoogleLink(s), "_blank")}>
                                <ExternalLink className="h-3.5 w-3.5" /> Google Agenda
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(generateOutlookLink(s), "_blank")}>
                                <ExternalLink className="h-3.5 w-3.5" /> Outlook (Web)
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => downloadICal(s)}>
                                <Download className="h-3.5 w-3.5" /> Baixar iCal (.ics)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {!s.confirmed && s.status !== "completed" && s.status !== "missed" && (
                            <Button className="w-full rounded-xl" onClick={() => void handleConfirm(s.id)}>
                              Confirmar Presença
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedTasks.map((task) => (
                      <div key={task.id} className="rounded-[24px] border border-border bg-card p-5 space-y-3">
                        <p className="font-semibold">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.time ? `Horário: ${task.time}` : "Sem horário definido"}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => void saveTask({ ...task, completed: !task.completed })}>{task.completed ? "Reabrir" : "Concluir tarefa"}</Button>
                          <Button variant="ghost" size="sm" onClick={() => { deletePatientTask(task.id); setTasks(readPatientTasks()); void patientPortalService.deleteTask(task.id); }}>Excluir</Button>
                        </div>
                      </div>
                    ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  <h3 className="font-serif text-xl font-medium text-foreground">Próximas sessões</h3>
                  {upcoming.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-border bg-background/50 py-12 text-center">
                      <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
                    </div>
                  ) : (
                    upcoming
                      .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
                      .slice(0, 4)
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            if (s.scheduled_at) {
                              const d = new Date(s.scheduled_at);
                              setViewYear(d.getFullYear());
                              setViewMonth(d.getMonth());
                              setSelectedDay(isoDate(s.scheduled_at));
                            }
                          }}
                          className="w-full group rounded-[28px] border border-border bg-card px-5 py-4 text-left shadow-sm hover:shadow-md hover:bg-muted/30 transition-all active:scale-[0.98]"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-base font-semibold text-foreground">
                              {s.scheduled_at
                                ? new Date(s.scheduled_at).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
                                : s.date}
                            </p>
                            <span className={cn(
                              "h-2.5 w-2.5 rounded-full ring-4 ring-background",
                              sessionColor(s.status)
                            )} />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {s.scheduled_at ? formatTime(s.scheduled_at) : s.time} · {sessionStatusLabel(s.status)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getProfessionalName(s)}
                          </p>
                        </button>
                      ))
                  )}
                </>
              )}
            </motion.div>
          </div>
        ) : (
          <motion.div
            className="space-y-4 max-w-3xl mx-auto"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {sessions.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-border py-24 text-center">
                <p className="text-muted-foreground">Nenhum atendimento encontrado.</p>
              </div>
            ) : (
              sessions
                .sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""))
                .map((s) => (
                  <div key={s.id} className="rounded-[24px] border border-border bg-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white", sessionColor(s.status))}>
                        <CalendarIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-foreground capitalize">
                          {s.scheduled_at
                            ? new Date(s.scheduled_at).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                            : s.date}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {s.scheduled_at ? formatTime(s.scheduled_at) : s.time} · {sessionStatusLabel(s.status)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getProfessionalName(s)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="rounded-xl gap-2">
                            <CalendarPlus className="h-4 w-4" /> Exportar
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => window.open(generateGoogleLink(s), "_blank")}>Google Agenda</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(generateOutlookLink(s), "_blank")}>Outlook</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadICal(s)}>Baixar .ics</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {!s.confirmed && s.status !== "completed" && s.status !== "missed" && (
                        <Button size="sm" className="rounded-xl" onClick={() => void handleConfirm(s.id)}>Confirmar</Button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
