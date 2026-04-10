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
    case "instituiÃ§Ã£o":
      return "Instituição / terceiro";
    default:
      return "Uso profissional";
  }
};

export const buildReportHtml = ({ report, patient, psychologistName, crp }: ReportHtmlContext) => `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Relatório psicológico</title>
    <style>${baseStyles}</style>
  </head>
  <body>
    <main class="sheet">
      <div class="eyebrow">ETHOS · Relatório psicológico</div>
      <h1>Relatório psicológico</h1>
      <section class="meta">
        <div class="meta-card">
          <span class="label">Psicóloga</span>
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
      <h2>Conteúdo</h2>
      <div class="content">${report.content || "Sem conteúdo."}</div>
      <div class="signature">
        <strong>${psychologistName}</strong>
        <p>CRP ${crp || "não informado"}</p>
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
