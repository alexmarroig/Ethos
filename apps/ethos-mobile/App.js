import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';

import AppNavigator from './src/navigation/AppNavigator';
import SplashLoading from './src/components/SplashLoading';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationsProvider } from './src/contexts/NotificationsContext';
import { useAppLock } from './src/hooks/useAppLock';

function AppShell({ fontsLoaded }) {
  const { isAuthenticated, isHydrating, logout } = useAuth();
  const { isLocked, unlock } = useAppLock(isAuthenticated);

  if (!fontsLoaded || isHydrating) {
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
    <AuthProvider>
      <NotificationsProvider>
        <AppShell fontsLoaded={fontsLoaded} />
      </NotificationsProvider>
    </AuthProvider>
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
