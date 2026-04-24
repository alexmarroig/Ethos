import type { Session } from "@/services/sessionService";

export type AgendaDraftSource = "local";
export type AgendaDraftMode = "session" | "task";
export type AgendaDensity = "compact" | "comfortable";

export type AgendaDraftSession = {
  patientId: string;
  date: string;
  time: string;
  duration: number;
  locationType: "remote" | "presencial";
  recurring: boolean;
  recurrenceType: "weekly" | "2x-week" | "biweekly";
  selectedDays: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">;
};

export type AgendaDraftTask = {
  taskTitle: string;
  date: string;
  time: string;
  duration: number;
};

export type AgendaDraftPayload = AgendaDraftSession | AgendaDraftTask;

export interface AgendaDraft<TPayload extends AgendaDraftPayload> {
  version: 1;
  updatedAt: string;
  source: AgendaDraftSource;
  mode: AgendaDraftMode;
  payload: TPayload;
}

export interface AgendaWeekCache {
  version: 1;
  fetchedAt: string;
  weekWindow: {
    from: string;
    to: string;
  };
  sessions: Session[];
}

export interface AgendaSettingsDraft {
  version: 1;
  updatedAt: string;
  source: AgendaDraftSource;
  payload: {
    startHour: number;
    endHour: number;
    enabledWeekdays: number[];
    density: AgendaDensity;
    suggestionsExpanded: boolean;
  };
}

const SESSION_DRAFT_KEY = "ethos_agenda_draft_session_v1";
const TASK_DRAFT_KEY = "ethos_agenda_draft_task_v1";
const WEEK_CACHE_KEY = "ethos_agenda_week_cache_v1";
const SETTINGS_DRAFT_KEY = "ethos_agenda_settings_draft_v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures to avoid breaking agenda UX.
  }
}

function removeJson(key: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures to avoid breaking agenda UX.
  }
}

export function readAgendaDraft(mode: "session"): AgendaDraft<AgendaDraftSession> | null;
export function readAgendaDraft(mode: "task"): AgendaDraft<AgendaDraftTask> | null;
export function readAgendaDraft(mode: AgendaDraftMode) {
  return readJson(mode === "session" ? SESSION_DRAFT_KEY : TASK_DRAFT_KEY);
}

export function writeAgendaDraft(mode: "session", payload: AgendaDraftSession) {
  writeJson<AgendaDraft<AgendaDraftSession>>(SESSION_DRAFT_KEY, {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: "local",
    mode,
    payload,
  });
}

export function writeAgendaTaskDraft(payload: AgendaDraftTask) {
  writeJson<AgendaDraft<AgendaDraftTask>>(TASK_DRAFT_KEY, {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: "local",
    mode: "task",
    payload,
  });
}

export function clearAgendaDraft(mode: AgendaDraftMode) {
  removeJson(mode === "session" ? SESSION_DRAFT_KEY : TASK_DRAFT_KEY);
}

export function readAgendaWeekCache() {
  return readJson<AgendaWeekCache>(WEEK_CACHE_KEY);
}

export function writeAgendaWeekCache(value: AgendaWeekCache) {
  writeJson(WEEK_CACHE_KEY, value);
}

export function readAgendaSettingsDraft() {
  return readJson<AgendaSettingsDraft>(SETTINGS_DRAFT_KEY);
}

export function writeAgendaSettingsDraft(payload: AgendaSettingsDraft["payload"]) {
  writeJson<AgendaSettingsDraft>(SETTINGS_DRAFT_KEY, {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: "local",
    payload,
  });
}
