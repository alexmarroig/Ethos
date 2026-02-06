import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioRecordingService } from "../../services/audioRecordingService";

type RecordingEntry = {
  id: string;
  name: string;
  durationMs: number;
  createdAt: string;
  filePath: string;
};

const STORAGE_KEY = "ethos.recordings";

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const Gravador = () => {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "recording" | "paused" | "stopping">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioRecordingService = useMemo(() => new AudioRecordingService(), []);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);

  const saveRecordings = useCallback((items: RecordingEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const computeElapsed = useCallback(
    (statusOverride?: "recording" | "paused") => {
      if (!startTimeRef.current) return 0;
      const status = statusOverride ?? recordingStatus;
      const now = status === "paused" && pausedAtRef.current ? pausedAtRef.current : Date.now();
      return Math.max(0, now - startTimeRef.current - pausedTotalRef.current);
    },
    [recordingStatus]
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RecordingEntry[];
        if (Array.isArray(parsed)) {
          setRecordings(parsed);
        }
      } catch {
        // ignore invalid storage
      }
    }
  }, []);

  useEffect(() => {
    if (recordingStatus === "idle") {
      setElapsedMs(0);
      return;
    }
    const timer = window.setInterval(() => {
      setElapsedMs(computeElapsed());
    }, 500);
    return () => window.clearInterval(timer);
  }, [computeElapsed, recordingStatus]);

  const handleStart = async () => {
    if (recordingStatus !== "idle") return;
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const sessionId = `gravacao-${Date.now()}`;
      await audioRecordingService.start({ stream, sessionId, timesliceMs: 2000 });
      startTimeRef.current = Date.now();
      pausedAtRef.current = null;
      pausedTotalRef.current = 0;
      setElapsedMs(0);
      setRecordingStatus("recording");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao iniciar gravação.");
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
  };

  const handlePause = async () => {
    if (recordingStatus !== "recording") return;
    await audioRecordingService.pause();
    pausedAtRef.current = Date.now();
    setRecordingStatus("paused");
  };

  const handleResume = async () => {
    if (recordingStatus !== "paused") return;
    await audioRecordingService.resume();
    if (pausedAtRef.current) {
      pausedTotalRef.current += Date.now() - pausedAtRef.current;
    }
    pausedAtRef.current = null;
    setRecordingStatus("recording");
  };

  const handleStop = async () => {
    if (recordingStatus === "idle" || recordingStatus === "stopping") return;
    const wasPaused = recordingStatus === "paused";
    setRecordingStatus("stopping");
    try {
      const session = await audioRecordingService.stop();
      const finalDuration = computeElapsed(wasPaused ? "paused" : "recording");
      if (session?.filePath) {
        const createdAt = new Date().toISOString();
        const newRecording: RecordingEntry = {
          id: session.recordingId,
          name: `Gravação ${formatDate(createdAt)}`,
          filePath: session.filePath,
          durationMs: finalDuration,
          createdAt,
        };
        setRecordings((prev) => {
          const updated = [newRecording, ...prev];
          saveRecordings(updated);
          return updated;
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao finalizar gravação.");
    } finally {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      startTimeRef.current = null;
      pausedAtRef.current = null;
      pausedTotalRef.current = 0;
      setRecordingStatus("idle");
    }
  };

  const statusLabel =
    recordingStatus === "recording"
      ? "Gravando"
      : recordingStatus === "paused"
        ? "Pausado"
        : recordingStatus === "stopping"
          ? "Finalizando"
          : "Pronto";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h2 style={{ margin: 0, fontSize: 24 }}>Gravador</h2>
        <p style={{ margin: "8px 0 0", color: "#94A3B8" }}>
          Controle suas gravações de áudio e mantenha tudo organizado na sua biblioteca.
        </p>
      </header>

      <section
        style={{
          background: "#111827",
          padding: 24,
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>Status</p>
            <strong style={{ fontSize: 18 }}>{statusLabel}</strong>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>Timer</p>
            <strong style={{ fontSize: 18 }}>{formatDuration(elapsedMs)}</strong>
          </div>
          {errorMessage ? <span style={{ color: "#F87171", marginLeft: "auto" }}>{errorMessage}</span> : null}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleStart}
            disabled={recordingStatus !== "idle"}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: recordingStatus === "idle" ? "#16A34A" : "#334155",
              color: "#F8FAFC",
              cursor: recordingStatus === "idle" ? "pointer" : "not-allowed",
            }}
          >
            Gravar
          </button>
          <button
            type="button"
            onClick={recordingStatus === "paused" ? handleResume : handlePause}
            disabled={recordingStatus === "idle" || recordingStatus === "stopping"}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: recordingStatus === "idle" ? "#334155" : "#0EA5E9",
              color: "#F8FAFC",
              cursor: recordingStatus === "idle" ? "not-allowed" : "pointer",
            }}
          >
            {recordingStatus === "paused" ? "Retomar" : "Pausar"}
          </button>
          <button
            type="button"
            onClick={handleStop}
            disabled={recordingStatus === "idle"}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: recordingStatus === "idle" ? "#334155" : "#DC2626",
              color: "#F8FAFC",
              cursor: recordingStatus === "idle" ? "not-allowed" : "pointer",
            }}
          >
            Parar
          </button>
        </div>
      </section>

      <section
        style={{
          background: "#0B1220",
          padding: 24,
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <header>
          <h3 style={{ margin: 0 }}>Biblioteca</h3>
          <p style={{ margin: "6px 0 0", color: "#94A3B8" }}>
            Histórico de gravações salvas no seu dispositivo.
          </p>
        </header>
        {recordings.length === 0 ? (
          <p style={{ color: "#94A3B8" }}>Nenhuma gravação encontrada.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recordings.map((recording) => (
              <div
                key={recording.id}
                style={{
                  background: "#111827",
                  padding: 16,
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>{recording.name}</strong>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                    {formatDuration(recording.durationMs)} • {formatDate(recording.createdAt)}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#64748B" }}>{recording.filePath}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
