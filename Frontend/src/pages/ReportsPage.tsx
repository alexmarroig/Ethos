import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportService, type Report } from "@/services/reportService";
import { patientService, type Patient } from "@/services/patientService";
import { ReportWizard } from "@/components/ReportWizard";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";
import { KIND_META } from "@/lib/reportBuilders";

const TEXT = {
  title: "Relat\u00f3rios",
  preparing: "Preparando relat\u00f3rios...",
  empty: "Nenhum relat\u00f3rio criado ainda.",
  createFirst: "Criar primeiro relat\u00f3rio",
  createNew: "Novo relat\u00f3rio",
  generated: "Relat\u00f3rios gerados",
  summary: "Relat\u00f3rios profissionais com contexto cl\u00ednico estruturado.",
  genericReport: "Relat\u00f3rio",
} as const;

const PURPOSES: Record<string, string> = {
  profissional: "Uso profissional",
  paciente: "Entrega ao paciente",
  instituicao: "Institui\u00e7\u00e3o / terceiro",
  "institui\u00e7\u00e3o": "Institui\u00e7\u00e3o / terceiro",
};

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | undefined>(undefined);

  const loadData = async () => {
    const [reportsRes, patientsRes] = await Promise.all([
      reportService.list(),
      patientService.list(),
    ]);

    if (!reportsRes.success) {
      setError({ message: reportsRes.error.message, requestId: reportsRes.request_id });
    } else {
      setReports(reportsRes.data);
      setError(null);
    }

    if (patientsRes.success) setPatients(patientsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openNew = () => {
    setEditingReport(undefined);
    setWizardOpen(true);
  };

  const openExisting = (report: Report) => {
    setEditingReport(report);
    setWizardOpen(true);
  };

  const handleSaved = () => {
    void loadData();
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">{TEXT.preparing}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="mb-6 font-serif text-3xl font-medium text-foreground">{TEXT.title}</h1>
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
        >
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
            {TEXT.title}
          </h1>
          <p className="mt-2 text-muted-foreground">{TEXT.summary}</p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-foreground">{TEXT.generated}</h2>
            <Button variant="secondary" size="sm" className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {TEXT.createNew}
            </Button>
          </div>

          {reports.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{TEXT.empty}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openNew}>
                {TEXT.createFirst}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const patient = patients.find((item) => item.id === report.patient_id);
                const kindMeta = report.kind ? KIND_META[report.kind] : undefined;
                const purposeLabel = PURPOSES[report.purpose] ?? report.purpose;

                return (
                  <div key={report.id} className="session-card">
                    <button
                      type="button"
                      onClick={() => openExisting(report)}
                      className="w-full text-left"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {kindMeta ? (
                            <span className="mt-0.5 text-2xl leading-none" aria-hidden>
                              {kindMeta.icon}
                            </span>
                          ) : null}

                          <div>
                            <h3 className="font-serif text-lg font-medium text-foreground">
                              {patient?.name ?? report.patient_name ?? "Paciente"}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {kindMeta?.label ?? TEXT.genericReport} · {purposeLabel} ·{" "}
                              {formatDate(report.created_at)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            report.status === "final"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {report.status === "final" ? "Final" : "Rascunho"}
                        </span>
                      </div>
                    </button>

                    <div className="mt-3 flex gap-2">
                      <ShareWithPatientButton
                        type="reports"
                        id={report.id}
                        shared={
                          (report as unknown as { shared_with_patient?: boolean })
                            .shared_with_patient ?? false
                        }
                        onToggle={(shared) =>
                          setReports((prev) =>
                            prev.map((item) =>
                              item.id === report.id
                                ? ({ ...item, shared_with_patient: shared } as unknown as Report)
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <ReportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        patients={patients}
        editingReport={editingReport}
        onSaved={handleSaved}
      />
    </div>
  );
}
