import * as FileSystem from 'expo-file-system';

const TEMP_TRANSCRIPTION_DIR = `${FileSystem.cacheDirectory}ethos-transcription-temp/`;

const sanitizedLogger = {
  info: (message) => {
    if (__DEV__) {
      console.log(`[Purge] ${message}`);
    }
  },
  warn: (message) => {
    if (__DEV__) {
      console.warn(`[Purge] ${message}`);
    }
  },
};

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
      const cacheDirInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
      if (!cacheDirInfo.exists) {
        return;
      }

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

      sanitizedLogger.info('Limpeza agressiva concluída.');
    } catch (error) {
      sanitizedLogger.warn('Falha ao executar rotina de limpeza temporária.');
    }
  }
};
