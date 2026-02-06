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
    </div>
  );
};
