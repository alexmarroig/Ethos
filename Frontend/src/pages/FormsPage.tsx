import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ClipboardList, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

type DiaryEntry = {
  id: string;
  date?: string;
  description?: string;
  thoughts?: string;
  mood?: number;
  intensity?: number;
  created_at?: string;
};

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

const FormsPage = () => {
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientForDiary, setSelectedPatientForDiary] = useState("");
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [entryData, setEntryData] = useState("");

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

      if (entriesRes.success) {
        setEntries(entriesRes.data);
      }

      if (patientsRes.success) {
        setPatients(patientsRes.data);
        setSelectedPatientForDiary((current) => current || patientsRes.data[0]?.id || "");
      }

      setLoading(false);
    };

    void load();
  }, []);

  useEffect(() => {
    const loadDiary = async () => {
      if (!selectedPatientForDiary) {
        setDiaryEntries([]);
        return;
      }
      const result = await patientService.getById(selectedPatientForDiary);
      if (result.success) {
        setDiaryEntries((result.data.emotional_diary as DiaryEntry[]) ?? []);
      }
    };

    void loadDiary();
  }, [selectedPatientForDiary]);

  const patientNames = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient.name])),
    [patients],
  );

  const handleCreateEntry = async () => {
    if (!selectedFormId || !patientId) return;
    setCreating(true);
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(entryData || "{}");
    } catch {
      parsed = { text: entryData };
    }

    const result = await formService.createEntry({
      form_id: selectedFormId,
      patient_id: patientId,
      data: parsed,
    });

    if (!result.success) {
      toast({ title: "Erro ao registrar formulário", description: result.error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    setEntries((current) => [result.data, ...current]);
    setDialogOpen(false);
    setPatientId("");
    setEntryData("");
    setCreating(false);
    toast({ title: "Entrada registrada" });
  };

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
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Diário e formulários</h1>
          <p className="mt-2 text-muted-foreground">
            Diário emocional do paciente, anamnese inicial e formulários de acompanhamento entre sessões.
          </p>
        </motion.header>

        <motion.section
          className="mb-8 rounded-xl border border-border bg-card p-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">Diário emocional</h2>
              <p className="text-sm text-muted-foreground mt-1">Visualize os registros enviados pelo paciente.</p>
            </div>

            <select
              value={selectedPatientForDiary}
              onChange={(event) => setSelectedPatientForDiary(event.target.value)}
              className="flex h-11 min-w-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma entrada de diário emocional para este paciente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diaryEntries.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-foreground">
                      Humor {entry.mood ?? "-"} · Intensidade {entry.intensity ?? "-"}
                    </p>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.date ?? entry.created_at)}</span>
                  </div>
                  {(entry.description || entry.thoughts) && (
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {entry.description ?? entry.thoughts}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">Formulários disponíveis</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Nova entrada
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Nova entrada</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <select
                    value={selectedFormId}
                    onChange={(event) => setSelectedFormId(event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Selecione o formulário</option>
                    {forms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={patientId}
                    onChange={(event) => setPatientId(event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Selecione o paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    placeholder="Dados do formulário em texto livre ou JSON"
                    value={entryData}
                    onChange={(event) => setEntryData(event.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateEntry} disabled={creating || !selectedFormId || !patientId} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 mb-6">
            {forms.map((form) => (
              <div key={form.id} className="session-card">
                <h3 className="font-serif text-lg font-medium text-foreground">{form.name}</h3>
                {form.description && <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>}
              </div>
            ))}
          </div>

          <h3 className="font-serif text-lg font-medium text-foreground mb-3">Entradas registradas</h3>
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma entrada registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.slice(0, 8).map((entry) => (
                <div key={entry.id} className="session-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg font-medium text-foreground">
                        {forms.find((form) => form.id === entry.form_id)?.name ?? entry.form_id}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {patientNames.get(entry.patient_id) ?? "Paciente"} · {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </div>
                  <pre className="mt-3 text-xs whitespace-pre-wrap text-foreground/70 bg-muted/50 rounded-lg p-3 overflow-auto">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default FormsPage;
