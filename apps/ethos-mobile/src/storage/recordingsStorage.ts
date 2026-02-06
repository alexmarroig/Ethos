import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

export type RecordingEntry = {
  id: string;
  name: string;
  durationMs: number;
  createdAt: string;
  fileUri: string;
};

const STORAGE_KEY = "ethos.mobile.recordings";

export const RECORDINGS_DIR = `${FileSystem.documentDirectory ?? ""}recordings`;

export const ensureRecordingsDir = async () => {
  if (!FileSystem.documentDirectory) return;
  try {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("exists")) {
      throw error;
    }
  }
};

export const loadRecordings = async (): Promise<RecordingEntry[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecordingEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveRecordings = async (entries: RecordingEntry[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const buildRecordingUri = (id: string, extension = "m4a") =>
  `${RECORDINGS_DIR}/${id}.${extension}`;
