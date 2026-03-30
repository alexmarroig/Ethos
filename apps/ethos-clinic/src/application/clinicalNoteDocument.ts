import type {
  ClinicalNoteStructuredData,
  ClinicalSession,
  Patient,
  User,
} from "../domain/types";

type ClinicalNoteDocumentContext = {
  patient?: Patient | null;
  psychologist?: User | null;
  session?: ClinicalSession | null;
  additionalNotes?: string;
};

type ParsedClinicalNoteDocument = {
  structuredData: ClinicalNoteStructuredData;
  additionalNotes?: string;
};

const EMPTY_VALUE = "Não informado";
const UNKNOWN_FREQUENCY = "Não informada";
const DEFAULT_TYPE = "Sessão clínica";
const DEFAULT_MODALITY = "Não informada";

const cleanInline = (value: string) => value.replace(/[ \t]+/g, " ").trim();

const cleanMultiline = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => cleanInline(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const cleanOptional = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const cleaned = cleanMultiline(value);
  return cleaned || undefined;
};

const cleanStringList = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map((item) => cleanOptional(item))
    .filter((item): item is string => Boolean(item));
  return cleaned.length > 0 ? cleaned : undefined;
};

export const normalizeClinicalNoteStructuredData = (value: unknown): ClinicalNoteStructuredData | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const input = value as Record<string, unknown>;
  const structuredData: ClinicalNoteStructuredData = {
    complaint: cleanOptional(input.complaint),
    context: cleanOptional(input.context),
    objectives: cleanStringList(input.objectives),
    anamnesis: input.anamnesis && typeof input.anamnesis === "object"
      ? {
          personal: cleanOptional((input.anamnesis as Record<string, unknown>).personal),
          family: cleanOptional((input.anamnesis as Record<string, unknown>).family),
          psychiatric: cleanOptional((input.anamnesis as Record<string, unknown>).psychiatric),
          medication: cleanOptional((input.anamnesis as Record<string, unknown>).medication),
          events: cleanOptional((input.anamnesis as Record<string, unknown>).events),
        }
      : undefined,
    plan: input.plan && typeof input.plan === "object"
      ? {
          approach: cleanOptional((input.plan as Record<string, unknown>).approach),
          strategies: cleanOptional((input.plan as Record<string, unknown>).strategies),
          interventions: cleanOptional((input.plan as Record<string, unknown>).interventions),
        }
      : undefined,
    soap: input.soap && typeof input.soap === "object"
      ? {
          subjective: cleanOptional((input.soap as Record<string, unknown>).subjective),
          objective: cleanOptional((input.soap as Record<string, unknown>).objective),
          assessment: cleanOptional((input.soap as Record<string, unknown>).assessment),
          plan: cleanOptional((input.soap as Record<string, unknown>).plan),
        }
      : undefined,
    events: cleanOptional(input.events),
    closure: input.closure && typeof input.closure === "object"
      ? {
          date: cleanOptional((input.closure as Record<string, unknown>).date),
          reason: cleanOptional((input.closure as Record<string, unknown>).reason),
          summary: cleanOptional((input.closure as Record<string, unknown>).summary),
          results: cleanOptional((input.closure as Record<string, unknown>).results),
          recommendations: cleanOptional((input.closure as Record<string, unknown>).recommendations),
        }
      : undefined,
  };

  const hasData = Boolean(
    structuredData.complaint
      || structuredData.context
      || structuredData.events
      || structuredData.objectives?.length
      || Object.values(structuredData.anamnesis ?? {}).some(Boolean)
      || Object.values(structuredData.plan ?? {}).some(Boolean)
      || Object.values(structuredData.soap ?? {}).some(Boolean)
      || Object.values(structuredData.closure ?? {}).some(Boolean),
  );

  return hasData ? structuredData : undefined;
};

const formatDate = (value?: string) => {
  if (!value) return EMPTY_VALUE;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Date(timestamp).toISOString().slice(0, 10);
};

const section = (title: string, body: string[]) => [title, ...body, ""];

const valueOrFallback = (value?: string, fallback = EMPTY_VALUE) => value?.trim() || fallback;

const bulletList = (items?: string[]) =>
  items && items.length > 0 ? items.map((item) => `- ${item}`) : ["- Nenhum objetivo registrado."];

const extractSection = (content: string, startPattern: RegExp, endPatterns: RegExp[]) => {
  const match = startPattern.exec(content);
  if (!match) return undefined;
  const startIndex = match.index + match[0].length;
  const remaining = content.slice(startIndex);

  let endIndex = remaining.length;
  for (const pattern of endPatterns) {
    const endMatch = pattern.exec(remaining);
    if (endMatch && endMatch.index < endIndex) {
      endIndex = endMatch.index;
    }
  }

  return cleanMultiline(remaining.slice(0, endIndex)) || undefined;
};

