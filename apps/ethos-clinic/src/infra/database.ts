import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  AnamnesisResponse,
  AuditEvent,
  AudioRecord,
  ClinicalNote,
  ClinicalReport,
  ClinicalSession,
  ClinicalDocument,
  ClinicalDocumentVersion,
  FinancialEntry,
  FormEntry,
  FormTemplate,
  Invite,
  Job,
  NotificationConsent,
  NotificationLog,
  NotificationSchedule,
  NotificationTemplate,
  EmotionalDiaryEntry,
  PatientAsyncMessage,
  Patient,
  SessionToken,
  TelemetryEvent,
  Transcript,
  User,
  LocalEntitlementSnapshot,
  ScaleTemplate,
  ScaleRecord,
  ObservabilityAlert,
  DocumentTemplate,
  PatientNotification,
  AvailabilityBlock,
  SlotRequest,
} from "../domain/types";

const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const calculated = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(calculated));
};

export const hashInviteToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const encrypt = (raw: string) => `enc:${Buffer.from(raw).toString("base64")}`;

const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_IDEMPOTENCY_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export type IdempotencyRecord = {
  statusCode: number;
  body: unknown;
  createdAt: string;
  expiresAt: number;
};

export const IDEMPOTENCY_TTL_MS = Number(process.env.IDEMPOTENCY_TTL_MS ?? DEFAULT_IDEMPOTENCY_TTL_MS);
const IDEMPOTENCY_CLEANUP_INTERVAL_MS = Number(process.env.IDEMPOTENCY_CLEANUP_INTERVAL_MS ?? DEFAULT_IDEMPOTENCY_CLEANUP_INTERVAL_MS);

export const db = {
  users: new Map<string, User>(),
  invites: new Map<string, Invite>(),
  sessionsTokens: new Map<string, SessionToken>(),

  patients: new Map<string, Patient>(),
  sessions: new Map<string, ClinicalSession>(),
  audioRecords: new Map<string, AudioRecord>(),
  transcripts: new Map<string, Transcript>(),
  clinicalNotes: new Map<string, ClinicalNote>(),
  reports: new Map<string, ClinicalReport>(),
  anamnesis: new Map<string, AnamnesisResponse>(),
  scales: new Map<string, ScaleRecord>(),
  forms: new Map<string, FormEntry>(),
  formTemplates: new Map<string, FormTemplate>(),
  financial: new Map<string, FinancialEntry>(),
  jobs: new Map<string, Job>(),
  documents: new Map<string, ClinicalDocument>(),
  documentVersions: new Map<string, ClinicalDocumentVersion>(),
  documentTemplates: new Map<string, DocumentTemplate>(),
  contracts: new Map<string, Record<string, unknown>>(),
  patientAccess: new Map<string, Record<string, unknown>>(),
  privateComments: new Map<string, Record<string, unknown>>(),
  anonymizedCases: new Map<string, Record<string, unknown>>(),
  retentionPolicies: new Map<string, Record<string, unknown>>(),
  patientDiaryEntries: new Map<string, EmotionalDiaryEntry>(),
  patientMessages: new Map<string, PatientAsyncMessage>(),
  localEntitlements: new Map<string, LocalEntitlementSnapshot>(),
  scaleTemplates: new Map<string, ScaleTemplate>(),
  notificationTemplates: new Map<string, NotificationTemplate>(),
  notificationConsents: new Map<string, NotificationConsent>(),
  notificationSchedules: new Map<string, NotificationSchedule>(),
  notificationLogs: new Map<string, NotificationLog>(),
  patientNotifications: new Map<string, PatientNotification>(),
  availabilityBlocks: new Map<string, AvailabilityBlock>(),
  slotRequests: new Map<string, SlotRequest>(),

  telemetry: new Map<string, TelemetryEvent>(),
  telemetryQueue: new Map<string, Array<TelemetryEvent>>(),
  audit: new Map<string, AuditEvent>(),
  observabilityAlerts: new Map<string, ObservabilityAlert>(),
  idempotency: new Map<string, IdempotencyRecord>(),
};

type PersistedDatabaseState = {
  version: 1;
  users: User[];
  invites: Invite[];
  sessionsTokens: SessionToken[];
  patients: Patient[];
  sessions: ClinicalSession[];
  audioRecords: AudioRecord[];
  transcripts: Transcript[];
  clinicalNotes: ClinicalNote[];
  reports: ClinicalReport[];
  anamnesis: AnamnesisResponse[];
  scales: ScaleRecord[];
  forms: FormEntry[];
  formTemplates: FormTemplate[];
  financial: FinancialEntry[];
  jobs: Job[];
  documents: ClinicalDocument[];
  documentVersions: ClinicalDocumentVersion[];
  documentTemplates: DocumentTemplate[];
  patientAccess: Array<Record<string, unknown>>;
  patientDiaryEntries: EmotionalDiaryEntry[];
  localEntitlements: LocalEntitlementSnapshot[];
  patientNotifications: PatientNotification[];
  availabilityBlocks: AvailabilityBlock[];
  slotRequests: SlotRequest[];
  telemetry: TelemetryEvent[];
  audit: AuditEvent[];
};

