import type { FinancialEntry } from "@/services/financeService";
import type { HomeworkTask } from "@/services/homeworkService";
import type { Patient, PatientDetail } from "@/services/patientService";
import type { ScaleRecord } from "@/services/scaleService";
import type { Session } from "@/services/sessionService";
import type { SupervisionNote } from "@/services/supervisionNotesService";

export interface PreSessionBriefing {
  patientId: string;
  patientName: string;
  sessionId?: string;
  sessionAt?: string;
  mainComplaint: string;
  clinicalEvolution: string;
  supervisionHighlights: Array<{
    id: string;
    title: string;
    content: string;
    focus?: string;
    nextSessionPrompt?: string;
    priority: SupervisionNote["priority"];
    pinned: boolean;
    tags: string[];
  }>;
  tasks: Array<{ id: string; title: string; dueDate?: string; completed?: boolean }>;
  scaleHighlights: Array<{ id: string; scaleId: string; score: number; appliedAt: string }>;
  adminAlerts: string[];
  checklist: string[];
}

export interface PreSessionNotificationTimer {
  id: string;
  clear: () => void;
}

const MAX_NOTIFICATION_DELAY_MS = 2_147_483_647;

const getSessionAt = (session?: Session | PatientDetail["summary"]["next_session"] | null) => {
  if (!session) return "";
  if ("scheduled_at" in session && session.scheduled_at) return session.scheduled_at;
  if ("date" in session && "time" in session && session.date && session.time) return `${session.date}T${session.time}:00`;
  return "";
};

export const formatPreSessionDate = (value?: string) => {
  if (!value) return "Sem proxima sessao registrada";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function buildPreSessionBriefing(input: {
  patient: Patient;
  session?: Session | PatientDetail["summary"]["next_session"] | null;
  mainComplaint?: string;
  clinicalEvolution?: string;
  supervisionNotes?: SupervisionNote[];
  tasks?: HomeworkTask[];
  scaleRecords?: ScaleRecord[];
  financialEntries?: FinancialEntry[];
}): PreSessionBriefing {
  const sessionAt = getSessionAt(input.session);
  const openTasks = (input.tasks ?? [])
    .filter((task) => !task.completed)
    .slice(0, 5)
    .map((task) => ({ id: task.id, title: task.title, dueDate: task.due_date, completed: task.completed }));
  const scaleHighlights = [...(input.scaleRecords ?? [])]
    .sort((a, b) => Date.parse(b.applied_at) - Date.parse(a.applied_at))
    .slice(0, 3)
    .map((record) => ({ id: record.id, scaleId: record.scale_id, score: record.score, appliedAt: record.applied_at }));
  const supervisionHighlights = [...(input.supervisionNotes ?? [])]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.priority === "high") - Number(a.priority === "high") || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 5)
    .map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      focus: note.focus,
      nextSessionPrompt: note.nextSessionPrompt,
      priority: note.priority,
      pinned: note.pinned,
      tags: note.tags,
    }));
  const adminAlerts = (input.financialEntries ?? [])
    .filter((entry) => entry.status === "open")
    .slice(0, 3)
    .map((entry) => `Pagamento em aberto${entry.due_date ? ` com vencimento em ${formatPreSessionDate(entry.due_date)}` : ""}.`);

  return {
    patientId: input.patient.id,
    patientName: input.patient.name,
    sessionId: input.session?.id,
    sessionAt,
    mainComplaint: input.mainComplaint?.trim() || input.patient.main_complaint?.trim() || "",
    clinicalEvolution: input.clinicalEvolution?.trim() || input.patient.notes?.trim() || "",
    supervisionHighlights,
    tasks: openTasks,
    scaleHighlights,
    adminAlerts,
    checklist: [
      "Revisar queixa principal e objetivo atual.",
      "Checar evolucao recente sem fechar diagnostico automaticamente.",
      "Rever anotacoes de supervisao fixadas ou de alta prioridade.",
      "Confirmar tarefas, escalas ou pendencias relevantes para a sessao.",
      "Definir uma pergunta de abertura e um foco flexivel para o encontro.",
    ],
  };
}

