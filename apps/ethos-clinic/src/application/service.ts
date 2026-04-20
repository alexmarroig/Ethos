import crypto from "node:crypto";
import { db, encrypt, hashInviteToken, hashPassword, schedulePersistDatabase, seeds, uid, verifyPassword } from "../infra/database";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  detectAnomalousBehavior,
  detectBottlenecks,
  predictFailureRisk,
  suggestRootCauseFromLogs,
  type ErrorLog,
  type PerformanceSample,
} from "./aiObservability";
import {
  formatClinicalNoteContent,
  normalizeClinicalNoteStructuredData,
  parseLegacyClinicalNoteContent,
} from "./clinicalNoteDocument";
import {
  generateClinicalNote,
} from "./ai/clinicalNoteGenerator";
import type {
  AnamnesisResponse,
  AvailabilityBlock,
  FormTemplate,
  ClinicalDocument,
  ClinicalNoteStructuredData,
  ClinicalDocumentVersion,
  ClinicalNote,
  ClinicalReport,
  ClinicalSession,
  DocumentTemplate,
  EmotionalDiaryEntry,
  FinancialEntry,
  FormEntry,
  FormAssignment,
  FormAssignmentMode,
  GoalMilestone,
  GoalStatus,
  HomeworkTask,
  Job,
  JobStatus,
  JobType,
  LocalEntitlementSnapshot,
  NotificationPreview,
  ObservabilityAlert,
  Patient,
  PatientBilling,
  PatientNotification,
  PatientTimelineItem,
  ScaleRecord,
  SessionStatus,
  SlotRequest,
  TelemetryEvent,
  TherapeuticGoal,
  Transcript,
  User,
  CalendarSuggestion,
  RecurrenceRule,
} from "../domain/types";

const now = seeds.now;
const DAY_MS = 86_400_000;

const dayOfWeekName = (iso: string): "monday" | "tuesday" | "wednesday" | "thursday" | "friday" => {
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  return names[new Date(iso).getDay()] as "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
};

const timeOfDay = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const modeOf = <T>(arr: T[]): T | undefined => {
  if (!arr.length) return undefined;
  const counts = new Map<string, number>();
  for (const v of arr) {
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: T | undefined;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = arr.find((v) => String(v) === key);
    }
  }
  return best;
};
const persistMutation = () => schedulePersistDatabase();
const passwordResetTokens = new Map<string, { userId: string; expiresAt: number }>();
const decryptPath = (value: string) =>
  value.startsWith("enc:") ? Buffer.from(value.slice(4), "base64").toString("utf8") : value;

const resolvePythonPath = () => process.env.ETHOS_PYTHON_PATH ?? (process.platform === "win32" ? "python" : "python3");
const resolveWhisperModelPath = () => {
  const modelsRoot = process.env.ETHOS_MODELS_PATH ?? path.resolve(__dirname, "../../../ethos-transcriber/models");
  const localModelPath = path.join(modelsRoot, "large-v3-ct2");
  return localModelPath;
};

const runWhisperLocally = async (audioPath: string) => {
  const pythonPath = resolvePythonPath();
  const scriptPath = path.resolve(__dirname, "../../../ethos-transcriber/scripts/whisper_transcribe.py");
  const outputPath = path.join(os.tmpdir(), `ethos-transcript-${crypto.randomUUID()}.json`);
  const configuredModelPath = resolveWhisperModelPath();
  const modelPath = await fs.stat(configuredModelPath).then(() => configuredModelPath).catch(() =>
    process.env.ETHOS_WHISPER_MODEL || "small"
  );

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(pythonPath, [
      scriptPath,
      "--audio", audioPath,
      "--model", modelPath,
      "--output", outputPath,
    ]);

    proc.stdout.on("data", (chunk) => {
      process.stdout.write(`[whisper] ${chunk}`);
    });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      const message = chunk.toString();
      stderr += message;
      process.stderr.write(message);
    });
    proc.on("error", reject);
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error(`Whisper timeout after 300000ms (model=${modelPath})`));
    }, 300_000);
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(stderr || `whisper failed with code ${code}`));
    });
  });

  const raw = await fs.readFile(outputPath, "utf8");
  await fs.unlink(outputPath).catch(() => {});
  return JSON.parse(raw) as {
    full_text?: string;
    segments?: Array<{ start?: number; end?: number; text?: string }>;
  };
};

const stripHtml = (value: string) =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h1|h2|h3|li|section|br)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const runPdfGenerator = async (payload: { title: string; subtitle?: string; sections: Array<{ heading: string; paragraphs: string[] }> }) => {
  const pythonPath = resolvePythonPath();
  const scriptPath = path.resolve(__dirname, "../../scripts/generate_pdf.py");
  const inputPath = path.join(os.tmpdir(), `ethos-pdf-input-${crypto.randomUUID()}.json`);
  const outputPath = path.join(os.tmpdir(), `ethos-export-${crypto.randomUUID()}.pdf`);

  await fs.writeFile(inputPath, JSON.stringify(payload, null, 2), "utf8");

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(pythonPath, [scriptPath, "--input", inputPath, "--output", outputPath]);
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `pdf generator failed with code ${code}`));
    });
  });

  const base64 = await fs.readFile(outputPath, { encoding: "base64" });
  await fs.unlink(inputPath).catch(() => {});
  await fs.unlink(outputPath).catch(() => {});
  return `data:application/pdf;base64,${base64}`;
};

const grantClinicalEntitlements = (userId: string) => {
  db.localEntitlements.set(userId, {
    user_id: userId,
    entitlements: {
      exports_enabled: true,
      backup_enabled: true,
      forms_enabled: true,
      scales_enabled: true,
      finance_enabled: true,
      transcription_minutes_per_month: 3000,
      max_patients: 2000,
      max_sessions_per_month: 2000,
    },
    source_subscription_status: "active",
    last_entitlements_sync_at: now(),
    last_successful_subscription_validation_at: now(),
  });
};

const sanitizeAuthUser = (user: User) => {
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const createSessionForUser = (user: User) => {
  const token = crypto.randomBytes(24).toString("hex");
  db.sessionsTokens.set(token, {
    token,
    user_id: user.id,
    created_at: now(),
    expires_at: new Date(Date.now() + DAY_MS).toISOString(),
  });
  user.last_seen_at = now();
  persistMutation();
  return { user: sanitizeAuthUser(user), token };
};

export const addAudit = (actorUserId: string, event: string, targetUserId?: string) => {
  const id = uid();
  db.audit.set(id, { id, actor_user_id: actorUserId, event, target_user_id: targetUserId, ts: now() });
  persistMutation();
};

export const addTelemetry = (event: Omit<TelemetryEvent, "id" | "ts">) => {
  const item: TelemetryEvent = { id: uid(), ts: now(), ...event };
  db.telemetry.set(item.id, item);
  const owner = event.user_id ?? "anonymous";
  const queue = db.telemetryQueue.get(owner) ?? [];
  queue.push(item);
  db.telemetryQueue.set(owner, queue);
  persistMutation();
  return item;
};

export const flushTelemetryQueue = (owner: string) => {
  const queue = db.telemetryQueue.get(owner) ?? [];
  db.telemetryQueue.set(owner, []);
  return queue;
};



const observabilityState = {
  performanceSamples: [] as PerformanceSample[],
  errorLogs: [] as ErrorLog[],
};

const upsertObservabilityAlert = (payload: Omit<ObservabilityAlert, "id" | "first_seen_at" | "last_seen_at" | "occurrences"> & { seenAt?: string }) => {
  const seenAt = payload.seenAt ?? now();
  const existing = Array.from(db.observabilityAlerts.values()).find((alert) => alert.fingerprint === payload.fingerprint);
  if (existing) {
    existing.last_seen_at = seenAt;
    existing.occurrences += 1;
    existing.context = payload.context;
    existing.message = payload.message;
    return existing;
  }

  const created: ObservabilityAlert = {
    id: uid(),
    source: payload.source,
    severity: payload.severity,
    title: payload.title,
    message: payload.message,
    fingerprint: payload.fingerprint,
    first_seen_at: seenAt,
    last_seen_at: seenAt,
    occurrences: 1,
    context: payload.context,
  };
  db.observabilityAlerts.set(created.id, created);
  return created;
};

export const ingestPerformanceSample = (sample: PerformanceSample) => {
  observabilityState.performanceSamples.push(sample);
  if (observabilityState.performanceSamples.length > 500) observabilityState.performanceSamples.shift();
  return evaluateObservability();
};

export const ingestErrorLog = (log: ErrorLog) => {
  observabilityState.errorLogs.push(log);
  if (observabilityState.errorLogs.length > 500) observabilityState.errorLogs.shift();
  return evaluateObservability();
};

export const evaluateObservability = () => {
  const createdOrUpdated: ObservabilityAlert[] = [];
  const samples = observabilityState.performanceSamples;
  const logs = observabilityState.errorLogs;

  for (const alert of detectBottlenecks(samples)) {
    createdOrUpdated.push(upsertObservabilityAlert({
      source: "detectBottlenecks",
      severity: alert.severity,
      title: `Bottleneck em ${alert.metric}`,
      message: alert.message,
      fingerprint: `bottleneck:${alert.metric}:${alert.severity}`,
      context: { metric: alert.metric },
    }));
  }

  const risk = predictFailureRisk(samples);
  if (risk.riskLevel !== "low") {
    createdOrUpdated.push(upsertObservabilityAlert({
      source: "predictFailureRisk",
      severity: risk.riskLevel,
      title: "Risco de falha previsto",
      message: `${risk.reason} (score=${risk.riskScore.toFixed(2)})`,
      fingerprint: `failure-risk:${risk.riskLevel}`,
      context: risk,
    }));
  }

  for (const anomaly of detectAnomalousBehavior(samples)) {
    createdOrUpdated.push(upsertObservabilityAlert({
      source: "detectAnomalousBehavior",
      severity: "medium",
      title: "Comportamento anômalo",
      message: `${anomaly.probableCause}. ${anomaly.suggestedAction}`,
      fingerprint: `anomaly:${anomaly.timestamp}:${anomaly.probableCause}`,
      context: anomaly,
    }));
  }

  if (logs.length > 0) {
    const suggestion = suggestRootCauseFromLogs(logs.slice(-20));
    if (!suggestion.toLowerCase().includes("não conclusiva")) {
      createdOrUpdated.push(upsertObservabilityAlert({
        source: "suggestRootCauseFromLogs",
        severity: "medium",
        title: "Hipótese de causa raiz",
        message: suggestion,
        fingerprint: `root-cause:${suggestion.toLowerCase()}`,
        context: { based_on_logs: logs.slice(-5) },
      }));
    }
  }

  return createdOrUpdated;
};

export const listObservabilityAlerts = () =>
  Array.from(db.observabilityAlerts.values()).sort((a, b) => Date.parse(b.last_seen_at) - Date.parse(a.last_seen_at));

export const createInvite = (email: string) => {
  const token = crypto.randomBytes(24).toString("hex");
  const invite = {
    id: uid(),
    email,
    token_hash: hashInviteToken(token),
    expires_at: new Date(Date.now() + DAY_MS).toISOString(),
    created_at: now(),
  };
  db.invites.set(invite.id, invite);
  persistMutation();
  return { invite, token };
};

export const acceptInvite = (token: string, name: string, password: string) => {
  const tokenHash = hashInviteToken(token);
  const invite = Array.from(db.invites.values()).find((entry) => entry.token_hash === tokenHash && !entry.used_at);
  if (!invite || Date.parse(invite.expires_at) < Date.now()) return null;

  invite.used_at = now();
  const user: User = {
    id: uid(),
    email: invite.email,
    name,
    password_hash: hashPassword(password),
    role: "user",
    status: "active",
    created_at: now(),
  };
  db.users.set(user.id, user);
  grantClinicalEntitlements(user.id);
  persistMutation();
  return user;
};

export const registerClinician = (input: {
  email: string;
  name: string;
  password: string;
  avatar_url?: string;
  crp?: string;
  specialty?: string;
  clinical_approach?: string;
  accepted_ethics?: boolean;
}) => {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password;

  if (!input.accepted_ethics || !email || !name || !password) return null;
  const existing = Array.from(db.users.values()).find((entry) => entry.email.toLowerCase() === email);
  if (existing) return null;

  const user: User = {
    id: uid(),
    email,
    name,
    password_hash: hashPassword(password),
    avatar_url: input.avatar_url?.trim() || undefined,
    crp: input.crp?.trim() || undefined,
    specialty: input.specialty?.trim() || undefined,
    clinical_approach: input.clinical_approach?.trim() || undefined,
    accepted_ethics_at: now(),
    role: "user",
    status: "active",
    created_at: now(),
  };

  db.users.set(user.id, user);
  grantClinicalEntitlements(user.id);
  return createSessionForUser(user);
};

export const updateOwnProfile = (
  userId: string,
  input: Partial<{
    name: string;
    email: string;
    avatar_url?: string;
    crp?: string;
    rg?: string;
    cpf?: string;
    gender?: "F" | "M";
    specialty?: string;
    clinical_approach?: string;
  }>
) => {
  const user = db.users.get(userId);
  if (!user) return null;

  if (typeof input.name === "string" && input.name.trim()) user.name = input.name.trim();
  if (typeof input.email === "string" && input.email.trim()) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = Array.from(db.users.values()).find(
      (entry) => entry.id !== userId && entry.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      throw new Error("EMAIL_IN_USE");
    }
    user.email = normalizedEmail;
  }
  if ("avatar_url" in input) user.avatar_url = input.avatar_url?.trim() || undefined;
  if ("crp" in input) user.crp = input.crp?.trim() || undefined;
  if ("rg" in input) user.rg = input.rg?.trim() || undefined;
  if ("cpf" in input) user.cpf = input.cpf?.trim() || undefined;
  if ("gender" in input) user.gender = input.gender || undefined;
  if ("specialty" in input) user.specialty = input.specialty?.trim() || undefined;
  if ("clinical_approach" in input) user.clinical_approach = input.clinical_approach?.trim() || undefined;

  user.last_seen_at = now();
  persistMutation();
  return sanitizeAuthUser(user);
};

export const login = (email: string, password: string) => {
  const user = Array.from(db.users.values()).find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user || user.status !== "active" || !user.password_hash || !verifyPassword(password, user.password_hash)) return null;
  return createSessionForUser(user);
};

export const getUserFromToken = (token: string) => {
  const session = db.sessionsTokens.get(token);
  if (!session || Date.parse(session.expires_at) < Date.now()) return null;
  return db.users.get(session.user_id) ?? null;
};

