/**
 * Push Notifications Service
 * Handles registration of Expo Push Token and sending it to the backend.
 * Deep-link routing is wired in NotificationsContext.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { updateCurrentUser } from './api/auth';

export type PushNotificationData = {
  type:
    | 'session_reminder'
    | 'payment_due'
    | 'prontuario_pending'
    | 'transcription_ready'
    | 'booking_request'
    | 'session_tomorrow'
    | 'task_assigned'
    | 'document_available'
    | 'charge_pending'
    | 'diary_reminder';
  sessionId?: string;
  patientId?: string;
  patientName?: string;
  documentId?: string;
  amount?: number;
  [key: string]: unknown;
};

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register the device for push notifications and send the Expo Push Token to the backend.
 * Returns the token string, or null if permission denied / not a physical device.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications don't work on simulators
    return null;
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Ethos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#234e5c',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const token = tokenData.data;

    // Register token with backend
    try {
      await updateCurrentUser({ push_token: token } as any);
    } catch {
      // Non-critical: continue even if backend registration fails
    }

    return token;
  } catch {
    return null;
  }
}

/**
 * Get the deep-link route for a push notification.
 * Returns navigation params compatible with AppNavigator routes.
 */
export function getDeepLinkForNotification(data: PushNotificationData): {
  screen: string;
  params?: Record<string, unknown>;
} | null {
  switch (data.type) {
    case 'session_reminder':
    case 'session_tomorrow':
      return { screen: 'Schedule' };
    case 'payment_due':
    case 'charge_pending':
      return { screen: 'Finance' };
    case 'prontuario_pending':
      return data.sessionId
        ? { screen: 'ProntuarioScreen', params: { sessionId: data.sessionId } }
        : { screen: 'Dashboard' };
    case 'transcription_ready':
      return data.sessionId
        ? { screen: 'SessionHub', params: { sessionId: data.sessionId } }
        : { screen: 'Dashboard' };
    case 'booking_request':
      return { screen: 'CalendarScreen' };
    case 'task_assigned':
      return { screen: 'PatientDashboard' };
    case 'document_available':
      return data.documentId
        ? { screen: 'PatientDocumentDetail', params: { documentId: data.documentId } }
        : { screen: 'PatientDocuments' };
    case 'diary_reminder':
      return { screen: 'EmotionalDiary' };
    default:
      return null;
  }
}
