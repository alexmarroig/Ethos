import AsyncStorage from "@react-native-async-storage/async-storage";

export type TranscriptionEntry = {
  id: string;
  recordingId: string;
  createdAt: string;
  modelId: string;
  rtf: number;
  latencyMs: number;
  text: string;
};

const STORAGE_KEY = "ethos.mobile.transcriptions";

export const loadTranscriptions = async (): Promise<TranscriptionEntry[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TranscriptionEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveTranscriptions = async (entries: TranscriptionEntry[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const upsertTranscription = async (entry: TranscriptionEntry) => {
  const existing = await loadTranscriptions();
  const next = existing.filter((item) => item.id !== entry.id).concat(entry);
  await saveTranscriptions(next);
  return next;
};

export const getTranscriptionByRecording = async (recordingId: string) => {
  const entries = await loadTranscriptions();
  return entries.find((entry) => entry.recordingId === recordingId) ?? null;
};
