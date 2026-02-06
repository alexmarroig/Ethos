import React, { useState } from "react";

export const Sessao = () => {
  const [consent, setConsent] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Sessão em andamento</h2>
        <p style={{ color: "#94A3B8" }}>Fluxo offline com captura e validação.</p>
      </header>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <p>Paciente: Marina Alves</p>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            type="button"
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#3B82F6",
              color: "white",
              cursor: "pointer",
            }}
          >
            Importar áudio
          </button>
          <button
            type="button"
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#475569",
              color: "white",
              cursor: "pointer",
            }}
          >
            Gravar áudio
          </button>
        </div>
        <label style={{ display: "block", marginTop: 12, color: "#E2E8F0" }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />{" "}
          Tenho consentimento do paciente
        </label>
        <p style={{ color: "#94A3B8", marginTop: 8 }}>Status da transcrição: aguardando envio.</p>
      </section>
    </div>
  );
};
