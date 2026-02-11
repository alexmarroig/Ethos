import { getDb } from '../db';

export const genaiService = {
  /**
   * Mocked AI transformation for CRP-compliant notes.
   */
  transformNote: async (payload: { transcriptText: string; sessionId: string; templateType: string }) => {
    // In a real V1, this would call a local LLM or a secure proxy.
    // For now, we simulate the structure.

    const sections = [
      "IDENTIFICAÇÃO: Sessão clínica de psicoterapia.",
      `RELATO DO PACIENTE: ${payload.transcriptText.slice(0, 200)}...`,
      "OBSERVAÇÕES CLÍNICAS: Paciente demonstra congruência afetiva.",
      "INTERVENÇÕES: Escuta ativa e validação de sentimentos.",
      "ENCAMINHAMENTOS: Manter frequência semanal."
    ];

    return sections.join("\n\n");
  },

  generateRecibo: async (payload: { patientId: string; amount: number; date: string }) => {
    return `RECIBO DE PAGAMENTO\n\nRecebi a importância de R$ ${(payload.amount / 100).toFixed(2)} referente a serviços de psicoterapia.\nData: ${new Date(payload.date).toLocaleDateString("pt-BR")}`;
  }
};
