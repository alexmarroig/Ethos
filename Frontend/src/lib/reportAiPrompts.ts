type ReportPromptContext = {
  psychologistName: string;
  crp?: string;
  patientName?: string;
  dateLabel?: string;
  attendanceType?: string;
  sourceText: string;
};

const getInitials = (name?: string) => {
  if (!name) return "P.C.";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(".");
};

export const buildManualSessionReportPrompt = ({
  psychologistName,
  crp,
  patientName,
  dateLabel,
  attendanceType,
  sourceText,
}: ReportPromptContext) => `Você é um psicólogo clínico experiente, especialista em documentação psicológica conforme as diretrizes do Conselho Federal de Psicologia (Brasil).

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

Psicólogo(a): ${psychologistName}
CRP: ${crp || "{crp}"}
Paciente: ${getInitials(patientName)}
Data: ${dateLabel || "{data}"}
Tipo de atendimento: ${attendanceType || "Psicoterapia"}

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
${sourceText}`;

export const buildTranscriptSessionReportPrompt = ({
  psychologistName,
  crp,
  patientName,
  dateLabel,
  attendanceType,
  sourceText,
}: ReportPromptContext) => `Você é um psicólogo clínico especialista em análise de sessões e documentação conforme o CFP.

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

Psicólogo(a): ${psychologistName}
CRP: ${crp || "{crp}"}
Paciente: ${getInitials(patientName)}
Data: ${dateLabel || "{data}"}
Tipo de atendimento: ${attendanceType || "Psicoterapia"}

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
${sourceText}`;
