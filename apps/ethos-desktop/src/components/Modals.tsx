import React, { useState, useEffect } from "react";

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

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #1F2937",
  background: "#0B1120",
  color: "#E2E8F0",
  width: "100%",
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
    isProBono: false,
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
        isProBono: !!patient.isProBono,
        birthDate: patient.birthDate || "",
        notes: patient.notes || ""
      });
    }
  }, [patient]);

  return (
    <div style={modalBackdropStyle}>
      <div style={{ ...modalStyle, width: "min(95vw, 600px)", maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ marginTop: 0 }}>{patient ? "Editar Paciente" : "Novo Paciente"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ gridColumn: "span 2" }}>
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
              style={inputStyle}
              disabled={formData.isProBono}
              value={formData.isProBono ? 0 : formData.sessionPrice}
              onChange={e => setFormData({ ...formData, sessionPrice: parseFloat(e.target.value) })}
            />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 24 }}>
            <input
              type="checkbox"
              checked={formData.isProBono}
              onChange={e => setFormData({ ...formData, isProBono: e.target.checked })}
            />
            <span style={{ fontSize: 14 }}>Isento / Pro-bono</span>
          </label>
          <label style={{ gridColumn: "span 2" }}>
            Endereço
            <input
              style={inputStyle}
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </label>
          <label style={{ gridColumn: "span 2" }}>
            Rede de Apoio (Contatos)
            <textarea
              style={{ ...inputStyle, minHeight: 60 }}
              value={formData.supportNetwork}
              onChange={e => setFormData({ ...formData, supportNetwork: e.target.value })}
            />
          </label>
          <label style={{ gridColumn: "span 2" }}>
            Observações Iniciais
            <textarea
              style={{ ...inputStyle, minHeight: 60 }}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
          <button style={outlineButtonStyle} onClick={onCancel}>Cancelar</button>
          <button
            style={buttonStyle}
            onClick={() => onSave({
              ...formData,
              sessionPrice: formData.isProBono ? 0 : Math.round(formData.sessionPrice * 100),
              isProBono: formData.isProBono ? 1 : 0
            })}
          >
            Salvar
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