export const logout = (token: string) => {
  const removed = db.sessionsTokens.delete(token);
  if (removed) persistMutation();
  return removed;
};

export const requestPasswordReset = (email: string) => {
  const user = Array.from(db.users.values()).find((entry) => entry.email.toLowerCase() === email.trim().toLowerCase());
  const token = crypto.randomBytes(24).toString("hex");

  if (user) {
    passwordResetTokens.set(token, {
      userId: user.id,
      expiresAt: Date.now() + DAY_MS,
    });
  }

  return {
    message: "Se o email existir, enviaremos um link de recuperação.",
    reset_token: token,
    reset_url: `/reset-password?token=${token}`,
  };
};

export const resetPasswordWithToken = (token: string, password: string) => {
  const entry = passwordResetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) return null;

  const user = db.users.get(entry.userId);
  if (!user) return null;

  user.password_hash = hashPassword(password);
  user.last_seen_at = now();
  passwordResetTokens.delete(token);
  persistMutation();
  return { message: "Senha redefinida com sucesso." };
};

export const getByOwner = <T extends { owner_user_id: string; id: string }>(map: Map<string, T>, owner: string, id: string) => {
  const item = map.get(id);
  return item?.owner_user_id === owner ? item : null;
};

const byOwner = <T extends { owner_user_id: string }>(list: Iterable<T>, owner: string) => Array.from(list).filter((item) => item.owner_user_id === owner);

type PatientAccessPermissions = {
  scales: boolean;
  diary: boolean;
  session_confirmation: boolean;
  async_messages_per_day: number;
};

type PatientAccess = {
  id: string;
  owner_user_id: string;
  patient_user_id: string;
  patient_id: string;
  patient_email?: string;
  patient_name?: string;
  permissions: PatientAccessPermissions;
  created_at: string;
  updated_at?: string;
  last_credentials_reset_at?: string;
  last_email_delivery_status?: "sent" | "skipped" | "failed";
  last_email_delivery_detail?: string;
};

type EmotionalDiaryEntryInput = {
  date?: string;
  mood: EmotionalDiaryEntry["mood"];
  intensity: number;
  description?: string;
  thoughts?: string;
  tags?: string[];
};

type Contract = {
  id: string;
  owner_user_id: string;
  patient_id: string;
  template_id?: string;
  title?: string;
  content?: string;
  psychologist: { name: string; license: string; email: string; phone?: string };
  patient: { name: string; email: string; document: string; address?: string };
  terms: { value: string; periodicity: string; absence_policy: string; payment_method: string };
  status: "draft" | "sent" | "accepted";
  portal_token?: string;
  accepted_by?: string;
  accepted_at?: string;
  accepted_ip?: string;
  signed_file?: {
    file_name: string;
    mime_type: string;
    data_url: string;
    uploaded_at: string;
  };
  created_at: string;
  updated_at: string;
};

const normalizeStoredText = (value?: string) =>
  value
    ? [
        ["ÃƒÆ’Ã‚Â£", "ã"],
        ["ÃƒÂ£", "ã"],
        ["Ã§", "ç"],
        ["Ã£", "ã"],
        ["Ã¡", "á"],
        ["Ã¢", "â"],
        ["Ãª", "ê"],
        ["Ã©", "é"],
        ["Ã­", "í"],
        ["Ã³", "ó"],
        ["Ãº", "ú"],
        ["Ãµ", "õ"],
        ["Ã", "à"],
        ["Â", ""],
        ["Sess?o", "Sessão"],
        ["Pr?xima", "Próxima"],
        ["dispon?vel", "disponível"],
      ].reduce((acc, [from, to]) => acc.split(from).join(to), value)
    : value;

const normalizeContractRecord = (contract: Contract) => {
  let changed = false;
  const apply = (next?: string) => {
    const normalized = normalizeStoredText(next);
    if (normalized !== next) changed = true;
    return normalized;
  };

  contract.title = apply(contract.title) ?? contract.title;
  contract.content = apply(contract.content) ?? contract.content;
  contract.psychologist = {
    ...contract.psychologist,
    name: apply(contract.psychologist.name) ?? contract.psychologist.name,
    license: apply(contract.psychologist.license) ?? contract.psychologist.license,
    email: apply(contract.psychologist.email) ?? contract.psychologist.email,
    phone: apply(contract.psychologist.phone),
  };
  contract.patient = {
    ...contract.patient,
    name: apply(contract.patient.name) ?? contract.patient.name,
    email: apply(contract.patient.email) ?? contract.patient.email,
    document: apply(contract.patient.document) ?? contract.patient.document,
    address: apply(contract.patient.address),
  };
  contract.terms = {
    ...contract.terms,
    value: apply(contract.terms.value) ?? contract.terms.value,
    periodicity: apply(contract.terms.periodicity) ?? contract.terms.periodicity,
    absence_policy: apply(contract.terms.absence_policy) ?? contract.terms.absence_policy,
    payment_method: apply(contract.terms.payment_method) ?? contract.terms.payment_method,
  };

  return changed;
};

const migrateLegacyContractText = () => {
  let changed = false;
  for (const contract of db.contracts.values() as Iterable<Contract>) {
    if (normalizeContractRecord(contract)) changed = true;
  }
  for (const template of db.documentTemplates.values()) {
    if (template.kind !== "contract") continue;
    const nextTitle = normalizeStoredText(template.title);
    const nextDescription = normalizeStoredText(template.description);
    const nextHtml = normalizeStoredText(template.html);
    if (nextTitle !== template.title) {
      template.title = nextTitle ?? template.title;
      changed = true;
    }
    if (nextDescription !== template.description) {
      template.description = nextDescription;
      changed = true;
    }
    if (nextHtml !== template.html) {
      template.html = nextHtml ?? template.html;
      changed = true;
    }
  }
  if (changed) persistMutation();
};

type RetentionPolicy = {
  owner_user_id: string;
  clinical_record_days: number;
  audit_days: number;
  export_days: number;
};

type PatientSummary = {
  total_sessions: number;
  next_session: ClinicalSession | null;
  last_session: ClinicalSession | null;
};

type PatientUpsertInput = {
  name: string;
  care_status?: "active" | "paused" | "transferred" | "inactive";
  email?: string;
  phone?: string;
  whatsapp?: string;
  birth_date?: string;
  address?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  cpf?: string;
  profession?: string;
  referral_source?: string;
  care_interest?: string;
  therapy_goals?: string;
  main_complaint?: string;
  psychiatric_medications?: string;
  has_psychiatric_followup?: boolean;
  psychiatrist_name?: string;
  psychiatrist_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  education_level?: string;
  marital_status?: string;
  legal_guardian_name?: string;
  legal_guardian_relationship?: string;
  report_indication?: string;
  recurring_techniques?: string;
  report_notes?: string;
  billing?: PatientBilling;
  notes?: string;
};

const matchesPatientReference = (patient: Patient, patientReference: string) =>
  patient.id === patientReference || patient.external_id === patientReference;

const compareByNewestDate = <T extends { created_at?: string; scheduled_at?: string; date?: string; due_date?: string; recorded_at?: string; validated_at?: string }>(left: T, right: T) => {
  const leftValue = Date.parse(left.validated_at ?? left.recorded_at ?? left.scheduled_at ?? left.due_date ?? left.created_at ?? left.date ?? now());
  const rightValue = Date.parse(right.validated_at ?? right.recorded_at ?? right.scheduled_at ?? right.due_date ?? right.created_at ?? right.date ?? now());
  return rightValue - leftValue;
};

const compareByOldestDate = <T extends { created_at?: string; scheduled_at?: string; date?: string; due_date?: string; recorded_at?: string; validated_at?: string }>(left: T, right: T) => {
  const leftValue = Date.parse(left.validated_at ?? left.recorded_at ?? left.scheduled_at ?? left.due_date ?? left.created_at ?? left.date ?? now());
  const rightValue = Date.parse(right.validated_at ?? right.recorded_at ?? right.scheduled_at ?? right.due_date ?? right.created_at ?? right.date ?? now());
  return leftValue - rightValue;
};

const normalizeOptionalText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const normalizeOptionalDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const normalizeOptionalBoolean = (value: unknown) =>
  typeof value === "boolean" ? value : undefined;

const normalizeOptionalNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : undefined;
  }
  return undefined;
};

const normalizePatientBilling = (value: PatientUpsertInput["billing"]) => {
  if (!value || (value.mode !== "per_session" && value.mode !== "package")) return undefined;

  const sessionPrice = normalizeOptionalNumber(value.session_price);
  const packageTotalPrice = normalizeOptionalNumber(value.package_total_price);
  const packageSessionCount = normalizeOptionalNumber(value.package_session_count);
  const weeklyFrequency = normalizeOptionalNumber((value as PatientBilling & { weekly_frequency?: number }).weekly_frequency);

  return {
    mode: value.mode,
    weekly_frequency:
      weeklyFrequency && weeklyFrequency >= 1 && weeklyFrequency <= 5
        ? (weeklyFrequency as 1 | 2 | 3 | 4 | 5)
        : undefined,
    session_price: value.mode === "per_session" ? sessionPrice : undefined,
    package_total_price: value.mode === "package" ? packageTotalPrice : undefined,
    package_session_count: value.mode === "package" ? packageSessionCount : undefined,
    payment_timing: value.payment_timing === "advance" || value.payment_timing === "after" ? value.payment_timing : undefined,
    preferred_payment_day:
      normalizeOptionalNumber((value as PatientBilling & { preferred_payment_day?: number }).preferred_payment_day),
    billing_reminder_days: typeof value.billing_reminder_days === "number" ? value.billing_reminder_days : undefined,
    billing_auto_charge: typeof value.billing_auto_charge === "boolean" ? value.billing_auto_charge : undefined,
  } satisfies PatientBilling;
};

const normalizePatientInput = (input: Partial<PatientUpsertInput>) => {
  const phone = normalizeOptionalText(input.phone);
  const whatsapp = normalizeOptionalText(input.whatsapp) ?? phone;

  return {
    label: normalizeOptionalText(input.name),
    care_status:
      input.care_status === "active" || input.care_status === "paused" || input.care_status === "transferred" || input.care_status === "inactive"
        ? input.care_status
        : undefined,
    email: normalizeOptionalText(input.email),
    phone,
    whatsapp,
    birth_date: normalizeOptionalDate(input.birth_date),
    address: normalizeOptionalText(input.address),
    address_street: normalizeOptionalText(input.address_street),
    address_number: normalizeOptionalText(input.address_number),
    address_complement: normalizeOptionalText(input.address_complement),
    address_neighborhood: normalizeOptionalText(input.address_neighborhood),
    address_city: normalizeOptionalText(input.address_city),
    address_state: normalizeOptionalText(input.address_state),
    address_zip: normalizeOptionalText(input.address_zip),
    cpf: normalizeOptionalText(input.cpf),
    profession: normalizeOptionalText(input.profession),
    referral_source: normalizeOptionalText(input.referral_source),
    care_interest: normalizeOptionalText(input.care_interest),
    therapy_goals: normalizeOptionalText(input.therapy_goals),
    main_complaint: normalizeOptionalText(input.main_complaint),
    psychiatric_medications: normalizeOptionalText(input.psychiatric_medications),
    has_psychiatric_followup: normalizeOptionalBoolean(input.has_psychiatric_followup),
    psychiatrist_name: normalizeOptionalText(input.psychiatrist_name),
    psychiatrist_contact: normalizeOptionalText(input.psychiatrist_contact),
    emergency_contact_name: normalizeOptionalText(input.emergency_contact_name),
    emergency_contact_relationship: normalizeOptionalText(input.emergency_contact_relationship),
    emergency_contact_phone: normalizeOptionalText(input.emergency_contact_phone),
    education_level: normalizeOptionalText(input.education_level),
    marital_status: normalizeOptionalText(input.marital_status),
    legal_guardian_name: normalizeOptionalText(input.legal_guardian_name),
    legal_guardian_relationship: normalizeOptionalText(input.legal_guardian_relationship),
    report_indication: normalizeOptionalText(input.report_indication),
    recurring_techniques: normalizeOptionalText(input.recurring_techniques),
    report_notes: normalizeOptionalText(input.report_notes),
    billing: normalizePatientBilling(input.billing),
    notes: normalizeOptionalText(input.notes),
  };
};

const hydratePatient = (patient: Patient): Patient => ({
  ...patient,
  whatsapp: patient.whatsapp ?? patient.phone,
});

export const createPatientIfMissing = (owner: string, patientId: string): Patient => {
  const existing = byOwner(db.patients.values(), owner).find((item) => matchesPatientReference(item, patientId));
  if (existing) return hydratePatient(existing);

  const patient: Patient = {
    id: uid(),
    owner_user_id: owner,
    external_id: patientId,
    label: `Paciente ${patientId}`,
    created_at: now(),
  };
  db.patients.set(patient.id, patient);
  persistMutation();
  return hydratePatient(patient);
};

export const createPatient = (
  owner: string,
  input: PatientUpsertInput,
): Patient => {
  const id = uid();
  const normalized = normalizePatientInput(input);
  if (!normalized.label) {
    throw new Error("Patient name is required");
  }

  const patient: Patient = {
    id,
    owner_user_id: owner,
    external_id: id,
    label: normalized.label,
    care_status: normalized.care_status ?? "active",
    email: normalized.email,
    phone: normalized.phone,
    whatsapp: normalized.whatsapp,
    birth_date: normalized.birth_date,
    address: normalized.address,
    address_street: normalized.address_street,
    address_number: normalized.address_number,
    address_complement: normalized.address_complement,
    address_neighborhood: normalized.address_neighborhood,
    address_city: normalized.address_city,
    address_state: normalized.address_state,
    address_zip: normalized.address_zip,
    cpf: normalized.cpf,
    profession: normalized.profession,
    referral_source: normalized.referral_source,
    care_interest: normalized.care_interest,
    therapy_goals: normalized.therapy_goals,
    main_complaint: normalized.main_complaint,
    psychiatric_medications: normalized.psychiatric_medications,
    has_psychiatric_followup: normalized.has_psychiatric_followup,
    psychiatrist_name: normalized.psychiatrist_name,
    psychiatrist_contact: normalized.psychiatrist_contact,
    emergency_contact_name: normalized.emergency_contact_name,
    emergency_contact_relationship: normalized.emergency_contact_relationship,
    emergency_contact_phone: normalized.emergency_contact_phone,
    education_level: normalized.education_level,
    marital_status: normalized.marital_status,
    legal_guardian_name: normalized.legal_guardian_name,
    legal_guardian_relationship: normalized.legal_guardian_relationship,
    report_indication: normalized.report_indication,
    recurring_techniques: normalized.recurring_techniques,
    report_notes: normalized.report_notes,
    billing: normalized.billing,
    notes: normalized.notes,
    created_at: now(),
  };
  db.patients.set(patient.id, patient);
  persistMutation();
  return hydratePatient(patient);
};