const persistenceEnabled = process.env.ETHOS_DISABLE_PERSISTENCE !== "1" && !process.execArgv.includes("--test");
const dataDirectory = path.resolve(__dirname, "../../data");
const dataFile = path.join(dataDirectory, "clinic-data.json");

const restoreMap = <T>(
  map: Map<string, T>,
  items: T[] | undefined,
  keySelector: (item: T) => string,
) => {
  map.clear();
  for (const item of items ?? []) {
    map.set(keySelector(item), item);
  }
};

const loadPersistedDatabase = () => {
  if (!persistenceEnabled || !existsSync(dataFile)) return;

  try {
    const raw = readFileSync(dataFile, "utf-8");
    const snapshot = JSON.parse(raw) as Partial<PersistedDatabaseState>;

    restoreMap(db.users, snapshot.users, (item) => item.id);
    restoreMap(db.invites, snapshot.invites, (item) => item.id);
    restoreMap(db.sessionsTokens, snapshot.sessionsTokens, (item) => item.token);
    restoreMap(db.patients, snapshot.patients, (item) => item.id);
    restoreMap(db.sessions, snapshot.sessions, (item) => item.id);
    restoreMap(db.audioRecords, snapshot.audioRecords, (item) => item.id);
    restoreMap(db.transcripts, snapshot.transcripts, (item) => item.id);
    restoreMap(db.clinicalNotes, snapshot.clinicalNotes, (item) => item.id);
    restoreMap(db.reports, snapshot.reports, (item) => item.id);
    restoreMap(db.anamnesis, snapshot.anamnesis, (item) => item.id);
    restoreMap(db.scales, snapshot.scales, (item) => item.id);
    restoreMap(db.forms, snapshot.forms, (item) => item.id);
    restoreMap(db.formTemplates, snapshot.formTemplates, (item) => item.id);
    restoreMap(db.financial, snapshot.financial, (item) => item.id);
    restoreMap(db.jobs, snapshot.jobs, (item) => item.id);
    restoreMap(db.documents, snapshot.documents, (item) => item.id);
    restoreMap(db.documentVersions, snapshot.documentVersions, (item) => item.id);
    restoreMap(db.documentTemplates, snapshot.documentTemplates, (item) => item.id);
    restoreMap(db.patientAccess, snapshot.patientAccess, (item) => String((item as { id?: string }).id ?? uid()));
    restoreMap(db.patientDiaryEntries, snapshot.patientDiaryEntries, (item) => item.id);
    restoreMap(db.localEntitlements, snapshot.localEntitlements, (item) => item.user_id);
    restoreMap(db.patientNotifications, snapshot.patientNotifications, (item) => item.id);
    restoreMap(db.availabilityBlocks, snapshot.availabilityBlocks, (item) => item.id);
    restoreMap(db.slotRequests, snapshot.slotRequests, (item) => item.id);
    restoreMap(db.telemetry, snapshot.telemetry, (item) => item.id);
    restoreMap(db.audit, snapshot.audit, (item) => item.id);
  } catch (error) {
    process.stderr.write(`Failed to load persisted ETHOS clinic data: ${String(error)}\n`);
  }
};

const buildPersistedSnapshot = (): PersistedDatabaseState => ({
  version: 1,
  users: Array.from(db.users.values()),
  invites: Array.from(db.invites.values()),
  sessionsTokens: Array.from(db.sessionsTokens.values()),
  patients: Array.from(db.patients.values()),
  sessions: Array.from(db.sessions.values()),
  audioRecords: Array.from(db.audioRecords.values()),
  transcripts: Array.from(db.transcripts.values()),
  clinicalNotes: Array.from(db.clinicalNotes.values()),
  reports: Array.from(db.reports.values()),
  anamnesis: Array.from(db.anamnesis.values()),
  scales: Array.from(db.scales.values()),
  forms: Array.from(db.forms.values()),
  formTemplates: Array.from(db.formTemplates.values()).filter((item) => item.owner_user_id !== "system"),
  financial: Array.from(db.financial.values()),
  jobs: Array.from(db.jobs.values()),
  documents: Array.from(db.documents.values()),
  documentVersions: Array.from(db.documentVersions.values()),
  documentTemplates: Array.from(db.documentTemplates.values()).filter((item) => item.owner_user_id !== "system"),
  patientAccess: Array.from(db.patientAccess.values()),
  patientDiaryEntries: Array.from(db.patientDiaryEntries.values()),
  localEntitlements: Array.from(db.localEntitlements.values()),
  patientNotifications: Array.from(db.patientNotifications.values()),
  availabilityBlocks: Array.from(db.availabilityBlocks.values()),
  slotRequests: Array.from(db.slotRequests.values()),
  telemetry: Array.from(db.telemetry.values()),
  audit: Array.from(db.audit.values()),
});

