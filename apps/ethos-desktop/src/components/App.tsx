import React, { useCallback, useEffect, useMemo, useState } from "react";
import { exportClinicalNote } from "../services/exportService";
import {
  type AdminOverviewMetrics,
  type AdminUser,
  fetchAdminOverview,
  fetchAdminUsers,
  loginControlPlane,
} from "../services/controlPlaneAdmin";

type NoteStatus = "draft" | "validated";
type Role = "admin" | "user" | "unknown";

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

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #1F2937",
  background: "#0B1120",
  color: "#E2E8F0",
  width: "100%",
};

const subtleText: React.CSSProperties = { color: "#94A3B8" };

const clamp = (s: string, max = 160) => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);

const safeNowPtBr = () => new Date().toLocaleString("pt-BR");

const isLikelyForbidden = (msg: string) => msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("403");
const isLikelyUnauthorized = (msg: string) =>
  msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("401") || msg.toLowerCase().includes("token");

export const App = () => {
  // =========================
  // Clinical note state
  // =========================
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState(
    "RASCUNHO — Em 15/02/2025, o profissional realizou sessão com a paciente. A paciente relatou dificuldades recentes em organizar a rotina e descreveu sensação de cansaço ao final do dia. O relato foi ouvido sem interpretações adicionais."
  );
  const [status, setStatus] = useState<NoteStatus>("draft");
  const [validatedAt, setValidatedAt] = useState<string | null>(null);
  const [showEthicsModal, setShowEthicsModal] = useState(false);

  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "docx" | null>(null);

  const isValidated = status === "validated";
  const canValidate = consent && !isValidated;
  const canExport = isValidated && exportingFormat === null;

  const handleValidate = () => setShowEthicsModal(true);

  const confirmValidation = () => {
    const now = safeNowPtBr();
    setStatus("validated");
    setValidatedAt(now);
    setShowEthicsModal(false);
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (!canExport) return;
    setExportingFormat(format);
    setExportFeedback(null);
    try {
      const fileName = await exportClinicalNote(
        {
          patientName: "Marina Alves",
          clinicianName: "Dra. Ana Souza",
          sessionDate: "15/02/2025",
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
  // Control Plane (Admin) state
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

  // IMPORTANT: token persistence is a tradeoff. We keep it, but with explicit "remember me".
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
    } catch {
      // ignore
    }
  }, [adminBaseUrl]);

  useEffect(() => {
    try {
      localStorage.setItem("ethos-admin-email", adminEmail);
    } catch {
      // ignore
    }
  }, [adminEmail]);

  useEffect(() => {
    try {
      localStorage.setItem("ethos-admin-remember", rememberSession ? "1" : "0");
    } catch {
      // ignore
    }
  }, [rememberSession]);

  useEffect(() => {
    try {
      if (!rememberSession) {
        // If not remembering, keep token only in memory
        localStorage.removeItem("ethos-admin-token");
        localStorage.removeItem("ethos-admin-role");
        return;
      }
      if (adminToken) localStorage.setItem("ethos-admin-token", adminToken);
      else localStorage.removeItem("ethos-admin-token");
    } catch {
      // ignore
    }
  }, [adminToken, rememberSession]);

  useEffect(() => {
    try {
      if (!rememberSession) {
        localStorage.removeItem("ethos-admin-role");
        return;
      }
      localStorage.setItem("ethos-admin-role", adminRole);
    } catch {
      // ignore
    }
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
      // Prefer to trust backend role if your login returns it; for refresh, we infer admin if calls succeed
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
        // Token likely expired/invalid
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
      // Pull data right after login
      // If role isn't admin, refresh might fail with forbidden (handled)
      // Avoid awaiting to keep UI snappy; but here awaiting is fine
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
    // also drop persisted token if any
    try {
      localStorage.removeItem("ethos-admin-token");
      localStorage.removeItem("ethos-admin-role");
    } catch {
      // ignore
    }
  };

  // =========================
  // Render
  // =========================
  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0F172A", minHeight: "100vh", padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#F8FAFC", fontSize: 28, marginBottom: 4 }}>ETHOS — Agenda Clínica</h1>
        <p style={subtleText}>Fluxo offline com prontuário rascunho e validação explícita + control plane admin.</p>
      </header>

      <section style={sectionStyle}>
        <h2>Agenda semanal</h2>
        <p style={{ color: "#CBD5F5" }}>Segunda · 14:00 · Marina Alves</p>
        <p style={{ color: "#CBD5F5" }}>Terça · 09:30 · João Costa</p>
      </section>

      <section style={sectionStyle}>
        <h2>Sessão</h2>
        <p style={{ color: "#CBD5F5" }}>Paciente: Marina Alves</p>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <button style={buttonStyle}>Importar áudio</button>
          <button style={{ ...buttonStyle, background: "#475569" }}>Gravar áudio</button>
        </div>
        <label style={{ display: "block", marginTop: 12, color: "#E2E8F0" }}>
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Tenho
          consentimento do paciente
        </label>
        <p style={{ ...subtleText, marginTop: 8 }}>Status da transcrição: aguardando envio para o worker local.</p>
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

        {isValidated && (
          <p style={{ color: "#38BDF8", fontSize: 14, marginBottom: 8 }}>
            Prontuário validado e congelado para assegurar integridade clínica.
          </p>
        )}

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

        {!consent && (
          <p style={{ color: "#FCA5A5", marginTop: 8 }}>
            É necessário confirmar o consentimento do paciente para validar o prontuário.
          </p>
        )}

        {exportFeedback && (
          <p style={{ color: exportFeedback.startsWith("Erro:") ? "#FCA5A5" : "#A7F3D0", marginTop: 8 }}>
            {exportFeedback}
          </p>
        )}
      </section>

      {showEthicsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "#111827",
              borderRadius: 16,
              padding: 24,
              maxWidth: 520,
              width: "100%",
              color: "#F8FAFC",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.35)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Confirmação ética</h3>
            <p style={{ color: "#CBD5F5" }}>
              Antes de validar, confirme que o registro está fiel ao relato do paciente, sem interpretações clínicas,
              que o consentimento foi obtido e que você está ciente do bloqueio permanente após a validação.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              <button style={{ ...buttonStyle, background: "#22C55E" }} onClick={confirmValidation}>
                Confirmar e validar
              </button>
              <button style={{ ...buttonStyle, background: "#475569" }} onClick={() => setShowEthicsModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
              style={{ ...buttonStyle, background: hasAdminToken ? "#6366F1" : "#334155", cursor: hasAdminToken ? "pointer" : "not-allowed" }}
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
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ background: "#0B1120", padding: 16, borderRadius: 12, minWidth: 180 }}>
                <p style={subtleText}
