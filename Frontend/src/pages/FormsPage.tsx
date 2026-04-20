import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  BookCopy,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  formService,
  type Form,
  type FormAssignment,
  type FormEntry,
} from "@/services/formService";
import { patientService, type Patient } from "@/services/patientService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FormField = NonNullable<Form["fields"]>[number];
type FormFieldType = FormField["type"];

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

const assignmentModeLabel = (mode?: "single_use" | "recurring") =>
  mode === "single_use" ? "Envio único" : "Recorrente";

const fieldTypeLabel = (type: FormFieldType) => {
  switch (type) {
    case "textarea":
      return "Texto longo";
    case "date":
      return "Data";
    case "select":
      return "Lista";
    case "radio":
      return "Múltipla escolha";
    case "checkbox":
      return "Checkbox";
    default:
      return "Texto curto";
  }
};

const requiresOptions = (type: FormFieldType) =>
  type === "select" || type === "radio" || type === "checkbox";

const emptyField = (): FormField => ({
  id: `field-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  label: "",
  type: "text",
  placeholder: "",
  required: false,
  options: [],
});

const normalizeSlug = (value: string, fallback: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || fallback;

const mapFieldForSave = (field: FormField, index: number): FormField => ({
  ...field,
  id: field.id || `field-${Date.now()}-${index}`,
  label: field.label.trim() || `Pergunta ${index + 1}`,
  placeholder: field.placeholder?.trim() || "",
  required: Boolean(field.required),
  options: requiresOptions(field.type)
    ? (field.options ?? [])
        .map((option, optionIndex) => ({
          label: option.label?.trim() || `Opção ${optionIndex + 1}`,
          value:
            option.value?.trim() ||
            normalizeSlug(option.label || "", `opcao_${optionIndex + 1}`),
        }))
        .filter((option) => option.label)
    : [],
});

export default function FormsPage() {
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [filterPatient, setFilterPatient] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [creatingForm, setCreatingForm] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [duplicatingFormId, setDuplicatingFormId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCoverTitle, setEditCoverTitle] = useState("");
  const [editCoverDesc, setEditCoverDesc] = useState("");
  const [editFields, setEditFields] = useState<FormField[]>([]);

  const [entryForm, setEntryForm] = useState<Form | null>(null);
  const [entryPatient, setEntryPatient] = useState("");
  const [entryResponses, setEntryResponses] = useState<Record<string, string>>({});
  const [creatingEntry, setCreatingEntry] = useState(false);

  const [shareForm, setShareForm] = useState<Form | null>(null);
  const [sharePatientId, setSharePatientId] = useState("");
  const [shareMode, setShareMode] = useState<"single_use" | "recurring">("recurring");
  const [sharing, setSharing] = useState(false);
  const [updatingAssignmentId, setUpdatingAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [formsRes, entriesRes, patientsRes, assignmentsRes] = await Promise.all([
        formService.list(),
        formService.listEntries(),
        patientService.list(),
        formService.listAssignments(),
      ]);

      if (!formsRes.success) {
        setError({ message: formsRes.error.message, requestId: formsRes.request_id });
        setLoading(false);
        return;
      }

      setForms(formsRes.data);
      if (entriesRes.success) setEntries(entriesRes.data);
      if (patientsRes.success) setPatients(patientsRes.data);
      if (assignmentsRes.success) setAssignments(assignmentsRes.data);
      setLoading(false);
    };

    void load();
  }, []);

  const patientNames = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient.name])),
    [patients],
  );

  const assignmentsByForm = useMemo(() => {
    const map = new Map<string, FormAssignment[]>();
    for (const assignment of assignments) {
      const items = map.get(assignment.form_id) ?? [];
      items.push(assignment);
      map.set(assignment.form_id, items);
    }
    return map;
  }, [assignments]);

  const filteredEntries = filterPatient
    ? entries.filter((entry) => entry.patient_id === filterPatient)
    : entries;

  const closeEdit = () => {
    setEditingForm(null);
    setCreatingForm(false);
    setEditTitle("");
    setEditDesc("");
    setEditCoverTitle("");
    setEditCoverDesc("");
    setEditFields([]);
  };

  const handleDeleteEntry = async (entryId: string) => {
    setDeletingEntryId(entryId);
    const result = await formService.deleteEntry(entryId);
    setDeletingEntryId(null);
    if (result.success) {
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      if (expandedEntryId === entryId) setExpandedEntryId(null);
      toast({ title: "Resposta removida" });
    } else {
      toast({ title: "Erro ao remover resposta", variant: "destructive" });
    }
  };

  const openEdit = (form: Form) => {
    setCreatingForm(false);
    setEditingForm(form);
    setEditTitle(form.name);
    setEditDesc(form.description ?? "");
    setEditCoverTitle(form.cover?.title ?? form.name);
    setEditCoverDesc(form.cover?.description ?? form.description ?? "");
    setEditFields([...(form.fields ?? [])]);
  };

  const openCreate = () => {
    setCreatingForm(true);
    setEditingForm(null);
    setEditTitle("");
    setEditDesc("");
    setEditCoverTitle("");
    setEditCoverDesc("");
    setEditFields([emptyField()]);
  };

  const addField = () => {
    setEditFields((prev) => [...prev, emptyField()]);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setEditFields((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const updateField = (
    index: number,
    key: keyof FormField,
    value: string | boolean | FormFieldType,
  ) => {
    setEditFields((prev) => {
      const next = [...prev];
      const current = next[index];
      const updated = { ...current, [key]: value } as FormField;
      if (key === "type" && !requiresOptions(value as FormFieldType)) {
        updated.options = [];
      }
      next[index] = updated;
      return next;
    });
  };

  const removeField = (index: number) => {
    setEditFields((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const addOption = (fieldIndex: number) => {
    setEditFields((prev) => {
      const next = [...prev];
      const field = next[fieldIndex];
      const optionIndex = (field.options?.length ?? 0) + 1;
      next[fieldIndex] = {
        ...field,
        options: [
          ...(field.options ?? []),
          {
            label: `Opção ${optionIndex}`,
            value: `opcao_${optionIndex}`,
          },
        ],
      };
      return next;
    });
  };

  const updateOption = (
    fieldIndex: number,
    optionIndex: number,
    key: "label" | "value",
    value: string,
  ) => {
    setEditFields((prev) => {
      const next = [...prev];
      const field = next[fieldIndex];
      const options = [...(field.options ?? [])];
      const current = { ...options[optionIndex], [key]: value };
      if (key === "label") {
        current.value = normalizeSlug(value, `opcao_${optionIndex + 1}`);
      }
      options[optionIndex] = current;
      next[fieldIndex] = { ...field, options };
      return next;
    });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    setEditFields((prev) => {
      const next = [...prev];
      const field = next[fieldIndex];
      next[fieldIndex] = {
        ...field,
        options: (field.options ?? []).filter((_, currentIndex) => currentIndex !== optionIndex),
      };
      return next;
    });
  };

  const saveTemplate = async () => {
    const fields = editFields.map(mapFieldForSave).filter((field) => field.label.trim());
    if (!editTitle.trim() || fields.length === 0) {
      toast({
        title: "Modelo incompleto",
        description: "Defina um título e pelo menos uma pergunta antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      title: editTitle.trim(),
      description: editDesc.trim() || undefined,
      audience: "patient" as const,
      active: true,
      cover: {
        title: editCoverTitle.trim() || editTitle.trim(),
        description: editCoverDesc.trim() || editDesc.trim() || undefined,
      },
      fields,
    };

    setSavingTemplate(true);
    const result = creatingForm
      ? await formService.createTemplate(payload)
      : editingForm
        ? await formService.updateTemplate(editingForm.id, payload)
        : null;
    setSavingTemplate(false);

    if (!result || !result.success) {
      toast({
        title: "Erro ao salvar modelo",
        description: result?.success ? "" : result?.error.message ?? "Não foi possível salvar o modelo.",
        variant: "destructive",
      });
      return;
    }

    setForms((current) =>
      creatingForm
        ? [result.data, ...current]
        : current.map((form) => (form.id === editingForm?.id ? { ...form, ...result.data } : form)),
    );
    toast({ title: creatingForm ? "Modelo criado" : "Modelo atualizado" });
    closeEdit();
  };

  const duplicateTemplate = async (form: Form) => {
    setDuplicatingFormId(form.id);
    const result = await formService.createTemplate({
      title: `${form.name} (cópia)`,
      description: form.description,
      audience: form.audience ?? "patient",
      active: form.active ?? true,
      cover: form.cover,
      fields: (form.fields ?? []).map((field, index) => ({
        ...field,
        id: `field-${Date.now()}-${index}`,
        options: field.options ? [...field.options] : [],
      })),
    });
    setDuplicatingFormId(null);

    if (!result.success) {
      toast({
        title: "Erro ao duplicar modelo",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setForms((current) => [result.data, ...current]);
    toast({ title: "Modelo duplicado" });
  };

  const openEntry = (form: Form) => {
    setEntryForm(form);
    setEntryPatient("");
    const initial: Record<string, string> = {};
    form.fields?.forEach((field) => {
      initial[field.id] = "";
    });
    setEntryResponses(initial);
  };

  const closeEntry = () => {
    setEntryForm(null);
    setEntryPatient("");
    setEntryResponses({});
  };

  const submitEntry = async () => {
    if (!entryForm || !entryPatient) return;
    setCreatingEntry(true);
    const result = await formService.createEntry({
      form_id: entryForm.id,
      patient_id: entryPatient,
      data: entryResponses,
    });
    setCreatingEntry(false);

    if (!result.success) {
      toast({
        title: "Erro ao registrar resposta",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setEntries((current) => [result.data, ...current]);
    toast({ title: "Entrada registrada" });
    closeEntry();
  };

  const openShare = (form: Form) => {
    setShareForm(form);
    setSharePatientId("");
    setShareMode("recurring");
  };

  const closeShare = () => {
    setShareForm(null);
    setSharePatientId("");
    setShareMode("recurring");
  };

  const publishToPatient = async () => {
    if (!shareForm || !sharePatientId) return;
    setSharing(true);
    const result = await formService.assignToPatient({
      form_id: shareForm.id,
      patient_id: sharePatientId,
      mode: shareMode,
      active: true,
    });
    setSharing(false);

    if (!result.success) {
      toast({
        title: "Erro ao disponibilizar",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    const refreshed = await formService.listAssignments({ form_id: shareForm.id });
    if (refreshed.success) {
      setAssignments((current) => [
        ...current.filter((assignment) => assignment.form_id !== shareForm.id),
        ...refreshed.data,
      ]);
    }

    toast({
      title: "Formulário disponibilizado",
      description: "O paciente já poderá acessar esse formulário no portal do ETHOS.",
    });
    closeShare();
  };

  const toggleAssignment = async (assignment: FormAssignment, nextActive: boolean) => {
    setUpdatingAssignmentId(assignment.id);
    const result = await formService.updateAssignment(assignment.id, { active: nextActive });
    setUpdatingAssignmentId(null);

    if (!result.success) {
      toast({
        title: "Erro ao atualizar disponibilização",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setAssignments((current) =>
      current.map((item) => (item.id === assignment.id ? { ...item, active: result.data.active } : item)),
    );
  };

  if (loading) {
    return (
      <div className="content-container flex items-center gap-3 py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="loading-text">Carregando formulários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="mb-6 font-serif text-3xl font-medium text-foreground">Formulários</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container space-y-10 py-8 md:py-12">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Formulários</h1>
          <p className="mt-2 text-muted-foreground">
            Crie modelos, personalize perguntas, disponibilize para pacientes específicos e acompanhe as respostas.
          </p>
        </motion.header>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-medium text-foreground">
              Modelos de formulário
            </h2>
            <Button variant="secondary" size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo modelo
            </Button>
          </div>

          {forms.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum modelo criado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {forms.map((form) => {
                const linkedAssignments = assignmentsByForm.get(form.id) ?? [];
                const responseCount = form.responses_count ?? entries.filter((entry) => entry.form_id === form.id).length;
                const assignmentCount = form.assignments_count ?? linkedAssignments.length;

                return (
                  <div key={form.id} className="session-card flex flex-col gap-6 p-6 md:p-8">
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                        {form.cover?.title || form.name}
                      </p>
                      <h3 className="font-serif text-xl font-medium text-foreground">{form.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {form.cover?.description || form.description || "Modelo livre para coleta clínica e acompanhamento."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {form.fields?.length ?? 0} campos
                        </span>
                        <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {assignmentCount} pacientes
                        </span>
                        <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {responseCount} respostas
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-muted/10 p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Disponibilizações
                        </p>
                        <Button size="sm" className="gap-2" onClick={() => openShare(form)}>
                          <Send className="h-3.5 w-3.5" />
                          Disponibilizar
                        </Button>
                      </div>

                      {linkedAssignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Esse modelo ainda não foi liberado para nenhum paciente.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {linkedAssignments.slice(0, 3).map((assignment) => {
                            const patientName = assignment.patient?.name
                              ?? assignment.patient?.label
                              ?? patientNames.get(assignment.patient_id)
                              ?? "Paciente";

                            return (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {patientName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {assignmentModeLabel(assignment.mode)} · {assignment.response_count ?? 0} resposta(s)
                                  </p>
                                </div>

                                <Button
                                  variant={assignment.active ? "outline" : "secondary"}
                                  size="sm"
                                  disabled={updatingAssignmentId === assignment.id}
                                  onClick={() => void toggleAssignment(assignment, !assignment.active)}
                                >
                                  {updatingAssignmentId === assignment.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : assignment.active ? (
                                    "Ocultar"
                                  ) : (
                                    "Reativar"
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2 md:grid-cols-3">
                      <Button variant="outline" size="sm" onClick={() => openEdit(form)}>
                        Editar modelo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => void duplicateTemplate(form)}
                        disabled={duplicatingFormId === form.id}
                      >
                        {duplicatingFormId === form.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <BookCopy className="h-3.5 w-3.5" />
                        )}
                        Duplicar
                      </Button>
                      <Button variant="secondary" size="sm" className="gap-2" onClick={() => openEntry(form)}>
                        <Plus className="h-3.5 w-3.5" />
                        Nova entrada
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-medium text-foreground">
              Respostas enviadas
            </h2>

            <select
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="flex h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos os pacientes</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma resposta encontrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => {
                const form = forms.find((item) => item.id === entry.form_id);
                const data = entry.data as Record<string, unknown>;
                const expanded = expandedEntryId === entry.id;

                return (
                  <div key={entry.id} className="session-card">
                    <div className="flex w-full items-start justify-between gap-3">
                      <button
                        className="flex flex-1 items-start justify-between gap-3 text-left min-w-0"
                        onClick={() => setExpandedEntryId(expanded ? null : entry.id)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {patientNames.get(entry.patient_id) ?? "Paciente"}
                            <span className="font-normal text-muted-foreground">
                              {" "}· {form?.name ?? entry.form_id}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(entry.created_at)}
                          </p>
                        </div>
                        {expanded ? (
                          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => void handleDeleteEntry(entry.id)}
                        disabled={deletingEntryId === entry.id}
                        aria-label="Remover resposta"
                      >
                        {deletingEntryId === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {expanded ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-2">
                            {Object.entries(data).map(([key, value]) => {
                              const fieldLabel = form?.fields?.find((field) => field.id === key)?.label ?? key;
                              return (
                                <div key={key} className="rounded-xl bg-muted/40 px-4 py-3">
                                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                                    {fieldLabel}
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm text-foreground">
                                    {String(value ?? "—")}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>

      <Dialog open={creatingForm || !!editingForm} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {creatingForm ? "Novo modelo" : "Editar modelo"}
            </DialogTitle>
            <DialogDescription>
              Monte um diário ou formulário do zero, com perguntas livres, ordem personalizada e capa própria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Capa do formulário</p>
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                    Título
                  </label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Ex.: Check-in semanal de ansiedade" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                    Descrição
                  </label>
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Explique ao paciente quando e por que preencher." rows={2} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                      Capa · título
                    </label>
                    <Input value={editCoverTitle} onChange={(e) => setEditCoverTitle(e.target.value)} placeholder="Título da capa" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                      Capa · descrição
                    </label>
                    <Input value={editCoverDesc} onChange={(e) => setEditCoverDesc(e.target.value)} placeholder="Resumo curto para a capa" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Perguntas</p>
                  <p className="text-xs text-muted-foreground">
                    Reordene, marque obrigatórias e escolha o tipo de resposta.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={addField}>
                  <Plus className="h-4 w-4" />
                  Adicionar pergunta
                </Button>
              </div>

              <div className="space-y-3">
                {editFields.map((field, index) => (
                  <div key={field.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-start gap-2">
                      <div className="flex flex-col gap-2">
                        <button type="button" onClick={() => moveField(index, -1)} className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => moveField(index, 1)} className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground">
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, "label", e.target.value)}
                            placeholder={`Pergunta ${index + 1}`}
                            className="flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="shrink-0 rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                          <select
                            value={field.type}
                            onChange={(e) => updateField(index, "type", e.target.value as FormFieldType)}
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="text">Texto curto</option>
                            <option value="textarea">Texto longo</option>
                            <option value="date">Data</option>
                            <option value="select">Lista</option>
                            <option value="radio">Múltipla escolha</option>
                            <option value="checkbox">Checkbox</option>
                          </select>

                          <Input
                            value={field.placeholder ?? ""}
                            onChange={(e) => updateField(index, "placeholder", e.target.value)}
                            placeholder="Placeholder / ajuda"
                          />

                          <label className="flex items-center gap-2 rounded-md border border-input px-3 text-xs text-foreground">
                            <input
                              type="checkbox"
                              checked={Boolean(field.required)}
                              onChange={(e) => updateField(index, "required", e.target.checked)}
                            />
                            Obrigatória
                          </label>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {field.type === "radio" ? <CircleDot className="h-3.5 w-3.5" /> : null}
                          {field.type === "checkbox" ? <CheckSquare className="h-3.5 w-3.5" /> : null}
                          <span>{fieldTypeLabel(field.type)}</span>
                        </div>

                        {requiresOptions(field.type) ? (
                          <div className="rounded-xl border border-dashed border-border p-3">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Opções
                              </p>
                              <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => addOption(index)}>
                                <Plus className="h-3.5 w-3.5" />
                                Nova opção
                              </Button>
                            </div>

                            <div className="space-y-2">
                              {(field.options ?? []).map((option, optionIndex) => (
                                <div key={`${field.id}-option-${optionIndex}`} className="flex items-center gap-2">
                                  <Input
                                    value={option.label}
                                    onChange={(e) => updateOption(index, optionIndex, "label", e.target.value)}
                                    placeholder={`Opção ${optionIndex + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeOption(index, optionIndex)}
                                    className="shrink-0 rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeEdit} disabled={savingTemplate}>
              Cancelar
            </Button>
            <Button onClick={saveTemplate} disabled={savingTemplate || !editTitle.trim()} className="gap-2">
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {creatingForm ? "Criar modelo" : "Salvar modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!entryForm} onOpenChange={(open) => { if (!open) closeEntry(); }}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Nova entrada · {entryForm?.name}
            </DialogTitle>
            <DialogDescription>
              Use este modal quando você quiser registrar uma resposta manualmente pelo paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                Paciente
              </label>
              <select
                value={entryPatient}
                onChange={(e) => setEntryPatient(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione o paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>

            {entryForm?.fields?.map((field) => (
              <div key={field.id}>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                  {field.label || field.id}
                </label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={entryResponses[field.id] ?? ""}
                    onChange={(e) => setEntryResponses((current) => ({ ...current, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : field.type === "date" ? (
                  <Input
                    type="date"
                    value={entryResponses[field.id] ?? ""}
                    onChange={(e) => setEntryResponses((current) => ({ ...current, [field.id]: e.target.value }))}
                  />
                ) : field.type === "select" || field.type === "radio" ? (
                  <select
                    value={entryResponses[field.id] ?? ""}
                    onChange={(e) => setEntryResponses((current) => ({ ...current, [field.id]: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <div className="space-y-2">
                    {field.options?.map((option) => {
                      const currentValues = (entryResponses[field.id] ?? "")
                        .split(" | ")
                        .map((value) => value.trim())
                        .filter(Boolean);
                      const checked = currentValues.includes(option.value);
                      return (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextValues = e.target.checked
                                ? [...currentValues, option.value]
                                : currentValues.filter((value) => value !== option.value);
                              setEntryResponses((current) => ({
                                ...current,
                                [field.id]: nextValues.join(" | "),
                              }));
                            }}
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    value={entryResponses[field.id] ?? ""}
                    onChange={(e) => setEntryResponses((current) => ({ ...current, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeEntry} disabled={creatingEntry}>
              Cancelar
            </Button>
            <Button onClick={submitEntry} disabled={creatingEntry || !entryPatient} className="gap-2">
              {creatingEntry ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enviar resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!shareForm} onOpenChange={(open) => { if (!open) closeShare(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Disponibilizar para paciente
            </DialogTitle>
            <DialogDescription>
              Escolha quem vai receber esse modelo no portal do ETHOS e se o envio será único ou recorrente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">{shareForm?.name}</p>
              {shareForm?.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{shareForm.description}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                Paciente
              </label>
              <select
                value={sharePatientId}
                onChange={(e) => setSharePatientId(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione o paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                Recorrência
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${shareMode === "recurring" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}
                  onClick={() => setShareMode("recurring")}
                  type="button"
                >
                  <p className="font-medium">Recorrente</p>
                  <p className="mt-1 text-xs">O paciente pode preencher várias vezes.</p>
                </button>
                <button
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${shareMode === "single_use" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}
                  onClick={() => setShareMode("single_use")}
                  type="button"
                >
                  <p className="font-medium">Envio único</p>
                  <p className="mt-1 text-xs">O paciente envia apenas uma resposta.</p>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeShare} disabled={sharing}>
              Cancelar
            </Button>
            <Button onClick={publishToPatient} disabled={sharing || !sharePatientId} className="gap-2">
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Disponibilizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
