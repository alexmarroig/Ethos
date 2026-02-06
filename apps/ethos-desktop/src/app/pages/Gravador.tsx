import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioRecordingService } from "../../services/audioRecordingService";

type RecordingMeta = {
  id: string;
  name: string;
  filePath: string;
  durationMs: number;
  createdAt: string;
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
  const [recordings, setRecordings] = useState<RecordingMeta[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "recording" | "paused" | "stopping">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioRecordingService = useMemo(() => new AudioRecordingService(), []);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);

  const saveRecordings = useCallback((items: RecordingMeta[]) => {
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
        const parsed = JSON.parse(stored) as RecordingMeta[];
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
        const newRecording: RecordingMeta = {
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

  const handleDelete = async (recording: RecordingMeta) => {
    const ok = await window.ethos?.audio?.deleteRecording({ filePath: recording.filePath });
    if (ok?.ok === false) {
      setErrorMessage("Não foi possível excluir a gravação.");
      return;
    }
    setRecordings((prev) => {
      const updated = prev.filter((item) => item.id !== recording.id);
      saveRecordings(updated);
      return updated;
    });
  };

  const handleExport = async (recording: RecordingMeta) => {
    const result = await window.ethos?.audio?.exportRecording({ filePath: recording.filePath });
    if (result?.ok === false) {
      if (result.error && result.error !== "Exportação cancelada.") {
        setErrorMessage(result.error);
      }
    }
  };

  const handleOpen = async (recording: RecordingMeta) => {
    const result = await window.ethos?.audio?.openRecording({ filePath: recording.filePath });
    if (result?.ok === false) {
      setErrorMessage(result.error ?? "Falha ao abrir gravação.");
    }
  };

  const handleRename = (recording: RecordingMeta) => {
    setEditingId(recording.id);
    setEditingName(recording.name);
  };

  const handleRenameSave = () => {
    if (!editingId) return;
    setRecordings((prev) => {
      const updated = prev.map((item) => (item.id === editingId ? { ...item, name: editingName.trim() || item.name } : item));
      saveRecordings(updated);
      return updated;
    });
    setEditingId(null);
    setEditingName("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h2 style={{ marginBottom: 8 }}>Gravador</h2>
        <p style={{ margin: 0, color: "#94A3B8" }}>
          Inicie, pause e finalize gravações com salvamento automático em {`app.getPath("userData")/recordings`}.
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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <p style={{ margin: 0, color: "#94A3B8", fontSize: 12 }}>Status</p>
            <strong style={{ fontSize: 18 }}>
              {recordingStatus === "recording"
                ? "Gravando"
                : recordingStatus === "paused"
                  ? "Pausado"
                  : recordingStatus === "stopping"
                    ? "Finalizando"
                    : "Pronto"}
            </strong>
          </div>
          <div>
            <p style={{ margin: 0, color: "#94A3B8", fontSize: 12 }}>Duração</p>
            <strong style={{ fontSize: 18 }}>{formatDuration(elapsedMs)}</strong>
          </div>
          {errorMessage ? <span style={{ color: "#F87171", marginLeft: "auto" }}>{errorMessage}</span> : null}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
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
            Iniciar
          </button>
          <button
            type="button"
            onClick={recordingStatus === "paused" ? handleResume : handlePause}
            disabled={recordingStatus !== "recording" && recordingStatus !== "paused"}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: recordingStatus === "recording" || recordingStatus === "paused" ? "#0EA5E9" : "#334155",
              color: "#F8FAFC",
              cursor: recordingStatus === "recording" || recordingStatus === "paused" ? "pointer" : "not-allowed",
            }}
          >
            {recordingStatus === "paused" ? "Retomar" : "Pausar"}
          </button>
          <button
            type="button"
            onClick={handleStop}
            disabled={recordingStatus === "idle" || recordingStatus === "stopping"}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: recordingStatus === "recording" || recordingStatus === "paused" ? "#DC2626" : "#334155",
              color: "#F8FAFC",
              cursor: recordingStatus === "recording" || recordingStatus === "paused" ? "pointer" : "not-allowed",
            }}
          >
            Parar
          </button>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ margin: 0 }}>Gravações salvas</h3>
        {recordings.length === 0 ? (
          <p style={{ margin: 0, color: "#94A3B8" }}>Nenhuma gravação ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recordings.map((recording) => {
              const fileUrl = `file://${encodeURI(recording.filePath)}`;
              return (
                <div
                  key={recording.id}
                  style={{
                    background: "#111827",
                    padding: 16,
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      {editingId === recording.id ? (
                        <input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #334155",
                            background: "#0F172A",
                            color: "#E2E8F0",
                          }}
                        />
                      ) : (
                        <strong>{recording.name}</strong>
                      )}
                      <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: 12 }}>
                        {formatDate(recording.createdAt)} · {formatDuration(recording.durationMs)}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {editingId === recording.id ? (
                        <button
                          type="button"
                          onClick={handleRenameSave}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            border: "none",
                            background: "#16A34A",
                            color: "#F8FAFC",
                            cursor: "pointer",
                          }}
                        >
                          Salvar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRename(recording)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            border: "none",
                            background: "#334155",
                            color: "#F8FAFC",
                            cursor: "pointer",
                          }}
                        >
                          Renomear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpen(recording)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 10,
                          border: "none",
                          background: "#475569",
                          color: "#F8FAFC",
                          cursor: "pointer",
                        }}
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport(recording)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 10,
                          border: "none",
                          background: "#0EA5E9",
                          color: "#F8FAFC",
                          cursor: "pointer",
                        }}
                      >
                        Exportar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(recording)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 10,
                          border: "none",
                          background: "#DC2626",
                          color: "#F8FAFC",
                          cursor: "pointer",
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <audio controls src={fileUrl} style={{ width: "100%" }} />
                  <p style={{ margin: 0, color: "#64748B", fontSize: 12 }}>{recording.filePath}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