export const persistDatabaseNow = () => {
  if (!persistenceEnabled) return;

  mkdirSync(dataDirectory, { recursive: true });
  writeFileSync(dataFile, JSON.stringify(buildPersistedSnapshot(), null, 2), "utf-8");
};

let persistTimer: NodeJS.Timeout | null = null;

export const schedulePersistDatabase = () => {
  if (!persistenceEnabled) return;

  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistDatabaseNow();
  }, 25);
  persistTimer.unref?.();
};

loadPersistedDatabase();

const cleanupExpiredIdempotency = (at = Date.now()) => {
  for (const [key, entry] of db.idempotency.entries()) {
    if (entry.expiresAt <= at) db.idempotency.delete(key);
  }
};

export const getIdempotencyEntry = (key: string, at = Date.now()) => {
  cleanupExpiredIdempotency(at);
  const entry = db.idempotency.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= at) {
    db.idempotency.delete(key);
    return null;
  }
  return entry;
};

export const setIdempotencyEntry = (key: string, value: Omit<IdempotencyRecord, "expiresAt">, ttlMs = IDEMPOTENCY_TTL_MS, at = Date.now()) => {
  cleanupExpiredIdempotency(at);
  db.idempotency.set(key, { ...value, expiresAt: at + ttlMs });
};

setInterval(() => cleanupExpiredIdempotency(), IDEMPOTENCY_CLEANUP_INTERVAL_MS).unref();

const ensureSeedUser = (input: { email: string; name: string; password: string; role: User["role"] }) => {
  const existing = Array.from(db.users.values()).find((item) => item.email.toLowerCase() === input.email.toLowerCase());
  if (existing) return existing.id;

  const id = uid();
  db.users.set(id, {
    id,
    email: input.email,
    name: input.name,
    password_hash: hashPassword(input.password),
    role: input.role,
    status: "active",
    created_at: now(),
  });
  return id;
};

const ensureClinicalEntitlements = (userId: string) => {
  if (db.localEntitlements.has(userId)) return;

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

let camilaId = "";
const PREFERRED_LOCAL_CLINICIAN_EMAIL = "psi.camilafreitas@gmail.com";
const PREFERRED_LOCAL_CLINICIAN_PASSWORD = "admin123";
const LEGACY_LOCAL_CLINICIAN_EMAIL = "camila@ethos.local";

const seedBaseData = () => {
  camilaId = ensureSeedUser({
    email: LEGACY_LOCAL_CLINICIAN_EMAIL,
    name: "Camila",
    password: PREFERRED_LOCAL_CLINICIAN_PASSWORD,
    role: "admin",
  });

  db.scaleTemplates.set("phq9", { id: "phq9", name: "PHQ-9", description: "Depressão" });
  db.scaleTemplates.set("gad7", { id: "gad7", name: "GAD-7", description: "Ansiedade" });
};

const ensurePreferredLocalClinician = () => {
  const preferred = Array.from(db.users.values()).find(
    (item) => item.email.toLowerCase() === PREFERRED_LOCAL_CLINICIAN_EMAIL.toLowerCase()
  );

  if (preferred) {
    preferred.status = "active";
    preferred.password_hash = hashPassword(PREFERRED_LOCAL_CLINICIAN_PASSWORD);
    if (!preferred.name?.trim()) preferred.name = "Camila Veloso de Freitas";
    ensureClinicalEntitlements(preferred.id);
    camilaId = preferred.id;
    return;
  }

  const legacy = Array.from(db.users.values()).find(
    (item) => item.email.toLowerCase() === LEGACY_LOCAL_CLINICIAN_EMAIL.toLowerCase()
  );

  if (legacy) {
    legacy.email = PREFERRED_LOCAL_CLINICIAN_EMAIL;
    legacy.name = legacy.name?.trim() || "Camila Veloso de Freitas";
    legacy.status = "active";
    legacy.password_hash = hashPassword(PREFERRED_LOCAL_CLINICIAN_PASSWORD);
    ensureClinicalEntitlements(legacy.id);
    camilaId = legacy.id;
    return;
  }

  camilaId = ensureSeedUser({
    email: PREFERRED_LOCAL_CLINICIAN_EMAIL,
    name: "Camila Veloso de Freitas",
    password: PREFERRED_LOCAL_CLINICIAN_PASSWORD,
    role: "admin",
  });
  ensureClinicalEntitlements(camilaId);
};

seedBaseData();
ensurePreferredLocalClinician();

export const resetDatabaseForTests = () => {
  for (const value of Object.values(db)) {
    if (value instanceof Map) value.clear();
  }

  seedBaseData();
};

export const seeds = {
  get camilaId() {
    return camilaId;
  },
  now,
};

db.scaleTemplates.set("phq9", { id: "phq9", name: "PHQ-9", description: "Depressão" });
db.scaleTemplates.set("gad7", { id: "gad7", name: "GAD-7", description: "Ansiedade" });

if (persistenceEnabled) {
  process.once("beforeExit", persistDatabaseNow);
  process.once("exit", persistDatabaseNow);
}

