export type Patient = {
  id: string;
  fullName: string;
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
  | "cancelled"
  | "interrupted";

export type TranscriptionJob = {
  id: string;
  sessionId: string;
  audioPath: string;
  model: "ptbr-fast" | "ptbr-accurate";
  status: TranscriptionJobStatus;
  progress: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelOption = {
  id: "ptbr-fast" | "ptbr-accurate";
  name: string;
  description: string;
  checksum: string;
  version: string;
};

// IPC Message Types
export type IPCMessage =
  | { type: "enqueue"; payload: { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" } }
  | { type: "cancel"; payload: { jobId: string } }
  | { type: "status"; payload: { jobId: string } }
  | { type: "job_update"; payload: TranscriptionJob }
  | { type: "job_result"; payload: { jobId: string; transcript: Omit<Transcript, "id" | "createdAt" | "sessionId"> } }
  | { type: "job_error"; payload: { jobId: string; error: string } };

export interface IEthosAPI {
  openAudioDialog: () => Promise<string | null>;
  enqueueTranscription: (payload: { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" }) => Promise<string>;
  onTranscriptionMessage: (handler: (message: IPCMessage) => void) => () => void;
  onTranscriptionError: (handler: (message: string) => void) => () => void;
}

declare global {
  interface Window {
    ethos: IEthosAPI;
  }
}
