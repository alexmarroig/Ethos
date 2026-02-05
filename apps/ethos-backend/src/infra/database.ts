import crypto from "node:crypto";
import type {
  AnamnesisResponse,
  AuditEvent,
  AudioRecord,
  ClinicalNote,
  ClinicalReport,
  ClinicalSession,
  FinancialEntry,
  FormEntry,
  Invite,
  Job,
  ScaleRecord,
  SessionToken,
  TelemetryEvent,
  Transcript,
  User,
  LocalEntitlementSnapshot,
  ScaleTemplate,
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

export const db = {
  users: new Map<string, User>(),
  invites: new Map<string, Invite>(),
  sessionsTokens: new Map<string, SessionToken>(),

  sessions: new Map<string, ClinicalSession>(),
  audioRecords: new Map<string, AudioRecord>(),
  transcripts: new Map<string, Transcript>(),
  clinicalNotes: new Map<string, ClinicalNote>(),
  reports: new Map<string, ClinicalReport>(),
  anamnesis: new Map<string, AnamnesisResponse>(),
  scales: new Map<string, ScaleRecord>(),
  forms: new Map<string, FormEntry>(),
  financial: new Map<string, FinancialEntry>(),
  jobs: new Map<string, Job>(),
  localEntitlements: new Map<string, LocalEntitlementSnapshot>(),
  scaleTemplates: new Map<string, ScaleTemplate>(),

  telemetry: new Map<string, TelemetryEvent>(),
  audit: new Map<string, AuditEvent>(),
  idempotency: new Map<string, { statusCode: number; body: unknown; createdAt: string }>(),
};

const camilaId = uid();
db.users.set(camilaId, {
  id: camilaId,
  email: "camila@ethos.local",
  name: "Camila",
  password_hash: hashPassword("admin123"),
  role: "admin",
  status: "active",
  created_at: now(),
});

export const seeds = { camilaId, now };


db.scaleTemplates.set("phq9", { id: "phq9", name: "PHQ-9", description: "Depressão" });
db.scaleTemplates.set("gad7", { id: "gad7", name: "GAD-7", description: "Ansiedade" });
