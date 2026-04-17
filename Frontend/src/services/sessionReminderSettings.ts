export type SessionReminderSettings = {
  enabled: boolean;
  hoursBeforeSession: number;
  defaultTemplate: string;
};

const STORAGE_KEY = "ethos_web_session_reminder_settings_v1";
const PATIENT_KEY_PREFIX = "ethos_web_session_reminder_patient_";

export const defaultSessionReminderSettings: SessionReminderSettings = {
  enabled: false,
  hoursBeforeSession: 24,
  defaultTemplate:
    "Lembrete ETHOS\n\nOlá, {patient_name}! 👋\n\nLembro que temos sessão agendada para {session_date} às {session_time}.\n\nQualquer dúvida, estou à disposição.\n\nAté lá! 🌱",
};

export const readSessionReminderSettings = (): SessionReminderSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSessionReminderSettings;
    const parsed = JSON.parse(raw) as Partial<SessionReminderSettings>;
    return {
      enabled: parsed.enabled ?? defaultSessionReminderSettings.enabled,
      hoursBeforeSession: parsed.hoursBeforeSession ?? defaultSessionReminderSettings.hoursBeforeSession,
      defaultTemplate: parsed.defaultTemplate || defaultSessionReminderSettings.defaultTemplate,
    };
  } catch {
    return defaultSessionReminderSettings;
  }
};

export const saveSessionReminderSettings = (settings: SessionReminderSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const readPatientSessionReminderEnabled = (patientId: string): boolean => {
  try {
    const raw = localStorage.getItem(PATIENT_KEY_PREFIX + patientId);
    if (raw === null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
};

export const savePatientSessionReminderEnabled = (patientId: string, enabled: boolean) => {
  localStorage.setItem(PATIENT_KEY_PREFIX + patientId, JSON.stringify(enabled));
};

export const buildSessionReminderMessage = (
  template: string,
  values: {
    patient_name: string;
    session_date: string;
    session_time: string;
    psychologist_name: string;
  },
) =>
  template
    .replaceAll("{patient_name}", values.patient_name)
    .replaceAll("{session_date}", values.session_date)
    .replaceAll("{session_time}", values.session_time)
    .replaceAll("{psychologist_name}", values.psychologist_name);
