import type { ClinicalSession, NotificationChannel, NotificationConsent, NotificationLog, NotificationSchedule, NotificationTemplate } from "../domain/types";
import { db, uid } from "../infra/database";

const now = () => new Date().toISOString();
const DEFAULT_DISPATCH_INTERVAL_MS = 60_000;

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const renderTemplate = (template: NotificationTemplate, context: Record<string, string>) =>
  template.content.replace(/\{([\w_]+)\}/g, (_, key: string) => context[key] ?? "");

const buildWhatsAppUrl = (recipient: string, message: string) => {
  const phone = normalizePhone(recipient);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const buildNotificationContext = (session: ClinicalSession, recipient: string) => {
  const patient = db.patients.get(session.patient_id);
  const sessionDate = new Date(session.scheduled_at);
  return {
    patient_name: patient?.label || patient?.external_id || "Paciente",
    session_date: sessionDate.toLocaleDateString("pt-BR"),
    session_time: sessionDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    recipient,
  };
};

const dispatchViaWebhook = async (url: string, payload: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text().catch(() => "");
  return {
    ok: response.ok,
    status: response.status,
    body: text,
  };
};

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
    const template = db.notificationTemplates.get(schedule.template_id);
    const session = db.sessions.get(schedule.session_id);
    const dispatchedAt = now();

    if (!template || !session) {
      schedule.status = "failed";
      schedule.sent_at = dispatchedAt;
      db.notificationSchedules.set(schedule.id, schedule);

      const log: NotificationLog = {
        id: uid(),
        owner_user_id: ownerUserId,
        created_at: dispatchedAt,
        schedule_id: schedule.id,
        template_id: schedule.template_id,
        channel: schedule.channel,
        recipient: schedule.recipient,
        status: "failed",
        dispatched_at: dispatchedAt,
        reason: !template ? "TEMPLATE_NOT_FOUND" : "SESSION_NOT_FOUND",
      };

      db.notificationLogs.set(log.id, log);
      dispatched.push(log);
      continue;
    }

    const context = buildNotificationContext(session, schedule.recipient);
    const message = renderTemplate(template, context);
    const subject = template.subject
      ? renderTemplate({ ...template, content: template.subject }, context)
      : undefined;

    let status: NotificationLog["status"] = "sent";
    let reason: string | undefined;
    let deliveryUrl: string | undefined;
    let providerResponse: string | undefined;

    try {
      if (schedule.channel === "whatsapp") {
        const webhookUrl = process.env.ETHOS_WHATSAPP_WEBHOOK_URL;
        deliveryUrl = buildWhatsAppUrl(schedule.recipient, message) ?? undefined;

        if (webhookUrl) {
          const response = await dispatchViaWebhook(webhookUrl, {
            owner_user_id: ownerUserId,
            schedule_id: schedule.id,
            template_id: schedule.template_id,
            recipient: schedule.recipient,
            channel: schedule.channel,
            subject,
            message,
            delivery_url: deliveryUrl,
          });

          status = response.ok ? "sent" : "failed";
          reason = response.ok ? undefined : `WHATSAPP_PROVIDER_${response.status}`;
          providerResponse = response.body || undefined;
        } else if (!deliveryUrl) {
          status = "failed";
          reason = "WHATSAPP_RECIPIENT_INVALID";
        } else {
          reason = "WHATSAPP_PROVIDER_NOT_CONFIGURED";
        }
      } else if (schedule.channel === "email") {
        const webhookUrl = process.env.ETHOS_EMAIL_WEBHOOK_URL;
        if (webhookUrl) {
          const response = await dispatchViaWebhook(webhookUrl, {
            owner_user_id: ownerUserId,
            schedule_id: schedule.id,
            template_id: schedule.template_id,
            recipient: schedule.recipient,
            channel: schedule.channel,
            subject,
            message,
          });

          status = response.ok ? "sent" : "failed";
          reason = response.ok ? undefined : `EMAIL_PROVIDER_${response.status}`;
          providerResponse = response.body || undefined;
        } else {
          reason = "EMAIL_PROVIDER_NOT_CONFIGURED";
        }
      }
    } catch (error) {
      status = "failed";
      reason = error instanceof Error ? error.message : "DISPATCH_FAILED";
    }

    schedule.status = status;
    schedule.sent_at = dispatchedAt;
    db.notificationSchedules.set(schedule.id, schedule);

    const log: NotificationLog = {
      id: uid(),
      owner_user_id: ownerUserId,
      created_at: dispatchedAt,
      schedule_id: schedule.id,
      template_id: schedule.template_id,
      channel: schedule.channel,
      recipient: schedule.recipient,
      status,
      dispatched_at: dispatchedAt,
      reason,
      subject,
      message,
      delivery_url: deliveryUrl,
      provider_response: providerResponse,
    };

    db.notificationLogs.set(log.id, log);
    dispatched.push(log);
  }

  return dispatched;
};

export const dispatchAllDueNotifications = async (asOf: number): Promise<NotificationLog[]> => {
  const owners = Array.from(
    new Set(Array.from(db.notificationSchedules.values()).map((item) => item.owner_user_id)),
  );

  const logs: NotificationLog[] = [];
  for (const ownerUserId of owners) {
    logs.push(...(await dispatchDueNotifications(ownerUserId, asOf)));
  }
  return logs;
};

export const startNotificationDispatcher = (
  intervalMs = Number(process.env.ETHOS_NOTIFICATION_DISPATCH_INTERVAL_MS ?? DEFAULT_DISPATCH_INTERVAL_MS),
) => {
  const timer = setInterval(() => {
    void dispatchAllDueNotifications(Date.now()).catch((error) => {
      process.stderr.write(`[notifications] dispatcher failed: ${String(error)}\n`);
    });
  }, intervalMs);

  timer.unref?.();
  return timer;
};
