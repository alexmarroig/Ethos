export type TemplateField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date";
  scope: "global" | "document";
  required?: boolean;
  placeholder?: string;
};

export type TemplateGlobals = {
  psychologist: { name: string; crp: string };
  patient: { name: string; document: string };
  city: string;
  date: string;
  signature: string;
};

export type ClinicalTemplate = {
  id: string;
  title: string;
  description?: string;
  version: number;
  html: string;
  fields: TemplateField[];
};

const baseFields: TemplateField[] = [
  { key: "psychologist.name", label: "Nome do(a) psicólogo(a)", type: "text", scope: "global", required: true },
  { key: "psychologist.crp", label: "CRP", type: "text", scope: "global", required: true },
  { key: "patient.name", label: "Nome do paciente", type: "text", scope: "global", required: true },
  { key: "patient.document", label: "Documento do paciente", type: "text", scope: "global" },
  { key: "city", label: "Cidade", type: "text", scope: "global", required: true },
  { key: "date", label: "Data", type: "date", scope: "global", required: true },
  { key: "signature", label: "Assinatura", type: "text", scope: "global", required: true },
];

const templates = new Map<string, ClinicalTemplate>();

const addSeed = (template: Omit<ClinicalTemplate, "id">) => {
  const id = crypto.randomUUID();
  templates.set(id, { ...template, id });
};

addSeed({
  title: "Declaração de Comparecimento",
  description: "Baseada na Resolução CFP nº 06/2019.",
  version: 1,
  fields: [
    ...baseFields,
    { key: "session_date", label: "Data do atendimento", type: "date", scope: "document", required: true },
    { key: "session_time", label: "Horário", type: "text", scope: "document" },
    { key: "purpose", label: "Finalidade", type: "textarea", scope: "document" },
  ],
  html: `
  <h2 style="text-align:center;">Declaração de Comparecimento</h2>
  <p>Declaro, para os devidos fins, que {{patient.name}} ({{patient.document}}) compareceu para atendimento psicológico em {{session_date}} às {{session_time}}.</p>
  <p>Finalidade: {{purpose}}</p>
  <p style="margin-top:40px;">{{city}}, {{date}}.</p>
  <p style="margin-top:40px;">{{signature}}</p>
  <p>{{psychologist.name}} - CRP {{psychologist.crp}}</p>
  `,
});

addSeed({
  title: "Declaração de Atendimento",
  description: "Confirmação de atendimento psicológico conforme CFP nº 06/2019.",
  version: 1,
  fields: [
    ...baseFields,
    { key: "service_period", label: "Período do atendimento", type: "text", scope: "document", required: true },
    { key: "observations", label: "Observações", type: "textarea", scope: "document" },
  ],
  html: `
  <h2 style="text-align:center;">Declaração de Atendimento</h2>
  <p>Declaro que {{patient.name}} ({{patient.document}}) encontra-se em atendimento psicológico no período {{service_period}}.</p>
  <p>{{observations}}</p>
  <p style="margin-top:40px;">{{city}}, {{date}}.</p>
  <p style="margin-top:40px;">{{signature}}</p>
  <p>{{psychologist.name}} - CRP {{psychologist.crp}}</p>
  `,
});

addSeed({
  title: "Relatório Psicológico",
  description: "Estrutura base para relatório psicológico (CFP nº 06/2019).",
  version: 1,
  fields: [
    ...baseFields,
    { key: "demand", label: "Demanda", type: "textarea", scope: "document", required: true },
    { key: "procedures", label: "Procedimentos", type: "textarea", scope: "document", required: true },
    { key: "analysis", label: "Análise", type: "textarea", scope: "document", required: true },
    { key: "conclusion", label: "Conclusão", type: "textarea", scope: "document" },
  ],
  html: `
  <h2 style="text-align:center;">Relatório Psicológico</h2>
  <p><strong>Identificação:</strong> {{patient.name}} ({{patient.document}}).</p>
  <p><strong>Demanda:</strong> {{demand}}</p>
  <p><strong>Procedimentos:</strong> {{procedures}}</p>
  <p><strong>Análise:</strong> {{analysis}}</p>
  <p><strong>Conclusão:</strong> {{conclusion}}</p>
  <p style="margin-top:40px;">{{city}}, {{date}}.</p>
  <p style="margin-top:40px;">{{signature}}</p>
  <p>{{psychologist.name}} - CRP {{psychologist.crp}}</p>
  `,
});

addSeed({
  title: "Encaminhamento",
  description: "Modelo de encaminhamento clínico baseado na resolução CFP nº 06/2019.",
  version: 1,
  fields: [
    ...baseFields,
    { key: "receiver", label: "Destinatário", type: "text", scope: "document", required: true },
    { key: "summary", label: "Resumo do encaminhamento", type: "textarea", scope: "document", required: true },
  ],
  html: `
  <h2 style="text-align:center;">Encaminhamento</h2>
  <p>Encaminho {{patient.name}} ({{patient.document}}) para {{receiver}}.</p>
  <p><strong>Resumo:</strong> {{summary}}</p>
  <p style="margin-top:40px;">{{city}}, {{date}}.</p>
  <p style="margin-top:40px;">{{signature}}</p>
  <p>{{psychologist.name}} - CRP {{psychologist.crp}}</p>
  `,
});

const templateStyles = `
  body { font-family: "Inter", "Helvetica", sans-serif; color: #0f172a; font-size: 14px; }
  h1, h2, h3 { margin-bottom: 16px; }
  p { line-height: 1.6; margin: 8px 0; }
  .doc-wrapper { padding: 32px; max-width: 720px; margin: 0 auto; }
`;

const resolveValue = (path: string, data: Record<string, unknown>) =>
  path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], data);

export const templatesService = {
  list: () => Array.from(templates.values()),
  get: (id: string) => templates.get(id),
  create: (payload: Omit<ClinicalTemplate, "id">) => {
    const id = crypto.randomUUID();
    const template = { ...payload, id };
    templates.set(id, template);
    return template;
  },
  update: (id: string, payload: Partial<Omit<ClinicalTemplate, "id">>) => {
    const template = templates.get(id);
    if (!template) throw new Error("Template não encontrado");
    const updated = { ...template, ...payload };
    templates.set(id, updated);
    return updated;
  },
  remove: (id: string) => templates.delete(id),
  render: (template: ClinicalTemplate, globals: TemplateGlobals, fields: Record<string, string>) => {
    const data = {
      psychologist: globals.psychologist,
      patient: globals.patient,
      city: globals.city,
      date: globals.date,
      signature: globals.signature,
      ...fields,
    } as Record<string, unknown>;

    const body = template.html.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => {
      const value = resolveValue(key, data);
      return typeof value === "string" || typeof value === "number" ? String(value) : "";
    });

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>${templateStyles}</style>
        </head>
        <body>
          <div class="doc-wrapper">
            ${body}
          </div>
        </body>
      </html>
    `;
  },
};
