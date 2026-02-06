import type { TranscriptionJob } from "@ethos/shared";

export type TranscriptionResult = {
  jobId: string;
  transcript: {
    language: string;
    fullText: string;
    segments: Array<{ start: number; end: number; text: string }>;
  };
};

export type TranscriptionError = {
  jobId: string;
  error: string;
};

declare global {
  interface Window {
    ethos?: {
      openAudioDialog: () => Promise<string | null>;
      enqueueTranscription: (payload: { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" }) => Promise<string>;
      audio: {
        startSession: (payload: { sessionId?: string; mimeType: string }) => Promise<{ recordingId: string; filePath: string }>;
        appendChunk: (payload: { recordingId: string; data: ArrayBuffer }) => Promise<{ ok: boolean }>;
        finishSession: (payload: { recordingId: string }) => Promise<{ filePath: string }>;
        abortSession: (payload: { recordingId: string }) => Promise<{ ok: boolean }>;
        deleteRecording: (payload: { filePath: string }) => Promise<{ ok: boolean }>;
        openRecording: (payload: { filePath: string }) => Promise<{ ok: boolean; error?: string }>;
        showRecording: (payload: { filePath: string }) => Promise<{ ok: boolean }>;
        exportRecording: (payload: { filePath: string; defaultName?: string }) => Promise<{ ok: boolean; canceled?: boolean; filePath?: string }>;
      };
      onTranscriptionMessage: (handler: (message: string) => void) => void;
      onTranscriptionError: (handler: (message: string) => void) => void;
    };
  }
}

export class TranscriptionService {
  private listeners: Array<(job: TranscriptionJob) => void> = [];
  private resultListeners: Array<(result: TranscriptionResult) => void> = [];
  private errorListeners: Array<(error: TranscriptionError) => void> = [];

  constructor() {
    window.ethos?.onTranscriptionMessage((message) => {
      try {
        const payload = JSON.parse(message);
        if (payload.type === "job_update") {
          this.listeners.forEach((listener) => listener(payload.payload));
          return;
        }
        if (payload.type === "job_result") {
          this.resultListeners.forEach((listener) => listener(payload.payload));
          return;
        }
        if (payload.type === "job_error") {
          this.errorListeners.forEach((listener) => listener(payload.payload));
        }
      } catch {
        // ignore malformed messages
      }
    });
  }

  onJobUpdate(handler: (job: TranscriptionJob) => void) {
    this.listeners.push(handler);
  }

  onJobResult(handler: (result: TranscriptionResult) => void) {
    this.resultListeners.push(handler);
  }

  onJobError(handler: (error: TranscriptionError) => void) {
    this.errorListeners.push(handler);
  }

  async pickAudio() {
    return window.ethos?.openAudioDialog();
  }

  async enqueueTranscription(sessionId: string, audioPath: string, model: "ptbr-fast" | "ptbr-accurate") {
    return window.ethos?.enqueueTranscription({ sessionId, audioPath, model });
  }
}
