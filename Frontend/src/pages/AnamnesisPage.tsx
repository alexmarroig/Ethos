import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { anamnesisService, type Anamnesis } from "@/services/anamnesisService";
import { patientService, type Patient } from "@/services/patientService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import { usePrivacy } from "@/hooks/usePrivacy";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const templates = [
  { id: "initial-anamnesis", label: "Anamnese inicial" },
  { id: "follow-up-anamnesis", label: "Complemento de anamnese" },
  { id: "child-anamnesis", label: "Anamnese infantil" },
];

const fieldLabels: Record<string, string> = {
  personal_history: "Histórico pessoal",
  family_history: "Histórico familiar",
  psychiatric_history: "Histórico psiquiátrico",
  medication: "Medicação em uso",
  relevant_events: "Eventos relevantes",
};

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

const summarizeContent = (content: Record<string, string>) =>
  Object.entries(content)
    .filter(([, value]) => typeof value === "string" && value.trim())
    .slice(0, 2)
    .map(([key, value]) => `${fieldLabels[key] ?? key}: ${value}`)
    .join(" • ");

const AnamnesisPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { toast } = useToast();
  const { maskName } = usePrivacy();
  const [records, setRecords] = useState<Anamnesis[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Anamnesis | null>(null);
  const [creating, setCreating] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [personalHistory, setPersonalHistory] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");
  const [psychiatricHistory, setPsychiatricHistory] = useState("");
  const [medication, setMedication] = useState("");
  const [relevantEvents, setRelevantEvents] = useState("");

  // Expanded record
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [recordsRes, patientsRes] = await Promise.all([
        anamnesisService.list(),
        patientService.list(),
      ]);

      if (!recordsRes.success) {
        setError({ message: recordsRes.error.message, requestId: recordsRes.request_id });
      } else {
        setRecords(recordsRes.data);
      }

      if (patientsRes.success) {
        setPatients(patientsRes.data);
      }

      setLoading(false);
    };

    void load();
  }, []);

  const patientNames = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient.name])),
    [patients],
  );

  const resetForm = () => {
    setPatientId("");
    setTemplateId(templates[0].id);
    setPersonalHistory("");
    setFamilyHistory("");
    setPsychiatricHistory("");
    setMedication("");
    setRelevantEvents("");
    setEditingRecord(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (record: Anamnesis) => {
    setEditingRecord(record);
    setPatientId(record.patient_id);
    setTemplateId(record.template ?? templates[0].id);
    setPersonalHistory(record.content.personal_history ?? "");
    setFamilyHistory(record.content.family_history ?? "");
    setPsychiatricHistory(record.content.psychiatric_history ?? "");
    setMedication(record.content.medication ?? "");
    setRelevantEvents(record.content.relevant_events ?? "");
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!patientId) return;

    setCreating(true);
    const result = await anamnesisService.create({
      patient_id: patientId,
      template: templateId,
      content: {
        personal_history: personalHistory.trim(),
        family_history: familyHistory.trim(),
        psychiatric_history: psychiatricHistory.trim(),
        medication: medication.trim(),
        relevant_events: relevantEvents.trim(),
      },
    });

    if (!result.success) {
      toast({ title: "Erro ao salvar anamnese", description: result.error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    if (editingRecord) {
      setRecords((current) =>
        current.map((r) => (r.id === editingRecord.id ? result.data : r)),
      );
    } else {
      setRecords((current) => [result.data, ...current]);
    }

    resetForm();
    setDialogOpen(false);
    setCreating(false);
    toast({ title: editingRecord ? "Anamnese atualizada" : "Anamnese registrada" });
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Carregando anamneses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Anamnese</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen"}>
      <div className={embedded ? "" : "content-container py-8 md:py-12"}>
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {!embedded && <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Anamnese
          </h1>}
          <p className="mt-2 text-muted-foreground">
            Coleta inicial do caso com histórico pessoal, familiar e psiquiátrico.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">
              Registros de anamnese
            </h2>

            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                if (!open) resetForm();
                setDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2" onClick={openCreate}>
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Nova anamnese
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">
                    {editingRecord ? "Editar anamnese" : "Nova anamnese"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <select
                    value={patientId}
                    onChange={(event) => setPatientId(event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Selecione o paciente</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {maskName(patient.name)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>

                  <Textarea placeholder="Histórico pessoal" value={personalHistory} onChange={(event) => setPersonalHistory(event.target.value)} />
                  <Textarea placeholder="Histórico familiar" value={familyHistory} onChange={(event) => setFamilyHistory(event.target.value)} />
                  <Textarea placeholder="Histórico psiquiátrico" value={psychiatricHistory} onChange={(event) => setPsychiatricHistory(event.target.value)} />
                  <Textarea placeholder="Medicamentos e condutas em uso" value={medication} onChange={(event) => setMedication(event.target.value)} />
                  <Textarea placeholder="Eventos relevantes" value={relevantEvents} onChange={(event) => setRelevantEvents(event.target.value)} />
                </div>

                <DialogFooter>
                  <Button onClick={handleCreate} disabled={creating || !patientId} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingRecord ? "Salvar alterações" : "Salvar anamnese"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhuma anamnese registrada ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => {
                const isExpanded = expandedRecordId === record.id;
                return (
                  <div
                    key={record.id}
                    className="session-card cursor-pointer select-none"
                    onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-lg font-medium text-foreground">
                          {patientNames.get(record.patient_id) ?? "Paciente"}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {templates.find((t) => t.id === record.template)?.label ?? record.template ?? "Anamnese"} · {formatDate(record.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(record);
                          }}
                        >
                          Editar
                        </Button>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          v{record.version}
                        </span>
                      </div>
                    </div>

                    {!isExpanded && (
                      <p className="mt-3 text-sm text-foreground/80">
                        {summarizeContent(record.content) || "Sem conteúdo detalhado."}
                      </p>
                    )}

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="expanded"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-2">
                            {Object.entries(record.content)
                              .filter(([, value]) => typeof value === "string" && value.trim())
                              .map(([key, value]) => (
                                <div key={key} className="bg-muted/40 rounded-xl px-4 py-3">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                                    {fieldLabels[key] ?? key}
                                  </p>
                                  <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {value}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AnamnesisPage;
