// Local type definitions extracted from @ethos/shared
// These replace the workspace dependency which is not resolvable in EAS Build context.

export type Patient = {
  id: string;
  fullName: string;
  phoneNumber?: string;
  cpf?: string;
  cep?: string;
  address?: string;
  supportNetwork?: string;
  sessionPrice?: number;
  isProBono?: boolean;
  isExempt?: boolean;
  birthDate?: string;
  notes?: string;
  createdAt: string;
};

export type Session = {
  id: string;
  patientId: string;
  scheduledAt: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  audioId?: string;
  transcriptId?: string;
  noteId?: string;
};
