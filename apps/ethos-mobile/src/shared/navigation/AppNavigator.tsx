import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { colors } from '../theme/colors';
import { Home, Calendar, Users, Settings, FileText } from 'lucide-react-native';

import { useAuth } from '../hooks/useAuth';
import SplashLoading from '../components/SplashLoading';

// Auth screens
import LoginScreen from '../../features/auth/screens/LoginScreen';
import RecoverPasswordScreen from '../../features/auth/screens/RecoverPasswordScreen';
import EmailSentScreen from '../../features/auth/screens/EmailSentScreen';
import RegisterStep1Screen from '../../features/auth/screens/RegisterStep1Screen';
import RegisterStep2Screen from '../../features/auth/screens/RegisterStep2Screen';
import WelcomeOnboardingScreen from '../../features/onboarding/screens/WelcomeOnboardingScreen';

// App screens
import DashboardScreen from '../../features/dashboard/screens/DashboardScreen';
import ScheduleScreen from '../../features/sessions/screens/ScheduleScreen';
import PatientsScreen from '../../features/patients/screens/PatientsScreen';
import DocumentsScreen from '../../features/documents/screens/DocumentsScreen';
import SettingsScreen from '../../features/settings/screens/SettingsScreen';
import SessionHubScreen from '../../features/sessions/screens/SessionHubScreen';

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="RecoverPassword" component={RecoverPasswordScreen} />
      <AuthStack.Screen name="EmailSent" component={EmailSentScreen} />
      <AuthStack.Screen name="RegisterStep1" component={RegisterStep1Screen} />
      <AuthStack.Screen name="RegisterStep2" component={RegisterStep2Screen} />
      <AuthStack.Screen name="WelcomeOnboarding" component={WelcomeOnboardingScreen} />
    </AuthStack.Navigator>
  );
}

function BottomTabs() {
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? colors.dark : colors.light;
  return (
    <Tab.Navigator screenOptions={{
      tabBarStyle: { backgroundColor: themeColors.card, borderTopColor: themeColors.border },
      tabBarActiveTintColor: themeColors.primary,
      tabBarInactiveTintColor: themeColors.mutedForeground,
      headerStyle: { backgroundColor: themeColors.background },
      headerTintColor: themeColors.foreground,
    }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Hoje', headerShown: false, tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Agenda', tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }} />
      <Tab.Screen name="Patients" component={PatientsScreen} options={{ title: 'Pacientes', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tab.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Docs', headerShown: false, tabBarIcon: ({ color, size }) => <FileText color={color} size={size} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

function MainStackNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={BottomTabs} />
      <MainStack.Screen name="SessionHub" component={SessionHubScreen} />
    </MainStack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, isLoading } = useAuth();
  const scheme = useColorScheme();

  if (isLoading) return <SplashLoading />;

  const NavigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: scheme === 'dark' ? colors.dark.background : colors.light.background,
      card: scheme === 'dark' ? colors.dark.card : colors.light.card,
      text: scheme === 'dark' ? colors.dark.foreground : colors.light.foreground,
      border: scheme === 'dark' ? colors.dark.border : colors.light.border,
      primary: colors.light.primary,
    },
  };

  return (
    <NavigationContainer theme={NavigationTheme}>
      {token ? <MainStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}
