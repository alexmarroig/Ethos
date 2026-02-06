import React, { useMemo, useState } from "react";
import { templatesService, type ClinicalTemplate, type TemplateGlobals } from "../../services/templatesService";

const sectionStyle: React.CSSProperties = {
  background: "#111827",
  borderRadius: 16,
  padding: 20,
  border: "1px solid #1F2937",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "#CBD5F5",
};

const inputStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#0F172A",
  color: "#E2E8F0",
  padding: "8px 12px",
};

const buttonStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "none",
  background: "#2563EB",
  color: "#F8FAFC",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

const mutedButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#334155",
};

const templateDefaults = (): Omit<ClinicalTemplate, "id"> => ({
  title: "Novo template clínico",
  description: "Personalize conforme a Resolução CFP nº 06/2019.",
  version: 1,
  html: `
    <h2 style="text-align:center;">Novo template clínico</h2>
    <p>Paciente: {{patient.name}} ({{patient.document}}).</p>
    <p>Descrição: {{summary}}</p>
    <p style="margin-top:40px;">{{city}}, {{date}}.</p>
    <p style="margin-top:40px;">{{signature}}</p>
    <p>{{psychologist.name}} - CRP {{psychologist.crp}}</p>
  `,
  fields: [
    { key: "psychologist.name", label: "Nome do(a) psicólogo(a)", type: "text", scope: "global", required: true },
    { key: "psychologist.crp", label: "CRP", type: "text", scope: "global", required: true },
    { key: "patient.name", label: "Nome do paciente", type: "text", scope: "global", required: true },
    { key: "patient.document", label: "Documento do paciente", type: "text", scope: "global" },
    { key: "city", label: "Cidade", type: "text", scope: "global", required: true },
    { key: "date", label: "Data", type: "date", scope: "global", required: true },
    { key: "signature", label: "Assinatura", type: "text", scope: "global", required: true },
    { key: "summary", label: "Resumo", type: "textarea", scope: "document", required: true },
  ],
});

const emptyGlobals: TemplateGlobals = {
  psychologist: { name: "", crp: "" },
  patient: { name: "", document: "" },
  city: "",
  date: new Date().toISOString().slice(0, 10),
  signature: "",
};

const buildInitialFields = (template?: ClinicalTemplate) => {
  if (!template) return {};
  const values: Record<string, string> = {};
  template.fields
    .filter((field) => field.scope === "document")
    .forEach((field) => {
      values[field.key] = "";
    });
  return values;
};

