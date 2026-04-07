import React from 'react';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';

import AppNavigator from './src/shared/navigation/AppNavigator';
import { AuthProvider } from './src/shared/hooks/useAuth';
import SplashLoading from './src/shared/components/SplashLoading';
import { NotificationsProvider } from './src/contexts/NotificationsContext';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Inter': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Lora': Lora_400Regular,
    'Lora-Medium': Lora_500Medium,
    'Lora-SemiBold': Lora_600SemiBold,
    'Lora-Bold': Lora_700Bold,
  });

  if (!fontsLoaded) return <SplashLoading />;

  return (
    <AuthProvider>
      <NotificationsProvider>
        <AppNavigator />
      </NotificationsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({});
