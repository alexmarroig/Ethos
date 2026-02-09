import * as FileSystem from 'expo-file-system';

const TEMP_TRANSCRIPTION_DIR = `${FileSystem.documentDirectory}ethos-transcription-temp/`;

/**
 * Service to handle aggressive cleaning of clinical data cache.
 */
export const purgeService = {
  /**
   * Purges all temporary files in the cache and temp transcription directories.
   */
  purgeTempData: async () => {
    try {
      // 1. Clean System Cache
      const cacheDir = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
      for (const file of cacheDir) {
        // We delete everything in cache that might be clinical
        // (decrypted audios, temporary recordings, etc)
        await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true });
      }

      // 2. Clean our custom temp transcription directory
      const tempDirInfo = await FileSystem.getInfoAsync(TEMP_TRANSCRIPTION_DIR);
      if (tempDirInfo.exists) {
        await FileSystem.deleteAsync(TEMP_TRANSCRIPTION_DIR, { idempotent: true });
      }
      await FileSystem.makeDirectoryAsync(TEMP_TRANSCRIPTION_DIR, { recursive: true });

      console.log('[Purge] Limpeza agressiva concluída.');
    } catch (error) {
      // Use silent logging for errors in purge to avoid leaking info
      console.error('[Purge] Erro durante limpeza.');
    }
  }
};
