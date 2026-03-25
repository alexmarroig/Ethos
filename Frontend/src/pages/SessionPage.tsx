import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, FileText, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AudioRecorder from "@/components/AudioRecorder";
import ConsentModal from "@/components/ConsentModal";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { sessionService, Session } from "@/services/sessionService";
import { audioService } from "@/services/audioService";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { startJob } from "@/jobs/jobManager";
import { useAppStore } from "@/stores/appStore";
import SavedLocally from "@/components/SavedLocally";

interface SessionPageProps {
  sessionId: number;
  onBack: () => void;
  onOpenProntuario?: (sessionId: number) => void;
}

const SessionPage = ({ sessionId, onBack, onOpenProntuario }: SessionPageProps) => {
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
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Track active job from store
  const pendingJobs = useAppStore((s) => s.pendingJobs);
  const activeJob = pendingJobs.find(
    (j) => j.sessionId === String(sessionId) && j.type === "transcription"
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
      const res = await sessionService.getById(String(sessionId));
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
    const res = await audioService.upload(String(sessionId), audioBlob);
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
      { type: "transcription", sessionId: String(sessionId) },
      () => audioService.transcribe(String(sessionId)) as any
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
        <motion.button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 mb-8" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm">Voltar</span>
        </motion.button>

        <motion.header className="mb-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground">{session?.patient_name || "Sessão"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
            <span>{session?.date}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span>{session?.time}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-pending" />
            <span className="text-sm text-muted-foreground capitalize">{session?.status}</span>
          </div>
        </motion.header>

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
          <Textarea placeholder="Escreva observações livres. Este campo não é exportado automaticamente." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[160px] resize-none text-base leading-relaxed" />
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
