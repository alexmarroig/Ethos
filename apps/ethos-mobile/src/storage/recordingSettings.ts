import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecordingSettings = {
  manualDeletionEnabled: boolean;
};

const SETTINGS_KEY = "ethos.mobile.recordingSettings";

const defaultSettings: RecordingSettings = {
  manualDeletionEnabled: false,
};

const isValidSettings = (value: unknown): value is RecordingSettings =>
  Boolean(value) &&
  typeof value === "object" &&
  "manualDeletionEnabled" in value &&
  typeof (value as RecordingSettings).manualDeletionEnabled === "boolean";

export const loadRecordingSettings = async (): Promise<RecordingSettings> => {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isValidSettings(parsed) ? parsed : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

export const saveRecordingSettings = async (settings: RecordingSettings) => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
