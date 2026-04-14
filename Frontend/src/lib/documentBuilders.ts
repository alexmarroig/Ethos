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
  attendanceDate?: string;
  attendanceTime?: string;
  periodStart?: string;
  periodEnd?: string;
  cidCode?: string;
  amount?: string;
  paymentMethod?: string;
  serviceType?: string;
  specialty?: string;
  clinicalApproach?: string;
  patientBirthDate?: string;
  patientProfession?: string;
  patientPhone?: string;
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
  h3 {
    font-family: Lora, Georgia, serif;
    font-size: 18px;
    margin: 20px 0 8px;
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
  .field-line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 15px;
    line-height: 1.7;
  }
  .field-line .field-label {
    font-weight: 600;
    white-space: nowrap;
  }
  .field-line .field-value {
    border-bottom: 1px solid #c4b7a8;
    flex: 1;
    min-width: 60px;
    padding-bottom: 2px;
  }
  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 15px;
  }
  .checkbox-item .box {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 1.5px solid #8b6f58;
    border-radius: 3px;
    text-align: center;
    line-height: 14px;
    font-size: 12px;
    flex-shrink: 0;
  }
  .section-divider {
    border: none;
    border-top: 1px solid #e8ddd1;
    margin: 24px 0;
  }
  .prontuario-header {
    text-align: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #8b6f58;
  }
  .prontuario-header .prof-name {
    font-family: Lora, Georgia, serif;
    font-size: 24px;
    font-weight: 700;
    color: #17313a;
    margin: 0 0 4px;
  }
  .prontuario-header .prof-subtitle {
    font-size: 13px;
    color: #74604c;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
    margin-bottom: 20px;
  }
  .info-grid .info-item {
    font-size: 14px;
    line-height: 1.6;
  }
  .info-grid .info-item strong {
    color: #74604c;
  }
  .session-entry {
    background: #f9f5ef;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
  }
  .session-entry h4 {
    font-family: Lora, Georgia, serif;
    font-size: 16px;
    margin: 0 0 8px;
    color: #17313a;
  }
  .session-entry p {
    font-size: 14px;
    margin: 0 0 6px;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border: none; border-radius: 0; padding: 20px; }
    .meta-card { background: #f5f5f5; }
    .session-entry { background: #f5f5f5; }
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

const buildHeader = (title: string, subtitle = "ETHOS \u00b7 Documento cl\u00ednico") => `
  <div class="eyebrow">${subtitle}</div>
  <h1>${title}</h1>
`;

const buildMeta = (context: ProfessionalDocumentContext) => `
  <section class="meta">
    <div class="meta-card">
      <span class="label">Psic\u00f3logo(a)</span>
      <span class="value">${context.psychologist.name}</span>
    </div>
    <div class="meta-card">
      <span class="label">CRP</span>
      <span class="value">${context.psychologist.crp || "N\u00e3o informado"}</span>
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
    <p style="text-align:center; margin-bottom:8px;">________________________</p>
    <strong style="text-align:center; display:block;">${context.psychologist.name}</strong>
    <p style="text-align:center;">CRP: ${context.psychologist.crp || "n\u00e3o informado"}</p>
  </div>
`;

const formatDateBR = (value?: string) => {
  if (!value) return "___/___/______";
  const d = new Date(value + "T12:00:00");
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR");
};

const calculateAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const d = new Date(birthDate + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--;
  return age;
};

export const buildClinicalDocumentHtml = (
  templateId: string,
  context: ProfessionalDocumentContext
) => {
  if (templateId === "attendance-declaration") {
    return wrap(
      "Declara\u00e7\u00e3o",
      `
        ${buildHeader("DECLARA\u00c7\u00c3O", "ETHOS \u00b7 Declara\u00e7\u00e3o de comparecimento")}
        ${buildMeta(context)}

        <p>Declaro para os devidos fins que <strong>${context.patient.name}</strong>${context.patient.cpf ? `, portador(a) do CPF ${context.patient.cpf}` : ""}, esteve em atendimento psicol\u00f3gico no dia <strong>${formatDateBR(context.attendanceDate)}</strong>, no hor\u00e1rio <strong>${context.attendanceTime || "___:___"}</strong>.</p>

        <p>Este documento n\u00e3o cont\u00e9m informa\u00e7\u00f5es cl\u00ednicas, conforme Resolu\u00e7\u00e3o CFP n\u00ba 001/2009.</p>

        <hr class="section-divider" />

        <div class="field-line">
          <span class="field-label">Local e data:</span>
          <span class="field-value">${context.dateLabel || new Date().toLocaleDateString("pt-BR")}</span>
        </div>

        ${buildSignature(context)}
      `
    );
  }

  if (templateId === "psychological-certificate") {
    return wrap(
      "Atestado Psicol\u00f3gico",
      `
        ${buildHeader("ATESTADO PSICOL\u00d3GICO", "ETHOS \u00b7 Atestado psicol\u00f3gico")}
        ${buildMeta(context)}

        <p>Atesto que <strong>${context.patient.name}</strong>${context.patient.cpf ? `, portador(a) do CPF ${context.patient.cpf}` : ""}, encontra-se em acompanhamento psicol\u00f3gico, necessitando de afastamento de suas atividades no per\u00edodo de <strong>${formatDateBR(context.periodStart)}</strong> a <strong>${formatDateBR(context.periodEnd)}</strong>.</p>

        ${context.cidCode ? `<div class="field-line"><span class="field-label">CID:</span><span class="field-value">${context.cidCode}</span></div>` : ""}

        <hr class="section-divider" />

        <div class="field-line">
          <span class="field-label">Local e data:</span>
          <span class="field-value">${context.dateLabel || new Date().toLocaleDateString("pt-BR")}</span>
        </div>

        ${buildSignature(context)}
      `
    );
  }

  if (templateId === "payment-receipt") {
    const serviceLabel = context.serviceType === "evaluation"
      ? "Avalia\u00e7\u00e3o psicol\u00f3gica"
      : context.serviceType === "other"
        ? "Outro"
        : "Sess\u00e3o de psicoterapia";

    return wrap(
      "Recibo",
      `
        ${buildHeader("RECIBO DE PRESTA\u00c7\u00c3O DE SERVI\u00c7OS PSICOL\u00d3GICOS", "ETHOS \u00b7 Recibo")}

        <h2>Recebi de:</h2>
        <div class="field-line">
          <span class="field-label">Nome:</span>
          <span class="field-value">${context.patient.name}</span>
        </div>
        <div class="field-line">
          <span class="field-label">CPF:</span>
          <span class="field-value">${context.patient.cpf || ""}</span>
        </div>

        <hr class="section-divider" />

        <div class="field-line">
          <span class="field-label">A quantia de:</span>
          <span class="field-value">R$ ${context.amount || "______"}</span>
        </div>

        <h3>Referente a:</h3>
        <div class="checkbox-item">
          <span class="box">${context.serviceType === "session" || !context.serviceType ? "x" : ""}</span>
          <span>Sess\u00e3o de psicoterapia</span>
        </div>
        <div class="checkbox-item">
          <span class="box">${context.serviceType === "evaluation" ? "x" : ""}</span>
          <span>Avalia\u00e7\u00e3o psicol\u00f3gica</span>
        </div>
        <div class="checkbox-item">
          <span class="box">${context.serviceType === "other" ? "x" : ""}</span>
          <span>Outro: ${context.serviceType === "other" ? "________________" : ""}</span>
        </div>

        <hr class="section-divider" />

        <div class="field-line">
          <span class="field-label">Data do atendimento:</span>
          <span class="field-value">${formatDateBR(context.attendanceDate) || context.dateLabel || new Date().toLocaleDateString("pt-BR")}</span>
        </div>
        <div class="field-line">
          <span class="field-label">Forma de pagamento:</span>
          <span class="field-value">${context.paymentMethod || ""}</span>
        </div>

        <hr class="section-divider" />

        <div class="field-line">
          <span class="field-label">Local e data:</span>
          <span class="field-value">${context.dateLabel || new Date().toLocaleDateString("pt-BR")}</span>
        </div>

        <div class="signature">
          <p style="text-align:center; margin-bottom:8px;">________________________</p>
          <strong style="text-align:center; display:block;">${context.psychologist.name}</strong>
          <p style="text-align:center;">CRP: ${context.psychologist.crp || "n\u00e3o informado"}</p>
          <p style="text-align:center;">${context.psychologist.email || ""}</p>
        </div>
      `
    );
  }

  if (templateId === "clinical-record") {
    const age = calculateAge(context.patientBirthDate);
    return wrap(
      "Prontu\u00e1rio Psicol\u00f3gico",
      `
        <div class="prontuario-header">
          <p class="prof-name">${context.psychologist.name}</p>
          <p class="prof-subtitle">${context.specialty || "Psic\u00f3logo(a) Cl\u00ednico(a)"} | CRP ${context.psychologist.crp || "n\u00e3o informado"}</p>
        </div>

        <h1 style="text-align:center; font-size:28px;">Prontu\u00e1rio Psicol\u00f3gico</h1>

        <h2>Identifica\u00e7\u00e3o do Paciente</h2>
        <div class="info-grid">
          <div class="info-item"><strong>Nome:</strong> ${context.patient.name}</div>
          <div class="info-item"><strong>Data de nascimento:</strong> ${formatDateBR(context.patientBirthDate)}</div>
          <div class="info-item"><strong>Idade:</strong> ${age !== null ? `${age} anos` : "N\u00e3o informada"}</div>
          <div class="info-item"><strong>CPF:</strong> ${context.patient.cpf || "N\u00e3o informado"}</div>
          <div class="info-item"><strong>Profiss\u00e3o:</strong> ${context.patientProfession || "N\u00e3o informada"}</div>
          <div class="info-item"><strong>Telefone:</strong> ${context.patientPhone || "N\u00e3o informado"}</div>
          <div class="info-item"><strong>E-mail:</strong> ${context.patient.email || "N\u00e3o informado"}</div>
        </div>

        <hr class="section-divider" />

        <h2>Dados do Acompanhamento</h2>
        <div class="info-grid">
          <div class="info-item"><strong>Tipo de atendimento:</strong> Psicoterapia Individual</div>
          <div class="info-item"><strong>Abordagem:</strong> ${context.clinicalApproach || "N\u00e3o informada"}</div>
        </div>
        <div class="field-line">
          <span class="field-label">T\u00e9cnicas e instrumentos utilizados:</span>
          <span class="field-value"></span>
        </div>
        <div class="info-grid">
          <div class="field-line">
            <span class="field-label">Per\u00edodo de atendimento:</span>
            <span class="field-value">___/___/______ a ___/___/______</span>
          </div>
          <div class="field-line">
            <span class="field-label">N\u00famero de sess\u00f5es:</span>
            <span class="field-value"></span>
          </div>
          <div class="field-line">
            <span class="field-label">N\u00famero de faltas:</span>
            <span class="field-value"></span>
          </div>
        </div>
        <div class="field-line">
          <span class="field-label">Encaminhamentos internos:</span>
          <span class="field-value"></span>
        </div>

        <hr class="section-divider" />

        <h2>Demanda Inicial</h2>
        <div style="min-height:80px; border:1px dashed #d9cbbb; border-radius:8px; padding:12px; margin-bottom:16px;">
          <p style="color:#a0927f; font-style:italic; margin:0;">Descreva a demanda inicial do paciente...</p>
        </div>

        <hr class="section-divider" />

        <h2>Evolu\u00e7\u00e3o do Atendimento</h2>

        <div class="session-entry">
          <h4>Sess\u00e3o n\u00ba 1 \u2014 ___/___/______</h4>
          <p><strong>Formato:</strong> presencial / online</p>
          <p><strong>Conte\u00fado:</strong></p>
          <div style="min-height:40px; border:1px dashed #d9cbbb; border-radius:6px; padding:8px; margin-bottom:8px;">
            <p style="color:#a0927f; font-style:italic; margin:0;">Conte\u00fado da sess\u00e3o...</p>
          </div>
          <p><strong>Interven\u00e7\u00f5es:</strong></p>
          <div style="min-height:40px; border:1px dashed #d9cbbb; border-radius:6px; padding:8px; margin-bottom:8px;">
            <p style="color:#a0927f; font-style:italic; margin:0;">Interven\u00e7\u00f5es realizadas...</p>
          </div>
          <p><strong>Plano:</strong></p>
          <div style="min-height:40px; border:1px dashed #d9cbbb; border-radius:6px; padding:8px;">
            <p style="color:#a0927f; font-style:italic; margin:0;">Plano terap\u00eautico...</p>
          </div>
        </div>

        ${buildSignature(context)}
      `
    );
  }

  // Generic fallback
  const common = `${buildHeader(context.documentTitle)}${buildMeta(context)}`;
  return wrap(
    context.documentTitle,
    `
      ${common}
      <p>Documento cl\u00ednico preparado na plataforma ETHOS.</p>
      ${buildSignature(context)}
    `
  );
};

export const buildContractHtml = (contract: {
  psychologist?: { name?: string; email?: string; license?: string };
  patient?: { name?: string; email?: string; document?: string; address?: string };
  terms?: {
    value?: string;
    periodicity?: string;
    absence_policy?: string;
    payment_method?: string;
  };
  content?: string;
}) =>
  wrap(
    "Contrato terap\u00eautico",
    `
      ${buildHeader("Contrato terap\u00eautico", "ETHOS \u00b7 Contrato profissional")}
      <section class="meta">
        <div class="meta-card">
          <span class="label">Psic\u00f3logo(a)</span>
          <span class="value">${contract.psychologist?.name || "N\u00e3o informado"}</span>
        </div>
        <div class="meta-card">
          <span class="label">CRP</span>
          <span class="value">${contract.psychologist?.license || "N\u00e3o informado"}</span>
        </div>
        <div class="meta-card">
          <span class="label">Paciente</span>
          <span class="value">${contract.patient?.name || "N\u00e3o informado"}</span>
        </div>
        <div class="meta-card">
          <span class="label">Documento</span>
          <span class="value">${contract.patient?.document || "N\u00e3o informado"}</span>
        </div>
      </section>
      ${contract.content ? `<div style="white-space:pre-wrap;margin-bottom:28px;">${contract.content}</div><hr class="section-divider" />` : ""}
      <h2>Condi\u00e7\u00f5es do atendimento</h2>
      <p><strong>Valor:</strong> ${contract.terms?.value || "N\u00e3o informado"}</p>
      <p><strong>Periodicidade:</strong> ${contract.terms?.periodicity || "N\u00e3o informada"}</p>
      <p><strong>Pol\u00edtica de faltas:</strong> ${contract.terms?.absence_policy || "N\u00e3o informada"}</p>
      <p><strong>Forma de pagamento:</strong> ${contract.terms?.payment_method || "N\u00e3o informada"}</p>
      <p>As partes reconhecem este documento como base do acordo terap\u00eautico, respeitando o c\u00f3digo de \u00e9tica profissional e o sigilo cl\u00ednico.</p>
      <div class="signature">
        <p style="text-align:center; margin-bottom:8px;">________________________</p>
        <strong style="text-align:center; display:block;">${contract.psychologist?.name || "Psic\u00f3logo(a) respons\u00e1vel"}</strong>
        <p style="text-align:center;">CRP ${contract.psychologist?.license || "n\u00e3o informado"}</p>
        <p style="text-align:center;">${contract.psychologist?.email || ""}</p>
        <br/>
        <p style="text-align:center; margin-bottom:8px;">________________________</p>
        <strong style="text-align:center; display:block;">${contract.patient?.name || "Contratante"}</strong>
        <p style="text-align:center;">${contract.patient?.document || ""}</p>
      </div>
    `
  );
