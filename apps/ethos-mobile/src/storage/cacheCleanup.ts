import * as FileSystem from "expo-file-system";

export const clearCacheDirectory = async () => {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return;
  }

  const entries = await FileSystem.readDirectoryAsync(cacheDir);
  await Promise.all(
    entries.map((entry) =>
      FileSystem.deleteAsync(`${cacheDir}${entry}`, { idempotent: true })
    )
  );
};
