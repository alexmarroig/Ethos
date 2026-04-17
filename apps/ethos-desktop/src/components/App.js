"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// apps/ethos-desktop/src/components/App.tsx
const react_1 = require("react");
const exportService_1 = require("../services/exportService");
const controlPlaneAdmin_1 = require("../services/controlPlaneAdmin");
const clients_1 = require("../services/api/clients");
const useAudioRecorder_1 = require("../hooks/useAudioRecorder");
const Modals_1 = require("./Modals");
const Admin_1 = require("./Admin");
// -----------------------------
// Styles (base)
// -----------------------------
const sectionStyle = {
    borderRadius: `var(--radius)`,
    padding: 20,
    background: "hsl(var(--card))",
    color: "hsl(var(--card-foreground))",
    marginBottom: 16,
    border: "1px solid hsl(var(--border))",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
const buttonStyle = {
    padding: "10px 16px",
    borderRadius: 12,
    background: "hsl(var(--primary))",
    color: "hsl(var(--primary-foreground))",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "all 0.2s",
};
const secondaryButtonStyle = {
    ...buttonStyle,
    background: "hsl(var(--secondary))",
    color: "hsl(var(--secondary-foreground))",
};
const outlineButtonStyle = {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid hsl(var(--border))",
    background: "transparent",
    color: "hsl(var(--foreground))",
    fontWeight: 600,
    cursor: "pointer",
};
const inputStyle = {
    padding: "12px",
    borderRadius: `calc(var(--radius) - 2px)`,
    border: "1px solid hsl(var(--input))",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    outline: "none",
};
const subtleText = {
    color: "hsl(var(--muted-foreground))",
};
const dividerStyle = {
    height: 1,
    background: "hsl(var(--border))",
    margin: "14px 0",
};
const clamp = (s, max = 180) => (s.length > max ? s.slice(0, max - 1) + "…" : s);
const safeLocalStorageGet = (k, fallback = "") => {
    try {
        return localStorage.getItem(k) ?? fallback;
    }
    catch {
        return fallback;
    }
};
const safeLocalStorageSet = (k, v) => {
    try {
        localStorage.setItem(k, v);
    }
    catch { }
};
// -----------------------------
// Clinical Shell CSS (PWA-like)
// -----------------------------
const clinicalShellStyles = `
.pwa-app{
  min-height: calc(100vh - 24px);
  border-radius: var(--radius);
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  padding: 18px;
}
.pwa-header{
  display:flex; justify-content:space-between; align-items:flex-start;
  gap: 16px;
  padding: 10px 10px 16px 10px;
  border-bottom: 1px solid hsl(var(--border));
  margin-bottom: 14px;
}
.pwa-header h2{ margin: 0; font-size: 20px; font-weight: 600; font-family: 'Lora', serif; }
.pwa-header p{ margin: 6px 0 0 0; color:hsl(var(--muted-foreground)); font-size: 13px; }
.status-pill{
  font-size: 12px;
  border: 1px solid hsl(var(--border));
  padding: 6px 12px;
  border-radius: 999px;
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
  font-weight: 500;
}
.shell{
  display:grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  min-height: 60vh;
}
.nav{
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: 12px;
  background: hsl(var(--card));
  box-shadow: 0 1px 4px rgba(0,0,0,0.02);
}
.nav button{
  width:100%;
  text-align:left;
  padding: 12px;
  border-radius: calc(var(--radius) - 2px);
  border: 1px solid transparent;
  background: transparent;
  color: hsl(var(--foreground));
  cursor:pointer;
  display:flex;
  flex-direction:column;
  gap: 4px;
  margin-bottom: 8px;
  font-weight: 500;
}
.nav button span{ font-size: 12px; color:hsl(var(--muted-foreground)); font-weight: 400;}
.nav button.active{
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 0.2);
}
.content{
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--card));
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.02);
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
  border-radius: var(--radius);
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  box-shadow: 0 -4px 14px rgba(0,0,0,0.05);
}
.bottom-nav button{
  flex:1;
  padding: 12px 8px;
  border-radius: calc(var(--radius) - 2px);
  border: 1px solid hsl(var(--border));
  background: transparent;
  color:hsl(var(--foreground));
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.bottom-nav button.active{
  background: hsl(var(--primary) / 0.1);
  border-color: hsl(var(--primary) / 0.2);
  color: hsl(var(--primary));
}
`;
// -----------------------------
// Nav items
// -----------------------------
const clinicalNavItems = [
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
const App = () => {
    // =========================
    // Auth & Lifecycle
    // =========================
    const [showSplash, setShowSplash] = (0, react_1.useState)(true);
    const [user, setUser] = (0, react_1.useState)(null);
    const [loginEmail, setLoginEmail] = (0, react_1.useState)("");
    const [loginPassword, setLoginPassword] = (0, react_1.useState)("");
    const [rememberMe, setRememberMe] = (0, react_1.useState)(true);
    // =========================
    // Tabs
    // =========================
    const [tab, setTab] = (0, react_1.useState)("clinical");
    const [clinicalSection, setClinicalSection] = (0, react_1.useState)("agenda");
    // =========================
    // Real Data State
    // =========================
    const [patients, setPatients] = (0, react_1.useState)([]);
    const [sessions, setSessions] = (0, react_1.useState)([]);
    const [financialEntries, setFinancialEntries] = (0, react_1.useState)([]);
    const [selectedPatientId, setSelectedPatientId] = (0, react_1.useState)(null);
    const [selectedSessionId, setSelectedSessionId] = (0, react_1.useState)(null);
    const [formTemplates, setFormTemplates] = (0, react_1.useState)([]);
    const refreshData = (0, react_1.useCallback)(async () => {
        if (window.ethos?.patients) {
            const p = await window.ethos?.patients?.getAll();
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
    (0, react_1.useEffect)(() => {
        const initAuth = async () => {
            const savedEncrypted = safeLocalStorageGet("ethos-auth-token", "");
            if (savedEncrypted && window.ethos?.auth) {
                const decrypted = await window.ethos.auth.decryptToken(savedEncrypted);
                if (decrypted) {
                    try {
                        const parsed = JSON.parse(decrypted);
                        setUser(parsed);
                    }
                    catch { }
                }
            }
            // Artificial splash delay
            setTimeout(() => setShowSplash(false), 2500);
        };
        initAuth();
    }, []);
    (0, react_1.useEffect)(() => {
        if (user)
            refreshData();
    }, [refreshData, user]);
    // =========================
    // Session context (proto)
    // =========================
    const currentSession = (0, react_1.useMemo)(() => sessions.find((s) => s.id === selectedSessionId), [sessions, selectedSessionId]);
    const currentPatient = (0, react_1.useMemo)(() => patients.find((p) => p.id === currentSession?.patientId), [patients, currentSession]);
    const sessionId = currentSession?.id || "no-session";
    const patientName = currentPatient?.fullName || "Nenhum paciente selecionado";
    const clinicianName = "Dra. Camila Freitas";
    const sessionDate = currentSession ? new Date(currentSession.scheduledAt).toLocaleDateString("pt-BR") : "--/--/----";
    // =========================
    // Clinical note state
    // =========================
    const [consentForNote, setConsentForNote] = (0, react_1.useState)(false);
    const [noteId, setNoteId] = (0, react_1.useState)(null);
    const [draft, setDraft] = (0, react_1.useState)("");
    const [status, setStatus] = (0, react_1.useState)("draft");
    const [validatedAt, setValidatedAt] = (0, react_1.useState)(null);
    const [showEthicsModal, setShowEthicsModal] = (0, react_1.useState)(false);
    const [showPatientModal, setShowPatientModal] = (0, react_1.useState)(false);
    const [editingPatient, setEditingPatient] = (0, react_1.useState)(null);
    const loadNote = (0, react_1.useCallback)(async () => {
        if (selectedSessionId && window.ethos?.notes) {
            const note = await window.ethos.notes.getBySession(selectedSessionId);
            if (note) {
                setNoteId(note.id);
                setDraft(note.editedText || note.generatedText || "");
                setStatus(note.status);
                setValidatedAt(note.validatedAt || null);
            }
            else {
                setNoteId(null);
                setDraft("");
                setStatus("draft");
                setValidatedAt(null);
            }
        }
        else {
            setNoteId(null);
            setDraft("");
            setStatus("draft");
            setValidatedAt(null);
        }
    }, [selectedSessionId]);
    (0, react_1.useEffect)(() => {
        loadNote();
    }, [loadNote]);
    const canValidate = (0, react_1.useMemo)(() => {
        if (!draft.trim())
            return false;
        if (!consentForNote)
            return false;
        if (status === "validated")
            return false;
        return true;
    }, [draft, consentForNote, status]);
    const confirmValidation = (0, react_1.useCallback)(async () => {
        if (!selectedSessionId || !window.ethos?.notes)
            return;
        await window.ethos.notes.validate(selectedSessionId);
        await loadNote();
        setShowEthicsModal(false);
    }, [selectedSessionId, loadNote]);
    // =========================
    // Transcription (worker bridge)
    // =========================
    const [workerLogs, setWorkerLogs] = (0, react_1.useState)([]);
    const [jobStatus, setJobStatus] = (0, react_1.useState)("idle");
    const [jobProgress, setJobProgress] = (0, react_1.useState)(0);
    const [jobError, setJobError] = (0, react_1.useState)(null);
    const [modelId, setModelId] = (0, react_1.useState)("ptbr-fast");
    const [transcriptionText, setTranscriptionText] = (0, react_1.useState)("");
    const appendLog = (0, react_1.useCallback)((line) => {
        setWorkerLogs((prev) => {
            const next = [...prev, line];
            return next.slice(-200);
        });
    }, []);
    (0, react_1.useEffect)(() => {
        if (!window.ethos?.transcription?.onMessage)
            return;
        const unsubscribe = window.ethos.transcription.onMessage((m) => {
            const msg = m;
            if (!msg || !msg.type)
                return;
            if (msg.type === "worker_log") {
                appendLog(String(msg.payload?.line || ""));
            }
            if (msg.type === "job_update") {
                const payload = msg.payload || {};
                setJobStatus(String(payload.status || "unknown"));
                setJobProgress(typeof payload.progress === "number" ? payload.progress : 0);
                setJobError(payload.error ? String(payload.error) : null);
            }
            if (msg.type === "job_result") {
                const payload = msg.payload;
                if (payload?.transcript?.fullText) {
                    setTranscriptionText(payload.transcript.fullText);
                }
            }
        });
        const unsubscribeErr = window.ethos.transcription.onError((err) => {
            appendLog("Worker error: " + err);
            setJobError(err);
        });
        return () => {
            try {
                unsubscribe?.();
                unsubscribeErr?.();
            }
            catch { }
        };
    }, [appendLog]);
    // =========================
    // Audio Recorder (hook)
    // =========================
    const { status: recorderStatus, elapsedLabel: durationLabel, startRecording, stopRecording, audioUrl: lastAudioUrl, } = (0, useAudioRecorder_1.useAudioRecorder)({ sessionId });
    const isRecording = recorderStatus === "recording";
    // =========================
    // Modals
    // =========================
    const [showConsentModal, setShowConsentModal] = (0, react_1.useState)(false);
    // =========================
    // Admin plane (improved with safe persistence + derived status label)
    // =========================
    const defaultControlPlaneUrl = clients_1.CONTROL_API_BASE_URL;
    // NEW: persist URL + email (from additional) using safe localStorage
    const [adminBaseUrl, setAdminBaseUrl] = (0, react_1.useState)(() => safeLocalStorageGet("ethos-control-plane-url", defaultControlPlaneUrl));
    const [adminEmail, setAdminEmail] = (0, react_1.useState)(() => safeLocalStorageGet("ethos-admin-email", ""));
    const [adminPassword, setAdminPassword] = (0, react_1.useState)("");
    const [rememberSession, setRememberSession] = (0, react_1.useState)(true);
    const [adminToken, setAdminToken] = (0, react_1.useState)(null);
    const [adminRole, setAdminRole] = (0, react_1.useState)("unknown");
    const [adminMetrics, setAdminMetrics] = (0, react_1.useState)(null);
    const [adminUsers, setAdminUsers] = (0, react_1.useState)([]);
    const [adminLoading, setAdminLoading] = (0, react_1.useState)(false);
    const [adminError, setAdminError] = (0, react_1.useState)(null);
    const hasAdminToken = Boolean(adminToken);
    const isAdmin = adminRole === "admin";
    // NEW: derived status label (from additional) – avoids state drift
    const adminStatusLabel = (0, react_1.useMemo)(() => {
        if (!hasAdminToken)
            return "Sem sessão ativa.";
        if (adminLoading)
            return "Sincronizando dados administrativos…";
        if (isAdmin)
            return "Acesso administrativo confirmado.";
        if (adminRole === "user")
            return "Sessão válida sem permissão admin.";
        return "Sessão precisa de validação.";
    }, [adminLoading, adminRole, hasAdminToken, isAdmin]);
    // Load stored token/role (original behavior)
    (0, react_1.useEffect)(() => {
        const stored = safeLocalStorageGet("ethos-admin-token", "");
        const storedRole = safeLocalStorageGet("ethos-admin-role", "");
        if (stored)
            setAdminToken(stored);
        if (storedRole === "admin" || storedRole === "user")
            setAdminRole(storedRole);
    }, []);
    // NEW: persist URL/email immediately (safe)
    (0, react_1.useEffect)(() => {
        safeLocalStorageSet("ethos-control-plane-url", adminBaseUrl);
    }, [adminBaseUrl]);
    (0, react_1.useEffect)(() => {
        safeLocalStorageSet("ethos-admin-email", adminEmail);
    }, [adminEmail]);
    (0, react_1.useEffect)(() => {
        const onSessionInvalid = (event) => {
            const detail = event.detail;
            setAdminToken(null);
            setAdminRole("unknown");
            setAdminMetrics(null);
            setAdminUsers([]);
            safeLocalStorageSet("ethos-admin-token", "");
            safeLocalStorageSet("ethos-admin-role", "");
            setAdminError(detail?.reason === "forbidden"
                ? "Sessão sem permissão para acessar este recurso."
                : "Sessão expirada. Faça login novamente.");
        };
        window.addEventListener("ethos:session-invalid", onSessionInvalid);
        return () => window.removeEventListener("ethos:session-invalid", onSessionInvalid);
    }, []);
    // refresh admin data (NEW: Promise.all from additional)
    const refreshAdminData = (0, react_1.useCallback)(async () => {
        if (!adminToken)
            return;
        setAdminLoading(true);
        setAdminError(null);
        try {
            const [overview, users] = await Promise.all([
                (0, controlPlaneAdmin_1.fetchAdminOverview)(adminBaseUrl, adminToken),
                (0, controlPlaneAdmin_1.fetchAdminUsers)(adminBaseUrl, adminToken),
            ]);
            setAdminMetrics(overview);
            setAdminUsers(users);
            // NOTE: we do NOT set role=admin here. Role should come from login or server claims.
        }
        catch (e) {
            const message = e?.message || "Erro ao atualizar admin";
            setAdminError(message);
            // If backend returns forbidden and you want the UI to reflect it:
            if (String(message).toLowerCase().includes("forbidden")) {
                setAdminRole("user");
            }
            setAdminMetrics(null);
            setAdminUsers([]);
        }
        finally {
            setAdminLoading(false);
        }
    }, [adminBaseUrl, adminToken]);
    // NEW: auto-refresh when token/baseUrl change (from additional idea)
    (0, react_1.useEffect)(() => {
        if (!adminToken)
            return;
        void refreshAdminData();
    }, [adminToken, adminBaseUrl, refreshAdminData]);
    const handleAdminLogin = (0, react_1.useCallback)(async (e) => {
        e.preventDefault();
        setAdminLoading(true);
        setAdminError(null);
        try {
            // keep ORIGINAL signature
            const result = await (0, controlPlaneAdmin_1.loginControlPlane)(adminBaseUrl, { email: adminEmail, password: adminPassword });
            setAdminToken(result.token);
            setAdminRole(result.role);
            setAdminPassword("");
            if (rememberSession) {
                safeLocalStorageSet("ethos-admin-token", result.token);
                safeLocalStorageSet("ethos-admin-role", result.role);
            }
            await refreshAdminData();
        }
        catch (err) {
            setAdminError(err?.message || "Erro de login");
            setAdminRole("unknown");
        }
        finally {
            setAdminLoading(false);
        }
    }, [adminBaseUrl, adminEmail, adminPassword, rememberSession, refreshAdminData]);
    const handleAdminLogout = (0, react_1.useCallback)(() => {
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
    const [exportFormat, setExportFormat] = (0, react_1.useState)("pdf");
    const [exporting, setExporting] = (0, react_1.useState)(false);
    const loggingOut = (0, react_1.useRef)(false);
    const doExport = (0, react_1.useCallback)(async () => {
        setExporting(true);
        try {
            await (0, exportService_1.exportClinicalNote)({
                patientName,
                clinicianName,
                sessionDate,
                noteText: draft,
                status,
                validatedAt: validatedAt ?? undefined,
            }, exportFormat);
        }
        finally {
            setExporting(false);
        }
    }, [patientName, clinicianName, sessionDate, draft, status, validatedAt, exportFormat]);
    // =========================
    // Auth actions
    // =========================
    const handleLogin = (0, react_1.useCallback)(async (e) => {
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
            }
            else {
                safeLocalStorageSet("ethos-auth-token", "");
            }
            await refreshData();
        }
        catch (err) {
            alert(err?.message || "Erro ao logar");
        }
    }, [loginEmail, loginPassword, rememberMe, refreshData]);
    const handleLogout = (0, react_1.useCallback)(async () => {
        if (loggingOut.current)
            return;
        loggingOut.current = true;
        setUser(null);
        safeLocalStorageSet("ethos-auth-token", "");
        try {
            await window.ethos?.auth?.logout?.();
        }
        catch { }
        finally {
            loggingOut.current = false;
        }
    }, []);
    // =========================
    // Session actions
    // =========================
    const handleOpenConsent = (0, react_1.useCallback)(() => setShowConsentModal(true), []);
    const handleConsentConfirm = (0, react_1.useCallback)(() => {
        setConsentForNote(true);
        setShowConsentModal(false);
    }, []);
    const handleConsentCancel = (0, react_1.useCallback)(() => {
        setConsentForNote(false);
        setShowConsentModal(false);
    }, []);
    const handleStartRecording = (0, react_1.useCallback)(async () => {
        if (!selectedSessionId) {
            alert("Selecione uma sessão antes de gravar.");
            return;
        }
        await startRecording();
    }, [selectedSessionId, startRecording]);
    const handleStopRecording = (0, react_1.useCallback)(async () => {
        await stopRecording();
    }, [stopRecording]);
    const handleTranscribeLast = (0, react_1.useCallback)(async () => {
        if (!lastAudioUrl) {
            alert("Nenhum áudio gravado ainda.");
            return;
        }
        if (!window.ethos?.transcription?.enqueue) {
            alert("Bridge de transcrição não disponível.");
            return;
        }
        alert("A transcrição automática após salvar já está em fila ou use a busca local.");
        // No desktop real, o audioService.saveEncrypted já foi chamado pelo hook.
        // O ideal aqui é disparar a transcrição do arquivo já salvo se quiser manual.
    }, [lastAudioUrl]);
    // =========================
    // UI
    // =========================
    if (showSplash) {
        return ((0, jsx_runtime_1.jsx)("div", { style: { minHeight: "100vh", display: "grid", placeItems: "center", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }, children: (0, jsx_runtime_1.jsxs)("div", { style: { textAlign: "center", maxWidth: 520, padding: 20 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 42, fontWeight: 900, letterSpacing: 2 }, children: "ETHOS" }), (0, jsx_runtime_1.jsx)("p", { style: { ...subtleText, marginTop: 10 }, children: "Plataforma cl\u00EDnica offline-first \u00B7 Inicializando m\u00F3dulos\u2026" }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }, children: [(0, jsx_runtime_1.jsx)("div", { style: { width: 10, height: 10, borderRadius: 99, background: "hsl(var(--primary))" } }), (0, jsx_runtime_1.jsx)("div", { style: { width: 10, height: 10, borderRadius: 99, background: "hsl(var(--muted))" } }), (0, jsx_runtime_1.jsx)("div", { style: { width: 10, height: 10, borderRadius: 99, background: "hsl(var(--muted))" } })] })] }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 12, background: "hsl(var(--background))", minHeight: "100vh", color: "hsl(var(--foreground))" }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 10, alignItems: "baseline" }, children: [(0, jsx_runtime_1.jsx)("h1", { style: { margin: 0, fontSize: 22, letterSpacing: 1 }, children: "ETHOS" }), (0, jsx_runtime_1.jsx)("span", { style: { ...subtleText, fontSize: 12 }, children: "Desktop \u00B7 Offline-first" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", style: { ...outlineButtonStyle, borderColor: tab === "clinical" ? "hsl(var(--primary))" : "hsl(var(--border))" }, onClick: () => setTab("clinical"), children: "Cl\u00EDnica" }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: { ...outlineButtonStyle, borderColor: tab === "admin" ? "hsl(var(--primary))" : "hsl(var(--border))" }, onClick: () => setTab("admin"), children: "Admin" }), (0, jsx_runtime_1.jsx)("div", { style: { width: 1, height: 24, background: "hsl(var(--border))" } }), user ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, color: "#A7F3D0" }, children: "Logado" }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: secondaryButtonStyle, onClick: handleLogout, children: "Sair" })] })) : ((0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, color: "#FBBF24" }, children: "N\u00E3o logado" }))] })] }), !user ? ((0, jsx_runtime_1.jsxs)("section", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { style: { marginTop: 0 }, children: "Login" }), (0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Autentica\u00E7\u00E3o local (placeholder). No Electron, isso pode virar PIN + biometria." }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleLogin, style: { display: "grid", gap: 12, maxWidth: 520 }, children: [(0, jsx_runtime_1.jsx)("input", { style: inputStyle, placeholder: "Email", value: loginEmail, onChange: (e) => setLoginEmail(e.target.value), autoComplete: "username" }), (0, jsx_runtime_1.jsx)("input", { style: inputStyle, placeholder: "Senha", type: "password", value: loginPassword, onChange: (e) => setLoginPassword(e.target.value), autoComplete: "current-password" }), (0, jsx_runtime_1.jsxs)("label", { style: { display: "flex", gap: 10, alignItems: "center", color: "hsl(var(--foreground))", fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: rememberMe, onChange: (e) => setRememberMe(e.target.checked) }), "Lembrar-me (salva token criptografado localmente)"] }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: (0, jsx_runtime_1.jsx)("button", { style: buttonStyle, type: "submit", children: "Entrar" }) })] })] })) : null, showConsentModal ? ((0, jsx_runtime_1.jsx)(Modals_1.RecordingConsentModal, { checked: consentForNote, onCheck: setConsentForNote, onCancel: handleConsentCancel, onConfirm: handleConsentConfirm })) : null, showEthicsModal ? (0, jsx_runtime_1.jsx)(Modals_1.EthicsValidationModal, { onCancel: () => setShowEthicsModal(false), onConfirm: confirmValidation }) : null, showPatientModal ? ((0, jsx_runtime_1.jsx)(Modals_1.PatientModal, { patient: editingPatient, onCancel: () => {
                    setShowPatientModal(false);
                    setEditingPatient(null);
                }, onSave: async (data) => {
                    if (editingPatient) {
                        await window.ethos.patients.update(editingPatient.id, data);
                    }
                    else {
                        await window.ethos.patients.create(data);
                    }
                    refreshData();
                    setShowPatientModal(false);
                    setEditingPatient(null);
                } })) : null, tab === "clinical" ? ((0, jsx_runtime_1.jsxs)("div", { className: "pwa-app", children: [(0, jsx_runtime_1.jsx)("style", { children: clinicalShellStyles }), (0, jsx_runtime_1.jsxs)("div", { className: "pwa-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "PWA Cl\u00EDnica" }), (0, jsx_runtime_1.jsx)("p", { children: "Experi\u00EAncia mobile-first com navega\u00E7\u00E3o r\u00E1pida e suporte offline." })] }), (0, jsx_runtime_1.jsx)("div", { className: "status-pill", children: "Modo offline pronto \u00B7 \u00DAltima sincroniza\u00E7\u00E3o: 09:24" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "shell", children: [(0, jsx_runtime_1.jsx)("nav", { className: "nav", "aria-label": "Navega\u00E7\u00E3o cl\u00EDnica", children: clinicalNavItems.map((item) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: clinicalSection === item.id ? "active" : "", onClick: () => setClinicalSection(item.id), children: [item.label, (0, jsx_runtime_1.jsx)("span", { children: item.helper })] }, item.id))) }), (0, jsx_runtime_1.jsxs)("main", { className: "content", children: [(0, jsx_runtime_1.jsxs)("section", { className: `panel ${clinicalSection === "login" ? "active" : ""}`, children: [(0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Login r\u00E1pido" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#CBD5F5" }, children: "Autentica\u00E7\u00E3o segura com PIN local e biometria." }), (0, jsx_runtime_1.jsxs)("div", { className: "grid", style: { marginTop: 16 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { color: "#CBD5F5" }, children: ["Email", (0, jsx_runtime_1.jsx)("input", { className: "input", style: inputStyle, type: "email", placeholder: "nome@clinica.com" })] }), (0, jsx_runtime_1.jsxs)("label", { style: { color: "#CBD5F5" }, children: ["PIN", (0, jsx_runtime_1.jsx)("input", { className: "input", style: inputStyle, type: "password", placeholder: "\u2022\u2022\u2022\u2022" })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }, children: [(0, jsx_runtime_1.jsx)("button", { style: buttonStyle, type: "button", children: "Entrar" }), (0, jsx_runtime_1.jsx)("button", { style: { ...buttonStyle, background: "#334155" }, type: "button", children: "Usar biometria" })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Sincroniza\u00E7\u00E3o inteligente" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#94A3B8" }, children: "Controlamos uploads apenas quando o Wi-Fi seguro est\u00E1 dispon\u00EDvel." }), (0, jsx_runtime_1.jsxs)("div", { className: "grid", style: { marginTop: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Fila local" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#CBD5F5" }, children: "3 sess\u00F5es aguardando envio" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Criptografia" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#CBD5F5" }, children: "AES-256 ativo" })] })] })] })] }), (0, jsx_runtime_1.jsx)("section", { className: `panel ${clinicalSection === "pacientes" ? "active" : ""}`, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Gest\u00E3o de Pacientes" }), (0, jsx_runtime_1.jsx)("button", { style: { ...buttonStyle, marginBottom: 16 }, type: "button", onClick: () => {
                                                        setEditingPatient(null);
                                                        setShowPatientModal(true);
                                                    }, children: "+ Novo Paciente" }), (0, jsx_runtime_1.jsx)("div", { className: "grid", children: patients.map((p) => {
                                                        const entries = financialEntries.filter((e) => e.patientId === p.id);
                                                        const balance = entries.reduce((acc, e) => (e.type === "payment" ? acc - e.amount : acc + e.amount), 0);
                                                        return ((0, jsx_runtime_1.jsxs)("div", { style: {
                                                                background: "#0B1120",
                                                                padding: 12,
                                                                borderRadius: 12,
                                                                border: "1px solid #1E293B",
                                                            }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { style: { display: "block", marginBottom: 4 }, children: p.fullName }), p.phoneNumber ? (0, jsx_runtime_1.jsx)("p", { style: { color: "#CBD5F5", fontSize: 12, marginBottom: 4 }, children: p.phoneNumber }) : null, p.address ? (0, jsx_runtime_1.jsx)("p", { style: { color: "#94A3B8", fontSize: 11, marginBottom: 4 }, children: p.address }) : null] }), (0, jsx_runtime_1.jsxs)("div", { style: { textAlign: "right" }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 10, color: "#64748B" }, children: ["CPF: ", p.cpf || "--"] }), (0, jsx_runtime_1.jsxs)("p", { style: { ...subtleText, fontSize: 11, marginTop: 6 }, children: ["ID: ", String(p.id).slice(0, 8), "..."] })] })] }), balance > 0 ? ((0, jsx_runtime_1.jsxs)("p", { style: { color: "#FCA5A5", fontSize: 12, fontWeight: 600, marginTop: 6 }, children: ["D\u00E9bito: R$ ", (balance / 100).toFixed(2)] })) : balance < 0 ? ((0, jsx_runtime_1.jsxs)("p", { style: { color: "#10B981", fontSize: 12, fontWeight: 600, marginTop: 6 }, children: ["Cr\u00E9dito: R$ ", (-balance / 100).toFixed(2)] })) : null, (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", style: { ...outlineButtonStyle, fontSize: 11, padding: "4px 8px" }, onClick: () => {
                                                                                setEditingPatient(p);
                                                                                setShowPatientModal(true);
                                                                                setSelectedPatientId(p.id);
                                                                            }, children: "Ficha Completa" }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: { ...outlineButtonStyle, fontSize: 11, padding: "4px 8px" }, onClick: () => {
                                                                                setSelectedPatientId(p.id);
                                                                                setClinicalSection("diarios");
                                                                            }, children: "Di\u00E1rios" }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: { ...outlineButtonStyle, fontSize: 11, padding: "4px 8px" }, onClick: async () => {
                                                                                if (window.ethos?.sessions) {
                                                                                    await window.ethos.sessions.create({ patientId: p.id, scheduledAt: new Date().toISOString(), status: "scheduled" });
                                                                                    refreshData();
                                                                                    setClinicalSection("agenda");
                                                                                }
                                                                            }, children: "Agendar Sess\u00E3o" })] })] }, p.id));
                                                    }) })] }) }), (0, jsx_runtime_1.jsx)("section", { className: `panel ${clinicalSection === "agenda" ? "active" : ""}`, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Agenda / Sess\u00F5es" }), (0, jsx_runtime_1.jsx)("div", { className: "grid", style: { marginTop: 12 }, children: sessions.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Nenhuma sess\u00E3o agendada." })) : (sessions.map((s) => {
                                                        const p = patients.find((patient) => patient.id === s.patientId);
                                                        return ((0, jsx_runtime_1.jsx)("div", { style: {
                                                                background: selectedSessionId === s.id ? "hsl(var(--accent))" : "hsl(var(--card))",
                                                                padding: 16,
                                                                borderRadius: `var(--radius)`,
                                                                border: "1px solid hsl(var(--border))",
                                                                borderLeft: `6px solid ${s.status === 'validated' ? 'hsl(var(--status-validated))' : 'hsl(var(--status-pending))'}`,
                                                                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                                                cursor: "pointer",
                                                            }, onClick: () => {
                                                                setSelectedSessionId(s.id);
                                                                setSelectedPatientId(s.patientId);
                                                                setClinicalSection("sessao");
                                                            }, children: (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { style: { color: "hsl(var(--foreground))" }, children: p?.fullName || "Paciente não encontrado" }), (0, jsx_runtime_1.jsx)("p", { style: { ...subtleText, fontSize: 13, margin: "6px 0 0 0" }, children: new Date(s.scheduledAt).toLocaleString("pt-BR") })] }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, fontWeight: 600, color: s.status === 'validated' ? "hsl(var(--status-validated))" : "hsl(var(--status-pending))" }, children: s.status || "scheduled" })] }) }, s.id));
                                                    })) })] }) }), (0, jsx_runtime_1.jsx)("section", { className: `panel ${clinicalSection === "sessao" ? "active" : ""}`, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Sess\u00E3o" }), (0, jsx_runtime_1.jsxs)("p", { style: subtleText, children: ["Sess\u00E3o atual: ", (0, jsx_runtime_1.jsx)("strong", { children: patientName }), " \u00B7 ", sessionDate, " \u00B7 ID: ", sessionId] }), (0, jsx_runtime_1.jsx)("div", { style: dividerStyle }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", style: buttonStyle, onClick: handleOpenConsent, children: "Consentimento" }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: { ...buttonStyle, background: isRecording ? "#EF4444" : "#22C55E" }, onClick: isRecording ? handleStopRecording : handleStartRecording, disabled: !selectedSessionId, title: !selectedSessionId ? "Selecione uma sessão" : "", children: isRecording ? "Parar gravação" : "Iniciar gravação" }), (0, jsx_runtime_1.jsxs)("span", { style: { ...subtleText, fontSize: 12 }, children: ["Dura\u00E7\u00E3o: ", durationLabel] }), (0, jsx_runtime_1.jsxs)("select", { value: modelId, onChange: (e) => setModelId(e.target.value), style: { ...inputStyle, padding: "8px 10px", fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "ptbr-fast", children: "Modelo: ptbr-fast" }), (0, jsx_runtime_1.jsx)("option", { value: "ptbr-accurate", children: "Modelo: ptbr-accurate" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: secondaryButtonStyle, onClick: handleTranscribeLast, disabled: !lastAudioUrl, children: "Transcrever \u00FAltimo \u00E1udio" })] }), (0, jsx_runtime_1.jsx)("div", { style: dividerStyle }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Status do job" }), (0, jsx_runtime_1.jsxs)("p", { style: { ...subtleText, marginTop: 6 }, children: [jobStatus, " \u00B7 ", Math.round(jobProgress * 100), "%"] }), jobError ? (0, jsx_runtime_1.jsx)("p", { style: { color: "#FCA5A5" }, children: clamp(jobError, 240) }) : null] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Logs do worker" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                                                        marginTop: 8,
                                                                        background: "hsl(var(--background))",
                                                                        border: "1px solid hsl(var(--border))",
                                                                        borderRadius: `calc(var(--radius) - 2px)`,
                                                                        padding: 12,
                                                                        maxHeight: 200,
                                                                        overflow: "auto",
                                                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                                                        fontSize: 12,
                                                                        color: "hsl(var(--muted-foreground))",
                                                                        whiteSpace: "pre-wrap",
                                                                    }, children: workerLogs.length ? workerLogs.join("\n") : "Sem logs ainda." })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Texto transcrito (placeholder)" }), (0, jsx_runtime_1.jsx)("textarea", { style: { ...inputStyle, width: "100%", minHeight: 120, marginTop: 8, fontFamily: "inherit" }, value: transcriptionText, onChange: (e) => setTranscriptionText(e.target.value), placeholder: "Cole ou sincronize o resultado da transcri\u00E7\u00E3o aqui\u2026" }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: { ...buttonStyle, marginTop: 10 }, onClick: () => {
                                                                        setDraft((prev) => (prev ? prev + "\n\n" : "") + transcriptionText);
                                                                        setClinicalSection("prontuario");
                                                                    }, children: "Enviar para Prontu\u00E1rio" })] })] })] }) }), (0, jsx_runtime_1.jsx)("section", { className: `panel ${clinicalSection === "prontuario" ? "active" : ""}`, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Prontu\u00E1rio / Nota Cl\u00EDnica" }), (0, jsx_runtime_1.jsxs)("p", { style: subtleText, children: ["Sess\u00E3o: ", (0, jsx_runtime_1.jsx)("strong", { children: patientName }), " \u00B7 Status: ", (0, jsx_runtime_1.jsx)("strong", { children: status }), " ", validatedAt ? `· Validado em ${new Date(validatedAt).toLocaleString("pt-BR")}` : ""] }), (0, jsx_runtime_1.jsx)("div", { style: dividerStyle }), (0, jsx_runtime_1.jsx)("textarea", { style: { ...inputStyle, width: "100%", minHeight: 240, fontFamily: "inherit", fontSize: 14 }, value: draft, onChange: (e) => setDraft(e.target.value), placeholder: "Escreva/edite aqui a nota cl\u00EDnica\u2026" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { display: "flex", gap: 10, alignItems: "center", color: "#E2E8F0", fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: consentForNote, onChange: (e) => setConsentForNote(e.target.checked) }), "Tenho consentimento para registrar nota (sess\u00E3o gravada)"] }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: { ...buttonStyle, background: canValidate ? "#22C55E" : "#334155" }, disabled: !canValidate, onClick: () => setShowEthicsModal(true), title: !canValidate ? "Preencha a nota e marque consentimento para validar." : "Validar", children: "Validar" }), (0, jsx_runtime_1.jsxs)("select", { value: exportFormat, onChange: (e) => setExportFormat(e.target.value), style: { ...inputStyle, padding: "8px 10px", fontSize: 13 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "pdf", children: "Exportar PDF" }), (0, jsx_runtime_1.jsx)("option", { value: "docx", children: "Exportar DOCX" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: secondaryButtonStyle, onClick: doExport, disabled: exporting || !draft.trim(), children: exporting ? "Exportando…" : "Exportar" })] }), (0, jsx_runtime_1.jsx)("div", { style: dividerStyle }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gap: 10 }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Metadados" }), (0, jsx_runtime_1.jsxs)("p", { style: subtleText, children: ["Note ID: ", noteId || "--"] }), (0, jsx_runtime_1.jsxs)("p", { style: subtleText, children: ["Session ID: ", selectedSessionId || "--"] }), (0, jsx_runtime_1.jsxs)("p", { style: subtleText, children: ["Patient ID: ", selectedPatientId || "--"] })] })] }) }), (0, jsx_runtime_1.jsx)("section", { className: `panel ${clinicalSection === "financeiro" ? "active" : ""}`, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Financeiro" }), (0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Registro de cobran\u00E7as e pagamentos (placeholder de UI)." }), (0, jsx_runtime_1.jsx)("div", { style: dividerStyle }), (0, jsx_runtime_1.jsx)("div", { className: "grid", children: financialEntries.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Sem lan\u00E7amentos." })) : (financialEntries.map((e) => ((0, jsx_runtime_1.jsxs)("div", { style: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: 16, borderRadius: `var(--radius)` }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", justifyContent: "space-between" }, children: [(0, jsx_runtime_1.jsx)("strong", { style: { color: "hsl(var(--foreground))" }, children: e.type }), (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 13, fontWeight: 600, color: "hsl(var(--status-validated))" }, children: ["R$ ", (e.amount / 100).toFixed(2)] })] }), (0, jsx_runtime_1.jsxs)("p", { style: { ...subtleText, fontSize: 13, marginTop: 6 }, children: ["Patient: ", String(e.patientId).slice(0, 8), "\u2026 \u00B7 ", new Date(e.createdAt).toLocaleString("pt-BR")] })] }, e.id)))) })] }) }), (0, jsx_runtime_1.jsx)("section", { className: `panel ${clinicalSection === "diarios" ? "active" : ""}`, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Di\u00E1rios / Formul\u00E1rios" }), (0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Respostas de formul\u00E1rios vinculados ao paciente." }), selectedPatientId ? ((0, jsx_runtime_1.jsx)(PatientDiariesView, { patientId: selectedPatientId, templates: formTemplates })) : ((0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Selecione um paciente em \u201CPacientes\u201D ou \u201CAgenda\u201D." }))] }) }), (0, jsx_runtime_1.jsx)("section", { className: `panel ${clinicalSection === "relatorios" ? "active" : ""}`, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Relat\u00F3rios" }), (0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Modelos de documentos (declara\u00E7\u00F5es, atestados, etc.) \u2014 placeholder." })] }) }), (0, jsx_runtime_1.jsx)("section", { className: `panel ${clinicalSection === "config" ? "active" : ""}`, children: (0, jsx_runtime_1.jsxs)("div", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Configura\u00E7\u00F5es" }), (0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Prefer\u00EAncias locais, backup, templates e integra\u00E7\u00F5es." }), (0, jsx_runtime_1.jsx)("div", { style: dividerStyle }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gap: 14 }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Template WhatsApp" }), (0, jsx_runtime_1.jsx)("p", { style: { ...subtleText, fontSize: 12 }, children: "Texto padr\u00E3o para confirma\u00E7\u00E3o de sess\u00E3o e lembretes autom\u00E1ticos." }), (0, jsx_runtime_1.jsx)("textarea", { style: { ...inputStyle, width: "100%", minHeight: 80, fontSize: 14 }, value: "", onChange: () => { }, placeholder: "(placeholder)" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { borderTop: "1px solid #1E293B", paddingTop: 16 }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Backup Local" }), (0, jsx_runtime_1.jsx)("p", { style: { ...subtleText, fontSize: 14, marginBottom: 8 }, children: "Cria uma c\u00F3pia criptografada do banco de dados." }), (0, jsx_runtime_1.jsx)("button", { style: buttonStyle, onClick: async () => {
                                                                        const pwd = prompt("Defina uma senha para o arquivo de backup:");
                                                                        if (pwd && window.ethos?.backup) {
                                                                            const ok = await window.ethos.backup.create(pwd);
                                                                            if (ok)
                                                                                alert("Backup concluído com sucesso!");
                                                                        }
                                                                    }, children: "Criar Backup" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { borderTop: "1px solid #1E293B", paddingTop: 16 }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Restaurar Backup" }), (0, jsx_runtime_1.jsx)("p", { style: { ...subtleText, fontSize: 14, marginBottom: 8 }, children: "Substitui o banco de dados atual por um backup." }), (0, jsx_runtime_1.jsx)("button", { style: secondaryButtonStyle, onClick: async () => {
                                                                        const pwd = prompt("Digite a senha do arquivo de backup:");
                                                                        if (pwd && window.ethos?.backup) {
                                                                            const ok = await window.ethos.backup.restore(pwd);
                                                                            if (ok)
                                                                                alert("Restauração concluída! Reinicie o aplicativo.");
                                                                        }
                                                                    }, children: "Restaurar Backup" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { borderTop: "1px solid #1E293B", paddingTop: 16 }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Limpeza de Dados (Purge)" }), (0, jsx_runtime_1.jsx)("p", { style: { ...subtleText, fontSize: 14, marginBottom: 8 }, children: "Apaga todos os dados locais permanentemente." }), (0, jsx_runtime_1.jsx)("button", { style: { ...buttonStyle, background: "#EF4444" }, onClick: async () => {
                                                                        if (confirm("TEM CERTEZA? Isso apagará todos os pacientes, sessões e áudios.") && window.ethos?.privacy) {
                                                                            await window.ethos.privacy.purgeAll();
                                                                            refreshData();
                                                                            alert("Todos os dados foram apagados.");
                                                                        }
                                                                    }, children: "Apagar Tudo" })] })] })] }) })] })] }), (0, jsx_runtime_1.jsx)("nav", { className: "bottom-nav", "aria-label": "Navega\u00E7\u00E3o cl\u00EDnica m\u00F3vel", children: clinicalNavItems.map((item) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: clinicalSection === item.id ? "active" : "", onClick: () => setClinicalSection(item.id), children: item.label }, item.id))) })] })) : null, tab === "admin" ? ((0, jsx_runtime_1.jsxs)("section", { style: sectionStyle, children: [(0, jsx_runtime_1.jsx)("h2", { children: "Admin \u2014 Control Plane" }), (0, jsx_runtime_1.jsx)("p", { style: { ...subtleText, marginBottom: 12 }, children: "Painel restrito \u00E0 role=admin. Exibe apenas m\u00E9tricas agregadas e usu\u00E1rios sanitizados (sem conte\u00FAdo cl\u00EDnico)." }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleAdminLogin, style: { display: "grid", gap: 12, marginBottom: 16 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { color: "#E2E8F0" }, children: "URL do control plane" }), (0, jsx_runtime_1.jsx)("input", { value: adminBaseUrl, onChange: (event) => setAdminBaseUrl(event.target.value), style: inputStyle })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { color: "#E2E8F0" }, children: "Email" }), (0, jsx_runtime_1.jsx)("input", { value: adminEmail, onChange: (event) => setAdminEmail(event.target.value), style: inputStyle, autoComplete: "username" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { color: "#E2E8F0" }, children: "Senha" }), (0, jsx_runtime_1.jsx)("input", { type: "password", value: adminPassword, onChange: (event) => setAdminPassword(event.target.value), style: inputStyle, autoComplete: "current-password" })] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: "flex", gap: 10, alignItems: "center", color: "#E2E8F0" }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: rememberSession, onChange: (e) => setRememberSession(e.target.checked) }), "Lembrar sess\u00E3o neste dispositivo (salva token localmente)"] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" }, children: [(0, jsx_runtime_1.jsx)("button", { style: { ...buttonStyle, background: "#22C55E" }, disabled: adminLoading, children: "Entrar" }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: { ...buttonStyle, background: "#475569" }, onClick: handleAdminLogout, children: "Encerrar sess\u00E3o" }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: {
                                            ...buttonStyle,
                                            background: hasAdminToken ? "#6366F1" : "#334155",
                                            cursor: hasAdminToken ? "pointer" : "not-allowed",
                                        }, onClick: () => void refreshAdminData(), disabled: !hasAdminToken || adminLoading, title: !hasAdminToken ? "Faça login primeiro" : "Atualizar", children: adminLoading ? "Atualizando..." : "Atualizar dados" })] })] }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#CBD5F5", marginBottom: 8 }, children: adminStatusLabel }), adminError ? (0, jsx_runtime_1.jsx)("p", { style: { color: "#FCA5A5" }, children: clamp(adminError, 240) }) : null, isAdmin ? ((0, jsx_runtime_1.jsx)(Admin_1.AdminPanel, { metrics: adminMetrics, users: adminUsers })) : ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 16, padding: 12, borderRadius: 12, background: "#1F2937", color: "#FBBF24" }, children: "Acesso restrito: role=admin necess\u00E1ria para visualizar m\u00E9tricas e usu\u00E1rios." }))] })) : null] }));
};
exports.App = App;
function PatientDiariesView({ patientId, templates }) {
    const [responses, setResponses] = (0, react_1.useState)([]);
    const loadResponses = (0, react_1.useCallback)(async () => {
        if (window.ethos?.forms) {
            const res = await window.ethos.forms.getResponses(patientId);
            setResponses(res || []);
        }
    }, [patientId]);
    (0, react_1.useEffect)(() => {
        loadResponses();
    }, [loadResponses]);
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gap: 16 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: 0 }, children: "Hist\u00F3rico de Respostas" }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", gap: 12 }, children: templates.map((t) => ((0, jsx_runtime_1.jsxs)("button", { style: { ...buttonStyle, padding: "6px 12px", fontSize: 12 }, onClick: async () => {
                                const schema = JSON.parse(t.schema);
                                const answers = {};
                                for (const field of schema) {
                                    const val = prompt(field.question);
                                    if (val === null)
                                        return;
                                    answers[field.id] = val;
                                }
                                await window.ethos.forms.submitResponse({
                                    formId: t.id,
                                    patientId,
                                    answers,
                                });
                                loadResponses();
                            }, children: ["+ ", t.title] }, t.id))) })] }), responses.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Nenhuma resposta registrada ainda." })) : (responses.map((r) => ((0, jsx_runtime_1.jsxs)("div", { style: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", padding: 16, borderRadius: `var(--radius)` }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", justifyContent: "space-between" }, children: [(0, jsx_runtime_1.jsx)("strong", { style: { color: "hsl(var(--foreground))" }, children: r.formTitle || "Formulário" }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, color: "#94A3B8" }, children: new Date(r.createdAt).toLocaleString("pt-BR") })] }), (0, jsx_runtime_1.jsx)("pre", { style: {
                            marginTop: 8,
                            whiteSpace: "pre-wrap",
                            fontSize: 12,
                            color: "#CBD5F5",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        }, children: JSON.stringify(r.answers, null, 2) })] }, r.id))))] }));
}
