import type { TranscriptionJob } from "@ethos/shared";
import type { TranscriptionModel } from "../types/ethos";

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

type TranscriptionEventPayload =
  | { type: "job_update"; payload: TranscriptionJob }
  | { type: "job_result"; payload: TranscriptionResult }
  | { type: "job_error"; payload: TranscriptionError };

export class TranscriptionService {
  private listeners: Array<(job: TranscriptionJob) => void> = [];
  private resultListeners: Array<(result: TranscriptionResult) => void> = [];
  private errorListeners: Array<(error: TranscriptionError) => void> = [];

  constructor() {
    window.ethos?.onTranscriptionMessage?.((message: string) => {
      try {
        const payload = JSON.parse(message) as TranscriptionEventPayload;
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

  onJobUpdate(handler: (job: TranscriptionJob) => void): void {
    this.listeners.push(handler);
  }

  onJobResult(handler: (result: TranscriptionResult) => void): void {
    this.resultListeners.push(handler);
  }

  onJobError(handler: (error: TranscriptionError) => void): void {
    this.errorListeners.push(handler);
  }

  async pickAudio(): Promise<string | null | undefined> {
    return window.ethos?.openAudioDialog?.();
  }

  async enqueueTranscription(
    sessionId: string,
    audioPath: string,
    model: TranscriptionModel,
  ): Promise<string | undefined> {
    return window.ethos?.enqueueTranscription?.({ sessionId, audioPath, model });
  }
}
