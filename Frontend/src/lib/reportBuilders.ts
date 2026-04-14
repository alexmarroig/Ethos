import type { Report } from "@/services/reportService";
import type { Patient } from "@/services/patientService";

type ReportHtmlContext = {
  report: Report;
  patient?: Patient;
  psychologistName: string;
  crp?: string;
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
  h1, h2 {
    font-family: Lora, Georgia, serif;
    color: #17313a;
  }
  h1 {
    font-size: 34px;
    margin: 0 0 24px;
  }
  h2 {
    font-size: 18px;
    margin: 24px 0 10px;
  }
  p, li {
    font-size: 15px;
    line-height: 1.7;
    margin: 0 0 10px;
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
  .content {
    white-space: pre-wrap;
  }
  .signature {
    margin-top: 42px;
    padding-top: 18px;
    border-top: 1px solid #d9cbbb;
  }
`;

const purposeLabel = (purpose?: string) => {
  switch (purpose) {
    case "paciente":
      return "Entrega ao paciente";
    case "instituição":
      return "Instituição / terceiro";
    default:
      return "Uso profissional";
  }
};

const kindTitle = (kind?: string) => {
  switch (kind) {
    case "longitudinal_record":
      return "Prontuário psicológico";
    default:
      return "Relatório psicológico";
  }
};

export const buildReportHtml = ({ report, patient, psychologistName, crp }: ReportHtmlContext) => `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${kindTitle(report.kind)}</title>
    <style>${baseStyles}</style>
  </head>
  <body>
    <main class="sheet">
      <div class="eyebrow">ETHOS · ${kindTitle(report.kind).toUpperCase()}</div>
      <h1>${kindTitle(report.kind)}</h1>
      <section class="meta">
        <div class="meta-card">
          <span class="label">Psicólogo(a)</span>
          <span class="value">${psychologistName}</span>
        </div>
        <div class="meta-card">
          <span class="label">CRP</span>
          <span class="value">${crp || "Não informado"}</span>
        </div>
        <div class="meta-card">
          <span class="label">Paciente</span>
          <span class="value">${patient?.name || report.patient_name || "Paciente"}</span>
        </div>
        <div class="meta-card">
          <span class="label">Finalidade</span>
          <span class="value">${purposeLabel(report.purpose)}</span>
        </div>
      </section>
      ${(patient?.birth_date || patient?.cpf) ? `
      <section class="meta">
        ${patient?.birth_date ? '<div class="meta-card"><span class="label">Data de nascimento</span><span class="value">' + new Date(patient.birth_date).toLocaleDateString("pt-BR") + '</span></div>' : ""}
        ${patient?.cpf ? '<div class="meta-card"><span class="label">CPF</span><span class="value">' + patient.cpf + '</span></div>' : ""}
      </section>` : ""}
      <h2>Conteúdo</h2>
      <div class="content" style="white-space:pre-wrap">${report.content || "Sem conteúdo."}</div>
      <div class="signature">
        <p style="text-align:center;margin-bottom:8px">____________________________________</p>
        <p style="text-align:center"><strong>${psychologistName}</strong></p>
        <p style="text-align:center">Psicólogo(a) — CRP ${crp || "não informado"}</p>
        <p style="text-align:center;font-size:12px;color:#74604c;margin-top:12px">Documento elaborado conforme Resolução CFP nº 06/2019</p>
      </div>
    </main>
  </body>
</html>`;

export const downloadReportDoc = (fileName: string, html: string) => {
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const openReportPrintPreview = (html: string) => {
  const preview = window.open("", "_blank", "noopener,noreferrer");
  if (!preview) return false;
  preview.document.open();
  preview.document.write(html);
  preview.document.close();
  preview.focus();
  preview.print();
  return true;
};