export const getPatient = (owner: string, patientId: string) => {
  const patient = byOwner(db.patients.values(), owner).find((item) => matchesPatientReference(item, patientId)) ?? null;
  return patient ? hydratePatient(patient) : null;
};

export const listPatientSessionsByReference = (owner: string, patientId: string) => {
  const patient = getPatient(owner, patientId);
  if (!patient) return [];

  return byOwner(db.sessions.values(), owner)
    .filter((item) => item.patient_id === patient.id || item.patient_id === patient.external_id)
    .sort(compareByNewestDate);
};

const buildPatientSummary = (owner: string, patientId: string): PatientSummary => {
  const sessions = listPatientSessionsByReference(owner, patientId);
  const referenceNow = Date.now();
  const nextSession = [...sessions]
    .filter((session) => Date.parse(session.scheduled_at) >= referenceNow)
    .sort(compareByOldestDate)[0] ?? null;
  const lastSession = [...sessions]
    .filter((session) => Date.parse(session.scheduled_at) < referenceNow)
    .sort(compareByNewestDate)[0] ?? null;

  return {
    total_sessions: sessions.length,
    next_session: nextSession,
    last_session: lastSession,
  };
};

const decoratePatientListItem = (owner: string, patient: Patient) => {
  const hydratedPatient = hydratePatient(patient);
  const summary = buildPatientSummary(owner, patient.id);
  const portalAccess = Array.from(db.patientAccess.values()).find((item) => {
    const access = item as PatientAccess;
    return access.owner_user_id === owner && matchesPatientAccessReference(access, patient.id);
  }) as PatientAccess | undefined;
  const portalUser = portalAccess ? db.users.get(portalAccess.patient_user_id) : null;
  return {
    ...hydratedPatient,
    total_sessions: summary.total_sessions,
    next_session: summary.next_session?.scheduled_at,
    last_session: summary.last_session?.scheduled_at,
    portal_access_created: Boolean(portalAccess),
    portal_access_email: portalUser?.email ?? portalAccess?.patient_email,
  };
};

export const listPatients = (owner: string) =>
  byOwner(db.patients.values(), owner)
    .sort((left, right) => left.label.localeCompare(right.label))
    .map((patient) => decoratePatientListItem(owner, patient));

export const updatePatient = (owner: string, patientId: string, input: Partial<PatientUpsertInput>) => {
  const patient = byOwner(db.patients.values(), owner).find((item) => matchesPatientReference(item, patientId));
  if (!patient) return null;

  const normalized = normalizePatientInput(input);
  if (normalized.label !== undefined) patient.label = normalized.label;
  if ("care_status" in normalized && normalized.care_status) patient.care_status = normalized.care_status;
  if ("email" in input) patient.email = normalized.email;
  if ("phone" in input) patient.phone = normalized.phone;
  if ("whatsapp" in input || ("phone" in input && !("whatsapp" in input))) patient.whatsapp = normalized.whatsapp;
  if ("birth_date" in input) patient.birth_date = normalized.birth_date;
  if ("address" in input) patient.address = normalized.address;
  if ("address_street" in input) patient.address_street = normalized.address_street;
  if ("address_number" in input) patient.address_number = normalized.address_number;
  if ("address_complement" in input) patient.address_complement = normalized.address_complement;
  if ("address_neighborhood" in input) patient.address_neighborhood = normalized.address_neighborhood;
  if ("address_city" in input) patient.address_city = normalized.address_city;
  if ("address_state" in input) patient.address_state = normalized.address_state;
  if ("address_zip" in input) patient.address_zip = normalized.address_zip;
  if ("cpf" in input) patient.cpf = normalized.cpf;
  if ("profession" in input) patient.profession = normalized.profession;
  if ("referral_source" in input) patient.referral_source = normalized.referral_source;
  if ("care_interest" in input) patient.care_interest = normalized.care_interest;
  if ("therapy_goals" in input) patient.therapy_goals = normalized.therapy_goals;
  if ("main_complaint" in input) patient.main_complaint = normalized.main_complaint;
  if ("psychiatric_medications" in input) patient.psychiatric_medications = normalized.psychiatric_medications;
  if ("has_psychiatric_followup" in input) patient.has_psychiatric_followup = normalized.has_psychiatric_followup;
    if ("psychiatrist_name" in input) patient.psychiatrist_name = normalized.psychiatrist_name;
    if ("psychiatrist_contact" in input) patient.psychiatrist_contact = normalized.psychiatrist_contact;
  if ("emergency_contact_name" in input) patient.emergency_contact_name = normalized.emergency_contact_name;
  if ("emergency_contact_relationship" in input) patient.emergency_contact_relationship = normalized.emergency_contact_relationship;
  if ("emergency_contact_phone" in input) patient.emergency_contact_phone = normalized.emergency_contact_phone;
  if ("education_level" in input) patient.education_level = normalized.education_level;
  if ("marital_status" in input) patient.marital_status = normalized.marital_status;
  if ("legal_guardian_name" in input) patient.legal_guardian_name = normalized.legal_guardian_name;
  if ("legal_guardian_relationship" in input) patient.legal_guardian_relationship = normalized.legal_guardian_relationship;
  if ("report_indication" in input) patient.report_indication = normalized.report_indication;
  if ("recurring_techniques" in input) patient.recurring_techniques = normalized.recurring_techniques;
  if ("report_notes" in input) patient.report_notes = normalized.report_notes;
  if ("billing" in input) patient.billing = normalized.billing;
  if ("notes" in input) patient.notes = normalized.notes;

  persistMutation();
  return decoratePatientListItem(owner, patient);
};

export const listPatientDocuments = (owner: string, patientId: string) =>
  byOwner(db.documents.values(), owner)
    .filter((item) => {
      const patient = getPatient(owner, patientId);
      if (!patient) return item.patient_id === patientId;
      return item.patient_id === patient.id || item.patient_id === patient.external_id;
    })
    .sort(compareByNewestDate);

export const listPatientClinicalNotes = (owner: string, patientId: string) => {
  const patient = getPatient(owner, patientId);
  if (!patient) return [];

  return byOwner(db.clinicalNotes.values(), owner)
    .filter((note) => {
      const session = db.sessions.get(note.session_id);
      if (!session || session.owner_user_id !== owner) return false;
      return session.patient_id === patient.id || session.patient_id === patient.external_id;
    })
    .sort(compareByNewestDate);
};

export const listPatientDiaryEntriesByReference = (owner: string, patientId: string) => {
  const patient = getPatient(owner, patientId);
  if (!patient) return [];

  return byOwner(db.patientDiaryEntries.values(), owner)
    .filter((item) => item.patient_id === patient.id || item.patient_id === patient.external_id)
    .sort(compareByNewestDate);
};

export const createEmotionalDiaryEntry = (
  owner: string,
  patientId: string,
  input: EmotionalDiaryEntryInput,
): EmotionalDiaryEntry => {
  createPatientIfMissing(owner, patientId);
  const entry: EmotionalDiaryEntry = {
    id: uid(),
    owner_user_id: owner,
    patient_id: patientId,
    date: input.date ?? now(),
    mood: input.mood,
    intensity: input.intensity,
    description: input.description?.trim() || undefined,
    thoughts: input.thoughts?.trim() || undefined,
    tags: input.tags?.map((item) => item.trim()).filter(Boolean),
    created_at: now(),
  };
  db.patientDiaryEntries.set(entry.id, entry);
  persistMutation();
  return entry;
};

export const buildPatientTimeline = (owner: string, patientId: string): PatientTimelineItem[] => {
  const patient = getPatient(owner, patientId);
  if (!patient) return [];

  const sessions = listPatientSessionsByReference(owner, patient.id).map((session) => ({
    id: `session-${session.id}`,
    patient_id: patient.id,
    kind: "session" as const,
    date: session.scheduled_at,
    title: "Sessão agendada",
    subtitle: session.status,
    related_id: session.id,
  }));

  const notes = listPatientClinicalNotes(owner, patient.id).map((note) => ({
    id: `note-${note.id}`,
    patient_id: patient.id,
    kind: "clinical_note" as const,
    date: note.validated_at ?? note.created_at,
    title: "Nota clínica",
    subtitle: note.status,
    related_id: note.id,
  }));

  const documents = listPatientDocuments(owner, patient.id).map((document) => ({
    id: `document-${document.id}`,
    patient_id: patient.id,
    kind: "document" as const,
    date: document.created_at,
    title: document.title,
    subtitle: document.template_id,
    related_id: document.id,
  }));

  return [...sessions, ...notes, ...documents].sort(compareByNewestDate);
};

export const getPatientDetail = (owner: string, patientId: string) => {
  const patient = getPatient(owner, patientId);
  if (!patient) return null;

  const portalAccess = Array.from(db.patientAccess.values()).find((item) => {
    const access = item as PatientAccess;
    return access.owner_user_id === owner && matchesPatientAccessReference(access, patient.id);
  }) as PatientAccess | undefined;
  const portalUser = portalAccess ? db.users.get(portalAccess.patient_user_id) : null;

  return {
    patient,
    summary: buildPatientSummary(owner, patient.id),
    sessions: listPatientSessionsByReference(owner, patient.id),
    documents: listPatientDocuments(owner, patient.id),
    clinical_notes: listPatientClinicalNotes(owner, patient.id),
    emotional_diary: listPatientDiaryEntriesByReference(owner, patient.id),
    portal_access: portalAccess
      ? {
          id: portalAccess.id,
          patient_user_id: portalAccess.patient_user_id,
          email: portalUser?.email ?? portalAccess.patient_email,
          name: portalUser?.name ?? portalAccess.patient_name,
          created_at: portalAccess.created_at,
          updated_at: portalAccess.updated_at,
          last_credentials_reset_at: portalAccess.last_credentials_reset_at,
          last_email_delivery_status: portalAccess.last_email_delivery_status,
          last_email_delivery_detail: portalAccess.last_email_delivery_detail,
        }
      : null,
    timeline: buildPatientTimeline(owner, patient.id),
  };
};

export const createSession = (owner: string, patientId: string, scheduledAt: string, durationMinutes?: number): ClinicalSession => {
  createPatientIfMissing(owner, patientId);
  const session: ClinicalSession = {
    id: uid(),
    owner_user_id: owner,
    patient_id: patientId,
    scheduled_at: scheduledAt,
    status: "scheduled",
    duration_minutes: typeof durationMinutes === "number" ? durationMinutes : undefined,
    created_at: now(),
  };
  db.sessions.set(session.id, session);
  persistMutation();
  return session;
};

export const updateSession = (
  owner: string,
  sessionId: string,
  input: Partial<{ scheduled_at: string; duration_minutes?: number; patient_id: string }>
) => {
  const session = getByOwner(db.sessions, owner, sessionId);
  if (!session) return null;

  if (typeof input.patient_id === "string" && input.patient_id.trim()) {
    createPatientIfMissing(owner, input.patient_id);
    session.patient_id = input.patient_id.trim();
  }
  if (typeof input.scheduled_at === "string" && input.scheduled_at.trim()) {
    session.scheduled_at = input.scheduled_at;
  }
  if ("duration_minutes" in input) {
    session.duration_minutes = typeof input.duration_minutes === "number" ? input.duration_minutes : undefined;
  }

  persistMutation();
  return session;
};

export const createPatientAccess = (owner: string, input: {
  patient_id: string;
  patient_email: string;
  patient_name: string;
  patient_password?: string;
  reset_password?: boolean;
  permissions?: Partial<PatientAccessPermissions>;
}) => {
  const sameEmail = Array.from(db.users.values()).find((item) => item.email.toLowerCase() === input.patient_email.toLowerCase());
  if (sameEmail && sameEmail.role !== "patient") return { error: "EMAIL_IN_USE" as const };

  const existingAccess = Array.from(db.patientAccess.values()).find((item) => {
    const access = item as PatientAccess;
    return access.owner_user_id === owner && access.patient_id === input.patient_id;
  }) as PatientAccess | undefined;

  const shouldResetPassword = Boolean(input.reset_password || input.patient_password || !existingAccess);
  const temporaryPassword = shouldResetPassword ? (input.patient_password || "patient123") : undefined;
  const patientUser = sameEmail ?? {
    id: uid(),
    email: input.patient_email,
    name: input.patient_name,
    password_hash: hashPassword(temporaryPassword ?? "patient123"),
    role: "patient" as const,
    status: "active" as const,
    created_at: now(),
  };
  patientUser.email = input.patient_email;
  patientUser.name = input.patient_name;
  if (temporaryPassword) {
    patientUser.password_hash = hashPassword(temporaryPassword);
  }
  db.users.set(patientUser.id, patientUser);

  createPatientIfMissing(owner, input.patient_id);
  const access: PatientAccess = existingAccess ?? {
    id: uid(),
    owner_user_id: owner,
    patient_user_id: patientUser.id,
    patient_id: input.patient_id,
    permissions: {
      scales: true,
      diary: true,
      session_confirmation: true,
      async_messages_per_day: 3,
    },
    created_at: now(),
  };
  access.patient_user_id = patientUser.id;
  access.patient_id = input.patient_id;
  access.patient_email = input.patient_email;
  access.patient_name = input.patient_name;
  access.permissions = {
    scales: input.permissions?.scales ?? access.permissions.scales ?? true,
    diary: input.permissions?.diary ?? access.permissions.diary ?? true,
    session_confirmation: input.permissions?.session_confirmation ?? access.permissions.session_confirmation ?? true,
    async_messages_per_day: input.permissions?.async_messages_per_day ?? access.permissions.async_messages_per_day ?? 3,
  };
  access.updated_at = now();
  if (temporaryPassword) {
    access.last_credentials_reset_at = now();
  }
  db.patientAccess.set(access.id, access);
  persistMutation();
  return { access, patientUser, temporaryPassword: input.patient_password ? undefined : temporaryPassword };
};

export const getPatientAccessForUser = (patientUserId: string) =>
  Array.from(db.patientAccess.values()).find((item) => (item as PatientAccess).patient_user_id === patientUserId) as PatientAccess | undefined;

export const listPatientSessions = (access: PatientAccess) => {
  const patient = getPatient(access.owner_user_id, access.patient_id);
  return byOwner(db.sessions.values(), access.owner_user_id).filter((item) => {
    if (!patient) return item.patient_id === access.patient_id;
    return item.patient_id === patient.id || item.patient_id === patient.external_id;
  });
};

