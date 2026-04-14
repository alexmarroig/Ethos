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
  { id: "instituicao", label: "Instituição / terceiro" },
];

const reportKinds = [
  { id: "session_report", label: "Relatório de sessão" },
  { id: "longitudinal_record", label: "Prontuário / relatório longitudinal" },
] as const;

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

type ReportKind = "session_report" | "longitudinal_record";

type ReportEditorState = {
  patient_id: string;
  session_id: string;
  kind: ReportKind;
  purpose: string;
  attendanceType: string;
  content: string;
  sourceText: string;
};

const buildInitialReportBody = (input: {
  psychologistName: string;
  crp?: string;
  patient?: Patient;
  dateLabel: string;
  attendanceType: string;
  kind: ReportKind;
}) =>
  input.kind === "longitudinal_record"
    ? `${input.psychologistName.toUpperCase()}
PSICÓLOGA CLÍNICA | CRP ${input.crp || ""}

Psicoterapia

PRONTUÁRIO Nº

NOME: ${input.patient?.name || ""}
DATA DE NASCIMENTO: ${input.patient?.birth_date || ""}
IDADE:
FILIAÇÃO:
PAI:
MÃE:
RESPONSÁVEL:

TIPO DE ATENDIMENTO: ${input.attendanceType}

TÉCNICAS E INSTRUMENTOS UTILIZADOS:

PERÍODO DE ATENDIMENTO: ${input.dateLabel} A
NÚMERO DE SESSÕES:
NÚMERO DE FALTAS:

ENCAMINHAMENTOS INTERNOS A OUTROS SERVIÇOS:

DEMANDA INICIAL:

EVOLUÇÃO DO ATENDIMENTO

Sessão nº 1 - ${input.dateLabel}
Formato:
Conteúdo:

Intervenções:

Plano:
`
    : `RELATÓRIO DE SESSÃO PSICOLÓGICA

Psicólogo(a): ${input.psychologistName}
CRP: ${input.crp || ""}
Paciente: ${input.patient?.name || ""}
Data: ${input.dateLabel}
Tipo de atendimento: ${input.attendanceType}

1. Demanda / Contexto:

2. Descrição da sessão:

3. Intervenções realizadas:

4. Impressões clínicas:

5. Encaminhamentos / Plano:
`;

