import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  AnamnesisResponse,
  AuditEvent,
  AudioRecord,
  ClinicalNote,
  ClinicalReport,
  ClinicalSynthesis,
  ClinicalSession,
  ClinicalDocument,
  ClinicalDocumentVersion,
  FinancialEntry,
  FormEntry,
  FormAssignment,
  FormTemplate,
  HomeworkTask,
  Invite,
  Job,
  NotificationConsent,
  NotificationLog,
  NotificationSchedule,
  NotificationTemplate,
  EmotionalDiaryEntry,
  DreamDiaryEntry,
  PatientAsyncMessage,
  Patient,
  SessionToken,
  TelemetryEvent,
  TherapeuticGoal,
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
  WhatsAppConfig,
  SessionReminderConfig,
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
  clinicalSyntheses: new Map<string, ClinicalSynthesis>(),
  anamnesis: new Map<string, AnamnesisResponse>(),
  scales: new Map<string, ScaleRecord>(),
  forms: new Map<string, FormEntry>(),
  formAssignments: new Map<string, FormAssignment>(),
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
  dreamDiary: new Map<string, DreamDiaryEntry>(),
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

  therapeuticGoals: new Map<string, TherapeuticGoal>(),
  homeworkTasks: new Map<string, HomeworkTask>(),

  whatsappConfig: new Map<"config", WhatsAppConfig>(),
  sessionReminderConfig: new Map<"config", SessionReminderConfig>(),
  patientSessionReminderEnabled: new Map<string, boolean>(),
  sentSessionReminders: new Set<string>(),
  pendingConfirmations: new Map<string, string>(), // normalized phone → session_id

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
  clinicalSyntheses: ClinicalSynthesis[];
  anamnesis: AnamnesisResponse[];
  scales: ScaleRecord[];
  forms: FormEntry[];
  formAssignments: FormAssignment[];
  formTemplates: FormTemplate[];
  financial: FinancialEntry[];
  jobs: Job[];
  documents: ClinicalDocument[];
  documentVersions: ClinicalDocumentVersion[];
  documentTemplates: DocumentTemplate[];
  patientAccess: Array<Record<string, unknown>>;
  patientDiaryEntries: EmotionalDiaryEntry[];
  dreamDiary: DreamDiaryEntry[];
  localEntitlements: LocalEntitlementSnapshot[];
  patientNotifications: PatientNotification[];
  availabilityBlocks: AvailabilityBlock[];
  slotRequests: SlotRequest[];
  therapeuticGoals: TherapeuticGoal[];
  homeworkTasks: HomeworkTask[];
  whatsappConfig?: WhatsAppConfig | null;
  sessionReminderConfig?: SessionReminderConfig | null;
  patientSessionReminderEnabled?: Record<string, boolean>;
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
    restoreMap(db.clinicalSyntheses, snapshot.clinicalSyntheses, (item) => item.id);
    restoreMap(db.anamnesis, snapshot.anamnesis, (item) => item.id);
    restoreMap(db.scales, snapshot.scales, (item) => item.id);
    restoreMap(db.forms, snapshot.forms, (item) => item.id);
    restoreMap(db.formAssignments, snapshot.formAssignments, (item) => item.id);
    restoreMap(db.formTemplates, snapshot.formTemplates, (item) => item.id);
    restoreMap(db.financial, snapshot.financial, (item) => item.id);
    restoreMap(db.jobs, snapshot.jobs, (item) => item.id);
    restoreMap(db.documents, snapshot.documents, (item) => item.id);
    restoreMap(db.documentVersions, snapshot.documentVersions, (item) => item.id);
    restoreMap(db.documentTemplates, snapshot.documentTemplates, (item) => item.id);
    restoreMap(db.patientAccess, snapshot.patientAccess, (item) => String((item as { id?: string }).id ?? uid()));
    restoreMap(db.patientDiaryEntries, snapshot.patientDiaryEntries, (item) => item.id);
    restoreMap(db.dreamDiary, snapshot.dreamDiary, (item) => item.id);
    restoreMap(db.localEntitlements, snapshot.localEntitlements, (item) => item.user_id);
    restoreMap(db.patientNotifications, snapshot.patientNotifications, (item) => item.id);
    restoreMap(db.availabilityBlocks, snapshot.availabilityBlocks, (item) => item.id);
    restoreMap(db.slotRequests, snapshot.slotRequests, (item) => item.id);
    restoreMap(db.therapeuticGoals, snapshot.therapeuticGoals, (item) => item.id);
    restoreMap(db.homeworkTasks, snapshot.homeworkTasks, (item) => item.id);
    if (snapshot.whatsappConfig) db.whatsappConfig.set("config", snapshot.whatsappConfig);
    if (snapshot.sessionReminderConfig) db.sessionReminderConfig.set("config", snapshot.sessionReminderConfig);
    if (snapshot.patientSessionReminderEnabled) {
      db.patientSessionReminderEnabled.clear();
      for (const [k, v] of Object.entries(snapshot.patientSessionReminderEnabled)) {
        db.patientSessionReminderEnabled.set(k, v);
      }
    }
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
  clinicalSyntheses: Array.from(db.clinicalSyntheses.values()),
  anamnesis: Array.from(db.anamnesis.values()),
  scales: Array.from(db.scales.values()),
  forms: Array.from(db.forms.values()),
  formAssignments: Array.from(db.formAssignments.values()),
  formTemplates: Array.from(db.formTemplates.values()).filter((item) => item.owner_user_id !== "system"),
  financial: Array.from(db.financial.values()),
  jobs: Array.from(db.jobs.values()),
  documents: Array.from(db.documents.values()),
  documentVersions: Array.from(db.documentVersions.values()),
  documentTemplates: Array.from(db.documentTemplates.values()).filter((item) => item.owner_user_id !== "system"),
  patientAccess: Array.from(db.patientAccess.values()),
  patientDiaryEntries: Array.from(db.patientDiaryEntries.values()),
  dreamDiary: Array.from(db.dreamDiary.values()),
  localEntitlements: Array.from(db.localEntitlements.values()),
  patientNotifications: Array.from(db.patientNotifications.values()),
  availabilityBlocks: Array.from(db.availabilityBlocks.values()),
  slotRequests: Array.from(db.slotRequests.values()),
  therapeuticGoals: Array.from(db.therapeuticGoals.values()),
  homeworkTasks: Array.from(db.homeworkTasks.values()),
  whatsappConfig: db.whatsappConfig.get("config") ?? null,
  sessionReminderConfig: db.sessionReminderConfig.get("config") ?? null,
  patientSessionReminderEnabled: Object.fromEntries(db.patientSessionReminderEnabled.entries()),
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
    role: "user",
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
    preferred.role = "user";
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
    role: "user",
  });
  ensureClinicalEntitlements(camilaId);
};