const matchesPatientAccessReference = (access: PatientAccess, patientReference: string) => {
  const patient = getPatient(access.owner_user_id, access.patient_id);
  if (!patient) return patientReference === access.patient_id;
  return patientReference === patient.id || patientReference === patient.external_id;
};

export const listPatientAccessibleDocuments = (access: PatientAccess) =>
  byOwner(db.documents.values(), access.owner_user_id)
    .filter((item) => matchesPatientAccessReference(access, item.patient_id))
    .sort(compareByNewestDate);

export const getPatientAccessibleDocumentDetail = (access: PatientAccess, documentId: string) => {
  const document = getByOwner(db.documents, access.owner_user_id, documentId);
  if (!document || !matchesPatientAccessReference(access, document.patient_id)) return null;

  return {
    document,
    versions: listDocumentVersions(access.owner_user_id, documentId),
    patient: getPatient(access.owner_user_id, access.patient_id),
  };
};

export const listPatientAccessibleDiaryEntries = (access: PatientAccess) =>
  byOwner(db.patientDiaryEntries.values(), access.owner_user_id)
    .filter((item) => matchesPatientAccessReference(access, item.patient_id))
    .sort(compareByNewestDate);

export const buildPatientNotificationFeed = (access: PatientAccess): NotificationPreview[] => {
  const upcomingSessions = listPatientSessions(access)
    .filter((session) => Date.parse(session.scheduled_at) >= Date.now())
    .sort(compareByOldestDate)
    .slice(0, 3)
    .map((session) => ({
      id: `session-${session.id}`,
      type: "session" as const,
      title: "Sessão agendada",
      message: `Próxima atualização para ${new Date(session.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
      created_at: session.created_at,
      related_id: session.id,
      status: session.status,
    }));

  const recentDocuments = listPatientAccessibleDocuments(access)
    .slice(0, 3)
    .map((document) => ({
      id: `document-${document.id}`,
      type: "document" as const,
      title: "Novo documento disponível",
      message: document.title,
      created_at: document.created_at,
      related_id: document.id,
      status: "available",
    }));

  const reminders = Array.from(db.notificationSchedules.values())
    .filter((item) => item.owner_user_id === access.owner_user_id && matchesPatientAccessReference(access, item.patient_id))
    .sort(compareByNewestDate)
    .slice(0, 3)
    .map((item) => ({
      id: `reminder-${item.id}`,
      type: "reminder" as const,
      title: item.status === "sent" ? "Lembrete enviado" : "Lembrete programado",
      message: `Canal ${item.channel} para ${new Date(item.scheduled_for).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
      created_at: item.sent_at ?? item.scheduled_for,
      related_id: item.session_id,
      status: item.status,
    }));

  return [...upcomingSessions, ...recentDocuments, ...reminders]
    .sort(compareByNewestDate)
    .slice(0, 6);
};

export const confirmPatientSession = (access: PatientAccess, sessionId: string) => {
  if (!access.permissions.session_confirmation) return { error: "PERMISSION_DENIED" as const };
  const session = getByOwner(db.sessions, access.owner_user_id, sessionId);
  const patient = getPatient(access.owner_user_id, access.patient_id);
  const matchesPatient = patient
    ? session && (session.patient_id === patient.id || session.patient_id === patient.external_id)
    : session?.patient_id === access.patient_id;
  if (!session || !matchesPatient) return { error: "NOT_FOUND" as const };
  session.status = "confirmed";
  persistMutation();
  return { session };
};

export const recordPatientScale = (access: PatientAccess, scaleId: string, score: number) => {
  if (!access.permissions.scales) return { error: "PERMISSION_DENIED" as const };
  return { record: createScaleRecord(access.owner_user_id, scaleId, access.patient_id, score) };
};

export const recordPatientDiaryEntry = (access: PatientAccess, input: EmotionalDiaryEntryInput) => {
  if (!access.permissions.diary) return { error: "PERMISSION_DENIED" as const };
  const entry = createEmotionalDiaryEntry(access.owner_user_id, access.patient_id, input);
  return { entry };
};

export const sendPatientAsyncMessage = (access: PatientAccess, message: string) => {
  const today = now().slice(0, 10);
  const todayCount = Array.from(db.patientMessages.values()).filter(
    (item) => item.owner_user_id === access.owner_user_id
      && item.patient_id === access.patient_id
      && item.created_at.startsWith(today),
  ).length;
  if (todayCount >= access.permissions.async_messages_per_day) return { error: "LIMIT_REACHED" as const };
  const payload = { id: uid(), owner_user_id: access.owner_user_id, patient_id: access.patient_id, message, created_at: now() };
  db.patientMessages.set(payload.id, payload);
  persistMutation();
  return {
    payload,
    remaining: Math.max(0, access.permissions.async_messages_per_day - (todayCount + 1)),
    disclaimer: "Mensagens assíncronas não substituem atendimento de urgência.",
  };
};

// ── Patient portal: share/unshare ──────────────────────────────────────────
export const toggleShareWithPatient = (
  owner: string,
  collection: "contracts" | "reports" | "documents" | "financial",
  itemId: string,
  share: boolean,
) => {
  const map = db[collection] as Map<string, Record<string, unknown>>;
  const item = map.get(itemId);
  if (!item || item.owner_user_id !== owner) return null;
  item.shared_with_patient = share;
  item.shared_at = share ? now() : undefined;
  map.set(itemId, item);
  persistMutation();
  if (share) {
    // Notify patient if they have access
    const access = Array.from(db.patientAccess.values()).find(
      (a) => (a as PatientAccess).owner_user_id === owner && (a as PatientAccess).patient_id === item.patient_id,
    ) as PatientAccess | undefined;
    if (access) {
      notifyPatient(access, "document_shared", { title: String(item.title ?? item.kind ?? "Documento") });
    }
  }
  return item;
};

export const getPatientSharedDocuments = (access: PatientAccess) => {
  const results: Array<Record<string, unknown>> = [];

  for (const [, c] of db.contracts) {
    if (c.owner_user_id === access.owner_user_id && c.patient_id === access.patient_id && c.shared_with_patient) {
      results.push({ ...c, type: "contract" });
    }
  }
  for (const [, r] of db.reports) {
    if (r.owner_user_id === access.owner_user_id && matchesPatientAccessReference(access, r.patient_id) && (r as unknown as ClinicalReport).shared_with_patient) {
      results.push({ ...(r as unknown as Record<string, unknown>), type: "report" });
    }
  }
  for (const [, d] of db.documents) {
    if (d.owner_user_id === access.owner_user_id && matchesPatientAccessReference(access, d.patient_id) && d.shared_with_patient) {
      results.push({ ...(d as unknown as Record<string, unknown>), type: "document" });
    }
  }

  return results.sort(
    (a, b) => Date.parse(String(b.shared_at ?? b.created_at)) - Date.parse(String(a.shared_at ?? a.created_at)),
  );
};

export const getPatientFinancial = (access: PatientAccess) => {
  const results: FinancialEntry[] = [];
  for (const [, f] of db.financial) {
    if (f.owner_user_id === access.owner_user_id && matchesPatientAccessReference(access, f.patient_id)) {
      if (f.status === "open" || f.shared_with_patient) results.push(f);
    }
  }
  return results.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
};

// ── Patient notifications ───────────────────────────────────────────────────
export const notifyPatient = (access: PatientAccess, type: PatientNotification["type"], data: Record<string, string>) => {
  const notification: PatientNotification = {
    id: uid(),
    patient_user_id: access.patient_user_id,
    type,
    data,
    read: false,
    created_at: now(),
  };
  db.patientNotifications.set(notification.id, notification);
  persistMutation();
  return notification;
};

export const listPatientNotifications = (patientUserId: string) =>
  Array.from(db.patientNotifications.values())
    .filter((n) => n.patient_user_id === patientUserId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

export const markNotificationRead = (patientUserId: string, notificationId: string) => {
  const n = db.patientNotifications.get(notificationId);
  if (!n || n.patient_user_id !== patientUserId) return null;
  n.read = true;
  db.patientNotifications.set(notificationId, n);
  persistMutation();
  return n;
};

// ── Availability blocks (Calendly-style) ──────────────────────────────────
export const createAvailabilityBlock = (owner: string, data: Omit<AvailabilityBlock, "id" | "owner_user_id" | "created_at">) => {
  const block: AvailabilityBlock = { id: uid(), owner_user_id: owner, created_at: now(), ...data };
  db.availabilityBlocks.set(block.id, block);
  persistMutation();
  return block;
};

export const listAvailabilityBlocks = (owner: string) =>
  Array.from(db.availabilityBlocks.values()).filter((b) => b.owner_user_id === owner);

export const updateAvailabilityBlock = (owner: string, blockId: string, patch: Partial<Omit<AvailabilityBlock, "id" | "owner_user_id" | "created_at">>) => {
  const block = getByOwner(db.availabilityBlocks, owner, blockId);
  if (!block) return null;
  Object.assign(block, patch);
  db.availabilityBlocks.set(blockId, block);
  persistMutation();
  return block;
};

export const deleteAvailabilityBlock = (owner: string, blockId: string) => {
  const block = getByOwner(db.availabilityBlocks, owner, blockId);
  if (!block) return false;
  db.availabilityBlocks.delete(blockId);
  persistMutation();
  return true;
};

export const getAvailableSlots = (access: PatientAccess, startDate: string, endDate: string) => {
  const blocks = Array.from(db.availabilityBlocks.values()).filter(
    (b) => b.owner_user_id === access.owner_user_id && b.enabled,
  );

  const slots: Array<{ date: string; time: string; duration: number }> = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay() as AvailabilityBlock["day_of_week"];
    const dateStr = d.toISOString().split("T")[0];

    for (const block of blocks) {
      if (block.day_of_week !== dow) continue;

      const [startH, startM] = block.start_time.split(":").map(Number);
      const [endH, endM] = block.end_time.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      for (let t = startMin; t + block.slot_duration_minutes <= endMin; t += block.slot_duration_minutes) {
        const h = String(Math.floor(t / 60)).padStart(2, "0");
        const m = String(t % 60).padStart(2, "0");
        const time = `${h}:${m}`;

        const booked = Array.from(db.sessions.values()).some(
          (s) => s.owner_user_id === access.owner_user_id && s.scheduled_at?.startsWith(dateStr) && s.scheduled_at?.includes(`T${time}`),
        );
        const requested = Array.from(db.slotRequests.values()).some(
          (sr) => sr.owner_user_id === access.owner_user_id && sr.requested_date === dateStr && sr.requested_time === time && sr.status === "pending",
        );

        if (!booked && !requested) {
          slots.push({ date: dateStr, time, duration: block.slot_duration_minutes });
        }
      }
    }
  }

  return slots;
};

export const requestSlot = (access: PatientAccess, date: string, time: string, duration: number) => {
  const request: SlotRequest = {
    id: uid(),
    owner_user_id: access.owner_user_id,
    patient_id: access.patient_id,
    patient_user_id: access.patient_user_id,
    requested_date: date,
    requested_time: time,
    duration_minutes: duration,
    status: "pending",
    created_at: now(),
  };
  db.slotRequests.set(request.id, request);
  persistMutation();
  return request;
};

export const listSlotRequests = (owner: string) =>
  Array.from(db.slotRequests.values())
    .filter((sr) => sr.owner_user_id === owner)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

export const listPatientSlotRequests = (access: PatientAccess) =>
  Array.from(db.slotRequests.values())
    .filter((sr) => sr.owner_user_id === access.owner_user_id && sr.patient_id === access.patient_id)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

export const respondSlotRequest = (owner: string, requestId: string, approved: boolean, reason?: string) => {
  const request = getByOwner(db.slotRequests, owner, requestId);
  if (!request) return null;

  request.status = approved ? "confirmed" : "rejected";
  request.responded_at = now();
  if (!approved && reason) request.rejection_reason = reason;
  db.slotRequests.set(requestId, request);

  if (approved) {
    const scheduledAt = `${request.requested_date}T${request.requested_time}:00`;
    createSession(owner, request.patient_id, scheduledAt, request.duration_minutes);
  }

  // Notify patient
  const access = Array.from(db.patientAccess.values()).find(
    (a) => (a as PatientAccess).owner_user_id === owner && (a as PatientAccess).patient_id === request.patient_id,
  ) as PatientAccess | undefined;
  if (access) {
    notifyPatient(access, "slot_response", {
      date: request.requested_date,
      time: request.requested_time,
      status: approved ? "confirmed" : "rejected",
    });
  }

  persistMutation();
  return request;
};

// ─────────────────────────────────────────────────────────────────────────────

export const createContract = (owner: string, input: Omit<Contract, "id" | "owner_user_id" | "status" | "created_at" | "updated_at">) => {
  const contract: Contract = {
    id: uid(),
    owner_user_id: owner,
    status: "draft",
    created_at: now(),
    updated_at: now(),
    ...input,
  };
  db.contracts.set(contract.id, contract);
  persistMutation();
  return contract;
};

export const updateContract = (
  owner: string,
  id: string,
  input: Partial<Omit<Contract, "id" | "owner_user_id" | "status" | "created_at" | "updated_at">>,
) => {
  const contract = getContract(owner, id);
  if (!contract) return null;

  if ("template_id" in input) contract.template_id = input.template_id;
  if ("title" in input) contract.title = input.title;
  if ("content" in input) contract.content = input.content;
  if ("psychologist" in input && input.psychologist) contract.psychologist = { ...contract.psychologist, ...input.psychologist };
  if ("patient" in input && input.patient) contract.patient = { ...contract.patient, ...input.patient };
  if ("terms" in input && input.terms) contract.terms = { ...contract.terms, ...input.terms };
  contract.updated_at = now();
  persistMutation();
  return contract;
};

export const listContracts = (owner: string) => byOwner(db.contracts.values() as Iterable<Contract>, owner);
export const getContract = (owner: string, id: string) => getByOwner(db.contracts as Map<string, Contract>, owner, id);

export const sendContract = (
  owner: string,
  id: string,
  _channel?: "email" | "whatsapp",
  _recipient?: string,
) => {
  const contract = getContract(owner, id);
  if (!contract) return null;
  contract.status = "sent";
  contract.portal_token = contract.portal_token ?? crypto.randomBytes(12).toString("hex");
  contract.updated_at = now();
  persistMutation();
  return contract;
};

export const getContractByPortalToken = (portalToken: string) =>
  Array.from(db.contracts.values()).find((item) => (item as Contract).portal_token === portalToken) as Contract | undefined;

export const acceptContract = (portalToken: string, acceptedBy: string, acceptedIp: string) => {
  const contract = getContractByPortalToken(portalToken);
  if (!contract) return null;
  contract.status = "accepted";
  contract.accepted_by = acceptedBy;
  contract.accepted_ip = acceptedIp;
  contract.accepted_at = now();
  contract.updated_at = now();
  persistMutation();
  return contract;
};

export const attachSignedContract = (
  owner: string,
  id: string,
  input: { file_name: string; mime_type: string; data_url: string },
) => {
  const contract = getContract(owner, id);
  if (!contract) return null;
  contract.signed_file = {
    file_name: input.file_name,
    mime_type: input.mime_type,
    data_url: input.data_url,
    uploaded_at: now(),
  };
  contract.updated_at = now();
  persistMutation();
  return contract;
};

migrateLegacyContractText();

export const exportContract = (owner: string, id: string, format: "pdf" | "docx") => {
  const contract = getContract(owner, id);
  if (!contract) return null;
  return { contract_id: id, format, content: JSON.stringify(contract) };
};

export const exportResourcePdf = async (owner: string, documentType: string, documentId: string) => {
  if (documentType === "clinical_note") {
    const note = getByOwner(db.clinicalNotes, owner, documentId);
    if (!note) return null;
    const parsed = parseLegacyClinicalNoteContent(note.content);
    const payload = {
      title: "Prontuário da sessão",
      subtitle: note.status === "validated" ? "Prontuário validado" : "Rascunho em revisão",
      sections: [
        { heading: "Queixa principal", paragraphs: [parsed.structuredData.complaint || "Não informado"] },
        { heading: "Observações clínicas", paragraphs: [parsed.structuredData.context || parsed.additionalNotes || "Não informado"] },
        { heading: "Evolução", paragraphs: [parsed.structuredData.soap?.subjective || "Não informado"] },
        { heading: "Plano terapêutico", paragraphs: [parsed.structuredData.soap?.plan || "Não informado"] },
      ],
    };
    return { filename: `prontuario-${documentId}.pdf`, data_url: await runPdfGenerator(payload) };
  }

  if (documentType === "contract") {
    const contract = getContract(owner, documentId);
    if (!contract) return null;
    const payload = {
      title: contract.title ?? "Contrato terapêutico",
      subtitle: `Status: ${contract.status}`,
      sections: [
        { heading: "Paciente", paragraphs: [contract.patient?.name || "Não informado", contract.patient?.email || ""] },
        { heading: "Profissional", paragraphs: [contract.psychologist?.name || "Não informado", contract.psychologist?.license || ""] },
        { heading: "Condições", paragraphs: [contract.terms?.value || "", contract.terms?.periodicity || "", contract.terms?.payment_method || "", contract.terms?.absence_policy || ""] },
        { heading: "Conteúdo", paragraphs: [contract.content || ""] },
      ],
    };
    return { filename: `contrato-${documentId}.pdf`, data_url: await runPdfGenerator(payload) };
  }

  if (documentType === "document") {
    const detail = getDocumentDetail(owner, documentId);
    if (!detail) return null;
    const latestVersion = [...detail.versions].sort(compareByNewestDate)[0];
    const payload = {
      title: detail.document.title || "Documento clínico",
      subtitle: `Paciente: ${detail.patient?.label || "Não informado"}`,
      sections: [
        { heading: "Conteúdo", paragraphs: [latestVersion ? stripHtml(latestVersion.content) : "Sem versão disponível"] },
      ],
    };
    return { filename: `documento-${documentId}.pdf`, data_url: await runPdfGenerator(payload) };
  }

  return null;
};

const defaultDocumentTemplates: Array<{ id: string; title: string; description?: string; html: string; fields?: Array<{ key: string; label: string; required?: boolean }> }> = [
  { id: "attendance-declaration", title: "Declara\u00e7\u00e3o", description: "Declara\u00e7\u00e3o de comparecimento a atendimento psicol\u00f3gico conforme CFP.", html: "<h1>Declara\u00e7\u00e3o</h1><p>{{content}}</p>", fields: [{ key: "attendance_date", label: "Data do atendimento", required: true }, { key: "attendance_time", label: "Hor\u00e1rio do atendimento", required: true }] },
  { id: "psychological-certificate", title: "Atestado psicol\u00f3gico", description: "Atestado psicol\u00f3gico para afastamento ou acompanhamento conforme CRP.", html: "<h1>Atestado psicol\u00f3gico</h1><p>{{content}}</p>", fields: [{ key: "period_start", label: "Data in\u00edcio", required: true }, { key: "period_end", label: "Data fim", required: true }, { key: "cid_code", label: "CID (opcional)" }] },
  { id: "payment-receipt", title: "Recibo", description: "Recibo de presta\u00e7\u00e3o de servi\u00e7os psicol\u00f3gicos.", html: "<h1>Recibo</h1><p>{{content}}</p>", fields: [{ key: "amount", label: "Valor (R$)", required: true }, { key: "payment_method", label: "Forma de pagamento", required: true }, { key: "service_type", label: "Tipo de servi\u00e7o" }, { key: "attendance_date", label: "Data do atendimento", required: true }] },
  { id: "clinical-record", title: "Prontu\u00e1rio Psicol\u00f3gico", description: "Registro cl\u00ednico completo do acompanhamento psicol\u00f3gico.", html: "<h1>Prontu\u00e1rio</h1><p>{{content}}</p>", fields: [] },
  { id: "therapy-contract", title: "Contrato terap\u00eautico", description: "Contrato de presta\u00e7\u00e3o de servi\u00e7os psicol\u00f3gicos.", html: "<h1>Contrato terap\u00eautico</h1><p>{{content}}</p>" },
  { id: "psychological-report", title: "Relat\u00f3rio psicol\u00f3gico", description: "Relat\u00f3rio psicol\u00f3gico destinado a terceiros.", html: "<h1>Relat\u00f3rio psicol\u00f3gico</h1><p>{{content}}</p>" },
];

const ensureDefaultDocumentTemplates = () => {
  for (const template of defaultDocumentTemplates) {
    if (!db.documentTemplates.has(template.id)) {
      db.documentTemplates.set(template.id, {
        id: template.id,
        owner_user_id: "system",
        created_at: now(),
        title: template.title,
        description: template.description,
        version: 1,
        html: template.html,
        fields: template.fields ?? [],
      });
    }
  }
};

ensureDefaultDocumentTemplates();

export const listDocumentTemplates = () => {
  ensureDefaultDocumentTemplates();
  return Array.from(db.documentTemplates.values());
};

export const createDocument = (owner: string, patientId: string, caseId: string, templateId: string, title: string): ClinicalDocument | null => {
  ensureDefaultDocumentTemplates();
  const template = db.documentTemplates.get(templateId);
  if (!template) return null;
  const item: ClinicalDocument = {
    id: uid(),
    owner_user_id: owner,
    created_at: now(),
    patient_id: patientId,
    case_id: caseId,
    template_id: template.id,
    title,
  };
  db.documents.set(item.id, item);
  persistMutation();
  return item;
};

export const listDocumentsByCase = (owner: string, caseId: string) =>
  byOwner(db.documents.values(), owner).filter((item) => item.case_id === caseId);

export const getDocument = (owner: string, documentId: string) => getByOwner(db.documents, owner, documentId);

export const deleteDocument = (owner: string, documentId: string) => {
  const document = getDocument(owner, documentId);
  if (!document) return false;

  db.documents.delete(documentId);
  for (const version of listDocumentVersions(owner, documentId)) {
    db.documentVersions.delete(version.id);
  }

  persistMutation();
  return true;
};

export const getDocumentDetail = (owner: string, documentId: string) => {
  const document = getDocument(owner, documentId);
  if (!document) return null;
  return {
    document,
    versions: listDocumentVersions(owner, documentId),
    patient: getPatient(owner, document.patient_id),
  };
};

export const addDocumentVersion = (owner: string, documentId: string, input: { content: string; global_values: Record<string, string> }) => {
  const document = getByOwner(db.documents, owner, documentId);
  if (!document) return null;
  const existing = listDocumentVersions(owner, documentId);
  const item: ClinicalDocumentVersion = {
    id: uid(),
    owner_user_id: owner,
    created_at: now(),
    document_id: documentId,
    version: existing.length + 1,
    content: input.content,
    global_values: input.global_values,
  };
  db.documentVersions.set(item.id, item);
  persistMutation();
  return item;
};

export const listDocumentVersions = (owner: string, documentId: string) =>
  byOwner(db.documentVersions.values(), owner).filter((item) => item.document_id === documentId);

type TemplateInput = {
  title: string;
  description?: string;
  kind?: "document" | "contract";
  version: number;
  html: string;
  fields: Array<{ key: string; label: string; required?: boolean }>;
};

export const listTemplates = (owner: string) => byOwner(db.documentTemplates.values(), owner);
export const getTemplate = (owner: string, id: string) => getByOwner(db.documentTemplates, owner, id);

export const createTemplate = (owner: string, input: TemplateInput): DocumentTemplate => {
  const item: DocumentTemplate = { id: uid(), owner_user_id: owner, created_at: now(), ...input };
  db.documentTemplates.set(item.id, item);
  persistMutation();
  return item;
};

export const updateTemplate = (owner: string, id: string, input: Partial<TemplateInput>) => {
  const template = getTemplate(owner, id);
  if (!template) return null;
  Object.assign(template, input);
  db.documentTemplates.set(id, template);
  persistMutation();
  return template;
};

export const deleteTemplate = (owner: string, id: string) => {
  const template = getTemplate(owner, id);
  if (!template) return false;
  db.documentTemplates.delete(id);
  persistMutation();
  return true;
};

export const renderTemplate = (owner: string, id: string, input: {
  globals: Record<string, string>;
  fields: Record<string, string>;
  format: "html" | "pdf" | "docx";
}) => {
  const template = getTemplate(owner, id);
  if (!template) return null;
  const html = template.html.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => input.fields[key] ?? input.globals[key] ?? "");
  return { format: input.format, content: html, template_id: template.id };
};

