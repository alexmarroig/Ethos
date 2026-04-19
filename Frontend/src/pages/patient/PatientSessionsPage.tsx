import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { patientPortalService, type PatientSession } from "@/services/patientPortalService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const isoDate = (iso: string) => iso.slice(0, 10);

const sessionStatusLabel = (status: string) => {
  switch (status) {
    case "confirmed": return "Confirmada";
    case "completed": return "Concluída";
    case "missed": return "Faltou";
    case "pending":
    case "scheduled": return "Agendada";
    default: return "Sessão";
  }
};

const sessionColor = (status: string) => {
  switch (status) {
    case "confirmed": return "bg-emerald-500";
    case "completed": return "bg-blue-400";
    case "missed": return "bg-red-400";
    default: return "bg-primary";
  }
};

export default function PatientSessionsPage() {
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  const upcoming = sessions.filter((s) => s.scheduled_at && new Date(s.scheduled_at) >= today);

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Sessões</h1>
          <p className="mt-2 text-muted-foreground">Visualize e confirme seus atendimentos.</p>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Calendar */}
          <motion.div
            className="rounded-[28px] border border-border bg-card p-6 shadow-[0_18px_40px_rgba(23,49,58,0.07)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Month nav */}
            <div className="mb-6 flex items-center justify-between">
              <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="font-serif text-xl font-medium text-foreground">
                {MONTHS[viewMonth]} {viewYear}
              </h2>
              <button onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="mb-2 grid grid-cols-7 text-center">
              {WEEKDAYS.map((d) => (
                <p key={d} className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground py-1">{d}</p>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const daySessions = sessionsByDate.get(dateStr) ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDay;
                const hasSessions = daySessions.length > 0;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={cn(
                      "relative flex flex-col items-center rounded-xl py-2 text-sm transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : isToday
                          ? "bg-primary/10 text-primary font-semibold"
                          : hasSessions
                            ? "bg-muted/60 text-foreground hover:bg-muted"
                            : "text-foreground/70 hover:bg-muted/40",
                    )}
                  >
                    {day}
                    {hasSessions && (
                      <span className={cn(
                        "mt-0.5 flex gap-0.5",
                      )}>
                        {daySessions.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isSelected ? "bg-primary-foreground/80" : sessionColor(s.status),
                            )}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4">
              {[
                { color: "bg-primary", label: "Agendada" },
                { color: "bg-emerald-500", label: "Confirmada" },
                { color: "bg-blue-400", label: "Concluída" },
                { color: "bg-red-400", label: "Faltou" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Side panel */}
          <motion.div className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {selectedDay ? (
              <>
                <h3 className="font-serif text-lg font-medium text-foreground">
                  {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                {selectedSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma sessão neste dia.</p>
                ) : (
                  selectedSessions.map((s) => (
                    <div key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {s.scheduled_at ? formatTime(s.scheduled_at) : s.time}
                        </span>
                        <span className={cn(
                          "ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium",
                          s.status === "confirmed" || s.confirmed ? "bg-emerald-100 text-emerald-700"
                            : s.status === "completed" ? "bg-blue-100 text-blue-700"
                            : s.status === "missed" ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700",
                        )}>
                          {sessionStatusLabel(s.status)}
                        </span>
                      </div>
                      {s.confirmed && (
                        <p className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Presença confirmada
                        </p>
                      )}
                      {!s.confirmed && s.status !== "completed" && s.status !== "missed" && (
                        <Button size="sm" className="w-full mt-1" onClick={() => void handleConfirm(s.id)}>
                          Confirmar presença
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </>
            ) : (
              <>
                <h3 className="font-serif text-lg font-medium text-foreground">Próximas sessões</h3>
                {upcoming.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-background/70 py-8 text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
                  </div>
                ) : (
                  upcoming
                    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
                    .slice(0, 5)
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
                        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm hover:bg-muted/50 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {s.scheduled_at
                            ? new Date(s.scheduled_at).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
                            : s.date}
                          {" · "}
                          {s.scheduled_at ? formatTime(s.scheduled_at) : s.time}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{sessionStatusLabel(s.status)}</p>
                      </button>
                    ))
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
