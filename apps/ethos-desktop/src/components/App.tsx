import React, { useEffect, useMemo, useState } from "react";
import {
  type AdminOverviewMetrics,
  type AdminUser,
  fetchAdminOverview,
  fetchAdminUsers,
  loginControlPlane,
} from "../services/controlPlaneAdmin";

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

export const App = () => {
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState(
    "RASCUNHO — Em 15/02/2025, o profissional realizou sessão com a paciente. A paciente relatou dificuldades recentes em organizar a rotina e descreveu sensação de cansaço ao final do dia. O relato foi ouvido sem interpretações adicionais."
  );
  const [status, setStatus] = useState("draft");
  const defaultControlPlaneUrl = "http://localhost:8788";
  const [adminBaseUrl, setAdminBaseUrl] = useState(
    () => localStorage.getItem("ethos-control-plane-url") ?? defaultControlPlaneUrl
  );
  const [adminEmail, setAdminEmail] = useState(
    () => localStorage.getItem("ethos-admin-email") ?? "camila@ethos.local"
  );
  const [adminPassword, setAdminPassword] = useState("");
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("ethos-admin-token") ?? "");
  const [adminRole, setAdminRole] = useState<"admin" | "user" | "unknown">(
    () => (localStorage.getItem("ethos-admin-role") as "admin" | "user" | "unknown") ?? "unknown"
  );
  const [adminMetrics, setAdminMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const hasAdminToken = Boolean(adminToken);
  const isAdmin = adminRole === "admin";
  const adminStatusLabel = useMemo(() => {
    if (!hasAdminToken) return "Sem sessão ativa.";
    if (adminLoading) return "Sincronizando dados administrativos…";
    if (isAdmin) return "Acesso administrativo confirmado.";
    if (adminRole === "user") return "Sessão válida sem permissão admin.";
    return "Sessão precisa de validação.";
  }, [adminLoading, adminRole, hasAdminToken, isAdmin]);

  useEffect(() => {
    localStorage.setItem("ethos-control-plane-url", adminBaseUrl);
  }, [adminBaseUrl]);

  useEffect(() => {
    localStorage.setItem("ethos-admin-email", adminEmail);
  }, [adminEmail]);

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem("ethos-admin-token", adminToken);
    } else {
      localStorage.removeItem("ethos-admin-token");
    }
  }, [adminToken]);

  useEffect(() => {
    localStorage.setItem("ethos-admin-role", adminRole);
  }, [adminRole]);

  const refreshAdminData = async () => {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao acessar admin.";
      setAdminError(message);
      setAdminMetrics(null);
      setAdminUsers([]);
      if (message.toLowerCase().includes("forbidden")) {
        setAdminRole("user");
      }
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    void refreshAdminData();
  }, [adminBaseUrl, adminToken]);

  const handleAdminLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminLoading(true);
    setAdminError("");
    try {
      const response = await loginControlPlane(adminBaseUrl, adminEmail, adminPassword);
      setAdminToken(response.token);
      setAdminRole(response.user.role);
      setAdminPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no login.";
      setAdminError(message);
      setAdminRole("unknown");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setAdminToken("");
    setAdminRole("unknown");
    setAdminMetrics(null);
    setAdminUsers([]);
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0F172A", minHeight: "100vh", padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#F8FAFC", fontSize: 28, marginBottom: 4 }}>ETHOS — Agenda Clínica</h1>
        <p style={{ color: "#94A3B8" }}>Fluxo offline com prontuário rascunho e validação explícita.</p>
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
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />{" "}
          Tenho consentimento do paciente
        </label>
        <p style={{ color: "#94A3B8", marginTop: 8 }}>
          Status da transcrição: aguardando envio para o worker local.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Prontuário automático</h2>
        <p style={{ color: "#FBBF24", fontWeight: 600 }}>Status: {status === "draft" ? "Rascunho" : "Validado"}</p>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          style={{ width: "100%", minHeight: 140, marginTop: 12, borderRadius: 12, padding: 12 }}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button style={{ ...buttonStyle, background: "#22C55E" }} onClick={() => setStatus("validated")}>
            Validar prontuário
          </button>
          <button style={{ ...buttonStyle, background: "#6366F1" }}>Exportar DOCX</button>
          <button style={{ ...buttonStyle, background: "#6366F1" }}>Exportar PDF</button>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Admin — Control Plane</h2>
        <p style={{ color: "#94A3B8", marginBottom: 12 }}>
          Painel restrito à role=admin, com métricas agregadas e lista de usuários sem conteúdo clínico.
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
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ ...buttonStyle, background: "#22C55E" }} disabled={adminLoading}>
              Entrar como admin
            </button>
            <button type="button" style={{ ...buttonStyle, background: "#475569" }} onClick={handleAdminLogout}>
              Encerrar sessão
            </button>
            <button type="button" style={{ ...buttonStyle, background: "#6366F1" }} onClick={refreshAdminData}>
              Atualizar dados
            </button>
          </div>
        </form>
        <p style={{ color: "#CBD5F5", marginBottom: 8 }}>{adminStatusLabel}</p>
        {adminError ? (
          <p style={{ color: "#FCA5A5" }}>{adminError}</p>
        ) : null}
        {isAdmin ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ background: "#0B1120", padding: 16, borderRadius: 12, minWidth: 180 }}>
                <p style={{ color: "#94A3B8", marginBottom: 6 }}>Usuários ativos</p>
                <p style={{ fontSize: 24, fontWeight: 700 }}>{adminMetrics?.users_total ?? "--"}</p>
              </div>
              <div style={{ background: "#0B1120", padding: 16, borderRadius: 12, minWidth: 180 }}>
                <p style={{ color: "#94A3B8", marginBottom: 6 }}>Eventos de telemetria</p>
                <p style={{ fontSize: 24, fontWeight: 700 }}>{adminMetrics?.telemetry_total ?? "--"}</p>
              </div>
            </div>
            <div>
              <h3 style={{ marginBottom: 8 }}>Usuários (sanitizado)</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {adminUsers.length === 0 ? (
                  <p style={{ color: "#94A3B8" }}>Nenhum usuário encontrado.</p>
                ) : (
                  adminUsers.map((user) => (
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
                        <p style={{ color: "#94A3B8", fontSize: 12 }}>ID: {user.id}</p>
                      </div>
                      <div>
                        <p style={{ color: "#94A3B8", fontSize: 12 }}>Role</p>
                        <p style={{ color: "#E2E8F0" }}>{user.role}</p>
                      </div>
                      <div>
                        <p style={{ color: "#94A3B8", fontSize: 12 }}>Status</p>
                        <p style={{ color: "#E2E8F0" }}>{user.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#1F2937", color: "#FBBF24" }}>
            Acesso restrito: role=admin necessária para visualizar métricas e usuários.
          </div>
        )}
      </section>
    </div>
  );
};
