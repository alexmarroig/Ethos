import { clearTranscriptionTemp, ensureSecureDirectories, TRANSCRIPTION_TEMP_DIR } from "../storage/secureDirectories";
import { decryptAudioToCache } from "../storage/vaultStorage";
import { loadDeviceCapability, saveDeviceCapability, scoreFromRtf, selectModelForScore } from "./deviceCapability";
import { ensureModelAvailable, listModelFallbacks } from "./modelDownloader";
import { transcribeWithWhisper } from "./whisperBridge";

export type TranscriptionStatus =
  | "idle"
  | "downloading"
  | "preparing"
  | "transcribing"
  | "done"
  | "failed";

export type TranscriptionResult = {
  status: TranscriptionStatus;
  text?: string;
  modelId?: "turbo-q5_0" | "small" | "base";
  rtf?: number;
  latencyMs?: number;
  degraded?: boolean;
  error?: string;
  shouldSuggestDowngrade?: boolean;
};

type TranscriptionInput = {
  recordingId: string;
  vaultUri: string;
  durationMs: number;
  onStatus?: (status: TranscriptionStatus) => void;
  signal?: AbortSignal;
};

const cachePathFor = (recordingId: string) => `${TRANSCRIPTION_TEMP_DIR}/${recordingId}-transcribe.m4a`;

const shouldDowngradeOnError = (error: Error) => {
  const message = error.message.toLowerCase();
  return message.includes("oom") || message.includes("out of memory") || message.includes("memory");
};

const guardAbort = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error("Transcrição cancelada.");
};

export const transcribeRecording = async (input: TranscriptionInput): Promise<TranscriptionResult> => {
  const { recordingId, vaultUri, durationMs, onStatus, signal } = input;
  const update = (status: TranscriptionStatus) => onStatus?.(status);
  await ensureSecureDirectories();
  await clearTranscriptionTemp();

  guardAbort(signal);
  update("preparing");

  const capability = await loadDeviceCapability();
  const selectedModel = capability ? selectModelForScore(capability.score) : "small";

  const attemptTranscription = async (modelId: "turbo-q5_0" | "small" | "base") => {
    guardAbort(signal);
    update("downloading");
    const modelPath = await ensureModelAvailable(modelId);

    guardAbort(signal);
    update("preparing");
    const cachePath = cachePathFor(recordingId);
    await decryptAudioToCache(vaultUri, cachePath);

    guardAbort(signal);
    update("transcribing");
    const start = Date.now();
    const result = await transcribeWithWhisper(cachePath, modelPath);
    const latencyMs = Date.now() - start;
    const rtf = durationMs > 0 ? latencyMs / durationMs : latencyMs / 1000;

    return { text: result.text, latencyMs, rtf, modelId };
  };

  try {
    const modelsToTry = [selectedModel, ...listModelFallbacks(selectedModel)];
    let lastError: Error | null = null;

    for (const modelId of modelsToTry) {
      try {
        const result = await attemptTranscription(modelId);
        const score = scoreFromRtf(result.rtf);
        const degraded = modelId !== selectedModel || result.rtf > 10;
        await saveDeviceCapability({
          modelId: result.modelId,
          rtf: result.rtf,
          latencyMs: result.latencyMs,
          score,
          degraded,
          updatedAt: new Date().toISOString(),
        });
        update("done");
        return {
          status: "done",
          text: result.text,
          modelId: result.modelId,
          rtf: result.rtf,
          latencyMs: result.latencyMs,
          degraded,
          shouldSuggestDowngrade: result.rtf > 10,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Falha ao transcrever.");
        if (!shouldDowngradeOnError(lastError) && modelId === selectedModel) {
          continue;
        }
      }
    }

    update("failed");
    return { status: "failed", error: lastError?.message ?? "Falha ao transcrever." };
  } finally {
    await clearTranscriptionTemp();
  }
};
