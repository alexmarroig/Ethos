import { db } from "../infra/database";
import { whatsAppGetConnectionState, whatsAppSendText } from "../infra/whatsapp";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

function buildMessage(
  template: string,
  values: {
    patient_name: string;
    session_date: string;
    session_time: string;
    psychologist_name: string;
  },
): string {
  return [
    ["{patient_name}", values.patient_name],
    ["{session_date}", values.session_date],
    ["{session_time}", values.session_time],
    ["{psychologist_name}", values.psychologist_name],
  ].reduce((current, [token, replacement]) => current.split(token).join(replacement), template);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function runReminderCheck() {
  const whatsappCfg = db.whatsappConfig.get("config");
  if (!whatsappCfg?.enabled) return;

  const reminderCfg = db.sessionReminderConfig.get("config");
  if (!reminderCfg?.enabled) return;

  // Only send if WhatsApp is actually connected
  const state = await whatsAppGetConnectionState();
  if (state !== "open") {
    process.stderr.write(`[session-reminder] WhatsApp not connected (state: ${state}), skipping.\n`);
    return;
  }

  const now = Date.now();
  const windowMs = reminderCfg.hoursBeforeSession * 60 * 60 * 1000;
  const template = reminderCfg.template;

  // Find the psychologist name (owner of sessions)
  let psychologistName = "sua psicóloga";
  for (const user of db.users.values()) {
    if (user.role === "admin" || user.role === "user") {
      psychologistName = user.name;
      break;
    }
  }

  for (const session of db.sessions.values()) {
    if (session.status !== "scheduled") continue;
    if (!session.scheduled_at) continue;

    const sessionTime = new Date(session.scheduled_at).getTime();
    const hoursUntil = (sessionTime - now) / (60 * 60 * 1000);

    // Within the reminder window: between 0 and hoursBeforeSession hours from now
    if (hoursUntil <= 0 || hoursUntil > reminderCfg.hoursBeforeSession) continue;

    const patientId = session.patient_id;

    // Check if patient has reminders enabled
    if (!db.patientSessionReminderEnabled.get(patientId)) continue;

    // Check if reminder already sent for this session
    const reminderKey = session.id;
    if (db.sentSessionReminders.has(reminderKey)) continue;

    const patient = db.patients.get(patientId);
    if (!patient) continue;

    const phone = patient.whatsapp || patient.phone;
    if (!phone) {
      process.stderr.write(`[session-reminder] Patient ${patientId} has no phone, skipping.\n`);
      continue;
    }

    const message = buildMessage(template, {
      patient_name: patient.label || patient.external_id || "Paciente",
      session_date: formatDate(session.scheduled_at),
      session_time: formatTime(session.scheduled_at),
      psychologist_name: psychologistName,
    });

    const result = await whatsAppSendText(phone, message);

    if (result.ok) {
      db.sentSessionReminders.add(reminderKey);
      process.stdout.write(`[session-reminder] Sent reminder to patient ${patientId} for session ${session.id}.\n`);
    } else {
      process.stderr.write(`[session-reminder] Failed to send reminder to patient ${patientId}: ${result.error}\n`);
    }
  }
}

export function startSessionReminderWorker() {
  // Run immediately on start, then every CHECK_INTERVAL_MS
  void runReminderCheck();
  setInterval(() => { void runReminderCheck(); }, CHECK_INTERVAL_MS);
  process.stdout.write(`[session-reminder] Worker started. Checking every ${CHECK_INTERVAL_MS / 60000} minutes.\n`);
}
