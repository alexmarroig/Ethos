import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";

const baseDirectory = FileSystem.documentDirectory ?? "";

export const VAULT_DIR = `${baseDirectory}vault/`;
export const DB_DIR = `${baseDirectory}db/`;
export const TRANSCRIPTION_TEMP_DIR = `${baseDirectory}ethos-transcription-temp/`;

const NO_BACKUP_DIRECTORIES = [VAULT_DIR, DB_DIR, TRANSCRIPTION_TEMP_DIR];

type DirectoryMetadataOptions = {
  ios?: {
    doNotBackup?: boolean;
  };
};

type FileSystemWithMetadata = typeof FileSystem & {
  setMetadataAsync?: (uri: string, options: DirectoryMetadataOptions) => Promise<void>;
};

const applyDoNotBackup = async (directory: string) => {
  if (Platform.OS !== "ios") return;
  const fileSystemWithMetadata = FileSystem as FileSystemWithMetadata;
  if (!fileSystemWithMetadata.setMetadataAsync) return;

  await fileSystemWithMetadata.setMetadataAsync(directory, {
    ios: {
      doNotBackup: true,
    },
  });
};

const ensureDirectory = async (directory: string) => {
  if (!baseDirectory) return;

  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, {
      intermediates: true,
      ...(Platform.OS === "ios" ? { ios: { doNotBackup: true } } : {}),
    } as FileSystem.MakeDirectoryOptions);
  }

  await applyDoNotBackup(directory);
};

export const ensureAppDirectories = async () => {
  if (!baseDirectory) return;

  await Promise.all(NO_BACKUP_DIRECTORIES.map((directory) => ensureDirectory(directory)));
};
