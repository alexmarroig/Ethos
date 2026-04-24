import { useEffect, useMemo, useRef, useState } from "react";
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
import { Building2, Monitor, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sessionService, type RecurrenceRule } from "@/services/sessionService";
import {
  clearAgendaDraft,
  readAgendaDraft,
  writeAgendaDraft,
  writeAgendaTaskDraft,
} from "@/pages/agendaStorage";

interface Patient {
  id: string;
  name: string;
}

type EventType = "session" | "task";
type DialogMode = "session" | "task";
type RecurrenceType = "weekly" | "2x-week" | "biweekly";
type DayName = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  mode?: DialogMode;
  defaultDate?: string;
  defaultTime?: string;
  defaultEventType?: EventType;
  onCreated: () => void;
}

const DAY_LABELS: Record<DayName, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
};

const ALL_DAYS: DayName[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

function recurrenceSummary(type: RecurrenceType, days: DayName[], time: string) {
  const dayLabel = days.map((day) => DAY_LABELS[day]).join(" e ");
  if (type === "weekly") return `Toda ${dayLabel} às ${time}`;
  if (type === "biweekly") return `A cada 2 semanas, ${dayLabel} às ${time}`;
  return `2× por semana, ${dayLabel} às ${time}`;
}

function calculateEndTime(startTime: string, durationMinutes: number) {
  if (!startTime) return "";
  const [hours, minutes] = startTime.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";
  const totalMinutes = hours * 60 + minutes + Math.max(durationMinutes || 0, 0);
  const endHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

export function SessionDialog({
  open,
  onOpenChange,
  patients,
  mode = "session",
  defaultDate,
  defaultTime,
  defaultEventType,
  onCreated,
}: SessionDialogProps) {
  const resolvedEventType = mode === "task" ? "task" : (defaultEventType ?? "session");
  const [eventType, setEventType] = useState<EventType>(resolvedEventType);
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
  const [draftRecoveredAt, setDraftRecoveredAt] = useState<string | null>(null);
  const draftHydratedRef = useRef(false);

  const endTime = useMemo(() => calculateEndTime(time, duration), [time, duration]);
  const currentMode = eventType === "task" ? "task" : "session";

  useEffect(() => {
    if (!open) {
      draftHydratedRef.current = false;
      return;
    }

    draftHydratedRef.current = false;
    const nextMode = mode === "task" ? "task" : (defaultEventType ?? "session");
    const sessionDraft = nextMode === "session" ? readAgendaDraft("session") : null;
    const taskDraft = nextMode === "task" ? readAgendaDraft("task") : null;

    setEventType(nextMode);
    setError(null);

    if (sessionDraft?.payload && nextMode === "session") {
      setPatientId(sessionDraft.payload.patientId);
      setDate(sessionDraft.payload.date || defaultDate || "");
      setTime(sessionDraft.payload.time || defaultTime || "");
      setDuration(sessionDraft.payload.duration || 50);
      setLocationType(sessionDraft.payload.locationType || "remote");
      setRecurring(sessionDraft.payload.recurring);
      setRecurrenceType(sessionDraft.payload.recurrenceType || "weekly");
      setSelectedDays(sessionDraft.payload.selectedDays?.length ? sessionDraft.payload.selectedDays : ["monday"]);
      setTaskTitle("");
      setDraftRecoveredAt(sessionDraft.updatedAt);
      queueMicrotask(() => {
        draftHydratedRef.current = true;
      });
      return;
    }

    if (taskDraft?.payload && nextMode === "task") {
      setTaskTitle(taskDraft.payload.taskTitle);
      setDate(taskDraft.payload.date || defaultDate || "");
      setTime(taskDraft.payload.time || defaultTime || "");
      setDuration(taskDraft.payload.duration || 50);
      setPatientId("");
      setLocationType("remote");
      setRecurring(false);
      setRecurrenceType("weekly");
      setSelectedDays(["monday"]);
      setDraftRecoveredAt(taskDraft.updatedAt);
      queueMicrotask(() => {
        draftHydratedRef.current = true;
      });
      return;
    }

    setPatientId("");
    setDate(defaultDate ?? "");
    setTime(defaultTime ?? "");
    setDuration(50);
    setLocationType("remote");
    setRecurring(false);
    setRecurrenceType("weekly");
    setSelectedDays(["monday"]);
    setTaskTitle("");
    setDraftRecoveredAt(null);
    queueMicrotask(() => {
      draftHydratedRef.current = true;
    });
  }, [open, mode, defaultDate, defaultTime, defaultEventType]);

  useEffect(() => {
    if (!open) return;
    if (!draftHydratedRef.current) return;

    if (currentMode === "session") {
      writeAgendaDraft("session", {
        patientId,
        date,
        time,
        duration,
        locationType,
        recurring,
        recurrenceType,
        selectedDays,
      });
      return;
    }

    writeAgendaTaskDraft({
      taskTitle,
      date,
      time,
      duration,
    });
  }, [
    open,
    currentMode,
    patientId,
    date,
    time,
    duration,
    locationType,
    recurring,
    recurrenceType,
    selectedDays,
    taskTitle,
  ]);

  const toggleDay = (day: DayName) => {
    setSelectedDays((prev) => {
      if (recurrenceType !== "2x-week") return [day];
      return prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day].slice(0, 2);
    });
  };

  const dialogCopy = eventType === "task"
    ? {
        title: "Bloquear horário",
        description: "Reserve um período da agenda para pausas, reuniões, supervisão ou tarefas internas.",
        submitLabel: "Salvar bloqueio",
      }
    : {
        title: "Agendar sessão",
        description: "Preencha os dados principais da sessão e mantenha a ação de salvar sempre visível, sem apertar o layout.",
        submitLabel: recurring ? "Iniciar recorrência" : "Agendar sessão",
      };

  const recurrenceDays = recurrenceType === "2x-week"
    ? selectedDays.slice(0, 2)
    : selectedDays.slice(0, 1);

  const recurrenceText = recurrenceDays.length > 0 && time
    ? recurrenceSummary(recurrenceType, recurrenceDays, time)
    : "";

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
      setError("Informe o título do bloqueio.");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    let recurrence: RecurrenceRule | undefined;
    if (eventType === "session" && recurring) {
      recurrence = {
        type: recurrenceType,
        days: recurrenceDays,
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
        event_type: eventType === "session" ? "session" : "block",
        block_title: eventType === "task" ? taskTitle.trim() : undefined,
        location_type: eventType === "session" ? locationType : undefined,
      });

      if (!result.success) {
        setError(result.error.message || "Erro ao criar a entrada. Tente novamente.");
        return;
      }

      clearAgendaDraft(currentMode);
      setDraftRecoveredAt(null);
      onCreated();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClearDraft = () => {
    clearAgendaDraft(currentMode);
    setDraftRecoveredAt(null);
    setError(null);

    if (currentMode === "session") {
      setPatientId("");
      setDate(defaultDate ?? "");
      setTime(defaultTime ?? "");
      setDuration(50);
      setLocationType("remote");
      setRecurring(false);
      setRecurrenceType("weekly");
      setSelectedDays(["monday"]);
      return;
    }

    setTaskTitle("");
    setDate(defaultDate ?? "");
    setTime(defaultTime ?? "");
    setDuration(50);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,40rem)] max-w-[40rem] overflow-x-hidden p-0">
        <div className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2 border-b border-border/70 px-4 pb-4 pt-6 sm:px-6">
            <DialogTitle className="pr-8 font-serif text-xl sm:text-2xl">{dialogCopy.title}</DialogTitle>
            <DialogDescription className="max-w-[52ch] pr-6 text-sm leading-6">
              {dialogCopy.description}
            </DialogDescription>
            {draftRecoveredAt ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  Rascunho recuperado. Última atualização em{" "}
                  {new Date(draftRecoveredAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  .
                </span>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Limpar rascunho
                </button>
              </div>
            ) : null}
          </DialogHeader>

          <div className="min-w-0 space-y-6 px-4 py-5 sm:px-6">
            {eventType === "session" ? (
              <section className="min-w-0 space-y-5">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="session-patient">Paciente</Label>
                  <Select value={patientId} onValueChange={setPatientId}>
                    <SelectTrigger id="session-patient" className="min-w-0">
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

                <div className="min-w-0 space-y-2">
                  <Label>Modalidade</Label>
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setLocationType("remote")}
                      className={cn(
                        "flex min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors",
                        locationType === "remote"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      <Monitor className="h-4 w-4 shrink-0" />
                      <span className="truncate">Remoto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationType("presencial")}
                      className={cn(
                        "flex min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors",
                        locationType === "presencial"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">Presencial</span>
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="min-w-0 space-y-2">
                <Label htmlFor="task-title">Título do bloqueio</Label>
                <Input
                  id="task-title"
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Ex.: almoço, supervisão, reunião ou atendimento externo"
                />
              </section>
            )}

            <section className="min-w-0 space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Data e horário</h3>
                <p className="text-xs leading-5 text-muted-foreground">
                  Os campos quebram em pares para manter leitura estável em notebooks e janelas intermediárias.
                </p>
              </div>

              <div className="min-w-0 space-y-3">
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="session-date">Data</Label>
                    <Input
                      id="session-date"
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </div>

                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="session-time">Horário inicial</Label>
                    <Input
                      id="session-time"
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="session-duration">Duração (min)</Label>
                    <Input
                      id="session-duration"
                      type="number"
                      min={15}
                      step={5}
                      value={duration}
                      onChange={(event) => setDuration(Number(event.target.value))}
                    />
                  </div>

                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="session-end-time">Horário final</Label>
                    <Input
                      id="session-end-time"
                      value={endTime}
                      readOnly
                      disabled
                      className="w-full min-w-0 opacity-80"
                    />
                  </div>
                </div>
              </div>
            </section>

            {eventType === "session" ? (
              <section className="min-w-0 space-y-4">
                <div className="flex min-w-0 items-start justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Sessão recorrente</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Próxima sessão gerada automaticamente.
                    </p>
                  </div>
                  <Switch checked={recurring} onCheckedChange={setRecurring} />
                </div>

                {recurring ? (
                  <div className="min-w-0 space-y-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4">
                    <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                      {(["weekly", "2x-week", "biweekly"] as RecurrenceType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setRecurrenceType(type);
                            if (type !== "2x-week" && selectedDays.length > 1) {
                              setSelectedDays([selectedDays[0]]);
                            }
                          }}
                          className={cn(
                            "rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors",
                            recurrenceType === type
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          {type === "weekly" ? "Semanal" : type === "2x-week" ? "2× semana" : "Quinzenal"}
                        </button>
                      ))}
                    </div>

                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-5">
                      {ALL_DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={cn(
                            "rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors",
                            selectedDays.includes(day)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          {DAY_LABELS[day]}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Repeat2 className="h-4 w-4 text-primary" />
                        Resumo da recorrência
                      </div>
                      <p className="mt-1 text-xs leading-5">
                        {recurrenceText || "Defina ao menos um dia e um horário para gerar a recorrência."}
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          </div>
        </div>

        <DialogFooter className="min-w-0 gap-2 border-t border-border/70 px-4 py-4 sm:px-6 sm:py-5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full min-w-0 md:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full min-w-0 md:w-auto"
          >
            {loading ? "Salvando..." : dialogCopy.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
