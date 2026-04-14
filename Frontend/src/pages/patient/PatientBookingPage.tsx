import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { patientPortalService, type AvailableSlot, type SlotRequest } from "@/services/patientPortalService";
import { useToast } from "@/hooks/use-toast";

const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const toISODate = (date: Date) => date.toISOString().split("T")[0];

const formatDateHeader = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

const statusBadge = (status: SlotRequest["status"]) => {
  switch (status) {
    case "pending": return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Aguardando</span>;
    case "confirmed": return <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" />Confirmado</span>;
    case "rejected": return <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Recusado</span>;
  }
};

const PatientBookingPage = () => {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    return d;
  });
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [myRequests, setMyRequests] = useState<SlotRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<AvailableSlot | null>(null);

  const weekEnd = addDays(weekStart, 6);

  const loadSlots = async (start: Date) => {
    setLoading(true);
    const end = addDays(start, 6);
    const [slotsRes, reqRes] = await Promise.all([
      patientPortalService.getAvailableSlots(toISODate(start), toISODate(end)),
      patientPortalService.getSlotRequests(),
    ]);
    if (slotsRes.success) setSlots(slotsRes.data);
    if (reqRes.success) setMyRequests(reqRes.data);
    setLoading(false);
  };

  useEffect(() => {
    void loadSlots(weekStart);
  }, [weekStart]);

  const goBack = () => setWeekStart((d) => addDays(d, -7));
  const goNext = () => setWeekStart((d) => addDays(d, 7));

  const handleRequest = async (slot: AvailableSlot) => {
    setRequesting(`${slot.date}-${slot.time}`);
    const res = await patientPortalService.requestSlot({ date: slot.date, time: slot.time, duration: slot.duration });
    setRequesting(null);
    setConfirm(null);
    if (res.success) {
      setMyRequests((prev) => [res.data, ...prev]);
      setSlots((prev) => prev.filter((s) => !(s.date === slot.date && s.time === slot.time)));
      toast({ title: "Solicitação enviada!", description: "Seu psicólogo receberá a solicitação e confirmará em breve." });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  // Group slots by date
  const slotsByDate: Record<string, AvailableSlot[]> = {};
  for (let i = 0; i < 7; i++) {
    const date = toISODate(addDays(weekStart, i));
    slotsByDate[date] = slots.filter((s) => s.date === date);
  }

  const weekDates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));
  const hasAnySlot = slots.length > 0;

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Agendar sessão</h1>
          <p className="mt-2 text-muted-foreground">Escolha um horário disponível e solicite seu agendamento.</p>
        </motion.header>

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={goBack} disabled={weekStart <= new Date()}>
            <ChevronLeft className="w-4 h-4" />
            Semana anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {formatDateHeader(toISODate(weekStart))} — {formatDateHeader(toISODate(weekEnd))}
          </span>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={goNext}>
            Próxima semana
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasAnySlot ? (
          <div className="text-center py-16">
            <CalendarPlus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum horário disponível esta semana.</p>
            <p className="text-xs text-muted-foreground mt-1">Tente a próxima semana ou entre em contato com seu psicólogo.</p>
          </div>
        ) : (
          <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            {weekDates.map((date) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground text-center capitalize">{formatDateHeader(date)}</p>
                {slotsByDate[date].length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground/50 py-2">—</p>
                ) : (
                  slotsByDate[date].map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      className="w-full rounded-lg border border-border bg-card px-2 py-2 text-center text-sm hover:border-ethos-primary hover:bg-ethos-primary/5 transition-colors"
                      onClick={() => setConfirm(slot)}
                    >
                      <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      {slot.time}
                    </button>
                  ))
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Confirmation modal */}
        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="font-serif text-xl font-medium mb-2">Confirmar solicitação</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Solicitar sessão para{" "}
                <strong>{formatDateHeader(confirm.date)}</strong> às <strong>{confirm.time}</strong>?
                <br />
                <span className="text-xs">Duração: {confirm.duration} min · O psicólogo confirmará em breve.</span>
              </p>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => void handleRequest(confirm)}
                  disabled={requesting === `${confirm.date}-${confirm.time}`}
                >
                  {requesting === `${confirm.date}-${confirm.time}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Solicitar"
                  )}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setConfirm(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* My requests */}
        {myRequests.length > 0 && (
          <motion.section className="mt-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-serif text-lg font-medium text-foreground mb-4">Minhas solicitações</h2>
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div key={req.id} className="session-card flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {formatDateHeader(req.requested_date)} às {req.requested_time}
                    </p>
                    <p className="text-xs text-muted-foreground">{req.duration_minutes} min</p>
                    {req.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">Motivo: {req.rejection_reason}</p>
                    )}
                  </div>
                  {statusBadge(req.status)}
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default PatientBookingPage;
