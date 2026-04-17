
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Columns2,
  Eye,
  FileDown,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportService, type Report } from "@/services/reportService";
import { patientService, type Patient, type PatientDetail } from "@/services/patientService";
import { sessionService, type Session } from "@/services/sessionService";
import { aiService } from "@/services/aiService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildReportHtml, downloadReportDoc, openReportPrintPreview } from "@/lib/reportBuilders";
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";

const purposes = [
  { id: "profissional", label: "Uso profissional" },
  { id: "paciente", label: "Entrega ao paciente" },
  { id: "instituicao", label: "Institui??o / terceiro" },
];

const reportKinds = [
  { id: "session_report", label: "Relat?rio de sess?o" },
  { id: "longitudinal_record", label: "Prontu?rio / relat?rio longitudinal" },
] as const;

const attendanceTypes = [
  "Psicoterapia individual",
  "Psicoterapia online",
  "Psicoterapia presencial",
  "Orienta??o",
  "Sess?o de acolhimento",
];

type ReportKind = "session_report" | "longitudinal_record";
type LayoutMode = "split" | "editor" | "preview";

type ReportEditorState = {
  patient_id: string;
  session_id: string;
  selected_session_ids: string[];
  kind: ReportKind;
  purpose: string;
  attendanceType: string;
  content: string;
  sourceText: string;
};

const createEmptyEditor = (): ReportEditorState => ({
  patient_id: "",
  session_id: "",
  selected_session_ids: [],
  kind: "session_report",
  purpose: "profissional",
  attendanceType: attendanceTypes[0],
  content: "",
  sourceText: "",
});

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sem data";

const formatDateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N?o definido";

const sessionStatusLabel = (status?: string) => {
  switch (status) {
    case "confirmed":
      return "Confirmada";
    case "completed":
      return "Conclu?da";
    case "missed":
      return "Faltou";
    case "pending":
    case "scheduled":
      return "Agendada";
    default:
      return "Sess?o";
  }
};

const buildClinicalContext = (patient?: Patient) =>
  [
    patient?.profession ? `Profiss?o: ${patient.profession}` : null,
    patient?.education_level ? `Escolaridade: ${patient.education_level}` : null,
    patient?.marital_status ? `Estado civil: ${patient.marital_status}` : null,
    patient?.referral_source ? `Origem da demanda: ${patient.referral_source}` : null,
    patient?.care_interest ? `Modalidade do cuidado: ${patient.care_interest}` : null,
    patient?.main_complaint ? `Queixa principal: ${patient.main_complaint}` : null,
    patient?.therapy_goals ? `Objetivos terap?uticos: ${patient.therapy_goals}` : null,
    patient?.psychiatric_medications ? `Medica??es psiqui?tricas: ${patient.psychiatric_medications}` : null,
    patient?.has_psychiatric_followup
      ? `Acompanhamento psiqui?trico: ${patient.psychiatrist_name || "Em acompanhamento"}${patient.psychiatrist_contact ? ` (${patient.psychiatrist_contact})` : ""}`
      : null,
    patient?.recurring_techniques ? `T?cnicas recorrentes: ${patient.recurring_techniques}` : null,
    patient?.report_indication ? `Indica??o documental: ${patient.report_indication}` : null,
    patient?.report_notes ? `Observa??es para relat?rio: ${patient.report_notes}` : null,
    patient?.care_status ? `Status do acompanhamento: ${patient.care_status}` : null,
  ]
    .filter(Boolean)
    .join("\n");

