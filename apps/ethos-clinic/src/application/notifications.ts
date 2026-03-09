import type { ClinicalSession, NotificationChannel, NotificationConsent, NotificationLog, NotificationSchedule, NotificationTemplate } from "../domain/types";
import { db, uid } from "../infra/database";

const now = () => new Date().toISOString();

type CreateTemplateInput = {
  name: string;
  channel: NotificationChannel;
  content: string;
  subject?: string;
};

export const createNotificationTemplate = (ownerUserId: string, input: CreateTemplateInput): NotificationTemplate => {
  const template: NotificationTemplate = {
    id: uid(),
    owner_user_id: ownerUserId,
    created_at: now(),
    name: input.name.trim(),
    channel: input.channel,
    content: input.content.trim(),
    subject: input.subject?.trim() || undefined,
  };

  db.notificationTemplates.set(template.id, template);
  return template;
};

export const listNotificationTemplates = (ownerUserId: string) =>
  Array.from(db.notificationTemplates.values()).filter((item) => item.owner_user_id === ownerUserId);

type GrantConsentInput = {
  patientId: string;
  channel: NotificationChannel;
  source: string;
};

export const grantNotificationConsent = (ownerUserId: string, input: GrantConsentInput): NotificationConsent => {
  const existing = Array.from(db.notificationConsents.values()).find(
    (item) =>
      item.owner_user_id === ownerUserId &&
      item.patient_id === input.patientId &&
      item.channel === input.channel &&
      item.revoked_at === undefined,
  );

  if (existing) return existing;

  const consent: NotificationConsent = {
    id: uid(),
    owner_user_id: ownerUserId,
    created_at: now(),
    patient_id: input.patientId,
    channel: input.channel,
    source: input.source,
    granted_at: now(),
  };

  db.notificationConsents.set(consent.id, consent);
  return consent;
};

type ScheduleInput = {
  session: ClinicalSession;
  template: NotificationTemplate;
  scheduledFor: string;
  recipient: string;
};

type ConsentError = { error: "CONSENT_REQUIRED" };

export const scheduleNotification = async (
  ownerUserId: string,
  input: ScheduleInput,
): Promise<NotificationSchedule | ConsentError> => {
  const hasConsent = Array.from(db.notificationConsents.values()).some(
    (item) =>
      item.owner_user_id === ownerUserId &&
      item.patient_id === input.session.patient_id &&
      item.channel === input.template.channel &&
      item.revoked_at === undefined,
  );

  if (!hasConsent) return { error: "CONSENT_REQUIRED" };

  const schedule: NotificationSchedule = {
    id: uid(),
    owner_user_id: ownerUserId,
    created_at: now(),
    session_id: input.session.id,
    patient_id: input.session.patient_id,
    template_id: input.template.id,
    channel: input.template.channel,
    recipient: input.recipient.trim(),
    scheduled_for: input.scheduledFor,
    status: "scheduled",
  };

  db.notificationSchedules.set(schedule.id, schedule);
  return schedule;
};

export const listNotificationSchedules = (ownerUserId: string) =>
  Array.from(db.notificationSchedules.values()).filter((item) => item.owner_user_id === ownerUserId);

export const listNotificationLogs = (ownerUserId: string) =>
  Array.from(db.notificationLogs.values()).filter((item) => item.owner_user_id === ownerUserId);

export const dispatchDueNotifications = async (ownerUserId: string, asOf: number): Promise<NotificationLog[]> => {
  const dueSchedules = Array.from(db.notificationSchedules.values()).filter(
    (item) =>
      item.owner_user_id === ownerUserId &&
      item.status === "scheduled" &&
      Date.parse(item.scheduled_for) <= asOf,
  );

  const dispatched: NotificationLog[] = [];

  for (const schedule of dueSchedules) {
    schedule.status = "sent";
    schedule.sent_at = now();
    db.notificationSchedules.set(schedule.id, schedule);

    const log: NotificationLog = {
      id: uid(),
      owner_user_id: ownerUserId,
      created_at: now(),
      schedule_id: schedule.id,
      template_id: schedule.template_id,
      channel: schedule.channel,
      recipient: schedule.recipient,
      status: "sent",
      dispatched_at: now(),
    };

    db.notificationLogs.set(log.id, log);
    dispatched.push(log);
  }

  return dispatched;
};
