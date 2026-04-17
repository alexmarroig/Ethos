"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDraftNote = exports.generateDraftNote = void 0;
const sanitize = (text) => text.replace(/\s+/g, " ").trim();
const generateDraftNote = ({ sessionId, transcript, manualNotes, }) => {
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
exports.generateDraftNote = generateDraftNote;
const validateDraftNote = (note, validatedBy) => {
    return {
        ...note,
        status: "validated",
        validatedBy,
        validatedAt: new Date().toISOString(),
    };
};
exports.validateDraftNote = validateDraftNote;
