import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { Banknote, Calendar, FileText, Home, Settings, Users } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import RecoverPasswordScreen from '../screens/RecoverPasswordScreen';
import EmailSentScreen from '../screens/EmailSentScreen';
import RegisterStep1Screen from '../screens/RegisterStep1Screen';
import RegisterStep2Screen from '../screens/RegisterStep2Screen';
import WelcomeOnboardingScreen from '../screens/WelcomeOnboardingScreen';

// ── Clinician tabs ────────────────────────────────────────────────────────────
import DashboardScreen from '../screens/DashboardScreen';
import CalendarScreen from '../screens/CalendarScreen';
import PatientsScreen from '../screens/PatientsScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import FinanceScreen from '../screens/FinanceScreen';
import SettingsScreen from '../screens/SettingsScreen';

// ── Clinician stack ───────────────────────────────────────────────────────────
import SessionHubScreen from '../screens/SessionHubScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';
import CreatePatientScreen from '../screens/CreatePatientScreen';
import CreateSessionScreen from '../screens/CreateSessionScreen';
import ClinicalNoteEditorScreen from '../screens/ClinicalNoteEditorScreen';
import ProntuarioScreen from '../screens/ProntuarioScreen';
import DocumentDetailScreen from '../screens/DocumentDetailScreen';
import DocumentViewerScreen from '../screens/DocumentViewerScreen';
import DocumentBuilderScreen from '../screens/DocumentBuilderScreen';
import ContractScreen from '../screens/ContractScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import ScalesScreen from '../screens/ScalesScreen';
import ScaleHistoryScreen from '../screens/ScaleHistoryScreen';
import FormsScreen from '../screens/FormsScreen';
import FormBuilderScreen from '../screens/FormBuilderScreen';
import FormResponsesScreen from '../screens/FormResponsesScreen';
import AnamnesisScreen from '../screens/AnamnesisScreen';
import ReportWizardScreen from '../screens/ReportWizardScreen';
import SupervisionNotesScreen from '../screens/SupervisionNotesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SearchScreen from '../screens/SearchScreen';

// ── Patient tabs ──────────────────────────────────────────────────────────────
import PatientDashboardScreen from '../screens/PatientDashboardScreen';
import PatientSessionsScreen from '../screens/PatientSessionsScreen';
import PatientDocumentsScreen from '../screens/PatientDocumentsScreen';
import PatientSettingsScreen from '../screens/PatientSettingsScreen';

// ── Patient stack ─────────────────────────────────────────────────────────────
import EmotionalDiaryScreen from '../screens/EmotionalDiaryScreen';
import PatientDocumentDetailScreen from '../screens/PatientDocumentDetailScreen';
import PatientPaymentsScreen from '../screens/PatientPaymentsScreen';
import PatientBookingScreen from '../screens/PatientBookingScreen';
import PatientDreamDiaryScreen from '../screens/PatientDreamDiaryScreen';
import PatientScalesScreen from '../screens/PatientScalesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const useNavigatorTheme = () => {
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? colors.dark : colors.light;
  return { scheme, themeColors };
};

// ─────────────────────────────────────────────────────────────────────────────
// Clinician Tabs
// ─────────────────────────────────────────────────────────────────────────────
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
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Agenda',
          headerShown: false,
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

