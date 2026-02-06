import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, spacing, typography } from "../theme/tokens";

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState("Dra. Marina Alves");
  const [email, setEmail] = useState("marina@ethos.com");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login({ name, email });
    navigate("/home", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.background.canvas,
        color: colors.text.highlight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: typography.fontFamily,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          padding: spacing.xxl,
          background: colors.background.surface,
          borderRadius: radii.xl,
          display: "flex",
          flexDirection: "column",
          gap: spacing.lg,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Bem-vindo(a)</h1>
          <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.text.secondary }}>
            Entre para acessar sua agenda segura.
          </p>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: spacing.sm - 2 }}>
          Nome
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{
              padding: `${spacing.md - 2}px ${spacing.md}px`,
              borderRadius: radii.md,
              border: `1px solid ${colors.border.default}`,
              background: colors.background.canvas,
              color: colors.text.primary,
            }}
            required
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: spacing.sm - 2 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{
              padding: `${spacing.md - 2}px ${spacing.md}px`,
              borderRadius: radii.md,
              border: `1px solid ${colors.border.default}`,
              background: colors.background.canvas,
              color: colors.text.primary,
            }}
            required
          />
        </label>
        <button
          type="submit"
          style={{
            padding: `${spacing.md}px`,
            borderRadius: radii.lg,
            border: "none",
            background: colors.accent.strong,
            color: "white",
            cursor: "pointer",
            fontWeight: typography.weight.semibold,
          }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
};
