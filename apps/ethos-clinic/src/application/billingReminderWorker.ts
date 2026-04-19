import { db } from "../infra/database";
import { persistMutation } from "../infra/persist";
import { whatsAppGetConnectionState, whatsAppSendText } from "../infra/whatsapp";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // every hour

function buildBillingMessage(values: {
  patient_name: string;
  amount: string;
  due_date: string;
  psychologist_name: string;
}): string {
  return `Olá ${values.patient_name}, lembramos que há uma cobrança de R$ ${values.amount} com vencimento em ${values.due_date}. Em caso de dúvidas, entre em contato com ${values.psychologist_name}.`;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDueDate(iso: string): string {
  const date = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return date.toLocaleDateString("pt-BR");
}

async function runBillingReminderCheck() {
  const whatsappCfg = db.whatsappConfig.get("config");
  if (!whatsappCfg?.enabled) return;

  const state = await whatsAppGetConnectionState();
  if (state !== "open") {
    process.stderr.write(`[billing-reminder] WhatsApp not connected (state: ${state}), skipping.\n`);
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let psychologistName = "sua psicóloga";
  for (const user of db.users.values()) {
    if (user.role === "admin" || user.role === "user") {
      psychologistName = user.name;
      break;
    }
  }

  for (const entry of db.financial.values()) {
    if (entry.status !== "open") continue;
    if (entry.reminder_sent_at) continue;

    const patient = db.patients.get(entry.patient_id);
    if (!patient) continue;

    const reminderDays = patient.billing?.billing_reminder_days;
    if (!reminderDays || reminderDays <= 0) continue;

    const dueDate = new Date(entry.due_date.length === 10 ? entry.due_date + "T12:00:00" : entry.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    if (daysUntilDue < 0 || daysUntilDue > reminderDays) continue;

    const phone = patient.whatsapp || patient.phone;
    if (!phone) {
      process.stderr.write(`[billing-reminder] Patient ${patient.id} has no phone, skipping.\n`);
      continue;
    }

    const message = buildBillingMessage({
      patient_name: patient.label || patient.external_id || "Paciente",
      amount: formatCurrency(entry.amount),
      due_date: formatDueDate(entry.due_date),
      psychologist_name: psychologistName,
    });

    const result = await whatsAppSendText(phone, message);

    if (result.ok) {
      entry.reminder_sent_at = new Date().toISOString();
      persistMutation();
      process.stdout.write(`[billing-reminder] Sent reminder to patient ${patient.id} for entry ${entry.id}.\n`);
    } else {
      process.stderr.write(`[billing-reminder] Failed to send reminder to patient ${patient.id}: ${result.error}\n`);
    }
  }
}

export function startBillingReminderWorker() {
  void runBillingReminderCheck();
  setInterval(() => { void runBillingReminderCheck(); }, CHECK_INTERVAL_MS);
  process.stdout.write(`[billing-reminder] Worker started. Checking every ${CHECK_INTERVAL_MS / 60000} minutes.\n`);
}
