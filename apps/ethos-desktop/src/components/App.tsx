import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportClinicalNote } from "../services/exportService";
import { fetchAdminOverview, fetchAdminUsers } from "../services/controlPlaneAdmin";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { EthicsValidationModal, RecordingConsentModal, PatientModal } from "./Modals";
import { AdminPanel } from "./Admin";
import { FinancialSection, DiariesSection, ReportsSection, ConfigSection } from "./ClinicalSections";

const sectionStyle: React.CSSProperties = { borderRadius: 16, padding: 20, background: "#111827", color: "#F9FAFB", marginBottom: 16 };
const buttonStyle: React.CSSProperties = { padding: "10px 16px", borderRadius: 12, border: "none", background: "#3B82F6", color: "white", cursor: "pointer" };
const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #1F2937", background: "#0B1120", color: "#E2E8F0", width: "100%" };
const subtleText: React.CSSProperties = { color: "#94A3B8" };

const clinicalNavItems: any[] = [
  { id: "agenda", label: "Agenda" }, { id: "pacientes", label: "Pacientes" }, { id: "sessao", label: "Sessão" }, { id: "prontuario", label: "Prontuário" },
  { id: "financeiro", label: "Financeiro" }, { id: "diarios", label: "Diários" }, { id: "relatorios", label: "Relatórios" }, { id: "config", label: "Configurações" }
];

export const App = () => {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<"clinical" | "admin">("clinical");
  const [clinicalSection, setClinicalSection] = useState<any>("agenda");
  const [patients, setPatients] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setPatients(await window.ethos.patients.getAll());
    setSessions(await window.ethos.sessions.getAll());
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    const res = await window.ethos.auth.login({ email: e.target.email.value, password: e.target.password.value });
    if (res.success) setUser(res.user);
    else alert(res.message);
  };

  useEffect(() => { if (user) refreshData(); }, [user, refreshData]);

  if (!user) return (
    <div style={{ background: "#0F172A", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleLogin} style={{ ...sectionStyle, width: 400 }}>
        <h1>ETHOS V1</h1>
        <input style={inputStyle} name="email" placeholder="Email" required />
        <input style={inputStyle} name="password" type="password" placeholder="Senha" required />
        <button style={buttonStyle} type="submit">Entrar</button>
      </form>
    </div>
  );

  return (
    <div style={{ background: "#0F172A", minHeight: "100vh", padding: 32 }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div><button style={buttonStyle} onClick={() => setTab("clinical")}>Clínica</button><button style={buttonStyle} onClick={() => setTab("admin")}>Admin</button></div>
        <div style={{ textAlign: "right", color: "white" }}><strong>{user.fullName}</strong></div>
      </header>

      {tab === "clinical" ? (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
          <nav style={{ background: "#0B1222", padding: 16, borderRadius: 18 }}>
            {clinicalNavItems.map(item => <button key={item.id} style={{ display: "block", color: "white", padding: 8 }} onClick={() => setClinicalSection(item.id)}>{item.label}</button>)}
          </nav>
          <main>
            {clinicalSection === "agenda" && (
              <div style={sectionStyle}>
                <h2>Agenda</h2>
                {sessions.map(s => <div key={s.id} onClick={() => { setSelectedSessionId(s.id); setClinicalSection("sessao"); }} style={{ padding: 12, background: "#0B1120", cursor: "pointer" }}>{s.scheduledAt} - {s.status}</div>)}
              </div>
            )}
            {clinicalSection === "financeiro" && <FinancialSection patients={patients} financialEntries={[]} refreshData={refreshData} />}
            {clinicalSection === "config" && <ConfigSection whatsappTemplate="" setWhatsappTemplate={() => {}} refreshData={refreshData} />}
          </main>
        </div>
      ) : (
        <section style={sectionStyle}><AdminPanel metrics={null} users={[]} /></section>
      )}
    </div>
  );
};
