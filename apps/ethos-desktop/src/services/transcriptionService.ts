import { TranscriptionJob } from "@ethos/shared";

export class TranscriptionService {
  private listeners: Array<(job: TranscriptionJob) => void> = [];

  constructor() {
    window.ethos?.onTranscriptionMessage((message: any) => {
      // If message is already an object, use it directly
      const payload = typeof message === 'string' ? JSON.parse(message) : message;
      if (payload && payload.type === "job_update") {
        this.listeners.forEach((listener) => listener(payload.payload));
      }
    });
  }

  onJobUpdate(handler: (job: TranscriptionJob) => void) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== handler);
    };
  }

  async selectAudioFile() {
    return window.ethos?.openAudioDialog();
  }

  async enqueueTranscription(sessionId: string, audioPath: string, model: "ptbr-fast" | "ptbr-accurate") {
    return window.ethos?.enqueueTranscription({ sessionId, audioPath, model });
  }
}
