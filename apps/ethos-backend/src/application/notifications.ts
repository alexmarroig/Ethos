import { db, uid, seeds } from "../infra/database";
import type {
  ClinicalSession,
  NotificationChannel,
  NotificationConsent,
  NotificationLog,
  NotificationSchedule,
  NotificationTemplate,
} from "../domain/types";

const now = seeds.now;

type ProviderResponse = {
  provider: "smtp" | "whatsapp_api";
  status: "sent" | "failed";
  error?: string;
};

const sendEmail = async (recipient: string, template: NotificationTemplate) => {
  const subject = template.subject ?? "Lembrete Ethos";
  if (!recipient.includes("@")) {
    return { provider: "smtp", status: "failed", error: "INVALID_EMAIL" } satisfies ProviderResponse;
  }

  void subject;
  return { provider: "smtp", status: "sent" } satisfies ProviderResponse;
};

const sendWhatsapp = async (recipient: string) => {
  const digits = recipient.replace(/\D/g, "");
  if (digits.length < 10) {
    return { provider: "whatsapp_api", status: "failed", error: "INVALID_WHATSAPP" } satisfies ProviderResponse;
  }
  return { provider: "whatsapp_api", status: "sent" } satisfies ProviderResponse;
};

const hasConsent = (ownerId: string, patientId: string, channel: NotificationChannel) =>
  Array.from(db.notificationConsents.values()).some((consent) =>
    consent.owner_user_id === ownerId && consent.patient_id === patientId && consent.channel === channel,
  );

export const createNotificationTemplate = (ownerId: string, payload: {
  name: string;
  channel: NotificationChannel;
  content: string;
  subject?: string;
}) => {
  const template: NotificationTemplate = {
    id: uid(),
    owner_user_id: ownerId,
    name: payload.name,
    channel: payload.channel,
    content: payload.content,
    subject: payload.subject,
    created_at: now(),
  };
  db.notificationTemplates.set(template.id, template);
  return template;
};

export const listNotificationTemplates = (ownerId: string) =>
  Array.from(db.notificationTemplates.values()).filter((template) => template.owner_user_id === ownerId);

export const grantNotificationConsent = (ownerId: string, payload: {
  patientId: string;
  channel: NotificationChannel;
  source: string;
}) => {
  const existing = Array.from(db.notificationConsents.values()).find((consent) =>
    consent.owner_user_id === ownerId && consent.patient_id === payload.patientId && consent.channel === payload.channel,
  );

  if (existing) {
    existing.granted_at = now();
    existing.source = payload.source;
    return existing;
  }

  const consent: NotificationConsent = {
    id: uid(),
    owner_user_id: ownerId,
    patient_id: payload.patientId,
    channel: payload.channel,
    source: payload.source,
    granted_at: now(),
    created_at: now(),
  };
  db.notificationConsents.set(consent.id, consent);
  return consent;
};

const createLog = (ownerId: string, schedule: NotificationSchedule, result: ProviderResponse): NotificationLog => {
  const log: NotificationLog = {
    id: uid(),
    owner_user_id: ownerId,
    schedule_id: schedule.id,
    channel: schedule.channel,
    provider: result.provider,
    recipient: schedule.recipient,
    status: result.status,
    error: result.error,
    sent_at: now(),
    created_at: now(),
  };
  db.notificationLogs.set(log.id, log);
  return log;
};

const dispatchSchedule = async (ownerId: string, schedule: NotificationSchedule, template: NotificationTemplate) => {
  const result = schedule.channel === "email"
    ? await sendEmail(schedule.recipient, template)
    : await sendWhatsapp(schedule.recipient);

  schedule.status = result.status === "sent" ? "sent" : "failed";
  schedule.last_sent_at = now();
  schedule.last_error = result.error;
  const log = createLog(ownerId, schedule, result);
  return { schedule, log };
};

export const scheduleNotification = async (ownerId: string, payload: {
  session: ClinicalSession;
  template: NotificationTemplate;
  scheduledFor: string;
  recipient: string;
}) => {
  if (!hasConsent(ownerId, payload.session.patient_id, payload.template.channel)) {
    return { error: "CONSENT_REQUIRED" } as const;
  }

  const schedule: NotificationSchedule = {
    id: uid(),
    owner_user_id: ownerId,
    session_id: payload.session.id,
    patient_id: payload.session.patient_id,
    template_id: payload.template.id,
    channel: payload.template.channel,
    scheduled_for: payload.scheduledFor,
    recipient: payload.recipient,
    status: "scheduled",
    created_at: now(),
  };
  db.notificationSchedules.set(schedule.id, schedule);

  if (Date.parse(payload.scheduledFor) <= Date.now()) {
    const dispatched = await dispatchSchedule(ownerId, schedule, payload.template);
    return { schedule: dispatched.schedule, log: dispatched.log } as const;
  }

  return { schedule } as const;
};

export const listNotificationSchedules = (ownerId: string) =>
  Array.from(db.notificationSchedules.values()).filter((schedule) => schedule.owner_user_id === ownerId);

export const listNotificationLogs = (ownerId: string) =>
  Array.from(db.notificationLogs.values()).filter((log) => log.owner_user_id === ownerId);

export const dispatchDueNotifications = async (ownerId: string, asOf = Date.now()) => {
  const results: Array<{ schedule: NotificationSchedule; log: NotificationLog } | { schedule: NotificationSchedule }> = [];
  for (const schedule of db.notificationSchedules.values()) {
    if (schedule.owner_user_id !== ownerId) continue;
    if (schedule.status !== "scheduled") continue;
    if (Date.parse(schedule.scheduled_for) > asOf) continue;

    const template = db.notificationTemplates.get(schedule.template_id);
    if (!template) {
      schedule.status = "failed";
      schedule.last_error = "TEMPLATE_NOT_FOUND";
      schedule.last_sent_at = now();
      results.push({ schedule });
      continue;
    }

    const dispatched = await dispatchSchedule(ownerId, schedule, template);
    results.push(dispatched);
  }
  return results;
};
