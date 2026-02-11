// apps/ethos-desktop/src/components/App.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
type ClinicalSection =
  | "login"
  | "pacientes"
  | "agenda"
  | "sessao"
  | "prontuario"
  | "financeiro"
  | "diarios"
  | "relatorios"
  | "config";

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
  border: "1px solid #334155",
  background: "#2563EB",
  color: "#FFFFFF",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#334155",
};

const outlineButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "transparent",
  color: "#E2E8F0",
  fontWeight: 700,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#0B1220",
  color: "#E2E8F0",
  outline: "none",
};

const subtleText: React.CSSProperties = {
  color: "#94A3B8",
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "#1E293B",
  margin: "14px 0",
};

const clamp = (s: string, max = 180) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

const safeLocalStorageGet = (k: string, fallback = "") => {
  try {
    return localStorage.getItem(k) ?? fallback;
  } catch {
    return fallback;
  }
};

const safeLocalStorageSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

// -----------------------------
// Clinical Shell CSS (PWA-like)
// -----------------------------
const clinicalShellStyles = `
.pwa-app{
  min-height: calc(100vh - 24px);
  border-radius: 20px;
  border: 1px solid #1E293B;
  background: radial-gradient(1200px 600px at 10% 0%, rgba(59,130,246,0.20), transparent 60%),
              radial-gradient(800px 400px at 90% 10%, rgba(16,185,129,0.14), transparent 60%),
              #0B1220;
  padding: 18px;
}
.pwa-header{
  display:flex; justify-content:space-between; align-items:flex-start;
  gap: 16px;
  padding: 10px 10px 16px 10px;
  border-bottom: 1px solid #1E293B;
  margin-bottom: 14px;
}
.pwa-header h2{ margin: 0; font-size: 18px; }
.pwa-header p{ margin: 6px 0 0 0; color:#94A3B8; font-size: 12px;}
.status-pill{
  font-size: 12px;
  border: 1px solid #334155;
  padding: 8px 12px;
  border-radius: 999px;
  color:#E2E8F0;
  background: rgba(30,41,59,0.55);
}
.shell{
  display:grid;
  grid-template-columns: 240px 1fr;
  gap: 14px;
  min-height: 60vh;
}
.nav{
  border: 1px solid #1E293B;
  border-radius: 16px;
  padding: 10px;
  background: rgba(2,6,23,0.55);
}
.nav button{
  width:100%;
  text-align:left;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color:#E2E8F0;
  cursor:pointer;
  display:flex;
  flex-direction:column;
  gap: 4px;
  margin-bottom: 8px;
}
.nav button span{ font-size: 11px; color:#94A3B8;}
.nav button.active{
  background: rgba(37,99,235,0.14);
  border-color: rgba(37,99,235,0.45);
}
.content{
  border: 1px solid #1E293B;
  border-radius: 16px;
  background: rgba(2,6,23,0.55);
  padding: 10px;
}
.panel{ display:none; }
.panel.active{ display:block; }

.grid{ display:grid; gap: 12px; }
@media (max-width: 980px){
  .shell{ grid-template-columns: 1fr; }
  .nav{ display:none; }
}
.bottom-nav{
  position: sticky;
  bottom: 0;
  margin-top: 12px;
  display:flex;
  gap: 8px;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid #1E293B;
  background: rgba(2,6,23,0.75);
}
.bottom-nav button{
  flex:1;
  padding: 10px 8px;
  border-radius: 12px;
  border: 1px solid #334155;
  background: transparent;
  color:#E2E8F0;
  cursor: pointer;
  font-size: 12px;
}
.bottom-nav button.active{
  background: rgba(37,99,235,0.18);
  border-color: rgba(37,99,235,0.55);
}
`;

