// ethos-mobile/src/navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { colors } from '../theme/colors';

// Icons
import { Home, Calendar, Users, Settings, FileText } from 'lucide-react-native';

// Screens
import DashboardScreen from '../../features/dashboard/screens/DashboardScreen';
import ScheduleScreen from '../../features/sessions/screens/ScheduleScreen';
import PatientsScreen from '../../features/patients/screens/PatientsScreen';
import SettingsScreen from '../../features/settings/screens/SettingsScreen';
import SessionHubScreen from '../../features/sessions/screens/SessionHubScreen';
import DocumentsScreen from '../../features/documents/screens/DocumentsScreen';
import LoginScreen from '../../features/auth/screens/LoginScreen';
import RecoverPasswordScreen from '../../features/auth/screens/RecoverPasswordScreen';
import EmailSentScreen from '../../features/auth/screens/EmailSentScreen';
import RegisterStep1Screen from '../../features/auth/screens/RegisterStep1Screen';
import RegisterStep2Screen from '../../features/auth/screens/RegisterStep2Screen';
import WelcomeOnboardingScreen from '../../features/onboarding/screens/WelcomeOnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
    const scheme = useColorScheme();
    const themeColors = scheme === 'dark' ? colors.dark : colors.light;

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
                    headerShown: false, // Custom header in screen
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
                    headerShown: false, // Custom header
                    tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
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

export default function AppNavigator() {
    const scheme = useColorScheme();
    const themeColors = scheme === 'dark' ? colors.dark : colors.light;

    const NavigationTheme = {
        ... (scheme === 'dark' ? DarkTheme : DefaultTheme),
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
        <NavigationContainer theme={NavigationTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="RecoverPassword" component={RecoverPasswordScreen} />
                <Stack.Screen name="EmailSent" component={EmailSentScreen} />
                <Stack.Screen name="RegisterStep1" component={RegisterStep1Screen} />
                <Stack.Screen name="RegisterStep2" component={RegisterStep2Screen} />
                <Stack.Screen name="WelcomeOnboarding" component={WelcomeOnboardingScreen} />
                <Stack.Screen name="MainTabs" component={BottomTabs} />
                <Stack.Screen name="SessionHub" component={SessionHubScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
