export type SupervisionPriority = "low" | "normal" | "high";

export interface SupervisionNote {
  id: string;
  patientId: string;
  title: string;
  content: string;
  focus: string;
  nextSessionPrompt: string;
  tags: string[];
  priority: SupervisionPriority;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreSessionBriefingSettings {
  enabled: boolean;
  minutesBeforeSession: number;
}

export interface SupervisionNoteInput {
  title: string;
  content: string;
  focus: string;
  nextSessionPrompt: string;
  tags: string | string[];
  priority: SupervisionPriority;
  pinned?: boolean;
}

const NOTES_KEY = "ethos_supervision_notes_v1";
const BRIEFING_SETTINGS_PREFIX = "ethos_pre_session_briefing_";

export const defaultPreSessionBriefingSettings: PreSessionBriefingSettings = {
  enabled: false,
  minutesBeforeSession: 60,
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAllNotes() {
  if (!canUseStorage()) return [] as SupervisionNote[];
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SupervisionNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllNotes(notes: SupervisionNote[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function normalizeSupervisionTags(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : value ?? "";
  return raw
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 6);
}

export function listSupervisionNotes(patientId: string) {
  return readAllNotes()
    .filter((note) => note.patientId === patientId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function saveSupervisionNote(patientId: string, input: SupervisionNoteInput, existingId?: string) {
  const now = new Date().toISOString();
  const allNotes = readAllNotes();
  const existing = existingId ? allNotes.find((note) => note.id === existingId) : undefined;
  const note: SupervisionNote = {
    id: existing?.id ?? `supervision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    patientId,
    title: input.title.trim() || "Nota de supervisao",
    content: input.content.trim(),
    focus: input.focus.trim(),
    nextSessionPrompt: input.nextSessionPrompt.trim(),
    tags: normalizeSupervisionTags(input.tags),
    priority: input.priority,
    pinned: input.pinned ?? existing?.pinned ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  writeAllNotes(existing ? allNotes.map((item) => (item.id === existing.id ? note : item)) : [note, ...allNotes]);
  return note;
}

export function deleteSupervisionNote(noteId: string) {
  writeAllNotes(readAllNotes().filter((note) => note.id !== noteId));
}

export function toggleSupervisionNotePinned(noteId: string) {
  const allNotes = readAllNotes();
  writeAllNotes(
    allNotes.map((note) =>
      note.id === noteId ? { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() } : note,
    ),
  );
}

export function readPreSessionBriefingSettings(patientId: string): PreSessionBriefingSettings {
  if (!canUseStorage()) return defaultPreSessionBriefingSettings;
  try {
    const raw = window.localStorage.getItem(BRIEFING_SETTINGS_PREFIX + patientId);
    if (!raw) return defaultPreSessionBriefingSettings;
    const parsed = JSON.parse(raw) as Partial<PreSessionBriefingSettings>;
    return {
      enabled: parsed.enabled ?? defaultPreSessionBriefingSettings.enabled,
      minutesBeforeSession: parsed.minutesBeforeSession ?? defaultPreSessionBriefingSettings.minutesBeforeSession,
    };
  } catch {
    return defaultPreSessionBriefingSettings;
  }
}

export function savePreSessionBriefingSettings(patientId: string, settings: PreSessionBriefingSettings) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(BRIEFING_SETTINGS_PREFIX + patientId, JSON.stringify(settings));
}

export function buildPreSessionBriefingText(input: {
  patientName: string;
  nextSessionLabel: string;
  mainComplaint: string;
  clinicalEvolution: string;
  supervisionNotes: SupervisionNote[];
}) {
  const notes = input.supervisionNotes.length
    ? input.supervisionNotes
        .slice(0, 4)
        .map((note, index) => {
          const prompt = note.nextSessionPrompt ? `\n   Levar para a sessao: ${note.nextSessionPrompt}` : "";
          return `${index + 1}. ${note.title}: ${note.content}${prompt}`;
        })
        .join("\n")
    : "Sem anotacoes de supervisao registradas.";

  return [
    `Briefing pre-sessao - ${input.patientName}`,
    `Proxima sessao: ${input.nextSessionLabel}`,
    "",
    `Queixa principal: ${input.mainComplaint || "Nao registrada."}`,
    "",
    `Evolucao clinica: ${input.clinicalEvolution || "Sem sintese registrada."}`,
    "",
    "Anotacoes de supervisao:",
    notes,
  ].join("\n");
}
