import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { initWhisper } from 'whisper.rn';
import * as SecureStore from 'expo-secure-store';

const DCS_STORAGE_KEY = 'ethos_device_dcs_v1';
const SILENCE_WAV_BASE64 = 'UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export const deviceService = {
  getDeviceStats: async () => {
    const ramTotal = await DeviceInfo.getTotalMemory();
    const freeDisk = await FileSystem.getFreeDiskStorageAsync();
    return { ramGB: ramTotal / (1024 ** 3), diskGB: freeDisk / (1024 ** 3), model: Device.modelName };
  },
  runBenchmark: async (modelPath) => {
    try {
      const benchmarkAudio = `${FileSystem.cacheDirectory}bench.wav`;
      await FileSystem.writeAsStringAsync(benchmarkAudio, SILENCE_WAV_BASE64, { encoding: FileSystem.EncodingType.Base64 });
      const startTime = Date.now();
      const whisperContext = await initWhisper({ filePath: modelPath });
      const inferStart = Date.now();
      await whisperContext.transcribe(benchmarkAudio, { language: 'pt' });
      const inferTime = Date.now() - inferStart;
      await whisperContext.release();
      await FileSystem.deleteAsync(benchmarkAudio, { idempotent: true });
      return { inferTime };
    } catch (e) { return null; }
  },
  calculateDCS: async (bench = null) => {
    const stats = await deviceService.getDeviceStats();
    let ramScore = stats.ramGB >= 6 ? 100 : stats.ramGB >= 4 ? 60 : 40;
    let inferScore = bench ? (bench.inferTime < 400 ? 100 : 40) : 50;
    const dcs = (ramScore * 0.4) + (inferScore * 0.6);
    const recommendedModel = dcs > 80 ? 'large-v3-turbo' : dcs > 40 ? 'small' : 'base';
    const data = { dcs, recommendedModel, ramGB: stats.ramGB.toFixed(2), updatedAt: new Date().toISOString() };
    await SecureStore.setItemAsync(DCS_STORAGE_KEY, JSON.stringify(data));
    return data;
  },
  getStoredDCS: async () => {
    const data = await SecureStore.getItemAsync(DCS_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }
};