export const Templates = () => {
  const [templates, setTemplates] = useState(() => templatesService.list());
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [globals, setGlobals] = useState<TemplateGlobals>(emptyGlobals);
  const [fields, setFields] = useState<Record<string, string>>(() => buildInitialFields(templates[0]));
  const [htmlDraft, setHtmlDraft] = useState(templates[0]?.html ?? "");

  const selectedTemplate = useMemo(() => templates.find((item) => item.id === selectedId), [templates, selectedId]);

  const previewHtml = useMemo(() => {
    if (!selectedTemplate) return "";
    return templatesService.render({ ...selectedTemplate, html: htmlDraft }, globals, fields);
  }, [fields, globals, htmlDraft, selectedTemplate]);

  const handleSelect = (id: string) => {
    const template = templates.find((item) => item.id === id);
    setSelectedId(id);
    if (template) {
      setFields(buildInitialFields(template));
      setHtmlDraft(template.html);
    }
  };

  const handleCreate = () => {
    const created = templatesService.create(templateDefaults());
    const updated = templatesService.list();
    setTemplates(updated);
    handleSelect(created.id);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    templatesService.update(selectedTemplate.id, { html: htmlDraft });
    setTemplates(templatesService.list());
  };

  const handleDelete = () => {
    if (!selectedTemplate) return;
    templatesService.remove(selectedTemplate.id);
    const updated = templatesService.list();
    setTemplates(updated);
    setSelectedId(updated[0]?.id ?? "");
    setFields(buildInitialFields(updated[0]));
    setHtmlDraft(updated[0]?.html ?? "");
  };

  const handleExport = (format: "pdf" | "docx") => {
    const blob = new Blob([previewHtml], {
      type: format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTemplate?.title ?? "template"}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Templates clínicos</h2>
        <p style={{ margin: 0, color: "#94A3B8" }}>
          Edite modelos alinhados à Resolução CFP nº 06/2019, com campos globais e específicos por documento.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
        <section style={sectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Modelos disponíveis</h3>
            <button type="button" style={buttonStyle} onClick={handleCreate}>
              Novo template
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelect(template.id)}
                style={{
                  ...mutedButtonStyle,
                  textAlign: "left",
                  background: selectedId === template.id ? "#1D4ED8" : "#334155",
                }}
              >
                <strong style={{ display: "block" }}>{template.title}</strong>
                <span style={{ fontSize: 12, color: "#E2E8F0" }}>{template.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section style={sectionStyle}>
          {selectedTemplate ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedTemplate.title}</h3>
                  <p style={{ margin: 0, color: "#94A3B8" }}>{selectedTemplate.description}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={mutedButtonStyle} onClick={handleSave}>
                    Salvar HTML
                  </button>
                  <button type="button" style={mutedButtonStyle} onClick={handleDelete}>
                    Remover
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                <label style={labelStyle}>
                  Nome do(a) psicólogo(a)
                  <input
                    style={inputStyle}
                    value={globals.psychologist.name}
                    onChange={(event) => setGlobals((prev) => ({ ...prev, psychologist: { ...prev.psychologist, name: event.target.value } }))}
                  />
                </label>
                <label style={labelStyle}>
                  CRP
                  <input
                    style={inputStyle}
                    value={globals.psychologist.crp}
                    onChange={(event) => setGlobals((prev) => ({ ...prev, psychologist: { ...prev.psychologist, crp: event.target.value } }))}
                  />
                </label>
                <label style={labelStyle}>
                  Nome do paciente
                  <input
                    style={inputStyle}
                    value={globals.patient.name}
                    onChange={(event) => setGlobals((prev) => ({ ...prev, patient: { ...prev.patient, name: event.target.value } }))}
                  />
                </label>
                <label style={labelStyle}>
                  Documento do paciente
                  <input
                    style={inputStyle}
                    value={globals.patient.document}
                    onChange={(event) => setGlobals((prev) => ({ ...prev, patient: { ...prev.patient, document: event.target.value } }))}
                  />
                </label>
                <label style={labelStyle}>
                  Cidade
                  <input
                    style={inputStyle}
                    value={globals.city}
                    onChange={(event) => setGlobals((prev) => ({ ...prev, city: event.target.value }))}
                  />
                </label>
                <label style={labelStyle}>
                  Data
                  <input
                    style={inputStyle}
                    type="date"
                    value={globals.date}
                    onChange={(event) => setGlobals((prev) => ({ ...prev, date: event.target.value }))}
                  />
                </label>
                <label style={labelStyle}>
                  Assinatura
                  <input
                    style={inputStyle}
                    value={globals.signature}
                    onChange={(event) => setGlobals((prev) => ({ ...prev, signature: event.target.value }))}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                {selectedTemplate.fields
                  .filter((field) => field.scope === "document")
                  .map((field) => (
                    <label key={field.key} style={labelStyle}>
                      {field.label}
                      {field.type === "textarea" ? (
                        <textarea
                          style={{ ...inputStyle, minHeight: 80 }}
                          value={fields[field.key] ?? ""}
                          onChange={(event) => setFields((prev) => ({ ...prev, [field.key]: event.target.value }))}
                        />
                      ) : (
                        <input
                          style={inputStyle}
                          type={field.type === "date" ? "date" : "text"}
                          value={fields[field.key] ?? ""}
                          onChange={(event) => setFields((prev) => ({ ...prev, [field.key]: event.target.value }))}
                        />
                      )}
                    </label>
                  ))}
              </div>

              <label style={labelStyle}>
                HTML do template
                <textarea
                  style={{ ...inputStyle, minHeight: 140, fontFamily: "monospace" }}
                  value={htmlDraft}
                  onChange={(event) => setHtmlDraft(event.target.value)}
                />
              </label>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" style={buttonStyle} onClick={() => handleExport("pdf")}>
                  Exportar PDF
                </button>
                <button type="button" style={mutedButtonStyle} onClick={() => handleExport("docx")}>
                  Exportar DOCX
                </button>
              </div>

              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #1F2937" }}>
                <iframe title="Pré-visualização" srcDoc={previewHtml} style={{ width: "100%", height: 420, border: "none" }} />
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: "#94A3B8" }}>Selecione um template para editar.</p>
          )}
        </section>
      </div>
    </div>
  );
};
