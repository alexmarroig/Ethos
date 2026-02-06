import React, { useState } from "react";

import { useAudioRecorder } from "../hooks/useAudioRecorder";

const sectionStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: "#111827",
  color: "#F9FAFB",
  marginBottom: 16,
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  background: "#3B82F6",
  color: "white",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#475569",
};

const outlineButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  border: "1px solid #475569",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#1E293B",
  color: "#E2E8F0",
  fontSize: 12,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
};

const modalStyle: React.CSSProperties = {
  background: "#0B1120",
  padding: 24,
  borderRadius: 16,
  width: "min(90vw, 420px)",
  border: "1px solid #1E293B",
  color: "#F8FAFC",
};

export const App = () => {
  const [consentGranted, setConsentGranted] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [draft, setDraft] = useState(
    "RASCUNHO — Em 15/02/2025, o profissional realizou sessão com a paciente. A paciente relatou dificuldades recentes em organizar a rotina e descreveu sensação de cansaço ao final do dia. O relato foi ouvido sem interpretações adicionais."
  );
  const [status, setStatus] = useState("draft");

  const recorder = useAudioRecorder({ sessionId: "session-marina-alves" });

  const handleStartRecording = async () => {
    if (!consentGranted) {
      setShowConsentModal(true);
      return;
    }
    await recorder.startRecording();
  };

  const handleConfirmConsent = async () => {
    setConsentGranted(true);
    setShowConsentModal(false);
    setConsentChecked(false);
    await recorder.startRecording();
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0F172A", minHeight: "100vh", padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#F8FAFC", fontSize: 28, marginBottom: 4 }}>ETHOS — Agenda Clínica</h1>
        <p style={{ color: "#94A3B8" }}>Fluxo offline com prontuário rascunho e validação explícita.</p>
      </header>
      {showConsentModal ? (
        <ConsentModal
          checked={consentChecked}
          onCheck={setConsentChecked}
          onCancel={() => {
            setShowConsentModal(false);
            setConsentChecked(false);
          }}
          onConfirm={handleConfirmConsent}
        />
      ) : null}

      <section style={sectionStyle}>
        <h2>Agenda semanal</h2>
        <p style={{ color: "#CBD5F5" }}>Segunda · 14:00 · Marina Alves</p>
        <p style={{ color: "#CBD5F5" }}>Terça · 09:30 · João Costa</p>
      </section>

      <section style={sectionStyle}>
        <h2>Sessão</h2>
        <p style={{ color: "#CBD5F5" }}>Paciente: Marina Alves</p>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button style={buttonStyle}>Importar áudio</button>
          <button
            style={recorder.status === "recording" ? { ...buttonStyle, background: "#EF4444" } : secondaryButtonStyle}
            onClick={recorder.status === "recording" ? recorder.stopRecording : handleStartRecording}
          >
            {recorder.status === "recording" ? "Parar gravação" : "Gravar áudio"}
          </button>
          {recorder.audioUrl ? (
            <button style={outlineButtonStyle} onClick={recorder.resetRecording}>
              Limpar gravação
            </button>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <span style={badgeStyle}>
            {recorder.status === "recording" ? "Gravando" : "Pronto para gravar"}
          </span>
          <span style={badgeStyle}>Tempo: {recorder.elapsedLabel}</span>
          {consentGranted ? <span style={badgeStyle}>Consentimento registrado</span> : null}
        </div>
        {recorder.errorMessage ? (
          <p style={{ color: "#FCA5A5", marginTop: 8 }}>Erro: {recorder.errorMessage}</p>
        ) : null}
        {recorder.audioUrl ? (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: "#E2E8F0", marginBottom: 8 }}>
              Áudio salvo {recorder.audioFilePath ? `em ${recorder.audioFilePath}` : "localmente"}.
            </p>
            <audio controls src={recorder.audioUrl} style={{ width: "100%" }} />
          </div>
        ) : null}
        <p style={{ color: "#94A3B8", marginTop: 8 }}>
          Status da transcrição: aguardando envio para o worker local.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Prontuário automático</h2>
        <p style={{ color: "#FBBF24", fontWeight: 600 }}>Status: {status === "draft" ? "Rascunho" : "Validado"}</p>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          style={{ width: "100%", minHeight: 140, marginTop: 12, borderRadius: 12, padding: 12 }}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button style={{ ...buttonStyle, background: "#22C55E" }} onClick={() => setStatus("validated")}>
            Validar prontuário
          </button>
          <button style={{ ...buttonStyle, background: "#6366F1" }}>Exportar DOCX</button>
          <button style={{ ...buttonStyle, background: "#6366F1" }}>Exportar PDF</button>
        </div>
      </section>
    </div>
  );
};

export const ConsentModal = ({
  checked,
  onCheck,
  onCancel,
  onConfirm,
}: {
  checked: boolean;
  onCheck: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <div style={modalBackdropStyle}>
    <div style={modalStyle}>
      <h3 style={{ marginTop: 0 }}>Confirmar consentimento</h3>
      <p style={{ color: "#CBD5F5" }}>
        Antes de iniciar a gravação, confirme que o paciente autorizou o registro de áudio.
      </p>
      <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#E2E8F0" }}>
        <input type="checkbox" checked={checked} onChange={(event) => onCheck(event.target.checked)} />
        Tenho consentimento explícito do paciente para gravar a sessão.
      </label>
      <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
        <button style={outlineButtonStyle} onClick={onCancel}>
          Cancelar
        </button>
        <button style={{ ...buttonStyle, background: checked ? "#22C55E" : "#334155" }} onClick={onConfirm} disabled={!checked}>
          Iniciar gravação
        </button>
      </div>
    </div>
  </div>
);
