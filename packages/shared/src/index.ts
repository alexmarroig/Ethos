export type Patient = {
  id: string;
  name: string;
  email: string;
  fullName?: string;
  birthDate?: string;
  notes?: string;
  createdAt: string;
};

export type Session = {
  id: string;
  patientId: string;
  scheduledAt: string;
  status: "scheduled" | "in_progress" | "completed";
  audioId?: string;
  transcriptId?: string;
  noteId?: string;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type Transcript = {
  id: string;
  sessionId: string;
  language: string;
  fullText: string;
  segments: TranscriptSegment[];
  createdAt: string;
};

export type ClinicalNote = {
  id: string;
  sessionId: string;
  version: number;
  status: "draft" | "validated";
  generatedText: string;
  editedText?: string;
  validatedAt?: string;
  validatedBy?: string;
  createdAt: string;
};

export type TranscriptionJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type TranscriptionJob = {
  id: string;
  sessionId: string;
  audioPath: string;
  model: "ptbr-fast" | "ptbr-accurate";
  status: TranscriptionJobStatus;
  progress: number;
  error?: string;
};

export type ModelOption = {
  id: "ptbr-fast" | "ptbr-accurate";
  name: string;
  description: string;
  checksum: string;
  version: string;
};

export interface IEthosAudioAPI {
  save?: (payload: { data: ArrayBuffer; mimeType: string }) => Promise<{ filePath: string } | null>;
}

export interface IEthosAPI {
  saveAudio?: (payload: { data: ArrayBuffer; mimeType: string }) => Promise<{ filePath: string } | null>;
  audio?: IEthosAudioAPI;
}

declare global {
  interface Window {
    ethos?: IEthosAPI;
  }
}
