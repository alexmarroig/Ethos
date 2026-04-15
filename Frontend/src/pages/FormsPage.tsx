import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, ChevronRight, Loader2, Plus, Save, Users, X } from "lucide-react";
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
} from "@/components/ui/dialog";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

export default function FormsPage() {
  const { toast } = useToast();

  // Main data
  const [forms, setForms] = useState<Form[]>([]);
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  // Entries accordion
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [filterPatient, setFilterPatient] = useState("");

  // Template editor dialog
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editFields, setEditFields] = useState<Form["fields"]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // New entry dialog
  const [entryForm, setEntryForm] = useState<Form | null>(null);
  const [entryPatient, setEntryPatient] = useState("");
  const [entryResponses, setEntryResponses] = useState<Record<string, string>>({});
  const [creatingEntry, setCreatingEntry] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [formsRes, entriesRes, patientsRes] = await Promise.all([
        formService.list(),
        formService.listEntries(),
        patientService.list(),
      ]);

      if (!formsRes.success) {
        setError({ message: formsRes.error.message, requestId: formsRes.request_id });
        setLoading(false);
        return;
      }

      setForms(formsRes.data);

      if (entriesRes.success) setEntries(entriesRes.data);
      if (patientsRes.success) setPatients(patientsRes.data);

      setLoading(false);
    };

    void load();
  }, []);

  const patientNames = new Map(patients.map((p) => [p.id, p.name]));

  // Template editor
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
    setEditFields((prev) => prev?.filter((_, i) => i !== index));
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
      toast({ title: "Erro ao salvar modelo", description: result.error.message, variant: "destructive" });
      return;
    }

    setForms((prev) =>
      prev.map((f) =>
        f.id === editingForm.id
          ? { ...f, name: editTitle, description: editDesc, fields: editFields }
          : f,
      ),
    );
    toast({ title: "Modelo atualizado" });
    closeEdit();
  };

  // New entry
  const openEntry = (form: Form) => {
    setEntryForm(form);
    setEntryPatient("");
    const initial: Record<string, string> = {};
    form.fields?.forEach((f) => { initial[f.id] = ""; });
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
      toast({ title: "Erro ao enviar resposta", description: result.error.message, variant: "destructive" });
      return;
    }

    setEntries((prev) => [result.data, ...prev]);
    toast({ title: "Entrada registrada" });
    closeEntry();
  };

  const filteredEntries = filterPatient
    ? entries.filter((e) => e.patient_id === filterPatient)
    : entries;

  if (loading) {
    return (
      <div className="content-container py-12 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <p className="loading-text">Carregando formulários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Formulários</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12 space-y-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Formulários
          </h1>
          <p className="mt-2 text-muted-foreground">
            Modelos personalizados e respostas dos pacientes.
          </p>
        </motion.header>

        {/* Templates grid */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-serif text-lg font-medium text-foreground mb-4">
            Modelos de formulário
          </h2>

          {forms.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum modelo criado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((form) => {
                const responseCount = entries.filter((e) => e.form_id === form.id).length;
                return (
                  <div key={form.id} className="session-card flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-base font-medium text-foreground leading-snug">
                        {form.name}
                      </h3>
                      <div className="flex gap-1.5 shrink-0">
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {form.fields?.length ?? 0} campos
                        </span>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {responseCount}
                        </span>
                      </div>
                    </div>

                    {form.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {form.description}
                      </p>
                    )}

                    <div className="flex gap-2 mt-auto pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => openEdit(form)}
                      >
                        Editar modelo
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-xs gap-1"
                        onClick={() => openEntry(form)}
                      >
                        <Plus className="w-3 h-3" />
                        Nova entrada
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Entries accordion */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">
              Respostas enviadas
            </h2>

            <select
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Todos os pacientes</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">Nenhuma resposta encontrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => {
                const form = forms.find((f) => f.id === entry.form_id);
                const data = entry.data as Record<string, unknown>;
                const isExpanded = expandedEntryId === entry.id;

                return (
                  <div key={entry.id} className="session-card cursor-pointer select-none">
                    <button
                      className="w-full text-left flex items-start justify-between gap-3"
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {patientNames.get(entry.patient_id) ?? "Paciente"}{" "}
                          <span className="text-muted-foreground font-normal">
                            · {form?.name ?? entry.form_id}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(entry.created_at)}
                          {entry.submitted_by === "patient" && " · enviado pelo paciente"}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-2">
                            {Object.entries(data).map(([key, value]) => {
                              const fieldLabel =
                                form?.fields?.find((f) => f.id === key)?.label ?? key;
                              return (
                                <div key={key} className="bg-muted/40 rounded-xl px-4 py-3">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                                    {fieldLabel}
                                  </p>
                                  <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {String(value ?? "—")}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>

      {/* Template editor dialog */}
      <Dialog open={!!editingForm} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Editar modelo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">
                Título
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Nome do formulário"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">
                Descrição
              </label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descrição opcional"
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">
                Perguntas
              </label>
              <div className="space-y-3">
                {editFields?.map((field, index) => (
                  <div
                    key={field.id}
                    className="border border-border rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, "label", e.target.value)}
                        placeholder="Rótulo da pergunta"
                        className="flex-1"
                      />
                      <button
                        onClick={() => removeField(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, "type", e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={addField}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar pergunta
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeEdit} disabled={savingTemplate}>
              Cancelar
            </Button>
            <Button
              onClick={saveTemplate}
              disabled={savingTemplate || !editTitle.trim()}
              className="gap-2"
            >
              {savingTemplate ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New entry dialog */}
      <Dialog open={!!entryForm} onOpenChange={(open) => { if (!open) closeEntry(); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Nova entrada — {entryForm?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">
                Paciente
              </label>
              <select
                value={entryPatient}
                onChange={(e) => setEntryPatient(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Selecione o paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {entryForm?.fields?.map((field) => (
              <div key={field.id}>
                <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">
                  {field.label || field.id}
                </label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={entryResponses[field.id] ?? ""}
                    onChange={(e) =>
                      setEntryResponses((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : field.type === "date" ? (
                  <Input
                    type="date"
                    value={entryResponses[field.id] ?? ""}
                    onChange={(e) =>
                      setEntryResponses((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                  />
                ) : (
                  <Input
                    value={entryResponses[field.id] ?? ""}
                    onChange={(e) =>
                      setEntryResponses((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
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
            <Button
              onClick={submitEntry}
              disabled={creatingEntry || !entryPatient}
              className="gap-2"
            >
              {creatingEntry && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
