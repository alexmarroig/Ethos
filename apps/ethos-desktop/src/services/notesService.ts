import type { ClinicalNote } from "@ethos/shared";

const sanitize = (text: string) => text.replace(/\s+/g, " ").trim();

export const generateDraftNote = ({
  sessionId,
  transcript,
  manualNotes,
}: {
  sessionId: string;
  transcript: string;
  manualNotes?: string;
}): ClinicalNote => {
  const baseText = sanitize(transcript);
  const manual = manualNotes ? ` Observações adicionais do profissional: ${sanitize(manualNotes)}.` : "";

  const generatedText = `RASCUNHO — Durante a sessão, o profissional ouviu atentamente o relato do paciente. O conteúdo registrado foi descrito de forma objetiva e sem inferências clínicas. Registro textual: ${baseText}.${manual}`;

  return {
    id: crypto.randomUUID(),
    sessionId,
    version: 1,
    status: "draft",
    generatedText,
    createdAt: new Date().toISOString(),
  };
};

export const validateDraftNote = (note: ClinicalNote, validatedBy: string): ClinicalNote => {
  return {
    ...note,
    status: "validated",
    validatedBy,
    validatedAt: new Date().toISOString(),
  };
};
