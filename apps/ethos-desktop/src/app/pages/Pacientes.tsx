import React, { useMemo, useState } from "react";

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
  const scalesCatalog = [
    {
      id: "phq-9",
      name: "PHQ-9",
      domain: "Depressão",
      scoring: "0-27",
    },
    {
      id: "gad-7",
      name: "GAD-7",
      domain: "Ansiedade",
      scoring: "0-21",
    },
    {
      id: "pss-10",
      name: "PSS-10",
      domain: "Estresse",
      scoring: "0-40",
    },
  ];
  const scaleRecords = [
    {
      id: "rec-001",
      scale: "PHQ-9",
      score: 12,
      severity: "Moderado",
      appliedAt: "10/05/2024",
    },
    {
      id: "rec-002",
      scale: "GAD-7",
      score: 7,
      severity: "Leve",
      appliedAt: "10/05/2024",
    },
    {
      id: "rec-003",
      scale: "PHQ-9",
      score: 9,
      severity: "Leve",
      appliedAt: "24/05/2024",
    },
  ];
  const [recurringSchedules, setRecurringSchedules] = useState([
    {
      id: "sch-phq9",
      scale: "PHQ-9",
      recurrence: "A cada 2 semanas",
      nextDue: "07/06/2024",
      autoApply: true,
    },
    {
      id: "sch-gad7",
      scale: "GAD-7",
      recurrence: "Mensal",
      nextDue: "10/06/2024",
      autoApply: false,
    },
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

  const handleToggleSchedule = (id: string) => {
    setRecurringSchedules((current) =>
      current.map((schedule) =>
        schedule.id === id ? { ...schedule, autoApply: !schedule.autoApply } : schedule,
      ),
    );
import React, { useEffect, useState } from "react";
import type { Patient } from "@ethos/shared";
import { patientsService } from "../../services/patientsService";

const cardStyle: React.CSSProperties = {
  background: "#111827",
  padding: 20,
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #1F2937",
  background: "#0F172A",
  color: "#E2E8F0",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#38BDF8",
  color: "#0F172A",
  fontWeight: 600,
  cursor: "pointer",
};

export const Pacientes = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const refresh = () => {
    setPatients(patientsService.list());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      return;
    }
    patientsService.create({ name: name.trim(), email: email.trim() });
    setName("");
    setEmail("");
    refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Pacientes</h2>
        <p style={{ color: "#94A3B8" }}>Cadastre pacientes para liberar acesso ao portal de formulários.</p>
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
      <section style={cardStyle}>
        <h3 style={{ margin: 0 }}>Novo paciente</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            style={inputStyle}
            placeholder="Nome completo"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" style={buttonStyle}>
            Adicionar paciente
          </button>
        </form>
      </section>
      <section style={cardStyle}>
        <h3 style={{ margin: 0 }}>Lista de pacientes</h3>
        {patients.length === 0 ? (
          <p style={{ margin: 0, color: "#94A3B8", fontSize: 13 }}>
            Nenhum paciente cadastrado ainda.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, color: "#E2E8F0", fontSize: 13 }}>
            {patients.map((patient) => (
              <li key={patient.id}>
                <strong>{patient.name}</strong> · {patient.email}
                <span style={{ color: "#64748B" }}> (Código: {patient.id.slice(0, 8)})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Plano de segurança</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>Sinais de alerta: isolamento, insônia e irritabilidade.</li>
          <li>Estratégias de enfrentamento: respiração guiada, caminhada curta, diário emocional.</li>
          <li>Rede de apoio: irmã (Camila) e grupo de suporte semanal.</li>
          <li>Restrição de meios: manter medicamentos em caixa trancada.</li>
        </ul>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Episódios críticos</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>02/09 · crise moderada após conflito familiar · intervenção: contato com responsável.</li>
          <li>18/08 · risco alto · acionado plano de segurança e consulta emergencial.</li>
        </ul>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Contatos de emergência</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>Camila Alves (irmã) · (11) 98888-1122 · disponível à noite.</li>
          <li>Dr. Henrique Souza · (11) 3333-4400 · consultório.</li>
          <li>CAPS Centro · (11) 2222-1100 · plantão 24h.</li>
        </ul>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Checklist de conduta</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>Validar consentimento informado · concluído.</li>
          <li>Revisar fatores de risco atuais · pendente.</li>
          <li>Atualizar plano de segurança · pendente.</li>
          <li>Agendar follow-up em até 7 dias · concluído.</li>
        </ul>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Registro histórico</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>2024 · Histórico familiar de ansiedade generalizada.</li>
          <li>2023 · Mudança de cidade e redução de rede de suporte.</li>
          <li>2022 · Primeira avaliação clínica registrada.</li>
        </ul>
      </section>
      <section style={{ background: "#0F172A", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Prontuário · Escalas clínicas</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {scalesCatalog.map((scale) => (
            <div
              key={scale.id}
              style={{
                flex: "1 1 180px",
                background: "#111827",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #1F2937",
              }}
            >
              <strong>{scale.name}</strong>
              <p style={{ margin: "6px 0", color: "#94A3B8" }}>{scale.domain}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#CBD5F5" }}>Score {scale.scoring}</p>
            </div>
          ))}
        </div>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Registros vinculados ao paciente</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {scaleRecords.map((record) => (
            <div
              key={record.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 12,
                background: "#0B1220",
              }}
            >
              <div>
                <strong>{record.scale}</strong>
                <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>
                  {record.severity} · {record.appliedAt}
                </p>
              </div>
              <span style={{ fontSize: 18, color: "#38BDF8" }}>{record.score}</span>
            </div>
          ))}
        </div>
      </section>
      <section style={{ background: "#0B1220", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Aplicação recorrente automática</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recurringSchedules.map((schedule) => (
            <label
              key={schedule.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background: "#111827",
                padding: "10px 12px",
                borderRadius: 12,
              }}
            >
              <div>
                <strong>{schedule.scale}</strong>
                <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>
                  {schedule.recurrence} · próxima em {schedule.nextDue}
                </p>
              </div>
              <input
                type="checkbox"
                checked={schedule.autoApply}
                onChange={() => handleToggleSchedule(schedule.id)}
              />
            </label>
          ))}
        </div>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Evolução no prontuário (PHQ-9)</h3>
        <p style={{ marginTop: 0, color: "#94A3B8", fontSize: 12 }}>
          Histórico de respostas para acompanhamento longitudinal.
        </p>
        <svg width="100%" height="160" viewBox="0 0 360 140" role="img" aria-label="Evolução da escala PHQ-9">
          <path d={chartPath} fill="none" stroke="#38BDF8" strokeWidth="3" />
          {evolutionPoints.map((point, index) => {
            const x = (360 / (evolutionPoints.length - 1)) * index;
            const y = 140 - (point.score / 27) * 140;
            return <circle key={point.date} cx={x} cy={y} r={4} fill="#F472B6" />;
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#94A3B8", fontSize: 11 }}>
          {evolutionPoints.map((point) => (
            <span key={point.date}>{point.date}</span>
          ))}
        </div>
      </section>
    </div>
  );
};
