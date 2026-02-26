import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { recordingService } from '../services/recording';
import { vaultService } from '../services/vault';

export default function PsychologistDashboard({ dcs, selectionMode, refreshCapability, fallbackNotice }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  const handleToggleRecording = async () => {
    if (isRecording) {
      try {
        const uri = await recordingService.stopRecording();
        setIsRecording(false);
        setDuration(0);
        if (uri) {
          // Encrypt and move to vault immediately for safety
          const sessionId = `session-${Date.now()}`;
          await vaultService.encryptFile(uri, sessionId);
          Alert.alert('Sucesso', 'Sessão gravada e protegida no cofre.');
        }
      } catch (error) {
        Alert.alert('Erro', 'Falha ao salvar gravação.');
      }
    } else {
      try {
        await recordingService.startRecording((status) => {
          setDuration(status.durationMillis);
          setIsRecording(status.isRecording);
        });
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
      }
    }
  };

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gravação de Sessão</Text>
        <View style={styles.recordingRow}>
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            onPress={handleToggleRecording}
          >
            <View style={[styles.recordDot, isRecording && styles.recordDotActive]} />
            <Text style={styles.buttonText}>{isRecording ? 'Parar Sessão' : 'Iniciar Sessão'}</Text>
          </TouchableOpacity>
          {isRecording && <Text style={styles.timer}>{formatDuration(duration)}</Text>}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Segurança Ativa</Text>
        <Text style={styles.cardText}>✓ Banco SQLCipher com chave derivada.</Text>
        <Text style={styles.cardText}>✓ Vault AES-256-GCM com chave segregada.</Text>
        <Text style={styles.cardText}>✓ App Lock automático com tolerância de 30s.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>DCS (Device Capability Score)</Text>
        <Text style={styles.cardText}>Política de seleção:</Text>
        <View style={styles.roleRow}>
          {['Auto', 'Rápido', 'Pro'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.roleButton, selectionMode === mode && styles.roleButtonActive]}
              onPress={() => refreshCapability(mode)}
            >
              <Text style={styles.roleText}>{mode}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {dcs ? (
          <>
            <Text style={styles.cardText}>Score: {dcs.score}</Text>
            <Text style={styles.cardText}>Modelo recomendado: {dcs.recommendedModel}</Text>
            <Text style={styles.cardText}>RAM: {dcs.ramGB} GB | Disco livre: {dcs.diskGB} GB</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>Benchmark indisponível.</Text>
        )}
      </View>

      {fallbackNotice ? (
        <View style={[styles.card, { borderColor: '#F59E0B' }]}>
          <Text style={styles.cardTitle}>Aviso de fallback</Text>
          <Text style={styles.cardText}>{fallbackNotice}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardText: { color: '#E2E8F0', fontSize: 14, marginBottom: 6 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordButton: {
    backgroundColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  recordButtonActive: { backgroundColor: '#7F1D1D' },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recordDotActive: { backgroundColor: 'white' },
  buttonText: { color: 'white', fontWeight: '600' },
  timer: { color: 'white', fontSize: 20, fontWeight: '700', fontFamily: 'monospace' },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  roleButton: { borderWidth: 1, borderColor: '#334155', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  roleButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  roleText: { color: 'white', fontSize: 12, fontWeight: '600' },
  emptyText: { color: '#64748B', fontStyle: 'italic' },
});
