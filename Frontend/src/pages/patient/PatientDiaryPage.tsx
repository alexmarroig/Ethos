import { lazy, Suspense, useEffect, useMemo, useState } from "react";
const DreamDiaryPage = lazy(() => import("@/pages/patient/DreamDiaryPage"));
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Loader2,
  Repeat,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { patientPortalService } from "@/services/patientPortalService";
import type { Form, FormEntry } from "@/services/formService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const formatDatetime = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const modeLabel = (mode?: "single_use" | "recurring") =>
  mode === "single_use" ? "Envio único" : "Recorrente";

const FORM_COLORS = [
  "from-violet-500/20 to-purple-500/10 border-violet-500/30",
  "from-cyan-500/20 to-teal-500/10 border-cyan-500/30",
  "from-rose-500/20 to-pink-500/10 border-rose-500/30",
  "from-amber-500/20 to-orange-500/10 border-amber-500/30",
  "from-emerald-500/20 to-green-500/10 border-emerald-500/30",
];

const FORM_ICONS = ["📝", "💭", "🌱", "⭐", "🔍", "💡", "🎯", "🌊"];

export default function PatientDiaryPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"diary" | "dreams">("diary");
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editResponses, setEditResponses] = useState<Record<string, string>>({});
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState<"form" | "history">("form");

  useEffect(() => {
    const load = async () => {
      const formsRes = await patientPortalService.listForms();
      if (formsRes.success && formsRes.data.length > 0) {
        setForms(formsRes.data);
        setSelectedFormId(formsRes.data[0]?.id ?? "");
      }
      setLoading(false);
    };
    void load();
  }, []);

  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId),
    [forms, selectedFormId],
  );

  useEffect(() => {
    setResponses(
      Object.fromEntries((selectedForm?.fields ?? []).map((field) => [field.id, ""])),
    );
    setSubmitted(false);
    setCurrentStep(0);
  }, [selectedForm]);

  useEffect(() => {
    if (!selectedFormId) { setEntries([]); return; }
    const loadEntries = async () => {
      const result = await patientPortalService.getFormEntries(selectedFormId);
      if (result.success) setEntries(result.data);
    };
    void loadEntries();
  }, [selectedFormId]);

  const fields = selectedForm?.fields ?? [];
  const canSubmitRequiredFields = fields.every(
    (field) => !field.required || (responses[field.id] ?? "").trim().length > 0,
  );
  const canSubmit = Boolean(selectedForm?.can_submit ?? true) && canSubmitRequiredFields;
  const currentField = fields[currentStep];
  const isLastStep = currentStep === fields.length - 1;
  const isFirstStep = currentStep === 0;

  const handleSubmit = async () => {
    if (!selectedFormId || saving || !canSubmit) return;
    setSaving(true);
    const result = await patientPortalService.createFormEntry({
      form_id: selectedFormId,
      content: responses,
    });
    setSaving(false);

    if (!result.success) {
      toast({ title: "Erro ao enviar", description: result.error.message, variant: "destructive" });
      return;
    }

    setEntries((current) => [{ ...result.data, data: responses }, ...current]);
    setSubmitted(true);
    toast({ title: "Resposta enviada ✓", description: "Sua psicóloga já poderá acompanhar o que você preencheu." });

    setTimeout(() => {
      setResponses(Object.fromEntries(fields.map((field) => [field.id, ""])));
      setSubmitted(false);
      setCurrentStep(0);
      if (selectedForm?.mode === "single_use") {
        setForms((current) =>
          current.map((form) =>
            form.id === selectedFormId
              ? { ...form, can_submit: false, response_count: (form.response_count ?? 0) + 1 }
              : form,
          ),
        );
      }
    }, 1500);
  };

  const toggleEntry = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const startEdit = (entry: FormEntry) => {
    const data = ((entry as any).data ?? (entry as any).content ?? {}) as Record<string, string>;
    setEditResponses(data);
    setEditingEntry(entry.id);
  };

  const saveEdit = async () => {
    if (!editingEntry) return;
    setSavingEdit(true);
    // Optimistic update
    setEntries((current) =>
      current.map((e) => e.id === editingEntry ? { ...e, data: editResponses } as any : e),
    );
    setEditingEntry(null);
    setSavingEdit(false);
    toast({ title: "Resposta atualizada ✓" });
  };

  const confirmDelete = async (entryId: string) => {
    setDeletingEntry(null);
    setEntries((current) => current.filter((e) => e.id !== entryId));
    toast({ title: "Resposta removida" });
  };

  const renderFieldInput = (
    fieldId: string,
    field: (typeof fields)[number],
    value: string,
    onChange: (v: string) => void,
    disabled = false,
  ) => {
    if (field.type === "textarea") {
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "Escreva aqui..."}
          className="min-h-[120px] resize-none rounded-2xl border-border/60 bg-background/60 text-base backdrop-blur focus:border-primary/50"
          disabled={disabled}
        />
      );
    }
    if (field.type === "date") {
      return (
        <Input type="date" value={value} onChange={(e) => onChange(e.target.value)}
          className="rounded-2xl" disabled={disabled} />
      );
    }
    if (field.type === "select" || field.type === "radio") {
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {field.options?.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-medium transition-all",
                value === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    }
    if (field.type === "checkbox") {
      const currentValues = value.split(" | ").map((v) => v.trim()).filter(Boolean);
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {field.options?.map((option) => {
            const checked = currentValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const next = checked
                    ? currentValues.filter((v) => v !== option.value)
                    : [...currentValues, option.value];
                  onChange(next.join(" | "));
                }}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm font-medium transition-all",
                  checked
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? ""}
        className="rounded-2xl border-border/60 bg-background/60 text-base backdrop-blur focus:border-primary/50"
        disabled={disabled}
      />
    );
  };

  if (loading) {
    return (
      <div className="content-container flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="content-container py-12">
        <h1 className="mb-3 font-serif text-3xl font-medium text-foreground">Diário e Formulários</h1>
        <div className="mt-16 flex flex-col items-center py-16 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted text-4xl">📭</div>
          <p className="text-base font-medium text-foreground">Nenhum formulário disponível ainda</p>
          <p className="mt-2 text-sm text-muted-foreground">Sua psicóloga irá disponibilizar formulários em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        {/* Header */}
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Diário e Formulários</h1>
          <p className="mt-2 text-muted-foreground">Preencha os formulários que sua psicóloga disponibilizou.</p>
          {/* Tab bar */}
          <div className="mt-6 flex gap-2 border-b border-border">
            {([["diary", "Formulários"], ["dreams", "Diário dos Sonhos"]] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-2.5 px-1 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.header>

        {activeTab === "dreams" && (
          <Suspense fallback={<div className="flex items-center gap-3 py-12 text-muted-foreground"><div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" /><span className="text-sm">Carregando...</span></div>}>
            <DreamDiaryPage embedded />
          </Suspense>
        )}

        {activeTab === "diary" && <>{/* Form cards selector */}
        {forms.length > 1 && (
          <motion.div
            className="mb-6 flex gap-3 overflow-x-auto pb-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {forms.map((form, i) => (
              <button
                key={form.id}
                type="button"
                onClick={() => setSelectedFormId(form.id)}
                className={cn(
                  "flex shrink-0 flex-col gap-1.5 rounded-2xl border bg-gradient-to-br p-4 text-left transition-all",
                  FORM_COLORS[i % FORM_COLORS.length],
                  form.id === selectedFormId
                    ? "shadow-md scale-[1.02]"
                    : "opacity-70 hover:opacity-100 hover:scale-[1.01]",
                )}
              >
                <span className="text-2xl">{FORM_ICONS[i % FORM_ICONS.length]}</span>
                <span className="text-sm font-semibold text-foreground">{form.name}</span>
                <span className="text-[10px] text-muted-foreground">{modeLabel(form.mode)}</span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Tab switcher */}
        <motion.div
          className="mb-6 flex gap-1 rounded-2xl border border-border bg-muted/40 p-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {(["form", "history"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setViewMode(tab)}
              className={cn(
                "flex-1 rounded-xl py-2 text-sm font-medium transition-all",
                viewMode === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "form" ? "📝 Preencher" : `🕘 Histórico (${entries.length})`}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {viewMode === "form" ? (
            <motion.div key="form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              {/* Form header */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-2xl border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {modeLabel(selectedForm?.mode)}
                </span>
                <span className="rounded-2xl border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {selectedForm?.response_count ?? entries.length} resposta(s)
                </span>
                {!selectedForm?.can_submit && (
                  <span className="inline-flex items-center gap-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600">
                    <ShieldCheck className="h-3 w-3" /> Concluído
                  </span>
                )}
                {selectedForm?.mode !== "single_use" && (
                  <span className="inline-flex items-center gap-1 rounded-2xl border border-border px-3 py-1.5 text-xs text-muted-foreground">
                    <Repeat className="h-3 w-3" /> Pode preencher sempre que quiser
                  </span>
                )}
              </div>

              {fields.length === 0 ? (
                <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 py-16 text-center">
                  <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground">Este formulário ainda não tem campos.</p>
                </div>
              ) : submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center rounded-3xl border border-emerald-500/30 bg-emerald-500/10 py-16 text-center"
                >
                  <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
                  <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400">Enviado com sucesso!</p>
                  <p className="mt-1 text-sm text-muted-foreground">Sua psicóloga já pode acompanhar o que você preencheu.</p>
                </motion.div>
              ) : (
                <div className="rounded-3xl border border-border bg-card shadow-[0_18px_40px_rgba(23,49,58,0.06)]">
                  {/* Progress bar */}
                  <div className="px-7 pt-6">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Pergunta {currentStep + 1} de {fields.length}</span>
                      <span>{Math.round(((currentStep + 1) / fields.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${((currentStep + 1) / fields.length) * 100}%` }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    </div>
                  </div>

                  {/* Question */}
                  <AnimatePresence mode="wait">
                    {currentField && (
                      <motion.div
                        key={currentField.id}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="px-7 py-6"
                      >
                        <label className="mb-4 block">
                          <span className="block text-lg font-semibold text-foreground leading-snug">
                            {currentField.label}
                            {currentField.required && <span className="ml-1 text-primary">*</span>}
                          </span>
                          {currentField.placeholder && fields.length <= 1 && (
                            <span className="mt-1 block text-sm text-muted-foreground">{currentField.placeholder}</span>
                          )}
                        </label>
                        {renderFieldInput(
                          currentField.id,
                          currentField,
                          responses[currentField.id] ?? "",
                          (v) => setResponses((prev) => ({ ...prev, [currentField.id]: v })),
                          !selectedForm?.can_submit,
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation footer */}
                  <div className="flex items-center justify-between border-t border-border px-7 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep((s) => s - 1)}
                      disabled={isFirstStep}
                      className="gap-2"
                    >
                      ← Anterior
                    </Button>

                    {isLastStep ? (
                      <Button
                        onClick={() => void handleSubmit()}
                        disabled={saving || !canSubmit}
                        className="gap-2"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {saving ? "Enviando..." : selectedForm?.can_submit ? "Enviar resposta" : "Concluído"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setCurrentStep((s) => s + 1)}
                        disabled={
                          (currentField?.required ?? false) &&
                          !(responses[currentField?.id ?? ""] ?? "").trim()
                        }
                        className="gap-2"
                      >
                        Próxima <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="history" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              {entries.length === 0 ? (
                <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 py-16 text-center">
                  <span className="mb-4 text-4xl">📭</span>
                  <p className="text-sm font-medium text-foreground">Nenhuma resposta enviada ainda</p>
                  <p className="mt-1 text-sm text-muted-foreground">Preencha o formulário e suas respostas aparecerão aqui.</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={() => setViewMode("form")}>
                    Preencher agora <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry, i) => {
                    const form = forms.find((item) => item.id === entry.form_id);
                    const data = ((entry as any).data ?? (entry as any).content ?? {}) as Record<string, unknown>;
                    const isExpanded = expandedEntries.has(entry.id);
                    const isEditing = editingEntry === entry.id;
                    const isDeleting = deletingEntry === entry.id;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="overflow-hidden rounded-2xl border border-border bg-card"
                      >
                        {/* Entry header — always visible */}
                        <div className="flex items-center gap-3 px-5 py-4">
                          <button
                            type="button"
                            onClick={() => toggleEntry(entry.id)}
                            className="flex flex-1 items-center gap-3 text-left"
                          >
                            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">
                                {form?.name ?? "Formulário"}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" /> {formatDatetime(entry.created_at)}
                              </p>
                            </div>
                          </button>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => {
                                if (!isExpanded) toggleEntry(entry.id);
                                startEdit(entry);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Apagar"
                              onClick={() => setDeletingEntry(entry.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Delete confirm */}
                        <AnimatePresence>
                          {isDeleting && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-destructive/20 bg-destructive/5 px-5 py-3"
                            >
                              <p className="mb-3 text-sm font-medium text-destructive">Apagar esta resposta?</p>
                              <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={() => void confirmDelete(entry.id)}>
                                  Apagar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setDeletingEntry(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border px-5 py-4 space-y-3">
                                {isEditing ? (
                                  <>
                                    {Object.entries(data).map(([key]) => {
                                      const fieldDef = form?.fields?.find((f) => f.id === key);
                                      if (!fieldDef) return null;
                                      return (
                                        <div key={key} className="space-y-1">
                                          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                            {fieldDef.label}
                                          </label>
                                          {renderFieldInput(
                                            key,
                                            fieldDef,
                                            editResponses[key] ?? "",
                                            (v) => setEditResponses((prev) => ({ ...prev, [key]: v })),
                                          )}
                                        </div>
                                      );
                                    })}
                                    <div className="flex gap-2 pt-2">
                                      <Button size="sm" onClick={() => void saveEdit()} disabled={savingEdit}>
                                        {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingEntry(null)}>
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  Object.entries(data).map(([key, value]) => {
                                    const fieldDef = form?.fields?.find((f) => f.id === key);
                                    return (
                                      <div key={key} className="rounded-xl bg-muted/40 px-4 py-3">
                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                          {fieldDef?.label ?? key}
                                        </p>
                                        <p className="text-sm text-foreground">{String(value || "Não respondido")}</p>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </>}
      </div>
    </div>
  );
}
