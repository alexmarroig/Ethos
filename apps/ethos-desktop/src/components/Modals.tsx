import React from "react";

// Styles from App.tsx (duplicated for now or could be shared)
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
  width: "min(90vw, 520px)",
  border: "1px solid #1E293B",
  color: "#F8FAFC",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  background: "#3B82F6",
  color: "white",
  cursor: "pointer",
};

const outlineButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  border: "1px solid #475569",
};

export function EthicsValidationModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div style={modalBackdropStyle}>
      <div style={{ ...modalStyle, width: "min(90vw, 520px)" }}>
        <h3 style={{ marginTop: 0 }}>Confirmação ética</h3>
        <p style={{ color: "#CBD5F5" }}>
          Antes de validar, confirme que o registro está fiel ao relato do paciente, sem interpretações clínicas,
          que o consentimento foi obtido e que você está ciente do bloqueio permanente após a validação.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button style={outlineButtonStyle} onClick={onCancel} type="button">
            Cancelar
          </button>
          <button style={{ ...buttonStyle, background: "#22C55E" }} onClick={onConfirm} type="button">
            Confirmar e validar
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecordingConsentModal(props: {
  checked: boolean;
  onCheck: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { checked, onCheck, onCancel, onConfirm } = props;

  const compactModalStyle: React.CSSProperties = {
    ...modalStyle,
    width: "min(90vw, 420px)",
  };

  return (
    <div style={modalBackdropStyle}>
      <div style={compactModalStyle}>
        <h3 style={{ marginTop: 0 }}>Confirmar consentimento</h3>
        <p style={{ color: "#CBD5F5" }}>Antes de iniciar a gravação, confirme que o paciente autorizou o registro de áudio.</p>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#E2E8F0" }}>
          <input type="checkbox" checked={checked} onChange={(event) => onCheck(event.target.checked)} />
          Tenho consentimento explícito do paciente para gravar a sessão.
        </label>
        <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
          <button style={outlineButtonStyle} onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            style={{ ...buttonStyle, background: checked ? "#22C55E" : "#334155" }}
            onClick={onConfirm}
            disabled={!checked}
            type="button"
          >
            Iniciar gravação
          </button>
        </div>
      </div>
    </div>
  );
}
