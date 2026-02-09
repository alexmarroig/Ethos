import * as SecureStore from "expo-secure-store";

const LAST_BACKGROUND_AT_KEY = "ethos.mobile.last_background_at";

export const setLastBackgroundAt = async (timestamp: number) => {
  await SecureStore.setItemAsync(LAST_BACKGROUND_AT_KEY, timestamp.toString());
};

export const getLastBackgroundAt = async () => {
  const raw = await SecureStore.getItemAsync(LAST_BACKGROUND_AT_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
};
