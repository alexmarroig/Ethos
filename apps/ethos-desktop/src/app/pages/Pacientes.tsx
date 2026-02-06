import React, { useMemo, useState } from "react";

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
  };

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
