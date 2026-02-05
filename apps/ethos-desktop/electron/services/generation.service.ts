import { Transcript, Patient, Session } from '@ethos/shared';

export const generationService = {
  generateProntuario: (transcript: Omit<Transcript, 'id' | 'createdAt'>, patient: Patient, session: Session): string => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');

    let doc = `PRONTUÁRIO DE ATENDIMENTO CLÍNICO\n`;
    doc += `==================================\n\n`;

    doc += `IDENTIFICAÇÃO\n`;
    doc += `-------------\n`;
    doc += `Paciente: ${patient.fullName}\n`;
    doc += `Data da Sessão: ${new Date(session.scheduledAt).toLocaleDateString('pt-BR')}\n`;
    doc += `Data de Geração: ${dateStr}\n\n`;

    doc += `RELATO DO PACIENTE\n`;
    doc += `------------------\n`;
    doc += `O paciente apresentou os seguintes relatos durante a sessão:\n`;
    doc += `"${transcript.fullText}"\n\n`;

    doc += `OBSERVAÇÕES CLÍNICAS\n`;
    doc += `--------------------\n`;
    doc += `Durante a sessão, observou-se o seguinte conteúdo emergente:\n`;
    // Here we could add logic to extract patterns if we had an LLM,
    // but for deterministic MVP we use placeholders based on the transcript duration/segments
    doc += `[Descrição descritiva baseada no conteúdo verbalizado, sem inferências diagnósticas].\n\n`;

    doc += `INTERVENÇÕES E ENCAMINHAMENTOS\n`;
    doc += `------------------------------\n`;
    doc += `Combinados e encaminhamentos realizados:\n`;
    doc += `- [Preencher se houver encaminhamentos explícitos]\n\n`;

    doc += `----------------------------------\n`;
    doc += `Nota Ética: Este documento foi gerado automaticamente como rascunho de apoio e deve ser validado pelo profissional. Proibido diagnóstico automático.\n`;

    return doc;
  }
};
