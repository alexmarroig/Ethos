// apps/ethos-desktop/src/components/App.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportClinicalNote } from "../services/exportService";
import {
  type AdminOverviewMetrics,
  type AdminUser,
  fetchAdminOverview,
  fetchAdminUsers,
  loginControlPlane,
} from "../services/controlPlaneAdmin";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

// -----------------------------
// Types
// -----------------------------
type NoteStatus = "draft" | "validated";
type Role = "admin" | "user" | "unknown";
type ExportFormat = "pdf" | "docx";
type ModelId = "ptbr-fast" | "ptbr-accurate";

// worker message shape (o main manda objetos estruturados; mas pode vir log)
type WorkerMessage =
  | { type: "job_update"; payload: { id: string; status: string; progress?: number; error?: string } }
  | { type: "worker_log"; payload: { line: string } }
  | unknown;

declare global {
  interface Window {
    ethos: any;
  }
}

// -----------------------------
// Styles (mantive inline por consistência do seu projeto)
// -----------------------------
const sectionStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: "#111827",
  color: "#F9FAFB",
  marginBottom: 16,
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  background: "#3B82F6",
  color: "white",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#475569",
};

const outlineButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  border: "1px solid #475569",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #1F2937",
  background: "#0B1120",
  color: "#E2E8F0",
  width: "100%",
};

const subtleText: React.CSSProperties = { color: "#94A3B8" };

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#1E293B",
  color: "#E2E8F0",
  fontSize: 12,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
};

const modalStyle: React.CSSProperties = {
  background: "#0B1120",
  padding: 24,
  borderRadius: 16,
  width: "min(90vw, 520px)",
  border: "1px solid #1E293B",
  color: "#F8FAFC",
};

// -----------------------------
// Small utils
// -----------------------------
const clamp = (s: string, max = 160) => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);
const safeNowPtBr = () => new Date().toLocaleString("pt-BR");

const isLikelyForbidden = (msg: string) => msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("403");
const isLikelyUnauthorized = (msg: string) =>
  msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("401") || msg.toLowerCase().includes("token");

