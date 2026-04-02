import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
} from '@expo-google-fonts/lora';

import AppNavigator from './src/navigation/AppNavigator';
import SplashLoading from './src/components/SplashLoading';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationsProvider } from './src/contexts/NotificationsContext';
import { useAppLock } from './src/hooks/useAppLock';

// 🔒 SENTRY INIT (SAFE)
if (!__DEV__) {
  Sentry.init({
    dsn:
      process.env.EXPO_PUBLIC_SENTRY_DSN ||
      'https://examplePublicKey@o0.ingest.sentry.io/0',
    tracesSampleRate: 1.0,
  });
}

// ==========================
// APP SHELL
// ==========================
function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isAuthenticated, isHydrating, logout } = useAuth();
  const { isLocked, unlock } = useAppLock(isAuthenticated);

  // Splash enquanto carrega fontes ou auth
  if (!fontsLoaded || isHydrating) {
    return <SplashLoading />;
  }

  // Tela de bloqueio (biometria/PIN)
  if (isLocked) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockTitle}>ETHOS BLOQUEADO</Text>

        <Text style={styles.lockSubtitle}>
          Sessão protegida por biometria/PIN
        </Text>

        <TouchableOpacity style={styles.button} onPress={unlock}>
          <Text style={styles.buttonText}>Desbloquear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineButton, { marginTop: 20 }]}
          onPress={logout}
        >
          <Text style={styles.outlineButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // App principal
  return <AppNavigator />;
}

// ==========================
// ROOT APP
// ==========================
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
    <ErrorBoundary>
      <AuthProvider>
        <NotificationsProvider>
          <AppShell fontsLoaded={fontsLoaded} />
        </NotificationsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// ==========================
// STYLES
// ==========================
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
    fontFamily: 'Lora-Bold',
  },
  lockSubtitle: {
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
  },
});