// -----------------------------
// Nav items
// -----------------------------
const clinicalNavItems: Array<{ id: ClinicalSection; label: string; helper: string }> = [
  { id: "login", label: "Login", helper: "Acesso rápido local" },
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
          } catch {}
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

  // =========================
  // Session context (proto)
  // =========================
  const currentSession = useMemo(() => sessions.find((s) => s.id === selectedSessionId), [sessions, selectedSessionId]);
  const currentPatient = useMemo(() => patients.find((p) => p.id === currentSession?.patientId), [patients, currentSession]);

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

  const canValidate = useMemo(() => {
    if (!draft.trim()) return false;
    if (!consentForNote) return false;
    if (status === "validated") return false;
    return true;
  }, [draft, consentForNote, status]);

  const confirmValidation = useCallback(async () => {
    if (!selectedSessionId || !window.ethos?.notes) return;

    await window.ethos.notes.validate(selectedSessionId);
    await loadNote();
    setShowEthicsModal(false);
  }, [selectedSessionId, loadNote]);

  // =========================
  // Transcription (worker bridge)
  // =========================
  const [workerLogs, setWorkerLogs] = useState<string[]>([]);
  const [jobStatus, setJobStatus] = useState<string>("idle");
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobError, setJobError] = useState<string | null>(null);
  const [modelId, setModelId] = useState<ModelId>("ptbr-fast");
  const [transcriptionText, setTranscriptionText] = useState<string>("");

  const appendLog = useCallback((line: string) => {
    setWorkerLogs((prev) => {
      const next = [...prev, line];
      return next.slice(-200);
    });
  }, []);

  useEffect(() => {
    if (!window.ethos?.transcription?.onMessage) return;

    const unsubscribe = window.ethos.transcription.onMessage((m: WorkerMessage) => {
      const msg = m as any;
      if (!msg || !msg.type) return;

      if (msg.type === "worker_log") {
        appendLog(String(msg.payload?.line || ""));
      }

      if (msg.type === "job_update") {
        const payload = msg.payload || {};
        setJobStatus(String(payload.status || "unknown"));
        setJobProgress(typeof payload.progress === "number" ? payload.progress : 0);
        setJobError(payload.error ? String(payload.error) : null);
      }
    });

    const unsubscribeErr = window.ethos.transcription.onError((err: string) => {
      appendLog("Worker error: " + err);
      setJobError(err);
    });

    return () => {
      try {
        unsubscribe?.();
        unsubscribeErr?.();
      } catch {}
    };
  }, [appendLog]);

  // =========================
  // Audio Recorder (hook)
  // =========================
  const { isRecording, durationMs, startRecording, stopRecording, lastBlob } = useAudioRecorder();

  // =========================
  // Modals
  // =========================
  const [showConsentModal, setShowConsentModal] = useState(false);

  // =========================
  // Admin plane (improved with safe persistence + derived status label)
  // =========================
  const defaultControlPlaneUrl = "http://localhost:8787";

  // NEW: persist URL + email (from additional) using safe localStorage
  const [adminBaseUrl, setAdminBaseUrl] = useState(() => safeLocalStorageGet("ethos-control-plane-url", defaultControlPlaneUrl));
  const [adminEmail, setAdminEmail] = useState(() => safeLocalStorageGet("ethos-admin-email", ""));
  const [adminPassword, setAdminPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(true);

  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<Role>("unknown");
  const [adminMetrics, setAdminMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const hasAdminToken = Boolean(adminToken);
  const isAdmin = adminRole === "admin";

  // NEW: derived status label (from additional) – avoids state drift
  const adminStatusLabel = useMemo(() => {
    if (!hasAdminToken) return "Sem sessão ativa.";
    if (adminLoading) return "Sincronizando dados administrativos…";
    if (isAdmin) return "Acesso administrativo confirmado.";
    if (adminRole === "user") return "Sessão válida sem permissão admin.";
    return "Sessão precisa de validação.";
  }, [adminLoading, adminRole, hasAdminToken, isAdmin]);

  // Load stored token/role (original behavior)
  useEffect(() => {
    const stored = safeLocalStorageGet("ethos-admin-token", "");
    const storedRole = safeLocalStorageGet("ethos-admin-role", "");
    if (stored) setAdminToken(stored);
    if (storedRole === "admin" || storedRole === "user") setAdminRole(storedRole as Role);
  }, []);

  // NEW: persist URL/email immediately (safe)
  useEffect(() => {
    safeLocalStorageSet("ethos-control-plane-url", adminBaseUrl);
  }, [adminBaseUrl]);

  useEffect(() => {
    safeLocalStorageSet("ethos-admin-email", adminEmail);
  }, [adminEmail]);

  // refresh admin data (NEW: Promise.all from additional)
  const refreshAdminData = useCallback(async () => {
    if (!adminToken) return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const [overview, users] = await Promise.all([
        fetchAdminOverview(adminBaseUrl, adminToken),
        fetchAdminUsers(adminBaseUrl, adminToken),
      ]);
      setAdminMetrics(overview);
      setAdminUsers(users);
      // NOTE: we do NOT set role=admin here. Role should come from login or server claims.
    } catch (e: any) {
      const message = e?.message || "Erro ao atualizar admin";
      setAdminError(message);
      // If backend returns forbidden and you want the UI to reflect it:
      if (String(message).toLowerCase().includes("forbidden")) {
        setAdminRole("user");
      }
      setAdminMetrics(null);
      setAdminUsers([]);
    } finally {
      setAdminLoading(false);
    }
  }, [adminBaseUrl, adminToken]);

  // NEW: auto-refresh when token/baseUrl change (from additional idea)
  useEffect(() => {
    if (!adminToken) return;
    void refreshAdminData();
  }, [adminToken, adminBaseUrl, refreshAdminData]);

  const handleAdminLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAdminLoading(true);
      setAdminError(null);
      try {
        // keep ORIGINAL signature
        const result = await loginControlPlane(adminBaseUrl, { email: adminEmail, password: adminPassword });
        setAdminToken(result.token);
        setAdminRole(result.role);
        setAdminPassword("");

        if (rememberSession) {
          safeLocalStorageSet("ethos-admin-token", result.token);
          safeLocalStorageSet("ethos-admin-role", result.role);
        }

        await refreshAdminData();
      } catch (err: any) {
        setAdminError(err?.message || "Erro de login");
        setAdminRole("unknown");
      } finally {
        setAdminLoading(false);
      }
    },
    [adminBaseUrl, adminEmail, adminPassword, rememberSession, refreshAdminData],
  );

  const handleAdminLogout = useCallback(() => {
    setAdminToken(null);
    setAdminRole("unknown");
    setAdminMetrics(null);
    setAdminUsers([]);
    safeLocalStorageSet("ethos-admin-token", "");
    safeLocalStorageSet("ethos-admin-role", "");
  }, []);

  // =========================
  // Export
  // =========================
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [exporting, setExporting] = useState(false);

  const doExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportClinicalNote({
        sessionId,
        patientName,
        clinicianName,
        sessionDate,
        text: draft,
        format: exportFormat,
      });
    } finally {
      setExporting(false);
    }
  }, [sessionId, patientName, clinicianName, sessionDate, draft, exportFormat]);

  // =========================
  // Auth actions
  // =========================
  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!window.ethos?.auth) {
        alert("Bridge de auth não disponível (window.ethos.auth).");
        return;
      }
      try {
        const payload = await window.ethos.auth.login({ email: loginEmail, password: loginPassword });
        setUser(payload);
        if (rememberMe) {
          const token = JSON.stringify(payload);
          const encrypted = await window.ethos.auth.encryptToken(token);
          safeLocalStorageSet("ethos-auth-token", encrypted);
        } else {
          safeLocalStorageSet("ethos-auth-token", "");
        }
        await refreshData();
      } catch (err: any) {
        alert(err?.message || "Erro ao logar");
      }
    },
    [loginEmail, loginPassword, rememberMe, refreshData],
  );

  const handleLogout = useCallback(async () => {
    setUser(null);
    safeLocalStorageSet("ethos-auth-token", "");
    try {
      await window.ethos?.auth?.logout?.();
    } catch {}
  }, []);

  // =========================
  // Session actions
  // =========================
  const handleOpenConsent = useCallback(() => setShowConsentModal(true), []);
  const handleConsentConfirm = useCallback(() => {
    setConsentForNote(true);
    setShowConsentModal(false);
  }, []);
  const handleConsentCancel = useCallback(() => {
    setConsentForNote(false);
    setShowConsentModal(false);
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (!selectedSessionId) {
      alert("Selecione uma sessão antes de gravar.");
      return;
    }
    await startRecording();
  }, [selectedSessionId, startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  const handleTranscribeLast = useCallback(async () => {
    if (!lastBlob) {
      alert("Nenhum áudio gravado ainda.");
      return;
    }
    if (!window.ethos?.transcription?.enqueue) {
      alert("Bridge de transcrição não disponível.");
      return;
    }

    setJobStatus("queued");
    setJobProgress(0);
    setJobError(null);

    const arrayBuffer = await lastBlob.arrayBuffer();
    const jobId = await window.ethos.transcription.enqueue({
      modelId,
      sessionId: selectedSessionId,
      audio: arrayBuffer,
      mimeType: lastBlob.type || "audio/webm",
    });

    appendLog(`Job enfileirado: ${jobId}`);
  }, [appendLog, lastBlob, modelId, selectedSessionId]);

  // =========================
  // Derived UI helpers
  // =========================
  const durationLabel = useMemo(() => {
    const s = Math.floor(durationMs / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [durationMs]);

  // =========================
  // UI
  // =========================
  if (showSplash) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0B1220", color: "#E2E8F0" }}>
        <div style={{ textAlign: "center", maxWidth: 520, padding: 20 }}>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 2 }}>ETHOS</div>
          <p style={{ ...subtleText, marginTop: 10 }}>Plataforma clínica offline-first · Inicializando módulos…</p>
          <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: "#2563EB" }} />
            <div style={{ width: 10, height: 10, borderRadius: 99, background: "#334155" }} />
            <div style={{ width: 10, height: 10, borderRadius: 99, background: "#334155" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, background: "#0B1220", minHeight: "100vh", color: "#E2E8F0" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 1 }}>ETHOS</h1>
          <span style={{ ...subtleText, fontSize: 12 }}>Desktop · Offline-first</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            style={{ ...outlineButtonStyle, borderColor: tab === "clinical" ? "#2563EB" : "#334155" }}
            onClick={() => setTab("clinical")}
          >
            Clínica
          </button>
          <button
            type="button"
            style={{ ...outlineButtonStyle, borderColor: tab === "admin" ? "#2563EB" : "#334155" }}
            onClick={() => setTab("admin")}
          >
            Admin
          </button>

          <div style={{ width: 1, height: 24, background: "#1E293B" }} />

          {user ? (
            <>
              <span style={{ fontSize: 12, color: "#A7F3D0" }}>Logado</span>
              <button type="button" style={secondaryButtonStyle} onClick={handleLogout}>
                Sair
              </button>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "#FBBF24" }}>Não logado</span>
          )}
        </div>
      </div>

      {/* Login Card (basic) */}
      {!user ? (
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0 }}>Login</h2>
          <p style={subtleText}>Autenticação local (placeholder). No Electron, isso pode virar PIN + biometria.</p>

          <form onSubmit={handleLogin} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
            <input
              style={inputStyle}
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="username"
            />
            <input
              style={inputStyle}
              placeholder="Senha"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
            />
            <label style={{ display: "flex", gap: 10, alignItems: "center", color: "#E2E8F0", fontSize: 13 }}>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Lembrar-me (salva token criptografado localmente)
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={buttonStyle} type="submit">
                Entrar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Consent Modal */}
      {showConsentModal ? <RecordingConsentModal onCancel={handleConsentCancel} onConfirm={handleConsentConfirm} /> : null}

      {showEthicsModal ? <EthicsValidationModal onCancel={() => setShowEthicsModal(false)} onConfirm={confirmValidation} /> : null}

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
                      <input className="input" style={inputStyle} type="email" placeholder="nome@clinica.com" />
                    </label>
                    <label style={{ color: "#CBD5F5" }}>
                      PIN
                      <input className="input" style={inputStyle} type="password" placeholder="••••" />
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
                    type="button"
                    onClick={() => {
                      setEditingPatient(null);
                      setShowPatientModal(true);
                    }}
                  >
                    + Novo Paciente
                  </button>

                  <div className="grid">
                    {patients.map((p) => {
                      const entries = financialEntries.filter((e) => e.patientId === p.id);
                      const balance = entries.reduce((acc: number, e: any) => (e.type === "payment" ? acc - e.amount : acc + e.amount), 0);

                      return (
                        <div
                          key={p.id}
                          style={{
                            background: "#0B1120",
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #1E293B",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div>
                              <strong style={{ display: "block", marginBottom: 4 }}>{p.fullName}</strong>
                              {p.phoneNumber ? <p style={{ color: "#CBD5F5", fontSize: 12, marginBottom: 4 }}>{p.phoneNumber}</p> : null}
                              {p.address ? <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 4 }}>{p.address}</p> : null}
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: 10, color: "#64748B" }}>CPF: {p.cpf || "--"}</span>
                              <p style={{ ...subtleText, fontSize: 11, marginTop: 6 }}>ID: {String(p.id).slice(0, 8)}...</p>
                            </div>
                          </div>

                          {balance > 0 ? (
                            <p style={{ color: "#FCA5A5", fontSize: 12, fontWeight: 600, marginTop: 6 }}>Débito: R$ {(balance / 100).toFixed(2)}</p>
                          ) : balance < 0 ? (
                            <p style={{ color: "#10B981", fontSize: 12, fontWeight: 600, marginTop: 6 }}>Crédito: R$ {(-balance / 100).toFixed(2)}</p>
                          ) : null}

                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              style={{ ...outlineButtonStyle, fontSize: 11, padding: "4px 8px" }}
                              onClick={() => {
                                setEditingPatient(p);
                                setShowPatientModal(true);
                                setSelectedPatientId(p.id);
                              }}
                            >
                              Ficha Completa
                            </button>

                            <button
                              type="button"
                              style={{ ...outlineButtonStyle, fontSize: 11, padding: "4px 8px" }}
                              onClick={() => {
                                setSelectedPatientId(p.id);
                                setClinicalSection("diarios");
                              }}
                            >
                              Diários
                            </button>

                            <button
                              type="button"
                              style={{ ...outlineButtonStyle, fontSize: 11, padding: "4px 8px" }}
                              onClick={async () => {
                                if (window.ethos?.sessions) {
                                  await window.ethos.sessions.create({ patientId: p.id, scheduledAt: new Date().toISOString(), status: "scheduled" });
                                  refreshData();
                                  setClinicalSection("agenda");
                                }
                              }}
                            >
                              Agendar Sessão
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                      sessions.map((s) => {
                        const p = patients.find((patient) => patient.id === s.patientId);
                        return (
                          <div
                            key={s.id}
                            style={{
                              background: selectedSessionId === s.id ? "#1E293B" : "#0B1120",
                              padding: 12,
                              borderRadius: 12,
                              border: "1px solid #1E293B",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setSelectedSessionId(s.id);
                              setSelectedPatientId(s.patientId);
                              setClinicalSection("sessao");
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <strong>{p?.fullName || "Paciente não encontrado"}</strong>
                                <p style={{ ...subtleText, fontSize: 12, margin: "6px 0 0 0" }}>{new Date(s.scheduledAt).toLocaleString("pt-BR")}</p>
                              </div>
                              <span style={{ fontSize: 11, color: "#A7F3D0" }}>{s.status || "scheduled"}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              {/* SESSÃO */}
              <section className={`panel ${clinicalSection === "sessao" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Sessão</h2>
                  <p style={subtleText}>
                    Sessão atual: <strong>{patientName}</strong> · {sessionDate} · ID: {sessionId}
                  </p>

                  <div style={dividerStyle} />

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" style={buttonStyle} onClick={handleOpenConsent}>
                      Consentimento
                    </button>

                    <button
                      type="button"
                      style={{ ...buttonStyle, background: isRecording ? "#EF4444" : "#22C55E" }}
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      disabled={!selectedSessionId}
                      title={!selectedSessionId ? "Selecione uma sessão" : ""}
                    >
                      {isRecording ? "Parar gravação" : "Iniciar gravação"}
                    </button>

                    <span style={{ ...subtleText, fontSize: 12 }}>Duração: {durationLabel}</span>

                    <select
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value as ModelId)}
                      style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
                    >
                      <option value="ptbr-fast">Modelo: ptbr-fast</option>
                      <option value="ptbr-accurate">Modelo: ptbr-accurate</option>
                    </select>

                    <button type="button" style={secondaryButtonStyle} onClick={handleTranscribeLast} disabled={!lastBlob}>
                      Transcrever último áudio
                    </button>
                  </div>

                  <div style={dividerStyle} />

                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <strong>Status do job</strong>
                      <p style={{ ...subtleText, marginTop: 6 }}>
                        {jobStatus} · {Math.round(jobProgress * 100)}%
                      </p>
                      {jobError ? <p style={{ color: "#FCA5A5" }}>{clamp(jobError, 240)}</p> : null}
                    </div>

                    <div>
                      <strong>Logs do worker</strong>
                      <div
                        style={{
                          marginTop: 8,
                          background: "#0B1120",
                          border: "1px solid #1E293B",
                          borderRadius: 12,
                          padding: 10,
                          maxHeight: 200,
                          overflow: "auto",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          fontSize: 11,
                          color: "#C7D2FE",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {workerLogs.length ? workerLogs.join("\n") : "Sem logs ainda."}
                      </div>
                    </div>

                    <div>
                      <strong>Texto transcrito (placeholder)</strong>
                      <textarea
                        style={{ ...inputStyle, width: "100%", minHeight: 120, marginTop: 8, fontFamily: "inherit" }}
                        value={transcriptionText}
                        onChange={(e) => setTranscriptionText(e.target.value)}
                        placeholder="Cole ou sincronize o resultado da transcrição aqui…"
                      />
                      <button
                        type="button"
                        style={{ ...buttonStyle, marginTop: 10 }}
                        onClick={() => {
                          setDraft((prev) => (prev ? prev + "\n\n" : "") + transcriptionText);
                          setClinicalSection("prontuario");
                        }}
                      >
                        Enviar para Prontuário
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* PRONTUÁRIO */}
              <section className={`panel ${clinicalSection === "prontuario" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Prontuário / Nota Clínica</h2>
                  <p style={subtleText}>
                    Sessão: <strong>{patientName}</strong> · Status: <strong>{status}</strong>{" "}
                    {validatedAt ? `· Validado em ${new Date(validatedAt).toLocaleString("pt-BR")}` : ""}
                  </p>

                  <div style={dividerStyle} />

                  <textarea
                    style={{ ...inputStyle, width: "100%", minHeight: 240, fontFamily: "inherit", fontSize: 14 }}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Escreva/edite aqui a nota clínica…"
                  />

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
                    <label style={{ display: "flex", gap: 10, alignItems: "center", color: "#E2E8F0", fontSize: 13 }}>
                      <input type="checkbox" checked={consentForNote} onChange={(e) => setConsentForNote(e.target.checked)} />
                      Tenho consentimento para registrar nota (sessão gravada)
                    </label>

                    <button
                      type="button"
                      style={{ ...buttonStyle, background: canValidate ? "#22C55E" : "#334155" }}
                      disabled={!canValidate}
                      onClick={() => setShowEthicsModal(true)}
                      title={!canValidate ? "Preencha a nota e marque consentimento para validar." : "Validar"}
                    >
                      Validar
                    </button>

                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                      style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
                    >
                      <option value="pdf">Exportar PDF</option>
                      <option value="docx">Exportar DOCX</option>
                    </select>

                    <button type="button" style={secondaryButtonStyle} onClick={doExport} disabled={exporting || !draft.trim()}>
                      {exporting ? "Exportando…" : "Exportar"}
                    </button>
                  </div>

                  <div style={dividerStyle} />

                  <div style={{ display: "grid", gap: 10 }}>
                    <strong>Metadados</strong>
                    <p style={subtleText}>Note ID: {noteId || "--"}</p>
                    <p style={subtleText}>Session ID: {selectedSessionId || "--"}</p>
                    <p style={subtleText}>Patient ID: {selectedPatientId || "--"}</p>
                  </div>
                </div>
              </section>

              {/* FINANCEIRO */}
              <section className={`panel ${clinicalSection === "financeiro" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Financeiro</h2>
                  <p style={subtleText}>Registro de cobranças e pagamentos (placeholder de UI).</p>

                  <div style={dividerStyle} />

                  <div className="grid">
                    {financialEntries.length === 0 ? (
                      <p style={subtleText}>Sem lançamentos.</p>
                    ) : (
                      financialEntries.map((e) => (
                        <div key={e.id} style={{ background: "#0B1120", border: "1px solid #1E293B", padding: 12, borderRadius: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <strong>{e.type}</strong>
                            <span style={{ fontSize: 12, color: "#A7F3D0" }}>R$ {(e.amount / 100).toFixed(2)}</span>
                          </div>
                          <p style={{ ...subtleText, fontSize: 12, marginTop: 6 }}>
                            Patient: {String(e.patientId).slice(0, 8)}… · {new Date(e.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* DIÁRIOS */}
              <section className={`panel ${clinicalSection === "diarios" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Diários / Formulários</h2>
                  <p style={subtleText}>Respostas de formulários vinculados ao paciente.</p>
                  {selectedPatientId ? (
                    <PatientDiariesView patientId={selectedPatientId} templates={formTemplates} />
                  ) : (
                    <p style={subtleText}>Selecione um paciente em “Pacientes” ou “Agenda”.</p>
                  )}
                </div>
              </section>

              {/* RELATÓRIOS */}
              <section className={`panel ${clinicalSection === "relatorios" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Relatórios</h2>
                  <p style={subtleText}>Modelos de documentos (declarações, atestados, etc.) — placeholder.</p>
                </div>
              </section>

              {/* CONFIG */}
              <section className={`panel ${clinicalSection === "config" ? "active" : ""}`}>
                <div style={sectionStyle}>
                  <h2>Configurações</h2>
                  <p style={subtleText}>Preferências locais, backup, templates e integrações.</p>

                  <div style={dividerStyle} />

                  <div style={{ display: "grid", gap: 14 }}>
                    <div>
                      <strong>Template WhatsApp</strong>
                      <p style={{ ...subtleText, fontSize: 12 }}>Texto padrão para confirmação de sessão e lembretes automáticos.</p>
                      <textarea
                        style={{ ...inputStyle, width: "100%", minHeight: 80, fontSize: 14 }}
                        value={""}
                        onChange={() => {}}
                        placeholder="(placeholder)"
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
              <button key={item.id} type="button" className={clinicalSection === item.id ? "active" : ""} onClick={() => setClinicalSection(item.id)}>
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
              <input
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                style={inputStyle}
                autoComplete="username"
              />
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
          {templates.map((t) => (
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
                  answers,
                });
                loadResponses();
              }}
            >
              + {t.title}
            </button>
          ))}
        </div>
      </div>

      {responses.length === 0 ? (
        <p style={subtleText}>Nenhuma resposta registrada ainda.</p>
      ) : (
        responses.map((r) => (
          <div key={r.id} style={{ background: "#0B1120", border: "1px solid #1E293B", padding: 12, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{r.formTitle || "Formulário"}</strong>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>{new Date(r.createdAt).toLocaleString("pt-BR")}</span>
            </div>
            <pre
              style={{
                marginTop: 8,
                whiteSpace: "pre-wrap",
                fontSize: 12,
                color: "#CBD5F5",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              {JSON.stringify(r.answers, null, 2)}
            </pre>
          </div>
        ))
      )}
    </div>
  );
}
