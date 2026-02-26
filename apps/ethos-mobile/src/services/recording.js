import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let recordingInstance = null;
let statusUpdateInterval = null;

export const recordingService = {
  startRecording: async (onStatusUpdate) => {
    try {
      // 1. Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') throw new Error('Permissão de microfone negada.');

      // 2. Configure Audio Session for resilience
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 3. Start Recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingInstance = recording;

      if (onStatusUpdate) {
        recording.setOnRecordingStatusUpdate((status) => {
          onStatusUpdate({
            durationMillis: status.durationMillis,
            isRecording: status.isRecording,
            canRecord: status.canRecord,
          });
        });
        recording.setProgressUpdateInterval(500);
      }

      return { success: true };
    } catch (error) {
      console.error('Falha ao iniciar gravação:', error);
      throw error;
    }
  },

  stopRecording: async () => {
    if (!recordingInstance) return null;

    try {
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      recordingInstance = null;
      return uri;
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
      throw error;
    }
  },

  isRecording: () => !!recordingInstance,
};
