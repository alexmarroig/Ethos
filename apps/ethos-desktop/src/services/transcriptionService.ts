import type { TranscriptionJob } from "@ethos/shared";

interface IEthosAPI {
  onTranscriptionMessage?: (callback: (message: string) => void) => void;
  openAudioDialog?: () => Promise<string | null>;
  enqueueTranscription?: (payload: { sessionId: string; audioPath: string; model: "ptbr-fast" | "ptbr-accurate" }) => Promise<void>;
}


export class TranscriptionService {
  private listeners: Array<(job: TranscriptionJob) => void> = [];

  constructor() {
    window.ethos?.onTranscriptionMessage((message) => {
      try {
        const payload = JSON.parse(message) as { type: "job_update"; payload: TranscriptionJob };
        if (payload.type === "job_update") {
          this.listeners.forEach((listener) => listener(payload.payload));
        }
      } catch {
        // ignore malformed messages
      }
    });
  }

  onJobUpdate(handler: (job: TranscriptionJob) => void) {
    this.listeners.push(handler);
  }

  async pickAudio() {
    return window.ethos?.openAudioDialog();
  }

  async enqueueTranscription(sessionId: string, audioPath: string, model: "ptbr-fast" | "ptbr-accurate") {
    return window.ethos?.enqueueTranscription({ sessionId, audioPath, model });
  }
}
