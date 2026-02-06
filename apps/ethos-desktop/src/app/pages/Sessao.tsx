import React, { useEffect, useMemo, useState } from "react";
import { TranscriptionService, type TranscriptionResult } from "../../services/transcriptionService";

export const Sessao = () => {
  const [consent, setConsent] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState("idle");
  const [jobProgress, setJobProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptionResult["transcript"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sessionId = "sessao-marina-001";
  const transcriptionService = useMemo(() => new TranscriptionService(), []);

  useEffect(() => {
    transcriptionService.onJobUpdate((job) => {
      if (job.sessionId !== sessionId) {
        return;
      }
      setJobId(job.id);
      setJobStatus(job.status);
      setJobProgress(job.progress);
      if (job.status === "failed") {
        setErrorMessage(job.error ?? "Falha ao transcrever.");
      }
    });
    transcriptionService.onJobResult((result) => {
      if (result.jobId !== jobId) {
        return;
      }
      setTranscript(result.transcript);
      setJobStatus("completed");
    });
    transcriptionService.onJobError((error) => {
      if (error.jobId !== jobId) {
        return;
      }
      setErrorMessage(error.error);
      setJobStatus("failed");
    });
  }, [jobId, sessionId, transcriptionService]);

  const handlePickAudio = async () => {
    const path = await transcriptionService.pickAudio();
    if (path) {
      setAudioPath(path);
      setTranscript(null);
      setErrorMessage(null);
      setJobStatus("idle");
      setJobProgress(0);
    }
  };

  const handleTranscribe = async () => {
    if (!audioPath) {
      setErrorMessage("Selecione um áudio primeiro.");
      return;
    }
    if (!consent) {
      setErrorMessage("Confirme o consentimento antes de transcrever.");
      return;
    }
    setErrorMessage(null);
    setJobStatus("queued");
    const newJobId = await transcriptionService.enqueueTranscription(sessionId, audioPath, "ptbr-accurate");
    if (newJobId) {
      setJobId(newJobId);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Sessão em andamento</h2>
        <p style={{ color: "#94A3B8" }}>Fluxo offline com captura e validação.</p>
      </header>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <p>Paciente: Marina Alves</p>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            type="button"
            onClick={handlePickAudio}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#3B82F6",
              color: "white",
              cursor: "pointer",
            }}
          >
            Importar áudio
          </button>
          <button
            type="button"
            onClick={handleTranscribe}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#475569",
              color: "white",
              cursor: "pointer",
            }}
          >
            Transcrever áudio
          </button>
        </div>
        {audioPath ? (
          <p style={{ color: "#CBD5F5", marginTop: 8, fontSize: 12 }}>Arquivo selecionado: {audioPath}</p>
        ) : (
          <p style={{ color: "#94A3B8", marginTop: 8, fontSize: 12 }}>Selecione um áudio (.mp3, .wav, .m4a) para transcrição.</p>
        )}
        <label style={{ display: "block", marginTop: 12, color: "#E2E8F0" }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />{" "}
          Tenho consentimento do paciente
        </label>
        <p style={{ color: "#94A3B8", marginTop: 8 }}>
          Status da transcrição: {jobStatus} · progresso {Math.round(jobProgress * 100)}%
        </p>
        {errorMessage ? (
          <p style={{ color: "#FCA5A5", marginTop: 8 }}>{errorMessage}</p>
        ) : null}
        {transcript ? (
          <div style={{ marginTop: 12, padding: 12, background: "#0B1220", borderRadius: 12 }}>
            <p style={{ marginTop: 0, marginBottom: 8, color: "#E2E8F0" }}>
              Transcrição ({transcript.language ?? "pt"}):
            </p>
            <p style={{ color: "#CBD5F5", whiteSpace: "pre-wrap" }}>{transcript.fullText}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
};
