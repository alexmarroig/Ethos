export type RecordingSessionInfo = {
  recordingId: string;
  filePath: string;
};

export type RecordingStartOptions = {
  stream: MediaStream;
  mimeType?: string;
  sessionId?: string;
  timesliceMs?: number;
  onError?: (error: Error) => void;
};

export class AudioRecordingService {
  private session: {
    recordingId: string;
    filePath: string;
    mediaRecorder: MediaRecorder;
  } | null = null;

  async start(options: RecordingStartOptions): Promise<RecordingSessionInfo> {
    if (!window.ethos?.audio) {
      throw new Error("Audio bridge is not available");
    }
    const mimeType = options.mimeType ?? "audio/webm;codecs=opus";
    const timesliceMs = options.timesliceMs ?? 5000;
    const { recordingId, filePath } = await window.ethos.audio.startSession({
      sessionId: options.sessionId,
      mimeType,
    });
    const mediaRecorder = new MediaRecorder(options.stream, { mimeType });
    mediaRecorder.addEventListener("dataavailable", async (event) => {
      if (!event.data || event.data.size === 0) return;
      try {
        const buffer = await event.data.arrayBuffer();
        await window.ethos?.audio?.appendChunk({ recordingId, data: buffer });
      } catch (error) {
        options.onError?.(error instanceof Error ? error : new Error("Failed to append audio chunk"));
      }
    });
    mediaRecorder.addEventListener("error", () => {
      options.onError?.(new Error("MediaRecorder failed"));
    });
    mediaRecorder.start(timesliceMs);
    this.session = { recordingId, filePath, mediaRecorder };
    return { recordingId, filePath };
  }

  async stop(): Promise<RecordingSessionInfo | null> {
    if (!this.session || !window.ethos?.audio) {
      return null;
    }
    const { recordingId, filePath, mediaRecorder } = this.session;
    const stopPromise = new Promise<void>((resolve) => {
      if (mediaRecorder.state === "inactive") {
        resolve();
        return;
      }
      mediaRecorder.addEventListener("stop", () => resolve(), { once: true });
    });
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    await stopPromise;
    const finishedSession = await window.ethos.audio.finishSession({ recordingId });
    this.session = null;
    return { recordingId, filePath: finishedSession.filePath ?? filePath };
  }

  async pause(): Promise<void> {
    if (!this.session) {
      return;
    }
    const { mediaRecorder } = this.session;
    if (mediaRecorder.state === "recording") {
      mediaRecorder.pause();
    }
  }

  async resume(): Promise<void> {
    if (!this.session) {
      return;
    }
    const { mediaRecorder } = this.session;
    if (mediaRecorder.state === "paused") {
      mediaRecorder.resume();
    }
  }

  async abort(): Promise<void> {
    if (!this.session || !window.ethos?.audio) {
      return;
    }
    const { recordingId, mediaRecorder } = this.session;
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    await window.ethos.audio.abortSession({ recordingId });
    this.session = null;
  }
}