export const createPrivateComment = (owner: string, noteId: string, content: string) => {
  const note = getByOwner(db.clinicalNotes, owner, noteId);
  if (!note) return null;
  const item = { id: uid(), owner_user_id: owner, note_id: noteId, content, created_at: now() };
  db.privateComments.set(item.id, item);
  persistMutation();
  return item;
};

export const listPrivateComments = (owner: string, noteId: string) =>
  byOwner(db.privateComments.values() as Iterable<{ owner_user_id: string; note_id: string }>, owner).filter((item) => item.note_id === noteId);

export const recordProntuarioAudit = (owner: string, action: string, resource: string, resourceId?: string) =>
  addAudit(owner, `PRONTUARIO_${action}_${resource.toUpperCase()}`, resourceId);

export const createAnonymizedCase = (owner: string, input: { title: string; summary: string; tags: string[] }) => {
  const item = { id: uid(), owner_user_id: owner, created_at: now(), ...input };
  db.anonymizedCases.set(item.id, item);
  persistMutation();
  return item;
};

export const listAnonymizedCases = (owner: string) => byOwner(db.anonymizedCases.values() as Iterable<{ owner_user_id: string }>, owner);

export const exportCase = (
  owner: string,
  patientId: string,
  options: { window_days?: number; max_sessions?: number; max_notes?: number; max_reports?: number },
) => {
  const patient = getPatient(owner, patientId);
  if (!patient) return null;
  return {
    patient,
    options,
    sessions: listPatientSessionsByReference(owner, patient.id),
    notes: listPatientClinicalNotes(owner, patient.id),
    documents: listPatientDocuments(owner, patient.id),
  };
};

export const closeCase = (
  owner: string,
  patientId: string,
  input: {
    reason: string;
    summary: string;
    next_steps: string[];
    history_policy: { window_days?: number; max_sessions?: number; max_notes?: number; max_reports?: number };
  },
) => {
  const payload = exportCase(owner, patientId, input.history_policy);
  if (!payload) return null;
  return { ...payload, close_reason: input.reason, close_summary: input.summary, next_steps: input.next_steps };
};

const defaultRetentionPolicy = (owner: string): RetentionPolicy => ({ owner_user_id: owner, clinical_record_days: 3650, audit_days: 3650, export_days: 365 });

export const getRetentionPolicy = (owner: string): RetentionPolicy =>
  (db.retentionPolicies.get(owner) as RetentionPolicy | undefined) ?? defaultRetentionPolicy(owner);

export const updateRetentionPolicy = (owner: string, input: Partial<Omit<RetentionPolicy, "owner_user_id">>) => {
  const next = { ...getRetentionPolicy(owner), ...input, owner_user_id: owner };
  db.retentionPolicies.set(owner, next);
  persistMutation();
  return next;
};

export const patchSessionStatus = (owner: string, sessionId: string, status: SessionStatus) => {
  const session = getByOwner(db.sessions, owner, sessionId);
  if (!session) return null;
  session.status = status;
  persistMutation();
  return session;
};

export const addAudio = (owner: string, sessionId: string, filePath: string) => {
  const item = {
    id: uid(),
    owner_user_id: owner,
    session_id: sessionId,
    file_path_encrypted: encrypt(filePath),
    consent_confirmed: true as const,
    expires_at: new Date(Date.now() + 30 * DAY_MS).toISOString(),
    created_at: now(),
  };
  db.audioRecords.set(item.id, item);
  persistMutation();
  return item;
};

export const storeUploadedAudio = async (
  owner: string,
  sessionId: string,
  input: { fileName?: string; mimeType?: string; base64: string },
) => {
  const uploadsRoot = path.resolve(__dirname, "../../data/uploads");
  await fs.mkdir(uploadsRoot, { recursive: true });

  const extension = input.fileName?.split(".").pop()?.trim() || (
    input.mimeType?.includes("webm") ? "webm" : input.mimeType?.includes("mp4") ? "mp4" : "bin"
  );
  const filePath = path.join(uploadsRoot, `${owner}-${sessionId}-${crypto.randomUUID()}.${extension}`);
  await fs.writeFile(filePath, Buffer.from(input.base64, "base64"));
  return addAudio(owner, sessionId, filePath);
};

export const addTranscript = (owner: string, sessionId: string, rawText: string): Transcript => {
  const item = { id: uid(), owner_user_id: owner, session_id: sessionId, raw_text: rawText, segments: [{ start: 0, end: 1, text: rawText.slice(0, 120) }], created_at: now() };
  db.transcripts.set(item.id, item);
  persistMutation();
  return item;
};

