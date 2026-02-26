import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { deriveKeys, setSessionKeys, clearSessionKeys } from './src/services/security';
import { initDb } from './src/services/db';
import { useAppLock } from './src/hooks/useAppLock';
import { purgeService } from './src/services/purge';
import {
  getDeviceCapabilityScore,
  getPersistedTranscriptionPolicyDecision,
} from './src/services/device';
import { getLastTranscriptionTechnicalEvent } from './src/services/transcription';

import PsychologistDashboard from './src/components/PsychologistDashboard';
import PatientDashboard from './src/components/PatientDashboard';

export default function App() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('psychologist');
  const [loading, setLoading] = useState(false);
  const [dcs, setDcs] = useState(null);
  const [selectionMode, setSelectionMode] = useState('Auto');
  const [fallbackNotice, setFallbackNotice] = useState(null);
  const { isLocked, unlock } = useAppLock(isLoggedIn);

  useEffect(() => {
    purgeService.purgeTempData().catch(() => {});
  }, []);

  const loadCapability = useCallback(async (mode) => {
    try {
      const capability = await getDeviceCapabilityScore({ selectionMode: mode });
      setDcs(capability);
    } catch {
      setDcs(null);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const init = async () => {
      try {
        const decision = await getPersistedTranscriptionPolicyDecision();
        const mode = decision?.mode || 'Auto';
        setSelectionMode(mode);

        const [lastEvent] = await Promise.all([
          getLastTranscriptionTechnicalEvent(),
          loadCapability(mode)
        ]);

        if (lastEvent?.event_type === 'transcription_fallback_success') {
          setFallbackNotice('Última transcrição usou fallback automático de modelo para preservar a estabilidade.');
        }
      } catch (err) {
        console.error('Failed to init dashboard:', err);
      }
    };

    init();
  }, [isLoggedIn, loadCapability]);

  const refreshCapability = async (mode) => {
    setSelectionMode(mode);
    await loadCapability(mode);
  };

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const keys = await deriveKeys(password);
      await initDb(keys.dbKey);
      setSessionKeys(keys);
      setIsLoggedIn(true);
      setPassword('');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao acessar o banco de dados. Verifique sua senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await purgeService.purgeTempData();
    clearSessionKeys();
    setIsLoggedIn(false);
    setDcs(null);
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockTitle}>ETHOS</Text>
        <Text style={styles.lockSubtitle}>Ambiente Clínico Seguro</Text>
        <TextInput
          style={styles.input}
          placeholder="Senha Mestra"
          placeholderTextColor="#64748B"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoFocus
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Derivando chaves...' : 'Entrar'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockTitle}>ETHOS BLOQUEADO</Text>
        <Text style={styles.lockSubtitle}>Sessão protegida por biometria/PIN</Text>
        <TouchableOpacity style={styles.button} onPress={unlock}>
          <Text style={styles.buttonText}>Desbloquear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.outlineButton, { marginTop: 20 }]} onPress={handleLogout}>
          <Text style={styles.outlineButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>ETHOS MOBILE</Text>
            <Text style={styles.subtitle}>Portal {role === 'psychologist' ? 'do Profissional' : 'do Paciente'} (V1)</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={{ color: '#F87171', fontWeight: '600' }}>Sair</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'psychologist' && styles.roleButtonActive]}
            onPress={() => setRole('psychologist')}
          >
            <Text style={styles.roleText}>Psicólogo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'patient' && styles.roleButtonActive]}
            onPress={() => setRole('patient')}
          >
            <Text style={styles.roleText}>Paciente</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {role === 'psychologist' ? (
          <PsychologistDashboard
            dcs={dcs}
            selectionMode={selectionMode}
            refreshCapability={refreshCapability}
            fallbackNotice={fallbackNotice}
          />
        ) : (
          <PatientDashboard />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  lockContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 30 },
  lockTitle: { color: 'white', fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: 2 },
  lockSubtitle: { color: '#94A3B8', textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: { padding: 20, backgroundColor: '#1E293B', gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: 'white', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#94A3B8', fontSize: 14 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleButton: { borderWidth: 1, borderColor: '#334155', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  roleButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  roleText: { color: 'white', fontSize: 13, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  button: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  outlineButtonText: { color: '#3B82F6', fontWeight: '500' },
});