// ─────────────────────────────────────────────────────────────────────────────
// Patient Tabs
// ─────────────────────────────────────────────────────────────────────────────
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
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="PatientSessions"
        component={PatientSessionsScreen}
        options={{
          title: 'Sessões',
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

// ─────────────────────────────────────────────────────────────────────────────
// Auth Stack
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Clinician Stack
// ─────────────────────────────────────────────────────────────────────────────
function ClinicianStackNavigator() {
  const { themeColors } = useNavigatorTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.background },
        headerTintColor: themeColors.foreground,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Lora', fontWeight: '600' },
      }}
    >
      {/* Root tabs */}
      <Stack.Screen name="MainTabs" component={ClinicianTabs} options={{ headerShown: false }} />

      {/* Session */}
      <Stack.Screen name="SessionHub" component={SessionHubScreen} options={{ headerShown: false }} />

      {/* Clinical notes */}
      <Stack.Screen name="ClinicalNoteEditor" component={ClinicalNoteEditorScreen} options={{ title: 'Nota Clínica' }} />
      <Stack.Screen name="Prontuario" component={ProntuarioScreen} options={{ title: 'Prontuário' }} />

      {/* Patient management */}
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Paciente' }} />
      <Stack.Screen name="CreatePatient" component={CreatePatientScreen} options={{ title: 'Novo Paciente' }} />
      <Stack.Screen name="CreateSession" component={CreateSessionScreen} options={{ title: 'Nova Sessão' }} />
      <Stack.Screen name="Anamnesis" component={AnamnesisScreen} options={{ title: 'Anamnese' }} />
      <Stack.Screen name="SupervisionNotes" component={SupervisionNotesScreen} options={{ title: 'Notas de Supervisão' }} />

      {/* Scales */}
      <Stack.Screen name="Scales" component={ScalesScreen} options={{ title: 'Escalas Clínicas' }} />
      <Stack.Screen name="ScaleHistory" component={ScaleHistoryScreen} options={{ title: 'Histórico da Escala' }} />

      {/* Forms */}
      <Stack.Screen name="Forms" component={FormsScreen} options={{ title: 'Formulários' }} />
      <Stack.Screen name="FormBuilder" component={FormBuilderScreen} options={{ title: 'Criar Formulário' }} />
      <Stack.Screen name="FormResponses" component={FormResponsesScreen} options={{ title: 'Respostas' }} />

      {/* Documents */}
      <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ title: 'Documento' }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ title: 'Visualizador' }} />
      <Stack.Screen name="DocumentBuilder" component={DocumentBuilderScreen} options={{ title: 'Criar Documento' }} />

      {/* Contracts & Reports */}
      <Stack.Screen name="Contracts" component={ContractScreen} options={{ title: 'Contratos Terapêuticos' }} />
      <Stack.Screen name="ReportWizard" component={ReportWizardScreen} options={{ headerShown: false }} />

      {/* Availability */}
      <Stack.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'Minha Disponibilidade' }} />

      {/* Shared */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notificações' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Busca' }} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Stack
// ─────────────────────────────────────────────────────────────────────────────
function PatientStackNavigator() {
  const { themeColors } = useNavigatorTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.background },
        headerTintColor: themeColors.foreground,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Lora', fontWeight: '600' },
      }}
    >
      {/* Root tabs */}
      <Stack.Screen name="PatientTabs" component={PatientTabs} options={{ headerShown: false }} />

      {/* Diary & wellness */}
      <Stack.Screen name="EmotionalDiary" component={EmotionalDiaryScreen} options={{ title: 'Diário Emocional' }} />
      <Stack.Screen name="DreamDiary" component={PatientDreamDiaryScreen} options={{ title: 'Diário de Sonhos' }} />

      {/* Documents */}
      <Stack.Screen name="PatientDocumentDetail" component={PatientDocumentDetailScreen} options={{ title: 'Documento' }} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} options={{ title: 'Visualizador' }} />

      {/* Portal features */}
      <Stack.Screen name="PatientPayments" component={PatientPaymentsScreen} options={{ title: 'Cobranças' }} />
      <Stack.Screen name="PatientBooking" component={PatientBookingScreen} options={{ title: 'Agendar Sessão' }} />
      <Stack.Screen name="PatientScales" component={PatientScalesScreen} options={{ title: 'Minhas Escalas' }} />

      {/* Shared */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notificações' }} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────
function AuthenticatedNavigator() {
  const { user } = useAuth();
  if (user?.role === 'patient') return <PatientStackNavigator />;
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
