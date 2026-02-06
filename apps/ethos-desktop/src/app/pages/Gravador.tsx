import React, { useEffect, useMemo, useRef, useState } from "react";
import { AudioRecordingService } from "../../services/audioRecordingService";

type RecordingMetadata = {
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

const formatDate = (iso: string) => new Date(iso).toLocaleString("pt-BR");

const loadRecordings = (): RecordingMetadata[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as RecordingMetadata[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const Gravador = () => {
  const recorderRef = useRef(new AudioRecordingService());
  const streamRef = useRef<MediaStream | null>(null);
  const [recordings, setRecordings] = useState<RecordingMetadata[]>(() => loadRecordings());
  const [status, setStatus] = useState<"idle" | "recording" | "paused">("idle");
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [activeElapsedMs, setActiveElapsedMs] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const activeDurationLabel = useMemo(
    () => formatDuration(activeElapsedMs),
    [activeElapsedMs]
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
  }, [recordings]);

  useEffect(() => {
    if (status === "recording" && activeStartedAt) {
      const interval = window.setInterval(() => {
        setActiveElapsedMs(Date.now() - activeStartedAt);
      }, 500);
      return () => window.clearInterval(interval);
    }
    return undefined;
  }, [status, activeStartedAt]);

  const startRecording = async () => {
    setError(null);
    try {
      if (status !== "idle") {
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const sessionId = `gravacao-${Date.now()}`;
      await recorderRef.current.start({ stream, sessionId });
      setActiveStartedAt(Date.now());
      setActiveElapsedMs(0);
      setStatus("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a gravação.");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const pauseRecording = () => {
    setError(null);
    if (status === "recording") {
      const paused = recorderRef.current.pause();
      if (paused) {
        setStatus("paused");
      }
    } else if (status === "paused") {
      const resumed = recorderRef.current.resume();
      if (resumed) {
        setActiveStartedAt(Date.now() - activeElapsedMs);
        setStatus("recording");
      }
    }
  };

  const stopRecording = async () => {
    setError(null);
    try {
      if (status === "idle") {
        return;
      }
      const info = await recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (info) {
        const createdAt = new Date().toISOString();
        const metadata: RecordingMetadata = {
          id: info.recordingId,
          name: `Gravação ${new Date(createdAt).toLocaleDateString("pt-BR")}`,
          durationMs: activeElapsedMs,
          createdAt,
          filePath: info.filePath,
        };
        setRecordings((prev) => [metadata, ...prev]);
      }
      setStatus("idle");
      setActiveStartedAt(null);
      setActiveElapsedMs(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível finalizar a gravação.");
    }
  };

  const handleRename = (recording: RecordingMetadata) => {
    setEditingId(recording.id);
    setEditingName(recording.name);
  };

  const handleRenameSave = (recordingId: string) => {
    setRecordings((prev) =>
      prev.map((recording) =>
        recording.id === recordingId
          ? { ...recording, name: editingName.trim() || recording.name }
          : recording
      )
    );
    setEditingId(null);
    setEditingName("");
  };

  const handleDelete = async (recordingId: string, filePath: string) => {
    setError(null);
    try {
      await window.ethos?.audio?.deleteRecording({ filePath });
      setRecordings((prev) => prev.filter((recording) => recording.id !== recordingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a gravação.");
    }
  };

  const handleOpen = async (filePath: string) => {
    setError(null);
    try {
      await window.ethos?.audio?.openRecording({ filePath });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir a gravação.");
    }
  };

  const handleExport = async (filePath: string) => {
    setError(null);
    try {
      await window.ethos?.audio?.exportRecording({ filePath });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível exportar a gravação.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Gravador</h2>
        <p style={{ color: "#94A3B8" }}>
          Grave sessões e salve automaticamente em seu computador.
        </p>
      </header>

      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ fontSize: 18 }}>
              {status === "idle" ? "Pronto para gravar" : "Gravação em andamento"}
            </strong>
            <p style={{ marginTop: 8, color: "#94A3B8" }}>
              {status === "idle" ? "Clique em iniciar quando estiver pronto." : `Tempo: ${activeDurationLabel}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={startRecording}
              disabled={status !== "idle"}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: status === "idle" ? "#2563EB" : "#1F2937",
                color: "#F8FAFC",
                cursor: status === "idle" ? "pointer" : "not-allowed",
              }}
            >
              Iniciar
            </button>
            <button
              type="button"
              onClick={pauseRecording}
              disabled={status === "idle"}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: status === "idle" ? "#1F2937" : "#0EA5E9",
                color: "#F8FAFC",
                cursor: status === "idle" ? "not-allowed" : "pointer",
              }}
            >
              {status === "paused" ? "Retomar" : "Pausar"}
            </button>
            <button
              type="button"
              onClick={stopRecording}
              disabled={status === "idle"}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: status === "idle" ? "#1F2937" : "#DC2626",
                color: "#F8FAFC",
                cursor: status === "idle" ? "not-allowed" : "pointer",
              }}
            >
              Parar
            </button>
          </div>
        </div>
        {error ? (
          <p style={{ marginTop: 12, color: "#FCA5A5" }}>{error}</p>
        ) : null}
      </section>

      <section style={{ background: "#0B1220", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Gravações salvas</h3>
        {recordings.length === 0 ? (
          <p style={{ color: "#94A3B8" }}>Nenhuma gravação encontrada.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      {editingId === recording.id ? (
                        <input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 8,
                            border: "1px solid #334155",
                            background: "#0F172A",
                            color: "#E2E8F0",
                          }}
                        />
                      ) : (
                        <strong>{recording.name}</strong>
                      )}
                      <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>
                        {formatDate(recording.createdAt)} · {formatDuration(recording.durationMs)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {editingId === recording.id ? (
                        <button
                          type="button"
                          onClick={() => handleRenameSave(recording.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "none",
                            background: "#22C55E",
                            color: "#0B1220",
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
                            padding: "6px 10px",
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
                        onClick={() => handleOpen(recording.filePath)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: "#1D4ED8",
                          color: "#E2E8F0",
                          cursor: "pointer",
                        }}
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport(recording.filePath)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: "#0EA5E9",
                          color: "#E2E8F0",
                          cursor: "pointer",
                        }}
                      >
                        Exportar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(recording.id, recording.filePath)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: "#DC2626",
                          color: "#E2E8F0",
                          cursor: "pointer",
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <audio controls style={{ width: "100%" }}>
                    <source src={fileUrl} />
                  </audio>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