const createEmptyEditor = (psychologistName: string, crp?: string): ReportEditorState => ({
  patient_id: "",
  session_id: "",
  kind: "session_report",
  purpose: purposes[0].id,
  attendanceType: attendanceTypes[0],
  content: buildInitialReportBody({
    psychologistName,
    crp,
    dateLabel: new Date().toLocaleDateString("pt-BR"),
    attendanceType: attendanceTypes[0],
    kind: "session_report",
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
  const [editor, setEditor] = useState<ReportEditorState>(() =>
    createEmptyEditor("Psicóloga responsável"),
  );

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

  const rebuildContent = (next: Partial<ReportEditorState>) => {
    const patient = patients.find((item) => item.id === (next.patient_id ?? editor.patient_id));
    const kind = (next.kind ?? editor.kind) as ReportKind;
    const attendanceType = next.attendanceType ?? editor.attendanceType;
    setEditor((current) => ({
      ...current,
      ...next,
      content: buildInitialReportBody({
        psychologistName: user?.name || "Psicóloga responsável",
        crp: user?.crp,
        patient,
        dateLabel: new Date().toLocaleDateString("pt-BR"),
        attendanceType,
        kind,
      }),
    }));
  };

  const handleOpenNew = () => {
    setSelectedReportId(null);
    setEditor(createEmptyEditor(user?.name || "Psicóloga responsável", user?.crp));
    setDialogOpen(true);
  };

  const handleOpenExisting = (report: Report) => {
    const patient = patients.find((item) => item.id === report.patient_id);
    const kind = report.kind ?? "session_report";
    setSelectedReportId(report.id);
    setEditor({
      patient_id: report.patient_id,
      session_id: "",
      kind,
      purpose: report.purpose,
      attendanceType: attendanceTypes[0],
      content:
        report.content ||
        buildInitialReportBody({
          psychologistName: user?.name || "Psicóloga responsável",
          crp: user?.crp,
          patient,
          dateLabel: formatDate(report.created_at),
          attendanceType: attendanceTypes[0],
          kind,
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
      kind: editor.kind,
      content: editor.content.trim(),
      status: markAsFinal ? ("final" as const) : ("draft" as const),
    };

    const result = selectedReportId
      ? await reportService.update(selectedReportId, payload)
      : await reportService.create(payload);

    setSaving(false);

    if (!result.success) {
      toast({
        title: "Erro ao salvar relatório",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    syncLocalReport(result.data);
    toast({ title: markAsFinal ? "Relatório finalizado" : "Relatório salvo" });
  };

  const handleImportTranscript = async () => {
    if (!editor.session_id) {
      toast({
        title: "Selecione uma sessão",
        description: "Escolha a sessão para puxar a transcrição.",
        variant: "destructive",
      });
      return;
    }

    const result = await sessionService.getTranscript(editor.session_id);
    if (!result.success) {
      toast({
        title: "Transcrição não encontrada",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setEditor((current) => ({ ...current, sourceText: result.data.raw_text }));
    toast({
      title: "Transcrição carregada",
      description: "A transcrição da sessão foi trazida para o campo de apoio.",
    });
  };

  const handleImproveWithAi = async (mode: "manual" | "transcript") => {
    const sourceText = editor.sourceText.trim() || editor.content.trim();
    if (!sourceText) {
      toast({
        title: "Falta conteúdo",
        description: "Escreva anotações ou carregue uma transcrição para usar a IA.",
        variant: "destructive",
      });
      return;
    }

    setImproving(true);
    const payload = {
      psychologist_name: user?.name || "Psicóloga responsável",
      crp: user?.crp,
      patient_name: selectedPatient?.name,
      date_label: new Date().toLocaleDateString("pt-BR"),
      attendance_type: editor.attendanceType,
      text: sourceText,
    };

    const result =
      mode === "transcript"
        ? await aiService.improveTranscriptReport(payload)
        : await aiService.improveManualReport(payload);

    setImproving(false);

    if (!result.success) {
      toast({
        title: "IA indisponível",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    setEditor((current) => ({ ...current, content: result.data.organized_text }));
    toast({
      title: "Relatório melhorado",
      description: "A IA estruturou o relatório no campo principal.",
    });
  };

  const previewHtml = buildReportHtml({
    report: {
      id: selectedReportId ?? "preview",
      patient_id: editor.patient_id,
      patient_name: selectedPatient?.name,
      purpose: editor.purpose,
      kind: editor.kind,
      content: editor.content,
      status: "draft",
      created_at: new Date().toISOString(),
    },
    patient: selectedPatient,
    psychologistName: user?.name || "Psicóloga responsável",
    crp: user?.crp,
  });

  const handlePrintPdf = () => {
    const ok = openReportPrintPreview(previewHtml);
    if (!ok) {
      toast({
        title: "Não foi possível abrir o PDF",
        description: "Verifique se o navegador bloqueou a janela.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDoc = () => {
    downloadReportDoc(`relatorio-${selectedReportId ?? "preview"}.doc`, previewHtml);
    toast({
      title: "DOC gerado",
      description: "O relatório foi baixado em formato compatível com Word.",
    });
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
        <h1 className="mb-6 font-serif text-3xl font-medium text-foreground">Relatórios</h1>
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
            Relatórios
          </h1>
          <p className="mt-2 text-muted-foreground">
            Relatórios profissionais com formato de sessão ou prontuário longitudinal.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-foreground">
              Relatórios gerados
            </h2>
            <Button variant="secondary" size="sm" className="gap-2" onClick={handleOpenNew}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Novo relatório
            </Button>
          </div>

          {reports.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum relatório criado ainda.</p>
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
                        {report.patient_name ??
                          patients.find((patient) => patient.id === report.patient_id)?.name ??
                          "Paciente"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {reportKinds.find((kind) => kind.id === (report.kind ?? "session_report"))
                          ?.label}{" "}
                        ·{" "}
                        {purposes.find((option) => option.id === report.purpose)?.label ??
                          report.purpose}{" "}
                        · {formatDate(report.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {report.status === "final" ? "Final" : "Rascunho"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[1180px] overflow-hidden border-border/70 bg-background/95 p-0 shadow-[0_28px_90px_-34px_rgba(15,23,42,0.45)] backdrop-blur">
            <DialogHeader className="border-b border-border/70 bg-muted/20 px-6 py-5">
              <DialogTitle className="font-serif text-xl">
                {selectedReportId ? "Editar relatório" : "Novo relatório"}
              </DialogTitle>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                    Editor clínico
                  </p>
                  <h3 className="mt-1 font-serif text-2xl text-foreground">
                    {selectedPatient?.name || "Novo relatório"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Organize o texto, revise o conteúdo e acompanhe o preview em tempo real.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-background px-3 py-1.5">
                    {reportKinds.find((kind) => kind.id === editor.kind)?.label}
                  </span>
                  <span className="rounded-full border border-border bg-background px-3 py-1.5">
                    {purposes.find((option) => option.id === editor.purpose)?.label}
                  </span>
                </div>
              </div>
            </DialogHeader>

            <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-5 px-6 py-6">
                <div className="rounded-[1.4rem] border border-border/70 bg-card p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.3)]">
                  <div className="mb-4">
                    <h3 className="font-serif text-lg text-foreground">Contexto do relatório</h3>
                    <p className="text-sm text-muted-foreground">
                      Defina o paciente, o tipo de peça e a sessão de referência.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-foreground">Paciente</span>
                      <select
                        value={editor.patient_id}
                        onChange={(event) =>
                          rebuildContent({ patient_id: event.target.value, session_id: "" })
                        }
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Selecione o paciente</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-foreground">Finalidade</span>
                      <select
                        value={editor.purpose}
                        onChange={(event) => updateEditor("purpose", event.target.value)}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      >
                        {purposes.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-foreground">Modelo</span>
                      <select
                        value={editor.kind}
                        onChange={(event) =>
                          rebuildContent({ kind: event.target.value as ReportKind })
                        }
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      >
                        {reportKinds.map((kind) => (
                          <option key={kind.id} value={kind.id}>
                            {kind.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-foreground">Sessão vinculada</span>
                      <select
                        value={editor.session_id}
                        onChange={(event) => updateEditor("session_id", event.target.value)}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Opcional</option>
                        {availableSessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {session.patient_name} · {session.date} {session.time}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2 text-sm">
                    <span className="font-medium text-foreground">Tipo de atendimento</span>
                    <Input
                      value={editor.attendanceType}
                      onChange={(event) =>
                        rebuildContent({ attendanceType: event.target.value })
                      }
                      placeholder="Tipo de atendimento"
                      list="attendance-types"
                      className="h-11 rounded-xl"
                    />
                  </label>
                  <datalist id="attendance-types">
                    {attendanceTypes.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div className="rounded-[1.4rem] border border-border/70 bg-card p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.3)]">
                  <div className="mb-4">
                    <h3 className="font-serif text-lg text-foreground">Conteúdo principal</h3>
                    <p className="text-sm text-muted-foreground">
                      Escreva ou revise o texto final que ficará no relatório.
                    </p>
                  </div>
                  <Textarea
                    value={editor.content}
                    onChange={(event) => updateEditor("content", event.target.value)}
                    className="min-h-[360px] rounded-[1.2rem] border-border/80 bg-background/80"
                  />
                </div>

                <div className="rounded-[1.6rem] border border-primary/15 bg-[linear-gradient(180deg,rgba(0,113,227,0.06),rgba(0,113,227,0.015))] p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.18)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg text-foreground">Fonte para IA</h3>
                      <p className="text-sm text-muted-foreground">
                        Cole anotações clínicas ou carregue a transcrição para estruturar o
                        relatório com mais rapidez.
                      </p>
                    </div>
                    <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      Assistido por IA
                    </div>
                  </div>
                  <Textarea
                    value={editor.sourceText}
                    onChange={(event) => updateEditor("sourceText", event.target.value)}
                    placeholder="Cole anotações clínicas ou carregue a transcrição de uma sessão."
                    className="mt-4 min-h-[170px] rounded-[1.2rem] border-primary/15 bg-background/90"
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleImportTranscript()}
                      disabled={!editor.session_id}
                    >
                      Carregar transcrição da sessão
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-primary/20 bg-background/90"
                      onClick={() => void handleImproveWithAi("manual")}
                      disabled={improving || !(editor.sourceText.trim() || editor.content.trim())}
                    >
                      {improving ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-[#0071e3]" />
                      )}
                      Melhorar com IA
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-primary/20 bg-background/90"
                      onClick={() => void handleImproveWithAi("transcript")}
                      disabled={improving || !(editor.sourceText.trim() || editor.content.trim())}
                    >
                      {improving ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-[#0071e3]" />
                      )}
                      Usar transcrição do áudio
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-l border-border/60 bg-muted/20 px-6 py-6">
                <div className="sticky top-0 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg text-foreground">
                        Preview do relatório
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Visualização ampliada antes de salvar ou exportar.
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                      Atualiza automaticamente
                    </span>
                  </div>
                  <div className="rounded-[1.5rem] border border-border/80 bg-white p-4 shadow-[0_18px_52px_-36px_rgba(15,23,42,0.45)]">
                    <div className="overflow-hidden rounded-[1.1rem] border border-black/5 bg-white">
                      <iframe
                        title="Preview do relatório"
                        srcDoc={previewHtml}
                        className="h-[640px] w-full bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-wrap justify-between gap-2 border-t border-border/70 px-6 py-5">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={handlePrintPdf}>
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleDownloadDoc}
                >
                  <FileDown className="h-4 w-4" />
                  DOC
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Fechar
                </Button>
                <Button
                  onClick={() => void handleSave(false)}
                  disabled={saving || !editor.patient_id || !editor.content.trim()}
                  className="gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar rascunho
                </Button>
                <Button
                  onClick={() => void handleSave(true)}
                  disabled={saving || !editor.patient_id || !editor.content.trim()}
                  className="gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
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
