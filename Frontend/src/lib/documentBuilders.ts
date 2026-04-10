type ProfessionalDocumentContext = {
  psychologist: {
    name: string;
    email?: string;
    crp?: string;
  };
  patient: {
    name: string;
    email?: string;
    cpf?: string;
  };
  documentTitle: string;
  dateLabel?: string;
  priceLabel?: string;
  frequencyLabel?: string;
};

const baseStyles = `
  body {
    font-family: Inter, Arial, sans-serif;
    color: #17313a;
    background: #f7f2ea;
    margin: 0;
    padding: 32px;
  }
  .sheet {
    max-width: 860px;
    margin: 0 auto;
    background: #fffdfa;
    border: 1px solid #e8ddd1;
    border-radius: 24px;
    padding: 40px;
    box-shadow: 0 18px 40px rgba(23, 49, 58, 0.08);
  }
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 12px;
    color: #8b6f58;
    margin-bottom: 10px;
  }
  h1 {
    font-family: Lora, Georgia, serif;
    font-size: 34px;
    margin: 0 0 24px;
    color: #17313a;
  }
  h2 {
    font-family: Lora, Georgia, serif;
    font-size: 22px;
    margin: 28px 0 12px;
    color: #17313a;
  }
  p, li {
    font-size: 15px;
    line-height: 1.7;
    margin: 0 0 12px;
  }
  .meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 28px;
  }
  .meta-card {
    background: #f3ede5;
    border-radius: 16px;
    padding: 14px 16px;
  }
  .label {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #74604c;
    margin-bottom: 6px;
  }
  .value {
    font-size: 15px;
    color: #17313a;
    font-weight: 600;
  }
  .signature {
    margin-top: 42px;
    padding-top: 18px;
    border-top: 1px solid #d9cbbb;
  }
  .signature strong {
    display: block;
    margin-bottom: 4px;
  }
  .content {
    white-space: pre-wrap;
  }
`;

const wrap = (title: string, body: string) => `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${baseStyles}</style>
  </head>
  <body>
    <main class="sheet">
      ${body}
    </main>
  </body>
</html>`;

const buildHeader = (title: string, subtitle = "ETHOS · Documento clínico") => `
  <div class="eyebrow">${subtitle}</div>
  <h1>${title}</h1>
`;

const buildMeta = (context: ProfessionalDocumentContext) => `
  <section class="meta">
    <div class="meta-card">
      <span class="label">Psicóloga</span>
      <span class="value">${context.psychologist.name}</span>
    </div>
    <div class="meta-card">
      <span class="label">CRP</span>
      <span class="value">${context.psychologist.crp || "Não informado"}</span>
    </div>
    <div class="meta-card">
      <span class="label">Paciente</span>
      <span class="value">${context.patient.name}</span>
    </div>
    <div class="meta-card">
      <span class="label">Data</span>
      <span class="value">${context.dateLabel || new Date().toLocaleDateString("pt-BR")}</span>
    </div>
  </section>
`;

const buildSignature = (context: ProfessionalDocumentContext) => `
  <div class="signature">
    <strong>${context.psychologist.name}</strong>
    <p>CRP ${context.psychologist.crp || "não informado"}</p>
    <p>${context.psychologist.email || "Email não informado"}</p>
  </div>
`;

