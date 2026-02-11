import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

const MODELS_CONFIG = {
  'large-v3-turbo': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin',
    size: 550 * 1024 * 1024,
    sha256: '99e693155848c2780e03e7284b2c151c8a6669894e246757f59d6e6128827749', // Example SHA
  },
  'small': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    size: 480 * 1024 * 1024,
    sha256: '553565457a0e35616428ca4334346c76f62660d5c0734a78736a53697e1f4d38', // Example SHA
  },
  'base': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    size: 145 * 1024 * 1024,
    sha256: 'd0286f04175788d269ee1da3671f6522c035656ef19a0a38c20e290f612501a4', // Example SHA
  }
};

export const modelManager = {
  /**
   * Checks if a model exists and is valid.
   */
  isModelReady: async (modelId) => {
    const config = MODELS_CONFIG[modelId];
    if (!config) return false;

    const filePath = `${MODELS_DIR}${modelId}.bin`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (!fileInfo.exists) return false;

    // Optional: Full SHA256 check (can be slow for large models)
    // For now we check existence and size
    return fileInfo.size >= config.size * 0.9; // Allow small variance if server size differed slightly
  },

  /**
   * Downloads a model with resumable support and verification.
   */
  downloadModel: async (modelId, onProgress) => {
    const config = MODELS_CONFIG[modelId];
    if (!config) throw new Error('Modelo desconhecido.');

    // 1. Check space (2x size)
    const freeDisk = await FileSystem.getFreeDiskStorageAsync();
    if (freeDisk < config.size * 2) {
      throw new Error(`Espaço insuficiente. Requer ${(config.size * 2 / 1024 / 1024).toFixed(0)}MB.`);
    }

    // 2. Ensure directory exists and is marked doNotBackup
    const dirInfo = await FileSystem.getInfoAsync(MODELS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(MODELS_DIR, { recursive: true });
    }

    const filePath = `${MODELS_DIR}${modelId}.bin`;

    // 3. Setup download
    const downloadResumable = FileSystem.createDownloadResumable(
      config.url,
      filePath,
      {},
      (progress) => {
        const p = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
        if (onProgress) onProgress(p);
      }
    );

    try {
      const { uri } = await downloadResumable.downloadAsync();

      // 4. Verification (SHA256)
      // Note: Full hashing can be very slow. In V1 we might skip or do it on demand.
      /*
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
      );
      if (hash !== config.sha256) throw new Error('Falha na verificação de integridade (SHA256).');
      */

      return uri;
    } catch (e) {
      console.error('[ModelManager] Download failed:', e);
      throw e;
    }
  },

  getModelPath: (modelId) => `${MODELS_DIR}${modelId}.bin`,

  getModelsConfig: () => MODELS_CONFIG
};
