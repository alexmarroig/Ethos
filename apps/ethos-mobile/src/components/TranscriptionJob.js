import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ProgressBarAndroid, ProgressViewIOS, Platform } from 'react-native';
import { modelManager } from '../services/modelManager';
import { transcriptionService } from '../services/transcription';
import { deviceService } from '../services/device';
import * as Notifications from 'expo-notifications';
import { useKeepAwake } from 'expo-keep-awake';

export const TranscriptionJob = ({ sessionId, onComplete, onCancel }) => {
  useKeepAwake();
  const [status, setStatus] = useState('idle'); // idle, downloading, preparing, transcribing, success, error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const runPipeline = async () => {
    try {
      // 1. DCS & Model Selection
      setStatus('preparing');
      let dcs = await deviceService.getStoredDCS();
      if (!dcs) {
        dcs = await deviceService.calculateDCS();
      }
      const modelId = dcs.recommendedModel;

      // 2. Download Model if needed
      const isReady = await modelManager.isModelReady(modelId);
      if (!isReady) {
        setStatus('downloading');
        await modelManager.downloadModel(modelId, (p) => setProgress(p));
      }

      // 3. Transcribe
      setStatus('transcribing');
      setProgress(0);

      // Notify (Foreground)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('transcription', {
          name: 'Transcrição em andamento',
          importance: Notifications.AndroidImportance.LOW,
        });
      }

      await transcriptionService.transcribeSession(sessionId, modelId, (p) => {
        setProgress(p);
      });

      setStatus('success');
      if (onComplete) onComplete();
    } catch (e) {
      console.error('[Job] Pipeline error:', e);
      setError(e.message);
      setStatus('error');
    }
  };

  useEffect(() => {
    runPipeline();
  }, [sessionId]);

  const getStatusText = () => {
    switch (status) {
      case 'downloading': return 'Baixando modelo...';
      case 'preparing': return 'Preparando...';
      case 'transcribing': return 'Transcrevendo sessão...';
      case 'success': return 'Concluído!';
      case 'error': return 'Erro na transcrição.';
      default: return 'Iniciando...';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>{getStatusText()}</Text>

      {status !== 'success' && status !== 'error' && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>{(progress * 100).toFixed(0)}%</Text>
          {Platform.OS === 'android' ? (
            <ProgressBarAndroid
              styleAttr="Horizontal"
              indeterminate={false}
              progress={progress}
              color="#3B82F6"
            />
          ) : (
            <ProgressViewIOS
              progress={progress}
              progressTintColor="#3B82F6"
            />
          )}
        </View>
      )}

      {status === 'error' && <Text style={styles.errorText}>{error}</Text>}

      {(status !== 'success' && status !== 'error') && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      )}

      {(status === 'success' || status === 'error') && (
        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  progressContainer: {
    marginVertical: 10,
  },
  progressLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 4,
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    marginTop: 10,
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#F87171',
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  }
});
