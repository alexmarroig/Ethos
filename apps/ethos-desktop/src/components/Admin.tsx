import React from "react";
import { AdminOverviewMetrics, AdminUser } from "../services/controlPlaneAdmin";

const subtleText: React.CSSProperties = { color: "#94A3B8" };

export function AdminPanel({ metrics, users }: { metrics: AdminOverviewMetrics | null; users: AdminUser[] }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard label="Usuários ativos" value={metrics?.users_total ?? "--"} />
        <StatCard label="Eventos de telemetria" value={metrics?.telemetry_total ?? "--"} />
      </div>

      <div>
        <h3 style={{ marginBottom: 8 }}>Usuários (sanitizado)</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {users.length === 0 ? (
            <p style={subtleText}>Nenhum usuário encontrado.</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr",
                  gap: 12,
                  padding: 12,
                  background: "#0B1120",
                  borderRadius: 12,
                }}
              >
                <div>
                  <p style={{ color: "#E2E8F0", marginBottom: 2 }}>{user.email}</p>
                  <p style={{ ...subtleText, fontSize: 12 }}>ID: {user.id}</p>
                </div>
                <div>
                  <p style={{ ...subtleText, fontSize: 12 }}>Role</p>
                  <p style={{ color: "#E2E8F0" }}>{user.role}</p>
                </div>
                <div>
                  <p style={{ ...subtleText, fontSize: 12 }}>Status</p>
                  <p style={{ color: "#E2E8F0" }}>{user.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: "#0B1120", padding: 16, borderRadius: 12, minWidth: 180 }}>
      <p style={subtleText}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700 }}>{value}</p>
    </div>
  );
}