const extractSoapField = (content: string, label: "Subjetivo" | "Objetivo" | "Análise" | "Plano") =>
  extractSection(
    content,
    new RegExp(`${label}\\):\\s*`, "i"),
    [/^\w \(\w+\):/m, /^---/m, /^## /m],
  );

const stripListMarkers = (value: string) =>
  cleanMultiline(
    value
      .split("\n")
      .map((line) => line.replace(/^\s*[-•]\s*/, ""))
      .join("\n"),
  );

export const parseLegacyClinicalNoteContent = (content: string): ParsedClinicalNoteDocument => {
  const normalizedContent = cleanMultiline(content);
  if (!normalizedContent) {
    return { structuredData: {} };
  }

  const complaint = extractSection(normalizedContent, /^## QUEIXA PRINCIPAL\s*/im, [/^## /im, /^S \(Subjetivo\):/im]);
  const context = extractSection(normalizedContent, /^## CONTEXTO ATUAL\s*/im, [/^## /im, /^S \(Subjetivo\):/im]);
  const eventsBlock = extractSection(normalizedContent, /^## (PONTOS IMPORTANTES DA SESS[ÃA]O|EVENTOS IMPORTANTES)\s*/im, [/^## /im]);
  const additionalNotes = extractSection(normalizedContent, /^## OBSERVA[ÇC][ÕO]ES ADICIONAIS\s*/im, [/^## /im]);

  const structuredData = normalizeClinicalNoteStructuredData({
    complaint,
    context,
    soap: {
      subjective: extractSoapField(normalizedContent, "Subjetivo"),
      objective: extractSoapField(normalizedContent, "Objetivo"),
      assessment: extractSoapField(normalizedContent, "Análise"),
      plan: extractSoapField(normalizedContent, "Plano"),
    },
    events: eventsBlock ? stripListMarkers(eventsBlock) : undefined,
  }) ?? {};

  return {
    structuredData,
    additionalNotes: additionalNotes || (!structuredData.complaint && !structuredData.context && !structuredData.soap && !structuredData.events
      ? normalizedContent
      : undefined),
  };
};

export const formatClinicalNoteContent = (
  structuredData: ClinicalNoteStructuredData | undefined,
  context: ClinicalNoteDocumentContext,
) => {
  const normalized = normalizeClinicalNoteStructuredData(structuredData) ?? {};
  const patient = context.patient;
  const psychologist = context.psychologist;
  const session = context.session;
  const contact = [patient?.phone, patient?.email].filter(Boolean).join(" • ") || EMPTY_VALUE;
  const sessionDate = formatDate(session?.scheduled_at ?? session?.created_at);
  const sessionType = DEFAULT_TYPE;
  const modality = DEFAULT_MODALITY;
  const frequency = UNKNOWN_FREQUENCY;
  const crp = process.env.ETHOS_DEFAULT_CRP ?? EMPTY_VALUE;
  const additionalNotes = cleanOptional(context.additionalNotes);

  return [
    ...section("## 1. IDENTIFICAÇÃO", [
      `Paciente: ${valueOrFallback(patient?.label)}`,
      `Idade: ${EMPTY_VALUE}`,
      `Contato: ${contact}`,
      `Psicólogo(a): ${valueOrFallback(psychologist?.name)}`,
      `CRP: ${crp}`,
    ]),
    ...section("## 2. DADOS DA SESSÃO", [
      `Data: ${sessionDate}`,
      `Modalidade: ${modality}`,
      `Tipo: ${sessionType}`,
      `Frequência: ${frequency}`,
    ]),
    ...section("## 3. QUEIXA PRINCIPAL", [valueOrFallback(normalized.complaint)]),
    ...section("## 4. CONTEXTO", [valueOrFallback(normalized.context)]),
    ...section("## 5. OBJETIVOS", bulletList(normalized.objectives)),
    ...section("## 6. ANAMNESE", [
      `Histórico pessoal: ${valueOrFallback(normalized.anamnesis?.personal)}`,
      `Histórico familiar: ${valueOrFallback(normalized.anamnesis?.family)}`,
      `Histórico psiquiátrico: ${valueOrFallback(normalized.anamnesis?.psychiatric)}`,
      `Medicação: ${valueOrFallback(normalized.anamnesis?.medication)}`,
      `Eventos relevantes: ${valueOrFallback(normalized.anamnesis?.events)}`,
    ]),
    ...section("## 7. PLANO TERAPÊUTICO", [
      `Abordagem: ${valueOrFallback(normalized.plan?.approach)}`,
      `Estratégias: ${valueOrFallback(normalized.plan?.strategies)}`,
      `Intervenções planejadas: ${valueOrFallback(normalized.plan?.interventions)}`,
    ]),
    ...section("## 8. EVOLUÇÃO DA SESSÃO (SOAP)", [
      `S (Subjetivo):\n${valueOrFallback(normalized.soap?.subjective)}`,
      `O (Objetivo):\n${valueOrFallback(normalized.soap?.objective)}`,
      `A (Análise):\n${valueOrFallback(normalized.soap?.assessment)}`,
      `P (Plano):\n${valueOrFallback(normalized.soap?.plan)}`,
    ]),
    ...section("## 9. EVENTOS IMPORTANTES", [valueOrFallback(normalized.events)]),
    ...section("## 10. ANEXOS", ["Placeholder preparado para anexos futuros."]),
    ...section("## 11. ENCERRAMENTO", [
      `Data: ${valueOrFallback(normalized.closure?.date)}`,
      `Motivo: ${valueOrFallback(normalized.closure?.reason)}`,
      `Resumo: ${valueOrFallback(normalized.closure?.summary)}`,
      `Resultados: ${valueOrFallback(normalized.closure?.results)}`,
      `Recomendações: ${valueOrFallback(normalized.closure?.recommendations)}`,
    ]),
    ...(additionalNotes ? section("## OBSERVAÇÕES ADICIONAIS", [additionalNotes]) : []),
  ].join("\n").trim();
};
