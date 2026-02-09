import AsyncStorage from "@react-native-async-storage/async-storage";

export type DeviceCapabilityRecord = {
  modelId: string;
  rtf: number;
  latencyMs: number;
  score: number;
  degraded: boolean;
  updatedAt: string;
};

const STORAGE_KEY = "ethos.mobile.dcs";

export const loadDeviceCapability = async (): Promise<DeviceCapabilityRecord | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceCapabilityRecord;
  } catch {
    return null;
  }
};

export const saveDeviceCapability = async (record: DeviceCapabilityRecord) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
};

export const scoreFromRtf = (rtf: number) => {
  if (rtf <= 1) return 100;
  if (rtf >= 12) return 10;
  const normalized = Math.max(0, Math.min(1, (12 - rtf) / 11));
  return Math.round(20 + normalized * 80);
};

export const selectModelForScore = (score: number) => {
  if (score > 80) return "turbo-q5_0";
  if (score >= 40) return "small";
  return "base";
};
