import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

const runCpuBenchmark = async (durationMs = 1000) => {
  const startedAt = Date.now();
  let loops = 0;

  while (Date.now() - startedAt < durationMs) {
    let x = 0;
    for (let i = 0; i < 5000; i += 1) {
      x += Math.sqrt(i * 17.31);
    }
    if (x > 0) loops += 1;
    // Yield to event loop every few iterations.
    if (loops % 20 === 0) {
      await Promise.resolve();
    }
  }

  return loops;
};

const normalizeBenchmarkScore = (loops) => {
  if (loops >= 400) return 100;
  if (loops >= 260) return 80;
  if (loops >= 160) return 60;
  if (loops >= 90) return 40;
  return 20;
};

export const getDeviceCapabilityScore = async () => {
  const ramTotal = await DeviceInfo.getTotalMemory();
  const freeDisk = await FileSystem.getFreeDiskStorageAsync();

  const ramGB = ramTotal / (1024 * 1024 * 1024);
  const diskGB = freeDisk / (1024 * 1024 * 1024);

  let ramScore = 0;
  if (Platform.OS === 'android') {
    if (ramGB >= 8) ramScore = 100;
    else if (ramGB >= 6) ramScore = 80;
    else if (ramGB >= 4) ramScore = 60;
    else if (ramGB >= 3) ramScore = 40;
    else ramScore = 20;
  } else if (ramGB >= 5) ramScore = 100;
  else if (ramGB >= 3.5) ramScore = 80;
  else ramScore = 40;

  const benchmarkLoops = await runCpuBenchmark(1000);
  const benchmarkScore = normalizeBenchmarkScore(benchmarkLoops);
  const isDiskOk = diskGB >= 1.5;

  const score = Math.round(ramScore * 0.4 + benchmarkScore * 0.5 + (isDiskOk ? 10 : 0));

  let recommendedModel = 'base';
  if (isDiskOk && score >= 85) recommendedModel = 'large-v3-turbo';
  else if (isDiskOk && score >= 55) recommendedModel = 'small';

  return {
    score,
    ramGB: ramGB.toFixed(2),
    diskGB: diskGB.toFixed(2),
    benchmarkLoops,
    benchmarkScore,
    isDiskOk,
    recommendedModel,
    deviceModel: Device.modelName,
    year: Device.deviceYearClass,
  };
};