// -----------------------------
// Main Component
// -----------------------------
export const App = () => {
  // =========================
  // Session context (proto)
  // =========================
  // Ideal: vir do DB (patients/sessions). Por ora, mantemos estático como seu original.
  const sessionId = "session-marina-alves";
  const patientName = "Marina Alves";
  const clinicianName = "Dra. Ana Souza";
  const sessionDate = "15/02/2025";

  // =========================
  // Clinical note state (mantém rigor do original)
  // =========================
  const [consentForNote, setConsentForNote] = useState(false); // consentimento para registrar/validar prontuário
  const [draft, setDraft] = useState(
    "RASCUNHO — Em 15/02/2025, o profissional realizou sessão com a paciente. A paciente relatou dificuldades recentes em organizar a rotina e descreveu sensação de cansaço ao final do dia. O relato foi ouvido sem interpretações adicionais."
  );
  const [status, setStatus] = useState<NoteStatus>("draft");
  const [validatedAt, setValidatedAt] = useState<string | null>(null);
  const [showEthicsModal, setShowEthicsModal] = useState(false);

  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const isValidated = status === "validated";
  const canValidate = consentForNote && !isValidated;
  const canExport = isValidated && exportingFormat === null;

  const handleValidate = () => setShowEthicsModal(true);

  const confirmValidation = () => {
    const now = safeNowPtBr();
    setStatus("validated");
    setValidatedAt(now);
    setShowEthicsModal(false);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!canExport) return;
    setExportingFormat(format);
    setExportFeedback(null);
    try {
      const fileName = await exportClinicalNote(
        {
          patientName,
          clinicianName,
          sessionDate,
          status,
          noteText: draft,
          validatedAt: validatedAt ?? undefined,
        },
        format
      );
      setExportFeedback(`Arquivo gerado: ${fileName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao exportar.";
      setExportFeedback(`Erro: ${message}`);
    } finally {
      setExportingFormat(null);
    }
  };

  // =========================
  // Audio recording (adição)
  // =========================
  // O hook deve cuidar de MediaRecorder/elapsed etc. Mantemos como a adição sugeriu.
  const recorder = useAudioRecorder({ sessionId });

  // Consentimento específico para gravação (modal)
  const [consentForRecording, setConsentForRecording] = useState(false);
  const [showRecordingConsentModal, setShowRecordingConsentModal] = useState(false);
  const [recordingConsentChecked, setRecordingConsentChecked] = useState(false);

  const [selectedModel, setSelectedModel] = useState<ModelId>("ptbr-accurate");

  // Status da transcrição (job)
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("idle");
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobError, setJobError] = useState<string | null>(null);
  const [workerLog, setWorkerLog] = useState<string | null>(null);

  // Evita atualizar estado de um job antigo (se user disparar outro)
  const currentJobIdRef = useRef<string | null>(null);

  const startRecordingWithConsent = async () => {
    if (!consentForRecording) {
      setShowRecordingConsentModal(true);
      return;
    }
    await recorder.startRecording();
  };

  const confirmRecordingConsentAndStart = async () => {
    setConsentForRecording(true);
    setShowRecordingConsentModal(false);
    setRecordingConsentChecked(false);
    await recorder.startRecording();
  };

  // -------------------------
  // ETHOS bridge helpers (compatibilidade)
  // -------------------------
  const ethos = window.ethos;

  const openAudioDialog = async (): Promise<string | null> => {
    // compat: ethos.audio.openDialog() (refactor) ou ethos.openAudioDialog() (antigo)
    if (ethos?.audio?.openDialog) return ethos.audio.openDialog();
    if (ethos?.openAudioDialog) return ethos.openAudioDialog();
    throw new Error("ETHOS bridge: openAudioDialog não disponível no preload.");
  };

  const saveAudioToDisk = async (payload: { data: ArrayBuffer; mimeType: string }) => {
    // compat: ethos.audio.save() (refactor) ou ethos.saveAudio() (proposto)
    if (ethos?.audio?.save) return ethos.audio.save(payload);
    if (ethos?.saveAudio) return ethos.saveAudio(payload);
    throw new Error("ETHOS bridge: saveAudio não disponível no preload.");
  };

  const enqueueTranscription = async (payload: any): Promise<string> => {
    // compat: ethos.transcription.enqueue() (refactor) ou ethos.enqueueTranscription() (antigo)
    if (ethos?.transcription?.enqueue) return ethos.transcription.enqueue(payload);
    if (ethos?.enqueueTranscription) return ethos.enqueueTranscription(payload);
    throw new Error("ETHOS bridge: enqueueTranscription não disponível no preload.");
  };

  const onWorkerMessage = (handler: (m: WorkerMessage) => void) => {
    // compat: ethos.transcription.onMessage() ou ethos.onTranscriptionMessage()
    if (ethos?.transcription?.onMessage) return ethos.transcription.onMessage(handler);
    if (ethos?.onTranscriptionMessage) return ethos.onTranscriptionMessage(handler);
    return () => {};
  };

  const onWorkerError = (handler: (m: string) => void) => {
    if (ethos?.transcription?.onError) return ethos.transcription.onError(handler);
    if (ethos?.onTranscriptionError) return ethos.onTranscriptionError(handler);
    return () => {};
  };

  // -------------------------
  // Subscribe to worker events (limpa listeners!)
  // -------------------------
  useEffect(() => {
    const offMsg = onWorkerMessage((m) => {
      // job_update estruturado
      if (typeof m === "object" && m && (m as any).type === "job_update") {
        const payload = (m as any).payload || {};
        const incomingId = String(payload.id || "");
        if (!incomingId) return;

        // só atualiza se for o job atual
        if (currentJobIdRef.current && incomingId !== currentJobIdRef.current) return;

        setJobStatus(String(payload.status || "unknown"));
        setJobProgress(Number(payload.progress ?? 0));
        setJobError(payload.error ? String(payload.error) : null);
        return;
      }

      // logs genéricos do worker
      if (typeof m === "object" && m && (m as any).type === "worker_log") {
        const line = (m as any).payload?.line;
        if (typeof line === "string") setWorkerLog(clamp(line, 240));
        return;
      }
    });

    const offErr = onWorkerError((msg) => {
      if (typeof msg === "string") setWorkerLog(clamp(msg, 240));
    });

    return () => {
      offMsg?.();
      offErr?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------
  // Actions: import audio -> enqueue transcription
  // -------------------------
  const handleImportAudio = async () => {
    setWorkerLog(null);
    setJobError(null);

    const audioPath = await openAudioDialog();
    if (!audioPath) return;

    setJobStatus("queued");
    setJobProgress(0);

    const id = await enqueueTranscription({
      sessionId,
      audioPath,
      model: selectedModel,
    });

    currentJobIdRef.current = id;
    setJobId(id);
  };

  // -------------------------
  // Actions: after recording, persist audio and enqueue transcription
  // -------------------------
  const handleTranscribeRecordedAudio = useCallback(async () => {
    // depende do seu hook: precisamos do ArrayBuffer + mimeType.
    // Se o seu hook não expõe isso, ajuste o hook para expor `audioBuffer` e `mimeType`.
    if (!recorder.audioBuffer || !recorder.mimeType) {
      setWorkerLog("Sem buffer de áudio disponível para transcrever. Verifique o hook useAudioRecorder.");
      return;
    }

    setWorkerLog(null);
    setJobError(null);
    setJobStatus("saving_audio");
    setJobProgress(0);

    const saved = await saveAudioToDisk({ data: recorder.audioBuffer, mimeType: recorder.mimeType });

    setJobStatus("queued");

    const id = await enqueueTranscription({
      sessionId,
      audioPath: saved.filePath,
      model: selectedModel,
    });

    currentJobIdRef.current = id;
    setJobId(id);
  }, [recorder.audioBuffer, recorder.mimeType, saveAudioToDisk, enqueueTranscription, sessionId, selectedModel]);

  // =========================
  // Control Plane (Admin) state (mantém original)
  // =========================
  const defaultControlPlaneUrl = "http://localhost:8788";

  const [adminBaseUrl, setAdminBaseUrl] = useState(() => {
    try {
      return localStorage.getItem("ethos-control-plane-url") ?? defaultControlPlaneUrl;
    } catch {
      return defaultControlPlaneUrl;
    }
  });

  const [adminEmail, setAdminEmail] = useState(() => {
    try {
      return localStorage.getItem("ethos-admin-email") ?? "camila@ethos.local";
    } catch {
      return "camila@ethos.local";
    }
  });

  const [adminPassword, setAdminPassword] = useState("");

  const [rememberSession, setRememberSession] = useState(() => {
    try {
      return (localStorage.getItem("ethos-admin-remember") ?? "0") === "1";
    } catch {
      return false;
    }
  });

  const [adminToken, setAdminToken] = useState(() => {
    try {
      return localStorage.getItem("ethos-admin-token") ?? "";
    } catch {
      return "";
    }
  });

  const [adminRole, setAdminRole] = useState<Role>(() => {
    try {
      return (localStorage.getItem("ethos-admin-role") as Role) ?? "unknown";
    } catch {
      return "unknown";
    }
  });

  const [adminMetrics, setAdminMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminLastSync, setAdminLastSync] = useState<string | null>(null);

  const hasAdminToken = Boolean(adminToken);
  const isAdmin = adminRole === "admin";

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem("ethos-control-plane-url", adminBaseUrl);
    } catch {}
  }, [adminBaseUrl]);

  useEffect(() => {
    try {
      localStorage.setItem("ethos-admin-email", adminEmail);
    } catch {}
  }, [adminEmail]);

  useEffect(() => {
    try {
      localStorage.setItem("ethos-admin-remember", rememberSession ? "1" : "0");
    } catch {}
  }, [rememberSession]);

  useEffect(() => {
    try {
      if (!rememberSession) {
        localStorage.removeItem("ethos-admin-token");
        localStorage.removeItem("ethos-admin-role");
        return;
      }
      if (adminToken) localStorage.setItem("ethos-admin-token", adminToken);
      else localStorage.removeItem("ethos-admin-token");
    } catch {}
  }, [adminToken, rememberSession]);

  useEffect(() => {
    try {
      if (!rememberSession) {
        localStorage.removeItem("ethos-admin-role");
        return;
      }
      localStorage.setItem("ethos-admin-role", adminRole);
    } catch {}
  }, [adminRole, rememberSession]);

  const adminStatusLabel = useMemo(() => {
    if (!hasAdminToken) return "Sem sessão ativa.";
    if (adminLoading) return "Sincronizando dados administrativos…";
    if (isAdmin) return `Acesso administrativo confirmado.${adminLastSync ? ` Última sync: ${adminLastSync}` : ""}`;
    if (adminRole === "user") return "Sessão válida, mas sem permissão admin.";
    return "Sessão ativa, aguardando validação.";
  }, [adminLastSync, adminLoading, adminRole, hasAdminToken, isAdmin]);

  const refreshAdminData = useCallback(async () => {
    if (!adminToken) return;
    setAdminLoading(true);
    setAdminError("");
    try {
      const [overview, users] = await Promise.all([
        fetchAdminOverview(adminBaseUrl, adminToken),
        fetchAdminUsers(adminBaseUrl, adminToken),
      ]);
      setAdminMetrics(overview);
      setAdminUsers(users);
      setAdminRole("admin");
      setAdminLastSync(safeNowPtBr());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao acessar admin.";
      setAdminError(message);
      setAdminMetrics(null);
      setAdminUsers([]);
      if (isLikelyForbidden(message)) setAdminRole("user");
      if (isLikelyUnauthorized(message)) {
        setAdminRole("unknown");
        setAdminToken("");
      }
    } finally {
      setAdminLoading(false);
    }
  }, [adminBaseUrl, adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    void refreshAdminData();
  }, [adminBaseUrl, adminToken, refreshAdminData]);

  const handleAdminLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminLoading(true);
    setAdminError("");
    try {
      const response = await loginControlPlane(adminBaseUrl, adminEmail, adminPassword);
      setAdminToken(response.token);
      setAdminRole((response.user?.role as Role) ?? "unknown");
      setAdminPassword("");
      setAdminLastSync(safeNowPtBr());
      await Promise.allSettled([
        fetchAdminOverview(adminBaseUrl, response.token).then(setAdminMetrics),
        fetchAdminUsers(adminBaseUrl, response.token).then(setAdminUsers),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no login.";
      setAdminError(message);
      setAdminRole("unknown");
      setAdminToken("");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setAdminToken("");
    setAdminRole("unknown");
    setAdminMetrics(null);
    setAdminUsers([]);
    setAdminError("");
    setAdminLastSync(null);
    try {
      localStorage.removeItem("ethos-admin-token");
      localStorage.removeItem("ethos-admin-role");
    } catch {}
  };

  // =========================
  // Render
  // =========================
  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0F172A", minHeight: "100vh", padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#F8FAFC", fontSize: 28, marginBottom: 4 }}>ETHOS — Agenda Clínica</h1>
        <p style={subtleText}>Fluxo offline com prontuário + gravação/transcrição local + control plane admin.</p>
      </header>

      {showRecordingConsentModal ? (
        <ConsentModal
          title="Confirmar consentimento de gravação"
          description="Antes de iniciar a gravação, confirme que o paciente autorizou o registro de áudio."
          checked={recordingConsentChecked}
          onCheck={setRecordingConsentChecked}
          confirmLabel="Iniciar gravação"
          onCancel={() => {
            setShowRecordingConsentModal(false);
            setRecordingConsentChecked(false);
          }}
          onConfirm={confirmRecordingConsentAndStart}
        />
      ) : null}

      {showEthicsModal ? (
        <EthicsValidationModal
          onCancel={() => setShowEthicsModal(false)}
          onConfirm={confirmValidation}
        />
      ) : null}

      <section style={sectionStyle}>
        <h2>Agenda semanal</h2>
        <p style={{ color: "#CBD5F5" }}>Segunda · 14:00 · {patientName}</p>
        <p style={{ color: "#CBD5F5" }}>Terça · 09:30 · João Costa</p>
      </section>

      <section style={sectionStyle}>
        <h2>Sessão</h2>
        <p style={{ color: "#CBD5F5" }}>Paciente: {patientName}</p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button style={buttonStyle} onClick={handleImportAudio}>
            Importar áudio
          </button>

          <button
            style={recorder.status === "recording" ? { ...buttonStyle, background: "#EF4444" } : secondaryButtonStyle}
            onClick={recorder.status === "recording" ? recorder.stopRecording : startRecordingWithConsent}
          >
            {recorder.status === "recording" ? "Parar gravação" : "Gravar áudio"}
          </button>

          {recorder.audioUrl ? (
            <button style={outlineButtonStyle} onClick={recorder.resetRecording}>
              Limpar gravação
            </button>
          ) : null}

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as ModelId)}
            style={{ ...inputStyle, maxWidth: 220 }}
            title="Modelo de transcrição"
          >
            <option value="ptbr-accurate">ptbr-accurate (mais preciso)</option>
            <option value="ptbr-fast">ptbr-fast (mais rápido)</option>
          </select>

          {recorder.audioUrl ? (
            <button style={{ ...buttonStyle, background: "#6366F1" }} onClick={handleTranscribeRecordedAudio}>
              Transcrever gravação
            </button>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <span style={badgeStyle}>{recorder.status === "recording" ? "Gravando" : "Pronto"}</span>
          <span style={badgeStyle}>Tempo: {recorder.elapsedLabel}</span>
          {consentForRecording ? <span style={badgeStyle}>Consentimento de gravação registrado</span> : null}
        </div>

        {recorder.errorMessage ? (
          <p style={{ color: "#FCA5A5", marginTop: 8 }}>Erro de gravação: {recorder.errorMessage}</p>
        ) : null}

        {recorder.audioUrl ? (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: "#E2E8F0", marginBottom: 8 }}>
              Prévia do áudio gravado{recorder.audioFilePath ? ` (salvo em ${recorder.audioFilePath})` : ""}.
            </p>
            <audio controls src={recorder.audioUrl} style={{ width: "100%" }} />
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={badgeStyle}>Transcrição: {jobStatus}</span>
            {jobId ? <span style={badgeStyle}>Job: {jobId.slice(0, 8)}…</span> : null}
            <span style={badgeStyle}>Progresso: {Math.round(jobProgress)}%</span>
          </div>
          {jobError ? <p style={{ color: "#FCA5A5", marginTop: 8 }}>Erro do worker: {jobError}</p> : null}
          {workerLog ? <p style={{ ...subtleText, marginTop: 8 }}>{workerLog}</p> : null}
        </div>

        <label style={{ display: "block", marginTop: 12, color: "#E2E8F0" }}>
          <input
            type="checkbox"
            checked={consentForNote}
            onChange={(event) => setConsentForNote(event.target.checked)}
          />{" "}
          Tenho consentimento do paciente (registro/uso do prontuário)
        </label>
      </section>

      <section style={sectionStyle}>
        <h2>Prontuário automático</h2>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: status === "draft" ? "#FBBF24" : "#22C55E",
              color: "#0F172A",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {status === "draft" ? "Rascunho" : "Validado"}
          </span>
          <span style={{ ...subtleText, fontSize: 14 }}>
            {isValidated
              ? `Bloqueado para edição · ${validatedAt ?? "Validado"}`
              : "Edição liberada até validação ética."}
          </span>
        </div>

        {isValidated ? (
          <p style={{ color: "#38BDF8", fontSize: 14, marginBottom: 8 }}>
            Prontuário validado e congelado para assegurar integridade clínica.
          </p>
        ) : null}

        <textarea
          value={draft}
          onChange={(event) => {
            if (!isValidated) setDraft(event.target.value);
          }}
          readOnly={isValidated}
          style={{
            width: "100%",
            minHeight: 140,
            marginTop: 12,
            borderRadius: 12,
            padding: 12,
            background: isValidated ? "#1E293B" : "#F8FAFC",
            color: isValidated ? "#E2E8F0" : "#0F172A",
          }}
        />

        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <button
            style={{
              ...buttonStyle,
              background: canValidate ? "#22C55E" : "#334155",
              cursor: canValidate ? "pointer" : "not-allowed",
            }}
            onClick={handleValidate}
            disabled={!canValidate}
          >
            Validar prontuário
          </button>

          <button
            style={{
              ...buttonStyle,
              background: canExport ? "#6366F1" : "#334155",
              cursor: canExport ? "pointer" : "not-allowed",
            }}
            onClick={() => handleExport("docx")}
            disabled={!canExport}
          >
            {exportingFormat === "docx" ? "Exportando DOCX..." : "Exportar DOCX"}
          </button>

          <button
            style={{
              ...buttonStyle,
              background: canExport ? "#6366F1" : "#334155",
              cursor: canExport ? "pointer" : "not-allowed",
            }}
            onClick={() => handleExport("pdf")}
            disabled={!canExport}
          >
            {exportingFormat === "pdf" ? "Exportando PDF..." : "Exportar PDF"}
          </button>
        </div>

        {!consentForNote ? (
          <p style={{ color: "#FCA5A5", marginTop: 8 }}>
            É necessário confirmar o consentimento do paciente para validar o prontuário.
          </p>
        ) : null}

        {exportFeedback ? (
          <p style={{ color: exportFeedback.startsWith("Erro:") ? "#FCA5A5" : "#A7F3D0", marginTop: 8 }}>
            {exportFeedback}
          </p>
        ) : null}
      </section>

      <section style={sectionStyle}>
        <h2>Admin — Control Plane</h2>
        <p style={{ ...subtleText, marginBottom: 12 }}>
          Painel restrito à role=admin, com métricas agregadas e lista de usuários sanitizada (sem conteúdo clínico).
        </p>

        <form onSubmit={handleAdminLogin} style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ color: "#E2E8F0" }}>URL do control plane</label>
            <input value={adminBaseUrl} onChange={(event) => setAdminBaseUrl(event.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ color: "#E2E8F0" }}>Email</label>
            <input value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ color: "#E2E8F0" }}>Senha</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "center", color: "#E2E8F0" }}>
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(e) => setRememberSession(e.target.checked)}
            />
            Lembrar sessão neste dispositivo (salva token localmente)
          </label>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={{ ...buttonStyle, background: "#22C55E" }} disabled={adminLoading}>
              Entrar como admin
            </button>
            <button type="button" style={{ ...buttonStyle, background: "#475569" }} onClick={handleAdminLogout}>
              Encerrar sessão
            </button>
            <button
              type="button"
              style={{
                ...buttonStyle,
                background: hasAdminToken ? "#6366F1" : "#334155",
                cursor: hasAdminToken ? "pointer" : "not-allowed",
              }}
              onClick={() => void refreshAdminData()}
              disabled={!hasAdminToken || adminLoading}
              title={!hasAdminToken ? "Faça login primeiro" : "Atualizar"}
            >
              {adminLoading ? "Atualizando..." : "Atualizar dados"}
            </button>
          </div>
        </form>

        <p style={{ color: "#CBD5F5", marginBottom: 8 }}>{adminStatusLabel}</p>
        {adminError ? <p style={{ color: "#FCA5A5" }}>{clamp(adminError, 240)}</p> : null}

        {isAdmin ? (
          <AdminPanel metrics={adminMetrics} users={adminUsers} />
        ) : (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#1F2937", color: "#FBBF24" }}>
            Acesso restrito: role=admin necessária para visualizar métricas e usuários.
          </div>
        )}
      </section>
    </div>
  );
};

// -----------------------------
// Subcomponents (coloquei aqui, mas você pode mover pra arquivos separados)
// -----------------------------
function EthicsValidationModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div style={modalBackdropStyle}>
      <div style={{ ...modalStyle, width: "min(90vw, 520px)" }}>
        <h3 style={{ marginTop: 0 }}>Confirmação ética</h3>
        <p style={{ color: "#CBD5F5" }}>
          Antes de validar, confirme que o registro está fiel ao relato do paciente, sem interpretações clínicas,
          que o consentimento foi obtido e que você está ciente do bloqueio permanente após a validação.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button style={outlineButtonStyle} onClick={onCancel}>
            Cancelar
          </button>
          <button style={{ ...buttonStyle, background: "#22C55E" }} onClick={onConfirm}>
            Confirmar e validar
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsentModal(props: {
  title: string;
  description: string;
  checked: boolean;
  onCheck: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  const { title, description, checked, onCheck, onCancel, onConfirm, confirmLabel } = props;
  return (
    <div style={modalBackdropStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: "#CBD5F5" }}>{description}</p>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#E2E8F0" }}>
          <input type="checkbox" checked={checked} onChange={(event) => onCheck(event.target.checked)} />
          Tenho consentimento explícito do paciente.
        </label>
        <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button style={outlineButtonStyle} onClick={onCancel}>
            Cancelar
          </button>
          <button
            style={{ ...buttonStyle, background: checked ? "#22C55E" : "#334155" }}
            onClick={onConfirm}
            disabled={!checked}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ metrics, users }: { metrics: AdminOverviewMetrics | null; users: AdminUser[] }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard label="Usuários ativos" value={metrics?.users_total ?? "--"} />
        <StatCard label="Eventos de telemetria" value={metrics?.telemetry_total ?? "--"} />
      </div>

      <div>
        <h3 style={{ marginBottom: 8 }}>Usuários (sanitizado)</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {users.length === 0 ? (
            <p style={subtleText}>Nenhum usuário encontrado.</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr",
                  gap: 12,
                  padding: 12,
                  background: "#0B1120",
                  borderRadius: 12,
                }}
              >
                <div>
                  <p style={{ color: "#E2E8F0", marginBottom: 2 }}>{user.email}</p>
                  <p style={{ ...subtleText, fontSize: 12 }}>ID: {user.id}</p>
                </div>
                <div>
                  <p style={{ ...subtleText, fontSize: 12 }}>Role</p>
                  <p style={{ color: "#E2E8F0" }}>{user.role}</p>
                </div>
                <div>
                  <p style={{ ...subtleText, fontSize: 12 }}>Status</p>
                  <p style={{ color: "#E2E8F0" }}>{user.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: "#0B1120", padding: 16, borderRadius: 12, minWidth: 180 }}>
      <p style={subtleText}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700 }}>{value}</p>
    </div>
  );
}
