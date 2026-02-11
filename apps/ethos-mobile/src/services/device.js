import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';

const TRANSCRIPTION_POLICY_PATH = `${FileSystem.documentDirectory}ethos-transcription-policy.json`;
const BENCHMARK_AUDIO_PATH = `${FileSystem.cacheDirectory}ethos-benchmark-short.wav`;
const BENCHMARK_AUDIO_SECONDS = 1;

const MODEL_BASE = 'base';
const MODEL_SMALL = 'small';
const MODEL_LARGE = 'large-v3-turbo';

const MODELS_BY_QUALITY = [MODEL_LARGE, MODEL_SMALL, MODEL_BASE];

const POLICY_THRESHOLDS = {
  Auto: {
    fast: { rtfMax: 0.8, latencyMsMax: 2200, modelId: MODEL_LARGE },
    balanced: { rtfMax: 1.25, latencyMsMax: 4500, modelId: MODEL_SMALL },
    fallbackModelId: MODEL_BASE,
  },
  'Rápido': {
    fast: { rtfMax: 0.9, latencyMsMax: 1800, modelId: MODEL_SMALL },
    balanced: { rtfMax: 1.4, latencyMsMax: 3200, modelId: MODEL_BASE },
    fallbackModelId: MODEL_BASE,
  },
  Pro: {
    fast: { rtfMax: 1.1, latencyMsMax: 3000, modelId: MODEL_LARGE },
    balanced: { rtfMax: 1.6, latencyMsMax: 5200, modelId: MODEL_SMALL },
    fallbackModelId: MODEL_BASE,
  },
};

const runCpuBenchmark = async (durationMs = 1000) => {
  const startedAt = Date.now();
  let loops = 0;

  while (Date.now() - startedAt < durationMs) {
    let x = 0;
    for (let i = 0; i < 5000; i += 1) {
      x += Math.sqrt(i * 17.31);
    }
    if (x > 0) loops += 1;
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

const modelRank = (modelId) => MODELS_BY_QUALITY.indexOf(modelId);

const applyDeviceGates = ({ preferredModel, gateModel, isDiskOk }) => {
  if (!isDiskOk) return MODEL_BASE;
  if (modelRank(gateModel) === -1) return preferredModel;
  if (modelRank(preferredModel) === -1) return gateModel;
  return modelRank(preferredModel) <= modelRank(gateModel) ? preferredModel : gateModel;
};

const createSilentWavBase64 = (durationSeconds = 1, sampleRate = 16000) => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return Buffer.from(binary, 'binary').toString('base64');
};

const ensureBenchmarkAudioFile = async () => {
  const info = await FileSystem.getInfoAsync(BENCHMARK_AUDIO_PATH);
  if (info.exists) return BENCHMARK_AUDIO_PATH;

  const wavBase64 = createSilentWavBase64(BENCHMARK_AUDIO_SECONDS);
  await FileSystem.writeAsStringAsync(BENCHMARK_AUDIO_PATH, wavBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return BENCHMARK_AUDIO_PATH;
};

const runInferenceBenchmark = async ({ transcribe, modelId }) => {
  if (!transcribe) {
    return {
      benchmarkLatencyMs: null,
      benchmarkRtf: null,
      benchmarkStatus: 'not-run',
    };
  }

  const audioUri = await ensureBenchmarkAudioFile();
  const startedAt = Date.now();
  await transcribe({
    audioUri,
    modelId,
    benchmark: true,
  });
  const latencyMs = Date.now() - startedAt;
  const rtf = Number((latencyMs / 1000 / BENCHMARK_AUDIO_SECONDS).toFixed(3));

  return {
    benchmarkLatencyMs: latencyMs,
    benchmarkRtf: rtf,
    benchmarkStatus: 'ok',
  };
};

const chooseModelByPolicy = ({ mode = 'Auto', benchmarkRtf, benchmarkLatencyMs, gateModel }) => {
  const thresholds = POLICY_THRESHOLDS[mode] || POLICY_THRESHOLDS.Auto;
  const hasMetrics = Number.isFinite(benchmarkRtf) && Number.isFinite(benchmarkLatencyMs);

  if (!hasMetrics) {
    return {
      selectedModel: gateModel,
      reason: 'no-benchmark',
    };
  }

  let selectedModel = thresholds.fallbackModelId;
  let reason = 'fallback';

  if (benchmarkRtf <= thresholds.fast.rtfMax && benchmarkLatencyMs <= thresholds.fast.latencyMsMax) {
    selectedModel = thresholds.fast.modelId;
    reason = 'fast';
  } else if (benchmarkRtf <= thresholds.balanced.rtfMax && benchmarkLatencyMs <= thresholds.balanced.latencyMsMax) {
    selectedModel = thresholds.balanced.modelId;
    reason = 'balanced';
  }

  return {
    selectedModel,
    reason,
  };
};

export const persistTranscriptionPolicyDecision = async ({ mode, modelId, rtf, latencyMs, reason }) => {
  const payload = {
    mode,
    model_id: modelId,
    rtf,
    latency_ms: latencyMs,
    reason,
    timestamp: new Date().toISOString(),
  };

  await FileSystem.writeAsStringAsync(TRANSCRIPTION_POLICY_PATH, JSON.stringify(payload));
  return payload;
};

export const getPersistedTranscriptionPolicyDecision = async () => {
  const info = await FileSystem.getInfoAsync(TRANSCRIPTION_POLICY_PATH);
  if (!info.exists) return null;

  try {
    const raw = await FileSystem.readAsStringAsync(TRANSCRIPTION_POLICY_PATH);
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getDeviceCapabilityScore = async ({
  selectionMode = 'Auto',
  transcribeBenchmark,
} = {}) => {
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

  let gateModel = MODEL_BASE;
  if (isDiskOk && score >= 85) gateModel = MODEL_LARGE;
  else if (isDiskOk && score >= 55) gateModel = MODEL_SMALL;

  const inferenceBenchmark = await runInferenceBenchmark({
    transcribe: transcribeBenchmark,
    modelId: gateModel,
  }).catch(() => ({
    benchmarkLatencyMs: null,
    benchmarkRtf: null,
    benchmarkStatus: 'failed',
  }));

  const policyDecision = chooseModelByPolicy({
    mode: selectionMode,
    benchmarkRtf: inferenceBenchmark.benchmarkRtf,
    benchmarkLatencyMs: inferenceBenchmark.benchmarkLatencyMs,
    gateModel,
  });

  const recommendedModel = applyDeviceGates({
    preferredModel: policyDecision.selectedModel,
    gateModel,
    isDiskOk,
  });

  const persistedDecision = await persistTranscriptionPolicyDecision({
    mode: selectionMode,
    modelId: recommendedModel,
    rtf: inferenceBenchmark.benchmarkRtf,
    latencyMs: inferenceBenchmark.benchmarkLatencyMs,
    reason: policyDecision.reason,
  });

  return {
    score,
    ramGB: ramGB.toFixed(2),
    diskGB: diskGB.toFixed(2),
    benchmarkLoops,
    benchmarkScore,
    isDiskOk,
    recommendedModel,
    selectionMode,
    benchmarkLatencyMs: inferenceBenchmark.benchmarkLatencyMs,
    benchmarkRtf: inferenceBenchmark.benchmarkRtf,
    benchmarkStatus: inferenceBenchmark.benchmarkStatus,
    persistedDecision,
    deviceModel: Device.modelName,
    year: Device.deviceYearClass,
  };
};
