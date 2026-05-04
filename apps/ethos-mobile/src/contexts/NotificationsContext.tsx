// src/contexts/NotificationsContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import * as Notifications from 'expo-notifications';
import { fetchNotifications } from '../services/api/notifications';
import {
  registerForPushNotificationsAsync,
  getDeepLinkForNotification,
  type PushNotificationData,
} from '../services/pushNotifications';

// ==========================
// TYPES
// ==========================
export type DocumentItem = {
  id: string;
  title: string;
  patient: string;
  status: 'assinado' | 'rascunho';
  date: string;
  content?: string;
};

export type AppNotification = {
  id: string;
  type:
    | 'prontuario_gerado'
    | 'sessao_pendente'
    | 'sessao_amanha'
    | 'pagamento'
    | 'pagamento_vencido'
    | 'prontuario_pendente'
    | 'transcricao_pronta'
    | 'novo_agendamento'
    | 'formulario_atribuido'
    | 'documento_disponivel'
    | 'cobranca_pendente';
  title: string;
  body: string;
  message?: string;
  timestamp: Date;
  created_at?: string;
  read: boolean;
  document?: DocumentItem;
  noteId?: string;
};

type PendingJob = {
  jobId: string;
  patientName: string;
  sessionId: string;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  pushToken: string | null;
  foregroundNotification: AppNotification | null;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void;
  addPendingJob: (job: PendingJob) => void;
  refreshNotifications: () => Promise<AppNotification[]>;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  clearForegroundNotification: () => void;
};

// ==========================
// CONTEXT
// ==========================
const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const mapRemoteNotification = (notification: {
  id: string;
  type: 'session' | 'document' | 'reminder';
  title: string;
  message: string;
  created_at: string;
}): AppNotification => ({
  id: notification.id,
  type:
    notification.type === 'document'
      ? 'prontuario_gerado'
      : notification.type === 'reminder'
        ? 'pagamento'
        : 'sessao_pendente',
  title: notification.title,
  body: notification.message,
  message: notification.message,
  timestamp: new Date(notification.created_at),
  created_at: notification.created_at,
  read: false,
});

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

// ==========================
// CONFIG
// ==========================
const API_URL =
  process.env.EXPO_PUBLIC_ETHOS_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://192.168.15.182:8787';

let authTokenRef: string | null = null;
export const setNotificationsAuthToken = (token: string | null) => {
  authTokenRef = token;
};

// ==========================
// NAVIGATION REF (for deep-links from push)
// ==========================
type NavigationRef = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
} | null;

let navigationRef: NavigationRef = null;
export const setNotificationsNavigationRef = (ref: NavigationRef) => {
  navigationRef = ref;
};

// ==========================
// PROVIDER
// ==========================
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [foregroundNotification, setForegroundNotification] = useState<AppNotification | null>(null);

  const pendingJobsRef = useRef<PendingJob[]>([]);
  pendingJobsRef.current = pendingJobs;

  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener>>();
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener>>();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // ==========================
  // ADD NOTIFICATION
  // ==========================
  const addNotification = useCallback(
    (n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
      setNotifications((prev) => [
        {
          ...n,
          id: `local-${Date.now()}-${Math.random()}`,
          message: n.message ?? n.body,
          read: false,
          timestamp: new Date(),
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    []
  );

  // ==========================
  // ADD JOB (NO DUPLICATE)
  // ==========================
  const addPendingJob = useCallback(
    (job: PendingJob) => {
      if (!job.jobId) {
        addNotification({
          type: 'sessao_pendente',
          title: 'Transcricao indisponivel',
          body: job.patientName,
        });
        return;
      }

      setPendingJobs((prev) => {
        if (prev.some((j) => j.jobId === job.jobId)) return prev;
        return [...prev, job];
      });
    },
    [addNotification]
  );

  const removePendingJob = useCallback((jobId: string) => {
    setPendingJobs((prev) => prev.filter((j) => j.jobId !== jobId));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearForegroundNotification = useCallback(() => {
    setForegroundNotification(null);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const remoteNotifications = await fetchNotifications();
      const mapped = remoteNotifications.map(mapRemoteNotification);
      setNotifications((current) => {
        const localOnly = current.filter((notification) => notification.id.startsWith('local-'));
        return [...mapped, ...localOnly];
      });
      return mapped;
    } catch {
      return notifications;
    }
  }, [notifications]);

  // ==========================
  // PUSH NOTIFICATION SETUP
  // ==========================
  useEffect(() => {
    // Register device for push
    registerForPushNotificationsAsync().then((token) => {
      if (token) setPushToken(token);
    });

    // Handle notification received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as PushNotificationData;
      const notifType = (data?.type as AppNotification['type']) ?? 'sessao_pendente';
      const newNotif: AppNotification = {
        id: `push-${Date.now()}`,
        type: notifType,
        title: notification.request.content.title ?? 'Notificacao',
        body: notification.request.content.body ?? '',
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setForegroundNotification(newNotif);

      // Show badge update
      Notifications.setBadgeCountAsync(unreadCount + 1).catch(() => {});
    });

    // Handle tap on notification (foreground or background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushNotificationData;
      const route = getDeepLinkForNotification(data);
      if (route && navigationRef) {
        try {
          navigationRef.navigate(route.screen, route.params);
        } catch {
          // Navigation not ready yet — ignore
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [addNotification, unreadCount]);

  // ==========================
  // POLLING ENGINE (for transcription jobs)
  // ==========================
  useEffect(() => {
    const interval = setInterval(async () => {
      if (pendingJobsRef.current.length === 0) return;

      for (const job of pendingJobsRef.current) {
        try {
          const res = await fetch(`${API_URL}/jobs/${job.jobId}`, {
            headers: authTokenRef
              ? { Authorization: `Bearer ${authTokenRef}` }
              : {},
          });

          if (!res.ok) continue;

          const data = await res.json();
          const status = data?.data?.status ?? data?.status;

          if (status === 'completed') {
            addNotification({
              type: 'transcricao_pronta',
              title: 'Transcricao pronta',
              body: `Sessao de ${job.patientName} — toque para abrir o prontuario`,
              document:
                data?.data?.document ?? {
                  id: `doc-${Date.now()}`,
                  title: `Sessao — ${job.patientName}`,
                  patient: job.patientName,
                  status: 'rascunho',
                  date: new Date().toLocaleDateString('pt-BR'),
                  content:
                    data?.data?.transcript ??
                    'Transcricao concluida. Revise o prontuario.',
                },
            });

            removePendingJob(job.jobId);
          }

          if (status === 'failed') {
            addNotification({
              type: 'sessao_pendente',
              title: 'Transcricao falhou',
              body: job.patientName,
            });

            removePendingJob(job.jobId);
          }
        } catch {
          // retry silently
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [addNotification, removePendingJob]);

  // ==========================
  // CLEANUP TOKEN
  // ==========================
  useEffect(() => {
    return () => {
      authTokenRef = null;
    };
  }, []);

  // ==========================
  // CONTEXT VALUE
  // ==========================
  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      pushToken,
      foregroundNotification,
      addNotification,
      addPendingJob,
      refreshNotifications,
      markAllRead,
      dismissNotification,
      clearForegroundNotification,
    }),
    [
      notifications,
      unreadCount,
      pushToken,
      foregroundNotification,
      addNotification,
      addPendingJob,
      refreshNotifications,
      markAllRead,
      dismissNotification,
      clearForegroundNotification,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
