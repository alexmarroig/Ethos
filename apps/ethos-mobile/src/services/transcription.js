import * as FileSystem from 'expo-file-system';
import { vaultService } from './vault';
import { purgeService } from './purge';

const TEMP_TRANSCRIPTION_DIR = `${FileSystem.cacheDirectory}ethos-transcription-temp/`;

const ensureTempDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(TEMP_TRANSCRIPTION_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(TEMP_TRANSCRIPTION_DIR, { recursive: true });
  }
};

export const transcriptionService = {
  transcribeEncryptedAudio: async ({ encryptedUri, transcribe }) => {
    await ensureTempDir();
    let decryptedUri;

    try {
      decryptedUri = await vaultService.decryptFile(encryptedUri);
      return await transcribe({ audioUri: decryptedUri });
    } finally {
      if (decryptedUri) {
        await FileSystem.deleteAsync(decryptedUri, { idempotent: true });
      }
      await purgeService.purgeTempData();
    }
  },
};
