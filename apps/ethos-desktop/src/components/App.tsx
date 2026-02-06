import React, { useState } from "react";
import { exportClinicalNote } from "../services/exportService";

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

export const App = () => {
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState(
    "RASCUNHO — Em 15/02/2025, o profissional realizou sessão com a paciente. A paciente relatou dificuldades recentes em organizar a rotina e descreveu sensação de cansaço ao final do dia. O relato foi ouvido sem interpretações adicionais."
  );
  const [status, setStatus] = useState<"draft" | "validated">("draft");
  const [validatedAt, setValidatedAt] = useState<string | null>(null);
  const [showEthicsModal, setShowEthicsModal] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "docx" | null>(null);

  const isValidated = status === "validated";
  const canValidate = consent && !isValidated;
  const canExport = isValidated && !exportingFormat;

  const handleValidate = () => {
    setShowEthicsModal(true);
  };

  const confirmValidation = () => {
    const now = new Date().toLocaleString("pt-BR");
    setStatus("validated");
    setValidatedAt(now);
    setShowEthicsModal(false);
  };

  const handleExport = async (format: "pdf" | "docx") => {
    setExportingFormat(format);
    setExportFeedback(null);
    const fileName = await exportClinicalNote(
      {
        patientName: "Marina Alves",
        clinicianName: "Dra. Ana Souza",
        sessionDate: "15/02/2025",
        status,
        noteText: draft,
        validatedAt: validatedAt ?? undefined,
      },
      format
    );
    setExportFeedback(`Arquivo gerado: ${fileName}`);
    setExportingFormat(null);
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0F172A", minHeight: "100vh", padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#F8FAFC", fontSize: 28, marginBottom: 4 }}>ETHOS — Agenda Clínica</h1>
        <p style={{ color: "#94A3B8" }}>Fluxo offline com prontuário rascunho e validação explícita.</p>
      </header>

      <section style={sectionStyle}>
        <h2>Agenda semanal</h2>
        <p style={{ color: "#CBD5F5" }}>Segunda · 14:00 · Marina Alves</p>
        <p style={{ color: "#CBD5F5" }}>Terça · 09:30 · João Costa</p>
      </section>

      <section style={sectionStyle}>
        <h2>Sessão</h2>
        <p style={{ color: "#CBD5F5" }}>Paciente: Marina Alves</p>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <button style={buttonStyle}>Importar áudio</button>
          <button style={{ ...buttonStyle, background: "#475569" }}>Gravar áudio</button>
        </div>
        <label style={{ display: "block", marginTop: 12, color: "#E2E8F0" }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />{" "}
          Tenho consentimento do paciente
        </label>
        <p style={{ color: "#94A3B8", marginTop: 8 }}>
          Status da transcrição: aguardando envio para o worker local.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2>Prontuário automático</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: status === "draft" ? "#FBBF24" : "#22C55E",
              color: "#0F172A",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {status === "draft" ? "Rascunho" : "Validado"}
          </span>
          <span style={{ color: "#94A3B8", fontSize: 14 }}>
            {isValidated ? `Bloqueado para edição · ${validatedAt ?? "Validado"}` : "Edição liberada até validação ética."}
          </span>
        </div>
        {isValidated && (
          <p style={{ color: "#38BDF8", fontSize: 14, marginBottom: 8 }}>
            Prontuário validado e congelado para assegurar integridade clínica.
          </p>
        )}
        <textarea
          value={draft}
          onChange={(event) => {
            if (!isValidated) {
              setDraft(event.target.value);
            }
          }}
          readOnly={isValidated}
          style={{
            width: "100%",
            minHeight: 140,
            marginTop: 12,
            borderRadius: 12,
            padding: 12,
            background: isValidated ? "#1E293B" : "#F8FAFC",
            color: isValidated ? "#E2E8F0" : "#0F172A",
          }}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            style={{
              ...buttonStyle,
              background: canValidate ? "#22C55E" : "#334155",
              cursor: canValidate ? "pointer" : "not-allowed",
            }}
            onClick={handleValidate}
            disabled={!canValidate}
          >
            Validar prontuário
          </button>
          <button
            style={{
              ...buttonStyle,
              background: canExport ? "#6366F1" : "#334155",
              cursor: canExport ? "pointer" : "not-allowed",
            }}
            onClick={() => handleExport("docx")}
            disabled={!canExport}
          >
            {exportingFormat === "docx" ? "Exportando DOCX..." : "Exportar DOCX"}
          </button>
          <button
            style={{
              ...buttonStyle,
              background: canExport ? "#6366F1" : "#334155",
              cursor: canExport ? "pointer" : "not-allowed",
            }}
            onClick={() => handleExport("pdf")}
            disabled={!canExport}
          >
            {exportingFormat === "pdf" ? "Exportando PDF..." : "Exportar PDF"}
          </button>
        </div>
        {!consent && (
          <p style={{ color: "#FCA5A5", marginTop: 8 }}>
            É necessário confirmar o consentimento do paciente para validar o prontuário.
          </p>
        )}
        {exportFeedback && (
          <p style={{ color: "#A7F3D0", marginTop: 8 }}>{exportFeedback}</p>
        )}
      </section>

      {showEthicsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "#111827",
              borderRadius: 16,
              padding: 24,
              maxWidth: 520,
              width: "100%",
              color: "#F8FAFC",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.35)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Confirmação ética</h3>
            <p style={{ color: "#CBD5F5" }}>
              Antes de validar, confirme que o registro está fiel ao relato do paciente, sem interpretações clínicas,
              que o consentimento foi obtido e que você está ciente do bloqueio permanente após a validação.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                style={{ ...buttonStyle, background: "#22C55E" }}
                onClick={confirmValidation}
              >
                Confirmar e validar
              </button>
              <button
                style={{ ...buttonStyle, background: "#475569" }}
                onClick={() => setShowEthicsModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
