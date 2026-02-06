import React from "react";

const patients = [
  { name: "Marina Alves", status: "Ativa", outstanding: "R$ 320,00" },
  { name: "João Costa", status: "Retorno pendente", outstanding: "R$ 150,00" },
  { name: "Rafael Lima", status: "Sessão amanhã", outstanding: "R$ 0,00" },
];

const financialHistory = [
  {
    id: "fin-001",
    label: "Sessão 12/09",
    amount: "R$ 180,00",
    status: "Pago · Recibo enviado",
    receipt: "Automático · WhatsApp",
  },
  {
    id: "fin-002",
    label: "Sessão 05/09",
    amount: "R$ 180,00",
    status: "Em aberto · Recibo pendente",
    receipt: "Aguardando envio",
  },
  {
    id: "fin-003",
    label: "Falta 29/08",
    amount: "R$ 90,00",
    status: "Cobrança de falta",
    receipt: "Recibo automático criado",
  },
];

export const Pacientes = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Pacientes</h2>
        <p style={{ color: "#94A3B8" }}>Lista com status de acompanhamento.</p>
      </header>
      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)" }}>
        <div style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
          <h3 style={{ marginTop: 0 }}>Carteira atual</h3>
          {patients.map((patient) => (
            <div
              key={patient.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #1F2937",
              }}
            >
              <div>
                <p style={{ margin: 0 }}>{patient.name}</p>
                <p style={{ margin: 0, color: "#94A3B8", fontSize: 12 }}>{patient.status}</p>
              </div>
              <p style={{ margin: 0, color: "#CBD5F5", fontWeight: 600 }}>{patient.outstanding}</p>
            </div>
          ))}
        </div>
        <div style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
          <h3 style={{ marginTop: 0 }}>Histórico financeiro · Marina Alves</h3>
          <p style={{ color: "#94A3B8", marginTop: 4 }}>
            Exibição por paciente com recibos automáticos e impacto das faltas.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {financialHistory.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "#0B1220",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", color: "#E2E8F0" }}>
                  <span>{entry.label}</span>
                  <span style={{ fontWeight: 600 }}>{entry.amount}</span>
                </div>
                <span style={{ color: "#94A3B8", fontSize: 12 }}>{entry.status}</span>
                <span style={{ color: "#38BDF8", fontSize: 12 }}>{entry.receipt}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 12, background: "#0F172A", borderRadius: 12 }}>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Impacto por faltas</h4>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#CBD5F5" }}>
              <span>2 faltas no trimestre</span>
              <strong>R$ 180,00</strong>
            </div>
            <p style={{ margin: "8px 0 0", color: "#94A3B8", fontSize: 12 }}>
              Recibos gerados automaticamente para cada cobrança de falta.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
