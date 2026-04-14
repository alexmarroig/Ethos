import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Columns2, Eye, FileDown, FileText, Loader2, Maximize2, Minimize2, Plus, Send, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { reportService, type Report } from "@/services/reportService";
import { patientService, type Patient, type PatientDetail } from "@/services/patientService";
import { sessionService, type Session } from "@/services/sessionService";
import { aiService } from "@/services/aiService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildReportHtml, downloadReportDoc, openReportPrintPreview } from "@/lib/reportBuilders";
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";

const purposes = [
  { id: "profissional", label: "Uso profissional" },
  { id: "paciente", label: "Entrega ao paciente" },
  { id: "instituicao", label: "Instituição / terceiro" },
];

const reportKinds = [
  { id: "session_report", label: "Relatório de sessão" },
  { id: "longitudinal_record", label: "Prontuário / relatório longitudinal" },
] as const;

const attendanceTypes = ["Psicoterapia individual", "Psicoterapia online", "Psicoterapia presencial", "Orientação", "Sessão de acolhimento"];

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
  value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "Sem data";

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Não definido";

const sessionStatusLabel = (status?: string) => {
  switch (status) {
    case "confirmed": return "Confirmada";
    case "completed": return "Concluída";
    case "missed": return "Faltou";
    case "pending": return "Agendada";
    default: return "Sessão";
  }
};

const buildClinicalContext = (patient?: Patient) =>
  [
    patient?.profession ? `Profissão: ${patient.profession}` : null,
    patient?.education_level ? `Escolaridade: ${patient.education_level}` : null,
    patient?.marital_status ? `Estado civil: ${patient.marital_status}` : null,
    patient?.referral_source ? `Origem da demanda: ${patient.referral_source}` : null,
    patient?.care_interest ? `Modalidade do cuidado: ${patient.care_interest}` : null,
    patient?.main_complaint ? `Queixa principal: ${patient.main_complaint}` : null,
    patient?.therapy_goals ? `Objetivos terapêuticos: ${patient.therapy_goals}` : null,
    patient?.psychiatric_medications ? `Medicações psiquiátricas: ${patient.psychiatric_medications}` : null,
    patient?.has_psychiatric_followup ? `Acompanhamento psiquiátrico: ${patient.psychiatrist_name || "Em acompanhamento"}${patient.psychiatrist_contact ? ` (${patient.psychiatrist_contact})` : ""}` : null,
    patient?.recurring_techniques ? `Técnicas recorrentes: ${patient.recurring_techniques}` : null,
    patient?.report_indication ? `Indicação documental: ${patient.report_indication}` : null,
    patient?.report_notes ? `Observações para relatório: ${patient.report_notes}` : null,
    patient?.care_status ? `Status do acompanhamento: ${patient.care_status}` : null,
  ].filter(Boolean).join("\n");

