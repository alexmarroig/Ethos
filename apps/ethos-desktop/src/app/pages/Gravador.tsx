import React, { useEffect, useMemo, useRef, useState } from "react";
import { AudioRecordingService } from "../../services/audioRecordingService";

type RecordingMetadata = {
  id: string;
  name: string;
  durationMs: number;
  createdAt: string;
  filePath: string;
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioRecordingService } from "../../services/audioRecordingService";

type RecordingEntry = {
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
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatDate = (dateIso: string) => {
  return new Date(dateIso).toLocaleString("pt-BR");
};

const toFileUrl = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, "/");
  return `file://${encodeURI(normalized)}`;
};

const getFileExtension = (filePath: string) => {
  const parts = filePath.split(".");
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return "webm";
};

const recorderService = new AudioRecordingService();

export const Gravador = () => {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "recording" | "paused">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentName, setCurrentName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  const persistRecordings = useCallback((entries: RecordingEntry[]) => {
    setRecordings(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, []);

  const updateRecordings = useCallback((updater: (entries: RecordingEntry[]) => RecordingEntry[]) => {
    setRecordings((prev) => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as RecordingEntry[];
      setRecordings(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearIntervalTimer = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startIntervalTimer = () => {
    clearIntervalTimer();
    intervalRef.current = window.setInterval(() => {
      if (!startTimeRef.current) {
        return;
      }
      setElapsedMs(Date.now() - startTimeRef.current - pausedDurationRef.current);
    }, 500);
  };

  useEffect(() => {
    return () => {
      clearIntervalTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const isRecording = status === "recording";
  const isPaused = status === "paused";

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const startInfo = await recorderService.start({ stream });
      const now = new Date();
      const defaultName = `Gravação ${now.toLocaleString("pt-BR")}`;
      setCurrentRecordingId(startInfo.recordingId);
      setCurrentFilePath(startInfo.filePath);
      setCurrentName(defaultName);
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      pausedAtRef.current = null;
      setElapsedMs(0);
      setStatus("recording");
      startIntervalTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao iniciar gravação.");
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
    if (!isRecording) return;
    recorderService.pause();
    pausedAtRef.current = Date.now();
    setStatus("paused");
    clearIntervalTimer();
  };

  const resumeRecording = () => {
    if (!isPaused) return;
    recorderService.resume();
    if (pausedAtRef.current) {
      pausedDurationRef.current += Date.now() - pausedAtRef.current;
    }
    pausedAtRef.current = null;
    setStatus("recording");
    startIntervalTimer();
  };

  const stopRecording = async () => {
    clearIntervalTimer();
    try {
      const result = await recorderService.stop();
      if (!result) {
        return;
      }
      const durationMs = elapsedMs;
      const entry: RecordingEntry = {
        id: currentRecordingId ?? result.recordingId,
        name: currentName || `Gravação ${formatDate(new Date().toISOString())}`,
        filePath: result.filePath ?? currentFilePath ?? "",
        durationMs,
        createdAt: new Date().toISOString(),
      };
      updateRecordings((prev) => [entry, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao encerrar gravação.");
    } finally {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatus("idle");
      setCurrentRecordingId(null);
      setCurrentFilePath(null);
      setCurrentName("");
      setElapsedMs(0);
    }
  };

  const deleteRecording = async (entry: RecordingEntry) => {
    try {
      await window.ethos?.audio.deleteRecording({ filePath: entry.filePath });
      updateRecordings((prev) => prev.filter((item) => item.id !== entry.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir gravação.");
    }
  };

  const openRecording = async (entry: RecordingEntry) => {
    try {
      await window.ethos?.audio.openRecording({ filePath: entry.filePath });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir gravação.");
    }
  };

  const showRecording = async (entry: RecordingEntry) => {
    try {
      await window.ethos?.audio.showRecording({ filePath: entry.filePath });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir pasta.");
    }
  };

  const exportRecording = async (entry: RecordingEntry) => {
    try {
      await window.ethos?.audio.exportRecording({
        filePath: entry.filePath,
        defaultName: `${entry.name}.${getFileExtension(entry.filePath)}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao exportar gravação.");
    }
  };

  const startEditing = (entry: RecordingEntry) => {
    setEditingId(entry.id);
    setEditingName(entry.name);
  };

  const saveEditing = () => {
    if (!editingId) {
      return;
    }
    const updated = recordings.map((entry) =>
      entry.id === editingId ? { ...entry, name: editingName.trim() || entry.name } : entry
    );
    persistRecordings(updated);
    setEditingId(null);
    setEditingName("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const currentDuration = useMemo(() => formatDuration(elapsedMs), [elapsedMs]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h2 style={{ margin: 0, fontSize: 24 }}>Gravador</h2>
        <p style={{ margin: "8px 0 0", color: "#94A3B8" }}>
          Grave sessões de áudio e gerencie seus arquivos localmente.
        </p>
      </header>

      <section
        style={{
          background: "#111827",
          borderRadius: 16,
          padding: 24,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>Controles de gravação</h3>
            <p style={{ margin: "6px 0 0", color: "#94A3B8" }}>
              Status:{" "}
              <strong style={{ color: isRecording ? "#38BDF8" : isPaused ? "#FBBF24" : "#E2E8F0" }}>
                {status === "recording" ? "Gravando" : status === "paused" ? "Pausado" : "Parado"}
              </strong>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>{currentDuration}</p>
            <span style={{ color: "#94A3B8", fontSize: 12 }}>Duração atual</span>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button
            type="button"
            onClick={startRecording}
            disabled={status !== "idle"}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
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
            onClick={pauseRecording}
            disabled={!isRecording}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: isRecording ? "#F59E0B" : "#1E293B",
              color: "#F8FAFC",
              cursor: isRecording ? "pointer" : "not-allowed",
            }}
          >
            Pausar
          </button>
          <button
            type="button"
            onClick={resumeRecording}
            disabled={!isPaused}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: isPaused ? "#22C55E" : "#1E293B",
              color: "#F8FAFC",
              cursor: isPaused ? "pointer" : "not-allowed",
            }}
          >
            Retomar
          </button>
          <button
            type="button"
            onClick={stopRecording}
            disabled={status === "idle"}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: status !== "idle" ? "#EF4444" : "#1E293B",
              color: "#F8FAFC",
              cursor: status !== "idle" ? "pointer" : "not-allowed",
            }}
          >
            Parar
          </button>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#94A3B8", fontSize: 12 }}>Nome da gravação</span>
          <input
            value={currentName}
            onChange={(event) => setCurrentName(event.target.value)}
            placeholder="Ex.: Sessão com João"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #334155",
              background: "#0B1220",
              color: "#E2E8F0",
            }}
          />
        </label>

        {error ? <p style={{ margin: 0, color: "#FCA5A5" }}>{error}</p> : null}
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Gravações salvas</h3>
        {recordings.length === 0 ? (
          <div style={{ padding: 24, background: "#0B1220", borderRadius: 16, color: "#94A3B8" }}>
            Nenhuma gravação ainda. Inicie uma gravação para vê-la aqui.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {recordings.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: "#111827",
                  borderRadius: 16,
                  padding: 20,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    {editingId === entry.id ? (
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
                      <h4 style={{ margin: 0, fontSize: 16 }}>{entry.name}</h4>
                    )}
                    <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 12 }}>
                      {formatDate(entry.createdAt)} • {formatDuration(entry.durationMs)}
                    </p>
                    <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 11 }}>{entry.filePath}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {editingId === entry.id ? (
                      <>
                        <button
                          type="button"
                          onClick={saveEditing}
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
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRename(recording)}
                          style={{
                            padding: "6px 10px",
                        <button
                          type="button"
                          onClick={cancelEditing}
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
                        onClick={() => handleOpen(recording.filePath)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: "#1D4ED8",
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(entry)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "none",
                          background: "#334155",
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
                        Renomear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteRecording(entry)}
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

                <audio controls style={{ width: "100%" }} src={toFileUrl(entry.filePath)} />

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => openRecording(entry)}
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
                    onClick={() => showRecording(entry)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "#475569",
                      color: "#F8FAFC",
                      cursor: "pointer",
                    }}
                  >
                    Mostrar na pasta
                  </button>
                  <button
                    type="button"
                    onClick={() => exportRecording(entry)}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
