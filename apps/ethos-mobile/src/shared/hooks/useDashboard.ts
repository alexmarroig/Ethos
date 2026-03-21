import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { fetchSessions } from '../services/api/sessions';
import type { Session as ApiSession } from '@ethos/shared';

const DEMO_SESSIONS: Partial<ApiSession>[] = [
  { id: '1', patientId: 'Patient 1 (Demo)', scheduledAt: '14:00', status: 'pending' },
  { id: '2', patientId: 'Patient 2 (Demo)', scheduledAt: '16:00', status: 'completed' },
];

export function useDashboard() {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    if (Platform.OS === 'web') {
      setSessions(DEMO_SESSIONS as ApiSession[]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchSessions();
      setSessions(data);
    } catch (err: any) {
      console.error('Failed to fetch sessions: ', err);
      setError(err.message || 'Erro ao carregar sessões.');
      setSessions([
        { id: '1', patientId: 'Patient 1 (Fallback)', scheduledAt: '14:00', status: 'pending' },
        { id: '2', patientId: 'Patient 2 (Fallback)', scheduledAt: '16:00', status: 'completed' },
      ] as ApiSession[]);
    } finally {
      setIsLoading(false);
    }
  }

  return { sessions, isLoading, error, reload: loadSessions };
}
