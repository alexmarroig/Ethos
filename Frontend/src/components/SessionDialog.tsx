import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Monitor, Building2 } from "lucide-react";
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
  defaultEventType?: EventType;
  allowTaskType?: boolean;
  onCreated: () => void;
}

type EventType = "session" | "task";
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
  const dayLabel = days.map((day) => DAY_LABELS[day]).join(" e ");
  if (type === "weekly") return `Toda ${dayLabel} às ${time}`;
  if (type === "biweekly") return `A cada 2 semanas, ${dayLabel} às ${time}`;
  return `2× semana, ${dayLabel} às ${time}`;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime) return "";
  const [hours, minutes] = startTime.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";
  const totalMinutes = (hours * 60) + minutes + Math.max(durationMinutes || 0, 0);
  const endHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

export function SessionDialog({
  open,
  onOpenChange,
  patients,
  defaultDate,
  defaultTime,
  defaultEventType,
  onCreated,
  allowTaskType = true,
}: SessionDialogProps) {
  const [eventType, setEventType] = useState<EventType>(defaultEventType ?? "session");
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(defaultDate ?? "");
  const [time, setTime] = useState(defaultTime ?? "");
  const [duration, setDuration] = useState(50);
  const [locationType, setLocationType] = useState<"remote" | "presencial">("remote");
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [selectedDays, setSelectedDays] = useState<DayName[]>(["monday"]);
  const [taskTitle, setTaskTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endTime = calculateEndTime(time, duration);

  const toggleDay = (day: DayName) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day],
    );
  };

  useEffect(() => {
    if (open) {
      setDate(defaultDate ?? "");
      setTime(defaultTime ?? "");
      setDuration(50);
      const initialEventType = defaultEventType ?? "session";
      setEventType(allowTaskType ? initialEventType : "session");
      setPatientId("");
      setLocationType("remote");
      setRecurring(false);
      setSelectedDays(["monday"]);
      setTaskTitle("");
      setError(null);
    }
  }, [open, defaultDate, defaultTime, defaultEventType, allowTaskType]);

  const handleSubmit = async () => {
    setError(null);

    if (!date || !time) {
      setError("Data e horário são obrigatórios.");
      return;
    }
    if (eventType === "session" && !patientId) {
      setError("Selecione um paciente.");
      return;
    }
    if (eventType === "task" && !taskTitle.trim()) {
      setError("Informe o título da tarefa.");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    let recurrence: RecurrenceRule | undefined;
    if (eventType === "session" && recurring) {
      const activeDays = recurrenceType === "2x-week" ? selectedDays.slice(0, 2) : [selectedDays[0]];
      recurrence = {
        type: recurrenceType,
        days: activeDays,
        time,
        duration_minutes: duration,
      };
    }

    setLoading(true);
    try {
      const result = await sessionService.create({
        patient_id: eventType === "session" ? patientId : `block-${Date.now()}`,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        recurrence,
        event_type: eventType === "session" ? "session" : "other",
        block_title: eventType === "task" ? taskTitle.trim() : undefined,
        location_type: eventType === "session" ? locationType : undefined,
      });

      if (!result.success) {
        setError("Erro ao criar a entrada. Tente novamente.");
        return;
      }

      onCreated();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const submitLabel =
    eventType === "task"
      ? "Salvar tarefa"
      : recurring
        ? "Iniciar série recorrente"
        : "Agendar sessão";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova entrada na agenda</DialogTitle>
          <DialogDescription>
            {allowTaskType
              ? "Agende uma sessão terapêutica ou reserve um horário para uma tarefa da sua rotina."
              : "Agende uma sessão terapêutica para sua agenda clínica."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {allowTaskType ? (
            <div className="grid grid-cols-2 gap-2">
              {(["session", "task"] as EventType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventType(type)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    eventType === type
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-foreground",
                  )}
                >
                  {type === "session" ? "🧠 Sessão" : "🗂️ Tarefa"}
                </button>
              ))}
            </div>
          ) : null}

          {eventType === "session" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Paciente</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar paciente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Modalidade</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationType("remote")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      locationType === "remote"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground",
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    Remoto
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationType("presencial")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      locationType === "presencial"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground",
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                    Presencial
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Título da tarefa</Label>
              <Input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Ex.: Estudar, supervisão, almoço, reunião..."
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_130px_130px_130px]">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário inicial</Label>
              <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duração (min)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                min={15}
                step={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Horário final</Label>
              <Input value={endTime} readOnly disabled className="opacity-80" />
            </div>
          </div>

          {eventType === "session" ? (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Sessão recorrente</p>
                  <p className="text-xs text-muted-foreground">Próxima sessão gerada automaticamente</p>
                </div>
                <Switch checked={recurring} onCheckedChange={setRecurring} />
              </div>

              {recurring ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex gap-2">
                    {(["weekly", "2x-week", "biweekly"] as RecurrenceType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setRecurrenceType(type)}
                        className={cn(
                          "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                          recurrenceType === type
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-foreground",
                        )}
                      >
                        {type === "weekly" ? "Semanal" : type === "2x-week" ? "2× semana" : "Quinzenal"}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    {ALL_DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => (recurrenceType === "2x-week" ? toggleDay(day) : setSelectedDays([day]))}
                        className={cn(
                          "flex-1 rounded-md border py-1 text-xs font-medium transition-colors",
                          selectedDays.includes(day)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-foreground",
                        )}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    ))}
                  </div>

                  {selectedDays.length > 0 && time ? (
                    <p className="text-xs text-muted-foreground">
                      {recurrenceSummary(recurrenceType, selectedDays, time)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
