import React, { useEffect, useState } from 'react';
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
import { getDeviceCapabilityScore } from './src/services/device';

export default function App() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('psychologist');
  const [loading, setLoading] = useState(false);
  const [dcs, setDcs] = useState(null);
  const { isLocked, unlock } = useAppLock(isLoggedIn);

  useEffect(() => {
    purgeService.purgeTempData();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    getDeviceCapabilityScore().then(setDcs).catch(() => setDcs(null));
  }, [isLoggedIn]);

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

  const handleLogout = () => {
    clearSessionKeys();
    setIsLoggedIn(false);
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
        <Text style={styles.title}>ETHOS MOBILE</Text>
        <Text style={styles.subtitle}>Portal {role === 'psychologist' ? 'do Profissional' : 'do Paciente'} (V1)</Text>
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
          <TouchableOpacity onPress={handleLogout}>
            <Text style={{ color: '#F87171' }}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {role === 'psychologist' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Segurança Ativa</Text>
              <Text style={styles.cardText}>✓ Banco SQLCipher com chave derivada.</Text>
              <Text style={styles.cardText}>✓ Vault AES-256-GCM com chave segregada.</Text>
              <Text style={styles.cardText}>✓ App Lock automático com tolerância de 30s.</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>DCS (Device Capability Score)</Text>
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
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Minha Próxima Sessão</Text>
              <Text style={styles.cardText}>Data: 22/02/2025 às 14:00</Text>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Confirmar Presença</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Meus Diários</Text>
              <TouchableOpacity style={styles.outlineButton}>
                <Text style={styles.outlineButtonText}>+ Diário de Emoções</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineButton}>
                <Text style={styles.outlineButtonText}>+ Diário dos Sonhos</Text>
              </TouchableOpacity>
            </View>
          </>
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
  header: { padding: 20, backgroundColor: '#1E293B' },
  title: { color: 'white', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#94A3B8', fontSize: 14, marginBottom: 10 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleButton: { borderWidth: 1, borderColor: '#334155', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  roleButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  roleText: { color: 'white', fontSize: 12, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
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
  emptyText: { color: '#64748B', fontStyle: 'italic' },
  button: { backgroundColor: '#3B82F6', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: '600' },
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
