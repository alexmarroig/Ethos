import React from "react";

export const Agenda = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Agenda</h2>
        <p style={{ color: "#94A3B8" }}>Semana atual com horários e confirmações.</p>
      </header>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <p>Segunda · 09:30 · João Costa</p>
        <p>Terça · 14:00 · Marina Alves</p>
        <p>Quinta · 16:30 · Rafael Lima</p>
      </section>
    </div>
  );
};
