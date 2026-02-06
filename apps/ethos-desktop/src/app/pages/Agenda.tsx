import React from "react";

export const Agenda = () => {
  const agendaItems = [
    {
      day: "Segunda",
      time: "09:30",
      patient: "João Costa",
      alertLevel: "high",
      rules: {
        confirmation: "Obrigatória até 24h antes",
        reschedule: "Reposição bloqueada",
        deadline: "Cancelamento até 48h",
      },
      historyNote: "Faltas recorrentes nas últimas semanas.",
    },
    {
      day: "Terça",
      time: "14:00",
      patient: "Marina Alves",
      alertLevel: "low",
      rules: {
        confirmation: "Confirmação flexível",
        reschedule: "Reposição caso a caso",
        deadline: "Cancelamento até 24h",
      },
      historyNote: "Uma falta recente registrada.",
    },
    {
      day: "Quinta",
      time: "16:30",
      patient: "Rafael Lima",
      alertLevel: "none",
      rules: {
        confirmation: "Confirmação obrigatória",
        reschedule: "Reposição permitida",
        deadline: "Cancelamento até 12h",
      },
      historyNote: "Histórico regular, sem faltas.",
    },
  ];

  const alertColors: Record<string, string> = {
    none: "#1F2937",
    low: "#0EA5E9",
    medium: "#F59E0B",
    high: "#EF4444",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Agenda</h2>
        <p style={{ color: "#94A3B8" }}>Semana atual com horários e confirmações.</p>
      </header>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {agendaItems.map((item) => (
          <article
            key={`${item.day}-${item.time}`}
            style={{
              borderRadius: 12,
              border: "1px solid #1F2937",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "#0F172A",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
              <div>
                <strong style={{ fontSize: 16 }}>{`${item.day} · ${item.time}`}</strong>
                <div style={{ color: "#E2E8F0", fontSize: 14 }}>{item.patient}</div>
              </div>
              <span
                aria-label={`Alerta ${item.alertLevel}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "#CBD5F5",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "999px",
                    background: alertColors[item.alertLevel],
                  }}
                />
                {item.historyNote}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div style={{ background: "#111827", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>Confirmação</div>
                <div style={{ fontSize: 14, color: "#E2E8F0" }}>{item.rules.confirmation}</div>
              </div>
              <div style={{ background: "#111827", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>Reposição</div>
                <div style={{ fontSize: 14, color: "#E2E8F0" }}>{item.rules.reschedule}</div>
              </div>
              <div style={{ background: "#111827", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>Prazos</div>
                <div style={{ fontSize: 14, color: "#E2E8F0" }}>{item.rules.deadline}</div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};
