// src/contexts/NotificationsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.15.182:8787';

let authTokenRef: string | null = null;
export const setNotificationsAuthToken = (token: string | null) => {
  authTokenRef = token;
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
    setNotifications((prev) => [
      { ...n, id: `${Date.now()}-${Math.random()}`, read: false, timestamp: new Date() },
      ...prev,
    ]);
  }, []);

  const addPendingJob = useCallback((job: PendingJob) => {
    if (!job.jobId) {
      addNotification({ type: 'sessao_pendente', title: 'Transcrição indisponível', body: job.patientName });
      return;
    }
    setPendingJobs((prev) => [...prev, job]);
  }, [addNotification]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removePendingJob = useCallback((jobId: string) => {
    setPendingJobs((prev) => prev.filter((j) => j.jobId !== jobId));
  }, []);

  // Background job polling — lives here so it survives navigation away from SessionHub
  useEffect(() => {
    if (pendingJobs.length === 0) return;

    const interval = setInterval(async () => {
      for (const job of pendingJobs) {
        try {
          const token = authTokenRef;
          const res = await fetch(`${API_URL}/jobs/${job.jobId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) continue;
          const data: any = await res.json();
          const status = data?.data?.status ?? data?.status;

          if (status === 'completed') {
            addNotification({
              type: 'prontuario_gerado',
              title: 'Prontuário gerado',
              body: job.patientName,
              document: data?.data?.document ?? {
                id: `doc-${Date.now()}`,
                title: `Sessão — ${job.patientName}`,
                patient: job.patientName,
                status: 'rascunho',
                date: new Date().toLocaleDateString('pt-BR'),
                content: data?.data?.transcript ?? 'Transcrição concluída. Revise o prontuário.',
              },
            });
            removePendingJob(job.jobId);
          } else if (status === 'failed') {
            addNotification({ type: 'sessao_pendente', title: 'Transcrição falhou', body: job.patientName });
            removePendingJob(job.jobId);
          }
        } catch {
          // network error — try again next tick
        }
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [pendingJobs, addNotification, removePendingJob]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, addPendingJob, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
