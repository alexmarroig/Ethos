import crypto from "node:crypto";
import type {
  AnamnesisResponse,
  AuditEvent,
  AudioRecord,
  ClinicalNote,
  ClinicalReport,
  ClinicalSession,
  ClinicalDocument,
  DocumentTemplate,
  DocumentVersion,
  FinancialEntry,
  FormEntry,
  Invite,
  Job,
  Patient,
  ScaleRecord,
  SessionToken,
  TelemetryEvent,
  Transcript,
  User,
  LocalEntitlementSnapshot,
  ScaleTemplate,
  ObservabilityAlert,
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
  financial: new Map<string, FinancialEntry>(),
  jobs: new Map<string, Job>(),
  localEntitlements: new Map<string, LocalEntitlementSnapshot>(),
  scaleTemplates: new Map<string, ScaleTemplate>(),
  documentTemplates: new Map<string, DocumentTemplate>(),
  documents: new Map<string, ClinicalDocument>(),
  documentVersions: new Map<string, DocumentVersion>(),

  telemetry: new Map<string, TelemetryEvent>(),
  telemetryQueue: new Map<string, Array<TelemetryEvent>>(),
  audit: new Map<string, AuditEvent>(),
  observabilityAlerts: new Map<string, ObservabilityAlert>(),
  idempotency: new Map<string, { statusCode: number; body: unknown; createdAt: string }>(),
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

db.documentTemplates.set("cfp-atestado", {
  id: "cfp-atestado",
  authority: "CFP",
  title: "Atestado psicológico CFP",
  description: "Declaração breve com identificação profissional e objetivo da emissão.",
  type: "declaracao",
  global_fields: [
    { id: "profissional_nome", label: "Nome do(a) profissional", required: true },
    { id: "registro_profissional", label: "Registro profissional (CRP)", required: true },
    { id: "paciente_nome", label: "Nome do(a) paciente", required: true },
    { id: "data_emissao", label: "Data de emissão", required: true },
  ],
  sections: [
    { id: "objetivo", label: "Objetivo do documento", placeholder: "Informe a finalidade do atestado." },
    { id: "periodo", label: "Período/comparecimento", placeholder: "Descreva período de acompanhamento ou comparecimento." },
    { id: "observacoes", label: "Observações", placeholder: "Informações complementares, sem diagnóstico conclusivo." },
  ],
});

db.documentTemplates.set("crp-declaracao", {
  id: "crp-declaracao",
  authority: "CRP",
  title: "Declaração CRP",
  description: "Declaração de acompanhamento com dados básicos e limitações éticas.",
  type: "declaracao",
  global_fields: [
    { id: "profissional_nome", label: "Nome do(a) profissional", required: true },
    { id: "registro_profissional", label: "Registro profissional (CRP)", required: true },
    { id: "paciente_nome", label: "Nome do(a) paciente", required: true },
    { id: "cidade_uf", label: "Cidade/UF", required: true },
    { id: "data_emissao", label: "Data de emissão", required: true },
  ],
  sections: [
    { id: "contexto", label: "Contexto do acompanhamento", placeholder: "Descreva o contexto sem linguagem diagnóstica." },
    { id: "objetivo", label: "Objetivo da declaração", placeholder: "Informe para qual finalidade a declaração é emitida." },
    { id: "limites", label: "Limites e observações", placeholder: "Registre limites técnicos e éticos do documento." },
  ],
});
