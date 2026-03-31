import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';

<<<<<<< HEAD
import AppNavigator from './src/navigation/AppNavigator';
import SplashLoading from './src/components/SplashLoading';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationsProvider } from './src/contexts/NotificationsContext';
import { useAppLock } from './src/hooks/useAppLock';
=======
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
import AppNavigator from './src/shared/navigation/AppNavigator';
import { AuthProvider } from './src/shared/hooks/useAuth';
import SplashLoading from './src/shared/components/SplashLoading';
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4

if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://examplePublicKey@o0.ingest.sentry.io/0',
    tracesSampleRate: 1.0,
  });
}

function AppShell({ fontsLoaded }) {
  const { isAuthenticated, isHydrating, logout } = useAuth();
  const { isLocked, unlock } = useAppLock(isAuthenticated);

<<<<<<< HEAD
  if (!fontsLoaded || isHydrating) {
=======
  useEffect(() => {
    purgeService.purgeTempData().catch(() => { });
  }, []);

  const loadCapability = useCallback(async (mode) => {
    try {
      const capability = await getDeviceCapabilityScore({ selectionMode: mode });
      setDcs(capability);
    } catch {
      setDcs(null);
    }
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

  if (!fontsLoaded) {
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4
    return <SplashLoading />;
  }

  if (isLocked) {
    return (
      <View style={styles.lockContainer}>
        <Text style={[styles.lockTitle, { fontFamily: 'Lora', fontWeight: '700' }]}>ETHOS BLOQUEADO</Text>
        <Text style={[styles.lockSubtitle, { fontFamily: 'Inter' }]}>SessÃ£o protegida por biometria/PIN</Text>
        <TouchableOpacity style={styles.button} onPress={unlock}>
          <Text style={[styles.buttonText, { fontFamily: 'Inter' }]}>Desbloquear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.outlineButton, { marginTop: 20 }]} onPress={logout}>
          <Text style={[styles.outlineButtonText, { fontFamily: 'Inter' }]}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    Lora: Lora_400Regular,
    'Lora-Medium': Lora_500Medium,
    'Lora-SemiBold': Lora_600SemiBold,
    'Lora-Bold': Lora_700Bold,
  });

  return (
<<<<<<< HEAD
    <ErrorBoundary>
      <AuthProvider>
        <NotificationsProvider>
          <AppShell fontsLoaded={fontsLoaded} />
        </NotificationsProvider>
      </AuthProvider>
    </ErrorBoundary>
=======
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
      <StatusBar style="dark" />
      {role === 'psychologist' ? (
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      ) : (
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <PatientDashboard />
        </ScrollView>
      )}
    </SafeAreaView>
>>>>>>> 97f19340c110e556bf5c1ebe71a5b625f605e9e4
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    padding: 30,
  },
  lockTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
  },
  lockSubtitle: {
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});
