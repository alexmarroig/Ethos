import type { ClinicalSession } from "../../domain/types";

export type GeneratedClinicalNote = {
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  highlights: string[];
  mainComplaint?: string;
  context?: string;
};

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
      refusal?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

const OPENAI_API_URL = process.env.OPENAI_API_URL ?? "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.ETHOS_CLINICAL_NOTE_MODEL ?? "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = Number(process.env.ETHOS_CLINICAL_NOTE_TIMEOUT_MS ?? 20_000);
const MAX_TRANSCRIPTION_CHARS = Number(process.env.ETHOS_CLINICAL_NOTE_MAX_CHARS ?? 12_000);

const diagnosisMarkers = [
  /\bdiagn[oó]stic/iu,
  /\bhip[oó]tese diagn/iu,
  /\bcid\b/iu,
  /\bdsm\b/iu,
];

const cleanInlineWhitespace = (value: string) => value.replace(/[ \t]+/g, " ").trim();

const cleanMultilineText = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => cleanInlineWhitespace(line))
    .filter(Boolean)
    .join("\n")
    .trim();

const cleanPlainText = (value: string) => cleanMultilineText(value).replace(/\n+/g, " ").trim();

export const cleanTranscriptionText = (value: string) => {
  const cleaned = value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned.slice(0, MAX_TRANSCRIPTION_CHARS).trim();
};

const formatSessionDate = (session: ClinicalSession) => {
  const parsed = Date.parse(session.scheduled_at);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return session.created_at.slice(0, 10);
};

const extractMessageContent = (payload: OpenAIChatCompletionResponse) => {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("")
      .trim();
  }
  return "";
};

const sanitizeAssessment = (value: string) => {
  if (!value) return "";
  if (diagnosisMarkers.some((pattern) => pattern.test(value))) {
    return "Leitura cl\u00ednica inicial restrita aos elementos descritos na sess\u00e3o, sem fechamento diagn\u00f3stico autom\u00e1tico.";
  }
  return value;
};

const sanitizeGeneratedClinicalNote = (payload: unknown): GeneratedClinicalNote => {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Structured note payload is invalid");
  }

  const root = payload as Record<string, unknown>;
  const soap = (root.soap ?? {}) as Record<string, unknown>;

  const structured: GeneratedClinicalNote = {
    soap: {
      subjective: cleanMultilineText(String(soap.subjective ?? "")),
      objective: cleanMultilineText(String(soap.objective ?? "")),
      assessment: sanitizeAssessment(cleanMultilineText(String(soap.assessment ?? ""))),
      plan: cleanMultilineText(String(soap.plan ?? "")),
    },
    highlights: Array.isArray(root.highlights)
      ? root.highlights
        .map((item) => cleanPlainText(String(item ?? "")))
        .filter(Boolean)
        .slice(0, 5)
      : [],
    mainComplaint: cleanPlainText(String(root.mainComplaint ?? "")) || undefined,
    context: cleanPlainText(String(root.context ?? "")) || undefined,
  };

  const hasSoapContent = Object.values(structured.soap).some(Boolean);
  if (!hasSoapContent && structured.highlights.length === 0 && !structured.mainComplaint && !structured.context) {
    throw new Error("Structured note came back empty");
  }

  return structured;
};

const buildPrompt = (transcriptionText: string, sessionData: ClinicalSession) => [
  "You are a clinical assistant helping a psychologist write session notes.",
  "",
  "Summarize the following session transcription into a structured SOAP format.",
  "",
  "Follow rules:",
  "- No diagnosis",
  "- No assumptions",
  "- Only summarize what is present",
  "- Use professional clinical tone",
  "",
  `Session ID: ${sessionData.id}`,
  `Session date: ${formatSessionDate(sessionData)}`,
  "",
  "Transcription:",
  transcriptionText,
].join("\n");

export const generateClinicalNote = async (
  transcriptionText: string,
  sessionData: ClinicalSession,
): Promise<GeneratedClinicalNote> => {
  const cleanedTranscription = cleanTranscriptionText(transcriptionText);
  if (!cleanedTranscription) {
    throw new Error("Transcription text is empty");
  }

  if (process.env.ETHOS_DISABLE_LLM === "1" || process.execArgv.includes("--test")) {
    throw new Error("Clinical note LLM is disabled");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You produce safe, factual, non-diagnostic clinical note drafts for licensed psychologists.",
          },
          {
            role: "user",
            content: buildPrompt(cleanedTranscription, sessionData),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "clinical_note_draft",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                soap: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    subjective: { type: "string" },
                    objective: { type: "string" },
                    assessment: { type: "string" },
                    plan: { type: "string" },
                  },
                  required: ["subjective", "objective", "assessment", "plan"],
                },
                highlights: {
                  type: "array",
                  items: { type: "string" },
                },
                mainComplaint: { type: "string" },
                context: { type: "string" },
              },
              required: ["soap", "highlights"],
            },
          },
        },
      }),
    });

    const payload = await response.json() as OpenAIChatCompletionResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `OpenAI request failed with status ${response.status}`);
    }

    if (payload.choices?.[0]?.message?.refusal) {
      throw new Error("Model refused to generate clinical note");
    }

    const rawContent = extractMessageContent(payload);
    if (!rawContent) {
      throw new Error("Structured note response was empty");
    }

    return sanitizeGeneratedClinicalNote(JSON.parse(rawContent));
  } finally {
    clearTimeout(timeout);
  }
};

