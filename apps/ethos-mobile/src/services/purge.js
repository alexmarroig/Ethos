import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { mockFileSystem } from './webMocks';

const FileSystemLib = Platform.OS === 'web' ? mockFileSystem : FileSystem;

const TEMP_TRANSCRIPTION_DIR = `${FileSystemLib.documentDirectory}ethos-transcription-temp/`;

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
      const cacheDirInfo = await FileSystemLib.getInfoAsync(FileSystemLib.cacheDirectory);
      if (!cacheDirInfo.exists) {
        return;
      }

      const cacheDir = await FileSystemLib.readDirectoryAsync(FileSystemLib.cacheDirectory);
      for (const file of cacheDir) {
        // We delete everything in cache that might be clinical
        // (decrypted audios, temporary recordings, etc)
        await FileSystemLib.deleteAsync(`${FileSystemLib.cacheDirectory}${file}`, { idempotent: true });
      }

      // 2. Clean our custom temp transcription directory
      const tempDirInfo = await FileSystemLib.getInfoAsync(TEMP_TRANSCRIPTION_DIR);
      if (tempDirInfo.exists) {
        await FileSystemLib.deleteAsync(TEMP_TRANSCRIPTION_DIR, { idempotent: true });
      }
      await FileSystemLib.makeDirectoryAsync(TEMP_TRANSCRIPTION_DIR, { recursive: true });

      sanitizedLogger.info('Limpeza agressiva concluída.');
    } catch (error) {
      sanitizedLogger.warn('Falha ao executar rotina de limpeza temporária.');
    }
  }
};
