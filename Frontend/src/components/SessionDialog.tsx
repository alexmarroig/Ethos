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
import { Building2, Monitor, Repeat2, ChevronRight, ChevronLeft, CalendarCheck, Palette, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { sessionService, type RecurrenceRule } from "@/services/sessionService";
import {
  clearAgendaDraft,
  agendaCategories,
  agendaColors,
  createDefaultAgendaMeta,
  getAgendaCategory,
  normalizeAgendaTags,
  readAgendaDraft,
  upsertAgendaEventMeta,
  writeAgendaDraft,
  writeAgendaTaskDraft,
  type AgendaCategoryId,
  type AgendaColorId,
  type AgendaPriority,
} from "@/pages/agendaStorage";
import { AnimatePresence, motion } from "framer-motion";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";

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
  const [colorId, setColorId] = useState<AgendaColorId>(
    createDefaultAgendaMeta(resolvedEventType === "task" ? "task" : "session").colorId,
  );
  const [categoryId, setCategoryId] = useState<AgendaCategoryId>(
    createDefaultAgendaMeta(resolvedEventType === "task" ? "task" : "session").categoryId,
  );
  const [tagsInput, setTagsInput] = useState("");
  const [priority, setPriority] = useState<AgendaPriority>("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRecoveredAt, setDraftRecoveredAt] = useState<string | null>(null);
  const draftHydratedRef = useRef(false);

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const endTime = useMemo(() => calculateEndTime(time, duration), [time, duration]);
  const currentMode = eventType === "task" ? "task" : "session";

  const isDirty = useMemo(() => {
    return patientId !== "" || taskTitle !== "" || date !== defaultDate || time !== defaultTime || tagsInput !== "";
  }, [patientId, taskTitle, date, time, defaultDate, defaultTime, tagsInput]);

  useBeforeUnload(open && isDirty, "Você tem dados preenchidos no formulário. Tem certeza que deseja descartar?");

  useEffect(() => {
    if (!open) {
      draftHydratedRef.current = false;
      setStep(1);
      return;
    }

    draftHydratedRef.current = false;
    setStep(1);
    const nextMode = mode === "task" ? "task" : (defaultEventType ?? "session");
    const sessionDraft = nextMode === "session" ? readAgendaDraft("session") : null;
    const taskDraft = nextMode === "task" ? readAgendaDraft("task") : null;

    setEventType(nextMode);
    setError(null);

    if (sessionDraft?.payload && nextMode === "session") {
      const defaultMeta = createDefaultAgendaMeta("session");
      setPatientId(sessionDraft.payload.patientId);
      setDate(sessionDraft.payload.date || defaultDate || "");
      setTime(sessionDraft.payload.time || defaultTime || "");
      setDuration(sessionDraft.payload.duration || 50);
      setLocationType(sessionDraft.payload.locationType || "remote");
      setRecurring(sessionDraft.payload.recurring);
      setRecurrenceType(sessionDraft.payload.recurrenceType || "weekly");
      setSelectedDays(sessionDraft.payload.selectedDays?.length ? sessionDraft.payload.selectedDays : ["monday"]);
      setColorId(sessionDraft.payload.colorId ?? defaultMeta.colorId);
      setCategoryId(sessionDraft.payload.categoryId ?? defaultMeta.categoryId);
      setTagsInput(normalizeAgendaTags(sessionDraft.payload.tags ?? defaultMeta.tags).join(", "));
      setPriority(sessionDraft.payload.priority ?? defaultMeta.priority);
      setTaskTitle("");
      setDraftRecoveredAt(sessionDraft.updatedAt);
      queueMicrotask(() => {
        draftHydratedRef.current = true;
      });
      return;
    }

    if (taskDraft?.payload && nextMode === "task") {
      const defaultMeta = createDefaultAgendaMeta("task");
      setTaskTitle(taskDraft.payload.taskTitle);
      setDate(taskDraft.payload.date || defaultDate || "");
      setTime(taskDraft.payload.time || defaultTime || "");
      setDuration(taskDraft.payload.duration || 50);
      setColorId(taskDraft.payload.colorId ?? defaultMeta.colorId);
      setCategoryId(taskDraft.payload.categoryId ?? defaultMeta.categoryId);
      setTagsInput(normalizeAgendaTags(taskDraft.payload.tags ?? defaultMeta.tags).join(", "));
      setPriority(taskDraft.payload.priority ?? defaultMeta.priority);
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

    const defaultMeta = createDefaultAgendaMeta(nextMode === "task" ? "task" : "session");
    setPatientId("");
    setDate(defaultDate ?? "");
    setTime(defaultTime ?? "");
    setDuration(50);
    setColorId(defaultMeta.colorId);
    setCategoryId(defaultMeta.categoryId);
    setTagsInput(defaultMeta.tags.join(", "));
    setPriority(defaultMeta.priority);
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
        colorId,
        categoryId,
        tags: normalizeAgendaTags(tagsInput),
        priority,
      });
      return;
    }

    writeAgendaTaskDraft({
      taskTitle,
      date,
      time,
      duration,
      colorId,
      categoryId,
      tags: normalizeAgendaTags(tagsInput),
      priority,
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
    colorId,
    categoryId,
    tagsInput,
    priority,
  ]);

  const handleCategoryChange = (value: AgendaCategoryId) => {
    setCategoryId(value);
    setColorId(getAgendaCategory(value).defaultColorId);
  };

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
        description: "Preencha os dados da sessão em etapas para facilitar o agendamento.",
        submitLabel: recurring ? "Iniciar recorrência" : "Agendar sessão",
      };

  const recurrenceDays = recurrenceType === "2x-week"
    ? selectedDays.slice(0, 2)
    : selectedDays.slice(0, 1);

  const recurrenceText = recurrenceDays.length > 0 && time
    ? recurrenceSummary(recurrenceType, recurrenceDays, time)
    : "";

  const handleNext = () => {
    setError(null);
    if (step === 1) {
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
      setStep(eventType === "session" ? 2 : 3);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 3) {
      setStep(eventType === "session" ? 2 : 1);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async () => {
    setError(null);
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

      upsertAgendaEventMeta(result.data.id, {
        colorId,
        categoryId,
        tags: normalizeAgendaTags(tagsInput),
        priority,
      });

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
      const defaultMeta = createDefaultAgendaMeta("session");
      setColorId(defaultMeta.colorId);
      setCategoryId(defaultMeta.categoryId);
      setTagsInput(defaultMeta.tags.join(", "));
      setPriority(defaultMeta.priority);
      return;
    }

    setTaskTitle("");
    setDate(defaultDate ?? "");
    setTime(defaultTime ?? "");
    setDuration(50);
    const defaultMeta = createDefaultAgendaMeta("task");
    setColorId(defaultMeta.colorId);
    setCategoryId(defaultMeta.categoryId);
    setTagsInput(defaultMeta.tags.join(", "));
    setPriority(defaultMeta.priority);
  };

  // Motion variants for wizard slide
  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 50 : -50,
        opacity: 0,
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 50 : -50,
        opacity: 0,
      };
    },
  };
  
  const [[page, direction], setPage] = useState([step, 0]);

  useEffect(() => {
    setPage((prev) => {
      const dir = step > prev[0] ? 1 : -1;
      return [step, dir];
    });
  }, [step]);

  const classificationFields = (
    <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Organizacao visual</h3>
      </div>

      <div className="space-y-2">
        <Label>Cor da agenda</Label>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {agendaColors.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => setColorId(color.id)}
              className={cn(
                "flex h-10 items-center justify-center rounded-xl border transition-all",
                colorId === color.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
              )}
              aria-label={`Usar cor ${color.label}`}
              title={color.label}
            >
              <span className={cn("h-4 w-4 rounded-full", color.dotClass)} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={categoryId} onValueChange={(value) => handleCategoryChange(value as AgendaCategoryId)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agendaCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{getAgendaCategory(categoryId).description}</p>
        </div>

        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as AgendaPriority)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="agenda-tags" className="inline-flex items-center gap-2">
          <Tags className="h-4 w-4" />
          Tags
        </Label>
        <Input
          id="agenda-tags"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="Ex.: online, supervisao, urgencia"
          className="bg-background"
        />
        <p className="text-xs text-muted-foreground">Separe por virgulas. As tags aparecem no cartao e ajudam a filtrar a semana.</p>
      </div>
    </section>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,40rem)] max-w-[40rem] overflow-hidden p-0 gap-0 border-sidebar-border/80 bg-background/95 backdrop-blur-md">
        <DialogHeader className="space-y-2 border-b border-border/70 px-4 py-4 sm:px-6 bg-card/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-serif text-xl sm:text-2xl">{dialogCopy.title}</DialogTitle>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
              <span className={cn("transition-colors", step === 1 && "text-primary")}>1</span>
              <span>/</span>
              <span className={cn("transition-colors", step === 2 && "text-primary")}>{eventType === "session" ? "2" : "1"}</span>
              {eventType === "session" && (
                <>
                  <span>/</span>
                  <span className={cn("transition-colors", step === 3 && "text-primary")}>3</span>
                </>
              )}
            </div>
          </div>
          <DialogDescription className="max-w-[52ch] text-sm leading-6">
            {dialogCopy.description}
          </DialogDescription>
          {draftRecoveredAt && step === 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground mt-2">
              <span>
                Rascunho auto-salvo. Última alteração em{" "}
                {new Date(draftRecoveredAt).toLocaleString("pt-BR", {
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

        <div className="relative min-h-[350px] overflow-hidden bg-background">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={page}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute inset-0 px-4 py-5 sm:px-6 overflow-y-auto"
            >
              {step === 1 && (
                <div className="space-y-6">
                  {eventType === "session" ? (
                    <section className="space-y-2">
                      <Label htmlFor="session-patient">Paciente</Label>
                      <Select value={patientId} onValueChange={setPatientId}>
                        <SelectTrigger id="session-patient" className="min-w-0 bg-card">
                          <SelectValue placeholder="Selecione um paciente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </section>
                  ) : (
                    <section className="space-y-2">
                      <Label htmlFor="task-title">Título do bloqueio</Label>
                      <Input
                        id="task-title"
                        value={taskTitle}
                        onChange={(event) => setTaskTitle(event.target.value)}
                        placeholder="Ex.: almoço, supervisão, reunião"
                        className="bg-card"
                      />
                    </section>
                  )}

                  <section className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Data e horário</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="session-date">Data</Label>
                        <Input
                          id="session-date"
                          type="date"
                          value={date}
                          onChange={(event) => setDate(event.target.value)}
                          className="bg-card"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="session-time">Horário inicial</Label>
                        <Input
                          id="session-time"
                          type="time"
                          value={time}
                          onChange={(event) => setTime(event.target.value)}
                          className="bg-card"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="session-duration">Duração (min)</Label>
                        <Input
                          id="session-duration"
                          type="number"
                          min={15}
                          step={5}
                          value={duration}
                          onChange={(event) => setDuration(Number(event.target.value))}
                          className="bg-card"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="session-end-time">Horário final</Label>
                        <Input
                          id="session-end-time"
                          value={endTime}
                          readOnly
                          disabled
                          className="w-full bg-card opacity-70"
                        />
                      </div>
                    </div>
                  </section>

                  {classificationFields}
                </div>
              )}

              {step === 2 && eventType === "session" && (
                <div className="space-y-6">
                  <section className="space-y-3">
                    <Label>Modalidade da Sessão</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setLocationType("remote")}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-all duration-200",
                          locationType === "remote"
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <Monitor className="h-6 w-6" />
                        <span>Remoto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationType("presencial")}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-all duration-200",
                          locationType === "presencial"
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <Building2 className="h-6 w-6" />
                        <span>Presencial</span>
                      </button>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Sessão recorrente</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Gerar automaticamente as próximas sessões.
                        </p>
                      </div>
                      <Switch checked={recurring} onCheckedChange={setRecurring} />
                    </div>

                    <AnimatePresence>
                      {recurring && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4"
                        >
                          <div className="grid gap-2 sm:grid-cols-3">
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
                                  "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                                  recurrenceType === type
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                )}
                              >
                                {type === "weekly" ? "Semanal" : type === "2x-week" ? "2× semana" : "Quinzenal"}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                            {ALL_DAYS.map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className={cn(
                                  "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                                  selectedDays.includes(day)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                )}
                              >
                                {DAY_LABELS[day]}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 rounded-2xl border border-primary/20 bg-primary/5">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <CalendarCheck className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {eventType === "session" ? "Revisão do Agendamento" : "Revisão do Bloqueio"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">Verifique os dados antes de confirmar.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-card divide-y divide-border">
                    {eventType === "session" ? (
                      <>
                        <div className="p-4 flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Paciente</span>
                          <span className="text-sm font-medium">{patients.find(p => p.id === patientId)?.name || "N/A"}</span>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Modalidade</span>
                          <span className="text-sm font-medium capitalize">{locationType}</span>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Título</span>
                        <span className="text-sm font-medium">{taskTitle}</span>
                      </div>
                    )}
                    <div className="p-4 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Data e Horário</span>
                      <span className="text-sm font-medium">
                        {date.split('-').reverse().join('/')} às {time} ({duration} min)
                      </span>
                    </div>
                    {recurring && eventType === "session" && (
                      <div className="p-4 flex justify-between items-center bg-primary/5">
                        <span className="text-sm text-primary flex items-center gap-1.5">
                          <Repeat2 className="h-4 w-4" /> Recorrência
                        </span>
                        <span className="text-sm font-medium text-primary text-right max-w-[60%]">
                          {recurrenceText}
                        </span>
                      </div>
                    )}
                    <div className="p-4 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Categoria</span>
                      <span className="text-sm font-medium">{getAgendaCategory(categoryId).label}</span>
                    </div>
                    <div className="p-4 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tags</span>
                      <span className="text-sm font-medium text-right">
                        {normalizeAgendaTags(tagsInput).length > 0
                          ? normalizeAgendaTags(tagsInput).map((tag) => `#${tag}`).join(" ")
                          : "Sem tags"}
                      </span>
                    </div>
                  </div>
                  {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t border-border/70 bg-card/50 p-4 sm:px-6">
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              onClick={step === 1 ? () => onOpenChange(false) : handleBack}
              className="px-3"
            >
              {step === 1 ? "Cancelar" : (
                <>
                  <ChevronLeft className="mr-1.5 h-4 w-4" />
                  Voltar
                </>
              )}
            </Button>
            
            <Button
              onClick={step === 3 ? handleSubmit : handleNext}
              disabled={loading}
              className="px-6 min-w-[120px]"
            >
              {step === 3 ? (
                loading ? "Salvando..." : dialogCopy.submitLabel
              ) : (
                <>
                  Próximo
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