const fallbackSection = (value: string | undefined, emptyText: string) => value?.trim() || emptyText;

export const formatClinicalDraftNote = (input: {
  session: ClinicalSession;
  sessionNumber: number;
  structured: GeneratedClinicalNote;
}) => {
  const { session, sessionNumber, structured } = input;

  const highlights = structured.highlights.length > 0
    ? structured.highlights.map((item) => `- ${item}`)
    : ["- Sem destaques adicionais extra\u00eddos com seguran\u00e7a a partir da transcri\u00e7\u00e3o."];

  return [
    "---",
    "",
    "## EVOLU\u00c7\u00c3O DA SESS\u00c3O (SOAP)",
    "",
    `Sess\u00e3o n\u00ba: ${sessionNumber}`,
    `Data: ${formatSessionDate(session)}`,
    "",
    "S (Subjetivo):",
    fallbackSection(structured.soap.subjective, "N\u00e3o foi poss\u00edvel resumir elementos subjetivos com seguran\u00e7a."),
    "",
    "O (Objetivo):",
    fallbackSection(structured.soap.objective, "N\u00e3o foram identificados elementos observ\u00e1veis suficientes na transcri\u00e7\u00e3o."),
    "",
    "A (An\u00e1lise):",
    fallbackSection(structured.soap.assessment, "Leitura cl\u00ednica inicial indispon\u00edvel; revisar a transcri\u00e7\u00e3o antes de concluir esta se\u00e7\u00e3o."),
    "",
    "P (Plano):",
    fallbackSection(structured.soap.plan, "Pr\u00f3ximos passos a serem definidos manualmente pelo profissional respons\u00e1vel."),
    "",
    "---",
    "",
    "## QUEIXA PRINCIPAL",
    structured.mainComplaint ?? "N\u00e3o identificada de forma expl\u00edcita na transcri\u00e7\u00e3o.",
    "",
    "## CONTEXTO ATUAL",
    structured.context ?? "N\u00e3o identificado de forma expl\u00edcita na transcri\u00e7\u00e3o.",
    "",
    "## PONTOS IMPORTANTES DA SESS\u00c3O",
    ...highlights,
    "",
    "---",
  ].join("\n");
};

export const formatFallbackClinicalDraftNote = (input: {
  session: ClinicalSession;
  sessionNumber: number;
  transcriptionText: string;
}) => {
  const { session, sessionNumber } = input;
  const cleanedTranscription = cleanTranscriptionText(input.transcriptionText) || "Transcri\u00e7\u00e3o indispon\u00edvel.";

  return [
    "---",
    "",
    "## EVOLU\u00c7\u00c3O DA SESS\u00c3O (SOAP)",
    "",
    `Sess\u00e3o n\u00ba: ${sessionNumber}`,
    `Data: ${formatSessionDate(session)}`,
    "",
    "S (Subjetivo):",
    "Rascunho estruturado indispon\u00edvel no momento. Revisar a transcri\u00e7\u00e3o bruta abaixo para complementar esta se\u00e7\u00e3o.",
    "",
    "O (Objetivo):",
    "Sem extra\u00e7\u00e3o autom\u00e1tica confi\u00e1vel de dados observ\u00e1veis. Revis\u00e3o manual recomendada.",
    "",
    "A (An\u00e1lise):",
    "Interpreta\u00e7\u00e3o cl\u00ednica n\u00e3o automatizada. Manter registro descritivo e completar a an\u00e1lise manualmente.",
    "",
    "P (Plano):",
    "Definir pr\u00f3ximos passos e interven\u00e7\u00f5es ap\u00f3s revis\u00e3o da transcri\u00e7\u00e3o pelo profissional respons\u00e1vel.",
    "",
    "---",
    "",
    "## QUEIXA PRINCIPAL",
    "N\u00e3o identificada automaticamente; revisar a transcri\u00e7\u00e3o.",
    "",
    "## CONTEXTO ATUAL",
    "Contexto a ser complementado manualmente com base na transcri\u00e7\u00e3o.",
    "",
    "## PONTOS IMPORTANTES DA SESS\u00c3O",
    "- Revisar a transcri\u00e7\u00e3o original para estruturar a evolu\u00e7\u00e3o com maior precis\u00e3o.",
    "",
    "---",
    "",
    "## TRANSCRI\u00c7\u00c3O BRUTA",
    cleanedTranscription,
  ].join("\n");
};
