import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { patientPortalService } from "@/services/patientPortalService";
import type { Form, FormEntry } from "@/services/formService";
import { useToast } from "@/hooks/use-toast";

export default function PatientDiaryPage() {
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const formsRes = await patientPortalService.listForms();
      if (formsRes.success) {
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
    setResponses(Object.fromEntries((selectedForm?.fields ?? []).map((field) => [field.id, ""])));
  }, [selectedForm]);

  const handleSubmit = async () => {
    if (!selectedFormId) return;
    setSaving(true);
    const result = await patientPortalService.createFormEntry({
      form_id: selectedFormId,
      content: responses,
    });
    setSaving(false);

    if (!result.success) {
      toast({ title: "Erro", description: result.error.message, variant: "destructive" });
      return;
    }

    setEntries((current) => [result.data, ...current]);
    toast({ title: "Formulário enviado", description: "Sua psicóloga já poderá visualizar essa resposta." });
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando formulários...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Diário e formulários</h1>
          <p className="mt-2 text-muted-foreground">Preencha os formulários que sua psicóloga deixou disponíveis.</p>
        </motion.header>

        <div className="rounded-[28px] border border-border bg-card p-6 md:p-8 shadow-[0_18px_40px_rgba(23,49,58,0.08)]">
          <select value={selectedFormId} onChange={(event) => setSelectedFormId(event.target.value)} className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm">
            {forms.map((form) => (
              <option key={form.id} value={form.id}>{form.name}</option>
            ))}
          </select>

          {selectedForm ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl bg-muted/40 px-5 py-5">
                <h2 className="font-serif text-2xl text-foreground">{selectedForm.name}</h2>
                {selectedForm.description ? <p className="mt-2 text-sm text-muted-foreground">{selectedForm.description}</p> : null}
              </div>

              {(selectedForm.fields ?? []).map((field, index) => (
                <div key={field.id} className="rounded-2xl border border-border bg-background px-5 py-5 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pergunta {index + 1}</p>
                    <label className="mt-2 block font-medium text-foreground">{field.label}</label>
                  </div>

                  {field.type === "textarea" ? (
                    <Textarea value={responses[field.id] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} placeholder={field.placeholder} />
                  ) : field.type === "date" ? (
                    <Input type="date" value={responses[field.id] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} />
                  ) : field.type === "select" ? (
                    <select value={responses[field.id] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm">
                      <option value="">Selecione</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <Input value={responses[field.id] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [field.id]: event.target.value }))} placeholder={field.placeholder} />
                  )}
                </div>
              ))}

              <Button onClick={() => void handleSubmit()} disabled={saving} className="w-full md:w-auto">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submeter
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum formulário disponível.</p>
            </div>
          )}
        </div>

        {entries.length > 0 ? (
          <div className="mt-8 space-y-3">
            <h2 className="font-serif text-lg font-medium text-foreground">Respostas enviadas</h2>
            {entries.map((entry) => (
              <div key={entry.id} className="session-card space-y-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                {entry.data && typeof entry.data === "object"
                  ? Object.entries(entry.data as Record<string, string>).map(([key, val]) => (
                      <div key={key}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{key}</p>
                        <p className="text-sm text-foreground">{String(val) || "—"}</p>
                      </div>
                    ))
                  : <p className="text-sm text-foreground/70">{String(entry.data)}</p>
                }
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
