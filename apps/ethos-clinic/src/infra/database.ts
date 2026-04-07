import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  AnamnesisResponse,
  AuditEvnt,
  ClinicalDocument,
  ClinicalDocumentType,
  ClinicalNote,
  ClinicalReport,
  ClinicalSession,
  DocumentTemplate,
  EmotionalDiaryEntry,
  FinancialEntry,
  Invite,
  Job,
  LocalEntitlementSnapshot,
  NotificationConsent,
  NotificationLog,
  NotificationSchedule,
  NotificationTemplate,
  Patient,
  ScaleRecord,
  ScaleTemplate,
  SessionToken,
  TelemetryEvent,
  Transcript,
  UUID,
  User
} from "../domain/types";

const DATA_DIR = join(__dirname, "../../data");
const DB_FILE = join(DATA_DIR, "db.json");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export const db = {
  users: new Map<UUID, User>(),
  invites: new Map<UUID, Invite>(),
  tokens: new Map<string, SessionToken>(),
  entitlements: new Map<UUID, LocalEntitlementSnapshot>(),
  patients: new Map<UUID, Patient>(),
  sessions: new Map<UUID, ClinicalSession>(),
  clinicalNotes: new Map<UUID, ClinicalNote>(),
  reports: new Map<UUID, ClinicalReport>(),
  anamnesis: new Map<UUID, AnamnesisResponse>(),
  documents: new Map<UUID, ClinicalDocument>(),
  documentTemplates: new Map<UUID, DocumentTemplate>(),
  financial: new Map<UUID, FinancialEntry>(),
  scales: new Map<UUID, ScaleRecord>(),
  scaleTemplates: new Map<string, ScaleTemplate>(),
  emotionalDiary: new Map<UUID, EmotionalDiaryEntry>(),
  notifications: {
    templates: new Map<UUID, NotificationTemplate>(),
    consents: new Map<UUID, NotificationConsent>(),
    schedules: new Map<UUID, NotificationSchedule>(),
    logs: new Map<UUID, NotificationLog>(),
  },
  audit: new Map<UUID, any>(),
  telemetry: [] as TelemetryEvent[],
};

export const uid = () => Math.random().toString(36).substring(2, 15);
export const now = () => new Date().toISOString();

export const persistMutation = () => {
  const serialized: Record<string, any> = {};
  for (const [key, value] of Object.entries(db)) {
    if (value instanceof Map) {
      serialized[key] = Array.from(value.entries());
    } else if (typeof value === "object") {
      const nested: Record<string, any> = {};
      for (const [nKey, nValue] of Object.entries(value)) {
        if (nValue instanceof Map) nested[nKey] = Array.from(nValue.entries());
      }
      serialized[key] = nested;
    }
  }
  writeFileSync(DB_FILE, JSON.stringify(serialized, null, 2));
};

export const loadDatabase = () => {
  if (!existsSync(DB_FILE)) return;
  try {
    const content = readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(content);
    for (const [key, value] of Object.entries(data)) {
      const target = (db as any)[key];
      if (Array.isArray(value) && target instanceof Map) {
        value.forEach(([k, v]) => target.set(k, v));
      } else if (typeof value === "object" && value !== null) {
        for (const [nKey, nValue] of Object.entries(value)) {
          if (Array.isArray(nValue) && target[nKey] instanceof Map) {
            nValue.forEach(([k, v]) => target[nKey].set(k, v));
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to load DB", e);
  }
};

const hashPassword = (p: string) => require("node:crypto").createHash("sha256").update(p).digest("hex");

const ensureSeedUser = (data: Partial<User> & { password?: string }) => {
  const existing = Array.from(db.users.values()).find((u) => u.email === data.email);
  if (existing) return existing.id;
  const id = uid();
  db.users.set(id, {
    id,
    email: data.email!,
    name: data.name!,
    role: data.role!,
    status: "active",
    password_hash: data.password ? hashPassword(data.password) : undefined,
    created_at: now(),
  });
  return id;
};

const ensureClinicalEntitlements = (userId: string) => {
  if (db.entitlements.has(userId)) return;
  db.entitlements.set(userId, {
    user_id: userId,
    entitlements: {
      exports_enabled: true,
      backup_enabled: true,
      forms_enabled: true,
      scales_enabled: true,
      finance_enabled: true,
      transcription_minutes_per_month: 300,
      max_patients: 50,
      max_sessions_per_month: 200,
    },
    source_subscription_status: "active",
    last_entitlements_sync_at: now(),
    last_successful_subscription_validation_at: now(),
  });
};

const seedBaseData = () => {
  ensureSeedUser({
    email: "camila@ethos.local",
    name: "Camila (Admin)",
    password: "admin123",
    role: "admin",
  });

  const helenaId = ensureSeedUser({
    email: "helena@ethos.local",
    name: "Dra. Helena Prado",
    password: "ethos123",
    role: "psychologist",
  });
  ensureClinicalEntitlements(helenaId);

  const assistantId = ensureSeedUser({
    email: "claudia@ethos.local",
    name: "Claudia (Secretaria)",
    password: "ethos123",
    role: "assistant",
  });
  ensureClinicalEntitlements(assistantId);

  db.scaleTemplates.set("phq9", { id: "phq9", name: "PHQ-9", description: "Depressão" });
  db.scaleTemplates.set("gad7", { id: "gad7", name: "GAD-7", description: "Ansiedade" });
};

loadDatabase();
seedBaseData();
persistMutation();

export const resetDatabaseForTests = () => {
  for (const value of Object.values(db)) {
    if (value instanceof Map) value.clear();
  }
  seedBaseData();
};

export const getByOwner = <T extends { owner_user_id: UUID }>(map: Map<UUID, T>, ownerId: UUID, id: UUID): T | undefined => {
  const item = map.get(id);
  if (item && item.owner_user_id === ownerId) return item;
  return undefined;
};

export const nextUserVersion = () => 1;
