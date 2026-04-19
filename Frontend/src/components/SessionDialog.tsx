import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { sessionService, type RecurrenceRule } from "@/services/sessionService";

interface Patient {
  id: string;
  name: string;
}

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  defaultDate?: string;
  defaultTime?: string;
  onCreated: () => void;
}

type EventType = "session" | "block" | "other";
type RecurrenceType = "weekly" | "2x-week" | "biweekly";
type DayName = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

const DAY_LABELS: Record<DayName, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
};

const ALL_DAYS: DayName[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

function recurrenceSummary(type: RecurrenceType, days: DayName[], time: string): string {
  const dayLabel = days.map((d) => DAY_LABELS[d]).join(" e ");
  if (type === "weekly") return `Toda ${dayLabel} às ${time}`;
  if (type === "biweekly") return `A cada 2 semanas, ${dayLabel} às ${time}`;
  return `2× semana, ${dayLabel} às ${time}`;
}

export function SessionDialog({ open, onOpenChange, patients, defaultDate, defaultTime, onCreated }: SessionDialogProps) {
  const [eventType, setEventType] = useState<EventType>("session");
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(defaultDate ?? "");
  const [time, setTime] = useState(defaultTime ?? "");
  const [duration, setDuration] = useState(50);
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [selectedDays, setSelectedDays] = useState<DayName[]>(["monday"]);
  const [blockTitle, setBlockTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: DayName) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = async () => {
    setError(null);
    if (!date || !time) { setError("Data e horário são obrigatórios"); return; }
    if (eventType === "session" && !patientId) { setError("Selecione um paciente"); return; }
    if (eventType === "block" && !blockTitle.trim()) { setError("Título do bloqueio é obrigatório"); return; }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    let recurrence: RecurrenceRule | undefined;
    if (eventType === "session" && recurring) {
      const activeDays = recurrenceType === "2x-week" ? selectedDays.slice(0, 2) : [selectedDays[0]];
      recurrence = { type: recurrenceType, days: activeDays, time, duration_minutes: duration };
    }

    setLoading(true);
    try {
      const result = await sessionService.create({
        patient_id: eventType === "session" ? patientId : `block-${Date.now()}`,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        recurrence,
        event_type: eventType,
        block_title: eventType === "block" ? blockTitle.trim() : undefined,
      });
      if (!result.success) { setError("Erro ao criar. Tente novamente."); return; }
      onCreated();
      onOpenChange(false);
      setPatientId(""); setDate(defaultDate ?? ""); setTime(defaultTime ?? "");
      setRecurring(false); setBlockTitle(""); setEventType("session");
    } finally {
      setLoading(false);
    }
  };

  const submitLabel =
    eventType === "block" ? "Salvar bloqueio" :
    recurring ? "Iniciar série recorrente" : "Agendar sessão";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova entrada na agenda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            {(["session", "block", "other"] as EventType[]).map((t) => (
              <button
                key={t}
                onClick={() => setEventType(t)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  eventType === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-foreground",
                )}
              >
                {t === "session" ? "🧠 Sessão" : t === "block" ? "⊘ Bloqueio" : "📋 Outro"}
              </button>
            ))}
          </div>

          {eventType === "session" && (
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Selecionar paciente..." /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {eventType === "block" && (
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={blockTitle} onChange={(e) => setBlockTitle(e.target.value)} placeholder="Ex: Almoço, Reunião..." />
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="w-28 space-y-1.5">
              <Label>Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="w-24 space-y-1.5">
              <Label>Duração (min)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={15} step={5} />
            </div>
          </div>

          {eventType === "session" && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Sessão recorrente</p>
                <p className="text-xs text-muted-foreground">Próxima gerada automaticamente</p>
              </div>
              <Switch checked={recurring} onCheckedChange={setRecurring} />
            </div>
          )}

          {eventType === "session" && recurring && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex gap-2">
                {(["weekly", "2x-week", "biweekly"] as RecurrenceType[]).map((rt) => (
                  <button
                    key={rt}
                    onClick={() => setRecurrenceType(rt)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                      recurrenceType === rt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-foreground",
                    )}
                  >
                    {rt === "weekly" ? "Semanal" : rt === "2x-week" ? "2× semana" : "Quinzenal"}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => recurrenceType === "2x-week" ? toggleDay(day) : setSelectedDays([day])}
                    className={cn(
                      "flex-1 rounded-md border py-1 text-xs font-medium transition-colors",
                      selectedDays.includes(day)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-foreground",
                    )}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>

              {selectedDays.length > 0 && time && (
                <p className="text-xs text-muted-foreground">
                  {recurrenceSummary(recurrenceType, selectedDays, time)}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
