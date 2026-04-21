import { useState, useEffect, useMemo } from "react";
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
import { Monitor, Building2 } from "lucide-react";

interface Patient {
  id: string;
  name: string;
}

export type EventType = "session" | "block";

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  defaultDate?: string;
  defaultTime?: string;
  defaultEventType?: EventType;
  onCreated: () => void;
}

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

export function SessionDialog({
  open,
  onOpenChange,
  patients,
  defaultDate,
  defaultTime,
  defaultEventType = "session",
  onCreated
}: SessionDialogProps) {
  const [eventType, setEventType] = useState<EventType>(defaultEventType);
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(defaultDate ?? "");
  const [time, setTime] = useState(defaultTime ?? "");
  const [duration, setDuration] = useState(50);
  const [locationType, setLocationType] = useState<"remote" | "presencial">("remote");
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

  useEffect(() => {
    if (open) {
      setDate(defaultDate ?? "");
      setTime(defaultTime ?? "");
      setEventType(defaultEventType || "session");
      setError(null);
    }
  }, [open, defaultDate, defaultTime, defaultEventType]);

  const endTime = useMemo(() => {
    if (!time || !duration) return "";
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const dateObj = new Date();
      dateObj.setHours(hours, minutes, 0, 0);
      const end = new Date(dateObj.getTime() + duration * 60000);
      return end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }, [time, duration]);

  const handleSubmit = async () => {
    setError(null);
    if (!date || !time) { setError("Data e horário são obrigatórios"); return; }
    if (eventType === "session" && !patientId) { setError("Selecione um paciente"); return; }
    if (eventType === "block" && !blockTitle.trim()) { setError("Título é obrigatório"); return; }

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
        location_type: eventType === "session" ? locationType : undefined,
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
    eventType === "block" ? "Salvar tarefa" :
    recurring ? "Iniciar série recorrente" : "Agendar sessão";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{eventType === "session" ? "Agendar Sessão" : "Adicionar Tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
              <Label>Título da Tarefa</Label>
              <Input value={blockTitle} onChange={(e) => setBlockTitle(e.target.value)} placeholder="Ex: Academia, Estudar, Almoço..." />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário de Início</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duração (min)</Label>
              <div className="relative">
                <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={15} step={5} />
                {endTime && (
                  <span className="absolute -bottom-5 right-0 text-[10px] text-muted-foreground whitespace-nowrap">
                    Finaliza às {endTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {eventType === "session" && (
            <div className="space-y-1.5">
              <Label>Tipo de Sessão</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocationType("remote")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium transition-all",
                    locationType === "remote"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border hover:border-foreground"
                  )}
                >
                  <Monitor className="h-4 w-4" />
                  Remoto
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType("presencial")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium transition-all",
                    locationType === "presencial"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border hover:border-foreground"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Presencial
                </button>
              </div>
            </div>
          )}

          <div className={cn("flex items-center justify-between rounded-lg border p-3", eventType !== "session" && "mt-4")}>
            <div>
              <p className="text-sm font-medium">Repetir semanalmente</p>
              <p className="text-xs text-muted-foreground">Próxima gerada automaticamente</p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          {recurring && (
            <div className="space-y-3 rounded-lg border p-3 animate-in fade-in slide-in-from-top-2">
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
          <Button onClick={handleSubmit} disabled={loading} className="px-8">
            {loading ? "Salvando..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
