import * as SecureStore from 'expo-secure-store';

import type { FinancialEntryRecord, SessionRecord } from './api/types';

type SessionReminderState = {
  reminderSent: boolean;
  lastReminderAt?: string;
};

type FinanceReminderState = {
  lastReminderAt?: string;
};

type LocalReminderState = {
  sessions: Record<string, SessionReminderState>;
  finance: Record<string, FinanceReminderState>;
};

const STORAGE_KEY = 'ethos_local_reminder_state';

const defaultState: LocalReminderState = {
  sessions: {},
  finance: {},
};

const loadState = async (): Promise<LocalReminderState> => {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return defaultState;

  try {
    const parsed = JSON.parse(raw) as Partial<LocalReminderState>;
    return {
      sessions: parsed.sessions ?? {},
      finance: parsed.finance ?? {},
    };
  } catch {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return defaultState;
  }
};

const saveState = async (state: LocalReminderState) => {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
};

export const applySessionReminderState = async (sessions: SessionRecord[]) => {
  const state = await loadState();
  return sessions.map((session) => ({
    ...session,
    reminderSent: state.sessions[session.id]?.reminderSent ?? session.reminderSent ?? false,
  }));
};

export const applyFinanceReminderState = async (entries: FinancialEntryRecord[]) => {
  const state = await loadState();
  return entries.map((entry) => ({
    ...entry,
    lastReminderAt: state.finance[entry.id]?.lastReminderAt ?? entry.lastReminderAt,
  }));
};

export const markSessionReminderSent = async (sessionId: string) => {
  const state = await loadState();
  const lastReminderAt = new Date().toISOString();
  state.sessions[sessionId] = {
    reminderSent: true,
    lastReminderAt,
  };
  await saveState(state);
  return lastReminderAt;
};

export const markFinanceReminderSent = async (entryId: string) => {
  const state = await loadState();
  const lastReminderAt = new Date().toISOString();
  state.finance[entryId] = {
    lastReminderAt,
  };
  await saveState(state);
  return lastReminderAt;
};
