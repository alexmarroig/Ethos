import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sessionService, Session } from "@/services/sessionService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import WhatsAppButton from "@/components/WhatsAppButton";
import { AgendaGridSkeleton } from "@/components/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

interface AgendaPageProps {
  onSessionClick: (sessionId: number) => void;
}

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex"];

const AgendaPage = ({ onSessionClick }: AgendaPageProps) => {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  // Create session dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      startOfWeek.setDate(startOfWeek.getDate() + diff + currentWeek * 7);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 4);
      const from = startOfWeek.toISOString().split("T")[0];
      const to = endOfWeek.toISOString().split("T")[0];
      const res = await sessionService.list({ from, to });
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setSessions(res.data);
        setError(null);
      }
      setLoading(false);
    };
    load();
  }, [currentWeek]);

  const handleCreateSession = async () => {
    if (!newPatientId.trim() || !newDate || !newTime) return;
    setCreating(true);
    const res = await sessionService.create({
      patient_id: newPatientId,
      date: newDate,
      time: newTime,
      status: "pending",
    } as any);
    if (res.success) {
      setSessions((prev) => [...prev, res.data]);
      setDialogOpen(false);
      setNewPatientId(""); setNewDate(""); setNewTime("");
      toast({ title: "Sessão agendada" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const getWeekLabel = () => {
    if (currentWeek === 0) return "Esta semana";
    if (currentWeek === 1) return "Próxima semana";
    if (currentWeek === -1) return "Semana passada";
    return `Semana ${currentWeek > 0 ? "+" : ""}${currentWeek}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-status-validated/10 border-status-validated/30 text-foreground";
      case "confirmed": return "bg-status-validated/10 border-status-validated/30 text-foreground";
      case "pending": return "bg-status-pending/10 border-status-pending/30 text-foreground";
      case "missed": return "bg-destructive/10 border-destructive/30 text-foreground";
      default: return "bg-secondary text-foreground";
    }
  };

  const sessionsByDay: Record<string, Session[]> = { Seg: [], Ter: [], Qua: [], Qui: [], Sex: [] };
  sessions.forEach((s) => {
    const d = new Date(s.date);
    const dayIdx = d.getDay();
    const dayName = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dayIdx];
    if (sessionsByDay[dayName]) sessionsByDay[dayName].push(s);
  });

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Agenda clínica</h1>
          <p className="mt-2 text-muted-foreground">Visão semanal</p>
        </motion.header>

        <motion.div className="flex items-center justify-between mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentWeek((w) => w - 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
            <span className="text-sm font-medium text-foreground min-w-[120px] text-center">{getWeekLabel()}</span>
            <button onClick={() => setCurrentWeek((w) => w + 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200">
              <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
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
                <Input placeholder="ID do paciente" value={newPatientId} onChange={(e) => setNewPatientId(e.target.value)} />
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={handleCreateSession} disabled={creating || !newPatientId.trim() || !newDate || !newTime} className="gap-2">
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
                <div key={day} className={cn("py-4 text-center text-sm font-medium text-muted-foreground", index < weekDays.length - 1 && "border-r border-border")}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-5 min-h-[400px]">
              {weekDays.map((day, dayIndex) => (
                <div key={day} className={cn("p-2 md:p-3 space-y-2", dayIndex < weekDays.length - 1 && "border-r border-border")}>
                  {sessionsByDay[day]?.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => onSessionClick(Number(session.id))}
                      className={cn("w-full p-2 md:p-3 rounded-lg border text-left transition-all duration-200", "hover:shadow-soft hover:-translate-y-0.5 active:translate-y-0", getStatusColor(session.status))}
                    >
                      <p className="text-xs text-muted-foreground mb-1">{session.time}</p>
                      <p className="text-sm font-medium truncate">{session.patient_name}</p>
                    </button>
                  ))}
                  {(!sessionsByDay[day] || sessionsByDay[day].length === 0) && (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-muted-foreground/50">—</p>
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
