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

export interface PatientTask {
  id: string;
  title: string;
  date: string;
  time?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientTaskDraft {
  title: string;
  date: string;
  time?: string;
}

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
const PATIENT_TASKS_KEY = "ethos_patient_tasks_v1";

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


export function readPatientTasks() {
  const data = readJson<PatientTask[]>(PATIENT_TASKS_KEY);
  if (!Array.isArray(data)) return [];
  return data;
}

export function writePatientTasks(tasks: PatientTask[]) {
  writeJson(PATIENT_TASKS_KEY, tasks);
}

export function upsertPatientTask(task: Omit<PatientTask, "createdAt" | "updatedAt"> & Partial<Pick<PatientTask, "createdAt">>) {
  const now = new Date().toISOString();
  const current = readPatientTasks();
  const existing = current.find((item) => item.id === task.id);
  const next: PatientTask = {
    ...task,
    createdAt: existing?.createdAt ?? task.createdAt ?? now,
    updatedAt: now,
  };
  const merged = existing
    ? current.map((item) => (item.id === task.id ? next : item))
    : [...current, next];
  writePatientTasks(merged);
  return next;
}

export function deletePatientTask(taskId: string) {
  const current = readPatientTasks();
  const next = current.filter((item) => item.id !== taskId);
  writePatientTasks(next);
  return next;
}
