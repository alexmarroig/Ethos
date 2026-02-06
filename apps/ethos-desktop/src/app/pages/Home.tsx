import React from "react";

export const Home = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Resumo do dia</h2>
        <p style={{ color: "#94A3B8" }}>Visão rápida de agenda, sessões e pendências.</p>
      </header>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Próxima sessão</h3>
        <p>15:30 · Marina Alves</p>
        <p style={{ color: "#94A3B8" }}>Prontuário automático aguardando validação.</p>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Indicadores</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>3 sessões confirmadas para hoje</li>
          <li>1 paciente aguardando retorno</li>
          <li>2 prontuários em rascunho</li>
        </ul>
      </section>
    </div>
  );
};
