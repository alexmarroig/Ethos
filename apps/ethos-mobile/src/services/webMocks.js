export const mockDb = {
  execAsync: async () => {},
  getFirstAsync: async (sql) => {
    if (sql.includes('integrity_check')) return { integrity_check: 'ok' };
    if (sql.includes('user_version')) return { user_version: 2 };
    return {};
  },
  getAllAsync: async () => [],
  runAsync: async () => ({ lastInsertRowId: 1, changes: 1 }),
};

export const mockFileSystem = {
  documentDirectory: 'mock://docs/',
  cacheDirectory: 'mock://cache/',
  getInfoAsync: async () => ({ exists: true }),
  makeDirectoryAsync: async () => {},
  writeAsStringAsync: async () => {},
  readAsStringAsync: async () => '{}',
  deleteAsync: async () => {},
  readDirectoryAsync: async () => [],
  EncodingType: { Base64: 'base64' },
};

export const mockSecureStore = {
  getItemAsync: async () => 'mock-salt',
  setItemAsync: async () => {},
};

export const mockCrypto = {
  getRandomBytesAsync: async (size) => new Uint8Array(size),
};

export const mockLocalAuthentication = {
  hasHardwareAsync: async () => true,
  isEnrolledAsync: async () => true,
  authenticateAsync: async () => ({ success: true }),
};

export const mockDevice = {
  modelName: 'Web Browser',
  deviceYearClass: 2024,
};

export const mockDeviceInfo = {
  getTotalMemory: async () => 8 * 1024 * 1024 * 1024,
};

export const mockAudio = {
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  setAudioModeAsync: async () => {},
  Recording: {
    createAsync: async () => ({
      recording: {
        setOnRecordingStatusUpdate: (cb) => {
          let duration = 0;
          const interval = setInterval(() => {
            duration += 500;
            cb({ durationMillis: duration, isRecording: true, canRecord: true });
          }, 500);
          return interval;
        },
        setProgressUpdateInterval: () => {},
        stopAndUnloadAsync: async () => {},
        getURI: () => 'mock://recording.m4a',
      },
    }),
  },
};

export const mockAesGcm = {
  encryptFile: async () => {},
  decryptFile: async () => 'mock://decrypted.wav',
};
