import type { Report } from "@/services/reportService";
import type { Patient } from "@/services/patientService";

type ReportHtmlContext = {
  report: Report;
  patient?: Patient;
  psychologistName: string;
  crp?: string;
};

const escapeHtml = (value?: string) =>
  (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const withParagraphs = (value?: string) =>
  escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replaceAll("\n", "<br />")}</p>`)
    .join("");

const purposeLabel = (purpose?: string) => {
  switch (purpose) {
    case "paciente":
      return "Entrega ao paciente";
    case "instituicao":
    case "instituição":
      return "Instituição / terceiro";
    default:
      return "Uso profissional";
  }
};

const kindTitle = (kind?: string) => {
  switch (kind) {
    case "longitudinal_record":
      return "Prontuário Psicológico";
    default:
      return "Relatório Psicológico";
  }
};

const optionalMeta = (label: string, value?: string) =>
  value?.trim()
    ? `<div class="meta-card"><span class="label">${label}</span><span class="value">${escapeHtml(value)}</span></div>`
    : "";

export const buildReportHtml = ({
  report,
  patient,
  psychologistName,
  crp,
}: ReportHtmlContext) => `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${kindTitle(report.kind)}</title>
    <style>
      body {
        font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
        color: #17313a;
        background: #f7f2ea;
        margin: 0;
        padding: 32px;
      }
      .sheet {
        max-width: 980px;
        margin: 0 auto;
        background: #fffdfa;
        border: 1px solid #e8ddd1;
        border-radius: 24px;
        padding: 44px;
        box-shadow: 0 18px 40px rgba(23, 49, 58, 0.08);
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-size: 12px;
        color: #8b6f58;
        margin-bottom: 12px;
      }
      h1, h2, h3 {
        font-family: "Lora", Georgia, serif;
        color: #17313a;
      }
      h1 {
        font-size: 42px;
        line-height: 1.05;
        margin: 0 0 24px;
      }
      h2 {
        font-size: 22px;
        margin: 32px 0 12px;
      }
      p, li {
        font-size: 16px;
        line-height: 1.75;
        margin: 0 0 12px;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 24px;
      }
      .meta-card {
        background: #f3ede5;
        border-radius: 16px;
        padding: 16px;
      }
      .label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #74604c;
        margin-bottom: 6px;
      }
      .value {
        font-size: 15px;
        color: #17313a;
        font-weight: 600;
      }
      .content {
        white-space: normal;
      }
      .signature {
        margin-top: 48px;
        padding-top: 20px;
        border-top: 1px solid #d9cbbb;
        text-align: center;
      }
      .signature p {
        margin: 6px 0;
      }
      @media print {
        body {
          background: #fff;
          padding: 0;
        }
        .sheet {
          box-shadow: none;
          border: none;
          border-radius: 0;
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <div class="eyebrow">ETHOS · ${kindTitle(report.kind).toUpperCase()}</div>
      <h1>${kindTitle(report.kind)}</h1>

      <section class="meta">
        <div class="meta-card">
          <span class="label">Psicóloga Responsável</span>
          <span class="value">${escapeHtml(psychologistName)}</span>
        </div>
        <div class="meta-card">
          <span class="label">CRP</span>
          <span class="value">${escapeHtml(crp || "Não informado")}</span>
        </div>
        <div class="meta-card">
          <span class="label">Paciente</span>
          <span class="value">${escapeHtml(patient?.name || report.patient_name || "Paciente")}</span>
        </div>
        <div class="meta-card">
          <span class="label">Finalidade</span>
          <span class="value">${escapeHtml(purposeLabel(report.purpose))}</span>
        </div>
        ${optionalMeta("Data de Nascimento", patient?.birth_date ? new Date(patient.birth_date).toLocaleDateString("pt-BR") : undefined)}
        ${optionalMeta("CPF", patient?.cpf)}
        ${optionalMeta("Profissão", patient?.profession)}
        ${optionalMeta("Escolaridade", patient?.education_level)}
      </section>

      ${patient?.main_complaint ? `<h2>Queixa principal</h2>${withParagraphs(patient.main_complaint)}` : ""}
      ${patient?.therapy_goals ? `<h2>Objetivos terapêuticos</h2>${withParagraphs(patient.therapy_goals)}` : ""}

      <h2>Conteúdo</h2>
      <div class="content">
        ${withParagraphs(report.content || "Sem conteúdo.")}
      </div>

      <div class="signature">
        <p>____________________________________</p>
        <p><strong>${escapeHtml(psychologistName)}</strong></p>
        <p>Psicóloga responsável · CRP ${escapeHtml(crp || "não informado")}</p>
        <p style="font-size:12px;color:#74604c;">Documento elaborado conforme Resolução CFP nº 06/2019</p>
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
