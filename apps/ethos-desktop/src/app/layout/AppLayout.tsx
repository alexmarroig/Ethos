import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, spacing, typography } from "../theme/tokens";

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: colors.background.canvas,
  color: colors.text.primary,
  display: "flex",
  fontFamily: typography.fontFamily,
};

const sidebarStyle: React.CSSProperties = {
  width: 220,
  background: colors.background.surface,
  padding: spacing.xl,
  display: "flex",
  flexDirection: "column",
  gap: spacing.md,
};

const linkStyle: React.CSSProperties = {
  color: colors.text.secondary,
  textDecoration: "none",
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderRadius: radii.md,
};

const activeLinkStyle: React.CSSProperties = {
  color: colors.text.highlight,
  background: colors.background.surfaceAlt,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: spacing.xxl,
};

export const AppLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div style={containerStyle}>
      <aside style={sidebarStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: typography.sizes.xl }}>ETHOS</h1>
          <p
            style={{
              margin: `${spacing.sm - 2}px 0 0`,
              color: colors.text.muted,
              fontSize: typography.sizes.xs,
            }}
          >
            Agenda clínica
          </p>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
          {[
            { to: "/home", label: "Home" },
            { to: "/agenda", label: "Agenda" },
            { to: "/sessao", label: "Sessão" },
            { to: "/gravador", label: "Gravador" },
            { to: "/contratos", label: "Contratos" },
            { to: "/pacientes", label: "Pacientes" },
            { to: "/formularios", label: "Formulários" },
            { to: "/templates", label: "Templates" },
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
        <div style={{ marginTop: "auto", fontSize: typography.sizes.xs, color: colors.text.secondary }}>
          <p style={{ marginBottom: spacing.sm }}>Logado como</p>
          <strong style={{ display: "block", color: colors.text.primary }}>{user?.name}</strong>
          <span>{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            style={{
              marginTop: spacing.md,
              padding: `${spacing.sm}px ${spacing.md}px`,
              borderRadius: radii.md,
              border: "none",
              background: colors.background.surfaceRaised,
              color: colors.text.primary,
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
