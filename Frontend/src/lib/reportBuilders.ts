import type { Report, ReportKind } from "@/services/reportService";
import type { Patient } from "@/services/patientService";
import type { Session } from "@/services/sessionService";

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

export const KIND_META: Record<ReportKind, { label: string; description: string; icon: string }> = {
  session_report: { label: "Relatório de sessão", description: "Registro de uma sessão específica", icon: "📋" },
  longitudinal_record: { label: "Prontuário / longitudinal", description: "Evolução do acompanhamento ao longo do tempo", icon: "📁" },
  referral: { label: "Encaminhamento", description: "Encaminhar paciente a outro profissional ou serviço", icon: "↗️" },
  psychological_report: { label: "Laudo psicológico", description: "Laudo formal para fins avaliativos ou periciais", icon: "📄" },
  school_report: { label: "Relatório escolar", description: "Relatório para escola ou instituição de ensino", icon: "🏫" },
  attendance_declaration: { label: "Declaração de comparecimento", description: "Declaração de presença em sessão", icon: "✅" },
};

const kindTitle = (kind?: string) => {
  switch (kind) {
    case "longitudinal_record": return "Prontuário Psicológico";
    case "referral": return "Encaminhamento Psicológico";
    case "psychological_report": return "Laudo Psicológico";
    case "school_report": return "Relatório Psicológico Escolar";
    case "attendance_declaration": return "Declaração de Comparecimento";
    default: return "Relatório Psicológico";
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

// ─── Starter templates ────────────────────────────────────────────────────────

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "";
const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

const clinicalCtx = (p?: Patient) =>
  [
    p?.profession ? `Profissão: ${p.profession}` : null,
    p?.education_level ? `Escolaridade: ${p.education_level}` : null,
    p?.marital_status ? `Estado civil: ${p.marital_status}` : null,
    p?.referral_source ? `Origem da demanda: ${p.referral_source}` : null,
    p?.main_complaint ? `Queixa principal: ${p.main_complaint}` : null,
    p?.therapy_goals ? `Objetivos terapêuticos: ${p.therapy_goals}` : null,
    p?.psychiatric_medications ? `Medicações: ${p.psychiatric_medications}` : null,
    p?.recurring_techniques ? `Técnicas: ${p.recurring_techniques}` : null,
    p?.care_status ? `Status: ${p.care_status}` : null,
  ].filter(Boolean).join("\n");

export type BuildStarterInput = {
  patient?: Patient;
  kind: ReportKind;
  attendanceType: string;
  sessions: Session[];
  psychologistName: string;
  crp?: string;
};

export const buildStarter = (input: BuildStarterInput): string => {
  const psy = input.psychologistName || "Psicóloga responsável";
  const crp = input.crp || "";
  const pat = input.patient?.name || "";
  const today = new Date().toLocaleDateString("pt-BR");
  const ctx = clinicalCtx(input.patient);
  const sess = input.sessions[0];

  switch (input.kind) {
    case "referral":
      return [
        "ENCAMINHAMENTO PSICOLÓGICO",
        "",
        `Psicóloga: ${psy} | CRP: ${crp}`,
        `Paciente: ${pat} | Data: ${today}`,
        "",
        "MOTIVO DO ENCAMINHAMENTO",
        "[Descreva o motivo clínico do encaminhamento]",
        "",
        "HISTÓRICO RELEVANTE",
        ctx || "[Tempo em acompanhamento, queixa principal, intervenções realizadas]",
        "",
        "RECOMENDAÇÕES",
        "[Para onde encaminhar e por quê]",
        "",
        `Atenciosamente,\n${psy} — CRP ${crp}`,
      ].join("\n");

    case "attendance_declaration":
      return [
        "DECLARAÇÃO DE COMPARECIMENTO",
        "",
        `Declaro que ${pat || "[nome do paciente]"} esteve presente em sessão de psicoterapia`,
        sess?.scheduled_at
          ? `no dia ${fmtDate(sess.scheduled_at)}, sob minha responsabilidade profissional.`
          : `na data de ${today}, sob minha responsabilidade profissional.`,
        "",
        `${psy} — CRP ${crp}`,
        today,
      ].join("\n");

    case "psychological_report":
      return [
        "LAUDO PSICOLÓGICO",
        "",
        `Psicóloga responsável: ${psy} | CRP: ${crp}`,
        `Avaliando: ${pat} | Data: ${today}`,
        "",
        "I. IDENTIFICAÇÃO",
        pat ? `Nome: ${pat}` : "[nome, data de nascimento, encaminhante]",
        "",
        "II. DEMANDA E PROCEDIMENTOS",
        "[Motivo da avaliação, técnicas e instrumentos utilizados]",
        "",
        "III. HISTÓRICO CLÍNICO RELEVANTE",
        ctx || "[Anamnese, histórico de desenvolvimento, queixa]",
        "",
        "IV. ANÁLISE E CONCLUSÕES",
        "[Apresente os dados observados, interpretações e conclusões clínicas]",
        "",
        "V. RECOMENDAÇÕES",
        "[Encaminhamentos, tratamentos sugeridos, orientações]",
        "",
        `${psy} — CRP ${crp}`,
        `Resolução CFP nº 06/2019`,
      ].join("\n");

    case "school_report":
      return [
        "RELATÓRIO PSICOLÓGICO ESCOLAR",
        "",
        `Psicóloga: ${psy} | CRP: ${crp}`,
        `Paciente: ${pat} | Data: ${today}`,
        "",
        "I. IDENTIFICAÇÃO",
        pat ? `Nome: ${pat}` : "[nome, série, escola]",
        "",
        "II. DESENVOLVIMENTO E HISTÓRICO",
        ctx || "[Histórico de desenvolvimento, queixas escolares, contexto familiar]",
        "",
        "III. ASPECTOS COGNITIVOS",
        "[Atenção, memória, raciocínio, aprendizagem]",
        "",
        "IV. ASPECTOS EMOCIONAIS E COMPORTAMENTAIS",
        "[Humor, relacionamentos, comportamento em sala]",
        "",
        "V. RECOMENDAÇÕES À ESCOLA",
        "[Adaptações curriculares, suporte pedagógico, orientações à equipe]",
        "",
        `${psy} — CRP ${crp}`,
      ].join("\n");

    case "longitudinal_record": {
      const sessBlock = input.sessions
        .map((s, i) => `Sessão ${i + 1} · ${fmtDateTime(s.scheduled_at)}\nStatus: ${s.status}`)
        .join("\n\n");
      return [
        `${psy.toUpperCase()}`,
        `Psicóloga clínica | CRP ${crp}`,
        "",
        "PRONTUÁRIO / RELATÓRIO LONGITUDINAL",
        pat ? `Paciente: ${pat}` : "",
        input.patient?.birth_date ? `Data de nascimento: ${fmtDate(input.patient.birth_date)}` : "",
        "",
        "CONTEXTO CLÍNICO",
        ctx || "Complementar com o contexto clínico do acompanhamento.",
        "",
        "SESSÕES DE REFERÊNCIA",
        sessBlock || "Selecionar sessões para compor a evolução.",
        "",
        "EVOLUÇÃO DO ACOMPANHAMENTO",
        "",
        "INTERVENÇÕES E TÉCNICAS",
        "",
        "PLANO E ENCAMINHAMENTOS",
      ].filter((l) => l !== undefined).join("\n");
    }

    default: // session_report
      return [
        "RELATÓRIO DE SESSÃO PSICOLÓGICA",
        `Psicóloga responsável: ${psy}`,
        `CRP: ${crp}`,
        pat ? `Paciente: ${pat}` : "",
        `Tipo de atendimento: ${input.attendanceType}`,
        sess?.scheduled_at ? `Sessão de referência: ${fmtDateTime(sess.scheduled_at)}` : "",
        "",
        "CONTEXTO CLÍNICO",
        ctx || "Registrar contexto clínico relevante do atendimento.",
        "",
        "DESCRIÇÃO DA SESSÃO",
        "",
        "INTERVENÇÕES REALIZADAS",
        "",
        "IMPRESSÕES CLÍNICAS",
        "",
        "PLANO / ENCAMINHAMENTOS",
      ].filter((l) => l !== undefined).join("\n");
  }
};

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