const resolveClinicalNoteContext = (owner: string, sessionId: string) => {
  const session = getByOwner(db.sessions, owner, sessionId);
  const patient = session ? getPatient(owner, session.patient_id) : null;
  const psychologist = db.users.get(owner) ?? null;
  return { session, patient, psychologist };
};

const buildClinicalNoteDocument = (
  owner: string,
  sessionId: string,
  input: { content?: string; structuredData?: ClinicalNoteStructuredData; additionalNotes?: string },
) => {
  const { session, patient, psychologist } = resolveClinicalNoteContext(owner, sessionId);
  const normalizedStructuredData = normalizeClinicalNoteStructuredData(input.structuredData)
    ?? (input.content ? parseLegacyClinicalNoteContent(input.content).structuredData : undefined);

  const content = typeof input.content === "string" && input.content.trim()
    ? input.content.trim()
    : formatClinicalNoteContent(normalizedStructuredData, {
        patient,
        psychologist,
        session,
        additionalNotes: input.additionalNotes,
      });

  return {
    content,
    structuredData: normalizedStructuredData,
  };
};

const hydrateClinicalNote = (owner: string, note: ClinicalNote): ClinicalNote => ({
  ...note,
  structuredData: note.structuredData ?? parseLegacyClinicalNoteContent(note.content).structuredData,
});

export const createClinicalNoteDraft = (
  owner: string,
  sessionId: string,
  content: string,
  structuredData?: ClinicalNoteStructuredData,
): ClinicalNote => {
  const document = buildClinicalNoteDocument(owner, sessionId, { content, structuredData });
  const note = {
    id: uid(),
    owner_user_id: owner,
    session_id: sessionId,
    content: document.content,
    structuredData: document.structuredData,
    status: "draft" as const,
    version: 1,
    created_at: now(),
  };
  db.clinicalNotes.set(note.id, note);
  persistMutation();
  return hydrateClinicalNote(owner, note);
};

export const upsertClinicalNoteDraft = (
  owner: string,
  sessionId: string,
  content: string,
  structuredData?: ClinicalNoteStructuredData,
): ClinicalNote => {
  const existingDraft = byOwner(db.clinicalNotes.values(), owner)
    .filter((note) => note.session_id === sessionId && note.status === "draft")
    .sort(compareByNewestDate)[0];

  if (!existingDraft) {
    return createClinicalNoteDraft(owner, sessionId, content, structuredData);
  }

  const document = buildClinicalNoteDocument(owner, sessionId, { content, structuredData });
  existingDraft.content = document.content;
  existingDraft.structuredData = document.structuredData;
  existingDraft.version += 1;
  persistMutation();
  return hydrateClinicalNote(owner, existingDraft);
};

export const createClinicalNote = (owner: string, input: { session_id: string; content?: string; structuredData?: ClinicalNoteStructuredData }) => {
  return createClinicalNoteDraft(owner, input.session_id, input.content ?? "", input.structuredData);
};

export const listClinicalNotes = (owner: string, filters: { sessionId?: string; patientId?: string } = {}) => {
  const notes = byOwner(db.clinicalNotes.values(), owner).filter((note) => {
    if (filters.sessionId && note.session_id !== filters.sessionId) return false;
    if (!filters.patientId) return true;

    const session = db.sessions.get(note.session_id);
    if (!session || session.owner_user_id !== owner) return false;
    const patient = getPatient(owner, filters.patientId);
    if (!patient) return session.patient_id === filters.patientId;
    return session.patient_id === patient.id || session.patient_id === patient.external_id;
  });

  return notes.sort(compareByNewestDate).map((note) => hydrateClinicalNote(owner, note));
};

export const updateClinicalNote = (
  owner: string,
  noteId: string,
  input: { content?: string; structuredData?: ClinicalNoteStructuredData },
) => {
  const note = getByOwner(db.clinicalNotes, owner, noteId);
  if (!note) return null;
  const document = buildClinicalNoteDocument(owner, note.session_id, input);
  note.content = document.content;
  note.structuredData = document.structuredData;
  note.version += 1;
  persistMutation();
  return hydrateClinicalNote(owner, note);
};

export const validateClinicalNote = (owner: string, noteId: string) => {
  const note = getByOwner(db.clinicalNotes, owner, noteId);
  if (!note) return null;
  note.status = "validated";
  note.validated_at = now();
  addTelemetry({ user_id: owner, event_type: "NOTE_VALIDATED" });
  persistMutation();
  return hydrateClinicalNote(owner, note);
};

export const createReport = (owner: string, patientId: string, purpose: ClinicalReport["purpose"], content: string, kind?: ClinicalReport["kind"]) => {
  const report = { id: uid(), owner_user_id: owner, patient_id: patientId, purpose, content, kind: kind || "session_report" as const, status: "draft" as const, created_at: now() };
  db.reports.set(report.id, report);
  persistMutation();
  return report;
};

export const updateReport = (
  owner: string,
  reportId: string,
  input: Partial<Pick<ClinicalReport, "purpose" | "content" | "status" | "kind">>,
) => {
  const report = getByOwner(db.reports, owner, reportId);
  if (!report) return null;

  if (typeof input.purpose === "string") report.purpose = input.purpose;
  if (typeof input.content === "string") report.content = input.content;
  if (input.status === "draft" || input.status === "final") report.status = input.status;
  if (input.kind === "session_report" || input.kind === "longitudinal_record") report.kind = input.kind;

  db.reports.set(report.id, report);
  persistMutation();
  return report;
};

export const createAnamnesis = (owner: string, patientId: string, templateId: string, content: Record<string, unknown>): AnamnesisResponse => {
  const anamnesis = { id: uid(), owner_user_id: owner, patient_id: patientId, template_id: templateId, content, version: 1, created_at: now() };
  db.anamnesis.set(anamnesis.id, anamnesis);
  persistMutation();
  return anamnesis;
};

export const createScaleRecord = (owner: string, scaleId: string, patientId: string, score: number): ScaleRecord => {
  const record = { id: uid(), owner_user_id: owner, scale_id: scaleId, patient_id: patientId, score, recorded_at: now(), created_at: now() };
  db.scales.set(record.id, record);
  persistMutation();
  return record;
};

const DEFAULT_FORM_TEMPLATES: Omit<FormTemplate, "owner_user_id" | "created_at">[] = [
  {
    id: "emotion-diary",
    title: "Diário emocional",
    description: "Registro breve de humor, gatilhos e acontecimentos do dia.",
    audience: "patient",
    active: true,
    fields: [
      { id: "mood", label: "Como você está se sentindo hoje? (1 = muito mal, 10 = muito bem)", type: "text", placeholder: "Ex: 7" },
      { id: "emotions", label: "Quais emoções você sentiu com mais força hoje?", type: "textarea", placeholder: "Descreva as emoções..." },
      { id: "trigger", label: "Houve algum gatilho ou situação que marcou o dia?", type: "textarea", placeholder: "Descreva o que aconteceu..." },
      { id: "body", label: "Como seu corpo está? (tensão, cansaço, dor...)", type: "textarea", placeholder: "Ex: sinto tensão nos ombros..." },
      { id: "gratitude", label: "Algo pelo qual você é grato(a) hoje?", type: "textarea", placeholder: "Opcional..." },
    ],
  },
  {
    id: "initial-anamnesis",
    title: "Anamnese inicial",
    description: "Coleta inicial de histórico pessoal, familiar e clínico.",
    audience: "patient",
    active: true,
    fields: [
      { id: "reason", label: "Qual é o principal motivo que te trouxe à terapia?", type: "textarea", placeholder: "Descreva com suas palavras..." },
      { id: "history", label: "Você já fez terapia antes? Como foi?", type: "textarea", placeholder: "Se sim, conte um pouco..." },
      { id: "family", label: "Como você descreveria seu ambiente familiar atual?", type: "textarea", placeholder: "Com quem você mora, como é a relação..." },
      { id: "health", label: "Você tem alguma condição de saúde física relevante?", type: "textarea", placeholder: "Medicamentos, diagnósticos..." },
      { id: "goals", label: "O que você espera alcançar com a terapia?", type: "textarea", placeholder: "Seus objetivos..." },
    ],
  },
  {
    id: "weekly-checkin",
    title: "Check-in semanal",
    description: "Formulário simples para acompanhar a semana entre sessões.",
    audience: "patient",
    active: true,
    fields: [
      { id: "week_mood", label: "De modo geral, como foi sua semana? (1 a 10)", type: "text", placeholder: "Ex: 6" },
      { id: "highlights", label: "O que de mais significativo aconteceu esta semana?", type: "textarea", placeholder: "Algo positivo ou desafiador..." },
      { id: "challenges", label: "Quais foram os maiores desafios?", type: "textarea", placeholder: "Situações, pensamentos, emoções..." },
      { id: "self_care", label: "Você conseguiu se cuidar esta semana? (sono, alimentação, exercício)", type: "textarea", placeholder: "Como você se saiu..." },
      { id: "next_focus", label: "O que gostaria de focar na próxima sessão?", type: "textarea", placeholder: "Temas ou questões que quer trazer..." },
    ],
  },
];

/** Ensure system defaults are seeded into db.formTemplates under a given owner. */
const seedDefaultTemplates = (owner: string) => {
  for (const tpl of DEFAULT_FORM_TEMPLATES) {
    const key = `${owner}:${tpl.id}`;
    if (!db.formTemplates.has(key)) {
      db.formTemplates.set(key, { ...tpl, id: key, owner_user_id: owner, created_at: now() });
    }
  }
};

const getOwnedFormTemplate = (owner: string, id: string): FormTemplate | null => {
  seedDefaultTemplates(owner);
  const normalizedId = id.replace(`${owner}:`, "");
  const direct = db.formTemplates.get(id);
  if (direct?.owner_user_id === owner) return direct;
  const ownerScoped = db.formTemplates.get(`${owner}:${normalizedId}`);
  if (ownerScoped?.owner_user_id === owner) return ownerScoped;
  return null;
};

const findFormAssignment = (owner: string, formId: string, patientId: string) =>
  byOwner(db.formAssignments.values(), owner).find((item) => item.form_id === formId && item.patient_id === patientId) ?? null;

const countAssignmentResponses = (assignmentId: string) =>
  Array.from(db.forms.values()).filter((item) => item.assignment_id === assignmentId).length;

const listFormEntriesForPatient = (owner: string, patientId: string, formId?: string) =>
  byOwner(db.forms.values(), owner)
    .filter((item) => item.patient_id === patientId && (!formId || item.form_id === formId))
    .sort(compareByNewestDate);

export const assignFormToPatient = (
  owner: string,
  input: {
    form_id: string;
    patient_id: string;
    mode: FormAssignmentMode;
    active?: boolean;
  },
) => {
  const form = getOwnedFormTemplate(owner, input.form_id);
  const patient = getPatient(owner, input.patient_id);
  if (!form || !patient) return null;

  const existing = findFormAssignment(owner, form.id, patient.id);
  if (existing) {
    existing.mode = input.mode;
    existing.active = input.active ?? true;
    existing.shared_at = now();
    persistMutation();
    return existing;
  }

  const assignment: FormAssignment = {
    id: uid(),
    owner_user_id: owner,
    created_at: now(),
    form_id: form.id,
    patient_id: patient.id,
    mode: input.mode,
    active: input.active ?? true,
    shared_at: now(),
  };
  db.formAssignments.set(assignment.id, assignment);
  persistMutation();
  return assignment;
};

export const updateFormAssignment = (
  owner: string,
  assignmentId: string,
  patch: Partial<Pick<FormAssignment, "active" | "mode">>,
) => {
  const assignment = getByOwner(db.formAssignments, owner, assignmentId);
  if (!assignment) return null;
  if (typeof patch.active === "boolean") assignment.active = patch.active;
  if (patch.mode === "single_use" || patch.mode === "recurring") assignment.mode = patch.mode;
  persistMutation();
  return assignment;
};

export const listFormAssignments = (
  owner: string,
  filters?: { patient_id?: string; form_id?: string; active?: boolean },
) =>
  byOwner(db.formAssignments.values(), owner)
    .filter((item) =>
      (!filters?.patient_id || item.patient_id === filters.patient_id)
      && (!filters?.form_id || item.form_id === filters.form_id)
      && (filters?.active === undefined || item.active === filters.active),
    )
    .sort(compareByNewestDate)
    .map((assignment) => {
      const form = getOwnedFormTemplate(owner, assignment.form_id);
      const patient = getPatient(owner, assignment.patient_id);
      const responseCount = countAssignmentResponses(assignment.id);
      return {
        ...assignment,
        form,
        patient,
        response_count: responseCount,
        can_submit: assignment.mode === "recurring" || responseCount === 0,
      };
    });

