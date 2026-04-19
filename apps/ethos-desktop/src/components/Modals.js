"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthicsValidationModal = EthicsValidationModal;
exports.PatientModal = PatientModal;
exports.RecordingConsentModal = RecordingConsentModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
// Styles from App.tsx (duplicated for now or could be shared)
const modalBackdropStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
};
const modalStyle = {
    background: "#0B1120",
    padding: 24,
    borderRadius: 16,
    width: "min(90vw, 520px)",
    border: "1px solid #1E293B",
    color: "#F8FAFC",
};
const buttonStyle = {
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "#3B82F6",
    color: "white",
    cursor: "pointer",
};
const outlineButtonStyle = {
    ...buttonStyle,
    background: "transparent",
    border: "1px solid #475569",
};
const inputStyle = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #1F2937",
    background: "#0B1120",
    color: "#E2E8F0",
    width: "100%",
};
function EthicsValidationModal({ onCancel, onConfirm }) {
    return ((0, jsx_runtime_1.jsx)("div", { style: modalBackdropStyle, children: (0, jsx_runtime_1.jsxs)("div", { style: { ...modalStyle, width: "min(90vw, 520px)" }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { marginTop: 0 }, children: "Confirma\u00E7\u00E3o \u00E9tica" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#CBD5F5" }, children: "Antes de validar, confirme que o registro est\u00E1 fiel ao relato do paciente, sem interpreta\u00E7\u00F5es cl\u00EDnicas, que o consentimento foi obtido e que voc\u00EA est\u00E1 ciente do bloqueio permanente ap\u00F3s a valida\u00E7\u00E3o." }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }, children: [(0, jsx_runtime_1.jsx)("button", { style: outlineButtonStyle, onClick: onCancel, type: "button", children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { style: { ...buttonStyle, background: "#22C55E" }, onClick: onConfirm, type: "button", children: "Confirmar e validar" })] })] }) }));
}
function PatientModal({ patient, onCancel, onSave }) {
    const [formData, setFormData] = (0, react_1.useState)({
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
    (0, react_1.useEffect)(() => {
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
    return ((0, jsx_runtime_1.jsx)("div", { style: modalBackdropStyle, children: (0, jsx_runtime_1.jsxs)("div", { style: { ...modalStyle, width: "min(95vw, 600px)", maxHeight: "90vh", overflowY: "auto" }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { marginTop: 0 }, children: patient ? "Editar Paciente" : "Novo Paciente" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { gridColumn: "span 2" }, children: ["Nome Completo", (0, jsx_runtime_1.jsx)("input", { style: inputStyle, value: formData.fullName, onChange: e => setFormData({ ...formData, fullName: e.target.value }) })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["CPF", (0, jsx_runtime_1.jsx)("input", { style: inputStyle, value: formData.cpf, onChange: e => setFormData({ ...formData, cpf: e.target.value }) })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Telefone", (0, jsx_runtime_1.jsx)("input", { style: inputStyle, value: formData.phoneNumber, onChange: e => setFormData({ ...formData, phoneNumber: e.target.value }) })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["CEP", (0, jsx_runtime_1.jsx)("input", { style: inputStyle, value: formData.cep, onChange: e => setFormData({ ...formData, cep: e.target.value }) })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Pre\u00E7o da Sess\u00E3o (R$)", (0, jsx_runtime_1.jsx)("input", { type: "number", style: inputStyle, value: formData.sessionPrice, onChange: e => setFormData({ ...formData, sessionPrice: parseFloat(e.target.value) }) })] }), (0, jsx_runtime_1.jsxs)("label", { style: { gridColumn: "span 2" }, children: ["Endere\u00E7o", (0, jsx_runtime_1.jsx)("input", { style: inputStyle, value: formData.address, onChange: e => setFormData({ ...formData, address: e.target.value }) })] }), (0, jsx_runtime_1.jsxs)("label", { style: { gridColumn: "span 2" }, children: ["Rede de Apoio (Contatos)", (0, jsx_runtime_1.jsx)("textarea", { style: { ...inputStyle, minHeight: 60 }, value: formData.supportNetwork, onChange: e => setFormData({ ...formData, supportNetwork: e.target.value }) })] }), (0, jsx_runtime_1.jsxs)("label", { style: { gridColumn: "span 2" }, children: ["Observa\u00E7\u00F5es Iniciais", (0, jsx_runtime_1.jsx)("textarea", { style: { ...inputStyle, minHeight: 60 }, value: formData.notes, onChange: e => setFormData({ ...formData, notes: e.target.value }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }, children: [(0, jsx_runtime_1.jsx)("button", { style: outlineButtonStyle, onClick: onCancel, children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { style: buttonStyle, onClick: () => onSave({
                                ...formData,
                                sessionPrice: Math.round(formData.sessionPrice * 100)
                            }), children: "Salvar" })] })] }) }));
}
function RecordingConsentModal(props) {
    const { checked, onCheck, onCancel, onConfirm } = props;
    const compactModalStyle = {
        ...modalStyle,
        width: "min(90vw, 420px)",
    };
    return ((0, jsx_runtime_1.jsx)("div", { style: modalBackdropStyle, children: (0, jsx_runtime_1.jsxs)("div", { style: compactModalStyle, children: [(0, jsx_runtime_1.jsx)("h3", { style: { marginTop: 0 }, children: "Confirmar consentimento" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#CBD5F5" }, children: "Antes de iniciar a grava\u00E7\u00E3o, confirme que o paciente autorizou o registro de \u00E1udio." }), (0, jsx_runtime_1.jsxs)("label", { style: { display: "flex", gap: 8, alignItems: "center", color: "#E2E8F0" }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: checked, onChange: (event) => onCheck(event.target.checked) }), "Tenho consentimento expl\u00EDcito do paciente para gravar a sess\u00E3o."] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end" }, children: [(0, jsx_runtime_1.jsx)("button", { style: outlineButtonStyle, onClick: onCancel, type: "button", children: "Cancelar" }), (0, jsx_runtime_1.jsx)("button", { style: { ...buttonStyle, background: checked ? "#22C55E" : "#334155" }, onClick: onConfirm, disabled: !checked, type: "button", children: "Iniciar grava\u00E7\u00E3o" })] })] }) }));
}
