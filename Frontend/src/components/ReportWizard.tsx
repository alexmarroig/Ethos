import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileDown,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reportService, type Report, type ReportKind } from "@/services/reportService";
import { patientService, type Patient } from "@/services/patientService";
import { sessionService, type Session } from "@/services/sessionService";
import { aiService } from "@/services/aiService";
import {
  KIND_META,
  buildStarter,
  buildReportHtml,
  downloadReportDoc,
  openReportPrintPreview,
} from "@/lib/reportBuilders";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ShareWithPatientButton } from "@/components/ShareWithPatientButton";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;

type WizardState = {
  step: WizardStep;
  patient_id: string;
  kind: ReportKind;
  purpose: "profissional" | "paciente" | "instituicao";
  selected_session_ids: string[];
  sourceText: string;
  content: string;
  reportId?: string;
};

const ATTENDANCE_TYPES = [
  "Psicoterapia individual",
  "Psicoterapia online",
  "Psicoterapia presencial",
  "Orientação",
  "Sessão de acolhimento",
];

const ALL_KINDS = Object.entries(KIND_META) as [ReportKind, (typeof KIND_META)[ReportKind]][];

const PURPOSES = [
  { id: "profissional" as const, label: "Uso profissional" },
  { id: "paciente" as const, label: "Entrega ao paciente" },
  { id: "instituicao" as const, label: "Instituição / terceiro" },
];

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patients: Patient[];
  initialPatientId?: string;
  editingReport?: Report;
  onSaved: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportWizard({ open, onOpenChange, patients, initialPatientId, editingReport, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patientDetail, setPatientDetail] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [attendanceType, setAttendanceType] = useState(ATTENDANCE_TYPES[0]);

  const initialState = (): WizardState => {
    if (editingReport) {
      return {
        step: 3,
        patient_id: editingReport.patient_id,
        kind: editingReport.kind ?? "session_report",
        purpose: (editingReport.purpose as WizardState["purpose"]) ?? "profissional",
        selected_session_ids: [],
        sourceText: "",
        content: editingReport.content ?? "",
        reportId: editingReport.id,
      };
    }
    return {
      step: 1,
      patient_id: initialPatientId ?? "",
      kind: "session_report",
      purpose: "profissional",
      selected_session_ids: [],
      sourceText: "",
      content: "",
    };
  };

  const [state, setState] = useState<WizardState>(initialState);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (open) {
      setState(initialState());
      setIsFullscreen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load sessions once
  useEffect(() => {
    if (!open) return;
    sessionService.list().then((r) => { if (r.success) setSessions(r.data); });
  }, [open]);

  // Load patient detail on patient change
  useEffect(() => {
    if (!state.patient_id) { setPatientDetail(null); return; }
    patientService.getById(state.patient_id).then((r) => { if (r.success) setPatientDetail(r.data as unknown as Patient); });
  }, [state.patient_id]);

  const patientSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.patient_id === state.patient_id)
        .sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""))
        .slice(0, 15),
    [sessions, state.patient_id],
  );

  const selectedPatient = useMemo(() => patients.find((p) => p.id === state.patient_id), [patients, state.patient_id]);
  const selectedSessions = useMemo(
    () => patientSessions.filter((s) => state.selected_session_ids.includes(s.id)),
    [patientSessions, state.selected_session_ids],
  );

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToStep = async (next: WizardStep) => {
    if (next === 2 && state.step === 1) {
      // Generate starter content based on kind + patient
      const starter = buildStarter({
        patient: patientDetail ?? selectedPatient,
        kind: state.kind,
        attendanceType,
        sessions: [],
        psychologistName: user?.name ?? "Psicóloga responsável",
        crp: user?.crp,
      });
      setState((prev) => ({ ...prev, step: 2, content: starter }));
      return;
    }

    if (next === 3 && state.step === 2) {
      // Optionally enrich with AI if sourceText or sessions selected
      const hasSource = state.sourceText.trim() || state.selected_session_ids.length > 0;
      let enrichedContent = buildStarter({
        patient: patientDetail ?? selectedPatient,
        kind: state.kind,
        attendanceType,
        sessions: selectedSessions,
        psychologistName: user?.name ?? "Psicóloga responsável",
        crp: user?.crp,
      });

      if (hasSource && state.sourceText.trim()) {
        setImproving(true);
        const result = await aiService.improveManualReport({
          psychologist_name: user?.name ?? "Psicóloga responsável",
          crp: user?.crp,
          patient_name: selectedPatient?.name,
          date_label: new Date().toLocaleDateString("pt-BR"),
          attendance_type: attendanceType,
          text: state.sourceText.trim() || enrichedContent,
        });
        setImproving(false);
        if (result.success) enrichedContent = result.data.organized_text;
      }

      // Create draft in backend
      if (!state.reportId && state.patient_id) {
        const created = await reportService.create({
          patient_id: state.patient_id,
          purpose: state.purpose,
          kind: state.kind,
          content: enrichedContent,
          status: "draft",
        });
        if (created.success) {
          setState((prev) => ({ ...prev, step: 3, content: enrichedContent, reportId: created.data.id }));
          return;
        }
      }
      setState((prev) => ({ ...prev, step: 3, content: enrichedContent }));
      return;
    }

    setState((prev) => ({ ...prev, step: next }));
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async (markFinal = false) => {
    if (!state.patient_id || !state.content.trim()) return;
    setSaving(true);
    const payload = {
      patient_id: state.patient_id,
      purpose: state.purpose,
      kind: state.kind,
      content: state.content.trim(),
      status: markFinal ? ("final" as const) : ("draft" as const),
    };
    const result = state.reportId
      ? await reportService.update(state.reportId, payload)
      : await reportService.create(payload);
    setSaving(false);
    if (!result.success) {
      toast({ title: "Erro ao salvar", description: result.error.message, variant: "destructive" });
      return;
    }
    if (!state.reportId) setState((prev) => ({ ...prev, reportId: result.data.id }));
    toast({ title: markFinal ? "Relatório finalizado" : "Rascunho salvo" });
    onSaved();
    if (markFinal) onOpenChange(false);
  };

  // ── AI improve (step 3) ─────────────────────────────────────────────────────

  const handleImproveAi = async () => {
    const text = state.content.trim();
    if (!text) return;
    setImproving(true);
    const result = await aiService.improveManualReport({
      psychologist_name: user?.name ?? "Psicóloga responsável",
      crp: user?.crp,
      patient_name: selectedPatient?.name,
      date_label: new Date().toLocaleDateString("pt-BR"),
      attendance_type: attendanceType,
      text,
    });
    setImproving(false);
    if (result.success) {
      setState((prev) => ({ ...prev, content: result.data.organized_text }));
      toast({ title: "Texto melhorado pela IA" });
    } else {
      toast({ title: "IA indisponível", description: result.error.message, variant: "destructive" });
    }
  };

  // ── Preview HTML ─────────────────────────────────────────────────────────────

  const previewHtml = useMemo(() =>
    buildReportHtml({
      report: {
        id: state.reportId ?? "preview",
        patient_id: state.patient_id,
        patient_name: selectedPatient?.name,
        purpose: state.purpose,
        kind: state.kind,
        content: state.content,
        status: "draft",
        created_at: new Date().toISOString(),
      },
      patient: selectedPatient,
      psychologistName: user?.name ?? "Psicóloga responsável",
      crp: user?.crp,
    }),
  [state.reportId, state.patient_id, state.purpose, state.kind, state.content, selectedPatient, user]);

  const canAdvance1 = !!state.patient_id;
  const canSave = !!state.patient_id && !!state.content.trim();

  // ── Render ──────────────────────────────────────────────────────────────────

  const stepLabel = state.step === 1 ? "Contexto" : state.step === 2 ? "Fonte de dados" : "Editor";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${isFullscreen ? "h-[96vh] max-w-[98vw]" : "h-[92vh] max-w-[min(96vw,1400px)]"} overflow-hidden border-border/70 bg-background p-0 flex flex-col`}
      >
        {/* Header */}
        <DialogHeader className="border-b border-border/70 bg-card px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <DialogTitle className="font-serif text-xl">
                {editingReport ? "Editar relatório" : "Novo relatório"}
              </DialogTitle>
              {/* Step indicator */}
              <div className="hidden sm:flex items-center gap-1 text-sm">
                {([1, 2, 3] as WizardStep[]).map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => s < state.step ? setState((prev) => ({ ...prev, step: s })) : undefined}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        state.step === s
                          ? "bg-primary text-primary-foreground"
                          : s < state.step
                            ? "bg-primary/20 text-primary cursor-pointer"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s < state.step ? <Check className="h-3 w-3" /> : s}
                    </button>
                    {s < 3 && <div className={`h-px w-6 ${s < state.step ? "bg-primary/40" : "bg-muted"}`} />}
                  </div>
                ))}
                <span className="ml-2 text-muted-foreground">{stepLabel}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsFullscreen((v) => !v)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {/* ─── STEP 1 ─ Contexto ─────────────────────────────────────────── */}
          {state.step === 1 && (
            <div className="h-full overflow-y-auto px-6 py-6">
              <div className="mx-auto max-w-2xl space-y-6">
                {/* Patient */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Paciente
                  </label>
                  <select
                    value={state.patient_id}
                    onChange={(e) => setState((prev) => ({ ...prev, patient_id: e.target.value, selected_session_ids: [] }))}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione o paciente</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Kind — visual cards */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Tipo de relatório
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ALL_KINDS.map(([id, meta]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setState((prev) => ({ ...prev, kind: id }))}
                        className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                          state.kind === id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <span className="text-2xl leading-none">{meta.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Finalidade
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {PURPOSES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setState((prev) => ({ ...prev, purpose: p.id }))}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          state.purpose === p.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attendance type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Modalidade de atendimento
                  </label>
                  <select
                    value={attendanceType}
                    onChange={(e) => setAttendanceType(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    {ATTENDANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Patient context preview */}
                {patientDetail && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Contexto do paciente</p>
                    <div className="space-y-1 text-sm text-foreground/80">
                      {patientDetail.main_complaint && <p>Queixa: {patientDetail.main_complaint}</p>}
                      {patientDetail.therapy_goals && <p>Objetivos: {patientDetail.therapy_goals}</p>}
                      {patientDetail.care_status && <p>Status: {patientDetail.care_status}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 2 ─ Fonte de dados ────────────────────────────────────── */}
          {state.step === 2 && (
            <div className="h-full overflow-y-auto px-6 py-6">
              <div className="mx-auto max-w-2xl space-y-6">
                <p className="text-sm text-muted-foreground">
                  Opcional — selecione sessões ou cole anotações para enriquecer o rascunho com IA.
                  Clique em <strong>Avançar</strong> sem preencher para usar apenas o template.
                </p>

                {/* Sessions */}
                {patientSessions.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Sessões de referência
                    </label>
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {patientSessions.map((s) => {
                        const checked = state.selected_session_ids.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                              checked ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setState((prev) => ({
                                  ...prev,
                                  selected_session_ids: checked
                                    ? prev.selected_session_ids.filter((id) => id !== s.id)
                                    : [...prev.selected_session_ids, s.id],
                                }))
                              }
                              className="h-4 w-4 accent-primary"
                            />
                            <div className="text-sm">
                              <p className="font-medium text-foreground">{fmtDateTime(s.scheduled_at)}</p>
                              <p className="text-xs text-muted-foreground capitalize">{s.status}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Manual notes */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Anotações clínicas (opcional)
                  </label>
                  <Textarea
                    value={state.sourceText}
                    onChange={(e) => setState((prev) => ({ ...prev, sourceText: e.target.value }))}
                    placeholder="Cole aqui suas anotações clínicas ou pontos-chave da sessão. A IA usará isso para enriquecer o rascunho."
                    className="min-h-[180px] resize-none rounded-2xl border-border/80 bg-background px-5 py-4 text-sm leading-6"
                  />
                </div>

                {improving && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    IA enriquecendo o rascunho...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 3 ─ Editor + Preview ──────────────────────────────────── */}
          {state.step === 3 && (
            <div className="grid h-full xl:grid-cols-2 overflow-hidden">
              {/* Editor */}
              <div className="flex h-full flex-col overflow-hidden border-r border-border/50">
                <div className="flex items-center justify-between border-b border-border/50 px-5 py-3 flex-shrink-0">
                  <span className="text-sm font-medium text-foreground">Conteúdo</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => void handleImproveAi()}
                    disabled={improving}
                  >
                    {improving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-sky-500" />}
                    Melhorar com IA
                  </Button>
                </div>
                <Textarea
                  value={state.content}
                  onChange={(e) => setState((prev) => ({ ...prev, content: e.target.value }))}
                  className="flex-1 resize-none rounded-none border-0 bg-background px-5 py-4 text-base leading-7 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Conteúdo do relatório..."
                />
              </div>

              {/* Preview */}
              <div className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-border/50 px-5 py-3 flex-shrink-0">
                  <span className="text-sm font-medium text-foreground">Preview</span>
                </div>
                <iframe
                  title="Preview do relatório"
                  srcDoc={previewHtml}
                  className="flex-1 w-full bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border/70 bg-card px-6 py-4 flex-shrink-0">
          <div className="flex w-full items-center justify-between gap-3 flex-wrap">
            {/* Left: back */}
            <div>
              {state.step > 1 && !editingReport && (
                <Button variant="ghost" className="gap-2" onClick={() => setState((prev) => ({ ...prev, step: (prev.step - 1) as WizardStep }))}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {state.step === 3 && (
                <>
                  {state.reportId && (
                    <ShareWithPatientButton
                      type="reports"
                      id={state.reportId}
                      shared={false}
                      onToggle={() => {}}
                    />
                  )}
                  <Button variant="outline" className="gap-2" onClick={() => openReportPrintPreview(previewHtml)}>
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => downloadReportDoc(`${selectedPatient?.name ?? "relatorio"}.doc`, previewHtml)}
                  >
                    <FileDown className="h-4 w-4" />
                    DOC
                  </Button>
                  <Button variant="outline" onClick={() => void handleSave(false)} disabled={!canSave || saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar rascunho"}
                  </Button>
                  <Button onClick={() => void handleSave(true)} disabled={!canSave || saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalizar"}
                  </Button>
                </>
              )}

              {state.step === 1 && (
                <Button
                  onClick={() => void goToStep(2)}
                  disabled={!canAdvance1}
                  className="gap-2"
                >
                  Avançar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}

              {state.step === 2 && (
                <Button
                  onClick={() => void goToStep(3)}
                  disabled={improving}
                  className="gap-2"
                >
                  {improving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><ArrowRight className="h-4 w-4" /> Gerar rascunho</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
