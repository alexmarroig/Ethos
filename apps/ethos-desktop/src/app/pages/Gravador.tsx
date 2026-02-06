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

const toFileUrl = (filePath: string) => `file://${encodeURI(filePath.replace(/\\/g, "/"))}`;

export const Gravador = () => {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "recording" | "paused" | "stopping">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentName, setCurrentName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const audioRecordingService = useMemo(() => new AudioRecordingService(), []);

  const saveRecordings = useCallback((items: RecordingEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const computeElapsed = useCallback(
    (statusOverride?: "recording" | "paused") => {
      if (!startTimeRef.current) return 0;
      const state = statusOverride ?? status;
      const now = state === "paused" && pausedAtRef.current ? pausedAtRef.current : Date.now();
      return Math.max(0, now - startTimeRef.current - pausedTotalRef.current);
    },
    [status]
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as RecordingEntry[];
      if (Array.isArray(parsed)) {
        setRecordings(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    saveRecordings(recordings);
  }, [recordings, saveRecordings]);

  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (status === "recording") {
      timerRef.current = window.setInterval(() => {
        setElapsedMs(computeElapsed());
      }, 500);
    }
    if (status === "paused") {
      setElapsedMs(computeElapsed("paused"));
    }
    if (status === "idle") {
      setElapsedMs(0);
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [computeElapsed, status]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const resetStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    startTimeRef.current = null;
    pausedAtRef.current = null;
    pausedTotalRef.current = 0;
  };

  const handleStart = async () => {
    if (status !== "idle") return;
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const sessionId = `gravacao-${Date.now()}`;
      await audioRecordingService.start({ stream, sessionId, timesliceMs: 2000 });
      startTimeRef.current = Date.now();
      pausedAtRef.current = null;
      pausedTotalRef.current = 0;
      setElapsedMs(0);
      setStatus("recording");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao iniciar gravação.");
      resetStream();
    }
  };

  const handlePauseResume = () => {
    if (status === "recording") {
      audioRecordingService.pause();
      pausedAtRef.current = Date.now();
      setStatus("paused");
    } else if (status === "paused") {
      audioRecordingService.resume();
      if (pausedAtRef.current) {
        pausedTotalRef.current += Date.now() - pausedAtRef.current;
      }
      pausedAtRef.current = null;
      setStatus("recording");
    }
  };

  const handleStop = async () => {
    if (status === "idle" || status === "stopping") return;
    setStatus("stopping");
    setErrorMessage(null);
    try {
      const session = await audioRecordingService.stop();
      const finalDuration = computeElapsed(status === "paused" ? "paused" : "recording");
      if (session?.filePath) {
        const createdAt = new Date().toISOString();
        const defaultName = `Gravação ${formatDate(createdAt)}`;
        const newRecording: RecordingEntry = {
          id: session.recordingId,
          name: currentName.trim() || defaultName,
          filePath: session.filePath,
          durationMs: finalDuration,
          createdAt,
        };
        setRecordings((prev) => [newRecording, ...prev]);
        setCurrentName("");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao finalizar gravação.");
    } finally {
      resetStream();
      setStatus("idle");
    }
  };

  const handleDelete = async (recording: RecordingEntry) => {
    const result = await window.ethos?.audio?.deleteRecording({ filePath: recording.filePath });
    if (result?.ok === false) {
      setErrorMessage("Não foi possível excluir a gravação.");
      return;
    }
    setRecordings((prev) => prev.filter((item) => item.id !== recording.id));
  };

  const handleExport = async (recording: RecordingEntry) => {
    const result = await window.ethos?.audio?.exportRecording({ filePath: recording.filePath });
    if (result?.ok === false && result.error && result.error !== "Exportação cancelada.") {
      setErrorMessage(result.error);
    }
  };

  const handleOpen = async (recording: RecordingEntry) => {
    const result = await window.ethos?.audio?.openRecording({ filePath: recording.filePath });
    if (result?.ok === false) {
      setErrorMessage(result.error ?? "Falha ao abrir gravação.");
    }
  };

  const handleRename = (recording: RecordingEntry) => {
    setEditingId(recording.id);
    setEditingName(recording.name);
  };

  const handleRenameSave = () => {
    if (!editingId) return;
    setRecordings((prev) =>
      prev.map((item) =>
        item.id === editingId ? { ...item, name: editingName.trim() || item.name } : item
      )
    );
    setEditingId(null);
    setEditingName("");
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditingName("");
  };

  const statusLabel =
    status === "recording"
      ? "Gravando"
      : status === "paused"
        ? "Pausado"
        : status === "stopping"
          ? "Finalizando"
          : "Pronto";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h2 style={{ margin: 0, fontSize: 24 }}>Gravador</h2>
        <p style={{ margin: "8px 0 0", color: "#94A3B8" }}>
          Grave sessões de áudio, pause quando necessário e mantenha o histórico com metadados reais.
        </p>
      </header>

      <section
        style={{
          background: "#111827",
          borderRadius: 20,
          padding: 24,
          display: "grid",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#94A3B8", fontSize: 12 }}>Status</span>
            <strong style={{ fontSize: 18, color: status === "recording" ? "#38BDF8" : "#E2E8F0" }}>
              {statusLabel}
            </strong>
          </div>
          <div style={{ display: "grid", gap: 6, textAlign: "right" }}>
            <span style={{ color: "#94A3B8", fontSize: 12 }}>Duração atual</span>
            <strong style={{ fontSize: 28 }}>{formatDuration(elapsedMs)}</strong>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "minmax(0, 1fr) auto",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#94A3B8", fontSize: 12 }}>Nome da gravação</span>
            <input
              value={currentName}
              onChange={(event) => setCurrentName(event.target.value)}
              placeholder="Ex.: Sessão com Maria"
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#0B1220",
                color: "#E2E8F0",
              }}
            />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={handleStart}
              disabled={status !== "idle"}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "none",
                background: status === "idle" ? "#2563EB" : "#1E293B",
                color: "#F8FAFC",
                cursor: status === "idle" ? "pointer" : "not-allowed",
              }}
            >
              Iniciar
            </button>
            <button
              type="button"
              onClick={handlePauseResume}
              disabled={status !== "recording" && status !== "paused"}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "none",
                background: status === "recording" || status === "paused" ? "#0EA5E9" : "#1E293B",
                color: "#F8FAFC",
                cursor: status === "recording" || status === "paused" ? "pointer" : "not-allowed",
              }}
            >
              {status === "paused" ? "Retomar" : "Pausar"}
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={status === "idle" || status === "stopping"}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                border: "none",
                background: status === "recording" || status === "paused" ? "#DC2626" : "#1E293B",
                color: "#F8FAFC",
                cursor: status === "recording" || status === "paused" ? "pointer" : "not-allowed",
              }}
            >
              Parar
            </button>
          </div>
        </div>

        {errorMessage ? <p style={{ margin: 0, color: "#FCA5A5" }}>{errorMessage}</p> : null}
      </section>

      <section
        style={{
          background: "#0B1220",
          borderRadius: 20,
          padding: 24,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <h3 style={{ margin: 0 }}>Gravações salvas</h3>
          <span style={{ color: "#94A3B8", fontSize: 12 }}>{recordings.length} item(ns)</span>
        </div>

        {recordings.length === 0 ? (
          <div style={{ padding: 20, borderRadius: 16, background: "#111827", color: "#94A3B8" }}>
            Nenhuma gravação encontrada. Inicie uma gravação para aparecer aqui.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {recordings.map((recording) => (
              <div
                key={recording.id}
                style={{
                  background: "#111827",
                  borderRadius: 16,
                  padding: 20,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
                  <div style={{ minWidth: 200, flex: "1 1 240px" }}>
                    {editingId === recording.id ? (
                      <input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid #334155",
                          background: "#0B1220",
                          color: "#E2E8F0",
                          width: "100%",
                        }}
                      />
                    ) : (
                      <h4 style={{ margin: 0, fontSize: 16 }}>{recording.name}</h4>
                    )}
                    <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 12 }}>
                      {formatDate(recording.createdAt)} • {formatDuration(recording.durationMs)}
                    </p>
                    <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 11 }}>{recording.filePath}</p>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                    {editingId === recording.id ? (
                      <>
                        <button
                          type="button"
                          onClick={handleRenameSave}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: "#22C55E",
                            color: "#0F172A",
                            cursor: "pointer",
                          }}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={handleRenameCancel}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: "#334155",
                            color: "#E2E8F0",
                            cursor: "pointer",
                          }}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRename(recording)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "none",
                          background: "#334155",
                          color: "#E2E8F0",
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
                        borderRadius: 8,
                        border: "none",
                        background: "#1D4ED8",
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
                        borderRadius: 8,
                        border: "none",
                        background: "#0EA5E9",
                        color: "#0F172A",
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
                        borderRadius: 8,
                        border: "none",
                        background: "#991B1B",
                        color: "#F8FAFC",
                        cursor: "pointer",
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <audio controls style={{ width: "100%" }} src={toFileUrl(recording.filePath)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
