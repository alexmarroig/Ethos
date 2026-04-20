import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Send,
  Users,
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

  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editFields, setEditFields] = useState<Form["fields"]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

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

  const openEdit = (form: Form) => {
    setEditingForm(form);
    setEditTitle(form.name);
    setEditDesc(form.description ?? "");
    setEditFields(form.fields ? [...form.fields] : []);
  };

  const closeEdit = () => {
    setEditingForm(null);
    setEditTitle("");
    setEditDesc("");
    setEditFields([]);
  };

  const addField = () => {
    setEditFields((prev) => [
      ...(prev ?? []),
      {
        id: `field-${Date.now()}`,
        label: "",
        type: "text" as const,
        placeholder: "",
      },
    ]);
  };

  const updateField = (
    index: number,
    key: keyof NonNullable<Form["fields"]>[number],
    value: string,
  ) => {
    setEditFields((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], [key]: value } as NonNullable<Form["fields"]>[number];
      return next;
    });
  };

  const removeField = (index: number) => {
    setEditFields((prev) => prev?.filter((_, currentIndex) => currentIndex !== index));
  };

  const saveTemplate = async () => {
    if (!editingForm) return;
    setSavingTemplate(true);
    const result = await formService.updateTemplate(editingForm.id, {
      title: editTitle,
      description: editDesc,
      fields: editFields,
    });
    setSavingTemplate(false);

    if (!result.success) {
      toast({
        title: "Erro ao salvar modelo",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setForms((current) =>
      current.map((form) => (form.id === editingForm.id ? { ...form, ...result.data } : form)),
    );
    toast({ title: "Modelo atualizado" });
    closeEdit();
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

  const filteredEntries = filterPatient
    ? entries.filter((entry) => entry.patient_id === filterPatient)
    : entries;

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
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
            Formulários
          </h1>
          <p className="mt-2 text-muted-foreground">
            Crie modelos, disponibilize para pacientes específicos e acompanhe as respostas enviadas.
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <h2 className="mb-4 font-serif text-lg font-medium text-foreground">
            Modelos de formulário
          </h2>

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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-lg font-medium text-foreground">
                          {form.name}
                        </h3>
                        {form.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {form.description}
                          </p>
                        ) : null}

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
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-muted/10 p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] font-medium text-muted-foreground">
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
                          {linkedAssignments.length > 3 ? (
                            <p className="text-xs text-muted-foreground">
                              + {linkedAssignments.length - 3} disponibilização(ões) adicional(is)
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(form)}>
                        Editar modelo
                      </Button>
                      <Button variant="secondary" size="sm" className="flex-1 gap-1" onClick={() => openEntry(form)}>
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

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
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
                    <button
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() => setExpandedEntryId(expanded ? null : entry.id)}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {patientNames.get(entry.patient_id) ?? "Paciente"}
                          <span className="font-normal text-muted-foreground">
                            {" "}· {form?.name ?? entry.form_id}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(entry.created_at)}
                          {entry.submitted_by === "patient" ? " · enviado pelo paciente" : " · lançado pela psicóloga"}
                        </p>
                      </div>
                      {expanded ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
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
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{creatingForm ? "Novo modelo" : "Editar modelo"}</DialogTitle>
            <DialogDescription>
              Ajuste a estrutura do formulário antes de disponibilizar para os pacientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                Título
              </label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Nome do formulário" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                Descrição
              </label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Explique quando esse formulário deve ser usado."
                rows={2}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Perguntas
              </label>
              <div className="space-y-3">
                {editFields?.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, "label", e.target.value)}
                        placeholder="Rótulo da pergunta"
                        className="flex-1"
                      />
                      <button
                        onClick={() => removeField(index)}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, "type", e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="text">Texto curto</option>
                        <option value="textarea">Texto longo</option>
                        <option value="date">Data</option>
                        <option value="select">Seleção</option>
                      </select>
                      <Input
                        value={field.placeholder ?? ""}
                        onChange={(e) => updateField(index, "placeholder", e.target.value)}
                        placeholder="Placeholder"
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}

                <Button variant="outline" size="sm" className="w-full gap-2" onClick={addField}>
                  <Plus className="h-4 w-4" />
                  Adicionar pergunta
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeEdit} disabled={savingTemplate}>
              Cancelar
            </Button>
            <Button onClick={saveTemplate} disabled={savingTemplate || !editTitle.trim()} className="gap-2">
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar modelo
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
