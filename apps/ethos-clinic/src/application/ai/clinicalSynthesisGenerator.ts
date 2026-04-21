import { buildLlmHeaders, LLM_API_KEY, LLM_API_URL } from "./llmConfig";
import { ClinicalNote, ClinicalSession, ClinicalReport } from "../../domain/types";

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

const defaultModel =
  LLM_API_URL.includes("openrouter.ai")
    ? "deepseek/deepseek-chat-v3-0324:free"
    : "gpt-4o-mini";

const OPENAI_MODEL =
  process.env.OPENROUTER_CLINICAL_NOTE_MODEL
  ?? process.env.ETHOS_CLINICAL_NOTE_MODEL
  ?? defaultModel;

const OPENAI_TIMEOUT_MS = Number(process.env.ETHOS_CLINICAL_NOTE_TIMEOUT_MS ?? 30_000);

const extractMessageContent = (payload: OpenAIChatCompletionResponse) => {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => item.text ?? "").join("").trim();
  }
  return "";
};

export type SynthesisInput = {
  sessions: ClinicalSession[];
  notes: ClinicalNote[];
  reports: ClinicalReport[];
  observations?: string[];
};

const buildPrompt = (input: SynthesisInput) => {
  const notesText = input.notes.map(n => `Data: ${n.created_at.slice(0, 10)}\nConteúdo: ${n.content.slice(0, 2000)}`).join("\n\n");
  const reportsText = input.reports.map(r => `Data: ${r.created_at.slice(0, 10)}\nTipo: ${r.kind}\nConteúdo: ${r.content.slice(0, 2000)}`).join("\n\n");
  const observationsText = (input.observations ?? []).join("\n");

  return `Você é um assistente clínico especializado em organização de informações psicológicas.
Sua função é gerar uma SÍNTESE CLÍNICA INTEGRADA a partir de múltiplas fontes de dados do paciente.

## PAPEL
Você NÃO realiza diagnóstico.
Você NÃO interpreta além do que foi registrado.
Você NÃO sugere intervenções específicas.

Seu papel é:
→ organizar
→ consolidar
→ estruturar

## OBJETIVO
Gerar um resumo que permita ao psicólogo:
- entender rapidamente o estado atual do caso
- visualizar continuidade ao longo do tempo
- identificar padrões recorrentes
- reconhecer mudanças recentes
- localizar pontos ainda em aberto

## INSTRUÇÕES DE PROCESSAMENTO
1. Considere TODAS as fontes como complementares.
2. Priorize informações que aparecem em mais de uma fonte.
3. Priorize sessões recentes sobre as antigas ao identificar padrões.
4. Se padrões mudaram ao longo do tempo, reflita essa mudança em vez de mesclá-los de forma estática.
5. Identifique:
   → REPETIÇÕES (temas/emocoes/comportamentos recorrentes)
   → CONTINUIDADE (assuntos persistentes ao longo do tempo)
   → MUDANÇAS (novos comportamentos, percepções ou relatos)
   → CONTRADIÇÕES (quando houver divergência entre sessões)
   → PONTOS NÃO RESOLVIDOS (temas recorrentes sem evolução clara)
6. NÃO extrapole além do conteúdo fornecido. NÃO invente informações.
7. Não generalize entre sessões não relacionadas.
8. Não mescle temas distintos a menos que explicitamente repetidos.
9. Se houver pouco dado, indique explicitamente.

## FORMATO DE SAÍDA (OBRIGATÓRIO)
📍 Estado Clínico Atual

• Foco principal atual:
[Baseado na convergência entre sessões, prontuários e relatórios recentes]

• Temas recorrentes:
- [tema recorrente 1]
- [tema recorrente 2]
- [tema recorrente 3]

• Padrões observados:
- [comportamentos ou dinâmicas recorrentes]
- [outro padrão]

• Movimento recente:
[Descreva mudanças ao longo do tempo — evolução ou regressão]

• Contradições ou oscilações (se houver):
[ex: melhora relatada vs comportamento persistente]

• Pontos em aberto:
- [tema que permanece sem resolução]
- [outro ponto]

• Direções possíveis (NÃO prescritivas):
- [direção de exploração baseada no histórico]
- [outra direção]

## REGRAS CRÍTICAS (OBRIGATÓRIO)
- NÃO usar: diagnóstico clínico, nomes de transtornos, linguagem prescritiva.
- NÃO escrever: "paciente apresenta", "deve fazer", "recomenda-se".
- USAR: "relatos indicam", "observa-se", "há recorrência de", "mantém-se".

## PRIORIDADE DE INFORMAÇÃO
Se houver conflito:
1. Padrões repetidos ao longo do tempo têm mais peso.
2. Registros mais recentes têm mais peso que antigos.
3. Dados estruturados têm mais peso que texto ambíguo.

## LIMITE
Responda em no máximo 200 palavras.

## FALLBACK
Se não houver dados suficientes:
→ "Dados insuficientes para identificar padrões clínicos consistentes."

---
DADOS PARA PROCESSAMENTO (LIMITADOS AOS MAIS RECENTES):

NOTAS CLÍNICAS (SOAP/EVOLUÇÃO):
${notesText || "Nenhuma nota fornecida."}

RELATÓRIOS:
${reportsText || "Nenhum relatório fornecido."}

OBSERVAÇÕES ADICIONAIS:
${observationsText || "Nenhuma observação fornecida."}
`;
};

export const generateClinicalSynthesis = async (input: SynthesisInput): Promise<string> => {
  if (process.env.ETHOS_DISABLE_LLM === "1" || process.execArgv.includes("--test")) {
    return "Simulação de Síntese Clínica Integrada (LLM desabilitada).";
  }

  if (!LLM_API_KEY) {
    throw new Error("Configure OPENROUTER_API_KEY ou OPENAI_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(LLM_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: buildLlmHeaders(),
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: "Você é um assistente clínico de psicologia focado em síntese de dados sem diagnóstico.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
      }),
    });

    const payload = await response.json() as OpenAIChatCompletionResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `OpenAI request failed with status ${response.status}`);
    }

    const content = extractMessageContent(payload);
    if (!content) throw new Error("Synthesis response was empty");
    return content;
  } finally {
    clearTimeout(timeout);
  }
};
