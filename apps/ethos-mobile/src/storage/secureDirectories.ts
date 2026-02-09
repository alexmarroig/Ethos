import * as FileSystem from "expo-file-system";

export const VAULT_DIR = `${FileSystem.documentDirectory ?? ""}vault`;
export const DB_DIR = `${FileSystem.documentDirectory ?? ""}db`;
export const TRANSCRIPTION_TEMP_DIR = `${FileSystem.cacheDirectory ?? ""}ethos-transcription-temp`;
export const MODELS_DIR = `${DB_DIR}/models`;

const ensureDir = async (dir: string) => {
  if (!dir) return;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("exists")) {
      throw error;
    }
  }
};

const applyNoBackup = async (dir: string) => {
  if (!dir) return;
  if (typeof FileSystem.setIosNoBackupFlagAsync === "function") {
    try {
      await FileSystem.setIosNoBackupFlagAsync(dir);
    } catch {
      // Ignore; flagging is best-effort.
    }
  }
};

export const ensureSecureDirectories = async () => {
  await ensureDir(VAULT_DIR);
  await ensureDir(DB_DIR);
  await ensureDir(TRANSCRIPTION_TEMP_DIR);
  await ensureDir(MODELS_DIR);

  await applyNoBackup(VAULT_DIR);
  await applyNoBackup(DB_DIR);
  await applyNoBackup(TRANSCRIPTION_TEMP_DIR);
};

export const clearTranscriptionTemp = async () => {
  if (!TRANSCRIPTION_TEMP_DIR) return;
  try {
    const files = await FileSystem.readDirectoryAsync(TRANSCRIPTION_TEMP_DIR);
    await Promise.all(
      files.map((file) =>
        FileSystem.deleteAsync(`${TRANSCRIPTION_TEMP_DIR}/${file}`, { idempotent: true })
      )
    );
  } catch {
    // Best-effort cleanup.
  }
};
