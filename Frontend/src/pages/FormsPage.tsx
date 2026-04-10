import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ClipboardList, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formService, type Form, type FormEntry } from "@/services/formService";
import { patientService, type Patient } from "@/services/patientService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

const createEmptyResponses = (form?: Form) =>
  Object.fromEntries((form?.fields ?? []).map((field) => [field.id, ""]));

const emptyTemplateField = () => ({
  id: crypto.randomUUID(),
  label: "Nova pergunta",
  type: "text" as const,
  placeholder: "",
  required: false,
  options: [],
});

const renderEntryValue = (value: unknown) => {
  if (typeof value === "string") return value || "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === null || value === undefined) return "—";
  return String(value);
};

export default function FormsPage() {
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientForDiary, setSelectedPatientForDiary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [entryResponses, setEntryResponses] = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateFields, setTemplateFields] = useState<NonNullable<Form["fields"]>>([]);

  useEffect(() => {
    const load = async () => {
      const [formsRes, entriesRes, patientsRes] = await Promise.all([
        formService.list(),
        formService.listEntries(),
        patientService.list(),
      ]);

      if (!formsRes.success) {
        setError({ message: formsRes.error.message, requestId: formsRes.request_id });
      } else {
        setForms(formsRes.data);
        setSelectedFormId(formsRes.data[0]?.id ?? "");
      }

      if (entriesRes.success) setEntries(entriesRes.data);
      if (patientsRes.success) {
        setPatients(patientsRes.data);
        setSelectedPatientForDiary((current) => current || patientsRes.data[0]?.id || "");
      }

      setLoading(false);
    };

    void load();
  }, []);

  const selectedForm = useMemo(() => forms.find((form) => form.id === selectedFormId), [forms, selectedFormId]);

  const patientNames = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient.name])),
    [patients],
  );

  const diaryEntries = useMemo(
    () => entries.filter((entry) => entry.form_id === "emotion-diary" && (!selectedPatientForDiary || entry.patient_id === selectedPatientForDiary)),
    [entries, selectedPatientForDiary],
  );

  const selectedFormEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.submitted_by === "patient" &&
          (!selectedPatientForDiary || entry.patient_id === selectedPatientForDiary),
      ),
    [entries, selectedPatientForDiary],
  );

  const openEntryDialog = (form?: Form) => {
    const nextForm = form ?? forms[0];
    setSelectedFormId(nextForm?.id ?? "");
    setEntryResponses(createEmptyResponses(nextForm));
    setEntryDialogOpen(true);
  };

  const openTemplateDialog = (form?: Form) => {
    setTemplateId(form?.id ?? null);
    setTemplateTitle(form?.name ?? form?.title ?? "");
    setTemplateDescription(form?.description ?? "");
    setTemplateFields(
      form?.fields ?? [
        {
          id: crypto.randomUUID(),
          label: "Qual foi o acontecimento e quando ocorreu?",
          type: "textarea",
          required: true,
          placeholder: "Descreva a situação com clareza.",
          options: [],
        },
        {
          id: crypto.randomUUID(),
          label: "Data de quando ocorreu",
          type: "date",
          required: true,
          options: [],
        },
      ],
    );
    setTemplateDialogOpen(true);
  };

  const handleCreateEntry = async () => {
    if (!selectedFormId || !patientId) return;
    setCreatingEntry(true);

    const result = await formService.createEntry({
      form_id: selectedFormId,
      patient_id: patientId,
      data: entryResponses,
    });

    setCreatingEntry(false);

    if (!result.success) {
      toast({ title: "Erro ao registrar formulário", description: result.error.message, variant: "destructive" });
      return;
    }

    setEntries((current) => [result.data, ...current]);
    setEntryDialogOpen(false);
    setPatientId("");
    toast({ title: "Entrada registrada" });
  };

  const handleSaveTemplate = async () => {
    if (!templateTitle.trim() || templateFields.length === 0) return;
    setSavingTemplate(true);

    const payload = {
      title: templateTitle.trim(),
      description: templateDescription.trim() || undefined,
      audience: "patient" as const,
      active: true,
      fields: templateFields,
    };

    const result = templateId
      ? await formService.updateTemplate(templateId, payload)
      : await formService.createTemplate(payload);

    setSavingTemplate(false);

    if (!result.success) {
      toast({ title: "Erro ao salvar formulário", description: result.error.message, variant: "destructive" });
      return;
    }

    setForms((current) => {
      const exists = current.some((item) => item.id === result.data.id);
      return exists ? current.map((item) => (item.id === result.data.id ? result.data : item)) : [result.data, ...current];
    });
    setTemplateDialogOpen(false);
    toast({ title: "Modelo salvo" });
  };

  const handleDeleteTemplate = async (formId: string) => {
    const result = await formService.deleteTemplate(formId);
    if (!result.success) {
      toast({ title: "Erro ao remover formulário", description: result.error.message, variant: "destructive" });
      return;
    }
    setForms((current) => current.filter((item) => item.id !== formId));
    toast({ title: "Modelo removido" });
  };

  const updateFieldDraft = (fieldId: string, patch: Partial<NonNullable<Form["fields"]>[number]>) => {
    setTemplateFields((current) => current.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)));
  };

  const addFieldDraft = () => setTemplateFields((current) => [...current, emptyTemplateField()]);
  const removeFieldDraft = (fieldId: string) => setTemplateFields((current) => current.filter((field) => field.id !== fieldId));

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando diário e formulários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Diário e formulários</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Diário e formulários</h1>
          <p className="mt-2 text-muted-foreground">
            Formulários clínicos editáveis para o paciente preencher entre sessões.
          </p>
        </motion.header>

        <motion.section className="mb-8 rounded-[28px] border border-border bg-card p-6 md:p-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-serif text-xl text-foreground">Diário emocional</h2>
              <p className="text-sm text-muted-foreground mt-1">Visualize os registros enviados pelo paciente.</p>
            </div>

            <select
              value={selectedPatientForDiary}
              onChange={(event) => setSelectedPatientForDiary(event.target.value)}
              className="flex h-11 min-w-[240px] rounded-xl border border-input bg-background px-4 py-2 text-sm"
            >
              <option value="">Selecione o paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          {diaryEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/70 py-12 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma entrada de diário emocional para este paciente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diaryEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-border bg-background/80 p-5">
                  <p className="text-sm text-muted-foreground mb-3">
                    {patientNames.get(entry.patient_id)} · {formatDate(entry.created_at)}
                  </p>
                  <div className="grid gap-3">
                    {Object.entries((entry.data ?? {}) as Record<string, unknown>).map(([key, value]) => (
                      <div key={key} className="rounded-xl bg-muted/50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{key}</p>
                        <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{renderEntryValue(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-foreground">Modelos de formulário</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => openTemplateDialog()}>
                <Save className="w-4 h-4" />
                Criar formulário
              </Button>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => openEntryDialog(selectedForm)}>
                <Plus className="w-4 h-4" />
                Nova entrada
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-8">
            {forms.map((form) => (
              <div key={form.id} className="relative overflow-hidden rounded-[24px] border border-border bg-card px-5 py-5 shadow-[0_18px_40px_rgba(23,49,58,0.08)]">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-accent/50 to-primary/20" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl text-foreground">{form.name}</h3>
                    {form.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{form.description}</p> : null}
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                    {(form.fields?.length ?? 0)} perguntas
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEntryDialog(form)}>Nova resposta</Button>
                  <Button variant="ghost" size="sm" onClick={() => openTemplateDialog(form)}>Editar modelo</Button>
                  {!["emotion-diary", "weekly-checkin", "initial-anamnesis"].includes(form.id) ? (
                    <Button variant="ghost" size="sm" onClick={() => void handleDeleteTemplate(form.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-3">
            <h3 className="font-serif text-lg text-foreground">Respostas enviadas pelo paciente</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aqui aparecem somente os formulários realmente submetidos pelo paciente no login dele.
            </p>
          </div>
          {selectedFormEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/70 py-12 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma resposta enviada pelo paciente ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedFormEntries.map((entry) => {
                const form = forms.find((item) => item.id === entry.form_id);
                const data = (entry.data ?? {}) as Record<string, unknown>;
                return (
                  <div key={entry.id} className="session-card">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-lg text-foreground">{form?.name ?? "Formulário"}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {patientNames.get(entry.patient_id) ?? "Paciente"} · {formatDate(entry.created_at)}
                          {entry.submitted_by ? ` · enviado por ${entry.submitted_by === "patient" ? "paciente" : "profissional"}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {Object.entries(data).map(([key, value]) => {
                        const field = form?.fields?.find((item) => item.id === key);
                        return (
                          <div key={key} className="rounded-xl bg-muted/50 px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{field?.label ?? key}</p>
                            <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{renderEntryValue(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Nova entrada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <select value={selectedFormId} onChange={(event) => setSelectedFormId(event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm">
                <option value="">Selecione o formulário</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>{form.name}</option>
                ))}
              </select>
              <select value={patientId} onChange={(event) => setPatientId(event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm">
                <option value="">Selecione o paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>

              {selectedForm ? (
                <div className="rounded-2xl border border-border bg-background/70 p-5">
                  <h3 className="font-serif text-xl text-foreground">{selectedForm.name}</h3>
                  {selectedForm.description ? <p className="mt-2 text-sm text-muted-foreground">{selectedForm.description}</p> : null}
                </div>
              ) : null}

              {(forms.find((form) => form.id === selectedFormId)?.fields ?? []).map((field, index) => (
                <div key={field.id} className="rounded-2xl border border-border bg-card px-5 py-4 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pergunta {index + 1}</p>
                    <label className="mt-2 block font-medium text-foreground">{field.label}</label>
                  </div>
                  {field.type === "textarea" ? (
                    <Textarea value={entryResponses[field.id] ?? ""} onChange={(event) => setEntryResponses((current) => ({ ...current, [field.id]: event.target.value }))} placeholder={field.placeholder} />
                  ) : field.type === "date" ? (
                    <Input type="date" value={entryResponses[field.id] ?? ""} onChange={(event) => setEntryResponses((current) => ({ ...current, [field.id]: event.target.value }))} />
                  ) : field.type === "select" ? (
                    <select value={entryResponses[field.id] ?? ""} onChange={(event) => setEntryResponses((current) => ({ ...current, [field.id]: event.target.value }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm">
                      <option value="">Selecione</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <Input value={entryResponses[field.id] ?? ""} onChange={(event) => setEntryResponses((current) => ({ ...current, [field.id]: event.target.value }))} placeholder={field.placeholder} />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => void handleCreateEntry()} disabled={creatingEntry || !selectedFormId || !patientId}>
                {creatingEntry ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">{templateId ? "Editar formulário" : "Criar formulário"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Título" value={templateTitle} onChange={(event) => setTemplateTitle(event.target.value)} />
              <Textarea placeholder="Descrição" value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} className="min-h-[90px]" />

              <div className="space-y-3">
                {templateFields.map((field, index) => (
                  <div key={field.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pergunta {index + 1}</p>
                      <Button variant="ghost" size="sm" onClick={() => removeFieldDraft(field.id)}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={field.label} onChange={(event) => updateFieldDraft(field.id, { label: event.target.value })} placeholder="Pergunta" />
                      <select value={field.type} onChange={(event) => updateFieldDraft(field.id, { type: event.target.value as any })} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm">
                        <option value="text">Texto curto</option>
                        <option value="textarea">Texto longo</option>
                        <option value="date">Data</option>
                        <option value="select">Seleção</option>
                      </select>
                    </div>
                    <Input value={field.placeholder ?? ""} onChange={(event) => updateFieldDraft(field.id, { placeholder: event.target.value })} placeholder="Placeholder" />
                    {field.type === "select" ? (
                      <Textarea
                        value={(field.options ?? []).map((option) => option.label).join("\n")}
                        onChange={(event) => updateFieldDraft(field.id, {
                          options: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => ({ label: line, value: line.toLowerCase().replace(/\s+/g, "_") })),
                        })}
                        className="min-h-[90px]"
                        placeholder="Uma opção por linha"
                      />
                    ) : null}
                  </div>
                ))}
                <Button variant="outline" onClick={addFieldDraft}>Adicionar pergunta</Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setTemplateDialogOpen(false)}>Fechar</Button>
              <Button onClick={() => void handleSaveTemplate()} disabled={savingTemplate || !templateTitle.trim()}>
                {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar modelo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
