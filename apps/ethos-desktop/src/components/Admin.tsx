import React from "react";
import { AdminOverviewMetrics, AdminUser } from "../services/controlPlaneAdmin";

const subtleText: React.CSSProperties = { color: "#94A3B8" };

export function AdminPanel({ metrics, users }: { metrics: AdminOverviewMetrics | null; users: AdminUser[] }) {
  return (
    <div style={{ display: "grid", gap: 16, width: "100%" }}>
      <div className="admin-stats">
        <StatCard label="Usuários ativos" value={metrics?.users_total ?? "--"} />
        <StatCard label="Eventos de telemetria" value={metrics?.telemetry_total ?? "--"} />
      </div>

      <div>
        <h3 style={{ marginBottom: 8, fontSize: "1rem" }}>Usuários (sanitizado)</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {users.length === 0 ? (
            <p style={subtleText}>Nenhum usuário encontrado.</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 10,
                  padding: 14,
                  background: "#0B1120",
                  borderRadius: 12,
                  border: "1px solid #1E293B",
                }}
              >
                <div>
                  <p style={{ color: "#E2E8F0", marginBottom: 2, wordBreak: "break-word" }}>{user.email}</p>
                  <p style={{ ...subtleText, fontSize: 12 }}>ID: {user.id}</p>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ ...subtleText, fontSize: 12, margin: 0 }}>Role</p>
                    <p style={{ color: "#E2E8F0", margin: 0 }}>{user.role}</p>
                  </div>
                  <div>
                    <p style={{ ...subtleText, fontSize: 12, margin: 0 }}>Status</p>
                    <p style={{ color: "#E2E8F0", margin: 0 }}>{user.status}</p>
                  </div>
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
    <div style={{ background: "#0B1120", padding: 16, borderRadius: 12, width: "100%", border: "1px solid #1E293B", boxSizing: "border-box" }}>
      <p style={{ ...subtleText, margin: 0, fontSize: 13 }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: "4px 0 0 0" }}>{value}</p>
    </div>
  );
}
