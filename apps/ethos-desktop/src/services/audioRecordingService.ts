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
    const audioApi = window.ethos?.audio;
    if (!audioApi?.startSession || !audioApi.appendChunk) {
      throw new Error("Audio bridge is not available");
    }

    const mimeType = options.mimeType ?? "audio/webm;codecs=opus";
    const timesliceMs = options.timesliceMs ?? 5000;
    const { recordingId, filePath } = await audioApi.startSession({
      sessionId: options.sessionId,
      mimeType,
    });

    const mediaRecorder = new MediaRecorder(options.stream, { mimeType });
    mediaRecorder.addEventListener("dataavailable", async (event) => {
      if (!event.data || event.data.size === 0) return;
      try {
        const buffer = await event.data.arrayBuffer();
        await audioApi.appendChunk?.({ recordingId, data: buffer });
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
    const audioApi = window.ethos?.audio;
    if (!this.session || !audioApi?.finishSession) {
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

    const finishedSession = await audioApi.finishSession({ recordingId });
    this.session = null;
    return { recordingId, filePath: finishedSession.filePath ?? filePath };
  }

  pause(): void {
    if (!this.session) {
      return;
    }
    const { mediaRecorder } = this.session;
    if (mediaRecorder.state === "recording") {
      mediaRecorder.pause();
    }
  }

  resume(): void {
    if (!this.session) {
      return;
    }
    const { mediaRecorder } = this.session;
    if (mediaRecorder.state === "paused") {
      mediaRecorder.resume();
    }
  }

  async abort(): Promise<void> {
    const audioApi = window.ethos?.audio;
    if (!this.session || !audioApi?.abortSession) {
      return;
    }

    const { recordingId, mediaRecorder } = this.session;
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    await audioApi.abortSession({ recordingId });
    this.session = null;
  }
}
