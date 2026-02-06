import React, { useMemo, useState } from "react";
import { contractsService, type Contract } from "../../services/contractsService";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0F172A",
  color: "#E2E8F0",
};

const labelStyle: React.CSSProperties = { fontSize: 12, color: "#94A3B8" };

export const Contratos = () => {
  const [contracts, setContracts] = useState(() => contractsService.list());
  const [formState, setFormState] = useState({
    psychologistName: "Dra. Camila Souza",
    psychologistLicense: "CRP 00/00000",
    psychologistEmail: "camila@ethos.local",
    psychologistPhone: "(11) 99999-0000",
    patientName: "",
    patientEmail: "",
    patientDocument: "",
    value: "R$ 220,00 por sessão",
    periodicity: "Semanal",
    absencePolicy: "Faltas sem aviso prévio (24h) são cobradas.",
    paymentMethod: "PIX ou transferência bancária",
  });

  const stats = useMemo(() => {
    return {
      draft: contracts.filter((contract) => contract.status === "draft").length,
      sent: contracts.filter((contract) => contract.status === "sent").length,
      signed: contracts.filter((contract) => contract.status === "signed").length,
    };
  }, [contracts]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreate = () => {
    const created = contractsService.create({
      patient: {
        name: formState.patientName,
        email: formState.patientEmail,
        document: formState.patientDocument,
      },
      psychologist: {
        name: formState.psychologistName,
        license: formState.psychologistLicense,
        email: formState.psychologistEmail,
        phone: formState.psychologistPhone,
      },
      terms: {
        value: formState.value,
        periodicity: formState.periodicity,
        absencePolicy: formState.absencePolicy,
        paymentMethod: formState.paymentMethod,
      },
    });
    setContracts(contractsService.list());
    setFormState((prev) => ({
      ...prev,
      patientName: "",
      patientEmail: "",
      patientDocument: "",
    }));
    return created;
  };

  const handleSend = (id: string) => {
    contractsService.send(id);
    setContracts(contractsService.list());
  };

  const handleExport = (contract: Contract, format: "pdf" | "docx") => {
    const payload = contractsService.export(contract.id, format);
    if (!payload) return;
    window.alert(`Exportação ${payload.format.toUpperCase()} gerada: ${payload.filename} (${payload.generatedAt})`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Contratos terapêuticos</h2>
        <p style={{ color: "#94A3B8" }}>
          Crie contratos com campos globais do psicólogo e paciente, personalize termos e envie para aceite digital.
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {[
          { label: "Rascunhos", value: stats.draft },
          { label: "Enviados", value: stats.sent },
          { label: "Assinados", value: stats.signed },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "#111827", padding: 16, borderRadius: 14 }}>
            <p style={{ margin: 0, color: "#94A3B8" }}>{stat.label}</p>
            <strong style={{ fontSize: 24 }}>{stat.value}</strong>
          </div>
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20 }}>
        <div style={{ background: "#111827", padding: 20, borderRadius: 16, display: "grid", gap: 16 }}>
          <h3 style={{ margin: 0 }}>Novo contrato</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <p style={labelStyle}>Psicólogo(a)</p>
              <input value={formState.psychologistName} onChange={handleChange("psychologistName")} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div>
                <p style={labelStyle}>CRP</p>
                <input value={formState.psychologistLicense} onChange={handleChange("psychologistLicense")} style={inputStyle} />
              </div>
              <div>
                <p style={labelStyle}>Telefone</p>
                <input value={formState.psychologistPhone} onChange={handleChange("psychologistPhone")} style={inputStyle} />
              </div>
            </div>
            <div>
              <p style={labelStyle}>Email profissional</p>
              <input value={formState.psychologistEmail} onChange={handleChange("psychologistEmail")} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <p style={labelStyle}>Paciente</p>
              <input value={formState.patientName} onChange={handleChange("patientName")} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div>
                <p style={labelStyle}>Documento</p>
                <input value={formState.patientDocument} onChange={handleChange("patientDocument")} style={inputStyle} />
              </div>
              <div>
                <p style={labelStyle}>Email</p>
                <input value={formState.patientEmail} onChange={handleChange("patientEmail")} style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <p style={labelStyle}>Valor</p>
              <input value={formState.value} onChange={handleChange("value")} style={inputStyle} />
            </div>
            <div>
              <p style={labelStyle}>Periodicidade</p>
              <input value={formState.periodicity} onChange={handleChange("periodicity")} style={inputStyle} />
            </div>
            <div>
              <p style={labelStyle}>Política de faltas</p>
              <textarea value={formState.absencePolicy} onChange={handleChange("absencePolicy")} style={{ ...inputStyle, minHeight: 80 }} />
            </div>
            <div>
              <p style={labelStyle}>Forma de pagamento</p>
              <input value={formState.paymentMethod} onChange={handleChange("paymentMethod")} style={inputStyle} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#38BDF8",
              color: "#0F172A",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Criar contrato
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {contracts.map((contract) => (
            <div key={contract.id} style={{ background: "#111827", padding: 20, borderRadius: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{contract.patient.name || "Paciente sem nome"}</strong>
                  <p style={{ margin: "4px 0 0", color: "#94A3B8" }}>Contrato #{contract.id}</p>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#1E293B", color: "#E2E8F0", fontSize: 12 }}>
                  {contract.status === "draft" ? "Rascunho" : contract.status === "sent" ? "Enviado" : "Assinado"}
                </span>
              </div>

              <div style={{ display: "grid", gap: 6, color: "#94A3B8" }}>
                <span>Valor: {contract.terms.value}</span>
                <span>Periodicidade: {contract.terms.periodicity}</span>
                <span>Política de faltas: {contract.terms.absencePolicy}</span>
                <span>Pagamento: {contract.terms.paymentMethod}</span>
              </div>

              {contract.status !== "signed" && (
                <button
                  type="button"
                  onClick={() => handleSend(contract.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: "#22D3EE",
                    color: "#0F172A",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Enviar para paciente
                </button>
              )}

              {contract.portalToken && (
                <div style={{ background: "#0F172A", padding: 12, borderRadius: 12 }}>
                  <p style={{ margin: 0, color: "#94A3B8", fontSize: 12 }}>Portal do paciente</p>
                  <strong style={{ fontSize: 12 }}>{`/portal/contrato/${contract.portalToken}`}</strong>
                </div>
              )}

              {contract.signature && (
                <div style={{ background: "#0F172A", padding: 12, borderRadius: 12, display: "grid", gap: 4 }}>
                  <strong>Assinatura registrada</strong>
                  <span style={{ color: "#94A3B8", fontSize: 12 }}>
                    {contract.signature.acceptedBy} · {contract.signature.acceptedAt} · IP {contract.signature.acceptedIp}
                  </span>
                  <span style={{ color: "#94A3B8", fontSize: 12 }}>
                    Registrado no prontuário em {contract.recordedInChartAt}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleExport(contract, "pdf")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #334155",
                    background: "transparent",
                    color: "#E2E8F0",
                    cursor: "pointer",
                  }}
                >
                  Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(contract, "docx")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #334155",
                    background: "transparent",
                    color: "#E2E8F0",
                    cursor: "pointer",
                  }}
                >
                  Exportar DOCX
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