export const buildClinicalDocumentHtml = (
  templateId: string,
  context: ProfessionalDocumentContext
) => {
  const common = `${buildHeader(context.documentTitle)}${buildMeta(context)}`;

  if (templateId === "payment-receipt") {
    return wrap(
      context.documentTitle,
      `
        ${common}
        <p>Declaro, para os devidos fins, que recebi de <strong>${context.patient.name}</strong> o valor de <strong>${context.priceLabel || "R$ 0,00"}</strong>, referente a atendimento psicológico realizado nesta data.</p>
        <p><strong>Frequência clínica de referência:</strong> ${context.frequencyLabel || "Não informada"}</p>
        <p>Este recibo é emitido para fins de comprovação de pagamento do serviço profissional prestado.</p>
        ${buildSignature(context)}
      `
    );
  }

  if (templateId === "attendance-declaration") {
    return wrap(
      context.documentTitle,
      `
        ${common}
        <p>Declaro que <strong>${context.patient.name}</strong> compareceu ao atendimento psicológico nesta data, para fins de acompanhamento clínico.</p>
        <p><strong>Frequência clínica de referência:</strong> ${context.frequencyLabel || "Não informada"}</p>
        <p>Esta declaração comprova exclusivamente o comparecimento, sem detalhamento do conteúdo da sessão, preservando o sigilo profissional.</p>
        ${buildSignature(context)}
      `
    );
  }

  if (templateId === "psychological-certificate") {
    return wrap(
      context.documentTitle,
      `
        ${common}
        <p>Atesto, para os devidos fins, que <strong>${context.patient.name}</strong> esteve em atendimento psicológico nesta data.</p>
        <p><strong>Frequência clínica de referência:</strong> ${context.frequencyLabel || "Não informada"}</p>
        <p>Este documento é emitido conforme solicitação do paciente, preservando as informações clínicas protegidas por sigilo profissional.</p>
        ${buildSignature(context)}
      `
    );
  }

  return wrap(
    context.documentTitle,
    `
      ${common}
      <p>Documento clínico preparado na plataforma ETHOS.</p>
      ${buildSignature(context)}
    `
  );
};

export const buildContractHtml = (contract: {
  title?: string;
  content?: string;
  psychologist?: { name?: string; email?: string; license?: string };
  patient?: { name?: string; email?: string; document?: string; address?: string };
  terms?: {
    value?: string;
    periodicity?: string;
    absence_policy?: string;
    payment_method?: string;
  };
}) => {
  if (contract.content?.trim()) {
    return wrap(
      contract.title || "Contrato terapêutico",
      `
        ${buildHeader(contract.title || "Contrato terapêutico", "ETHOS · Contrato profissional")}
        <div class="content">${contract.content}</div>
        <div class="signature">
          <strong>${contract.psychologist?.name || "Psicóloga responsável"}</strong>
          <p>CRP ${contract.psychologist?.license || "não informado"}</p>
          <p>${contract.psychologist?.email || "Email não informado"}</p>
        </div>
      `,
    );
  }

  return wrap(
    "Contrato terapêutico",
    `
      ${buildHeader("Contrato terapêutico", "ETHOS · Contrato profissional")}
      <section class="meta">
        <div class="meta-card">
          <span class="label">Psicóloga</span>
          <span class="value">${contract.psychologist?.name || "Não informado"}</span>
        </div>
        <div class="meta-card">
          <span class="label">CRP</span>
          <span class="value">${contract.psychologist?.license || "Não informado"}</span>
        </div>
        <div class="meta-card">
          <span class="label">Paciente</span>
          <span class="value">${contract.patient?.name || "Não informado"}</span>
        </div>
        <div class="meta-card">
          <span class="label">Documento</span>
          <span class="value">${contract.patient?.document || "Não informado"}</span>
        </div>
      </section>
      <h2>Condições do atendimento</h2>
      <p><strong>Valor:</strong> ${contract.terms?.value || "Não informado"}</p>
      <p><strong>Periodicidade:</strong> ${contract.terms?.periodicity || "Não informada"}</p>
      <p><strong>Política de faltas:</strong> ${contract.terms?.absence_policy || "Não informada"}</p>
      <p><strong>Forma de pagamento:</strong> ${contract.terms?.payment_method || "Não informada"}</p>
      <p>Endereço do paciente: ${contract.patient?.address || "Não informado"}</p>
      <div class="signature">
        <strong>${contract.psychologist?.name || "Psicóloga responsável"}</strong>
        <p>CRP ${contract.psychologist?.license || "não informado"}</p>
        <p>${contract.psychologist?.email || "Email não informado"}</p>
      </div>
    `
  );
};
