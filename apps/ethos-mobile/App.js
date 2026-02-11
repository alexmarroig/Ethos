import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { deriveKeys, setSessionKeys, clearSessionKeys } from './src/services/security';
import { initDb } from './src/services/db';
import { useAppLock } from './src/hooks/useAppLock';
import { purgeService } from './src/services/purge';
import { deviceService } from './src/services/device';
import { modelManager } from './src/services/modelManager';
import { TranscriptionJob } from './src/components/TranscriptionJob';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }) });

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isLocked, unlock } = useAppLock(isLoggedIn);
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [dcs, setDcs] = useState(null);

  useEffect(() => { purgeService.purgeTempData(); }, []);
  useEffect(() => { if (isLoggedIn && !isLocked) purgeService.purgeTempData(); }, [isLoggedIn, isLocked]);

  const handleLogin = async () => {
    if (!password || !email) return;
    setLoading(true);
    try {
      const keys = await deriveKeys(password);
      const db = await initDb(keys.dbKey);
      const dbUser = await db.getFirstAsync('SELECT * FROM users WHERE email = ?', email);
      if (!dbUser || dbUser.passwordHash !== password) throw new Error('Invalid');
      setUser(dbUser); setSessionKeys(keys); setIsLoggedIn(true); setPassword('');
      if (dbUser.role === 'psychologist') setDcs(await deviceService.getStoredDCS());
    } catch (e) { Alert.alert('Erro', 'Credenciais inválidas.'); } finally { setLoading(false); }
  };

  const handleLogout = () => { clearSessionKeys(); setIsLoggedIn(false); setUser(null); };

  if (!isLoggedIn) return (
    <View style={styles.lockContainer}>
      <Text style={styles.lockTitle}>ETHOS</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}><Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text></TouchableOpacity>
    </View>
  );

  if (isLocked) return (
    <View style={styles.lockContainer}>
      <Text style={styles.lockTitle}>ETHOS BLOQUEADO</Text>
      <TouchableOpacity style={styles.button} onPress={unlock}><Text style={styles.buttonText}>Desbloquear</Text></TouchableOpacity>
    </View>
  );

  if (user.role === 'psychologist') return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>ETHOS PRO</Text>
        <TouchableOpacity onPress={handleLogout}><Text style={{ color: '#F87171' }}>Sair</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        {activeSessionId && <TranscriptionJob sessionId={activeSessionId} onCancel={() => setActiveSessionId(null)} onComplete={() => setActiveSessionId(null)} />}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status: {dcs?.recommendedModel || 'DCS Pendente'}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setActiveSessionId('demo-1')}><Text style={styles.buttonText}>Simular Sessão</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>ETHOS</Text>
        <TouchableOpacity onPress={handleLogout}><Text style={{ color: '#F87171' }}>Sair</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Minha Próxima Sessão</Text>
          <Text style={styles.cardText}>22/02/2025 - 14:00</Text>
          <TouchableOpacity style={{ ...styles.button, backgroundColor: '#10B981' }} onPress={() => Alert.alert('OK')}><Text style={styles.buttonText}>Confirmar Presença</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  lockContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 30 },
  lockTitle: { color: 'white', fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#1E293B', color: 'white', padding: 16, borderRadius: 12, marginBottom: 20 },
  header: { padding: 20, paddingTop: 40, backgroundColor: '#1E293B', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: 'white', fontSize: 24, fontWeight: '800' },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 16 },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardText: { color: '#E2E8F0', marginBottom: 12 },
  button: { backgroundColor: '#3B82F6', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' }
});
