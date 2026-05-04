import React, { useCallback } from 'react';
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

import AppNavigator, { appNavigationRef } from './src/navigation/AppNavigator';
import SplashLoading from './src/components/SplashLoading';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationsProvider, useNotifications } from './src/contexts/NotificationsContext';
import { useAppLock } from './src/hooks/useAppLock';
import { InAppNotificationBanner } from './src/components/InAppNotificationBanner';

if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://examplePublicKey@o0.ingest.sentry.io/0',
    tracesSampleRate: 1.0,
  });
}

// Navigate from banner tap to the correct screen based on notification type
function navigateFromNotification(notif) {
  if (!appNavigationRef.isReady()) return;
  switch (notif.type) {
    case 'sessao_pendente':
    case 'sessao_amanha':
      appNavigationRef.navigate('Calendar');
      break;
    case 'pagamento':
    case 'pagamento_vencido':
    case 'cobranca_pendente':
      appNavigationRef.navigate('Finance');
      break;
    case 'novo_agendamento':
      appNavigationRef.navigate('Availability');
      break;
    case 'formulario_atribuido':
      appNavigationRef.navigate('Forms');
      break;
    case 'prontuario_gerado':
    case 'transcricao_pronta':
    case 'prontuario_pendente':
    case 'documento_disponivel':
    default:
      appNavigationRef.navigate('Notifications');
      break;
  }
}

function AppShell({ fontsLoaded }) {
  const { isAuthenticated, isHydrating, logout } = useAuth();
  const { isLocked, unlock } = useAppLock(isAuthenticated);
  const { foregroundNotification, clearForegroundNotification } = useNotifications();

  const handleBannerPress = useCallback(
    (notif) => {
      clearForegroundNotification();
      navigateFromNotification(notif);
    },
    [clearForegroundNotification]
  );

  if (!fontsLoaded || isHydrating) {
    return <SplashLoading />;
  }

  if (isLocked) {
    return (
      <View style={styles.lockContainer}>
        <Text style={[styles.lockTitle, { fontFamily: 'Lora', fontWeight: '700' }]}>
          ETHOS BLOQUEADO
        </Text>
        <Text style={[styles.lockSubtitle, { fontFamily: 'Inter' }]}>
          Sessao protegida por biometria/PIN
        </Text>
        <TouchableOpacity style={styles.button} onPress={unlock}>
          <Text style={[styles.buttonText, { fontFamily: 'Inter' }]}>Desbloquear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.outlineButton, { marginTop: 20 }]} onPress={logout}>
          <Text style={[styles.outlineButtonText, { fontFamily: 'Inter' }]}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppNavigator />
      <InAppNotificationBanner
        notification={foregroundNotification}
        onDismiss={clearForegroundNotification}
        onPress={handleBannerPress}
      />
    </View>
  );
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
    <ErrorBoundary>
      <AuthProvider>
        <NotificationsProvider>
          <AppShell fontsLoaded={fontsLoaded} />
        </NotificationsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
