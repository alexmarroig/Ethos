import { api, ApiResult } from "./apiClient";

const buildHtmlBlobUrl = (html: string) => {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
};

export const openHtmlInNewTab = (html: string) => {
  const objectUrl = buildHtmlBlobUrl(html);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
};

export const downloadWordFromHtml = (html: string, filename: string) => {
  const blob = new Blob([html], { type: "application/msword" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
};

export const openDataUrlInNewTab = (dataUrl: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const buildClinicalNoteExportHtml = (input: {
  title?: string;
  status?: "draft" | "validated";
  content: {
    queixa_principal: string;
    observacoes_clinicas: string;
    evolucao: string;
    plano_terapeutico: string;
  };
}) => `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${input.title || "Prontuário"}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 32px; background: #f5f5f7; color: #1d1d1f; }
      .sheet { max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 40px; }
      .eyebrow { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #0f5c73; margin-bottom: 12px; }
      h1 { margin: 0 0 8px; font-size: 34px; }
      .status { display: inline-block; margin-bottom: 28px; padding: 8px 12px; border-radius: 999px; background: ${input.status === "validated" ? "#e7f6ef" : "#fff5e8"}; color: ${input.status === "validated" ? "#1b6b4b" : "#9a5c00"}; font-size: 13px; font-weight: 600; }
      .section { margin-top: 24px; }
      .section h2 { font-size: 18px; margin: 0 0 10px; }
      .section p { margin: 0; line-height: 1.7; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <main class="sheet">
      <div class="eyebrow">ETHOS · PRONTUÁRIO</div>
      <h1>${input.title || "Prontuário da sessão"}</h1>
      <div class="status">${input.status === "validated" ? "Prontuário validado" : "Rascunho em revisão"}</div>
      <section class="section"><h2>Queixa principal</h2><p>${input.content.queixa_principal || "Não informado"}</p></section>
      <section class="section"><h2>Observações clínicas</h2><p>${input.content.observacoes_clinicas || "Não informado"}</p></section>
      <section class="section"><h2>Evolução</h2><p>${input.content.evolucao || "Não informado"}</p></section>
      <section class="section"><h2>Plano terapêutico</h2><p>${input.content.plano_terapeutico || "Não informado"}</p></section>
    </main>
  </body>
</html>`;

export const exportService = {
  exportPdf: (data: { document_type: string; document_id: string }): Promise<ApiResult<{ url?: string; data_url?: string; filename?: string }>> =>
    api.post<{ url?: string; data_url?: string; filename?: string }>("/export/pdf", data),

  exportDocx: (data: { document_type: string; document_id: string }): Promise<ApiResult<{ url: string }>> =>
    api.post<{ url: string }>("/export/docx", data),
};
