import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportService, type Report } from "@/services/reportService";
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

const purposes = [
  { id: "profissional", label: "Uso profissional" },
  { id: "paciente", label: "Entrega ao paciente" },
  { id: "instituição", label: "Instituição / terceiro" },
];

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

const ReportsPage = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [purpose, setPurpose] = useState(purposes[0].id);
  const [content, setContent] = useState("");

  useEffect(() => {
    const load = async () => {
      const [reportsRes, patientsRes] = await Promise.all([
        reportService.list(),
        patientService.list(),
      ]);

      if (!reportsRes.success) {
        setError({ message: reportsRes.error.message, requestId: reportsRes.request_id });
      } else {
        setReports(reportsRes.data);
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

  const handleCreate = async () => {
    if (!patientId || !content.trim()) return;

    setCreating(true);
    const result = await reportService.create({
      patient_id: patientId,
      purpose,
      content: content.trim(),
    });

    if (!result.success) {
      toast({ title: "Erro ao criar relatório", description: result.error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    setReports((current) => [result.data, ...current]);
    setDialogOpen(false);
    setPatientId("");
    setPurpose(purposes[0].id);
    setContent("");
    setCreating(false);
    toast({ title: "Relatório criado" });
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Preparando relatórios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Relatórios</h1>
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
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Relatórios</h1>
          <p className="mt-2 text-muted-foreground">
            Relatórios psicológicos para terceiros, paciente ou uso interno, sempre com revisão humana.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">Relatórios gerados</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Novo relatório
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Novo relatório</DialogTitle>
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
                        {patient.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={purpose}
                    onChange={(event) => setPurpose(event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {purposes.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <Textarea
                    placeholder="Escreva o rascunho inicial do relatório. Depois você pode revisar e complementar."
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className="min-h-[180px]"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={creating || !patientId || !content.trim()} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Criar relatório
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum relatório criado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="session-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg font-medium text-foreground">
                        {report.patient_name ?? patientNames.get(report.patient_id) ?? "Paciente"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {purposes.find((option) => option.id === report.purpose)?.label ?? report.purpose} · {formatDate(report.created_at)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {report.status === "final" ? "Final" : "Rascunho"}
                    </span>
                  </div>
                  {report.content && (
                    <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap">
                      {report.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ReportsPage;
