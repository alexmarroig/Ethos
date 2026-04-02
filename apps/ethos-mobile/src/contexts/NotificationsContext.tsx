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
  type: 'prontuario_gerado' | 'sessao_pendente' | 'pagamento';
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  document?: DocumentItem;
};

type PendingJob = {
  jobId: string;
  patientName: string;
  sessionId: string;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void;
  addPendingJob: (job: PendingJob) => void;
  markAllRead: () => void;
};

// ==========================
// CONTEXT
// ==========================
const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

// ==========================
// CONFIG
// ==========================
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.15.182:8787';

let authTokenRef: string | null = null;
export const setNotificationsAuthToken = (token: string | null) => {
  authTokenRef = token;
};

// ==========================
// PROVIDER
// ==========================
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);

  const pendingJobsRef = useRef<PendingJob[]>([]);
  pendingJobsRef.current = pendingJobs;

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
          id: `${Date.now()}-${Math.random()}`,
          read: false,
          timestamp: new Date(),
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
          title: 'Transcrição indisponível',
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

  // ==========================
  // POLLING ENGINE
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
              type: 'prontuario_gerado',
              title: 'Prontuário gerado',
              body: job.patientName,
              document:
                data?.data?.document ?? {
                  id: `doc-${Date.now()}`,
                  title: `Sessão — ${job.patientName}`,
                  patient: job.patientName,
                  status: 'rascunho',
                  date: new Date().toLocaleDateString('pt-BR'),
                  content:
                    data?.data?.transcript ??
                    'Transcrição concluída. Revise o prontuário.',
                },
            });

            removePendingJob(job.jobId);
          }

          if (status === 'failed') {
            addNotification({
              type: 'sessao_pendente',
              title: 'Transcrição falhou',
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
      addNotification,
      addPendingJob,
      markAllRead,
    }),
    [notifications, unreadCount, addNotification, addPendingJob, markAllRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}