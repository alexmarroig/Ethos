import type { IEthosAPI } from "@ethos/shared";

export type TranscriptionModel = "ptbr-fast" | "ptbr-accurate";

declare module "@ethos/shared" {
  interface IEthosAudioAPI {
    startSession?: (payload: { sessionId?: string; mimeType: string }) => Promise<{ recordingId: string; filePath: string }>;
    appendChunk?: (payload: { recordingId: string; data: ArrayBuffer }) => Promise<{ ok: boolean }>;
    finishSession?: (payload: { recordingId: string }) => Promise<{ filePath: string }>;
    abortSession?: (payload: { recordingId: string }) => Promise<{ ok: boolean }>;
    deleteRecording?: (payload: { filePath: string }) => Promise<{ ok: boolean; error?: string }>;
    exportRecording?: (payload: { filePath: string; defaultName?: string }) => Promise<{ ok: boolean; canceled?: boolean; filePath?: string; error?: string }>;
    openRecording?: (payload: { filePath: string }) => Promise<{ ok: boolean; error?: string }>;
    showRecording?: (payload: { filePath: string }) => Promise<{ ok: boolean }>;
  }

  interface IEthosAPI {
    openAudioDialog?: () => Promise<string | null>;
    enqueueTranscription?: (payload: { sessionId: string; audioPath: string; model: TranscriptionModel }) => Promise<string>;
    onTranscriptionMessage?: (handler: (message: string) => void) => void;
    onTranscriptionError?: (handler: (message: string) => void) => void;
  }
}

export type EthosAPI = IEthosAPI;