export const listFormsCatalog = (ownerId?: string, _audience?: string): Array<{ id: string; name: string; title: string; description?: string; fields?: unknown[] }> => {
  if (ownerId) {
    seedDefaultTemplates(ownerId);
    return Array.from(db.formTemplates.values())
      .filter((t) => t.owner_user_id === ownerId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((t) => ({ ...t, name: t.title }));
  }
  return DEFAULT_FORM_TEMPLATES.map((t) => ({ ...t, name: t.title }));
};

export const createFormTemplate = (owner: string, data: { title: string; description?: string; audience?: "patient" | "professional"; active?: boolean; cover?: FormTemplate["cover"]; fields: FormTemplate["fields"] }): FormTemplate => {
  const id = uid();
  const item: FormTemplate = {
    id,
    owner_user_id: owner,
    title: data.title,
    description: data.description,
    audience: data.audience ?? "patient",
    active: data.active ?? true,
    cover: data.cover,
    fields: data.fields ?? [],
    created_at: now(),
  };
  db.formTemplates.set(id, item);
  persistMutation();
  return item;
};

export const updateFormTemplate = (owner: string, id: string, data: Partial<Pick<FormTemplate, "title" | "description" | "audience" | "active" | "cover" | "fields">>): FormTemplate | null => {
  // Also try owner-prefixed key for seeded templates
  const item = db.formTemplates.get(id) ?? db.formTemplates.get(`${owner}:${id.replace(`${owner}:`, "")}`);
  if (!item || item.owner_user_id !== owner) return null;
  const updated: FormTemplate = {
    ...item,
    ...(data.title !== undefined && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.audience !== undefined && { audience: data.audience }),
    ...(data.active !== undefined && { active: data.active }),
    ...(data.cover !== undefined && { cover: data.cover }),
    ...(data.fields !== undefined && { fields: data.fields }),
  };
  db.formTemplates.set(item.id, updated);
  persistMutation();
  return updated;
};

export const deleteFormTemplate = (owner: string, id: string): boolean => {
  const item = db.formTemplates.get(id);
  if (!item || item.owner_user_id !== owner) return false;
  db.formTemplates.delete(id);
  for (const assignment of listFormAssignments(owner, { form_id: item.id })) {
    db.formAssignments.delete(assignment.id);
  }
  persistMutation();
  return true;
};

export const createFormEntry = (
  owner: string,
  patientId: string,
  formId: string,
  content: Record<string, unknown>,
  submittedBy: "patient" | "professional" = "professional",
): FormEntry => {
  const form = getOwnedFormTemplate(owner, formId);
  if (!form) throw new Error("FORM_TEMPLATE_NOT_FOUND");

  const patient = getPatient(owner, patientId);
  if (!patient) throw new Error("PATIENT_NOT_FOUND");

  let assignmentId: string | undefined;
  const assignment = findFormAssignment(owner, form.id, patient.id);
  if (assignment) {
    if (!assignment.active && submittedBy === "patient") {
      throw new Error("FORM_ASSIGNMENT_INACTIVE");
    }

    const responseCount = countAssignmentResponses(assignment.id);
    if (submittedBy === "patient" && assignment.mode === "single_use" && responseCount > 0) {
      throw new Error("FORM_SINGLE_USE_ALREADY_SUBMITTED");
    }

    assignment.last_submitted_at = now();
    assignmentId = assignment.id;
  } else if (submittedBy === "patient") {
    throw new Error("FORM_NOT_ASSIGNED");
  }

  const item: FormEntry = {
    id: uid(),
    owner_user_id: owner,
    patient_id: patient.id,
    form_id: form.id,
    assignment_id: assignmentId,
    content,
    submitted_by: submittedBy,
    created_at: now(),
  };
  db.forms.set(item.id, item);
  persistMutation();
  return item;
};

export const deleteFormEntry = (owner: string, entryId: string): boolean => {
  const entry = db.forms.get(entryId);
  if (!entry || entry.owner_user_id !== owner) return false;
  db.forms.delete(entryId);
  schedulePersistDatabase();
  return true;
};

export const listFormEntries = (owner: string, filters?: { patient_id?: string; form_id?: string; assignment_id?: string }) =>
  byOwner(db.forms.values(), owner)
    .filter((item) => (!filters?.patient_id || item.patient_id === filters.patient_id)
      && (!filters?.form_id || item.form_id === filters.form_id)
      && (!filters?.assignment_id || item.assignment_id === filters.assignment_id))
    .sort(compareByNewestDate);

export const listPatientAssignedForms = (access: PatientAccess) =>
  listFormAssignments(access.owner_user_id, { patient_id: access.patient_id, active: true })
    .map((assignment) => {
      const form = assignment.form;
      if (!form || !form.active || form.audience !== "patient") return null;
      const responseCount = assignment.response_count;
      return {
        ...form,
        name: form.title,
        assignment_id: assignment.id,
        mode: assignment.mode,
        shared_at: assignment.shared_at,
        last_submitted_at: assignment.last_submitted_at,
        response_count: responseCount,
        can_submit: assignment.mode === "recurring" || responseCount === 0,
      };
    })
    .filter(Boolean);

export const listPatientFormEntries = (access: PatientAccess, formId?: string) =>
  listFormEntriesForPatient(access.owner_user_id, access.patient_id, formId);

export const createFinancialEntry = (owner: string, payload: Omit<FinancialEntry, "id" | "owner_user_id" | "created_at">): FinancialEntry => {
  const item = { ...payload, id: uid(), owner_user_id: owner, created_at: now() };
  db.financial.set(item.id, item);
  persistMutation();
  return item;
};

export const updateFinancialEntry = (
  owner: string,
  entryId: string,
  patch: Partial<Pick<FinancialEntry, "amount" | "due_date" | "status" | "description" | "payment_method" | "paid_at" | "notes">>,
): FinancialEntry | undefined => {
  const current = getByOwner(db.financial, owner, entryId);
  if (!current) return undefined;

  const next: FinancialEntry = {
    ...current,
    amount: typeof patch.amount === "number" ? patch.amount : current.amount,
    due_date: typeof patch.due_date === "string" && patch.due_date.trim() ? patch.due_date : current.due_date,
    status: patch.status ?? current.status,
    description: patch.description !== undefined ? patch.description.trim() || current.description : current.description,
    payment_method: patch.payment_method !== undefined ? patch.payment_method.trim() || undefined : current.payment_method,
    notes: patch.notes !== undefined ? patch.notes.trim() || undefined : current.notes,
    paid_at:
      patch.status === "paid"
        ? typeof patch.paid_at === "string" && patch.paid_at.trim()
          ? patch.paid_at
          : current.paid_at ?? now()
        : patch.status === "open"
          ? undefined
          : patch.paid_at !== undefined
            ? patch.paid_at.trim() || undefined
            : current.paid_at,
  };

  db.financial.set(next.id, next);
  persistMutation();
  return next;
};

export const buildFinanceSummary = (owner: string, referenceDate = new Date()) => {
  const monthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
  const entries = byOwner(db.financial.values(), owner)
    .filter((entry) => entry.due_date?.startsWith(monthKey))
    .sort(compareByNewestDate);

  const receivables = entries.filter((entry) => entry.type === "receivable");
  const paidSessions = receivables.filter((entry) => entry.status === "paid").length;
  const pendingSessions = receivables.filter((entry) => entry.status !== "paid").length;
  const totalPerMonth = receivables
    .filter((entry) => entry.status === "paid")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    month: monthKey,
    paid_sessions: paidSessions,
    pending_sessions: pendingSessions,
    total_per_month: totalPerMonth,
    entries,
  };
};

export const createJob = (owner: string, type: JobType, resourceId?: string): Job => {
  const item = { id: uid(), owner_user_id: owner, type, status: "queued" as JobStatus, progress: 0, resource_id: resourceId, created_at: now(), updated_at: now() };
  db.jobs.set(item.id, item);
  persistMutation();
  return item;
};

export const getJob = (owner: string, jobId: string) => getByOwner(db.jobs, owner, jobId);

const getSessionSequenceNumber = (owner: string, session: ClinicalSession) => {
  const patient = getPatient(owner, session.patient_id);
  const patientSessions = byOwner(db.sessions.values(), owner)
    .filter((item) => {
      if (!patient) return item.patient_id === session.patient_id;
      return item.patient_id === patient.id || item.patient_id === patient.external_id;
    })
    .sort(compareByOldestDate);

  const index = patientSessions.findIndex((item) => item.id === session.id);
  return index >= 0 ? index + 1 : patientSessions.length + 1;
};

const createStructuredDraftForTranscript = async (job: Job, session: ClinicalSession, rawText: string) => {
  const sessionNumber = getSessionSequenceNumber(job.owner_user_id, session);
  const patient = getPatient(job.owner_user_id, session.patient_id);
  const psychologist = db.users.get(job.owner_user_id) ?? null;

  try {
    const structuredDraft = await generateClinicalNote(rawText, session);
    const structuredData: ClinicalNoteStructuredData = {
      complaint: structuredDraft.mainComplaint,
      context: structuredDraft.context,
      soap: {
        subjective: structuredDraft.soap.subjective,
        objective: structuredDraft.soap.objective,
        assessment: structuredDraft.soap.assessment,
        plan: structuredDraft.soap.plan,
      },
      events: structuredDraft.highlights.join("\n"),
    };
    const note = upsertClinicalNoteDraft(
      job.owner_user_id,
      session.id,
      formatClinicalNoteContent(structuredData, {
        patient,
        psychologist,
        session,
      }),
      structuredData,
    );
    addTelemetry({ user_id: job.owner_user_id, event_type: "CLINICAL_NOTE_DRAFT_GENERATED" });
    return note;
  } catch (error) {
    const note = upsertClinicalNoteDraft(
      job.owner_user_id,
      session.id,
      formatClinicalNoteContent(
        {
          context: rawText,
          soap: {
            subjective: "Rascunho estruturado indisponível no momento. Revisar a transcrição original.",
            objective: "Sem extração automática confiável de dados observáveis.",
            assessment: "Interpretação clínica não automatizada. Completar manualmente.",
            plan: "Definir próximos passos após revisão manual.",
          },
        },
        {
          patient,
          psychologist,
          session,
          additionalNotes: rawText,
        },
      ),
    );
    addTelemetry({
      user_id: job.owner_user_id,
      event_type: "CLINICAL_NOTE_DRAFT_FALLBACK",
      error_code: error instanceof Error ? error.name : "CLINICAL_NOTE_GENERATION_FAILED",
    });
    return note;
  }
};

export const runJob = async (jobId: string, options: { rawText?: string }) => {
  const job = db.jobs.get(jobId);
  if (!job) return;

  try {
    job.status = "running";
    job.progress = 0.5;
    job.updated_at = now();
    persistMutation();
    await new Promise((resolve) => setTimeout(resolve, 20));

    if (job.type === "transcription" && job.resource_id) {
      const latestAudio = byOwner(db.audioRecords.values(), job.owner_user_id)
        .filter((item) => item.session_id === job.resource_id)
        .sort(compareByNewestDate)[0];

      let rawText = options.rawText ?? "";
      let segments = [{ start: 0, end: 1, text: rawText.slice(0, 120) }];

      if (!rawText && latestAudio) {
        const audioPath = decryptPath(latestAudio.file_path_encrypted);
        const transcription = await runWhisperLocally(audioPath);
        rawText = transcription.full_text?.trim() || "";
        segments = (transcription.segments ?? [])
          .filter((segment) => typeof segment.text === "string" && segment.text.trim())
          .map((segment) => ({
            start: segment.start ?? 0,
            end: segment.end ?? 0,
            text: segment.text?.trim() ?? "",
          }));
        await fs.unlink(audioPath).catch(() => {});
      }

      const transcript = addTranscript(job.owner_user_id, job.resource_id, rawText || "");
      transcript.segments = segments.length > 0 ? segments : transcript.segments;
      const session = getByOwner(db.sessions, job.owner_user_id, job.resource_id);
      if (session) {
        const draftNote = await createStructuredDraftForTranscript(job, session, transcript.raw_text);
        job.draft_note_id = draftNote.id;
      }
      job.result_uri = `transcript:${transcript.id}`;
      addTelemetry({ user_id: job.owner_user_id, event_type: "TRANSCRIPTION_JOB_COMPLETED", duration_ms: Math.max(60_000, rawText.length * 1_000) });
    }
    if (job.type === "export") {
      job.result_uri = `vault://exports/${job.owner_user_id}.enc`;
      addTelemetry({ user_id: job.owner_user_id, event_type: "EXPORT_PDF" });
    }
    if (job.type === "backup") {
      job.result_uri = `vault://backup/${job.owner_user_id}.enc`;
      addTelemetry({ user_id: job.owner_user_id, event_type: "BACKUP_CREATED" });
    }

    job.status = "completed";
    job.progress = 1;
    job.updated_at = now();
    persistMutation();
  } catch (error) {
    job.status = "failed";
    job.error_code = error instanceof Error ? error.message : "TRANSCRIPTION_FAILED";
    job.updated_at = now();
    persistMutation();
  }
};

export const handleTranscriberWebhook = (jobId: string, status: JobStatus, errorCode?: string) => {
  const job = db.jobs.get(jobId);
  if (!job) return null;
  job.status = status;
  job.progress = status === "completed" ? 1 : job.progress;
  job.error_code = errorCode;
  job.updated_at = now();
  persistMutation();
  return job;
};

export const paginate = <T>(items: T[], page = 1, pageSize = 20) => ({
  items: items.slice((page - 1) * pageSize, page * pageSize),
  page,
  page_size: pageSize,
  total: items.length,
});

export const purgeUserData = (owner: string) => {
  const ownedMaps: Array<Map<string, { owner_user_id: string }>> = [
    db.patients,
    db.sessions,
    db.audioRecords,
    db.transcripts,
    db.clinicalNotes,
    db.reports,
    db.anamnesis,
    db.scales,
    db.forms,
    db.financial,
    db.jobs,
    db.patientDiaryEntries,
    db.patientMessages,
  ];
  for (const map of ownedMaps) {
    for (const [id, item] of map.entries()) {
      if (item.owner_user_id === owner) map.delete(id);
    }
  }

  for (const [id, item] of db.telemetry.entries()) {
    if (item.user_id === owner) db.telemetry.delete(id);
  }

  for (const [id, item] of db.audit.entries()) {
    if (item.actor_user_id === owner || item.target_user_id === owner) db.audit.delete(id);
  }

  for (const [token, item] of db.sessionsTokens.entries()) {
    if (item.user_id === owner) db.sessionsTokens.delete(token);
  }

  db.localEntitlements.delete(owner);

  for (const [queueOwner, queue] of db.telemetryQueue.entries()) {
    if (queueOwner === owner) {
      db.telemetryQueue.delete(queueOwner);
      continue;
    }
    db.telemetryQueue.set(queueOwner, queue.filter((event) => event.user_id !== owner));
  }
  persistMutation();
};

export const adminOverviewMetrics = () => ({
  users_total: db.users.size,
  users_active: Array.from(db.users.values()).filter((item) => item.status === "active").length,
  jobs_total: db.jobs.size,
  error_events: Array.from(db.telemetry.values()).filter((item) => Boolean(item.error_code)).length,
});

const defaultEntitlements: LocalEntitlementSnapshot["entitlements"] = {
  exports_enabled: true,
  backup_enabled: true,
  forms_enabled: true,
  scales_enabled: true,
  finance_enabled: true,
  transcription_minutes_per_month: 0,
  max_patients: 200,
  max_sessions_per_month: 10,
};

const getCurrentMonthWindow = (referenceDate = new Date()) => {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  return { start, end };
};

export const syncLocalEntitlements = (owner: string, snapshot: {
  entitlements?: Partial<LocalEntitlementSnapshot["entitlements"]>;
  source_subscription_status?: LocalEntitlementSnapshot["source_subscription_status"];
  grace_until?: string;
  last_successful_subscription_validation_at?: string;
}) => {
  const previous = db.localEntitlements.get(owner);
  const value: LocalEntitlementSnapshot = {
    user_id: owner,
    entitlements: { ...defaultEntitlements, ...(previous?.entitlements ?? {}), ...(snapshot.entitlements ?? {}) },
    source_subscription_status: snapshot.source_subscription_status ?? previous?.source_subscription_status ?? "none",
    last_entitlements_sync_at: now(),
    last_successful_subscription_validation_at:
      snapshot.last_successful_subscription_validation_at
      ?? previous?.last_successful_subscription_validation_at,
    grace_until: snapshot.grace_until ?? previous?.grace_until,
  };
  db.localEntitlements.set(owner, value);
  persistMutation();
  return value;
};

