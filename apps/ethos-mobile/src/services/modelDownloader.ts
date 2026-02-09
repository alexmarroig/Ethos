import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { MODELS_DIR, ensureSecureDirectories } from "../storage/secureDirectories";
import { hashFileSha256 } from "../storage/vaultStorage";

type ModelConfig = {
  id: "turbo-q5_0" | "small" | "base";
  filename: string;
  sizeBytes: number;
  sha256Base64: string;
};

const MODEL_CDN_BASE = "https://cdn.ethos.local/whisper";

const MODELS: Record<ModelConfig["id"], ModelConfig> = {
  "turbo-q5_0": {
    id: "turbo-q5_0",
    filename: "whisper-turbo-q5_0.bin",
    sizeBytes: 1200 * 1024 * 1024,
    sha256Base64: "REPLACE_WITH_SHA256_BASE64_TURBO",
  },
  small: {
    id: "small",
    filename: "whisper-small.bin",
    sizeBytes: 466 * 1024 * 1024,
    sha256Base64: "REPLACE_WITH_SHA256_BASE64_SMALL",
  },
  base: {
    id: "base",
    filename: "whisper-base.bin",
    sizeBytes: 147 * 1024 * 1024,
    sha256Base64: "REPLACE_WITH_SHA256_BASE64_BASE",
  },
};

const resumeKeyFor = (modelId: string) => `ethos.mobile.model.resume.${modelId}`;

export const modelPathFor = (modelId: ModelConfig["id"]) =>
  `${MODELS_DIR}/${MODELS[modelId].filename}`;

export const ensureModelAvailable = async (modelId: ModelConfig["id"]) => {
  await ensureSecureDirectories();
  const config = MODELS[modelId];
  const target = modelPathFor(modelId);
  const info = await FileSystem.getInfoAsync(target);
  if (info.exists) {
    const digest = await hashFileSha256(target);
    if (digest === config.sha256Base64) return target;
    await FileSystem.deleteAsync(target, { idempotent: true });
  }

  const freeBytes = await FileSystem.getFreeDiskStorageAsync();
  if (freeBytes < config.sizeBytes * 2) {
    throw new Error("Espaço insuficiente para baixar o modelo.");
  }

  const url = `${MODEL_CDN_BASE}/${config.filename}`;
  const resumeKey = resumeKeyFor(modelId);
  const resumeData = await AsyncStorage.getItem(resumeKey);
  const download = FileSystem.createDownloadResumable(
    url,
    target,
    {},
    undefined,
    resumeData ? JSON.parse(resumeData) : undefined
  );

  try {
    await download.downloadAsync();
  } catch (error) {
    try {
      const snapshot = await download.pauseAsync();
      if (snapshot?.resumeData) {
        await AsyncStorage.setItem(resumeKey, JSON.stringify(snapshot.resumeData));
      }
    } catch {
      // Ignore pause failures; resume is best-effort.
    }
    throw error;
  }

  await AsyncStorage.removeItem(resumeKey);
  const digest = await hashFileSha256(target);
  if (digest !== config.sha256Base64) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    throw new Error("Falha na verificação SHA256 do modelo.");
  }
  return target;
};

export const listModelFallbacks = (modelId: ModelConfig["id"]) => {
  if (modelId === "turbo-q5_0") return ["small", "base"] as const;
  if (modelId === "small") return ["base"] as const;
  return [] as const;
};
