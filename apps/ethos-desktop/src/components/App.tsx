import React, { useState } from "react";

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

export const App = () => {
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState(
    "RASCUNHO — Em 15/02/2025, o profissional realizou sessão com a paciente. A paciente relatou dificuldades recentes em organizar a rotina e descreveu sensação de cansaço ao final do dia. O relato foi ouvido sem interpretações adicionais."
  );
  const [status, setStatus] = useState("draft");

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
    </div>
  );
};
