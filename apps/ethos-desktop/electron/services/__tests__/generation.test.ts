import { describe, it, expect } from 'vitest';
import { generationService } from '../generation.service';
import { Patient, Session, Transcript } from '@ethos/shared';

describe('generationService', () => {
  it('should generate a structured clinical note', () => {
    const patient: Patient = { id: 'p1', fullName: 'Marina Alves', createdAt: '' };
    const session: Session = { id: 's1', patientId: 'p1', scheduledAt: '2025-02-15T10:00:00Z', status: 'scheduled' };
    const transcript: Omit<Transcript, 'id' | 'createdAt'> = {
      sessionId: 's1',
      language: 'pt',
      fullText: 'O paciente relatou cansaço extremo.',
      segments: []
    };

    const doc = generationService.generateProntuario(transcript, patient, session);

    expect(doc).toContain('PRONTUÁRIO DE ATENDIMENTO CLÍNICO');
    expect(doc).toContain('Marina Alves');
    expect(doc).toContain('O paciente relatou cansaço extremo.');
    expect(doc).toContain('OBSERVAÇÕES CLÍNICAS');
    expect(doc).toContain('Nota Ética');
  });
});
