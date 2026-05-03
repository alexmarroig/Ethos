import type { Session } from "@/services/sessionService";

export type AgendaDraftSource = "local";
export type AgendaDraftMode = "session" | "task";
export type AgendaDensity = "compact" | "comfortable";
export type AgendaColorId = "teal" | "sky" | "violet" | "amber" | "rose" | "emerald" | "slate";
export type AgendaCategoryId = "clinical" | "admin" | "finance" | "study" | "personal" | "marketing" | "buffer";
export type AgendaPriority = "low" | "normal" | "high";

export interface AgendaColorOption {
  id: AgendaColorId;
  label: string;
  dotClass: string;
  cardClass: string;
  chipClass: string;
}

export interface AgendaCategoryOption {
  id: AgendaCategoryId;
  label: string;
  description: string;
  defaultColorId: AgendaColorId;
}

export interface AgendaEventMeta {
  version: 1;
  updatedAt: string;
  colorId: AgendaColorId;
  categoryId: AgendaCategoryId;
  tags: string[];
  priority: AgendaPriority;
}

export const agendaColors: AgendaColorOption[] = [
  {
    id: "teal",
    label: "Clínico",
    dotClass: "bg-teal-500",
    cardClass: "border-teal-500/40 bg-teal-500/10 text-foreground shadow-[inset_4px_0_0_rgb(20_184_166)]",
    chipClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  {
    id: "sky",
    label: "Online",
    dotClass: "bg-sky-500",
    cardClass: "border-sky-500/40 bg-sky-500/10 text-foreground shadow-[inset_4px_0_0_rgb(14_165_233)]",
    chipClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    id: "violet",
    label: "Estudo",
    dotClass: "bg-violet-500",
    cardClass: "border-violet-500/40 bg-violet-500/10 text-foreground shadow-[inset_4px_0_0_rgb(139_92_246)]",
    chipClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  {
    id: "amber",
    label: "Admin",
    dotClass: "bg-amber-500",
    cardClass: "border-amber-500/40 bg-amber-500/10 text-foreground shadow-[inset_4px_0_0_rgb(245_158_11)]",
    chipClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    id: "rose",
    label: "Pessoal",
    dotClass: "bg-rose-500",
    cardClass: "border-rose-500/40 bg-rose-500/10 text-foreground shadow-[inset_4px_0_0_rgb(244_63_94)]",
    chipClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  {
    id: "emerald",
    label: "Financeiro",
    dotClass: "bg-emerald-500",
    cardClass: "border-emerald-500/40 bg-emerald-500/10 text-foreground shadow-[inset_4px_0_0_rgb(16_185_129)]",
    chipClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "slate",
    label: "Buffer",
    dotClass: "bg-slate-500",
    cardClass: "border-slate-500/40 bg-slate-500/10 text-foreground shadow-[inset_4px_0_0_rgb(100_116_139)]",
    chipClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  },
];

export const agendaCategories: AgendaCategoryOption[] = [
  { id: "clinical", label: "Clínica", description: "Sessões, evoluções e atendimentos.", defaultColorId: "teal" },
  { id: "admin", label: "Admin", description: "Documentos, contato e organização interna.", defaultColorId: "amber" },
  { id: "finance", label: "Financeiro", description: "Cobranças, repasses e fechamento.", defaultColorId: "emerald" },
  { id: "study", label: "Estudo", description: "Supervisão, leitura e aprimoramento.", defaultColorId: "violet" },
  { id: "personal", label: "Pessoal", description: "Pausas, saúde e compromissos pessoais.", defaultColorId: "rose" },
  { id: "marketing", label: "Captação", description: "BioHub, conteúdo e relacionamento.", defaultColorId: "sky" },
  { id: "buffer", label: "Buffer", description: "Deslocamento, respiro e margem entre blocos.", defaultColorId: "slate" },
];

export type AgendaDraftSession = {
  patientId: string;
  date: string;
  time: string;
  duration: number;
  locationType: "remote" | "presencial";
  recurring: boolean;
  recurrenceType: "weekly" | "2x-week" | "biweekly";
  selectedDays: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday">;
  colorId?: AgendaColorId;
  categoryId?: AgendaCategoryId;
  tags?: string[];
  priority?: AgendaPriority;
};

export type AgendaDraftTask = {
  taskTitle: string;
  date: string;
  time: string;
  duration: number;
  colorId?: AgendaColorId;
  categoryId?: AgendaCategoryId;
  tags?: string[];
  priority?: AgendaPriority;
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
const EVENT_META_KEY = "ethos_agenda_event_meta_v1";

export function normalizeAgendaTags(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : value ?? "";
  return raw
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 5);
}

export function getAgendaColor(colorId?: AgendaColorId) {
  return agendaColors.find((color) => color.id === colorId) ?? agendaColors[0];
}

export function getAgendaCategory(categoryId?: AgendaCategoryId) {
  return agendaCategories.find((category) => category.id === categoryId) ?? agendaCategories[0];
}

export function createDefaultAgendaMeta(kind: "session" | "task"): AgendaEventMeta {
  const categoryId: AgendaCategoryId = kind === "session" ? "clinical" : "admin";
  const category = getAgendaCategory(categoryId);
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    colorId: category.defaultColorId,
    categoryId,
    tags: kind === "session" ? ["atendimento"] : [],
    priority: "normal",
  };
}

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

export function readAgendaEventMetaMap() {
  return readJson<Record<string, AgendaEventMeta>>(EVENT_META_KEY) ?? {};
}

export function readAgendaEventMeta(eventId: string, kind: "session" | "task") {
  const stored = readAgendaEventMetaMap()[eventId];
  return stored ?? createDefaultAgendaMeta(kind);
}

export function upsertAgendaEventMeta(
  eventId: string,
  meta: Partial<Omit<AgendaEventMeta, "version" | "updatedAt">>,
) {
  const current = readAgendaEventMetaMap();
  const base = current[eventId] ?? createDefaultAgendaMeta(meta.categoryId === "clinical" ? "session" : "task");
  writeJson<Record<string, AgendaEventMeta>>(EVENT_META_KEY, {
    ...current,
    [eventId]: {
      ...base,
      ...meta,
      tags: normalizeAgendaTags(meta.tags ?? base.tags),
      version: 1,
      updatedAt: new Date().toISOString(),
    },
  });
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
