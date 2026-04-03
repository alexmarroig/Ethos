import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
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

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

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

const AgendaPage = ({ onSessionClick }: AgendaPageProps) => {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDuration, setNewDuration] = useState("50");

  const weekWindow = useMemo(() => {
    const start = getStartOfWeek(new Date(), currentWeek);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: formatDate(start), to: formatDate(end) };
  }, [currentWeek]);

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
    const scheduledAt = new Date(`${newDate}T${newTime}:00`).toISOString();
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

    setSessions((prev) => [...prev, result.data].sort((left, right) => {
      const leftValue = left.scheduled_at ?? `${left.date}T${left.time}:00`;
      const rightValue = right.scheduled_at ?? `${right.date}T${right.time}:00`;
      return leftValue.localeCompare(rightValue);
    }));
    setDialogOpen(false);
    setNewPatientId("");
    setNewDate("");
    setNewTime("");
    setNewDuration("50");
    toast({
      title: "Sessao agendada",
      description: `Sessao marcada para ${new Date(scheduledAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}.`,
    });
    setCreating(false);
  };

  const getWeekLabel = () => {
    if (currentWeek === 0) return "Esta semana";
    if (currentWeek === 1) return "Proxima semana";
    if (currentWeek === -1) return "Semana passada";
    return `Semana ${currentWeek > 0 ? "+" : ""}${currentWeek}`;
  };

  const getStatusColor = (status: Session["status"]) => {
    switch (status) {
      case "completed":
      case "confirmed":
        return "bg-status-validated/10 border-status-validated/30 text-foreground";
      case "pending":
        return "bg-status-pending/10 border-status-pending/30 text-foreground";
      case "missed":
        return "bg-destructive/10 border-destructive/30 text-foreground";
      default:
        return "bg-secondary text-foreground";
    }
  };

  const sessionsByDay: Record<string, Session[]> = { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [], Sab: [], Dom: [] };
  for (const session of sessions) {
    const value = session.scheduled_at ? new Date(session.scheduled_at) : new Date(`${session.date}T${session.time}:00`);
    const dayName = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][value.getDay()];
    if (sessionsByDay[dayName]) {
      sessionsByDay[dayName].push(session);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Agenda clinica</h1>
          <p className="mt-2 text-muted-foreground">Visao semanal.</p>
        </motion.header>

        <motion.div className="flex items-center justify-between mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentWeek((value) => value - 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
            <span className="text-sm font-medium text-foreground min-w-[120px] text-center">{getWeekLabel()}</span>
            <button onClick={() => setCurrentWeek((value) => value + 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200">
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Agendar sessao
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Agendar sessao</DialogTitle>
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
                <Input
                  type="number"
                  min="20"
                  step="10"
                  value={newDuration}
                  onChange={(event) => setNewDuration(event.target.value)}
                  placeholder="Duracao em minutos"
                />
                {patients.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Cadastre um paciente primeiro na aba Pacientes.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateSession}
                  disabled={creating || patients.length === 0 || !newPatientId || !newDate || !newTime}
                  className="gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Agendar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {error && <IntegrationUnavailable message={error.message} requestId={error.requestId} />}
        {loading && <AgendaGridSkeleton />}

        {!loading && !error && (
          <motion.div className="border border-border rounded-xl overflow-hidden bg-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="grid grid-cols-5 border-b border-border">
              {weekDays.map((day, index) => (
                <div key={day} className={cn("py-4 text-center text-sm font-medium text-muted-foreground", index < weekDays.length - 1 && "border-r border-border")}>
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 min-h-[400px]">
              {weekDays.map((day, dayIndex) => (
                <div key={day} className={cn("p-2 md:p-3 space-y-2", dayIndex < weekDays.length - 1 && "border-r border-border")}>
                  {sessionsByDay[day]?.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => onSessionClick(session.id)}
                      className={cn("w-full p-2 md:p-3 rounded-lg border text-left transition-all duration-200", "hover:shadow-soft hover:-translate-y-0.5 active:translate-y-0", getStatusColor(session.status))}
                    >
                      <p className="text-xs text-muted-foreground mb-1">{session.time}</p>
                      <p className="text-sm font-medium truncate">{session.patient_name}</p>
                    </button>
                  ))}
                  {(!sessionsByDay[day] || sessionsByDay[day].length === 0) && (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-muted-foreground/50">-</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AgendaPage;
