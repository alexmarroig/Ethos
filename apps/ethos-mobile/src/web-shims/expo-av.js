// Web shim for expo-av — mock recording on browser
export const Audio = {
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  setAudioModeAsync: async () => {},
  RecordingOptionsPresets: {
    HIGH_QUALITY: {},
    LOW_QUALITY: {},
  },
  Recording: {
    createAsync: async () => ({
      recording: {
        setOnRecordingStatusUpdate: () => {},
        setProgressUpdateInterval: () => {},
        stopAndUnloadAsync: async () => {},
        getURI: () => null,
        _finalDurationMillis: 0,
      },
      status: { isRecording: false },
    }),
  },
};
export const Video = () => null;
export default { Audio, Video };