export const resolveLocalEntitlements = (owner: string) => db.localEntitlements.get(owner) ?? syncLocalEntitlements(owner, { source_subscription_status: "none" });

const transcriptionMinutesUsedThisMonth = (owner: string) => {
  const { start, end } = getCurrentMonthWindow();
  return Array.from(db.telemetry.values())
    .filter((event) => {
      if (event.user_id !== owner || !event.event_type.includes("TRANSCRIPTION")) return false;
      const ts = new Date(event.ts);
      return ts >= start && ts < end;
    })
    .reduce((acc, item) => acc + Math.ceil((item.duration_ms ?? 0) / 60_000), 0);
};

export const canUseFeature = (owner: string, feature: "transcription" | "new_session" | "export" | "backup" | "forms" | "scales" | "finance") => {
  const entitlements = resolveLocalEntitlements(owner);
  const graceFromLastValidation = entitlements.last_successful_subscription_validation_at
    ? Date.parse(entitlements.last_successful_subscription_validation_at) + 14 * DAY_MS
    : 0;
  const withinGrace = Date.now() <= graceFromLastValidation
    || (Boolean(entitlements.grace_until) && Date.parse(entitlements.grace_until as string) > Date.now());

  if (feature === "export") return entitlements.entitlements.exports_enabled;
  if (feature === "backup") return entitlements.entitlements.backup_enabled;

  if (["past_due", "canceled"].includes(entitlements.source_subscription_status) && !withinGrace) return false;

  if (feature === "new_session") {
    const { start, end } = getCurrentMonthWindow();
    const monthlyCount = byOwner(db.sessions.values(), owner)
      .filter((item) => {
        const createdAt = new Date(item.created_at);
        return createdAt >= start && createdAt < end;
      })
      .length;
    return monthlyCount < entitlements.entitlements.max_sessions_per_month;
  }

  if (feature === "transcription") {
    return transcriptionMinutesUsedThisMonth(owner) < entitlements.entitlements.transcription_minutes_per_month;
  }

  if (feature === "forms") return entitlements.entitlements.forms_enabled;
  if (feature === "scales") return entitlements.entitlements.scales_enabled;
  if (feature === "finance") return entitlements.entitlements.finance_enabled;
  return false;
};

export const listSessionClinicalNotes = (owner: string, sessionId: string) =>
  byOwner(db.clinicalNotes.values(), owner)
    .filter((item) => item.session_id === sessionId)
    .sort(compareByNewestDate)
    .map((note) => hydrateClinicalNote(owner, note));

export const getLatestTranscriptForSession = (owner: string, sessionId: string) =>
  byOwner(db.transcripts.values(), owner)
    .filter((item) => item.session_id === sessionId)
    .sort(compareByNewestDate)[0] ?? null;
export const getClinicalNote = (owner: string, noteId: string) => {
  const note = getByOwner(db.clinicalNotes, owner, noteId);
  return note ? hydrateClinicalNote(owner, note) : null;
};
export const listScales = () => Array.from(db.scaleTemplates.values());
export const getReport = (owner: string, reportId: string) => getByOwner(db.reports, owner, reportId);

// Therapeutic Goals
export const listGoals = (owner: string, patientId: string): TherapeuticGoal[] =>
  byOwner(db.therapeuticGoals.values(), owner)
    .filter((g) => g.patient_id === patientId)
    .sort(compareByNewestDate);

export const createGoal = (owner: string, patientId: string, title: string, description?: string): TherapeuticGoal => {
  const goal: TherapeuticGoal = {
    id: uid(), owner_user_id: owner, patient_id: patientId,
    title, description,
    status: "active", progress: 0, milestones: [],
    created_at: now(),
  };
  db.therapeuticGoals.set(goal.id, goal);
  persistMutation();
  return goal;
};

export const updateGoal = (
  owner: string,
  goalId: string,
  patch: Partial<Pick<TherapeuticGoal, "title" | "description" | "status" | "progress" | "milestones">>,
): TherapeuticGoal | null => {
  const goal = getByOwner(db.therapeuticGoals, owner, goalId);
  if (!goal) return null;
  const updated: TherapeuticGoal = {
    ...goal,
    ...patch,
    achieved_at: patch.status === "achieved" && goal.status !== "achieved" ? now() : goal.achieved_at,
  };
  db.therapeuticGoals.set(goalId, updated);
  persistMutation();
  return updated;
};

export const deleteGoal = (owner: string, goalId: string): boolean => {
  const goal = getByOwner(db.therapeuticGoals, owner, goalId);
  if (!goal) return false;
  db.therapeuticGoals.delete(goalId);
  persistMutation();
  return true;
};

// Homework Tasks
const isoWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const listHomework = (owner: string, patientId: string): HomeworkTask[] =>
  byOwner(db.homeworkTasks.values(), owner)
    .filter((t) => t.patient_id === patientId)
    .sort(compareByNewestDate);

export const createHomework = (owner: string, patientId: string, title: string, description?: string, due_date?: string): HomeworkTask => {
  const task: HomeworkTask = {
    id: uid(), owner_user_id: owner, patient_id: patientId,
    title, description, due_date,
    completed: false,
    week_number: isoWeekNumber(new Date()),
    created_at: now(),
  };
  db.homeworkTasks.set(task.id, task);
  persistMutation();
  return task;
};

export const updateHomework = (
  owner: string,
  taskId: string,
  patch: Partial<Pick<HomeworkTask, "title" | "description" | "due_date" | "completed">>,
): HomeworkTask | null => {
  const task = getByOwner(db.homeworkTasks, owner, taskId);
  if (!task) return null;
  const updated: HomeworkTask = {
    ...task,
    ...patch,
    completed_at: patch.completed && !task.completed ? now() : task.completed_at,
  };
  db.homeworkTasks.set(taskId, updated);
  persistMutation();
  return updated;
};

export const deleteHomework = (owner: string, taskId: string): boolean => {
  const task = getByOwner(db.homeworkTasks, owner, taskId);
  if (!task) return false;
  db.homeworkTasks.delete(taskId);
  persistMutation();
  return true;
};

// Calcula due_date baseado em payment_timing e preferred_payment_day
export const calculateDueDate = (sessionAt: string, billing: PatientBilling): string => {
  const sessionDate = new Date(sessionAt);
  if (billing.payment_timing === "advance") {
    return sessionDate.toISOString().split("T")[0];
  }
  if (billing.preferred_payment_day) {
    const day = billing.preferred_payment_day;
    const candidate = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), day);
    if (candidate <= sessionDate) {
      candidate.setMonth(candidate.getMonth() + 1);
    }
    return candidate.toISOString().split("T")[0];
  }
  const fallback = new Date(sessionDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  return fallback.toISOString().split("T")[0];
};

export type BillingGenerationResult =
  | { pending_billing: false }
  | { pending_billing: true; suggested_amount: number; suggested_due_date: string };

export const generateSessionBilling = (
  owner: string,
  session: ClinicalSession,
): BillingGenerationResult => {
  const patient = getPatient(owner, session.patient_id);
  if (!patient?.billing?.session_price) return { pending_billing: false };

  const dueDate = calculateDueDate(session.scheduled_at, patient.billing);

  if (patient.billing.billing_auto_charge) {
    createFinancialEntry(owner, {
      patient_id: patient.id,
      session_id: session.id,
      type: "receivable",
      amount: patient.billing.session_price,
      due_date: dueDate,
      status: "open",
      description: `Sessão ${new Date(session.scheduled_at).toLocaleDateString("pt-BR")}`,
    });
    return { pending_billing: false };
  }

  return {
    pending_billing: true,
    suggested_amount: patient.billing.session_price,
    suggested_due_date: dueDate,
  };
};

export type FinancialSummary = {
  overdue_count: number;
  overdue_total: number;
  due_soon_count: number;
};

export const getFinancialSummary = (owner: string): FinancialSummary => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  let overdue_count = 0;
  let overdue_total = 0;
  let due_soon_count = 0;

  for (const entry of db.financial.values()) {
    if (entry.owner_user_id !== owner) continue;
    if (entry.status !== "open") continue;
    const due = new Date(entry.due_date + (entry.due_date.length === 10 ? "T12:00:00" : ""));
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      overdue_count++;
      overdue_total += entry.amount;
    } else if (due <= sevenDaysFromNow) {
      due_soon_count++;
    }
  }

  return { overdue_count, overdue_total, due_soon_count };
};

export const generateNextSession = (owner: string, completedSession: ClinicalSession): ClinicalSession | null => {
  if (!completedSession.recurrence || !completedSession.series_id) return null;

  const rule = completedSession.recurrence;

  // Check if a future session already exists for this series
  const existingFuture = Array.from(db.sessions.values()).find(
    (s) =>
      s.owner_user_id === owner &&
      s.series_id === completedSession.series_id &&
      s.id !== completedSession.id &&
      new Date(s.scheduled_at) > new Date(),
  );
  if (existingFuture) return null;

  const currentDate = new Date(completedSession.scheduled_at);
  let nextDate: Date;

  if (rule.type === "weekly") {
    nextDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (rule.type === "biweekly") {
    nextDate = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  } else {
    // 2x-week: find next day from rule.days after the current day
    const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const currentDayIdx = currentDate.getDay();
    const ruleDayIdxes = rule.days.map((d) => dayOrder.indexOf(d)).sort((a, b) => a - b);
    const nextIdx = ruleDayIdxes.find((idx) => idx > currentDayIdx) ?? ruleDayIdxes[0];
    const diff = nextIdx > currentDayIdx ? nextIdx - currentDayIdx : 7 - currentDayIdx + nextIdx;
    nextDate = new Date(currentDate.getTime() + diff * 24 * 60 * 60 * 1000);
  }

  const [hours, minutes] = rule.time.split(":").map(Number);
  nextDate.setHours(hours, minutes, 0, 0);

  const next: ClinicalSession = {
    id: uid(),
    owner_user_id: owner,
    patient_id: completedSession.patient_id,
    scheduled_at: nextDate.toISOString(),
    status: "scheduled",
    duration_minutes: rule.duration_minutes,
    recurrence: rule,
    series_id: completedSession.series_id,
    is_series_anchor: false,
    event_type: "session",
    created_at: now(),
  };

  db.sessions.set(next.id, next);
  persistMutation();
  return next;
};

export const listSuggestions = (owner: string, weekStart: string): CalendarSuggestion[] => {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const suggestions: CalendarSuggestion[] = [];

  // --- Source "rule": series with explicit recurrence ---
  const seriesMap = new Map<string, ClinicalSession>();
  for (const s of db.sessions.values()) {
    if (s.owner_user_id !== owner) continue;
    if (!s.recurrence || !s.series_id) continue;
    const existing = seriesMap.get(s.series_id);
    if (!existing || new Date(s.scheduled_at) > new Date(existing.scheduled_at)) {
      seriesMap.set(s.series_id, s);
    }
  }

  for (const [seriesId, anchor] of seriesMap) {
    const rule = anchor.recurrence!;
    const alreadyThisWeek = Array.from(db.sessions.values()).some(
      (s) =>
        s.owner_user_id === owner &&
        s.series_id === seriesId &&
        new Date(s.scheduled_at) >= start &&
        new Date(s.scheduled_at) < end,
    );
    if (alreadyThisWeek) continue;

    const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDays = rule.days.map((d) => dayOrder.indexOf(d));
    const [hours, minutes] = rule.time.split(":").map(Number);

    for (const dayIdx of targetDays) {
      const candidate = new Date(start);
      while (candidate.getDay() !== dayIdx && candidate < end) {
        candidate.setDate(candidate.getDate() + 1);
      }
      if (candidate >= end) continue;
      candidate.setHours(hours, minutes, 0, 0);

      const patient = db.patients.get(anchor.patient_id);
      const recurrenceLabel =
        rule.type === "weekly" ? "semanal" : rule.type === "biweekly" ? "quinzenal" : "2× semana";

      suggestions.push({
        patient_id: anchor.patient_id,
        patient_name: patient?.label ?? anchor.patient_id,
        suggested_at: candidate.toISOString(),
        duration_minutes: rule.duration_minutes,
        source: "rule",
        series_id: seriesId,
        recurrence_type: recurrenceLabel,
      });
    }
  }

  // --- Source "pattern": patients WITHOUT explicit recurrence ---
  const patientSessions = new Map<string, ClinicalSession[]>();
  for (const s of db.sessions.values()) {
    if (s.owner_user_id !== owner) continue;
    if (s.recurrence) continue;
    if (s.status !== "completed") continue;
    if (!s.patient_id) continue;
    const list = patientSessions.get(s.patient_id) ?? [];
    list.push(s);
    patientSessions.set(s.patient_id, list);
  }

  for (const [patientId, sessions] of patientSessions) {
    const sorted = sessions
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
      .slice(0, 12);
    if (sorted.length < 3) continue;

    const days = sorted.map((s) => dayOfWeekName(s.scheduled_at));
    const dayModal = modeOf(days);
    if (!dayModal) continue;

    const times = sorted.map((s) => timeOfDay(s.scheduled_at));
    const timeModal = modeOf(times);
    if (!timeModal) continue;

    const matching = sorted.filter(
      (s) => dayOfWeekName(s.scheduled_at) === dayModal && timeOfDay(s.scheduled_at) === timeModal,
    );
    const confidence = Math.round((matching.length / sorted.length) * 100);
    if (confidence < 70) continue;

    const alreadyThisWeek = Array.from(db.sessions.values()).some(
      (s) =>
        s.owner_user_id === owner &&
        s.patient_id === patientId &&
        !s.recurrence &&
        new Date(s.scheduled_at) >= start &&
        new Date(s.scheduled_at) < end,
    );
    if (alreadyThisWeek) continue;

    const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDayIdx = dayOrder.indexOf(dayModal);
    const candidate = new Date(start);
    while (candidate.getDay() !== targetDayIdx && candidate < end) {
      candidate.setDate(candidate.getDate() + 1);
    }
    if (candidate >= end) continue;

    const [hours, minutes] = timeModal.split(":").map(Number);
    candidate.setHours(hours, minutes, 0, 0);

    const patient = db.patients.get(patientId);
    suggestions.push({
      patient_id: patientId,
      patient_name: patient?.label ?? patientId,
      suggested_at: candidate.toISOString(),
      duration_minutes: sorted[0].duration_minutes ?? 50,
      source: "pattern",
      confidence,
    });
  }

  return suggestions;
};
