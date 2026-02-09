import * as FileSystem from "expo-file-system";
import { TRANSCRIPTION_TEMP_DIR, ensureSecureDirectories } from "../storage/secureDirectories";
import { decryptAudioToCache } from "../storage/vaultStorage";

export const buildTempAudioPath = (recordingId: string, suffix: string) =>
  `${TRANSCRIPTION_TEMP_DIR}/${recordingId}-${suffix}.m4a`;

export const withDecryptedAudio = async <T>(
  recordingId: string,
  vaultUri: string,
  suffix: string,
  handler: (tempPath: string) => Promise<T>
) => {
  await ensureSecureDirectories();
  const tempPath = buildTempAudioPath(recordingId, suffix);
  await decryptAudioToCache(vaultUri, tempPath);
  try {
    return await handler(tempPath);
  } finally {
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
  }
};
