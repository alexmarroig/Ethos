import React, { useMemo, useState } from "react";

const sectionStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: "#111827",
  color: "#F9FAFB",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  background: "#3B82F6",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const navItems = [
  { id: "login", label: "Login", helper: "Acesso seguro" },
  { id: "agenda", label: "Agenda", helper: "Semana clínica" },
  { id: "sessao", label: "Sessão", helper: "Registro guiado" },
];

export const App = () => {
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState(
    "RASCUNHO — Em 15/02/2025, o profissional realizou sessão com a paciente. A paciente relatou dificuldades recentes em organizar a rotina e descreveu sensação de cansaço ao final do dia. O relato foi ouvido sem interpretações adicionais."
  );
  const [status, setStatus] = useState("draft");
  const [activeTab, setActiveTab] = useState("login");

  const styles = useMemo(
    () => `
      :root {
        color-scheme: dark;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #0f172a;
        font-family: "Inter", sans-serif;
      }
      .app {
        min-height: 100vh;
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        color: #f8fafc;
      }
      .header p {
        margin: 6px 0 0;
        color: #94a3b8;
      }
      .status-pill {
        background: #1f2937;
        color: #e2e8f0;
        padding: 8px 14px;
        border-radius: 999px;
        font-size: 14px;
      }
      .shell {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        align-items: start;
      }
      .nav {
        background: #0b1222;
        border-radius: 18px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        position: sticky;
        top: 24px;
      }
      .nav button {
        background: transparent;
        border: 1px solid transparent;
        padding: 12px;
        border-radius: 12px;
        text-align: left;
        color: #cbd5f5;
        font-weight: 600;
        cursor: pointer;
      }
      .nav button span {
        display: block;
        font-size: 12px;
        color: #64748b;
        margin-top: 4px;
        font-weight: 500;
      }
      .nav button.active {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.15);
        color: #f8fafc;
      }
      .content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .panel {
        display: none;
        gap: 16px;
        flex-direction: column;
      }
      .panel.active {
        display: flex;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .input {
        width: 100%;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid #334155;
        background: #0f172a;
        color: #e2e8f0;
      }
      .bottom-nav {
        display: none;
      }
      @media (max-width: 960px) {
        .app {
          padding: 20px;
        }
        .shell {
          grid-template-columns: 1fr;
        }
        .nav {
          display: none;
        }
        .bottom-nav {
          display: flex;
          position: sticky;
          bottom: 16px;
          background: #0b1222;
          border-radius: 16px;
          padding: 12px;
          gap: 8px;
          justify-content: space-around;
        }
        .bottom-nav button {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-weight: 600;
        }
        .bottom-nav button.active {
          color: #f8fafc;
        }
      }
    `,
    []
  );

  return (
    <div className="app">
      <style>{styles}</style>
      <header className="header">
        <div>
          <h1>ETHOS — PWA Clínica</h1>
          <p>Experiência mobile-first com navegação rápida e suporte offline.</p>
        </div>
        <div className="status-pill">Modo offline pronto · Última sincronização: 09:24</div>
      </header>

      <div className="shell">
        <nav className="nav" aria-label="Navegação principal">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? "active" : ""}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
              <span>{item.helper}</span>
            </button>
          ))}
        </nav>

        <main className="content">
          <section className={`panel ${activeTab === "login" ? "active" : ""}`}>
            <div style={sectionStyle}>
              <h2>Login rápido</h2>
              <p style={{ color: "#CBD5F5" }}>Autenticação segura com PIN local e biometria.</p>
              <div className="grid" style={{ marginTop: 16 }}>
                <label>
                  Email
                  <input className="input" type="email" placeholder="nome@clinica.com" />
                </label>
                <label>
                  PIN
                  <input className="input" type="password" placeholder="••••" />
                </label>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <button style={buttonStyle}>Entrar</button>
                <button style={{ ...buttonStyle, background: "#334155" }}>Usar biometria</button>
              </div>
            </div>

            <div style={sectionStyle}>
              <h2>Sincronização inteligente</h2>
              <p style={{ color: "#94A3B8" }}>
                Controlamos uploads apenas quando o Wi-Fi seguro está disponível.
              </p>
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

          <section className={`panel ${activeTab === "agenda" ? "active" : ""}`}>
            <div style={sectionStyle}>
              <h2>Agenda semanal</h2>
              <div className="grid" style={{ marginTop: 12 }}>
                <div>
                  <strong>Segunda</strong>
                  <p style={{ color: "#CBD5F5" }}>14:00 · Marina Alves</p>
                  <p style={{ color: "#94A3B8" }}>Sala 2 · Presencial</p>
                </div>
                <div>
                  <strong>Terça</strong>
                  <p style={{ color: "#CBD5F5" }}>09:30 · João Costa</p>
                  <p style={{ color: "#94A3B8" }}>Teleatendimento</p>
                </div>
                <div>
                  <strong>Quarta</strong>
                  <p style={{ color: "#CBD5F5" }}>16:15 · Luísa Martins</p>
                  <p style={{ color: "#94A3B8" }}>Sala 3 · Avaliação inicial</p>
                </div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h2>Próximas tarefas</h2>
              <ul style={{ color: "#CBD5F5", paddingLeft: 18, margin: 0 }}>
                <li>Revisar formulário de intake (Marina).</li>
                <li>Confirmar autorização de gravação (João).</li>
                <li>Enviar lembrete de sessão (Luísa).</li>
              </ul>
            </div>
          </section>

          <section className={`panel ${activeTab === "sessao" ? "active" : ""}`}>
            <div style={sectionStyle}>
              <h2>Sessão em andamento</h2>
              <p style={{ color: "#CBD5F5" }}>Paciente: Marina Alves</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                <button style={buttonStyle}>Importar áudio</button>
                <button style={{ ...buttonStyle, background: "#475569" }}>Gravar áudio</button>
                <button style={{ ...buttonStyle, background: "#14B8A6" }}>Iniciar transcrição</button>
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
            </div>

            <div style={sectionStyle}>
              <h2>Prontuário automático</h2>
              <p style={{ color: "#FBBF24", fontWeight: 600 }}>
                Status: {status === "draft" ? "Rascunho" : "Validado"}
              </p>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                style={{
                  width: "100%",
                  minHeight: 140,
                  marginTop: 12,
                  borderRadius: 12,
                  padding: 12,
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#E2E8F0",
                }}
              />
              <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <button style={{ ...buttonStyle, background: "#22C55E" }} onClick={() => setStatus("validated")}>
                  Validar prontuário
                </button>
                <button style={{ ...buttonStyle, background: "#6366F1" }}>Exportar DOCX</button>
                <button style={{ ...buttonStyle, background: "#6366F1" }}>Exportar PDF</button>
              </div>
            </div>
          </section>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegação móvel">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeTab === item.id ? "active" : ""}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
