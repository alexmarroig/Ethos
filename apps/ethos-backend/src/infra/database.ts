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
  Patient,
  Contract,
  ScaleRecord,
  SessionToken,
  ClinicalTemplate,
  TelemetryEvent,
  Transcript,
  User,
  LocalEntitlementSnapshot,
  ScaleTemplate,
  ObservabilityAlert,
  CaseClosureProtocol,
  NotificationConsent,
  NotificationLog,
  NotificationSchedule,
  NotificationTemplate,
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
  contracts: new Map<string, Contract>(),
  localEntitlements: new Map<string, LocalEntitlementSnapshot>(),
  scaleTemplates: new Map<string, ScaleTemplate>(),
  templates: new Map<string, ClinicalTemplate>(),

  telemetry: new Map<string, TelemetryEvent>(),
  telemetryQueue: new Map<string, Array<TelemetryEvent>>(),
  audit: new Map<string, AuditEvent>(),
  observabilityAlerts: new Map<string, ObservabilityAlert>(),
  caseClosures: new Map<string, CaseClosureProtocol>(),
  idempotency: new Map<string, { statusCode: number; body: unknown; createdAt: string }>(),

  notificationTemplates: new Map<string, NotificationTemplate>(),
  notificationConsents: new Map<string, NotificationConsent>(),
  notificationSchedules: new Map<string, NotificationSchedule>(),
  notificationLogs: new Map<string, NotificationLog>(),
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

const baseTemplateFields: ClinicalTemplate["fields"] = [
  { key: "psychologist.name", label: "Nome do(a) psicólogo(a)", type: "text", scope: "global", required: true },
  { key: "psychologist.crp", label: "CRP", type: "text", scope: "global", required: true },
  { key: "patient.name", label: "Nome do paciente", type: "text", scope: "global", required: true },
  { key: "patient.document", label: "Documento do paciente", type: "text", scope: "global" },
  { key: "city", label: "Cidade", type: "text", scope: "global", required: true },
  { key: "date", label: "Data", type: "date", scope: "global", required: true },
  { key: "signature", label: "Assinatura", type: "text", scope: "global", required: true },
];

const createTemplateSeed = (template: Omit<ClinicalTemplate, "id" | "owner_user_id" | "created_at">) => {
  const id = uid();
  db.templates.set(id, { ...template, id, owner_user_id: camilaId, created_at: now() });
};

createTemplateSeed({
  title: "Declaração de Comparecimento",
  description: "Modelo alinhado à Resolução CFP nº 06/2019 para declaração de comparecimento.",
  version: 1,
  fields: [
    ...baseTemplateFields,
    { key: "session_date", label: "Data do atendimento", type: "date", scope: "document", required: true },
    { key: "session_time", label: "Horário", type: "text", scope: "document" },
    { key: "purpose", label: "Finalidade", type: "textarea", scope: "document" },
  ],
  html: `
  <h2 style="text-align:center;">Declaração de Comparecimento</h2>
  <p>Declaro, para os devidos fins, que {{patient.name}} ({{patient.document}}) compareceu para atendimento psicológico em {{session_date}} às {{session_time}}.</p>
  <p>Finalidade: {{purpose}}</p>
  <p style="margin-top:40px;">{{city}}, {{date}}.</p>
  <p style="margin-top:40px;">{{signature}}</p>
  <p>{{psychologist.name}} - CRP {{psychologist.crp}}</p>
  `,
});

createTemplateSeed({
  title: "Declaração de Atendimento",
  description: "Confirmação de atendimento psicológico conforme CFP nº 06/2019.",
  version: 1,
  fields: [
    ...baseTemplateFields,
    { key: "service_period", label: "Período do atendimento", type: "text", scope: "document", required: true },
    { key: "observations", label: "Observações", type: "textarea", scope: "document" },
  ],
  html: `
  <h2 style="text-align:center;">Declaração de Atendimento</h2>
  <p>Declaro que {{patient.name}} ({{patient.document}}) encontra-se em atendimento psicológico no período {{service_period}}.</p>
  <p>{{observations}}</p>
  <p style="margin-top:40px;">{{city}}, {{date}}.</p>
  <p style="margin-top:40px;">{{signature}}</p>
  <p>{{psychologist.name}} - CRP {{psychologist.crp}}</p>
  `,
});

createTemplateSeed({
  title: "Relatório Psicológico",
  description: "Modelo base para relatório psicológico (CFP nº 06/2019).",
  version: 1,
  fields: [
    ...baseTemplateFields,
    { key: "demand", label: "Demanda", type: "textarea", scope: "document", required: true },
    { key: "procedures", label: "Procedimentos", type: "textarea", scope: "document", required: true },
    { key: "analysis", label: "Análise", type: "textarea", scope: "document", required: true },
    { key: "conclusion", label: "Conclusão", type: "textarea", scope: "document" },
  ],
  html: `
  <h2 style="text-align:center;">Relatório Psicológico</h2>
  <p><strong>Identificação:</strong> {{patient.name}} ({{patient.document}}).</p>
  <p><strong>Demanda:</strong> {{demand}}</p>
  <p><strong>Procedimentos:</strong> {{procedures}}</p>
  <p><strong>Análise:</strong> {{analysis}}</p>
  <p><strong>Conclusão:</strong> {{conclusion}}</p>
  <p style="margin-top:40px;">{{city}}, {{date}}.</p>
  <p style="margin-top:40px;">{{signature}}</p>
  <p>{{psychologist.name}} - CRP {{psychologist.crp}}</p>
  `,
});

createTemplateSeed({
  title: "Encaminhamento",
  description: "Modelo de encaminhamento clínico baseado na resolução CFP nº 06/2019.",
  version: 1,
  fields: [
    ...baseTemplateFields,
    { key: "receiver", label: "Destinatário", type: "text", scope: "document", required: true },
    { key: "summary", label: "Resumo do encaminhamento", type: "textarea", scope: "document", required: true },
  ],
  html: `
  <h2 style="text-align:center;">Encaminhamento</h2>
  <p>Encaminho {{patient.name}} ({{patient.document}}) para {{receiver}}.</p>
  <p><strong>Resumo:</strong> {{summary}}</p>
  <p style="margin-top:40px;">{{city}}, {{date}}.</p>
  <p style="margin-top:40px;">{{signature}}</p>
  <p>{{psychologist.name}} - CRP {{psychologist.crp}}</p>
  `,
});
