import React, { useState } from "react";
import { AdminOverviewMetrics, AdminUser } from "../services/controlPlaneAdmin";

const subtleText: React.CSSProperties = { color: "#94A3B8" };

const buttonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "#3B82F6",
  color: "white",
  cursor: "pointer",
  fontSize: 12
};

export function AdminPanel({ metrics, users }: { metrics: AdminOverviewMetrics | null; users: AdminUser[] }) {
  const [activeTab, setActiveTab] = useState<"metrics" | "lab">("metrics");

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #1E293B", paddingBottom: 12 }}>
        <button
          style={{ ...buttonStyle, background: activeTab === "metrics" ? "#6366F1" : "#1E293B" }}
          onClick={() => setActiveTab("metrics")}
        >
          Métricas
        </button>
        <button
          style={{ ...buttonStyle, background: activeTab === "lab" ? "#6366F1" : "#1E293B" }}
          onClick={() => setActiveTab("lab")}
        >
          Test Lab
        </button>
      </div>

      {activeTab === "metrics" ? (
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
      ) : (
        <TestLab />
      )}
    </div>
  );
}

type TestStep = {
  name: string;
  status: "idle" | "running" | "success" | "error";
  latency?: number;
  error?: string;
};

function TestLab() {
  const [steps, setSteps] = useState<TestStep[]>([
    { name: "Criação de Paciente de Teste", status: "idle" },
    { name: "Agendamento de Sessão", status: "idle" },
    { name: "Geração de Nota Clínica (IA)", status: "idle" },
    { name: "Exportação de PDF", status: "idle" },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const newSteps = [...steps].map(s => ({ ...s, status: "idle" as const, latency: undefined, error: undefined }));
    setSteps(newSteps);

    let testPatient: any = null;
    let testSession: any = null;

    // 1. Create Patient
    try {
      const start = Date.now();
      updateStep(0, "running");
      testPatient = await window.ethos.patients.create({
        fullName: `TESTE ADMIN LAB ${Date.now()}`,
        cpf: "000.000.000-00",
        notes: "Paciente criado via Test Lab"
      });
      updateStep(0, "success", Date.now() - start);
    } catch (e: any) {
      updateStep(0, "error", undefined, e.message);
      setIsRunning(false);
      return;
    }

    // 2. Schedule Session
    try {
      const start = Date.now();
      updateStep(1, "running");
      testSession = await window.ethos.sessions.create({
        patientId: testPatient.id,
        scheduledAt: new Date().toISOString(),
        status: "scheduled"
      });
      updateStep(1, "success", Date.now() - start);
    } catch (e: any) {
      updateStep(1, "error", undefined, e.message);
      setIsRunning(false);
      return;
    }

    // 3. Generate Note
    try {
      const start = Date.now();
      updateStep(2, "running");
      const generated = await window.ethos.genai.transformNote({
        transcriptText: "Teste de integridade do laboratório admin. O sistema está respondendo corretamente.",
        sessionId: testSession.id,
        templateType: "prontuario"
      });
      await window.ethos.notes.upsertDraft(testSession.id, generated);
      updateStep(2, "success", Date.now() - start);
    } catch (e: any) {
      updateStep(2, "error", undefined, e.message);
      setIsRunning(false);
      return;
    }

    // 4. Export PDF
    try {
      const start = Date.now();
      updateStep(3, "running");
      const text = `TESTE LAB - PDF INTEGRITY CHECK\nPaciente: ${testPatient.fullName}\nStatus: OK`;
      await window.ethos.export.pdf(text, `TEST_LAB_EXPORT`);
      updateStep(3, "success", Date.now() - start);
    } catch (e: any) {
      updateStep(3, "error", undefined, e.message);
      setIsRunning(false);
      return;
    }

    setIsRunning(false);
  };

  const updateStep = (index: number, status: TestStep["status"], latency?: number, error?: string) => {
    setSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status, latency, error };
      return next;
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Automated Integrity Check</h3>
        <button
          style={{ ...buttonStyle, background: "#10B981" }}
          disabled={isRunning}
          onClick={runTests}
        >
          {isRunning ? "Running..." : "Iniciar Auto-Test"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              background: "#0B1120",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #1E293B",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: "#E2E8F0" }}>{step.name}</p>
              {step.error && <p style={{ margin: "4px 0 0", color: "#F87171", fontSize: 12 }}>Erro: {step.error}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{
                color: step.status === "success" ? "#10B981" : step.status === "error" ? "#F87171" : "#94A3B8",
                fontWeight: 700,
                fontSize: 12
              }}>
                {step.status.toUpperCase()}
              </span>
              {step.latency !== undefined && (
                <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 11 }}>{step.latency}ms</p>
              )}
            </div>
          </div>
        ))}
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
