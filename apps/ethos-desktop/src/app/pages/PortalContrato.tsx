import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { contractsService } from "../../services/contractsService";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0F172A",
  color: "#E2E8F0",
};

export const PortalContrato = () => {
  const { token } = useParams();
  const [acceptedBy, setAcceptedBy] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [contract, setContract] = useState(() => (token ? contractsService.getByPortalToken(token) : null));

  const displayStatus = useMemo(() => {
    if (!contract) return "Contrato não encontrado";
    if (contract.status === "draft") return "Contrato ainda não enviado";
    if (contract.status === "sent") return "Contrato aguardando assinatura";
    return "Contrato assinado";
  }, [contract]);

  const handleAccept = () => {
    if (!token) return;
    const signed = contractsService.sign(token, acceptedBy, "127.0.0.1");
    setContract(signed);
  };

  if (!contract) {
    return (
      <div style={{ minHeight: "100vh", background: "#0F172A", color: "#E2E8F0", padding: 32 }}>
        <h2>Portal do paciente</h2>
        <p style={{ color: "#94A3B8" }}>Contrato não encontrado ou link inválido.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#E2E8F0", padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h2>Portal do paciente</h2>
        <p style={{ color: "#94A3B8" }}>{displayStatus}</p>
      </header>

      <section style={{ background: "#111827", padding: 20, borderRadius: 16, display: "grid", gap: 16, maxWidth: 720 }}>
        <div>
          <strong>Psicólogo(a)</strong>
          <p style={{ margin: "4px 0", color: "#94A3B8" }}>
            {contract.psychologist.name} · {contract.psychologist.license}
          </p>
          <p style={{ margin: 0, color: "#94A3B8" }}>{contract.psychologist.email}</p>
        </div>
        <div>
          <strong>Paciente</strong>
          <p style={{ margin: "4px 0", color: "#94A3B8" }}>{contract.patient.name}</p>
          <p style={{ margin: 0, color: "#94A3B8" }}>{contract.patient.document}</p>
        </div>
        <div>
          <strong>Condições</strong>
          <ul style={{ margin: "8px 0", paddingLeft: 18, color: "#94A3B8" }}>
            <li>Valor: {contract.terms.value}</li>
            <li>Periodicidade: {contract.terms.periodicity}</li>
            <li>Política de faltas: {contract.terms.absencePolicy}</li>
            <li>Forma de pagamento: {contract.terms.paymentMethod}</li>
          </ul>
        </div>

        {contract.status !== "signed" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <p style={{ marginBottom: 6, color: "#94A3B8" }}>Nome para assinatura</p>
              <input value={acceptedBy} onChange={(event) => setAcceptedBy(event.target.value)} style={inputStyle} />
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#94A3B8" }}>
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
              Li e concordo com os termos do contrato terapêutico.
            </label>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!acknowledged || !acceptedBy}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                background: acknowledged && acceptedBy ? "#38BDF8" : "#334155",
                color: "#0F172A",
                fontWeight: 600,
                cursor: acknowledged && acceptedBy ? "pointer" : "not-allowed",
              }}
            >
              Assinar digitalmente
            </button>
          </div>
        ) : (
          <div style={{ background: "#0F172A", padding: 12, borderRadius: 12 }}>
            <strong>Assinatura registrada</strong>
            <p style={{ margin: "6px 0 0", color: "#94A3B8" }}>
              {contract.signature?.acceptedBy} · {contract.signature?.acceptedAt} · IP {contract.signature?.acceptedIp}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
