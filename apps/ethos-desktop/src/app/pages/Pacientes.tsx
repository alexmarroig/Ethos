import React, { useEffect, useMemo, useState } from "react";
import type { Patient } from "@ethos/shared";
import { patientsService } from "../../services/patientsService";

const financialHistory = [
  { id: "fin-001", label: "Sessão 12/09", amount: "R$ 180,00", status: "Pago · Recibo enviado", receipt: "Automático · WhatsApp" },
  { id: "fin-002", label: "Sessão 05/09", amount: "R$ 180,00", status: "Em aberto · Recibo pendente", receipt: "Aguardando envio" },
  { id: "fin-003", label: "Falta 29/08", amount: "R$ 90,00", status: "Cobrança de falta", receipt: "Recibo automático criado" },
];

const scalesCatalog = [
  { id: "phq-9", name: "PHQ-9", domain: "Depressão", scoring: "0-27" },
  { id: "gad-7", name: "GAD-7", domain: "Ansiedade", scoring: "0-21" },
  { id: "pss-10", name: "PSS-10", domain: "Estresse", scoring: "0-40" },
];

const scaleRecords = [
  { id: "rec-001", scale: "PHQ-9", score: 12, severity: "Moderado", appliedAt: "10/05/2024" },
  { id: "rec-002", scale: "GAD-7", score: 7, severity: "Leve", appliedAt: "10/05/2024" },
  { id: "rec-003", scale: "PHQ-9", score: 9, severity: "Leve", appliedAt: "24/05/2024" },
];

const cardStyle: React.CSSProperties = {
  background: "#111827",
  padding: 20,
  borderRadius: 16,
};

export const Pacientes = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [recurringSchedules, setRecurringSchedules] = useState([
    { id: "sch-phq9", scale: "PHQ-9", recurrence: "A cada 2 semanas", nextDue: "07/06/2024", autoApply: true },
    { id: "sch-gad7", scale: "GAD-7", recurrence: "Mensal", nextDue: "10/06/2024", autoApply: false },
  ]);

  const evolutionPoints = useMemo(
    () => [
      { date: "10/03", score: 16 },
      { date: "24/03", score: 14 },
      { date: "07/04", score: 13 },
      { date: "21/04", score: 11 },
      { date: "10/05", score: 12 },
      { date: "24/05", score: 9 },
    ],
    [],
  );

  const chartPath = useMemo(() => {
    const width = 360;
    const height = 140;
    const maxScore = 27;
    return evolutionPoints
      .map((point, index) => {
        const x = (width / (evolutionPoints.length - 1)) * index;
        const y = height - (point.score / maxScore) * height;
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [evolutionPoints]);

  const refresh = () => setPatients(patientsService.list());

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    patientsService.create({ name: name.trim(), email: email.trim(), notes: "" });
    setName("");
    setEmail("");
    refresh();
  };

  const handleToggleSchedule = (id: string) => {
    setRecurringSchedules((current) =>
      current.map((schedule) =>
        schedule.id === id ? { ...schedule, autoApply: !schedule.autoApply } : schedule,
      ),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Pacientes</h2>
        <p style={{ color: "#94A3B8" }}>Cadastre pacientes para liberar acesso ao portal de formulários.</p>
      </header>

      <section style={{ ...cardStyle, display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)" }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Carteira atual</h3>
          {patients.map((patient) => (
            <div key={patient.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1F2937" }}>
              <div>
                <p style={{ margin: 0 }}>{patient.name}</p>
                <p style={{ margin: 0, color: "#94A3B8", fontSize: 12 }}>{patient.birthDate ?? "Sem data de nascimento"}</p>
              </div>
              <p style={{ margin: 0, color: "#CBD5F5", fontWeight: 600 }}>{patient.id.slice(0, 8)}</p>
            </div>
          ))}
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Histórico financeiro · Marina Alves</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {financialHistory.map((entry) => (
              <div key={entry.id} style={{ padding: 12, borderRadius: 12, background: "#0B1220" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#E2E8F0" }}>
                  <span>{entry.label}</span>
                  <span style={{ fontWeight: 600 }}>{entry.amount}</span>
                </div>
                <span style={{ color: "#94A3B8", fontSize: 12 }}>{entry.status}</span>
                <div style={{ color: "#38BDF8", fontSize: 12 }}>{entry.receipt}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Novo paciente</h3>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input placeholder="Nome completo" value={name} onChange={(event) => setName(event.target.value)} />
          <input placeholder="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button type="submit">Adicionar paciente</button>
        </form>
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Prontuário · Escalas clínicas</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {scalesCatalog.map((scale) => (
            <div key={scale.id} style={{ flex: "1 1 180px", background: "#0B1220", padding: 12, borderRadius: 12 }}>
              <strong>{scale.name}</strong>
              <p style={{ margin: "6px 0", color: "#94A3B8" }}>{scale.domain}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#CBD5F5" }}>Score {scale.scoring}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {scaleRecords.map((record) => (
            <div key={record.id} style={{ display: "flex", justifyContent: "space-between", background: "#0B1220", padding: 10, borderRadius: 10 }}>
              <span>{record.scale} · {record.severity}</span>
              <strong>{record.score}</strong>
            </div>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Aplicação recorrente automática</h3>
        {recurringSchedules.map((schedule) => (
          <label key={schedule.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>{schedule.scale} · {schedule.recurrence}</span>
            <input type="checkbox" checked={schedule.autoApply} onChange={() => handleToggleSchedule(schedule.id)} />
          </label>
        ))}
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Evolução no prontuário (PHQ-9)</h3>
        <svg width="100%" height="160" viewBox="0 0 360 140" role="img" aria-label="Evolução da escala PHQ-9">
          <path d={chartPath} fill="none" stroke="#38BDF8" strokeWidth="3" />
          {evolutionPoints.map((point, index) => {
            const x = (360 / (evolutionPoints.length - 1)) * index;
            const y = 140 - (point.score / 27) * 140;
            return <circle key={point.date} cx={x} cy={y} r={4} fill="#F472B6" />;
          })}
        </svg>
      </section>
    </div>
  );
};
