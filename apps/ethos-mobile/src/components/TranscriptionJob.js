import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ProgressBarAndroid, ProgressViewIOS, Platform } from 'react-native';
import { modelManager } from '../services/modelManager';
import { transcriptionService } from '../services/transcription';
import { deviceService } from '../services/device';
import { useKeepAwake } from 'expo-keep-awake';

export const TranscriptionJob = ({ sessionId, onComplete, onCancel }) => {
  useKeepAwake();
  const [status, setStatus] = useState('preparing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let dcs = await deviceService.getStoredDCS();
        if (!dcs) dcs = await deviceService.calculateDCS();
        const modelId = dcs.recommendedModel;
        if (!(await modelManager.isModelReady(modelId))) {
          setStatus('downloading');
          await modelManager.downloadModel(modelId, setProgress);
        }
        setStatus('transcribing');
        setProgress(0);
        await transcriptionService.transcribeSession(sessionId, modelId, setProgress);
        setStatus('success');
        if (onComplete) onComplete();
      } catch (e) {
        setError(e.message);
        setStatus('error');
      }
    })();
  }, [sessionId]);

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>{status.toUpperCase()}</Text>
      {['downloading', 'transcribing'].includes(status) && (
        <View style={{ marginVertical: 10 }}>
          <Text style={styles.progressLabel}>{(progress * 100).toFixed(0)}%</Text>
          {Platform.OS === 'android' ? <ProgressBarAndroid styleAttr="Horizontal" indeterminate={false} progress={progress} color="#3B82F6" /> : <ProgressViewIOS progress={progress} progressTintColor="#3B82F6" />}
        </View>
      )}
      {status === 'error' && <Text style={{ color: '#F87171' }}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={onCancel}><Text style={styles.buttonText}>{status === 'success' ? 'Fechar' : 'Cancelar'}</Text></TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#1E293B', padding: 20, borderRadius: 16, marginVertical: 10 },
  statusText: { color: 'white', fontWeight: '700' },
  progressLabel: { color: '#94A3B8', fontSize: 12, textAlign: 'right' },
  button: { marginTop: 15, padding: 10, alignItems: 'center', backgroundColor: '#334155', borderRadius: 8 },
  buttonText: { color: 'white', fontWeight: '600' }
});
