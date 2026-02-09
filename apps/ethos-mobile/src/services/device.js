import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

/**
 * Calculates a Device Capability Score (DCS) to determine which Whisper model to use.
 * Returns an object with the score and recommended model.
 */
export const getDeviceCapabilityScore = async () => {
  const ramTotal = await DeviceInfo.getTotalMemory(); // In bytes
  const freeDisk = await FileSystem.getFreeDiskStorageAsync(); // In bytes

  // Weights (as per approved Model Policy)
  // RAM: 40%
  // Benchmark: 50% (Will be implemented in a separate benchmark step)
  // Disk: P0 (Critical)

  const ramGB = ramTotal / (1024 * 1024 * 1024);
  const diskGB = freeDisk / (1024 * 1024 * 1024);

  let ramScore = 0;
  if (Platform.OS === 'android') {
    if (ramGB >= 8) ramScore = 100;
    else if (ramGB >= 6) ramScore = 80;
    else if (ramGB >= 4) ramScore = 60;
    else if (ramGB >= 3) ramScore = 40;
  } else {
    // iOS masks RAM, so we use model indicators or just baseline
    // High-end iPhones (13 Pro+) have 6GB, standard have 4GB.
    if (ramGB >= 5) ramScore = 100;
    else if (ramGB >= 3.5) ramScore = 80;
    else ramScore = 40;
  }

  const isDiskOk = diskGB >= 1.5; // Requirement: >= 1.5GB

  // For now, without benchmark, we return a partial score
  const partialScore = (ramScore * 0.4) / 0.4; // Normalized for now

  let recommendedModel = 'base';
  if (isDiskOk) {
    if (partialScore > 80) recommendedModel = 'large-v3-turbo';
    else if (partialScore > 40) recommendedModel = 'small';
  }

  return {
    score: partialScore,
    ramGB: ramGB.toFixed(2),
    diskGB: diskGB.toFixed(2),
    isDiskOk,
    recommendedModel,
    deviceModel: Device.modelName,
    year: Device.deviceYearClass
  };
};
