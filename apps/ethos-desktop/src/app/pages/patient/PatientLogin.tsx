import React, { useState } from "react";
import { patientsService } from "../../../services/patientsService";
import { usePatientAuth } from "../../auth/PatientAuthContext";

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0F172A",
  color: "#E2E8F0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#111827",
  padding: 24,
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #1F2937",
  background: "#0F172A",
  color: "#E2E8F0",
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#38BDF8",
  color: "#0F172A",
  fontWeight: 600,
  cursor: "pointer",
};

export const PatientLogin = () => {
  const { login } = usePatientAuth();
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const patients = patientsService.list();
    const normalizedEmail = email.trim().toLowerCase();
    const patient = patients.find((item) => {
      const matchesEmail = normalizedEmail ? item.email.toLowerCase() === normalizedEmail : true;
      const matchesCode = accessCode.trim() ? item.id.startsWith(accessCode.trim()) : false;
      return matchesEmail && matchesCode;
    });

    if (!patient) {
      setError("Não encontramos seu cadastro. Confirme o código de acesso fornecido pelo psicólogo.");
      return;
    }

    login({ id: patient.id, name: patient.name, email: patient.email });
  };

  return (
    <div style={containerStyle}>
      <form style={cardStyle} onSubmit={handleSubmit}>
        <header>
          <h2 style={{ marginBottom: 4 }}>Portal do paciente</h2>
          <p style={{ margin: 0, color: "#94A3B8", fontSize: 14 }}>
            Faça login com o código enviado pelo seu psicólogo para responder formulários e diários.
          </p>
        </header>
        <label style={{ fontSize: 12, color: "#94A3B8" }}>
          Código de acesso
          <input
            style={{ ...inputStyle, marginTop: 6 }}
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder="Ex.: 3f12ab45"
          />
        </label>
        <label style={{ fontSize: 12, color: "#94A3B8" }}>
          E-mail
          <input
            style={{ ...inputStyle, marginTop: 6 }}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seuemail@exemplo.com"
            type="email"
          />
        </label>
        {error ? <p style={{ margin: 0, color: "#F87171", fontSize: 13 }}>{error}</p> : null}
        <button type="submit" style={buttonStyle}>
          Entrar
        </button>
      </form>
    </div>
  );
};
