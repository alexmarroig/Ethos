import React from "react";

export const Pacientes = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Pacientes</h2>
        <p style={{ color: "#94A3B8" }}>Lista com status de acompanhamento.</p>
      </header>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <p>Marina Alves · Ativa</p>
        <p>João Costa · Retorno pendente</p>
        <p>Rafael Lima · Sessão amanhã</p>
      </section>
    </div>
  );
};
