import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0F172A",
  color: "#E2E8F0",
  display: "flex",
};

const sidebarStyle: React.CSSProperties = {
  width: 220,
  background: "#111827",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const linkStyle: React.CSSProperties = {
  color: "#94A3B8",
  textDecoration: "none",
  padding: "8px 12px",
  borderRadius: 10,
};

const activeLinkStyle: React.CSSProperties = {
  color: "#F8FAFC",
  background: "#1E293B",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: 32,
};

export const AppLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div style={containerStyle}>
      <aside style={sidebarStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>ETHOS</h1>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 12 }}>Agenda clínica</p>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { to: "/home", label: "Home" },
            { to: "/agenda", label: "Agenda" },
            { to: "/sessao", label: "Sessão" },
            { to: "/contratos", label: "Contratos" },
            { to: "/pacientes", label: "Pacientes" },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => (isActive ? { ...linkStyle, ...activeLinkStyle } : linkStyle)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: "auto", fontSize: 12, color: "#94A3B8" }}>
          <p style={{ marginBottom: 8 }}>Logado como</p>
          <strong style={{ display: "block", color: "#E2E8F0" }}>{user?.name}</strong>
          <span>{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 10,
              border: "none",
              background: "#334155",
              color: "#E2E8F0",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Sair
          </button>
        </div>
      </aside>
      <main style={contentStyle}>
        <Outlet />
      </main>
    </div>
  );
};
