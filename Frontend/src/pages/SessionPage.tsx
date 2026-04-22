import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, FileText, Eye, EyeOff, Loader2, Repeat2, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import AudioRecorder from "@/components/AudioRecorder";
import ConsentModal from "@/components/ConsentModal";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { sessionService, Session } from "@/services/sessionService";
import { audioService } from "@/services/audioService";
import { financeService, type FinancialEntry } from "@/services/financeService";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrivacy } from "@/hooks/usePrivacy";
import { startJob } from "@/jobs/jobManager";
import { useAppStore } from "@/stores/appStore";
import SavedLocally from "@/components/SavedLocally";
import { useOnboarding } from "@/contexts/OnboardingContext";
import OnboardingCoachmark from "@/components/OnboardingCoachmark";

interface SessionPageProps {
  sessionId: string;
  onBack: () => void;
  onOpenProntuario?: (sessionId: string) => void;
}

const SessionPage = ({ sessionId, onBack, onOpenProntuario }: SessionPageProps) => {
  const { currentMissionId, shouldShowCoachmarks, markMissionCompleted } = useOnboarding();
  const { maskName } = usePrivacy();
  const [notes, setNotes] = useState("");
  const [hasAudio, setHasAudio] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [confirmingSession, setConfirmingSession] = useState(false);
  const [cancellingOrUpdatingSeries, setCancellingOrUpdatingSeries] = useState(false);
  const [linkedEntry, setLinkedEntry] = useState<FinancialEntry | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [dismissCoachmark, setDismissCoachmark] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Track active job from store
  const pendingJobs = useAppStore((s) => s.pendingJobs);
  const activeJob = pendingJobs.find(
    (j) => j.sessionId === sessionId && j.type === "transcription"
  );

  useEffect(() => {
    if (!activeJob) return;
    const s = activeJob.status as string;
    if (s === "completed" && activeJob.result) {
      setTranscriptionStatus("Transcrição concluída");
      setTranscriptionText(activeJob.result);
      setTranscribing(false);
    } else if (s === "failed") {
      setTranscriptionStatus("Falha técnica");
      setTranscribing(false);
    } else {
      setTranscribing(true);
      setTranscriptionStatus("Organizando registro...");
    }
  }, [activeJob?.status]);

  useEffect(() => {
    const load = async () => {
      const res = await sessionService.getById(sessionId);
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
      } else {
        setSession(res.data);
        setHasAudio(!!res.data.has_audio);
      }
      setLoading(false);
    };
    load();
  }, [sessionId]);

  useEffect(() => {
    const loadLinkedPayment = async () => {
      const result = await financeService.listEntries({ session_id: sessionId, page_size: 1 });
      if (!result.success) return;
      const entry = result.data.find((item) => item.session_id === sessionId) ?? null;
      setLinkedEntry(entry);
      setPaymentAmount(entry ? String(entry.amount) : "");
      setPaymentDueDate(entry?.due_date ? new Date(entry.due_date).toISOString().slice(0, 10) : "");
      setPaymentMethod(entry?.payment_method ?? "");
    };

    void loadLinkedPayment();
  }, [sessionId]);

  const canGenerateProntuario = hasAudio || notes.trim().length > 0;

  const handleRecordingComplete = (blob: Blob) => {
    setHasAudio(true);
    setAudioBlob(blob);
  };

  // Show consent modal before uploading
  const handleUploadClick = () => {
    setConsentOpen(true);
  };

  const handleConsentConfirm = async () => {
    setConsentOpen(false);
    if (!audioBlob) return;
    setUploading(true);
    const res = await audioService.upload(sessionId, audioBlob);
    if (res.success) {
      setShowSaved(true);
    } else {
      toast({ title: "Erro ao enviar", description: res.error.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleTranscribe = async () => {
    setTranscribing(true);
    setTranscriptionStatus("Organizando registro...");

    const jobId = await startJob(
      { type: "transcription", sessionId },
      () => audioService.transcribe(sessionId) as any
    );

    if (!jobId) {
      setTranscriptionStatus("Falha técnica");
      setTranscribing(false);
      toast({ title: "Erro", description: "Não foi possível iniciar a transcrição.", variant: "destructive" });
    }
  };

  const handleGenerateProntuario = () => {
    if (canGenerateProntuario && onOpenProntuario) {
      onOpenProntuario(sessionId);
    }
  };

  const handleConfirmSession = async () => {
    if (!session) return;
    setConfirmingSession(true);
    const result = await sessionService.updateStatus(session.id, "confirmed");
    setConfirmingSession(false);
    if (!result.success) {
      toast({ title: "Erro ao confirmar", description: result.error.message, variant: "destructive" });
      return;
    }
    setSession(result.data);
    markMissionCompleted("register-attendance");
    toast({ title: "Sessão confirmada", description: "Marcada como confirmada pelo paciente." });
  };

  const handleChangeStatus = async (newStatus: Session["status"]) => {
    if (!session) return;
    const result = await sessionService.updateStatus(session.id, newStatus);
    if (!result.success) {
      toast({ title: "Erro ao atualizar status", description: result.error.message, variant: "destructive" });
      return;
    }
    setSession(result.data);
    if (newStatus === "confirmed" || newStatus === "completed" || newStatus === "missed") {
      markMissionCompleted("register-attendance");
    }
    toast({ title: "Status atualizado" });
  };

  const statusLabel = (() => {
    switch (session?.status) {
      case "pending": return "Pendente de confirmação";
      case "confirmed": return "Confirmada pelo paciente";
      case "completed": return "Sessão concluída";
      case "missed": return "Paciente faltou";
      case "cancelled_with_notice": return "Cancelado com aviso";
      case "cancelled_no_show": return "Cancelado sem aviso";
      case "rescheduled_by_patient": return "Remarcado pelo paciente";
      case "rescheduled_by_psychologist": return "Remarcado pelo psicólogo";
      default: return session?.status ?? "Sessão";
    }
  })();

  const handleSavePayment = async (markAsPaid = false) => {
    if (!session || !paymentAmount.trim()) {
      toast({ title: "Informe o valor", description: "Preencha o valor para registrar o pagamento.", variant: "destructive" });
      return;
    }

    setPaymentSaving(true);
    const payload = {
      session_id: session.id,
      patient_id: session.patient_id,
      amount: Number(paymentAmount),
      due_date: paymentDueDate ? new Date(`${paymentDueDate}T12:00:00`).toISOString() : undefined,
      payment_method: paymentMethod || undefined,
      status: markAsPaid ? ("paid" as const) : ("open" as const),
      paid_at: markAsPaid ? new Date().toISOString() : undefined,
      description: "Sessão de psicoterapia",
    };

    const result = linkedEntry
      ? await financeService.updateEntry(linkedEntry.id, payload)
      : await financeService.createEntry(payload);

    setPaymentSaving(false);

    if (!result.success) {
      toast({ title: "Erro ao salvar pagamento", description: result.error.message, variant: "destructive" });
      return;
    }

    setLinkedEntry(result.data);
    setPaymentAmount(String(result.data.amount));
    setPaymentDueDate(result.data.due_date ? new Date(result.data.due_date).toISOString().slice(0, 10) : "");
    setPaymentMethod(result.data.payment_method ?? "");
    markMissionCompleted("register-payment");
    toast({
      title: markAsPaid ? "Pagamento marcado como pago" : linkedEntry ? "Cobrança atualizada" : "Cobrança registrada",
      description: markAsPaid ? "A sessão ficou quitada no financeiro." : "O pagamento desta sessão foi vinculado ao financeiro.",
    });
  };

  const handleNotesBlur = () => {
    if (notes.trim().length >= 10) {
      markMissionCompleted("session-note");
    }
  };

  const handleCancelSeries = async () => {
    if (!session?.series_id) return;
    if (!window.confirm("Cancelar todas as sessões futuras desta série?")) return;
    setCancellingOrUpdatingSeries(true);
    const result = await sessionService.cancelSeries(session.series_id);
    setCancellingOrUpdatingSeries(false);
    if (!result.success) {
      toast({ title: "Erro ao cancelar série", variant: "destructive" });
      return;
    }
    toast({ title: "Série cancelada", description: `${result.data.cancelled} sessão(ões) removida(s).` });
    onBack();
  };

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Preparando sessão...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm">Voltar</span>
        </button>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <ConsentModal isOpen={consentOpen} onClose={() => setConsentOpen(false)} onConfirm={handleConsentConfirm} />

      <div className="content-container py-6 md:py-8">
        {shouldShowCoachmarks && !dismissCoachmark && (currentMissionId === "register-attendance" || currentMissionId === "session-note") ? (
          <OnboardingCoachmark
            title={currentMissionId === "register-attendance" ? "Missão 3: registre a frequência" : "Missão 5: anote a sessão"}
            description={currentMissionId === "register-attendance"
              ? "Atualize o status da sessão para Confirmada/Concluída/Faltou para registrar presença."
              : "Escreva uma observação clínica com pelo menos alguns detalhes para concluir essa etapa."}
            onDismiss={() => setDismissCoachmark(true)}
          />
        ) : null}
        <motion.button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 mb-8" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm">Voltar</span>
        </motion.button>

        <motion.header className="mb-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-2xl font-medium text-foreground md:text-3xl">{maskName(session?.patient_name) || "Sessão"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
            <span>{session?.date}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span>{session?.time}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              session?.status === "confirmed" || session?.status === "completed" ? "bg-status-validated"
              : session?.status === "missed" || session?.status === "cancelled_no_show" ? "bg-destructive"
              : session?.status === "cancelled_with_notice" ? "bg-orange-400"
              : session?.status === "rescheduled_by_patient" || session?.status === "rescheduled_by_psychologist" ? "bg-blue-400"
              : "bg-status-pending"
            }`} />
            <span className="text-sm text-muted-foreground">{statusLabel}</span>
            {session?.status === "pending" ? (
              <Button variant="outline" size="sm" className="ml-2 gap-2" onClick={handleConfirmSession} disabled={confirmingSession}>
                {confirmingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirmado pelo paciente
              </Button>
            ) : null}
            {session && !["completed"].includes(session.status) ? (
              <select
                className="ml-2 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                value={session.status}
                onChange={(e) => void handleChangeStatus(e.target.value as Session["status"])}
              >
                <option value="pending">Pendente</option>
                <option value="confirmed">Confirmada</option>
                <option value="missed">Faltou</option>
                <option value="cancelled_with_notice">Cancelado com aviso</option>
                <option value="cancelled_no_show">Cancelado sem aviso</option>
                <option value="rescheduled_by_patient">Remarcado pelo paciente</option>
                <option value="rescheduled_by_psychologist">Remarcado pelo psicólogo</option>
              </select>
            ) : null}
          </div>
        </motion.header>

        {session?.series_id && (
          <motion.div
            className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Repeat2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Sessão recorrente</span>
              {session.recurrence && (
                <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {session.recurrence.type === "weekly" ? "Semanal" : session.recurrence.type === "biweekly" ? "Quinzenal" : "2× semana"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Esta sessão faz parte de uma série recorrente. Ao cancelar a série, todas as sessões futuras agendadas serão removidas.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleCancelSeries}
              disabled={cancellingOrUpdatingSeries}
            >
              {cancellingOrUpdatingSeries ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Cancelar série inteira
            </Button>
          </motion.div>
        )}

        <motion.section className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="font-serif text-xl font-medium text-foreground mb-4">Registro da sessão</h2>
          <div className="space-y-4">
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            {audioBlob && (
              <div className="flex gap-3">
                <Button variant="secondary" className="gap-2" onClick={handleUploadClick} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" strokeWidth={1.5} />}
                  Enviar para sessão
                </Button>
                <Button variant="secondary" className="gap-2" onClick={handleTranscribe} disabled={transcribing}>
                  {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" strokeWidth={1.5} />}
                  Transcrever
                </Button>
              </div>
            )}
            {transcriptionStatus && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">{transcriptionStatus}</p>
              </div>
            )}
            <SavedLocally show={showSaved} onDone={() => setShowSaved(false)} />
            {transcriptionText && (
              <div>
                <button onClick={() => setShowTranscription(!showTranscription)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {showTranscription ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showTranscription ? "Ocultar transcrição" : "Ver transcrição completa (uso técnico)"}
                </button>
                {showTranscription && (
                  <div className="mt-3 p-4 rounded-xl bg-card border border-border">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{transcriptionText}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.section>

        <motion.section className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-serif text-xl font-medium text-foreground mb-4">Anotações do profissional</h2>
          <Textarea placeholder="Escreva observações livres. Este campo não é exportado automaticamente." value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={handleNotesBlur} className="min-h-[160px] resize-none text-base leading-relaxed" />
        </motion.section>

        <motion.section className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="font-serif text-xl font-medium text-foreground mb-4">Pagamento da sessão</h2>
          <div className="session-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {linkedEntry
                    ? linkedEntry.status === "paid"
                      ? "Pagamento já registrado como pago"
                      : "Cobrança pendente vinculada a esta sessão"
                    : "Nenhuma cobrança vinculada a esta sessão ainda"}
                </span>
              </div>
              {linkedEntry ? (
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  {linkedEntry.status === "paid" ? "Pago" : "Pendente"}
                </span>
              ) : null}
            </div>
            {!linkedEntry && (
              <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground">
                💡 <strong>Cobrança automática:</strong> se o valor de sessão estiver configurado no perfil do paciente e a cobrança automática estiver ativa, o lançamento é gerado ao marcar a sessão como <strong>"Concluída"</strong> na Agenda. Ou registre manualmente abaixo.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Input type="number" step="0.01" placeholder="Valor da sessão" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
              <Input type="date" value={paymentDueDate} onChange={(event) => setPaymentDueDate(event.target.value)} />
              <Input placeholder="Forma de pagamento" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void handleSavePayment(false)} disabled={paymentSaving || !paymentAmount.trim()}>
                {paymentSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {linkedEntry ? "Atualizar cobrança" : "Lançar cobrança da sessão"}
              </Button>
              <Button onClick={() => void handleSavePayment(true)} disabled={paymentSaving || !paymentAmount.trim()}>
                {paymentSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Marcar como pago
              </Button>
            </div>
          </div>
        </motion.section>

        <motion.div className={`fixed bottom-0 right-0 p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent ${isMobile ? "left-0" : "left-64"}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="content-container">
            <Button className="w-full md:w-auto px-8 py-4 h-auto text-base gap-2" disabled={!canGenerateProntuario} onClick={handleGenerateProntuario}>
              {canGenerateProntuario && <FileText className="w-4 h-4" strokeWidth={1.5} />}
              {canGenerateProntuario ? "Gerar prontuário (rascunho)" : "Registrar sessão"}
            </Button>
            {canGenerateProntuario && (
              <p className="mt-2 text-xs text-muted-foreground">O prontuário será gerado como rascunho e deverá ser validado.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SessionPage;
