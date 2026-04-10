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
const OPENAI_MODEL = process.env.ETHOS_REPORT_MODEL ?? process.env.ETHOS_CLINICAL_NOTE_MODEL ?? "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = Number(process.env.ETHOS_REPORT_TIMEOUT_MS ?? 20_000);

const extractMessageContent = (payload: OpenAIChatCompletionResponse) => {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => item.text ?? "").join("").trim();
  }
  return "";
};

const normalizeText = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

type ReportRequest = {
  psychologistName: string;
  crp?: string;
  patientName?: string;
  dateLabel?: string;
  attendanceType?: string;
  sourceText: string;
};

const buildManualPrompt = (input: ReportRequest) => `Você é um psicólogo clínico experiente, especialista em documentação psicológica conforme as diretrizes do Conselho Federal de Psicologia (Brasil).

Sua tarefa é transformar as anotações abaixo em um relatório de sessão psicológica profissional.

REGRAS OBRIGATÓRIAS:
- Use linguagem técnica, clara e objetiva
- NÃO invente informações
- NÃO extrapole além do que foi descrito
- NÃO use julgamentos ou termos moralizantes
- Evite interpretações profundas não sustentadas
- Mantenha foco em comportamento, relato e manejo clínico
- Preserve sigilo: use apenas iniciais do paciente
- Escreva em português formal

FORMATO OBRIGATÓRIO:

---
RELATÓRIO DE SESSÃO PSICOLÓGICA

Psicólogo(a): ${input.psychologistName}
CRP: ${input.crp || "{crp}"}
Paciente: ${input.patientName || "{iniciais_paciente}"}
Data: ${input.dateLabel || "{data}"}
Tipo de atendimento: ${input.attendanceType || "{tipo}"}

1. Demanda / Contexto:
[texto]

2. Descrição da sessão:
[texto]

3. Intervenções realizadas:
[texto]

4. Impressões clínicas:
[texto]

5. Encaminhamentos / Plano:
[texto]
---

Agora transforme as anotações abaixo no relatório:

ANOTAÇÕES:
${input.sourceText}`;

const buildTranscriptPrompt = (input: ReportRequest) => `Você é um psicólogo clínico especialista em análise de sessões e documentação conforme o CFP.

Abaixo está uma transcrição bruta de uma sessão psicológica. Ela pode conter:
- erros de fala
- repetições
- linguagem informal
- informações irrelevantes

Sua tarefa:

1. LIMPAR a transcrição:
- remover repetições e ruído
- organizar ideias
- manter apenas conteúdo clínico relevante

2. PRESERVAR SIGILO:
- substituir nomes por iniciais
- remover informações identificáveis desnecessárias

3. GERAR RELATÓRIO no formato profissional abaixo

REGRAS:
- NÃO inventar conteúdo
- NÃO interpretar além do explícito
- usar linguagem técnica
- foco em objetividade clínica

FORMATO:

---
RELATÓRIO DE SESSÃO PSICOLÓGICA

Psicólogo(a): ${input.psychologistName}
CRP: ${input.crp || "{crp}"}
Paciente: ${input.patientName || "{iniciais_paciente}"}
Data: ${input.dateLabel || "{data}"}
Tipo de atendimento: ${input.attendanceType || "{tipo}"}

1. Demanda / Contexto:
[texto]

2. Descrição da sessão:
[texto]

3. Intervenções realizadas:
[texto]

4. Impressões clínicas:
[texto]

5. Encaminhamentos / Plano:
[texto]
---

TRANSCRIÇÃO:
${input.sourceText}`;

const runReportPrompt = async (prompt: string) => {
  if (process.env.ETHOS_DISABLE_LLM === "1" || process.execArgv.includes("--test")) {
    throw new Error("LLM de relatórios desabilitada");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada");
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
            content: "Você gera relatórios psicológicos técnicos, objetivos, sem inventar conteúdo, seguindo diretrizes éticas do CFP.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const payload = await response.json() as OpenAIChatCompletionResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Falha na OpenAI com status ${response.status}`);
    }
    if (payload.choices?.[0]?.message?.refusal) {
      throw new Error("O modelo recusou gerar o relatório");
    }

    const content = extractMessageContent(payload);
    if (!content) throw new Error("Resposta vazia da LLM");
    return normalizeText(content);
  } finally {
    clearTimeout(timeout);
  }
};

export const generateReportFromNotes = async (input: ReportRequest) =>
  runReportPrompt(buildManualPrompt({ ...input, sourceText: normalizeText(input.sourceText) }));

export const generateReportFromTranscript = async (input: ReportRequest) =>
  runReportPrompt(buildTranscriptPrompt({ ...input, sourceText: normalizeText(input.sourceText) }));
