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
import { EthicsValidationModal, RecordingConsentModal, PatientModal } from "./Modals";
import { AdminPanel } from "./Admin";

// -----------------------------
// Types
// -----------------------------
type NoteStatus = "draft" | "validated";
type Role = "admin" | "user" | "unknown";
type ExportFormat = "pdf" | "docx";
type ModelId = "ptbr-fast" | "ptbr-accurate";

type WorkerMessage =
  | { type: "job_update"; payload: { id: string; status: string; progress?: number; error?: string } }
  | { type: "worker_log"; payload: { line: string } }
  | unknown;

type AppTab = "clinical" | "admin";
type ClinicalSection = "login" | "pacientes" | "agenda" | "sessao" | "prontuario" | "financeiro" | "diarios" | "relatorios" | "config";

type EthosBridge = {
  audio: {
    openDialog: () => Promise<string | null>;
    save: (payload: { data: ArrayBuffer; mimeType: string }) => Promise<{ filePath: string } | null>;
  };
  transcription: {
    enqueue: (payload: any) => Promise<string>;
    onMessage: (handler: (m: WorkerMessage) => void) => () => void;
    onError: (handler: (m: string) => void) => () => void;
  };
};

declare global {
  interface Window {
    ethos?: any;
  }
}

// -----------------------------
// Styles (base)
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

