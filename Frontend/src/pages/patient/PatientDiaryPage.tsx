import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  Clock,
  Loader2,
  Send,
  CheckCircle2,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { patientPortalService } from "@/services/patientPortalService";
import type { Form, FormEntry } from "@/services/formService";
import { useToast } from "@/hooks/use-toast";

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

export default function PatientDiaryPage() {
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

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
  }, [selectedForm]);

  useEffect(() => {
    if (!selectedFormId) {
      setEntries([]);
      return;
    }
    const loadEntries = async () => {
      const result = await patientPortalService.getFormEntries(selectedFormId);
      if (result.success) setEntries(result.data);
    };
    void loadEntries();
  }, [selectedFormId]);

  const canSubmitRequiredFields = (selectedForm?.fields ?? []).every(
    (field) => !field.required || (responses[field.id] ?? "").trim().length > 0,
  );
  const canSubmit = Boolean(selectedForm?.can_submit ?? true) && canSubmitRequiredFields;

  const handleSubmit = async () => {
    if (!selectedFormId || saving || !canSubmit) return;
    setSaving(true);
    const result = await patientPortalService.createFormEntry({
      form_id: selectedFormId,
      content: responses,
    });
    setSaving(false);

    if (!result.success) {
      toast({
        title: "Erro ao enviar",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setEntries((current) => [{ ...result.data, data: responses }, ...current]);
    setSubmitted(true);
    toast({
      title: "Resposta enviada",
      description: "Sua psicóloga já poderá acompanhar o que você preencheu.",
    });

    setTimeout(() => {
      setResponses(
        Object.fromEntries((selectedForm?.fields ?? []).map((field) => [field.id, ""])),
      );
      setSubmitted(false);
      if (selectedForm?.mode === "single_use") {
        setForms((current) =>
          current.map((form) =>
            form.id === selectedFormId ? { ...form, can_submit: false, response_count: (form.response_count ?? 0) + 1 } : form,
          ),
        );
      }
    }, 1200);
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
        <h1 className="mb-3 font-serif text-3xl font-medium text-foreground">
          Diário e formulários
        </h1>
        <p className="text-muted-foreground">Nenhum formulário disponível ainda.</p>
        <div className="mt-12 flex flex-col items-center py-16 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">
            Sua psicóloga irá disponibilizar formulários em breve.
          </p>
        </div>
      </div>
    );
  }

  const hasFields = (selectedForm?.fields ?? []).length > 0;

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
            Diário e formulários
          </h1>
          <p className="mt-2 text-muted-foreground">
            Preencha os formulários que sua psicóloga disponibilizou para você.
          </p>
        </motion.header>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {forms.length > 1 ? (
            <div className="relative mb-6">
              <button
                onClick={() => setSelectOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
              >
                <span>{selectedForm?.name ?? "Selecione um formulário"}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${selectOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {selectOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl"
                  >
                    {forms.map((form) => (
                      <button
                        key={form.id}
                        onClick={() => {
                          setSelectedFormId(form.id);
                          setSelectOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-muted ${form.id === selectedFormId ? "font-medium text-foreground" : "text-muted-foreground"}`}
                      >
                        {form.name}
                      </button>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          <div className="rounded-[28px] border border-border bg-card shadow-[0_18px_40px_rgba(23,49,58,0.08)]">
            <div className="border-b border-border px-7 py-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-2xl font-medium text-foreground">
                  {selectedForm?.name}
                </h2>
                <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {modeLabel(selectedForm?.mode)}
                </span>
                <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {selectedForm?.response_count ?? entries.length} resposta(s)
                </span>
              </div>
              {selectedForm?.description ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {selectedForm.description}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
                  <Repeat className="h-3.5 w-3.5" />
                  {selectedForm?.mode === "single_use"
                    ? "Você envia uma única resposta"
                    : "Você pode preencher sempre que quiser"}
                </span>
                {!selectedForm?.can_submit ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Esse formulário já foi concluído
                  </span>
                ) : null}
              </div>
            </div>

            {!hasFields ? (
              <div className="flex flex-col items-center py-16 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                  Este formulário ainda não possui campos configurados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(selectedForm?.fields ?? []).map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.04 }}
                    className="px-7 py-5"
                  >
                    <label className="mb-3 block">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {index + 1} / {selectedForm?.fields?.length}
                      </span>
                      <span className="mt-1.5 block text-[15px] font-medium text-foreground">
                        {field.label}
                        {field.required ? <span className="ml-1 text-red-400">*</span> : null}
                      </span>
                    </label>

                    {field.type === "textarea" ? (
                      <Textarea
                        value={responses[field.id] ?? ""}
                        onChange={(e) => setResponses((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={field.placeholder ?? "Escreva aqui..."}
                        className="min-h-[100px] resize-none rounded-xl"
                        disabled={submitted || !selectedForm?.can_submit}
                      />
                    ) : field.type === "date" ? (
                      <Input
                        type="date"
                        value={responses[field.id] ?? ""}
                        onChange={(e) => setResponses((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        className="rounded-xl"
                        disabled={submitted || !selectedForm?.can_submit}
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={responses[field.id] ?? ""}
                        onChange={(e) => setResponses((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                        disabled={submitted || !selectedForm?.can_submit}
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={responses[field.id] ?? ""}
                        onChange={(e) => setResponses((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={field.placeholder ?? ""}
                        className="rounded-xl"
                        disabled={submitted || !selectedForm?.can_submit}
                      />
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {hasFields ? (
              <div className="flex items-center justify-between border-t border-border px-7 py-5">
                <p className="text-xs text-muted-foreground">
                  Sua resposta ficará registrada para acompanhamento clínico.
                </p>
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm font-medium text-emerald-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Enviado!
                    </motion.div>
                  ) : (
                    <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Button
                        onClick={() => void handleSubmit()}
                        disabled={saving || !canSubmit}
                        className="gap-2"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {saving ? "Enviando..." : selectedForm?.can_submit ? "Enviar resposta" : "Formulário concluído"}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}
          </div>
        </motion.div>

        {entries.length > 0 ? (
          <motion.div className="mt-10 space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <h2 className="font-serif text-xl font-medium text-foreground">
              Respostas enviadas
            </h2>
            {entries.map((entry) => {
              const form = forms.find((item) => item.id === entry.form_id);
              const data = ((entry as unknown as { data?: Record<string, unknown>; content?: Record<string, unknown> }).data
                ?? (entry as unknown as { content?: Record<string, unknown> }).content
                ?? {}) as Record<string, unknown>;

              return (
                <div key={entry.id} className="rounded-2xl border border-border bg-card/60 p-5">
                  <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDatetime(entry.created_at)}</span>
                    {form ? <span className="ml-1 rounded-full bg-muted px-2 py-0.5">{form.name}</span> : null}
                  </div>
                  <div className="space-y-3">
                    {Object.entries(data).map(([key, value]) => {
                      const fieldDef = form?.fields?.find((field) => field.id === key);
                      return (
                        <div key={key} className="rounded-xl bg-muted/40 px-4 py-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {fieldDef?.label ?? key}
                          </p>
                          <p className="text-sm text-foreground">{String(value || "Não respondido")}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
