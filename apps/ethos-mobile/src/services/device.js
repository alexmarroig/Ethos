import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { initWhisper } from 'whisper.rn';
import * as SecureStore from 'expo-secure-store';
import { modelManager } from './modelManager';

const DCS_STORAGE_KEY = 'ethos_device_dcs_v1';

// Base64 for 1 second of silence (16kHz, 16-bit mono wav)
const SILENCE_WAV_BASE64 = 'UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export const deviceService = {
  /**
   * Calculates a Device Capability Score (DCS) to determine which Whisper model to use.
   */
  getDeviceStats: async () => {
    const ramTotal = await DeviceInfo.getTotalMemory();
    const freeDisk = await FileSystem.getFreeDiskStorageAsync();
    const ramGB = ramTotal / (1024 * 1024 * 1024);
    const diskGB = freeDisk / (1024 * 1024 * 1024);

    return { ramGB, diskGB, model: Device.modelName };
  },

  /**
   * Performs a benchmark to assess inference performance.
   * Requires the 'base' model to be downloaded.
   */
  runBenchmark: async (modelPath) => {
    try {
      const benchmarkAudio = `${FileSystem.cacheDirectory}benchmark_silence.wav`;
      await FileSystem.writeAsStringAsync(benchmarkAudio, SILENCE_WAV_BASE64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const startTime = Date.now();
      const whisperContext = await initWhisper({ filePath: modelPath });
      const initTime = Date.now() - startTime;

      const inferStart = Date.now();
      await whisperContext.transcribe(benchmarkAudio, { language: 'pt' });
      const inferTime = Date.now() - inferStart;

      await whisperContext.release();
      await FileSystem.deleteAsync(benchmarkAudio, { idempotent: true });

      return { initTime, inferTime };
    } catch (error) {
      console.error('[Benchmark] Failed:', error);
      return null;
    }
  },

  /**
   * Determines the best model based on DCS.
   */
  calculateDCS: async (benchmarkResults = null) => {
    const stats = await deviceService.getDeviceStats();

    let ramScore = 0;
    if (Platform.OS === 'android') {
      if (stats.ramGB >= 8) ramScore = 100;
      else if (stats.ramGB >= 6) ramScore = 80;
      else if (stats.ramGB >= 4) ramScore = 60;
      else ramScore = 40;
    } else {
      if (stats.ramGB >= 5) ramScore = 100;
      else if (stats.ramGB >= 3.5) ramScore = 80;
      else ramScore = 40;
    }

    let inferScore = 50; // Neutral default
    if (benchmarkResults) {
      const { inferTime } = benchmarkResults;
      // Thresholds: < 200ms = 100, > 800ms = 20
      if (inferTime < 200) inferScore = 100;
      else if (inferTime < 400) inferScore = 80;
      else if (inferTime < 600) inferScore = 60;
      else if (inferTime < 800) inferScore = 40;
      else inferScore = 20;
    }

    const dcs = (ramScore * 0.4) + (inferScore * 0.6);

    let recommendedModel = 'base';
    if (dcs > 80) recommendedModel = 'large-v3-turbo';
    else if (dcs > 40) recommendedModel = 'small';

    const dcsData = {
      dcs,
      recommendedModel,
      ramGB: stats.ramGB.toFixed(2),
      inferTime: benchmarkResults?.inferTime || 'N/A',
      updatedAt: new Date().toISOString()
    };

    await SecureStore.setItemAsync(DCS_STORAGE_KEY, JSON.stringify(dcsData));
    return dcsData;
  },

  getStoredDCS: async () => {
    const data = await SecureStore.getItemAsync(DCS_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }
};
