import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { Banknote, Calendar, FileText, Home, Settings, Users } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

import DashboardScreen from '../screens/DashboardScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import PatientsScreen from '../screens/PatientsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SessionHubScreen from '../screens/SessionHubScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import LoginScreen from '../screens/LoginScreen';
import RecoverPasswordScreen from '../screens/RecoverPasswordScreen';
import EmailSentScreen from '../screens/EmailSentScreen';
import RegisterStep1Screen from '../screens/RegisterStep1Screen';
import RegisterStep2Screen from '../screens/RegisterStep2Screen';
import WelcomeOnboardingScreen from '../screens/WelcomeOnboardingScreen';
import FinanceScreen from '../screens/FinanceScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';
import CreatePatientScreen from '../screens/CreatePatientScreen';
import CreateSessionScreen from '../screens/CreateSessionScreen';
import ClinicalNoteEditorScreen from '../screens/ClinicalNoteEditorScreen';
import DocumentDetailScreen from '../screens/DocumentDetailScreen';
import PatientDashboardScreen from '../screens/PatientDashboardScreen';
import PatientSessionsScreen from '../screens/PatientSessionsScreen';
import PatientDocumentsScreen from '../screens/PatientDocumentsScreen';
import PatientSettingsScreen from '../screens/PatientSettingsScreen';
import PatientDocumentDetailScreen from '../screens/PatientDocumentDetailScreen';
import EmotionalDiaryScreen from '../screens/EmotionalDiaryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const useNavigatorTheme = () => {
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? colors.dark : colors.light;

  return { scheme, themeColors };
};

function ClinicianTabs() {
  const { themeColors } = useNavigatorTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.background,
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.border,
        },
        headerTintColor: themeColors.foreground,
        headerTitleStyle: {
          fontFamily: 'Lora',
          fontWeight: '600',
          fontSize: 20,
        },
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.border,
          elevation: 8,
          shadowColor: themeColors.foreground,
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.mutedForeground,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Hoje',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientsScreen}
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{
          title: 'Docs',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceScreen}
        options={{
          title: 'Financeiro',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Banknote color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function PatientTabs() {
  const { themeColors } = useNavigatorTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.background,
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.border,
        },
        headerTintColor: themeColors.foreground,
        headerTitleStyle: {
          fontFamily: 'Lora',
          fontWeight: '600',
          fontSize: 20,
        },
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.border,
          elevation: 8,
          shadowColor: themeColors.foreground,
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.mutedForeground,
      }}
    >
      <Tab.Screen
        name="PatientDashboard"
        component={PatientDashboardScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="PatientSessions"
        component={PatientSessionsScreen}
        options={{
          title: 'Sessoes',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="PatientDocuments"
        component={PatientDocumentsScreen}
        options={{
          title: 'Documentos',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="PatientSettings"
        component={PatientSettingsScreen}
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RecoverPassword" component={RecoverPasswordScreen} />
      <Stack.Screen name="EmailSent" component={EmailSentScreen} />
      <Stack.Screen name="RegisterStep1" component={RegisterStep1Screen} />
      <Stack.Screen name="RegisterStep2" component={RegisterStep2Screen} />
      <Stack.Screen name="WelcomeOnboarding" component={WelcomeOnboardingScreen} />
    </Stack.Navigator>
  );
}

function ClinicianStackNavigator() {
  const { themeColors } = useNavigatorTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.background,
        },
        headerTintColor: themeColors.foreground,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: 'Lora',
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen name="MainTabs" component={ClinicianTabs} options={{ headerShown: false }} />
      <Stack.Screen name="SessionHub" component={SessionHubScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Paciente' }} />
      <Stack.Screen name="CreatePatient" component={CreatePatientScreen} options={{ title: 'Novo Paciente' }} />
      <Stack.Screen name="CreateSession" component={CreateSessionScreen} options={{ title: 'Nova Sessao' }} />
      <Stack.Screen name="ClinicalNoteEditor" component={ClinicalNoteEditorScreen} options={{ title: 'Nota Clinica' }} />
      <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ title: 'Documento' }} />
    </Stack.Navigator>
  );
}

function PatientStackNavigator() {
  const { themeColors } = useNavigatorTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.background,
        },
        headerTintColor: themeColors.foreground,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: 'Lora',
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen name="PatientTabs" component={PatientTabs} options={{ headerShown: false }} />
      <Stack.Screen name="EmotionalDiary" component={EmotionalDiaryScreen} options={{ title: 'Diario emocional' }} />
      <Stack.Screen name="PatientDocumentDetail" component={PatientDocumentDetailScreen} options={{ title: 'Documento' }} />
    </Stack.Navigator>
  );
}

function AuthenticatedNavigator() {
  const { user } = useAuth();

  if (user?.role === 'patient') {
    return <PatientStackNavigator />;
  }

  return <ClinicianStackNavigator />;
}

export default function AppNavigator() {
  const { scheme, themeColors } = useNavigatorTheme();
  const { isAuthenticated } = useAuth();

  const navigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: themeColors.background,
      card: themeColors.card,
      text: themeColors.foreground,
      border: themeColors.border,
      primary: themeColors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      {isAuthenticated ? <AuthenticatedNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}
