import * as FileSystem from 'expo-file-system';

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;
const MODELS_CONFIG = {
  'large-v3-turbo': { url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin', size: 550 * 1024 * 1024 },
  'small': { url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin', size: 480 * 1024 * 1024 },
  'base': { url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin', size: 145 * 1024 * 1024 }
};

export const modelManager = {
  isModelReady: async (id) => {
    const info = await FileSystem.getInfoAsync(`${MODELS_DIR}${id}.bin`);
    return info.exists && info.size >= (MODELS_CONFIG[id]?.size || 0) * 0.9;
  },
  downloadModel: async (id, onProgress) => {
    const config = MODELS_CONFIG[id];
    if (!config) throw new Error('Unknown model');
    const free = await FileSystem.getFreeDiskStorageAsync();
    if (free < config.size * 2) throw new Error('Low storage');
    if (!(await FileSystem.getInfoAsync(MODELS_DIR)).exists) await FileSystem.makeDirectoryAsync(MODELS_DIR);
    const dr = FileSystem.createDownloadResumable(config.url, `${MODELS_DIR}${id}.bin`, {}, (p) => {
      if (onProgress) onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    });
    const res = await dr.downloadAsync();
    return res.uri;
  },
  getModelPath: (id) => `${MODELS_DIR}${id}.bin`,
  getModelsConfig: () => MODELS_CONFIG
};
