import React, { useState } from "react";
import { patientsService } from "../../../services/patientsService";
import { usePatientAuth } from "../../auth/PatientAuthContext";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: colors.background.canvas,
  color: colors.text.primary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: spacing.xl,
  fontFamily: typography.fontFamily,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: colors.background.surface,
  padding: spacing.xl,
  borderRadius: radii.xl,
  display: "flex",
  flexDirection: "column",
  gap: spacing.lg,
};

const inputStyle: React.CSSProperties = {
  padding: `${spacing.md}px ${spacing.md + 2}px`,
  borderRadius: radii.md,
  border: `1px solid ${colors.border.subtle}`,
  background: colors.background.canvas,
  color: colors.text.primary,
};

const buttonStyle: React.CSSProperties = {
  padding: `${spacing.md}px ${spacing.lg}px`,
  borderRadius: radii.md,
  border: "none",
  background: colors.accent.primary,
  color: colors.text.inverse,
  fontWeight: typography.weight.semibold,
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
          <h2 style={{ marginBottom: spacing.xs }}>Portal do paciente</h2>
          <p style={{ margin: 0, color: colors.text.secondary, fontSize: typography.sizes.md }}>
            Faça login com o código enviado pelo seu psicólogo para responder formulários e diários.
          </p>
        </header>
        <label style={{ fontSize: typography.sizes.xs, color: colors.text.secondary }}>
          Código de acesso
          <input
            style={{ ...inputStyle, marginTop: spacing.sm - 2 }}
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder="Ex.: 3f12ab45"
          />
        </label>
        <label style={{ fontSize: typography.sizes.xs, color: colors.text.secondary }}>
          E-mail
          <input
            style={{ ...inputStyle, marginTop: spacing.sm - 2 }}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seuemail@exemplo.com"
            type="email"
          />
        </label>
        {error ? (
          <p style={{ margin: 0, color: colors.status.danger, fontSize: typography.sizes.sm }}>{error}</p>
        ) : null}
        <button type="submit" style={buttonStyle}>
          Entrar
        </button>
      </form>
    </div>
  );
};