const buildStarter = (input: {
  patient?: Patient;
  kind: ReportKind;
  attendanceType: string;
  sessions: Session[];
  psychologistName: string;
  crp?: string;
}) => {
  const sessionBlock = input.sessions
    .map(
      (session, index) =>
        `Sess?o ${index + 1} ? ${formatDateTime(session.scheduled_at)}\nTipo: ${input.attendanceType}\nStatus: ${sessionStatusLabel(session.status)}\nTranscri??o: ${session.has_transcription ? "Dispon?vel" : "N?o dispon?vel"}`,
    )
    .join("\n\n");

  if (input.kind === "longitudinal_record") {
    return [
      `${input.psychologistName.toUpperCase()}`,
      `Psic?loga cl?nica | CRP ${input.crp || ""}`,
      "",
      "PRONTU?RIO / RELAT?RIO LONGITUDINAL",
      input.patient?.name ? `Paciente: ${input.patient.name}` : "",
      input.patient?.birth_date ? `Data de nascimento: ${formatDate(input.patient.birth_date)}` : "",
      "",
      "CONTEXTO CL?NICO",
      buildClinicalContext(input.patient) || "Complementar com o contexto cl?nico do acompanhamento.",
      "",
      "SESS?ES DE REFER?NCIA",
      sessionBlock || "Selecionar sess?es para compor a evolu??o.",
      "",
      "EVOLU??O DO ACOMPANHAMENTO",
      "",
      "INTERVEN??ES E T?CNICAS",
      "",
      "PLANO E ENCAMINHAMENTOS",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "RELAT?RIO DE SESS?O PSICOL?GICA",
    `Psic?loga respons?vel: ${input.psychologistName}`,
    `CRP: ${input.crp || ""}`,
    input.patient?.name ? `Paciente: ${input.patient.name}` : "",
    `Tipo de atendimento: ${input.attendanceType}`,
    input.sessions[0]?.scheduled_at ? `Sess?o de refer?ncia: ${formatDateTime(input.sessions[0].scheduled_at)}` : "",
    "",
    "CONTEXTO CL?NICO",
    buildClinicalContext(input.patient) || "Registrar contexto cl?nico relevante do atendimento.",
    "",
    "DESCRI??O DA SESS?O",
    "",
    "INTERVEN??ES REALIZADAS",
    "",
    "IMPRESS?ES CL?NICAS",
    "",
    "PLANO / ENCAMINHAMENTOS",
  ]
    .filter(Boolean)
    .join("\n");
};

export default function ReportsPage() {
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
  const [editor, setEditor] = useState<ReportEditorState>(createEmptyEditor());
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [loadingPatientContext, setLoadingPatientContext] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("split");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [reportsRes, patientsRes, sessionsRes] = await Promise.all([
        reportService.list(),
        patientService.list(),
        sessionService.list(),
      ]);
      if (!reportsRes.success) setError({ message: reportsRes.error.message, requestId: reportsRes.request_id });
      else setReports(reportsRes.data);
      if (patientsRes.success) setPatients(patientsRes.data);
      if (sessionsRes.success) setSessions(sessionsRes.data);
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    if (!editor.patient_id) {
      setPatientDetail(null);
      return;
    }
    const loadDetail = async () => {
      setLoadingPatientContext(true);
      const result = await patientService.getById(editor.patient_id);
      if (result.success) setPatientDetail(result.data);
      setLoadingPatientContext(false);
    };
    void loadDetail();
  }, [editor.patient_id]);

  const selectedPatient = useMemo(() => patients.find((patient) => patient.id === editor.patient_id), [patients, editor.patient_id]);
  const availableSessions = useMemo(() => sessions.filter((session) => !editor.patient_id || session.patient_id === editor.patient_id).sort((a, b) => (b.scheduled_at || "").localeCompare(a.scheduled_at || "")), [sessions, editor.patient_id]);
  const selectedSessions = useMemo(() => {
    const ids = editor.kind === "longitudinal_record" ? editor.selected_session_ids : editor.session_id ? [editor.session_id] : [];
    return availableSessions.filter((session) => ids.includes(session.id));
  }, [availableSessions, editor.kind, editor.selected_session_ids, editor.session_id]);

  const syncLocalReport = (nextReport: Report) => {
    setReports((current) => current.some((report) => report.id === nextReport.id) ? current.map((report) => (report.id === nextReport.id ? nextReport : report)) : [nextReport, ...current]);
    setSelectedReportId(nextReport.id);
  };

  const applyStarter = (partial?: Partial<ReportEditorState>) => {
    const next = { ...editor, ...partial };
    const patient = patients.find((item) => item.id === next.patient_id);
    const sourceSessionIds = next.kind === "longitudinal_record" ? next.selected_session_ids : next.session_id ? [next.session_id] : [];
    const sourceSessions = availableSessions.filter((session) => sourceSessionIds.includes(session.id));
    setEditor((current) => ({
      ...current,
      ...partial,
      content: buildStarter({
        patient,
        kind: next.kind,
        attendanceType: next.attendanceType,
        sessions: sourceSessions,
        psychologistName: user?.name || "Psic?loga respons?vel",
        crp: user?.crp,
      }),
    }));
  };

  const openNew = () => {
    setSelectedReportId(null);
    setEditor(createEmptyEditor());
    setPatientDetail(null);
    setLayoutMode("split");
    setIsFullscreen(false);
    setDialogOpen(true);
  };

  const openExisting = (report: Report) => {
    setSelectedReportId(report.id);
    setEditor({
      patient_id: report.patient_id,
      session_id: "",
      selected_session_ids: [],
      kind: report.kind ?? "session_report",
      purpose: report.purpose,
      attendanceType: attendanceTypes[0],
      content: report.content ?? "",
      sourceText: "",
    });
    setLayoutMode("split");
    setIsFullscreen(false);
    setDialogOpen(true);
  };

  const appendToContent = (text: string) => {
    if (!text.trim()) return;
    setEditor((current) => ({ ...current, content: `${current.content.trim()}\n\n${text}`.trim() }));
  };

  const handleImportTranscript = async () => {
    const sourceSessionId = editor.kind === "longitudinal_record" ? editor.selected_session_ids[0] : editor.session_id;
    if (!sourceSessionId) {
      toast({ title: "Selecione uma sess?o", description: "Escolha uma sess?o para usar a transcri??o.", variant: "destructive" });
      return;
    }
    const result = await sessionService.getTranscript(sourceSessionId);
    if (!result.success) {
      toast({ title: "Transcri??o n?o encontrada", description: result.error.message, variant: "destructive" });
      return;
    }
    setEditor((current) => ({ ...current, sourceText: result.data.raw_text }));
    toast({ title: "Transcri??o carregada", description: "A transcri??o foi trazida para a ?rea de apoio." });
  };

  const handleImproveWithAi = async (mode: "manual" | "transcript") => {
    const sourceText = editor.sourceText.trim() || editor.content.trim();
    if (!sourceText) {
      toast({ title: "Falta conte?do", description: "Escreva anota??es ou use uma transcri??o antes de acionar a IA.", variant: "destructive" });
      return;
    }
    setImproving(true);
    const payload = {
      psychologist_name: user?.name || "Psic?loga respons?vel",
      crp: user?.crp,
      patient_name: selectedPatient?.name,
      date_label: new Date().toLocaleDateString("pt-BR"),
      attendance_type: editor.attendanceType,
      text: sourceText,
    };
    const result = mode === "transcript" ? await aiService.improveTranscriptReport(payload) : await aiService.improveManualReport(payload);
    setImproving(false);
    if (!result.success) {
      toast({ title: "IA indispon?vel", description: result.error.message, variant: "destructive" });
      return;
    }
    setEditor((current) => ({ ...current, content: result.data.organized_text }));
    toast({ title: "Relat?rio melhorado", description: "A IA reorganizou o texto principal." });
  };

  const handleSave = async (markAsFinal = false) => {
    if (!editor.patient_id || !editor.content.trim()) return;
    setSaving(true);
    const payload = { patient_id: editor.patient_id, purpose: editor.purpose, kind: editor.kind, content: editor.content.trim(), status: markAsFinal ? ("final" as const) : ("draft" as const) };
    const result = selectedReportId ? await reportService.update(selectedReportId, payload) : await reportService.create(payload);
    setSaving(false);
    if (!result.success) {
      toast({ title: "Erro ao salvar relat?rio", description: result.error.message, variant: "destructive" });
      return;
    }
    syncLocalReport(result.data);
    toast({ title: markAsFinal ? "Relat?rio finalizado" : "Relat?rio salvo" });
  };

  const previewHtml = buildReportHtml({
    report: { id: selectedReportId ?? "preview", patient_id: editor.patient_id, patient_name: selectedPatient?.name, purpose: editor.purpose, kind: editor.kind, content: editor.content, status: "draft", created_at: new Date().toISOString() },
    patient: selectedPatient,
    psychologistName: user?.name || "Psic?loga respons?vel",
    crp: user?.crp,
  });

  const contextCards = [["Profiss?o", selectedPatient?.profession], ["Escolaridade", selectedPatient?.education_level], ["Estado civil", selectedPatient?.marital_status], ["Queixa principal", selectedPatient?.main_complaint], ["Objetivos terap?uticos", selectedPatient?.therapy_goals], ["Origem da demanda", selectedPatient?.referral_source], ["Modalidade do cuidado", selectedPatient?.care_interest], ["Psiquiatria", selectedPatient?.has_psychiatric_followup ? `${selectedPatient.psychiatrist_name || "Em acompanhamento"}${selectedPatient.psychiatrist_contact ? ` ? ${selectedPatient.psychiatrist_contact}` : ""}` : undefined], ["Medica??es", selectedPatient?.psychiatric_medications], ["T?cnicas recorrentes", selectedPatient?.recurring_techniques], ["Indica??o documental", selectedPatient?.report_indication], ["Observa??es para relat?rio", selectedPatient?.report_notes], ["Status do acompanhamento", selectedPatient?.care_status]].filter((item) => item[1]) as Array<[string, string]>;

  if (loading) return <div className="content-container py-12"><p className="loading-text">Preparando relat?rios...</p></div>;
  if (error) return <div className="content-container py-12"><h1 className="mb-6 font-serif text-3xl font-medium text-foreground">Relat?rios</h1><IntegrationUnavailable message={error.message} requestId={error.requestId} /></div>;

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Relat?rios</h1>
          <p className="mt-2 text-muted-foreground">Relat?rios profissionais com contexto cl?nico estruturado e edi??o mais leg?vel.</p>
        </motion.header>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-foreground">Relat?rios gerados</h2>
            <Button variant="secondary" size="sm" className="gap-2" onClick={openNew}><Plus className="h-4 w-4" strokeWidth={1.5} />Novo relat?rio</Button>
          </div>
          {reports.length === 0 ? (
            <div className="py-12 text-center"><FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">Nenhum relat?rio criado ainda.</p></div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="session-card">
                  <button type="button" onClick={() => openExisting(report)} className="w-full text-left">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-lg font-medium text-foreground">{report.patient_name ?? patients.find((patient) => patient.id === report.patient_id)?.name ?? "Paciente"}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{reportKinds.find((kind) => kind.id === (report.kind ?? "session_report"))?.label} ? {purposes.find((option) => option.id === report.purpose)?.label ?? report.purpose} ? {formatDate(report.created_at)}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{report.status === "final" ? "Final" : "Rascunho"}</span>
                    </div>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <ShareWithPatientButton type="reports" id={report.id} shared={(report as unknown as { shared_with_patient?: boolean }).shared_with_patient ?? false} onToggle={(shared) => setReports((current) => current.map((item) => item.id === report.id ? ({ ...item, shared_with_patient: shared } as unknown as Report) : item))} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className={`${isFullscreen ? "h-[96vh] max-w-[98vw]" : "max-h-[92vh] max-w-[min(96vw,1540px)]"} overflow-hidden border-border/70 bg-background p-0`}>
            <DialogHeader className="border-b border-border/70 bg-card px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <DialogTitle className="font-serif text-2xl">{selectedReportId ? "Editar relat?rio" : "Novo relat?rio"}</DialogTitle>
                  <DialogDescription className="mt-2 text-sm text-muted-foreground">Modo h?brido: contexto cl?nico, corpo em texto livre e preview de impress?o.</DialogDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setLayoutMode("split")}><Columns2 className="h-4 w-4" />Lado a lado</Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setLayoutMode("editor")}><Wand2 className="h-4 w-4" />Foco na edi??o</Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setLayoutMode("preview")}><Eye className="h-4 w-4" />Foco no preview</Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsFullscreen((current) => !current)}>{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}{isFullscreen ? "Recolher" : "Expandir"}</Button>
                </div>
              </div>
            </DialogHeader>

            <div className={`grid h-[calc(100%-146px)] ${layoutMode === "split" ? "xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-1"}`}>
              {layoutMode !== "preview" && (
                <aside className={`${layoutMode === "split" ? "border-r" : "hidden"} overflow-y-auto bg-muted/20 px-5 py-5`}>
                  <div className="space-y-5">
                    <section className="rounded-[1.2rem] border border-border bg-card p-4">
                      <h3 className="font-serif text-lg text-foreground">Contexto cl?nico</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Resumo puxado da ficha do paciente.</p>
                      {loadingPatientContext ? <p className="mt-3 text-sm text-muted-foreground">Carregando contexto cl?nico...</p> : contextCards.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Selecione um paciente para ver o contexto.</p> : <div className="mt-4 space-y-3">{contextCards.map(([label, value]) => <div key={label} className="rounded-xl border border-border/70 bg-background/80 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">{label}</p><p className="mt-2 text-sm leading-6 text-foreground/85">{value}</p></div>)}</div>}
                      <div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => appendToContent(buildClinicalContext(selectedPatient))} disabled={!selectedPatient}>Inserir dados da ficha</Button></div>
                    </section>

                    <section className="rounded-[1.2rem] border border-border bg-card p-4">
                      <h3 className="font-serif text-lg text-foreground">Sess?es de refer?ncia</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{editor.kind === "longitudinal_record" ? "Selecione v?rias sess?es para a evolu??o." : "Selecione a sess?o principal."}</p>
                      <div className="mt-4 space-y-3">
                        {editor.kind === "session_report" ? (
                          <select value={editor.session_id} onChange={(event) => setEditor((current) => ({ ...current, session_id: event.target.value }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                            <option value="">Selecione a sess?o</option>
                            {availableSessions.map((session) => <option key={session.id} value={session.id}>{formatDateTime(session.scheduled_at)} ? {sessionStatusLabel(session.status)}</option>)}
                          </select>
                        ) : (
                          <div className="max-h-[240px] space-y-2 overflow-auto pr-1">
                            {availableSessions.map((session) => {
                              const checked = editor.selected_session_ids.includes(session.id);
                              return <label key={session.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-3"><input type="checkbox" checked={checked} onChange={(event) => setEditor((current) => ({ ...current, selected_session_ids: event.target.checked ? [...current.selected_session_ids, session.id] : current.selected_session_ids.filter((id) => id !== session.id) }))} /><div><p className="text-sm font-medium text-foreground">{formatDateTime(session.scheduled_at)}</p><p className="text-xs text-muted-foreground">{sessionStatusLabel(session.status)} ? {session.has_transcription ? "Transcri??o dispon?vel" : "Sem transcri??o"}</p></div></label>;
                            })}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => appendToContent(selectedSessions.map((session) => `${formatDateTime(session.scheduled_at)} ? ${sessionStatusLabel(session.status)}`).join("\n"))} disabled={selectedSessions.length === 0}>Inserir resumo da sess?o</Button><Button variant="outline" size="sm" onClick={() => void handleImportTranscript()}>Usar transcri??o</Button></div>
                    </section>
                  </div>
                </aside>
              )}

              {layoutMode !== "preview" && (
                <section className={`${layoutMode === "split" ? "border-r" : ""} overflow-y-auto px-6 py-5`}>
                  <div className="space-y-5">
                    <section className="rounded-[1.2rem] border border-border bg-card p-4">
                      <h3 className="font-serif text-lg text-foreground">Contexto do relat?rio</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Defina paciente, tipo de pe?a e sess?o de refer?ncia.</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Paciente</label><select value={editor.patient_id} onChange={(event) => setEditor((current) => ({ ...current, patient_id: event.target.value, session_id: "", selected_session_ids: [] }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"><option value="">Selecione</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></div>
                        <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Finalidade</label><select value={editor.purpose} onChange={(event) => setEditor((current) => ({ ...current, purpose: event.target.value }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">{purposes.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.label}</option>)}</select></div>
                        <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Modelo</label><select value={editor.kind} onChange={(event) => setEditor((current) => ({ ...current, kind: event.target.value as ReportKind, session_id: "", selected_session_ids: [] }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">{reportKinds.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select></div>
                        <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sess?o vinculada</label><Button variant="outline" className="w-full justify-start text-left" onClick={() => applyStarter()}>Gerar estrutura</Button></div>
                      </div>
                      <div className="mt-4"><label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tipo de atendimento</label><select value={editor.attendanceType} onChange={(event) => setEditor((current) => ({ ...current, attendanceType: event.target.value }))} className="mt-2 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">{attendanceTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                    </section>

                    <section className="rounded-[1.2rem] border border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-3"><div><h3 className="font-serif text-lg text-foreground">Conte?do principal</h3><p className="mt-1 text-sm text-muted-foreground">Escreva ou revise o texto final do relat?rio.</p></div><div className="text-xs text-muted-foreground">{(editor.content.match(/\n{2,}/g)?.length ?? 0) + 1} se??o(?es)</div></div>
                      <Textarea value={editor.content} onChange={(event) => setEditor((current) => ({ ...current, content: event.target.value }))} className="mt-4 min-h-[420px] resize-none rounded-2xl border-border/80 bg-background px-5 py-4 text-base leading-7" placeholder="Descreva o contexto cl?nico, evolu??o, interven??es e encaminhamentos com linguagem t?cnica e clara." />
                    </section>

                    <section className="rounded-[1.2rem] border border-border bg-card p-4">
                      <h3 className="font-serif text-lg text-foreground">Fonte para IA</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Cole anota??es cl?nicas ou carregue a transcri??o de uma sess?o.</p>
                      <Textarea value={editor.sourceText} onChange={(event) => setEditor((current) => ({ ...current, sourceText: event.target.value }))} className="mt-4 min-h-[180px] resize-none rounded-2xl border-border/80 bg-background px-5 py-4 text-sm leading-6" placeholder="Cole aqui suas anota??es cl?nicas ou use a transcri??o como apoio para a IA." />
                      <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void handleImportTranscript()}>Usar transcri??o do ?udio</Button><Button variant="outline" size="sm" className="gap-2" onClick={() => void handleImproveWithAi("manual")} disabled={improving}>{improving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-sky-500" />}Melhorar com IA</Button><Button variant="outline" size="sm" className="gap-2" onClick={() => void handleImproveWithAi("transcript")} disabled={improving}>{improving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-sky-500" />}Organizar transcri??o</Button></div>
                    </section>
                  </div>
                </section>
              )}

              {layoutMode !== "editor" && (
                <section className="overflow-y-auto px-6 py-5">
                  <div className="rounded-[1.2rem] border border-border bg-card p-4">
                    <div className="mb-4"><h3 className="font-serif text-lg text-foreground">Preview do relat?rio</h3><p className="mt-1 text-sm text-muted-foreground">Visualiza??o do documento final antes de salvar ou exportar.</p></div>
                    <iframe title="Preview do relat?rio" srcDoc={previewHtml} className="h-[70vh] w-full rounded-xl border border-border bg-white" />
                  </div>
                </section>
              )}
            </div>

            <DialogFooter className="border-t border-border/70 bg-card px-6 py-4">
              <div className="flex flex-wrap gap-2"><Button variant="outline" className="gap-2" onClick={() => openReportPrintPreview(previewHtml)}><FileText className="h-4 w-4" />PDF</Button><Button variant="outline" className="gap-2" onClick={() => downloadReportDoc(previewHtml, `${selectedPatient?.name ?? "relatorio"}.doc`)}><FileDown className="h-4 w-4" />DOC</Button></div>
              <div className="flex flex-wrap gap-2">{selectedReportId ? <ShareWithPatientButton type="reports" id={selectedReportId} shared={(reports.find((item) => item.id === selectedReportId) as unknown as { shared_with_patient?: boolean })?.shared_with_patient ?? false} /> : null}<Button variant="outline" onClick={() => setDialogOpen(false)}>Fechar</Button><Button variant="secondary" onClick={() => void handleSave(false)} disabled={saving || !editor.patient_id || !editor.content.trim()}>{saving ? "Salvando..." : "Salvar rascunho"}</Button><Button onClick={() => void handleSave(true)} disabled={saving || !editor.patient_id || !editor.content.trim()}>{saving ? "Salvando..." : "Finalizar"}</Button></div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
