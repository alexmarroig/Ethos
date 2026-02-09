import { Patient, Session } from '@ethos/shared';

// For this demo, we'll implement a mock LLM call that simulates an API request.
// In a real app, this would use fetch() to OpenAI, Anthropic, or a custom backend.

export const genaiService = {
  transformToClinicalNote: async (transcriptText: string, patient: Patient, session: Session, templateType: string = 'prontuario') => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const now = new Date().toLocaleDateString('pt-BR');
    const sessionDate = new Date(session.scheduledAt).toLocaleDateString('pt-BR');

    if (templateType === 'prontuario') {
      return `PRONTUÁRIO PSICOLÓGICO - DOCUMENTO CONFIGURÁVEL\n` +
             `=============================================\n\n` +
             `IDENTIFICAÇÃO\n` +
             `Paciente: ${patient.fullName}\n` +
             `CPF: ${patient.cpf || 'Não informado'}\n` +
             `Data da Sessão: ${sessionDate}\n` +
             `Profissional: [Nome do Psicólogo]\n\n` +
             `RELATO DESCRITIVO (SÍNTESE IA)\n` +
             `------------------------------\n` +
             `O paciente iniciou a sessão abordando temas relacionados a [Conteúdo extraído do áudio]. \n` +
             `Texto processado: ${transcriptText.slice(0, 200)}...\n\n` +
             `OBSERVAÇÕES CLÍNICAS\n` +
             `--------------------\n` +
             `Observou-se [Análise simulada baseada em padrões verbais].\n\n` +
             `CONDUTA E ENCAMINHAMENTOS\n` +
             `-------------------------\n` +
             `Ficou acordado que [Ações futuras].\n\n` +
             `Validado eletronicamente em: ${now}`;
    }

    if (templateType === 'relatorio') {
      return `RELATÓRIO PSICOLÓGICO\n` +
             `=====================\n\n` +
             `1. IDENTIFICAÇÃO\n` +
             `Interessado: ${patient.fullName}\n` +
             `Finalidade: [Finalidade do Relatório]\n\n` +
             `2. DESCRIÇÃO DA DEMANDA\n` +
             `[Síntese da queixa inicial e evolução baseada na sessão de ${sessionDate}]\n\n` +
             `3. PROCEDIMENTO\n` +
             `Realizada sessão de psicoterapia individual.\n\n` +
             `4. ANÁLISE\n` +
             `Com base no relato: "${transcriptText.slice(0, 100)}..."\n\n` +
             `5. CONCLUSÃO\n` +
             `[Parecer técnico]\n\n` +
             `Local e Data: [Cidade], ${now}`;
    }

    return `Documento gerado automaticamente para ${patient.fullName}.\nConteúdo: ${transcriptText}`;
  },

  generateRecibo: (patient: Patient, amount: number, date: string) => {
    return `RECIBO DE HONORÁRIOS PSICOLÓGICOS\n` +
           `==================================\n\n` +
           `Recebi de ${patient.fullName}, CPF ${patient.cpf || '__________'},\n` +
           `a importância de R$ ${(amount/100).toFixed(2)} ([Valor por extenso]),\n` +
           `referente a sessão de psicoterapia realizada em ${new Date(date).toLocaleDateString('pt-BR')}.\n\n` +
           `Psicólogo(a): [Seu Nome]\n` +
           `CRP: [Seu CRP]\n\n` +
           `Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`;
  },

  generateLaudo: (patient: Patient) => {
    return `LAUDO PSICOLÓGICO\n` +
           `=================\n\n` +
           `IDENTIFICAÇÃO\n` +
           `Paciente: ${patient.fullName}\n` +
           `CPF: ${patient.cpf || '__________'}\n\n` +
           `DESCRIÇÃO\n` +
           `[O Laudo é um documento mais complexo que descreve processos psicológicos do paciente...]\n\n` +
           `CONCLUSÃO\n` +
           `[Conclusão técnica baseada em avaliação]\n\n` +
           `Assinatura: __________________________`;
  }
};
