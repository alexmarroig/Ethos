import React, { useState, useEffect } from "react";

/* Mobile-first: backdrop cobre safe area; modal ocupa largura útil */
const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
  background: "rgba(15, 23, 42, 0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};

const modalStyle: React.CSSProperties = {
  background: "#0B1120",
  padding: 20,
  borderRadius: 16,
  width: "100%",
  maxWidth: "min(calc(100vw - 24px), 520px)",
  margin: "auto",
  border: "1px solid #1E293B",
  color: "#F8FAFC",
  maxHeight: "calc(100vh - 32px)",
  maxHeight: "calc(100dvh - 32px)",
  overflowY: "auto",
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 20px",
  minHeight: 44,
  borderRadius: 12,
  border: "none",
  background: "#3B82F6",
  color: "white",
  cursor: "pointer",
  fontSize: 15,
};

const outlineButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  border: "1px solid #475569",
};

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  minHeight: 44,
  borderRadius: 10,
  border: "1px solid #1F2937",
  background: "#0B1120",
  color: "#E2E8F0",
  width: "100%",
  fontSize: 16,
  boxSizing: "border-box",
};

export function EthicsValidationModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div style={modalBackdropStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginTop: 0, fontSize: "1.15rem" }}>Confirmação ética</h3>
        <p style={{ color: "#CBD5F5", fontSize: 14 }}>
          Antes de validar, confirme que o registro está fiel ao relato do paciente, sem interpretações clínicas,
          que o consentimento foi obtido e que você está ciente do bloqueio permanente após a validação.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <button style={{ ...buttonStyle, background: "#22C55E", width: "100%" }} onClick={onConfirm} type="button">
            Confirmar e validar
          </button>
          <button style={{ ...outlineButtonStyle, width: "100%" }} onClick={onCancel} type="button">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function PatientModal({
  patient,
  onCancel,
  onSave
}: {
  patient?: any;
  onCancel: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    cpf: "",
    cep: "",
    address: "",
    supportNetwork: "",
    sessionPrice: 150.00,
    birthDate: "",
    notes: ""
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        fullName: patient.fullName || "",
        phoneNumber: patient.phoneNumber || "",
        cpf: patient.cpf || "",
        cep: patient.cep || "",
        address: patient.address || "",
        supportNetwork: patient.supportNetwork || "",
        sessionPrice: (patient.sessionPrice || 0) / 100,
        birthDate: patient.birthDate || "",
        notes: patient.notes || ""
      });
    }
  }, [patient]);

  return (
    <div style={modalBackdropStyle}>
      <div style={{ ...modalStyle, maxWidth: "min(calc(100vw - 24px), 600px)" }}>
        <h3 style={{ marginTop: 0, fontSize: "1.15rem" }}>{patient ? "Editar Paciente" : "Novo Paciente"}</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 12,
          }}
        >
          <label>
            Nome Completo
            <input
              style={inputStyle}
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            />
          </label>
          <label>
            CPF
            <input
              style={inputStyle}
              value={formData.cpf}
              onChange={e => setFormData({ ...formData, cpf: e.target.value })}
            />
          </label>
          <label>
            Telefone
            <input
              style={inputStyle}
              value={formData.phoneNumber}
              onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </label>
          <label>
            CEP
            <input
              style={inputStyle}
              value={formData.cep}
              onChange={e => setFormData({ ...formData, cep: e.target.value })}
            />
          </label>
          <label>
            Preço da Sessão (R$)
            <input
              type="number"
              inputMode="decimal"
              style={inputStyle}
              value={formData.sessionPrice}
              onChange={e => setFormData({ ...formData, sessionPrice: parseFloat(e.target.value) || 0 })}
            />
          </label>
          <label>
            Endereço
            <input
              style={inputStyle}
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </label>
          <label>
            Rede de Apoio (Contatos)
            <textarea
              style={{ ...inputStyle, minHeight: 72 }}
              value={formData.supportNetwork}
              onChange={e => setFormData({ ...formData, supportNetwork: e.target.value })}
            />
          </label>
          <label>
            Observações Iniciais
            <textarea
              style={{ ...inputStyle, minHeight: 72 }}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </label>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <button
            style={{ ...buttonStyle, width: "100%" }}
            onClick={() => onSave({
              ...formData,
              sessionPrice: Math.round(formData.sessionPrice * 100)
            })}
          >
            Salvar
          </button>
          <button style={{ ...outlineButtonStyle, width: "100%" }} onClick={onCancel}>Cancelar</button>
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

  return (
    <div style={modalBackdropStyle}>
      <div style={{ ...modalStyle, maxWidth: "min(calc(100vw - 24px), 420px)" }}>
        <h3 style={{ marginTop: 0, fontSize: "1.15rem" }}>Confirmar consentimento</h3>
        <p style={{ color: "#CBD5F5", fontSize: 14 }}>Antes de iniciar a gravação, confirme que o paciente autorizou o registro de áudio.</p>
        <label style={{ display: "flex", gap: 10, alignItems: "center", color: "#E2E8F0", fontSize: 14, minHeight: 44, cursor: "pointer" }}>
          <input type="checkbox" checked={checked} onChange={(event) => onCheck(event.target.checked)} style={{ minWidth: 20, minHeight: 20 }} />
          Tenho consentimento explícito do paciente para gravar a sessão.
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <button
            style={{ ...buttonStyle, background: checked ? "#22C55E" : "#334155", width: "100%" }}
            onClick={onConfirm}
            disabled={!checked}
            type="button"
          >
            Iniciar gravação
          </button>
          <button style={{ ...outlineButtonStyle, width: "100%" }} onClick={onCancel} type="button">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