export function formatPreSessionBriefingText(briefing: PreSessionBriefing) {
  const supervision = briefing.supervisionHighlights.length
    ? briefing.supervisionHighlights
        .map((note, index) => {
          const prompt = note.nextSessionPrompt ? `\n   Levar para a sessao: ${note.nextSessionPrompt}` : "";
          return `${index + 1}. ${note.title}: ${note.content}${prompt}`;
        })
        .join("\n")
    : "Sem anotacoes de supervisao registradas.";
  const tasks = briefing.tasks.length
    ? briefing.tasks.map((task) => `- ${task.title}${task.dueDate ? ` (ate ${task.dueDate})` : ""}`).join("\n")
    : "- Sem tarefas pendentes registradas.";
  const scales = briefing.scaleHighlights.length
    ? briefing.scaleHighlights.map((scale) => `- ${scale.scaleId}: ${scale.score} (${formatPreSessionDate(scale.appliedAt)})`).join("\n")
    : "- Sem escalas recentes registradas.";

  return [
    `Briefing pre-sessao - ${briefing.patientName}`,
    `Proxima sessao: ${formatPreSessionDate(briefing.sessionAt)}`,
    "",
    `Queixa principal: ${briefing.mainComplaint || "Nao registrada."}`,
    "",
    `Evolucao clinica: ${briefing.clinicalEvolution || "Sem sintese registrada."}`,
    "",
    "Anotacoes de supervisao:",
    supervision,
    "",
    "Tarefas pendentes:",
    tasks,
    "",
    "Escalas recentes:",
    scales,
    "",
    "Alertas administrativos:",
    briefing.adminAlerts.length ? briefing.adminAlerts.map((alert) => `- ${alert}`).join("\n") : "- Sem alertas administrativos relevantes.",
    "",
    "Checklist conservador:",
    briefing.checklist.map((item) => `- ${item}`).join("\n"),
  ].join("\n");
}

export async function notifyPreSessionBriefing(
  briefing: PreSessionBriefing,
  options?: { requireInteraction?: boolean; onClick?: () => void },
) {
  if (!("Notification" in window)) return { ok: false, reason: "unsupported" as const };

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "permission" as const };

  const firstSupervision = briefing.supervisionHighlights.find((note) => note.pinned || note.priority === "high") ?? briefing.supervisionHighlights[0];
  const notification = new Notification(`Preparar sessao - ${briefing.patientName}`, {
    body: [
      briefing.sessionAt ? `Horario: ${formatPreSessionDate(briefing.sessionAt)}` : "",
      briefing.mainComplaint ? `Queixa: ${briefing.mainComplaint}` : "",
      firstSupervision?.nextSessionPrompt ? `Supervisao: ${firstSupervision.nextSessionPrompt}` : firstSupervision?.content ? `Supervisao: ${firstSupervision.content}` : "",
    ].filter(Boolean).join("\n").slice(0, 260),
    tag: `ethos-pre-session-${briefing.patientId}-${briefing.sessionId ?? "manual"}`,
    requireInteraction: options?.requireInteraction,
  });

  if (options?.onClick) notification.onclick = options.onClick;
  return { ok: true as const };
}

export function schedulePreSessionNotifications(input: {
  briefings: PreSessionBriefing[];
  minutesBeforeSession: number;
  enabled: boolean;
  onClick?: (briefing: PreSessionBriefing) => void;
}) {
  if (!input.enabled) return [] as PreSessionNotificationTimer[];

  return input.briefings.flatMap((briefing) => {
    if (!briefing.sessionAt) return [];
    const targetMs = new Date(briefing.sessionAt).getTime() - input.minutesBeforeSession * 60_000;
    const delay = targetMs - Date.now();
    if (!Number.isFinite(delay) || delay <= 0 || delay > MAX_NOTIFICATION_DELAY_MS) return [];
    const timer = window.setTimeout(() => {
      void notifyPreSessionBriefing(briefing, { onClick: () => input.onClick?.(briefing) });
    }, delay);
    return [{ id: `${briefing.patientId}-${briefing.sessionId ?? briefing.sessionAt}`, clear: () => window.clearTimeout(timer) }];
  });
}