function safeLocalStorageGet(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeLocalStorageRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function createEthosBridge(): EthosBridge {
  const ethos = window.ethos;

  const openDialog = async () => {
    if (ethos?.audio?.openDialog) return ethos.audio.openDialog();
    if (ethos?.openAudioDialog) return ethos.openAudioDialog();
    throw new Error("ETHOS bridge: audio.openDialog/openAudioDialog não disponível no preload.");
  };

  const save = async (payload: { data: ArrayBuffer; mimeType: string }) => {
    if (ethos?.audio?.save) return ethos.audio.save(payload);
    if (ethos?.saveAudio) return ethos.saveAudio(payload);
    throw new Error("ETHOS bridge: audio.save/saveAudio não disponível no preload.");
  };

  const enqueue = async (payload: any) => {
    if (ethos?.transcription?.enqueue) return ethos.transcription.enqueue(payload);
    if (ethos?.enqueueTranscription) return ethos.enqueueTranscription(payload);
    throw new Error("ETHOS bridge: transcription.enqueue/enqueueTranscription não disponível no preload.");
  };

  const onMessage = (handler: (m: WorkerMessage) => void) => {
    if (ethos?.transcription?.onMessage) return ethos.transcription.onMessage(handler);
    if (ethos?.onTranscriptionMessage) return ethos.onTranscriptionMessage(handler);
    return () => {};
  };

  const onError = (handler: (m: string) => void) => {
    if (ethos?.transcription?.onError) return ethos.transcription.onError(handler);
    if (ethos?.onTranscriptionError) return ethos.onTranscriptionError(handler);
    return () => {};
  };

  return {
    audio: { openDialog, save },
    transcription: { enqueue, onMessage, onError },
  };
}

// -----------------------------
// Main Component
// -----------------------------
const clinicalNavItems: Array<{ id: ClinicalSection; label: string; helper: string }> = [
  { id: "login", label: "Login", helper: "Acesso seguro" },
  { id: "pacientes", label: "Pacientes", helper: "Gestão de prontuários" },
  { id: "agenda", label: "Agenda", helper: "Semana clínica" },
  { id: "sessao", label: "Sessão", helper: "Registro guiado" },
  { id: "prontuario", label: "Prontuário", helper: "Validação + export" },
  { id: "financeiro", label: "Financeiro", helper: "Cobranças e Pagamentos" },
  { id: "diarios", label: "Diários", helper: "Formulários e Evolução" },
  { id: "relatorios", label: "Relatórios", helper: "Documentos e Declarações" },
  { id: "config", label: "Configurações", helper: "Segurança e Backup" },
];

export const App = () => {
  // =========================
  // Auth & Lifecycle
  // =========================
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // =========================
  // Tabs
  // =========================
  const [tab, setTab] = useState<AppTab>("clinical");
  const [clinicalSection, setClinicalSection] = useState<ClinicalSection>("agenda");

  // =========================
  // Real Data State
  // =========================
  const [patients, setPatients] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [financialEntries, setFinancialEntries] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [formTemplates, setFormTemplates] = useState<any[]>([]);

  const refreshData = useCallback(async () => {
    if (window.ethos?.patients) {
      const p = await window.ethos.patients.getAll();
      setPatients(p || []);
    }
    if (window.ethos?.sessions) {
      const s = await window.ethos.sessions.getAll();
      setSessions(s || []);
    }
    if (window.ethos?.financial) {
      const f = await window.ethos.financial.getAll();
      setFinancialEntries(f || []);
    }
    if (window.ethos?.forms) {
      const t = await window.ethos.forms.getTemplates();
      setFormTemplates(t || []);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const savedEncrypted = safeLocalStorageGet("ethos-auth-token", "");
      if (savedEncrypted && window.ethos?.auth) {
        const decrypted = await window.ethos.auth.decryptToken(savedEncrypted);
        if (decrypted) {
          try {
            const parsed = JSON.parse(decrypted);
            setUser(parsed);
          } catch (e) {}
        }
      }

      // Artificial splash delay
      setTimeout(() => setShowSplash(false), 2500);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user) refreshData();
  }, [refreshData, user]);

  const loadNote = useCallback(async () => {
    if (selectedSessionId && window.ethos?.notes) {
      const note = await window.ethos.notes.getBySession(selectedSessionId);
      if (note) {
        setNoteId(note.id);
        setDraft(note.editedText || note.generatedText || "");
        setStatus(note.status);
        setValidatedAt(note.validatedAt || null);
      } else {
        setNoteId(null);
        setDraft("");
        setStatus("draft");
        setValidatedAt(null);
      }
    } else {
      setNoteId(null);
      setDraft("");
      setStatus("draft");
      setValidatedAt(null);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  // =========================
  // Session context (proto)
  // =========================
  const currentSession = useMemo(() => sessions.find(s => s.id === selectedSessionId), [sessions, selectedSessionId]);
  const currentPatient = useMemo(() => patients.find(p => p.id === currentSession?.patientId), [patients, currentSession]);

  const sessionId = currentSession?.id || "no-session";
  const patientName = currentPatient?.fullName || "Nenhum paciente selecionado";
  const clinicianName = "Dra. Ana Souza";
  const sessionDate = currentSession ? new Date(currentSession.scheduledAt).toLocaleDateString("pt-BR") : "--/--/----";

  // =========================
  // Clinical note state
  // =========================
  const [consentForNote, setConsentForNote] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<NoteStatus>("draft");
  const [validatedAt, setValidatedAt] = useState<string | null>(null);
  const [showEthicsModal, setShowEthicsModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);

  // =========================
  // Reports state
  // =========================
  const [reportType, setReportType] = useState<"declaration" | "clinical_report">("declaration");

  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

  const handleAiTransform = useCallback(async (templateType: string = 'prontuario') => {
    if (!selectedSessionId || !window.ethos?.genai) return;

    setIsGeneratingNote(true);
    try {
      const transcriptText = workerLog || "Transcrição da sessão iniciada. O paciente relatou estar se sentindo melhor esta semana, embora ainda apresente dificuldades pontuais no sono.";
      const generated = await window.ethos.genai.transformNote({
        transcriptText,
        sessionId: selectedSessionId,
        templateType
      });
      setDraft(generated);
    } catch (e) {
      alert("Falha ao gerar nota com IA.");
    } finally {
      setIsGeneratingNote(false);
    }
  }, [selectedSessionId, workerLog]);

  const isValidated = status === "validated";
  const canValidate = consentForNote && !isValidated;
  const canExport = isValidated && exportingFormat === null;

  const handleValidate = useCallback(() => setShowEthicsModal(true), []);

  const confirmValidation = useCallback(async () => {
    if (noteId && window.ethos?.notes) {
      await window.ethos.notes.validate(noteId, clinicianName);
      await loadNote();
    } else if (selectedSessionId && window.ethos?.notes) {
      // Create and validate
      const newNote = await window.ethos.notes.upsertDraft(selectedSessionId, draft);
      await window.ethos.notes.validate(newNote.id, clinicianName);
      await loadNote();
    }
    setShowEthicsModal(false);
  }, [noteId, selectedSessionId, draft, clinicianName, loadNote]);

  const saveDraft = useCallback(async () => {
    if (selectedSessionId && window.ethos?.notes) {
      await window.ethos.notes.upsertDraft(selectedSessionId, draft);
      await loadNote();
    }
  }, [selectedSessionId, draft, loadNote]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
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
    },
    [canExport, clinicianName, draft, patientName, sessionDate, status, validatedAt]
  );

  useEffect(() => {
    if (!isValidated) setExportFeedback(null);
  }, [draft, isValidated]);

  // =========================
  // Audio recording + transcription
  // =========================
  const bridge = useMemo(() => createEthosBridge(), []);
  const recorder = useAudioRecorder({ sessionId });

  // Consentimento de gravação (adição 1)
  const [consentForRecording, setConsentForRecording] = useState(false);
  const [showRecordingConsentModal, setShowRecordingConsentModal] = useState(false);
  const [recordingConsentChecked, setRecordingConsentChecked] = useState(false);

  const [selectedModel, setSelectedModel] = useState<ModelId>("ptbr-accurate");

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("idle");
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobError, setJobError] = useState<string | null>(null);
  const [workerLog, setWorkerLog] = useState<string | null>(null);

  const currentJobIdRef = useRef<string | null>(null);

  const handleStartRecording = useCallback(async () => {
    if (!consentForRecording) {
      setShowRecordingConsentModal(true);
      return;
    }
    await recorder.startRecording();
  }, [consentForRecording, recorder]);

  const handleConfirmRecordingConsent = useCallback(async () => {
    setConsentForRecording(true);
    setShowRecordingConsentModal(false);
    setRecordingConsentChecked(false);
    await recorder.startRecording();
  }, [recorder]);

  useEffect(() => {
    const offMsg = bridge.transcription.onMessage((m) => {
      if (typeof m === "object" && m && (m as any).type === "job_update") {
        const payload = (m as any).payload || {};
        const incomingId = String(payload.id || "");
        if (!incomingId) return;
        if (currentJobIdRef.current && incomingId !== currentJobIdRef.current) return;

        setJobStatus(String(payload.status || "unknown"));
        setJobProgress(Number(payload.progress ?? 0));
        setJobError(payload.error ? String(payload.error) : null);
        return;
      }

      if (typeof m === "object" && m && (m as any).type === "worker_log") {
        const line = (m as any).payload?.line;
        if (typeof line === "string") setWorkerLog(clamp(line, 240));
      }
    });

    const offErr = bridge.transcription.onError((msg) => {
      if (typeof msg === "string") setWorkerLog(clamp(msg, 240));
    });

    return () => {
      offMsg?.();
      offErr?.();
    };
  }, [bridge]);

  const handleImportAudio = useCallback(async () => {
    setWorkerLog(null);
    setJobError(null);

    const audioPath = await bridge.audio.openDialog();
    if (!audioPath) return;

    setJobStatus("queued");
    setJobProgress(0);

    const id = await bridge.transcription.enqueue({
      sessionId,
      audioPath,
      model: selectedModel,
    });

    currentJobIdRef.current = id;
    setJobId(id);
  }, [bridge, selectedModel, sessionId]);

  const handleTranscribeRecordedAudio = useCallback(async () => {
    const audioBuffer: ArrayBuffer | undefined = (recorder as any).audioBuffer;
    const mimeType: string | undefined = (recorder as any).mimeType;

    if (!audioBuffer || !mimeType) {
      setWorkerLog(
        "Sem buffer de áudio disponível para transcrever. Ajuste o hook useAudioRecorder para expor audioBuffer + mimeType (ou implemente 'Salvar e transcrever' fora do hook)."
      );
      return;
    }

    setWorkerLog(null);
    setJobError(null);
    setJobStatus("saving_audio");
    setJobProgress(0);

    const saved = await bridge.audio.save({ data: audioBuffer, mimeType });
    if (!saved?.filePath) {
      setJobStatus("error");
      setJobError("Falha ao salvar o áudio no disco.");
      return;
    }

    setJobStatus("queued");
    const id = await bridge.transcription.enqueue({
      sessionId,
      audioPath: saved.filePath,
      model: selectedModel,
    });

    currentJobIdRef.current = id;
    setJobId(id);
  }, [bridge, recorder, selectedModel, sessionId]);

  // =========================
  // Admin control plane
  // =========================
  const defaultControlPlaneUrl = "http://localhost:8788";

  const [adminBaseUrl, setAdminBaseUrl] = useState(() =>
    safeLocalStorageGet("ethos-control-plane-url", defaultControlPlaneUrl)
  );
  const [adminEmail, setAdminEmail] = useState(() => safeLocalStorageGet("ethos-admin-email", "camila@ethos.local"));
  const [adminPassword, setAdminPassword] = useState("");

  const [rememberSession, setRememberSession] = useState(() => safeLocalStorageGet("ethos-admin-remember", "0") === "1");
  const [adminToken, setAdminToken] = useState(() => safeLocalStorageGet("ethos-admin-token", ""));
  const [adminRole, setAdminRole] = useState<Role>(() => (safeLocalStorageGet("ethos-admin-role", "unknown") as Role) ?? "unknown");

  const [adminMetrics, setAdminMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminLastSync, setAdminLastSync] = useState<string | null>(null);

  // =========================
  // WhatsApp Reminders (V1)
  // =========================
  const [whatsappTemplate, setWhatsappTemplate] = useState(() =>
    safeLocalStorageGet("ethos-wa-template", "Olá {{nome}}, confirmo nossa sessão em {{data}} às {{hora}}. Até breve!")
  );

  useEffect(() => safeLocalStorageSet("ethos-wa-template", whatsappTemplate), [whatsappTemplate]);

  const handleSendReminder = useCallback((patient: any, session: any) => {
    if (!patient.phoneNumber) {
      alert("Paciente sem telefone cadastrado.");
      return;
    }

    const date = new Date(session.scheduledAt);
    const dateStr = date.toLocaleDateString("pt-BR");
    const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const message = whatsappTemplate
      .replace("{{nome}}", patient.fullName)
      .replace("{{data}}", dateStr)
      .replace("{{hora}}", timeStr);

    const cleanPhone = patient.phoneNumber.replace(/\D/g, "");
    const waUrl = `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(waUrl, "_blank");
  }, [whatsappTemplate]);

  const hasAdminToken = Boolean(adminToken);
  const isAdmin = adminRole === "admin";

  useEffect(() => safeLocalStorageSet("ethos-control-plane-url", adminBaseUrl), [adminBaseUrl]);
  useEffect(() => safeLocalStorageSet("ethos-admin-email", adminEmail), [adminEmail]);
  useEffect(() => safeLocalStorageSet("ethos-admin-remember", rememberSession ? "1" : "0"), [rememberSession]);

  useEffect(() => {
    if (!rememberSession) {
      safeLocalStorageRemove("ethos-admin-token");
      safeLocalStorageRemove("ethos-admin-role");
      return;
    }
    if (adminToken) safeLocalStorageSet("ethos-admin-token", adminToken);
    else safeLocalStorageRemove("ethos-admin-token");
  }, [adminToken, rememberSession]);

  useEffect(() => {
    if (!rememberSession) {
      safeLocalStorageRemove("ethos-admin-role");
      return;
    }
    safeLocalStorageSet("ethos-admin-role", adminRole);
  }, [adminRole, rememberSession]);

  const adminStatusLabel = useMemo(() => {
    if (!hasAdminToken) return "Sem sessão ativa.";
    if (adminLoading) return "Sincronizando dados administrativos…";
    if (isAdmin) return `Acesso administrativo confirmado.${adminLastSync ? ` Última sync: ${adminLastSync}` : ""}`;
    if (adminRole === "user") return "Sessão válida, mas sem permissão admin.";
    return "Sessão ativa, aguardando validação.";
  }, [adminLastSync, adminLoading, adminRole, hasAdminToken, isAdmin]);

  const adminAbortRef = useRef<AbortController | null>(null);

  const refreshAdminData = useCallback(async () => {
    if (!adminToken) return;

    adminAbortRef.current?.abort();
    const ac = new AbortController();
    adminAbortRef.current = ac;

    setAdminLoading(true);
    setAdminError("");

    try {
      const [overview, users] = await Promise.all([
        fetchAdminOverview(adminBaseUrl, adminToken),
        fetchAdminUsers(adminBaseUrl, adminToken),
      ]);

      if (ac.signal.aborted) return;

      setAdminMetrics(overview);
      setAdminUsers(users);
      setAdminRole("admin");
      setAdminLastSync(safeNowPtBr());
    } catch (error) {
      if (ac.signal.aborted) return;

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
      if (!ac.signal.aborted) setAdminLoading(false);
    }
  }, [adminBaseUrl, adminToken]);

  useEffect(() => {
    if (tab !== "admin") return;
    if (!adminToken) return;
    void refreshAdminData();
  }, [adminBaseUrl, adminToken, refreshAdminData, tab]);

  const handleAdminLogin = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
    },
    [adminBaseUrl, adminEmail, adminPassword]
  );

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.ethos?.auth) {
      const res = await window.ethos.auth.login({ email: loginEmail, password: loginPassword });
      if (res.success) {
        setUser(res.user);
        if (rememberMe) {
          const encrypted = await window.ethos.auth.encryptToken(JSON.stringify(res.user));
          safeLocalStorageSet("ethos-auth-token", encrypted);
        }
      } else {
        alert(res.message);
      }
    }
  }, [loginEmail, loginPassword, rememberMe]);

  const handleLogout = useCallback(() => {
    setUser(null);
    safeLocalStorageRemove("ethos-auth-token");
  }, []);

  const handleAdminLogout = useCallback(() => {
    adminAbortRef.current?.abort();
    adminAbortRef.current = null;

    setAdminToken("");
    setAdminRole("unknown");
    setAdminMetrics(null);
    setAdminUsers([]);
    setAdminError("");
    setAdminLastSync(null);

    safeLocalStorageRemove("ethos-admin-token");
    safeLocalStorageRemove("ethos-admin-role");
  }, []);

  // =========================
  // PWA/Mobile shell styles (adição 2)
  // =========================
  const clinicalShellStyles = useMemo(
    () => `
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      .pwa-app { display: flex; flex-direction: column; gap: 24px; }
      .pwa-header { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .pwa-header h2 { margin: 0; font-size: 20px; color: #f8fafc; }
      .pwa-header p { margin: 6px 0 0; color: #94a3b8; }
      .status-pill { background: #1f2937; color: #e2e8f0; padding: 8px 14px; border-radius: 999px; font-size: 14px; }
      .shell { display: grid; grid-template-columns: 220px 1fr; gap: 24px; align-items: start; }
      .nav { background: #0b1222; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 12px; position: sticky; top: 24px; }
      .nav button { background: transparent; border: 1px solid transparent; padding: 12px; border-radius: 12px; text-align: left; color: #cbd5f5; font-weight: 600; cursor: pointer; }
      .nav button span { display: block; font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; }
      .nav button.active { border-color: #3b82f6; background: rgba(59, 130, 246, 0.15); color: #f8fafc; }
      .content { display: flex; flex-direction: column; gap: 16px; }
      .panel { display: none; gap: 16px; flex-direction: column; }
      .panel.active { display: flex; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
      .input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; }
      .bottom-nav { display: none; }
      @media (max-width: 960px) {
        .shell { grid-template-columns: 1fr; }
        .nav { display: none; }
        .bottom-nav { display: flex; position: sticky; bottom: 16px; background: #0b1222; border-radius: 16px; padding: 12px; gap: 8px; justify-content: space-around; }
        .bottom-nav button { background: transparent; border: none; color: #94a3b8; font-weight: 600; cursor: pointer; }
        .bottom-nav button.active { color: #f8fafc; }
      }
    `,
    []
  );

  // =========================
  // Render
  // =========================
  if (showSplash) {
    return (
      <div style={{
        fontFamily: "Inter, sans-serif",
        background: "#0F172A",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white"
      }}>
        <style>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
          }
          .breathe { animation: breathe 3s ease-in-out infinite; }
        `}</style>
        <div className="breathe" style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, marginBottom: 12 }}>ETHOS</div>
        <p style={{ color: "#94A3B8", fontSize: 18 }}>Seu ambiente clínico seguro</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        fontFamily: "Inter, sans-serif",
        background: "#0F172A",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}>
        <div style={{ ...sectionStyle, width: "100%", maxWidth: 400, marginBottom: 0 }}>
          <h1 style={{ textAlign: "center", fontSize: 32, marginBottom: 8 }}>ETHOS</h1>
          <p style={{ ...subtleText, textAlign: "center", marginBottom: 24 }}>Acesse sua conta clínica</p>

          <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>
            <label>
              Email
              <input
                style={inputStyle}
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="ex: psico@ethos.app"
                required
              />
            </label>
            <label>
              Senha
              <input
                style={inputStyle}
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
              <span style={{ fontSize: 14 }}>Lembrar de mim</span>
            </label>
            <button style={{ ...buttonStyle, marginTop: 8 }} type="submit">Entrar</button>
          </form>

          <div style={{ marginTop: 24, borderTop: "1px solid #1E293B", paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>
              Logins de teste:<br/>
              psico@ethos.app / ethos2026<br/>
              paciente@ethos.app / ethos2026
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0F172A", minHeight: "100vh", padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#F8FAFC", fontSize: 28, marginBottom: 4 }}>ETHOS — Agenda Clínica</h1>
        <p style={subtleText}>Offline: prontuário + gravação/transcrição local + control plane admin.</p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <button style={{ ...buttonStyle, background: tab === "clinical" ? "#6366F1" : "#334155" }} onClick={() => setTab("clinical")}>
              Clínica
            </button>
            <button style={{ ...buttonStyle, background: tab === "admin" ? "#6366F1" : "#334155" }} onClick={() => setTab("admin")}>
              Admin
            </button>
            {tab === "admin" && hasAdminToken ? <span style={badgeStyle}>{adminStatusLabel}</span> : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, color: "white", fontWeight: 600 }}>{user.fullName}</p>
              <p style={{ margin: 0, color: "#94A3B8", fontSize: 12 }}>{user.role}</p>
            </div>
            <button style={{ ...outlineButtonStyle, padding: "6px 12px", fontSize: 12 }} onClick={handleLogout}>Sair</button>
          </div>
        </div>
      </header>

      {/* Modals globais */}
      {showRecordingConsentModal ? (
        <RecordingConsentModal
          checked={recordingConsentChecked}
          onCheck={setRecordingConsentChecked}
          onCancel={() => {
            setShowRecordingConsentModal(false);
            setRecordingConsentChecked(false);
          }}
          onConfirm={handleConfirmRecordingConsent}
        />
      ) : null}

      {showEthicsModal ? (
        <EthicsValidationModal onCancel={() => setShowEthicsModal(false)} onConfirm={confirmValidation} />
      ) : null}

      {showPatientModal ? (
        <PatientModal
          patient={editingPatient}
          onCancel={() => {
            setShowPatientModal(false);
            setEditingPatient(null);
          }}
          onSave={async (data) => {
            if (editingPatient) {
              await window.ethos.patients.update(editingPatient.id, data);
            } else {
              await window.ethos.patients.create(data);
            }
            refreshData();
            setShowPatientModal(false);
            setEditingPatient(null);
          }}
        />
      ) : null}

      {/* -------------------------
          CLINICAL TAB (com shell PWA)
      -------------------------- */}
      {tab === "clinical" ? (
        <div className="pwa-app">
          <style>{clinicalShellStyles}</style>

          <div className="pwa-header">
            <div>
              <h2>PWA Clínica</h2>
              <p>Experiência mobile-first com navegação rápida e suporte offline.</p>
            </div>
            <div className="status-pill">Modo offline pronto · Última sincronização: 09:24</div>
          </div>

          <div className="shell">
            <nav className="nav" aria-label="Navegação clínica">
              {clinicalNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={clinicalSection === item.id ? "active" : ""}
                  onClick={() => setClinicalSection(item.id)}
                >
                  {item.label}
                  <span>{item.helper}</span>
                </button>
              ))}
            </nav>

            <main className="content">
              {/* LOGIN (placeholder) */}
              <section className={`panel ${clinicalSection === "login" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Login rápido</h2>
                  <p style={{ color: "#CBD5F5" }}>Autenticação segura com PIN local e biometria.</p>
                  <div className="grid" style={{ marginTop: 16 }}>
                    <label style={{ color: "#CBD5F5" }}>
                      Email
                      <input className="input" type="email" placeholder="nome@clinica.com" />
                    </label>
                    <label style={{ color: "#CBD5F5" }}>
                      PIN
                      <input className="input" type="password" placeholder="••••" />
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                    <button style={buttonStyle} type="button">
                      Entrar
                    </button>
                    <button style={{ ...buttonStyle, background: "#334155" }} type="button">
                      Usar biometria
                    </button>
                  </div>
                </div>

                <div style={sectionStyle}>
                  <h2>Sincronização inteligente</h2>
                  <p style={{ color: "#94A3B8" }}>Controlamos uploads apenas quando o Wi-Fi seguro está disponível.</p>
                  <div className="grid" style={{ marginTop: 12 }}>
                    <div>
                      <strong>Fila local</strong>
                      <p style={{ color: "#CBD5F5" }}>3 sessões aguardando envio</p>
                    </div>
                    <div>
                      <strong>Criptografia</strong>
                      <p style={{ color: "#CBD5F5" }}>AES-256 ativo</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* PACIENTES */}
              <section className={`panel ${clinicalSection === "pacientes" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Gestão de Pacientes</h2>
                  <button
                    style={{ ...buttonStyle, marginBottom: 16 }}
                    onClick={() => {
                      setEditingPatient(null);
                      setShowPatientModal(true);
                    }}
                  >
                    + Novo Paciente
                  </button>

                  <div className="grid">
                    {patients.map(p => (
                      <div key={p.id} style={{ background: "#0B1120", padding: 12, borderRadius: 12, border: "1px solid #1E293B" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong style={{ display: "block", marginBottom: 4 }}>{p.fullName}</strong>
                          <span style={{ fontSize: 10, color: "#64748B" }}>CPF: {p.cpf || "--"}</span>
                        </div>
                        {p.phoneNumber && <p style={{ color: "#CBD5F5", fontSize: 12, marginBottom: 4 }}>{p.phoneNumber}</p>}
                        {p.address && <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 4 }}>{p.address}</p>}
                        {(() => {
                          const entries = financialEntries.filter(e => e.patientId === p.id);
                          const balance = entries.reduce((acc, e) => e.type === "payment" ? acc - e.amount : acc + e.amount, 0);
                          return balance > 0 ? (
                            <p style={{ color: "#FCA5A5", fontSize: 12, fontWeight: 600 }}>Débito: R$ {(balance/100).toFixed(2)}</p>
                          ) : balance < 0 ? (
                            <p style={{ color: "#10B981", fontSize: 12, fontWeight: 600 }}>Crédito: R$ {(-balance/100).toFixed(2)}</p>
                          ) : null;
                        })()}
                        <p style={{ ...subtleText, fontSize: 11 }}>ID: {p.id.slice(0, 8)}...</p>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button
                          style={{ ...outlineButtonStyle, fontSize: 11, padding: "4px 8px" }}
                          onClick={() => {
                            setEditingPatient(p);
                            setShowPatientModal(true);
                          }}
                        >
                          Ficha Completa
                        </button>
                        <button
                          style={{ ...outlineButtonStyle, fontSize: 11, padding: "4px 8px" }}
                          onClick={async () => {
                            if (window.ethos?.sessions) {
                              await window.ethos.sessions.create({
                                patientId: p.id,
                                scheduledAt: new Date().toISOString(),
                                status: "scheduled"
                              });
                              refreshData();
                              setClinicalSection("agenda");
                            }
                          }}
                        >
                          Agendar Sessão
                        </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* AGENDA */}
              <section className={`panel ${clinicalSection === "agenda" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Agenda / Sessões</h2>
                  <div className="grid" style={{ marginTop: 12 }}>
                    {sessions.length === 0 ? (
                      <p style={subtleText}>Nenhuma sessão agendada.</p>
                    ) : (
                      sessions.map(s => {
                        const p = patients.find(patient => patient.id === s.patientId);
                        return (
                          <div
                            key={s.id}
                            style={{
                              background: selectedSessionId === s.id ? "#1E293B" : "#0B1120",
                              padding: 12,
                              borderRadius: 12,
                              border: "1px solid #1E293B",
                              cursor: "pointer"
                            }}
                            onClick={() => {
                              setSelectedSessionId(s.id);
                              setClinicalSection("sessao");
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <strong>{p?.fullName || "Paciente desconhecido"}</strong>
                                <p style={{ color: "#CBD5F5", fontSize: 14 }}>{new Date(s.scheduledAt).toLocaleString("pt-BR")}</p>
                                <span style={{ ...badgeStyle, marginTop: 8 }}>{s.status}</span>
                              </div>
                              {p?.phoneNumber && (
                                <button
                                  style={{ ...buttonStyle, background: "#25D366", padding: "6px 10px", fontSize: 12 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendReminder(p, s);
                                  }}
                                  title="Enviar lembrete WhatsApp"
                                >
                                  WhatsApp
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div style={sectionStyle}>
                  <h2>Próximas tarefas</h2>
                  <ul style={{ color: "#CBD5F5", paddingLeft: 18, margin: 0 }}>
                    <li>Validar prontuários pendentes</li>
                    <li>Realizar backup semanal</li>
                  </ul>
                </div>
              </section>

              {/* SESSÃO */}
              <section className={`panel ${clinicalSection === "sessao" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Sessão</h2>
                  {selectedSessionId === null ? (
                    <p style={{ color: "#FBBF24" }}>Selecione uma sessão na Agenda para começar.</p>
                  ) : (
                    <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ color: "#CBD5F5", margin: 0 }}>Paciente: {patientName}</p>
                    {currentPatient?.phoneNumber && (
                      <button
                        style={{ ...buttonStyle, background: "#25D366", display: "flex", alignItems: "center", gap: 8 }}
                        onClick={() => handleSendReminder(currentPatient, currentSession)}
                      >
                        📱 Enviar Lembrete (WhatsApp)
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                    <button style={buttonStyle} onClick={handleImportAudio} type="button">
                      Importar áudio
                    </button>

                    <button
                      style={recorder.status === "recording" ? { ...buttonStyle, background: "#EF4444" } : secondaryButtonStyle}
                      onClick={recorder.status === "recording" ? recorder.stopRecording : handleStartRecording}
                      type="button"
                    >
                      {recorder.status === "recording" ? "Parar gravação" : "Gravar áudio"}
                    </button>

                    {recorder.audioUrl ? (
                      <button style={outlineButtonStyle} onClick={recorder.resetRecording} type="button">
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
                      <button style={{ ...buttonStyle, background: "#14B8A6" }} onClick={handleTranscribeRecordedAudio} type="button">
                        Iniciar transcrição
                      </button>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                    <span style={badgeStyle}>{recorder.status === "recording" ? "Gravando" : "Pronto para gravar"}</span>
                    <span style={badgeStyle}>Tempo: {recorder.elapsedLabel}</span>
                    {consentForRecording ? <span style={badgeStyle}>Consentimento registrado</span> : null}
                  </div>

                  {recorder.errorMessage ? <p style={{ color: "#FCA5A5", marginTop: 8 }}>Erro: {recorder.errorMessage}</p> : null}

                  {recorder.audioUrl ? (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ color: "#E2E8F0", marginBottom: 8 }}>
                        Áudio salvo {recorder.audioFilePath ? `em ${recorder.audioFilePath}` : "localmente"}.
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

                  <p style={{ color: "#94A3B8", marginTop: 8 }}>
                    Status da transcrição: aguardando envio para o worker local.
                  </p>
                  </>
                  )}
                </div>
              </section>

              {/* PRONTUÁRIO */}
              <section className={`panel ${clinicalSection === "prontuario" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Prontuário automático</h2>
                  {selectedSessionId === null ? (
                    <p style={{ color: "#FBBF24" }}>Selecione uma sessão na Agenda para visualizar o prontuário.</p>
                  ) : (
                    <>
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
                      {isValidated ? `Bloqueado para edição · ${validatedAt ?? "Validado"}` : "Edição liberada até validação ética."}
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
                    onBlur={saveDraft}
                    readOnly={isValidated}
                    placeholder="Escreva aqui o prontuário..."
                    style={{
                      width: "100%",
                      minHeight: 140,
                      marginTop: 12,
                      borderRadius: 12,
                      padding: 12,
                      border: "1px solid #334155",
                      background: isValidated ? "#1E293B" : "#0f172a",
                      color: "#E2E8F0",
                    }}
                  />

                  <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                    {!isValidated && (
                      <div style={{ display: "flex", gap: 12 }}>
                        <select
                          style={{ ...buttonStyle, background: "#8B5CF6", width: "auto" }}
                          onChange={(e) => handleAiTransform(e.target.value)}
                          disabled={isGeneratingNote}
                          value=""
                        >
                          <option value="" disabled>{isGeneratingNote ? "Processando..." : "✨ Gerar com IA"}</option>
                          <option value="prontuario">Prontuário (CRP)</option>
                          <option value="relatorio">Relatório Clínico</option>
                        </select>
                      </div>
                    )}
                    {!isValidated && (
                      <button
                        style={secondaryButtonStyle}
                        onClick={saveDraft}
                        type="button"
                      >
                        Salvar rascunho
                      </button>
                    )}
                    <button
                      style={{
                        ...buttonStyle,
                        background: canValidate ? "#22C55E" : "#334155",
                        cursor: canValidate ? "pointer" : "not-allowed",
                      }}
                      onClick={handleValidate}
                      disabled={!canValidate}
                      type="button"
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
                      type="button"
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
                      type="button"
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
                  </>
                  )}
                </div>
              </section>

              {/* FINANCEIRO */}
              <section className={`panel ${clinicalSection === "financeiro" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Gestão Financeira</h2>
                  <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                    <button
                      style={buttonStyle}
                      onClick={async () => {
                        const pId = prompt("ID do Paciente (cole aqui):");
                        if (!pId) return;
                        const amount = prompt("Valor (em reais, ex: 150.00):");
                        if (!amount) return;
                        if (window.ethos?.financial) {
                          await window.ethos.financial.create({
                            patientId: pId,
                            amount: Math.round(parseFloat(amount) * 100),
                            type: "charge",
                            category: "session",
                            status: "pending",
                            date: new Date().toISOString()
                          });
                          refreshData();
                        }
                      }}
                    >
                      + Nova Cobrança
                    </button>
                    <button
                      style={{ ...buttonStyle, background: "#10B981" }}
                      onClick={async () => {
                        const pId = prompt("ID do Paciente (cole aqui):");
                        if (!pId) return;
                        const amount = prompt("Valor (em reais, ex: 150.00):");
                        if (!amount) return;
                        if (window.ethos?.financial) {
                          await window.ethos.financial.create({
                            patientId: pId,
                            amount: Math.round(parseFloat(amount) * 100),
                            type: "payment",
                            category: "session",
                            status: "completed",
                            method: "pix",
                            date: new Date().toISOString()
                          });
                          refreshData();
                        }
                      }}
                    >
                      + Registrar Pagamento
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {financialEntries.length === 0 ? (
                      <p style={subtleText}>Nenhum registro financeiro.</p>
                    ) : (
                      financialEntries.map(e => {
                        const p = patients.find(patient => patient.id === e.patientId);
                        return (
                          <div
                            key={e.id}
                            style={{
                              background: "#0B1120",
                              padding: 12,
                              borderRadius: 12,
                              border: "1px solid #1E293B",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <strong style={{ color: e.type === "payment" ? "#10B981" : "#FBBF24" }}>
                                {e.type === "payment" ? "PAGAMENTO" : "COBRANÇA"}
                              </strong>
                              <p style={{ color: "#E2E8F0", fontSize: 14 }}>{p?.fullName || "Desconhecido"}</p>
                              <p style={{ ...subtleText, fontSize: 12 }}>{new Date(e.date).toLocaleDateString("pt-BR")}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ fontSize: 18, fontWeight: 700 }}>R$ {(e.amount / 100).toFixed(2)}</p>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                                {e.type === "payment" && (
                                  <button
                                    style={{ ...outlineButtonStyle, padding: "2px 8px", fontSize: 10 }}
                                    onClick={async () => {
                                      if (window.ethos?.genai) {
                                        const recibo = await window.ethos.genai.generateRecibo({
                                          patientId: e.patientId,
                                          amount: e.amount,
                                          date: e.date
                                        });
                                        if (window.ethos?.export) {
                                          await window.ethos.export.pdf(recibo, `Recibo_${p?.fullName}_${new Date(e.date).toISOString().split('T')[0]}`);
                                        }
                                      }
                                    }}
                                  >
                                    Recibo PDF
                                  </button>
                                )}
                                <span style={{ ...badgeStyle, background: e.status === "completed" ? "#064E3B" : "#451A03" }}>
                                  {e.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              {/* DIÁRIOS */}
              <section className={`panel ${clinicalSection === "diarios" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Diários e Formulários</h2>
                  <p style={subtleText}>Acompanhe a evolução do paciente entre as sessões.</p>

                  <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "250px 1fr", gap: 24 }}>
                    <div style={{ background: "#0B1120", padding: 16, borderRadius: 12, border: "1px solid #1E293B" }}>
                      <h4 style={{ marginTop: 0 }}>Pacientes</h4>
                      <div style={{ display: "grid", gap: 8 }}>
                        {patients.map(p => (
                          <button
                            key={p.id}
                            style={{
                              ...outlineButtonStyle,
                              textAlign: "left",
                              background: selectedPatientId === p.id ? "#1E293B" : "transparent",
                              borderColor: selectedPatientId === p.id ? "#3B82F6" : "#1E293B"
                            }}
                            onClick={() => setSelectedPatientId(p.id)}
                          >
                            {p.fullName}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      {!selectedPatientId ? (
                        <p style={subtleText}>Selecione um paciente para ver as respostas.</p>
                      ) : (
                        <PatientDiariesView patientId={selectedPatientId} templates={formTemplates} />
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* RELATÓRIOS */}
              <section className={`panel ${clinicalSection === "relatorios" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Geração de Documentos</h2>
                  <p style={subtleText}>Gere documentos oficiais com base nos dados clínicos.</p>

                  <div style={{ marginTop: 16, display: "grid", gap: 16, maxWidth: 400 }}>
                    <label style={{ display: "grid", gap: 8 }}>
                      Tipo de Documento
                      <select
                        style={inputStyle}
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as any)}
                      >
                        <option value="declaration">Declaração de Comparecimento</option>
                        <option value="clinical_report">Relatório Psicológico (baseado em nota validada)</option>
                      </select>
                    </label>

                    {reportType === "declaration" ? (
                      <div>
                        <p style={{ ...subtleText, fontSize: 14, marginBottom: 12 }}>
                          Gera uma declaração simples confirmando a presença do paciente na sessão selecionada.
                        </p>
                        <button
                          style={buttonStyle}
                          disabled={!selectedSessionId}
                          onClick={async () => {
                            if (!currentPatient || !currentSession) return;
                            const text = `DECLARAÇÃO DE COMPARECIMENTO\n\nDeclaro para os devidos fins que o(a) paciente ${currentPatient.fullName} compareceu à sessão de psicoterapia no dia ${new Date(currentSession.scheduledAt).toLocaleDateString("pt-BR")}.\n\nEmitido em: ${new Date().toLocaleDateString("pt-BR")}\n\nResponsável: ${clinicianName}`;
                            if (window.ethos?.export) {
                              await window.ethos.export.pdf(text, `Declaracao_${currentPatient.fullName}`);
                            }
                          }}
                        >
                          Gerar PDF
                        </button>
                        {!selectedSessionId && <p style={{ color: "#FBBF24", fontSize: 12, marginTop: 8 }}>Selecione uma sessão na Agenda primeiro.</p>}
                      </div>
                    ) : (
                      <div>
                        <p style={{ ...subtleText, fontSize: 14, marginBottom: 12 }}>
                          Gera um relatório clínico detalhado baseado no prontuário VALIDADO da sessão selecionada.
                        </p>
                        <button
                          style={buttonStyle}
                          disabled={!selectedSessionId || status !== "validated"}
                          onClick={async () => {
                            if (!currentPatient || !currentSession || status !== "validated") return;
                            const text = `RELATÓRIO PSICOLÓGICO\n\nIDENTIFICAÇÃO\nPaciente: ${currentPatient.fullName}\nProfissional: ${clinicianName}\nData da Sessão: ${new Date(currentSession.scheduledAt).toLocaleDateString("pt-BR")}\n\nDESCRIÇÃO E EVOLUÇÃO\n${draft}\n\nDocumento validado eletronicamente em ${validatedAt}.`;
                            if (window.ethos?.export) {
                              await window.ethos.export.pdf(text, `Relatorio_${currentPatient.fullName}`);
                            }
                          }}
                        >
                          Gerar PDF (Relatório)
                        </button>
                        {(!selectedSessionId || status !== "validated") && (
                          <p style={{ color: "#FBBF24", fontSize: 12, marginTop: 8 }}>
                            Requer uma sessão selecionada e um prontuário VALIDADO.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* CONFIGURAÇÕES */}
              <section className={`panel ${clinicalSection === "config" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Segurança e Backup</h2>
                  <p style={subtleText}>Gerencie a integridade e o backup dos seus dados clínicos.</p>

                  <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
                    <div>
                      <strong>Lembrete WhatsApp (Template)</strong>
                      <p style={{ ...subtleText, fontSize: 14, marginBottom: 8 }}>Use {{nome}}, {{data}} e {{hora}} como variáveis.</p>
                      <textarea
                        style={{ ...inputStyle, minHeight: 80, fontSize: 14 }}
                        value={whatsappTemplate}
                        onChange={(e) => setWhatsappTemplate(e.target.value)}
                      />
                    </div>

                    <div style={{ borderTop: "1px solid #1E293B", paddingTop: 16 }}>
                      <strong>Backup Local</strong>
                      <p style={{ ...subtleText, fontSize: 14, marginBottom: 8 }}>Cria uma cópia criptografada do banco de dados.</p>
                      <button
                        style={buttonStyle}
                        onClick={async () => {
                          const pwd = prompt("Defina uma senha para o arquivo de backup:");
                          if (pwd && window.ethos?.backup) {
                            const ok = await window.ethos.backup.create(pwd);
                            if (ok) alert("Backup concluído com sucesso!");
                          }
                        }}
                      >
                        Criar Backup
                      </button>
                    </div>

                    <div style={{ borderTop: "1px solid #1E293B", paddingTop: 16 }}>
                      <strong>Restaurar Backup</strong>
                      <p style={{ ...subtleText, fontSize: 14, marginBottom: 8 }}>Substitui o banco de dados atual por um backup.</p>
                      <button
                        style={secondaryButtonStyle}
                        onClick={async () => {
                          const pwd = prompt("Digite a senha do arquivo de backup:");
                          if (pwd && window.ethos?.backup) {
                            const ok = await window.ethos.backup.restore(pwd);
                            if (ok) alert("Restauração concluída! Reinicie o aplicativo.");
                          }
                        }}
                      >
                        Restaurar Backup
                      </button>
                    </div>

                    <div style={{ borderTop: "1px solid #1E293B", paddingTop: 16 }}>
                      <strong>Limpeza de Dados (Purge)</strong>
                      <p style={{ ...subtleText, fontSize: 14, marginBottom: 8 }}>Apaga todos os dados locais permanentemente.</p>
                      <button
                        style={{ ...buttonStyle, background: "#EF4444" }}
                        onClick={async () => {
                          if (confirm("TEM CERTEZA? Isso apagará todos os pacientes, sessões e áudios.") && window.ethos?.privacy) {
                            await window.ethos.privacy.purgeAll();
                            refreshData();
                            alert("Todos os dados foram apagados.");
                          }
                        }}
                      >
                        Apagar Tudo
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </main>
          </div>

          <nav className="bottom-nav" aria-label="Navegação clínica móvel">
            {clinicalNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={clinicalSection === item.id ? "active" : ""}
                onClick={() => setClinicalSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      ) : null}

      {/* -------------------------
          ADMIN TAB
      -------------------------- */}
      {tab === "admin" ? (
        <section style={sectionStyle}>
          <h2>Admin — Control Plane</h2>
          <p style={{ ...subtleText, marginBottom: 12 }}>
            Painel restrito à role=admin. Exibe apenas métricas agregadas e usuários sanitizados (sem conteúdo clínico).
          </p>

          <form onSubmit={handleAdminLogin} style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ color: "#E2E8F0" }}>URL do control plane</label>
              <input value={adminBaseUrl} onChange={(event) => setAdminBaseUrl(event.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ color: "#E2E8F0" }}>Email</label>
              <input value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} style={inputStyle} autoComplete="username" />
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
              <input type="checkbox" checked={rememberSession} onChange={(e) => setRememberSession(e.target.checked)} />
              Lembrar sessão neste dispositivo (salva token localmente)
            </label>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button style={{ ...buttonStyle, background: "#22C55E" }} disabled={adminLoading}>
                Entrar
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
      ) : null}
    </div>
  );
};


function PatientDiariesView({ patientId, templates }: { patientId: string; templates: any[] }) {
  const [responses, setResponses] = useState<any[]>([]);

  const loadResponses = useCallback(async () => {
    if (window.ethos?.forms) {
      const res = await window.ethos.forms.getResponses(patientId);
      setResponses(res || []);
    }
  }, [patientId]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Histórico de Respostas</h3>
        <div style={{ display: "flex", gap: 12 }}>
          {templates.map(t => (
            <button
              key={t.id}
              style={{ ...buttonStyle, padding: "6px 12px", fontSize: 12 }}
              onClick={async () => {
                const schema = JSON.parse(t.schema);
                const answers: any = {};
                for (const field of schema) {
                  const val = prompt(field.question);
                  if (val === null) return;
                  answers[field.id] = val;
                }
                await window.ethos.forms.submitResponse({
                  formId: t.id,
                  patientId,
                  answers
                });
                loadResponses();
              }}
            >
              + {t.title}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {responses.length === 0 ? (
          <p style={{ color: "#94A3B8" }}>Nenhuma resposta registrada ainda.</p>
        ) : (
          responses.map(r => {
            const answers = JSON.parse(r.answers);
            return (
              <div key={r.id} style={{ background: "#0B1120", padding: 16, borderRadius: 12, border: "1px solid #1E293B" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <strong style={{ color: "#3B82F6" }}>{r.formTitle}</strong>
                  <span style={{ fontSize: 12, color: "#64748B" }}>{new Date(r.createdAt).toLocaleString("pt-BR")}</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.entries(answers).map(([key, val]: [string, any]) => (
                    <div key={key}>
                      <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>Pergunta ID: {key}</p>
                      <p style={{ margin: 0, color: "#E2E8F0" }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
