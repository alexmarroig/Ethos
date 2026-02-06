import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

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
        background: "#0F172A",
        color: "#F8FAFC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          padding: 32,
          background: "#111827",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Bem-vindo(a)</h1>
          <p style={{ margin: "8px 0 0", color: "#94A3B8" }}>Entre para acessar sua agenda segura.</p>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Nome
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #1E293B",
              background: "#0F172A",
              color: "#E2E8F0",
            }}
            required
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #1E293B",
              background: "#0F172A",
              color: "#E2E8F0",
            }}
            required
          />
        </label>
        <button
          type="submit"
          style={{
            padding: "12px",
            borderRadius: 12,
            border: "none",
            background: "#3B82F6",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
};
