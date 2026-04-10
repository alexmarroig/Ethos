import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileDown, FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { reportService, type Report } from "@/services/reportService";
import { patientService, type Patient } from "@/services/patientService";
import { sessionService, type Session } from "@/services/sessionService";
import { aiService } from "@/services/aiService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildReportHtml,
  downloadReportDoc,
  openReportPrintPreview,
} from "@/lib/reportBuilders";

const purposes = [
  { id: "profissional", label: "Uso profissional" },
  { id: "paciente", label: "Entrega ao paciente" },
  { id: "instituição", label: "Instituição / terceiro" },
];

const attendanceTypes = [
  "Psicoterapia individual",
  "Psicoterapia online",
  "Psicoterapia presencial",
  "Orientação",
  "Sessão de acolhimento",
];

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

const buildInitialReportBody = (input: {
  psychologistName: string;
  crp?: string;
  patientName?: string;
  dateLabel: string;
  attendanceType: string;
}) => `RELATÓRIO DE SESSÃO PSICOLÓGICA

Psicólogo(a): ${input.psychologistName}
CRP: ${input.crp || ""}
Paciente: ${input.patientName || ""}
Data: ${input.dateLabel}
Tipo de atendimento: ${input.attendanceType}

1. Demanda / Contexto:

2. Descrição da sessão:

3. Intervenções realizadas:

4. Impressões clínicas:

5. Encaminhamentos / Plano:
`;

type ReportEditorState = {
  patient_id: string;
  session_id: string;
  purpose: string;
  attendanceType: string;
  content: string;
  sourceText: string;
};

const createEmptyEditor = (defaultPurpose: string, psychologistName: string, crp?: string): ReportEditorState => ({
  patient_id: "",
  session_id: "",
  purpose: defaultPurpose,
  attendanceType: attendanceTypes[0],
  content: buildInitialReportBody({
    psychologistName,
    crp,
    dateLabel: new Date().toLocaleDateString("pt-BR"),
    attendanceType: attendanceTypes[0],
  }),
  sourceText: "",
});

const ReportsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editor, setEditor] = useState<ReportEditorState>(() => createEmptyEditor(purposes[0].id, "Psicólogo(a)"));

  useEffect(() => {
    const load = async () => {
      const [reportsRes, patientsRes, sessionsRes] = await Promise.all([
        reportService.list(),
        patientService.list(),
        sessionService.list(),
      ]);

      if (!reportsRes.success) {
        setError({ message: reportsRes.error.message, requestId: reportsRes.request_id });
      } else {
        setReports(reportsRes.data);
      }

      if (patientsRes.success) {
        setPatients(patientsRes.data);
      }

      if (sessionsRes.success) {
        setSessions(sessionsRes.data);
      }

      setLoading(false);
    };

    void load();
  }, []);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === editor.patient_id),
    [patients, editor.patient_id],
  );

  const availableSessions = useMemo(
    () => sessions.filter((session) => !editor.patient_id || session.patient_id === editor.patient_id),
    [sessions, editor.patient_id],
  );

  const updateEditor = <K extends keyof ReportEditorState>(key: K, value: ReportEditorState[K]) => {
    setEditor((current) => ({ ...current, [key]: value }));
  };

  const syncLocalReport = (nextReport: Report) => {
    setReports((current) => {
      const exists = current.some((report) => report.id === nextReport.id);
      return exists
        ? current.map((report) => (report.id === nextReport.id ? nextReport : report))
        : [nextReport, ...current];
    });
    setSelectedReportId(nextReport.id);
  };

  const handlePatientChange = (patientId: string) => {
    const patient = patients.find((item) => item.id === patientId);
    setEditor((current) => ({
      ...current,
      patient_id: patientId,
      session_id: "",
      content: buildInitialReportBody({
        psychologistName: user?.name || "Psicólogo(a)",
        crp: user?.crp,
        patientName: patient?.name,
        dateLabel: new Date().toLocaleDateString("pt-BR"),
        attendanceType: current.attendanceType,
      }),
    }));
  };

  const handleOpenNew = () => {
    setSelectedReportId(null);
    setEditor(createEmptyEditor(purposes[0].id, user?.name || "Psicólogo(a)", user?.crp));
    setDialogOpen(true);
  };

  const handleOpenExisting = (report: Report) => {
    const patient = patients.find((item) => item.id === report.patient_id);
    setSelectedReportId(report.id);
    setEditor({
      patient_id: report.patient_id,
      session_id: "",
      purpose: report.purpose,
      attendanceType: attendanceTypes[0],
      content: report.content || buildInitialReportBody({
        psychologistName: user?.name || "Psicólogo(a)",
        crp: user?.crp,
        patientName: patient?.name || report.patient_name,
        dateLabel: formatDate(report.created_at),
        attendanceType: attendanceTypes[0],
      }),
      sourceText: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (markAsFinal = false) => {
    if (!editor.patient_id || !editor.content.trim()) return;
    setSaving(true);

    const payload = {
      patient_id: editor.patient_id,
      purpose: editor.purpose,
      content: editor.content.trim(),
      status: markAsFinal ? ("final" as const) : ("draft" as const),
    };

    const result = selectedReportId
      ? await reportService.update(selectedReportId, payload)
      : await reportService.create(payload);

    setSaving(false);

    if (!result.success) {
      toast({ title: "Erro ao salvar relatório", description: result.error.message, variant: "destructive" });
      return;
    }

    syncLocalReport(result.data);
    toast({ title: markAsFinal ? "Relatório finalizado" : "Relatório salvo" });
  };

  const handleImportTranscript = async () => {
    if (!editor.session_id) {
      toast({ title: "Selecione uma sessão", description: "Escolha a sessão para puxar a transcrição.", variant: "destructive" });
      return;
    }

    const result = await sessionService.getTranscript(editor.session_id);
    if (!result.success) {
      toast({ title: "Transcrição não encontrada", description: result.error.message, variant: "destructive" });
      return;
    }

    setEditor((current) => ({ ...current, sourceText: result.data.raw_text }));
    toast({ title: "Transcrição carregada", description: "A transcrição da sessão foi trazida para o campo de apoio." });
  };

  const handleImproveWithAi = async (mode: "manual" | "transcript") => {
    const sourceText = editor.sourceText.trim() || editor.content.trim();
    if (!sourceText) {
      toast({ title: "Falta conteúdo", description: "Escreva anotações ou carregue uma transcrição para usar a IA.", variant: "destructive" });
      return;
    }

    setImproving(true);
    const payload = {
      psychologist_name: user?.name || "Psicólogo(a)",
      crp: user?.crp,
      patient_name: selectedPatient?.name,
      date_label: new Date().toLocaleDateString("pt-BR"),
      attendance_type: editor.attendanceType,
      text: sourceText,
    };

    const result = mode === "transcript"
      ? await aiService.improveTranscriptReport(payload)
      : await aiService.improveManualReport(payload);

    setImproving(false);

    if (!result.success) {
      toast({ title: "IA indisponível", description: result.error.message, variant: "destructive" });
      return;
    }

    setEditor((current) => ({ ...current, content: result.data.organized_text }));
    toast({ title: "Relatório melhorado", description: "A IA estruturou o relatório diretamente no campo principal." });
  };

  const handlePrintPdf = () => {
    const html = buildReportHtml({
      report: {
        id: selectedReportId ?? "preview",
        patient_id: editor.patient_id,
        patient_name: selectedPatient?.name,
        purpose: editor.purpose,
        content: editor.content,
        status: "draft",
        created_at: new Date().toISOString(),
      },
      patient: selectedPatient,
      psychologistName: user?.name || "Psicólogo(a)",
      crp: user?.crp,
    });
    const ok = openReportPrintPreview(html);
    if (!ok) {
      toast({ title: "Não foi possível abrir o PDF", description: "Verifique se o navegador bloqueou a janela.", variant: "destructive" });
    }
  };

  const handleDownloadDoc = () => {
    const html = buildReportHtml({
      report: {
        id: selectedReportId ?? "preview",
        patient_id: editor.patient_id,
        patient_name: selectedPatient?.name,
        purpose: editor.purpose,
        content: editor.content,
        status: "draft",
        created_at: new Date().toISOString(),
      },
      patient: selectedPatient,
      psychologistName: user?.name || "Psicólogo(a)",
      crp: user?.crp,
    });
    downloadReportDoc(`relatorio-${selectedReportId ?? "preview"}.doc`, html);
    toast({ title: "DOC gerado", description: "O relatório foi baixado em formato compatível com Word." });
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
            Escreva no modelo clínico, puxe a transcrição da sessão quando houver e refine com IA sem mostrar prompt ao usuário.
          </p>
        </motion.header>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">Relatórios gerados</h2>
            <Button variant="secondary" size="sm" className="gap-2" onClick={handleOpenNew}>
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Novo relatório
            </Button>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum relatório criado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => handleOpenExisting(report)}
                  className="session-card w-full text-left"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg font-medium text-foreground">
                        {report.patient_name ?? patients.find((patient) => patient.id === report.patient_id)?.name ?? "Paciente"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {purposes.find((option) => option.id === report.purpose)?.label ?? report.purpose} · {formatDate(report.created_at)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {report.status === "final" ? "Final" : "Rascunho"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                {selectedReportId ? "Editar relatório" : "Novo relatório"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <select
                    value={editor.patient_id}
                    onChange={(event) => handlePatientChange(event.target.value)}
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
                    value={editor.purpose}
                    onChange={(event) => updateEditor("purpose", event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {purposes.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={editor.session_id}
                    onChange={(event) => updateEditor("session_id", event.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Sessão vinculada (opcional)</option>
                    {availableSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.patient_name} · {session.date} {session.time}
                      </option>
                    ))}
                  </select>

                  <Input
                    value={editor.attendanceType}
                    onChange={(event) => updateEditor("attendanceType", event.target.value)}
                    placeholder="Tipo de atendimento"
                    list="attendance-types"
                  />
                  <datalist id="attendance-types">
                    {attendanceTypes.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Campo principal do relatório. A psicóloga escreve aqui normalmente e pode usar a IA para refinar.
                  </p>
                  <Textarea
                    value={editor.content}
                    onChange={(event) => updateEditor("content", event.target.value)}
                    className="min-h-[340px]"
                  />
                </div>

                <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
                  <div>
                    <h3 className="font-serif text-lg text-foreground">Fonte para IA</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No web você pode escrever anotações livres ou carregar a transcrição de uma sessão já processada.
                    </p>
                  </div>

                  <Textarea
                    value={editor.sourceText}
                    onChange={(event) => updateEditor("sourceText", event.target.value)}
                    placeholder="Cole anotações clínicas ou use o botão para carregar a transcrição da sessão."
                    className="min-h-[180px]"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => void handleImportTranscript()} disabled={!editor.session_id}>
                      Carregar transcrição da sessão
                    </Button>
                    <Button type="button" variant="outline" className="gap-2" onClick={() => void handleImproveWithAi("manual")} disabled={improving || !(editor.sourceText.trim() || editor.content.trim())}>
                      {improving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Melhorar com IA
                    </Button>
                    <Button type="button" variant="outline" className="gap-2" onClick={() => void handleImproveWithAi("transcript")} disabled={improving || !(editor.sourceText.trim() || editor.content.trim())}>
                      {improving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Usar transcrição do áudio
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
                <div>
                  <h3 className="font-serif text-lg text-foreground">Preview do relatório</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Revise como o relatório ficará antes de salvar e exportar.
                  </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-border bg-white">
                  <iframe
                    title="Preview do relatório"
                    srcDoc={buildReportHtml({
                      report: {
                        id: selectedReportId ?? "preview",
                        patient_id: editor.patient_id,
                        patient_name: selectedPatient?.name,
                        purpose: editor.purpose,
                        content: editor.content,
                        status: "draft",
                        created_at: new Date().toISOString(),
                      },
                      patient: selectedPatient,
                      psychologistName: user?.name || "Psicólogo(a)",
                      crp: user?.crp,
                    })}
                    className="h-[520px] w-full bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-wrap gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={handlePrintPdf}>
                  <FileDown className="w-4 h-4" />
                  PDF
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={handleDownloadDoc}>
                  <FileDown className="w-4 h-4" />
                  DOC
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Fechar
                </Button>
                <Button onClick={() => void handleSave(false)} disabled={saving || !editor.patient_id || !editor.content.trim()} className="gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar rascunho
                </Button>
                <Button onClick={() => void handleSave(true)} disabled={saving || !editor.patient_id || !editor.content.trim()} className="gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Finalizar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ReportsPage;
