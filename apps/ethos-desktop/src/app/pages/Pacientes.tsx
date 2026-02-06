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
    </div>
  );
};