seedBaseData();
ensurePreferredLocalClinician();

// ─── Demo / showcase seed ────────────────────────────────────────────────────
// Populates rich mock data so the app looks great for screenshots/demos.
// Runs only once per process (idempotent: checks patients Map size).

const DEMO_PSI_EMAIL = "psicologo.teste@gmail.com";
const DEMO_PSI_PASSWORD = "psicologo256";
const DEMO_PATIENT_EMAIL = "paciente.teste@gmail.com";
const DEMO_PATIENT_PASSWORD = "paciente256";

const seedDemoData = () => {
  // Skip if demo user already exists
  const alreadySeeded = Array.from(db.users.values()).some(
    (u) => u.email === DEMO_PSI_EMAIL,
  );
  if (alreadySeeded) return;

  // Create a completely separate demo clinician — never touches camilaId
  const demoId = uid();
  const demoPsi: User = {
    id: demoId,
    email: DEMO_PSI_EMAIL,
    name: "Psicólogo(a) Teste",
    role: "user",
    status: "active",
    password_hash: hashPassword(DEMO_PSI_PASSWORD),
    accepted_ethics: true,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  } as unknown as User;
  db.users.set(demoId, demoPsi);
  ensureClinicalEntitlements(demoId);

  const daysAgo = (d: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    return dt.toISOString();
  };
  const daysFromNow = (d: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return dt.toISOString();
  };

  // ── Helpers (all data owned by demoId, never camilaId) ───────────────────
  const mkPatient = (
    name: string,
    email: string,
    phone: string,
    notes: string,
    sessionMode: "weekly" | "biweekly" = "weekly",
    sessionValue = 200,
  ): Patient => {
    const p = {
      id: uid(),
      owner_user_id: demoId,
      name,
      label: name,
      external_id: uid(),
      email,
      phone,
      notes,
      session_mode: sessionMode,
      session_value: sessionValue,
      created_at: daysAgo(Math.floor(Math.random() * 180 + 30)),
    } as unknown as Patient;
    db.patients.set(p.id, p);
    return p;
  };

  const mkSession = (
    patientId: string,
    scheduledAt: string,
    status: "scheduled" | "completed" | "missed" | "confirmed" = "completed",
    durationMinutes = 50,
  ): ClinicalSession => {
    const s: ClinicalSession = {
      id: uid(),
      owner_user_id: demoId,
      patient_id: patientId,
      scheduled_at: scheduledAt,
      status,
      duration_minutes: durationMinutes,
      created_at: scheduledAt,
    };
    db.sessions.set(s.id, s);
    return s;
  };

  const mkNote = (sessionId: string, content: string) => {
    const n: ClinicalNote = {
      id: uid(),
      owner_user_id: demoId,
      session_id: sessionId,
      content,
      status: "final",
      created_at: now(),
      updated_at: now(),
    } as unknown as ClinicalNote;
    db.clinicalNotes.set(n.id, n);
  };

  const mkFinancial = (
    patientId: string,
    description: string,
    amount: number,
    type: "income" | "expense",
    status: "paid" | "pending" | "overdue",
    date: string,
  ) => {
    const f: FinancialEntry = {
      id: uid(),
      owner_user_id: demoId,
      patient_id: patientId,
      description,
      amount,
      type,
      status,
      date,
      created_at: date,
    } as unknown as FinancialEntry;
    db.financial.set(f.id, f);
  };

  // ── Patients ─────────────────────────────────────────────────────────────
  const ana = mkPatient(
    "Ana Beatriz Souza",
    "ana.beatriz@email.com",
    "(11) 98234-5678",
    "Queixa principal: ansiedade generalizada e dificuldades no ambiente de trabalho. Histórico de episódios de pânico. Em tratamento há 8 meses. Boa adesão.",
    "weekly",
    220,
  );
  const lucas = mkPatient(
    "Lucas Mendes Oliveira",
    "lucas.mendes@gmail.com",
    "(11) 97112-3344",
    "Depressão moderada. Recentemente passou por separação conjugal. Iniciou processo há 4 meses. Progresso gradual, resistência inicial à terapia superada.",
    "weekly",
    200,
  );
  const fernanda = mkPatient(
    "Fernanda Costa Lima",
    "fern.costa@outlook.com",
    "(21) 96533-7890",
    "Fobia social e baixa autoestima. Estudante universitária, 23 anos. Processo focado em TCC para situações sociais.",
    "biweekly",
    180,
  );
  const rafael = mkPatient(
    "Rafael Torres Braga",
    "rafael.torres@empresa.com.br",
    "(11) 99001-4455",
    "Burnout e transtorno de ansiedade. Executivo de médio porte, 38 anos. Sessões focadas em manejo do estresse e limites saudáveis.",
    "weekly",
    250,
  );
  const julia = mkPatient(
    "Julia Nascimento",
    "julia.nasc@hotmail.com",
    "(31) 98765-1234",
    "TDAH adulto diagnosticado recentemente. Dificuldades de organização e relacionamentos. Em processo desde o mês passado.",
    "weekly",
    200,
  );
  const marcos = mkPatient(
    "Marcos Vinicius Pereira",
    "marcos.vp@gmail.com",
    "(11) 97654-3210",
    "Luto por perda de familiar. Em processo há 3 meses. Sessões de apoio emocional e ressignificação.",
    "biweekly",
    200,
  );

  // ── Sessions — Ana ────────────────────────────────────────────────────────
  const anaS1 = mkSession(ana.id, daysAgo(56), "completed");
  mkNote(anaS1.id, "Ana chegou relatando semana difícil no trabalho. Identificamos padrão de pensamento catastrofizante nas situações de cobrança do gestor. Trabalhamos reestruturação cognitiva. Paciente demonstrou boa compreensão dos registros de pensamento automático.");

  const anaS2 = mkSession(ana.id, daysAgo(49), "completed");
  mkNote(anaS2.id, "Sessão focada em técnicas de respiração diafragmática para manejo das crises de ansiedade. Ana relatou ter aplicado a técnica durante reunião estressante com resultado positivo. Reforçado o comportamento adaptativo.");

  const anaS3 = mkSession(ana.id, daysAgo(42), "completed");
  mkNote(anaS3.id, "Revisão dos registros de pensamento. Ana trouxe situação de conflito com colega. Exploramos assertividade e comunicação não-violenta. Tarefa: praticar comunicação assertiva em 2 situações durante a semana.");

  const anaS4 = mkSession(ana.id, daysAgo(35), "completed");
  mkNote(anaS4.id, "Ana relatou ter conseguido conversar assertivamente com a colega. Boa evolução. Sessão de psicoeducação sobre o ciclo ansiedade-evitação. Introdução à exposição gradual.");

  const anaS5 = mkSession(ana.id, daysAgo(14), "completed");
  mkNote(anaS5.id, "Sessão de revisão de progresso. Ana demonstra clareza sobre seus gatilhos. Redução significativa da frequência das crises (de 3x/semana para 1x nas últimas 2 semanas). Plano de exposição gradual para situações evitadas.");

  mkSession(ana.id, daysFromNow(3), "scheduled");
  mkSession(ana.id, daysFromNow(10), "scheduled");

  // ── Sessions — Lucas ──────────────────────────────────────────────────────
  const lucasS1 = mkSession(lucas.id, daysAgo(60), "completed");
  mkNote(lucasS1.id, "Primeira sessão após avaliação. Lucas chega com humor deprimido, anedonia e insônia. Processamos o luto pela separação. Psicoeducação sobre depressão reativa. Encaminhamento para avaliação psiquiátrica discutido.");

  const lucasS2 = mkSession(lucas.id, daysAgo(46), "completed");
  mkNote(lucasS2.id, "Lucas iniciou antidepressivo há 2 semanas. Relata leve melhora no sono. Sessão de ativação comportamental — identificamos atividades prazerosas abandonadas. Tarefa: retomar caminhada 3x/semana.");

  mkSession(lucas.id, daysAgo(32), "completed");
  mkSession(lucas.id, daysAgo(18), "completed");
  mkSession(lucas.id, daysFromNow(5), "scheduled");

  // ── Sessions — Fernanda ───────────────────────────────────────────────────
  mkSession(fernanda.id, daysAgo(45), "completed");
  mkSession(fernanda.id, daysAgo(31), "completed");
  mkSession(fernanda.id, daysAgo(17), "missed");
  mkSession(fernanda.id, daysFromNow(14), "scheduled");

  // ── Sessions — Rafael ─────────────────────────────────────────────────────
  const rafS1 = mkSession(rafael.id, daysAgo(28), "completed");
  mkNote(rafS1.id, "Rafael apresenta sintomas clássicos de burnout: exaustão emocional severa, despersonalização e redução da realização pessoal. Mapeamento do contexto organizacional. Início da psicoeducação sobre estresse crônico.");
  mkSession(rafael.id, daysAgo(21), "completed");
  mkSession(rafael.id, daysAgo(7), "completed");
  mkSession(rafael.id, daysFromNow(7), "scheduled");

  // ── Sessions — Julia ──────────────────────────────────────────────────────
  mkSession(julia.id, daysAgo(21), "completed");
  mkSession(julia.id, daysAgo(14), "completed");
  mkSession(julia.id, daysFromNow(7), "scheduled");
  mkSession(julia.id, daysFromNow(14), "scheduled");

  // ── Sessions — Marcos ─────────────────────────────────────────────────────
  mkSession(marcos.id, daysAgo(50), "completed");
  mkSession(marcos.id, daysAgo(36), "completed");
  mkSession(marcos.id, daysAgo(22), "completed");
  mkSession(marcos.id, daysFromNow(8), "scheduled");

  // ── Financial entries ─────────────────────────────────────────────────────
  // Ana — paid sessions
  for (let i = 0; i < 5; i++) {
    mkFinancial(ana.id, `Sessão - Ana Beatriz (${i + 1})`, 220, "income", "paid", daysAgo(56 - i * 7));
  }
  mkFinancial(ana.id, "Sessão - Ana Beatriz", 220, "income", "pending", daysFromNow(3));

  // Lucas
  for (let i = 0; i < 4; i++) {
    mkFinancial(lucas.id, `Sessão - Lucas Mendes (${i + 1})`, 200, "income", "paid", daysAgo(60 - i * 14));
  }
  mkFinancial(lucas.id, "Sessão - Lucas Mendes", 200, "income", "pending", daysFromNow(5));

  // Fernanda
  mkFinancial(fernanda.id, "Sessão - Fernanda Costa", 180, "income", "paid", daysAgo(45));
  mkFinancial(fernanda.id, "Sessão - Fernanda Costa", 180, "income", "paid", daysAgo(31));
  mkFinancial(fernanda.id, "Sessão não realizada - Fernanda Costa", 0, "income", "paid", daysAgo(17));

  // Rafael
  for (let i = 0; i < 3; i++) {
    mkFinancial(rafael.id, `Sessão - Rafael Torres (${i + 1})`, 250, "income", "paid", daysAgo(28 - i * 7));
  }
  mkFinancial(rafael.id, "Sessão - Rafael Torres", 250, "income", "pending", daysFromNow(7));

  // Marcos
  for (let i = 0; i < 3; i++) {
    mkFinancial(marcos.id, `Sessão - Marcos Vinicius (${i + 1})`, 200, "income", "paid", daysAgo(50 - i * 14));
  }

  // Expenses
  mkFinancial("", "Aluguel consultório - Julho", 800, "expense", "paid", daysAgo(30));
  mkFinancial("", "Aluguel consultório - Agosto", 800, "expense", "paid", daysAgo(0));
  mkFinancial("", "Supervisão clínica mensal", 350, "expense", "paid", daysAgo(15));
  mkFinancial("", "Assinatura Ethos", 89, "expense", "paid", daysAgo(5));

  // ── Patient portal user (demo patient) ───────────────────────────────────
  const patientPortalUser: User = {
    id: uid(),
    email: DEMO_PATIENT_EMAIL,
    name: "Paciente Teste",
    role: "patient",
    status: "active",
    password_hash: hashPassword(DEMO_PATIENT_PASSWORD),
    accepted_ethics: true,
    created_at: daysAgo(60),
    updated_at: daysAgo(60),
  } as unknown as User;
  db.users.set(patientPortalUser.id, patientPortalUser);

  // Link first patient record to the demo portal user
  const anaRecord = db.patients.get(ana.id);
  if (anaRecord) {
    (anaRecord as Patient & { portal_user_id?: string }).portal_user_id = patientPortalUser.id;
    (anaRecord as Patient & { portal_email?: string }).portal_email = patientPortalUser.email;
    db.patients.set(ana.id, anaRecord);
  }

  // PatientAccess record linking portal user ↔ patient
  const patientAccessRecord = {
    id: uid(),
    owner_user_id: demoId,
    patient_id: ana.id,
    patient_user_id: patientPortalUser.id,
    created_at: daysAgo(60),
  };
  if (db.patientAccess) db.patientAccess.set(patientAccessRecord.id, patientAccessRecord as never);

  // ── Form templates ────────────────────────────────────────────────────────
  const diaryTemplate: FormTemplate = {
    id: uid(),
    owner_user_id: demoId,
    name: "Diário emocional semanal",
    description: "Registro semanal de humor, emoções e situações significativas.",
    audience: "patient",
    active: true,
    fields: [
      { id: "mood", label: "Como você avalia seu humor geral esta semana? (1–10)", type: "text", required: true },
      { id: "emotions", label: "Quais emoções mais se destacaram?", type: "textarea", required: true },
      { id: "trigger", label: "Houve alguma situação que te afetou muito?", type: "textarea", required: false },
      { id: "body", label: "Como seu corpo reagiu ao estresse?", type: "textarea", required: false },
      { id: "gratitude", label: "Escreva algo pelo que você é grata/o esta semana", type: "textarea", required: false },
    ],
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
  } as unknown as FormTemplate;
  db.formTemplates.set(diaryTemplate.id, diaryTemplate);

  // ── Form entries (demo patient filled the diary twice) ───────────────────
  const diaryEntry1: FormEntry = {
    id: uid(),
    owner_user_id: demoId,
    patient_id: ana.id,
    form_id: diaryTemplate.id,
    content: {
      mood: "6",
      emotions: "Ansiedade e cansaço predominaram, especialmente às terças e quartas. Houve um momento de leveza na quinta quando saí com uma amiga.",
      trigger: "Reunião de avaliação de desempenho na sexta-feira. Fiquei ansiosa dois dias antes.",
      body: "Tensão nos ombros e dificuldade para dormir na quarta à noite.",
      gratitude: "Sou grata pela conversa com minha mãe no domingo.",
    },
    submitted_by_patient: true,
    created_at: daysAgo(12),
  } as unknown as FormEntry;
  db.forms.set(diaryEntry1.id, diaryEntry1);

  const diaryEntry2: FormEntry = {
    id: uid(),
    owner_user_id: demoId,
    patient_id: ana.id,
    form_id: diaryTemplate.id,
    content: {
      mood: "7",
      emotions: "Semana mais tranquila. Senti ansiedade só na segunda mas passou mais rápido do que antes.",
      trigger: "Apresentação de projeto para a diretoria — consegui respirar e me acalmar antes.",
      body: "Menos tensão. Dormi melhor quase todos os dias.",
      gratitude: "Pela técnica de respiração que funcionou na apresentação!",
    },
    submitted_by_patient: true,
    created_at: daysAgo(5),
  } as unknown as FormEntry;
  db.forms.set(diaryEntry2.id, diaryEntry2);
};

seedDemoData();

export const resetDatabaseForTests = () => {
  for (const value of Object.values(db)) {
    if (value instanceof Map) value.clear();
  }

  seedBaseData();
};

/**
 * Remove duplicate users sharing the same email (keeping the one with more
 * profile data), then re-runs ensurePreferredLocalClinician so Camila's
 * account is always valid. Call this AFTER loading the Neon snapshot.
 */
export const deduplicateAndRepairSeeds = () => {
  // Deduplicate users by email — keep the entry with the most fields filled
  const byEmail = new Map<string, User>();
  for (const user of Array.from(db.users.values())) {
    const key = user.email.toLowerCase();
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, user);
    } else {
      // Keep whichever has more non-null profile fields
      const score = (u: User) =>
        [u.name, u.crp, u.specialty, u.clinical_approach, u.avatar_url].filter(Boolean).length;
      if (score(user) >= score(existing)) {
        db.users.delete(existing.id);
        byEmail.set(key, user);
      } else {
        db.users.delete(user.id);
      }
    }
  }

  // Re-run seed repair so Camila's account is always usable
  ensurePreferredLocalClinician();
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


export const ensureEmailUnique = (email: string, userId: string) => {
  const existing = Array.from(db.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== userId);
  return !existing;
};