const buildStarter = (input: { patient?: Patient; kind: ReportKind; attendanceType: string; sessions: Session[]; psychologistName: string; crp?: string }) => {
  const sessionBlock = input.sessions.map((session, index) => `Sessão ${index + 1} — ${formatDateTime(session.scheduled_at)}\nTipo: ${input.attendanceType}\nStatus: ${sessionStatusLabel(session.status)}\nTranscrição: ${session.has_transcription ? "Disponível" : "Não disponível"}`).join("\n\n");
  if (input.kind === "longitudinal_record") {
    return [`${input.psychologistName.toUpperCase()}`, `PSICÓLOGA CLÍNICA | CRP ${input.crp || ""}`, "", "PRONTUÁRIO / RELATÓRIO LONGITUDINAL", input.patient?.name ? `Paciente: ${input.patient.name}` : "", input.patient?.birth_date ? `Data de nascimento: ${formatDate(input.patient.birth_date)}` : "", "", "CONTEXTO CLÍNICO", buildClinicalContext(input.patient) || "Complementar com o contexto clínico do acompanhamento.", "", "SESSÕES DE REFERÊNCIA", sessionBlock || "Selecionar sessões para compor a evolução.", "", "EVOLUÇÃO DO ACOMPANHAMENTO", "", "INTERVENÇÕES E TÉCNICAS", "", "PLANO E ENCAMINHAMENTOS"].filter(Boolean).join("\n");
  }
  return ["RELATÓRIO DE SESSÃO PSICOLÓGICA", `Psicóloga responsável: ${input.psychologistName}`, `CRP: ${input.crp || ""}`, input.patient?.name ? `Paciente: ${input.patient.name}` : "", `Tipo de atendimento: ${input.attendanceType}`, input.sessions[0]?.scheduled_at ? `Sessão de referência: ${formatDateTime(input.sessions[0].scheduled_at)}` : "", "", "CONTEXTO CLÍNICO", buildClinicalContext(input.patient) || "Registrar contexto clínico relevante do atendimento.", "", "DESCRIÇÃO DA SESSÃO", "", "INTERVENÇÕES REALIZADAS", "", "IMPRESSÕES CLÍNICAS", "", "PLANO / ENCAMINHAMENTOS"].filter(Boolean).join("\n");
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
    const sourceSessions = availableSessions.filter((session) => (next.kind === "longitudinal_record" ? next.selected_session_ids : next.session_id ? [next.session_id] : []).includes(session.id));
    setEditor((current) => ({
      ...current,
      ...partial,
      content: buildStarter({
        patient,
        kind: next.kind,
        attendanceType: next.attendanceType,
        sessions: sourceSessions,
        psychologistName: user?.name || "Psicóloga responsável",
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
      toast({ title: "Selecione uma sessão", description: "Escolha uma sessão para usar a transcrição.", variant: "destructive" });
      return;
    }
    const result = await sessionService.getTranscript(sourceSessionId);
    if (!result.success) {
      toast({ title: "Transcrição não encontrada", description: result.error.message, variant: "destructive" });
      return;
    }
    setEditor((current) => ({ ...current, sourceText: result.data.raw_text }));
    toast({ title: "Transcrição carregada", description: "A transcrição foi trazida para a área de apoio." });
  };

  const handleImproveWithAi = async (mode: "manual" | "transcript") => {
    const sourceText = editor.sourceText.trim() || editor.content.trim();
    if (!sourceText) {
      toast({ title: "Falta conteúdo", description: "Escreva anotações ou use uma transcrição antes de acionar a IA.", variant: "destructive" });
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
    const result = mode === "transcript" ? await aiService.improveTranscriptReport(payload) : await aiService.improveManualReport(payload);
    setImproving(false);
    if (!result.success) {
      toast({ title: "IA indisponível", description: result.error.message, variant: "destructive" });
      return;
    }
    setEditor((current) => ({ ...current, content: result.data.organized_text }));
    toast({ title: "Relatório melhorado", description: "A IA reorganizou o texto principal." });
  };

  const handleSave = async (markAsFinal = false) => {
    if (!editor.patient_id || !editor.content.trim()) return;
    setSaving(true);
    const payload = { patient_id: editor.patient_id, purpose: editor.purpose, kind: editor.kind, content: editor.content.trim(), status: markAsFinal ? ("final" as const) : ("draft" as const) };
    const result = selectedReportId ? await reportService.update(selectedReportId, payload) : await reportService.create(payload);
    setSaving(false);
    if (!result.success) {
      toast({ title: "Erro ao salvar relatório", description: result.error.message, variant: "destructive" });
      return;
    }
    syncLocalReport(result.data);
    toast({ title: markAsFinal ? "Relatório finalizado" : "Relatório salvo" });
  };

  const previewHtml = buildReportHtml({
    report: { id: selectedReportId ?? "preview", patient_id: editor.patient_id, patient_name: selectedPatient?.name, purpose: editor.purpose, kind: editor.kind, content: editor.content, status: "draft", created_at: new Date().toISOString() },
    patient: selectedPatient,
    psychologistName: user?.name || "Psicóloga responsável",
    crp: user?.crp,
  });

  const contextCards = [["Profissão", selectedPatient?.profession], ["Escolaridade", selectedPatient?.education_level], ["Estado civil", selectedPatient?.marital_status], ["Queixa principal", selectedPatient?.main_complaint], ["Objetivos terapêuticos", selectedPatient?.therapy_goals], ["Origem da demanda", selectedPatient?.referral_source], ["Modalidade do cuidado", selectedPatient?.care_interest], ["Psiquiatria", selectedPatient?.has_psychiatric_followup ? `${selectedPatient.psychiatrist_name || "Em acompanhamento"}${selectedPatient.psychiatrist_contact ? ` · ${selectedPatient.psychiatrist_contact}` : ""}` : undefined], ["Medicações", selectedPatient?.psychiatric_medications], ["Técnicas recorrentes", selectedPatient?.recurring_techniques], ["Indicação documental", selectedPatient?.report_indication], ["Observações para relatório", selectedPatient?.report_notes], ["Status do acompanhamento", selectedPatient?.care_status]].filter((item) => item[1]) as Array<[string, string]>;

  if (loading) return <div className="content-container py-12"><p className="loading-text">Preparando relatórios...</p></div>;
  if (error) return <div className="content-container py-12"><h1 className="mb-6 font-serif text-3xl font-medium text-foreground">Relatórios</h1><IntegrationUnavailable message={error.message} requestId={error.requestId} /></div>;

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Relatórios</h1>
          <p className="mt-2 text-muted-foreground">Relatórios profissionais com contexto clínico estruturado e edição mais legível.</p>
        </motion.header>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-foreground">Relatórios gerados</h2>
            <Button variant="secondary" size="sm" className="gap-2" onClick={openNew}><Plus className="h-4 w-4" strokeWidth={1.5} />Novo relatório</Button>
          </div>
          {reports.length === 0 ? (
            <div className="py-12 text-center"><FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">Nenhum relatório criado ainda.</p></div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="session-card">
                  <button type="button" onClick={() => openExisting(report)} className="w-full text-left">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-lg font-medium text-foreground">{report.patient_name ?? patients.find((patient) => patient.id === report.patient_id)?.name ?? "Paciente"}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{reportKinds.find((kind) => kind.id === (report.kind ?? "session_report"))?.label} · {purposes.find((option) => option.id === report.purpose)?.label ?? report.purpose} · {formatDate(report.created_at)}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{report.status === "final" ? "Final" : "Rascunho"}</span>
                    </div>
                  </button>
                  <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <ShareWithPatientButton
                      type="reports"
                      id={report.id}
                      shared={(report as unknown as { shared_with_patient?: boolean }).shared_with_patient ?? false}
                      onToggle={(shared) => setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, shared_with_patient: shared } as unknown as typeof r : r))}
                    />
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
                  <DialogTitle className="font-serif text-2xl">{selectedReportId ? "Editar relatório" : "Novo relatório"}</DialogTitle>
                  <p className="mt-2 text-sm text-muted-foreground">Modo híbrido: contexto clínico, corpo em texto livre e preview de impressão.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setLayoutMode("split")}><Columns2 className="h-4 w-4" />Lado a lado</Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setLayoutMode("editor")}><Wand2 className="h-4 w-4" />Foco na edição</Button>
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
                      <h3 className="font-serif text-lg text-foreground">Contexto clínico</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Resumo puxado da ficha do paciente.</p>
                      {loadingPatientContext ? <p className="mt-3 text-sm text-muted-foreground">Carregando contexto clínico...</p> : contextCards.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Selecione um paciente para ver o contexto.</p> : <div className="mt-4 space-y-3">{contextCards.map(([label, value]) => <div key={label} className="rounded-xl border border-border/70 bg-background/80 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">{label}</p><p className="mt-2 text-sm leading-6 text-foreground/85">{value}</p></div>)}</div>}
                      <div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => appendToContent(buildClinicalContext(selectedPatient))} disabled={!selectedPatient}>Inserir dados da ficha</Button></div>
                    </section>

                    <section className="rounded-[1.2rem] border border-border bg-card p-4">
                      <h3 className="font-serif text-lg text-foreground">Sessões de referência</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{editor.kind === "longitudinal_record" ? "Selecione várias sessões para a evolução." : "Selecione a sessão principal."}</p>
                      <div className="mt-4 space-y-3">
                        {editor.kind === "session_report" ? (
                          <select value={editor.session_id} onChange={(event) => setEditor((current) => ({ ...current, session_id: event.target.value }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                            <option value="">Selecione a sessão</option>
                            {availableSessions.map((session) => <option key={session.id} value={session.id}>{formatDateTime(session.scheduled_at)} · {sessionStatusLabel(session.status)}</option>)}
                          </select>
                        ) : (
                          <div className="max-h-[240px] space-y-2 overflow-auto pr-1">
                            {availableSessions.map((session) => {
                              const checked = editor.selected_session_ids.includes(session.id);
                              return <label key={session.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-3"><input type="checkbox" checked={checked} onChange={(event) => setEditor((current) => ({ ...current, selected_session_ids: event.target.checked ? [...current.selected_session_ids, session.id] : current.selected_session_ids.filter((id) => id !== session.id) }))} /><div><p className="text-sm font-medium text-foreground">{formatDateTime(session.scheduled_at)}</p><p className="text-xs text-muted-foreground">{sessionStatusLabel(session.status)} · {session.has_transcription ? "Transcrição disponível" : "Sem transcrição"}</p></div></label>;
                            })}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => appendToContent(selectedSessions.map((session, index) => `Sessão ${index + 1} — ${formatDateTime(session.scheduled_at)}\nTipo: ${editor.attendanceType}\nStatus: ${sessionStatusLabel(session.status)}\nTranscrição: ${session.has_transcription ? "Disponível" : "Não disponível"}`).join("\n\n"))} disabled={selectedSessions.length === 0}>Inserir resumo da sessão</Button>
                        <Button variant="outline" size="sm" onClick={() => applyStarter()} disabled={!editor.patient_id}>Regenerar estrutura</Button>
                      </div>
                    </section>
                  </div>
                </aside>
              )}

              {layoutMode !== "preview" && (
                <section className="overflow-y-auto px-6 py-5">
                  <div className="space-y-5">
                    <div className="rounded-[1.25rem] border border-border bg-card p-5">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label className="space-y-2 text-sm"><span className="font-medium text-foreground">Paciente</span><select value={editor.patient_id} onChange={(event) => setEditor((current) => ({ ...current, patient_id: event.target.value, session_id: "", selected_session_ids: [] }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"><option value="">Selecione o paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label>
                        <label className="space-y-2 text-sm"><span className="font-medium text-foreground">Finalidade</span><select value={editor.purpose} onChange={(event) => setEditor((current) => ({ ...current, purpose: event.target.value }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">{purposes.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                        <label className="space-y-2 text-sm"><span className="font-medium text-foreground">Modelo</span><select value={editor.kind} onChange={(event) => setEditor((current) => ({ ...current, kind: event.target.value as ReportKind, session_id: "", selected_session_ids: [] }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">{reportKinds.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select></label>
                        <label className="space-y-2 text-sm"><span className="font-medium text-foreground">Tipo de atendimento</span><Input value={editor.attendanceType} onChange={(event) => setEditor((current) => ({ ...current, attendanceType: event.target.value }))} list="attendance-types" className="h-11 rounded-xl" /></label>
                      </div>
                      <datalist id="attendance-types">{attendanceTypes.map((item) => <option key={item} value={item} />)}</datalist>
                    </div>

                    <div className="rounded-[1.25rem] border border-border bg-card p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div><h3 className="font-serif text-lg text-foreground">Conteúdo principal</h3><p className="text-sm text-muted-foreground">Texto final do relatório com mais espaço útil, leitura melhor e contexto lateral.</p></div>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{editor.content.trim().split(/\n+/).filter(Boolean).length} blocos</span>
                      </div>
                      <Textarea value={editor.content} onChange={(event) => setEditor((current) => ({ ...current, content: event.target.value }))} placeholder="Escreva o relatório em linguagem clínica clara, objetiva e profissional." className="min-h-[560px] rounded-[1.25rem] border-border/80 bg-background px-5 py-4 font-sans text-[15px] leading-7" />
                    </div>

                    <div className="rounded-[1.4rem] border border-primary/15 bg-[linear-gradient(180deg,rgba(0,113,227,0.06),rgba(0,113,227,0.015))] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><h3 className="font-serif text-lg text-foreground">Fonte para IA</h3><p className="text-sm text-muted-foreground">Use anotações e transcrições para estruturar o relatório com mais velocidade.</p></div>
                        <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Assistido por IA</div>
                      </div>
                      <Textarea value={editor.sourceText} onChange={(event) => setEditor((current) => ({ ...current, sourceText: event.target.value }))} placeholder="Cole anotações clínicas, resumo livre ou transcrição da sessão." className="mt-4 min-h-[180px] rounded-[1.2rem] border-primary/15 bg-background/90" />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => void handleImportTranscript()} disabled={selectedSessions.length === 0}>Usar transcrição</Button>
                        <Button type="button" variant="outline" className="gap-2 border-primary/20 bg-background/90" onClick={() => void handleImproveWithAi("manual")} disabled={improving || !(editor.sourceText.trim() || editor.content.trim())}>{improving ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-[#0071e3]" />}Melhorar com IA</Button>
                        <Button type="button" variant="outline" className="gap-2 border-primary/20 bg-background/90" onClick={() => void handleImproveWithAi("transcript")} disabled={improving || !(editor.sourceText.trim() || editor.content.trim())}>{improving ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-[#0071e3]" />}Melhorar com transcrição</Button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {layoutMode !== "editor" && (
                <section className={`${layoutMode === "split" ? "border-l" : ""} overflow-y-auto bg-muted/20 px-6 py-5`}>
                  <div className="space-y-4">
                    <div><h3 className="font-serif text-lg text-foreground">Preview do relatório</h3><p className="text-sm text-muted-foreground">Visualização do documento final com tipografia própria de leitura e impressão.</p></div>
                    <div className="rounded-[1.5rem] border border-border/80 bg-white p-4 shadow-[0_18px_52px_-36px_rgba(15,23,42,0.45)]">
                      <div className="overflow-hidden rounded-[1.1rem] border border-black/5 bg-white">
                        <iframe title="Preview do relatório" srcDoc={previewHtml} className={`${isFullscreen ? "h-[78vh]" : "h-[720px]"} w-full bg-white`} />
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <DialogFooter className="flex flex-wrap justify-between gap-2 border-t border-border/70 px-6 py-5">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={() => openReportPrintPreview(previewHtml)}><FileDown className="h-4 w-4" />PDF</Button>
                <Button type="button" variant="outline" className="gap-2" onClick={() => downloadReportDoc(`relatorio-${selectedReportId ?? "preview"}.doc`, previewHtml)}><FileDown className="h-4 w-4" />DOC</Button>
                <Button type="button" variant="outline" className="gap-2" onClick={() => { const phone = selectedPatient?.whatsapp || selectedPatient?.phone; const msg = encodeURIComponent(`Olá ${selectedPatient?.name || ""}! Segue o relatório solicitado.`); const url = phone ? `https://wa.me/55${phone.replace(/\D/g, "")}?text=${msg}` : `https://wa.me/?text=${msg}`; window.open(url, "_blank", "noopener,noreferrer"); }} disabled={!selectedPatient}><Send className="h-4 w-4" />Enviar via WhatsApp</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>Fechar</Button>
                <Button onClick={() => void handleSave(false)} disabled={saving || !editor.patient_id || !editor.content.trim()} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar rascunho</Button>
                <Button onClick={() => void handleSave(true)} disabled={saving || !editor.patient_id || !editor.content.trim()} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Finalizar</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
