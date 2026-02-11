import * as FileSystem from 'expo-file-system';

export const purgeService = {
  purgeTempData: async () => {
    try {
      const cache = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
      for (const f of cache) await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${f}`, { idempotent: true });
      const tempDir = `${FileSystem.documentDirectory}ethos-transcription-temp/`;
      if ((await FileSystem.getInfoAsync(tempDir)).exists) await FileSystem.deleteAsync(tempDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(tempDir, { recursive: true });
    } catch (e) {}
  }
};
