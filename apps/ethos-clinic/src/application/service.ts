import crypto from "node:crypto";
import { db, encrypt, hashInviteToken, hashPassword, schedulePersistDatabase, seeds, uid, verifyPassword } from "../infra/database";
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
  FormTemplate,
  Job,
  JobStatus,
  JobType,
  LocalEntitlementSnapshot,
  NotificationPreview,
  ObservabilityAlert,
  Patient,
  PatientBilling,
  PatientTimelineItem,
  ScaleRecord,
  SessionStatus,
  TelemetryEvent,
  Transcript,
  User,
} from "../domain/types";

const now = seeds.now;
const DAY_MS = 86_400_000;
const persistMutation = () => schedulePersistDatabase();

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
      title: "Comportamento anÃ´malo",
      message: `${anomaly.probableCause}. ${anomaly.suggestedAction}`,
      fingerprint: `anomaly:${anomaly.timestamp}:${anomaly.probableCause}`,
      context: anomaly,
    }));
  }

  if (logs.length > 0) {
    const suggestion = suggestRootCauseFromLogs(logs.slice(-20));
    if (!suggestion.toLowerCase().includes("nÃ£o conclusiva")) {
      createdOrUpdated.push(upsertObservabilityAlert({
        source: "suggestRootCauseFromLogs",
        severity: "medium",
        title: "HipÃ³tese de causa raiz",
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
  permissions: PatientAccessPermissions;
  created_at: string;
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
  status: "draft" | "sent" | "accepted" | "signed";
  delivery_channels?: Array<{ channel: "email" | "whatsapp"; recipient?: string; sent_at: string }>;
  signed_attachment?: { file_name: string; mime_type: string; data_url: string; uploaded_at: string };
  portal_token?: string;
  accepted_by?: string;
  accepted_at?: string;
  accepted_ip?: string;
  created_at: string;
  updated_at: string;
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
  } satisfies PatientBilling;
};

const normalizePatientInput = (input: Partial<PatientUpsertInput>) => {
  const phone = normalizeOptionalText(input.phone);
  const whatsapp = normalizeOptionalText(input.whatsapp) ?? phone;

  return {
    label: normalizeOptionalText(input.name),
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
  return {
    ...hydratedPatient,
    total_sessions: summary.total_sessions,
    next_session: summary.next_session?.scheduled_at,
    last_session: summary.last_session?.scheduled_at,
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
    title: "SessÃƒÂ£o agendada",
    subtitle: session.status,
    related_id: session.id,
  }));

  const notes = listPatientClinicalNotes(owner, patient.id).map((note) => ({
    id: `note-${note.id}`,
    patient_id: patient.id,
    kind: "clinical_note" as const,
    date: note.validated_at ?? note.created_at,
    title: "Nota clÃƒÂ­nica",
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

  return {
    patient,
    summary: buildPatientSummary(owner, patient.id),
    sessions: listPatientSessionsByReference(owner, patient.id),
    documents: listPatientDocuments(owner, patient.id),
    clinical_notes: listPatientClinicalNotes(owner, patient.id),
    emotional_diary: listPatientDiaryEntriesByReference(owner, patient.id),
    form_entries: listFormEntries(owner, { patient_id: patient.id }),
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
  permissions?: Partial<PatientAccessPermissions>;
}) => {
  const sameEmail = Array.from(db.users.values()).find((item) => item.email.toLowerCase() === input.patient_email.toLowerCase());
  if (sameEmail && sameEmail.role !== "patient") return { error: "EMAIL_IN_USE" as const };

  const temporaryPassword = input.patient_password || "patient123";
  const patientUser = sameEmail ?? {
    id: uid(),
    email: input.patient_email,
    name: input.patient_name,
    password_hash: hashPassword(temporaryPassword),
    role: "patient" as const,
    status: "active" as const,
    created_at: now(),
  };
  db.users.set(patientUser.id, patientUser);

  createPatientIfMissing(owner, input.patient_id);
  const access: PatientAccess = {
    id: uid(),
    owner_user_id: owner,
    patient_user_id: patientUser.id,
    patient_id: input.patient_id,
    permissions: {
      scales: input.permissions?.scales ?? true,
      diary: input.permissions?.diary ?? true,
      session_confirmation: input.permissions?.session_confirmation ?? true,
      async_messages_per_day: input.permissions?.async_messages_per_day ?? 3,
    },
    created_at: now(),
  };
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
      title: "Sessao agendada",
      message: `Proxima atualizacao para ${new Date(session.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
      created_at: session.created_at,
      related_id: session.id,
      status: session.status,
    }));

  const recentDocuments = listPatientAccessibleDocuments(access)
    .slice(0, 3)
    .map((document) => ({
      id: `document-${document.id}`,
      type: "document" as const,
      title: "Novo documento disponivel",
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
    disclaimer: "Mensagens assÃ­ncronas nÃ£o substituem atendimento de urgÃªncia.",
  };
};

const renderTemplateString = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");

const buildContractTemplateValues = (input: {
  psychologist: Contract["psychologist"];
  patient: Contract["patient"];
  terms: Contract["terms"];
  patientRecord?: Patient | null;
}) => ({
  psychologist_name: input.psychologist.name,
  psychologist_license: input.psychologist.license,
  psychologist_email: input.psychologist.email,
  psychologist_phone: input.psychologist.phone ?? "",
  patient_name: input.patient.name,
  patient_email: input.patient.email,
  patient_document: input.patient.document,
  patient_address:
    input.patient.address
    ?? [input.patientRecord?.address_street, input.patientRecord?.address_number, input.patientRecord?.address_complement, input.patientRecord?.address_neighborhood, input.patientRecord?.address_city, input.patientRecord?.address_state]
      .filter(Boolean)
      .join(", "),
  contract_value: input.terms.value,
  contract_periodicity: input.terms.periodicity,
  contract_absence_policy: input.terms.absence_policy,
  contract_payment_method: input.terms.payment_method,
  patient_birth_date: input.patientRecord?.birth_date ?? "",
  patient_cpf: input.patientRecord?.cpf ?? input.patient.document,
  weekly_frequency: input.patientRecord?.billing?.weekly_frequency ? `${input.patientRecord.billing.weekly_frequency}x por semana` : "",
});

const defaultContractTemplateBody = `CONTRATO DE PRESTAÇÃO DE SERVIÇO PROFISSIONAL PARA
REALIZAÇÃO DO ATENDIMENTO PSICOLÓGICO

Psicóloga: {{psychologist_name}}
São partes no presente instrumento particular de Contrato de Prestação de Serviço Profissional, de um lado como
CONTRATADA: {{psychologist_name}}, psicóloga CRP: {{psychologist_license}}, e como CONTRATANTE: {{patient_name}}, CPF {{patient_cpf}}, residente em {{patient_address}}.

Pelos serviços de Atendimento Psicológico prestados, a CONTRATANTE se compromete a pagar à CONTRATADA a importância de {{contract_value}}.

TIPO DE ATENDIMENTO E FREQUÊNCIA
- Frequência: {{contract_periodicity}}
- Forma de pagamento: {{contract_payment_method}}

NORMAS DE FUNCIONAMENTO
1. O pagamento seguirá a condição acordada entre as partes.
2. O não comparecimento deve ser informado com antecedência mínima de 24 horas para não haver cobrança integral.
3. Cada sessão tem duração de 50 a 60 minutos, salvo ajuste prévio.
4. Faltas recorrentes sem justificativa podem implicar revisão do horário reservado.
5. Reajustes poderão ocorrer mediante comunicação prévia e acordo entre as partes.

POLÍTICA DE FALTAS E CANCELAMENTOS
{{contract_absence_policy}}

Estou ciente e concordo com os termos estabelecidos neste contrato.
`;

const resolveContractContent = (
  owner: string,
  input: Pick<Contract, "patient_id" | "psychologist" | "patient" | "terms"> & { template_id?: string; content?: string },
) => {
  if (input.content?.trim()) return input.content.trim();

  const patientRecord = getPatient(owner, input.patient_id);
  const values = buildContractTemplateValues({
    psychologist: input.psychologist,
    patient: input.patient,
    terms: input.terms,
    patientRecord,
  });

  const template = input.template_id ? db.documentTemplates.get(input.template_id) : null;
  const templateBody = template?.html || defaultContractTemplateBody;
  return renderTemplateString(templateBody, values);
};

export const createContract = (owner: string, input: Omit<Contract, "id" | "owner_user_id" | "status" | "created_at" | "updated_at">) => {
  const contract: Contract = {
      id: uid(),
      owner_user_id: owner,
      status: "draft",
      created_at: now(),
      updated_at: now(),
      ...input,
      content: resolveContractContent(owner, input),
    };
    db.contracts.set(contract.id, contract);
    persistMutation();
    return contract;
  };

export const listContracts = (owner: string) => byOwner(db.contracts.values() as Iterable<Contract>, owner);
export const getContract = (owner: string, id: string) => getByOwner(db.contracts as Map<string, Contract>, owner, id);

export const updateContract = (
  owner: string,
  id: string,
  input: Partial<Omit<Contract, "id" | "owner_user_id" | "created_at" | "updated_at">>,
) => {
  const contract = getContract(owner, id);
  if (!contract) return null;

  Object.assign(contract, input);
  if (input.content !== undefined || input.template_id !== undefined || input.terms || input.patient || input.psychologist) {
    contract.content = resolveContractContent(owner, {
      patient_id: contract.patient_id,
      psychologist: contract.psychologist,
      patient: contract.patient,
      terms: contract.terms,
      template_id: contract.template_id,
      content: contract.content,
    });
  }
  contract.updated_at = now();
  db.contracts.set(contract.id, contract);
  persistMutation();
  return contract;
};

export const sendContract = (owner: string, id: string, channel: "email" | "whatsapp", recipient?: string) => {
  const contract = getContract(owner, id);
  if (!contract) return null;
  contract.status = "sent";
  contract.portal_token = contract.portal_token ?? crypto.randomBytes(12).toString("hex");
  contract.delivery_channels = [
    ...(contract.delivery_channels ?? []),
    { channel, recipient, sent_at: now() },
  ];
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

  contract.status = "signed";
  contract.signed_attachment = {
    file_name: input.file_name,
    mime_type: input.mime_type,
    data_url: input.data_url,
    uploaded_at: now(),
  };
  contract.updated_at = now();
  const contractDocument = createDocument(owner, contract.patient_id, contract.patient_id, "therapy-contract", `Contrato assinado - ${contract.patient.name}`) ?? null;
  if (contractDocument) {
    addDocumentVersion(owner, contractDocument.id, {
      content: `<h1>Contrato assinado</h1><p>Arquivo: ${input.file_name}</p><p>Mime type: ${input.mime_type}</p><p><a href="${input.data_url}">Abrir anexo assinado</a></p>`,
      global_values: {
        contract_id: contract.id,
        file_name: input.file_name,
      },
    });
  }
  persistMutation();
  return contract;
};

export const exportContract = (owner: string, id: string, format: "pdf" | "docx") => {
  const contract = getContract(owner, id);
  if (!contract) return null;
  return { contract_id: id, format, content: JSON.stringify(contract) };
};

const defaultDocumentTemplates: Array<{ id: string; title: string; description?: string; kind?: "document" | "contract"; html: string }> = [
  { id: "session-summary", title: "Resumo de sessão", kind: "document", html: "<h1>{{title}}</h1>{{content}}" },
  { id: "evolution-note", title: "Nota de evolução", kind: "document", html: "<h1>Evolução</h1>{{content}}" },
  { id: "payment-receipt", title: "Recibo", kind: "document", description: "Modelo básico de recibo de atendimento.", html: "<h1>Recibo</h1><p>{{content}}</p>" },
  { id: "attendance-declaration", title: "Declaração", kind: "document", description: "Declaração simples de comparecimento.", html: "<h1>Declaração</h1><p>{{content}}</p>" },
  { id: "psychological-certificate", title: "Atestado psicológico", kind: "document", description: "Atestado psicológico para afastamento ou comparecimento.", html: "<h1>Atestado psicológico</h1><p>{{content}}</p>" },
  { id: "therapy-contract", title: "Contrato terapêutico", kind: "contract", description: "Rascunho base para contrato de prestação de serviços.", html: defaultContractTemplateBody },
  { id: "psychological-report", title: "Relatório psicológico", kind: "document", description: "Estrutura inicial para relatórios destinados a terceiros.", html: "<h1>Relatório psicológico</h1><p>{{content}}</p>" },
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
        kind: template.kind ?? "document",
        version: 1,
        html: template.html,
        fields: [],
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

export const createReport = (
  owner: string,
  patientId: string,
  purpose: ClinicalReport["purpose"],
  content: string,
  kind: ClinicalReport["kind"] = "session_report",
) => {
  const report = { id: uid(), owner_user_id: owner, patient_id: patientId, purpose, kind, content, status: "draft" as const, created_at: now() };
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
  if (input.kind === "session_report" || input.kind === "longitudinal_record") report.kind = input.kind;
  if (typeof input.content === "string") report.content = input.content;
  if (input.status === "draft" || input.status === "final") report.status = input.status;

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

const defaultFormTemplates: Array<Omit<FormTemplate, "created_at">> = [
  {
    id: "emotion-diary",
    owner_user_id: "system",
    title: "Diário de Emoções",
    description: "Registro de situações, pensamentos, emoções e ações desconfortáveis entre sessões.",
    audience: "patient",
    active: true,
    fields: [
      { id: "event", label: "Qual foi o acontecimento e quando ocorreu?", type: "textarea", required: true, placeholder: "Descreva a situação com o máximo de clareza." },
      { id: "event_date", label: "Data de quando ocorreu", type: "date", required: true },
      { id: "emotion", label: "Qual emoção ficou mais forte?", type: "select", required: true, options: [
        { label: "Angústia", value: "angustia" },
        { label: "Ansiedade", value: "ansiedade" },
        { label: "Raiva", value: "raiva" },
        { label: "Tristeza", value: "tristeza" },
        { label: "Culpa", value: "culpa" },
        { label: "Vergonha", value: "vergonha" },
        { label: "Outra", value: "outra" },
      ] },
      { id: "thoughts", label: "O que passou pela sua cabeça nesse momento?", type: "textarea", required: true, placeholder: "Escreva pensamentos, interpretações e lembranças ligadas à situação." },
      { id: "actions", label: "O que você fez ou teve vontade de fazer?", type: "textarea", placeholder: "Descreva ações, reações, impulsos ou evitação." },
      { id: "body_signals", label: "O que percebeu no corpo?", type: "textarea", placeholder: "Ex.: aperto no peito, tremor, falta de ar, dor, cansaço." },
      { id: "intensity", label: "Intensidade da emoção", type: "select", required: true, options: [
        { label: "1 - Muito leve", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
        { label: "5 - Muito intensa", value: "5" },
      ] },
      { id: "notes", label: "Algo mais que queira anotar?", type: "textarea", placeholder: "Campo livre." },
    ],
  },
  {
    id: "weekly-checkin",
    owner_user_id: "system",
    title: "Check-in semanal",
    description: "Formulário simples para acompanhar a semana entre sessões.",
    audience: "patient",
    active: true,
    fields: [
      { id: "week_summary", label: "Como foi sua semana?", type: "textarea", required: true },
      { id: "main_difficulty", label: "Qual foi sua principal dificuldade?", type: "textarea" },
      { id: "main_progress", label: "Qual foi seu principal avanço?", type: "textarea" },
      { id: "next_session_topics", label: "Tem algo importante para falar na próxima sessão?", type: "textarea" },
    ],
  },
  {
    id: "initial-anamnesis",
    owner_user_id: "system",
    title: "Anamnese inicial",
    description: "Coleta inicial de histórico pessoal, familiar e clínico.",
    audience: "patient",
    active: true,
    fields: [
      { id: "chief_complaint", label: "O que motivou a busca por atendimento neste momento?", type: "textarea", required: true },
      { id: "previous_therapy", label: "Já fez psicoterapia antes?", type: "select", options: [{ label: "Sim", value: "sim" }, { label: "Não", value: "nao" }] },
      { id: "medication", label: "Usa alguma medicação atualmente?", type: "textarea" },
      { id: "psychiatric_followup", label: "Está em acompanhamento psiquiátrico?", type: "select", options: [{ label: "Sim", value: "sim" }, { label: "Não", value: "nao" }] },
      { id: "goals", label: "O que espera alcançar com a psicoterapia?", type: "textarea" },
    ],
  },
];

const ensureDefaultFormTemplates = () => {
  for (const template of defaultFormTemplates) {
    if (!db.formTemplates.has(template.id)) {
      db.formTemplates.set(template.id, { ...template, created_at: now() });
    }
  }
};

ensureDefaultFormTemplates();

export const listFormsCatalog = (owner?: string, audience?: "patient" | "professional") =>
  Array.from(db.formTemplates.values())
    .filter((item) => item.owner_user_id === "system" || (owner ? item.owner_user_id === owner : true))
    .filter((item) => !audience || item.audience === audience)
    .filter((item) => item.active)
    .sort(compareByNewestDate);

export const createFormTemplate = (owner: string, input: Omit<FormTemplate, "id" | "owner_user_id" | "created_at">): FormTemplate => {
  const item: FormTemplate = { id: uid(), owner_user_id: owner, created_at: now(), ...input };
  db.formTemplates.set(item.id, item);
  persistMutation();
  return item;
};

export const updateFormTemplate = (owner: string, formId: string, input: Partial<Omit<FormTemplate, "id" | "owner_user_id" | "created_at">>) => {
  const template = getByOwner(db.formTemplates, owner, formId);
  if (!template) return null;
  Object.assign(template, input);
  db.formTemplates.set(template.id, template);
  persistMutation();
  return template;
};

export const deleteFormTemplate = (owner: string, formId: string) => {
  const template = getByOwner(db.formTemplates, owner, formId);
  if (!template) return false;
  db.formTemplates.delete(template.id);
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
  const item = { id: uid(), owner_user_id: owner, patient_id: patientId, form_id: formId, content, submitted_by: submittedBy, created_at: now() };
  db.forms.set(item.id, item);
  persistMutation();
  return item;
};

export const listFormEntries = (owner: string, filters?: { patient_id?: string; form_id?: string }) =>
  byOwner(db.forms.values(), owner)
    .filter((item) => (!filters?.patient_id || item.patient_id === filters.patient_id)
      && (!filters?.form_id || item.form_id === filters.form_id))
    .sort(compareByNewestDate);

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
    .filter((entry) => entry.due_date.startsWith(monthKey))
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
          soap: {
            subjective: "Rascunho estruturado indisponÃ­vel no momento. Revisar a transcriÃ§Ã£o original.",
            objective: "Sem extraÃ§Ã£o automÃ¡tica confiÃ¡vel de dados observÃ¡veis.",
            assessment: "InterpretaÃ§Ã£o clÃ­nica nÃ£o automatizada. Completar manualmente.",
            plan: "Definir prÃ³ximos passos apÃ³s revisÃ£o manual.",
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

  job.status = "running";
  job.progress = 0.5;
  job.updated_at = now();
  persistMutation();
  await new Promise((resolve) => setTimeout(resolve, 20));

  if (job.type === "transcription" && job.resource_id) {
    const transcript = addTranscript(job.owner_user_id, job.resource_id, options.rawText ?? "");
    const session = getByOwner(db.sessions, job.owner_user_id, job.resource_id);
    if (session) {
      const draftNote = await createStructuredDraftForTranscript(job, session, transcript.raw_text);
      job.draft_note_id = draftNote.id;
    }
    job.result_uri = `transcript:${transcript.id}`;
    addTelemetry({ user_id: job.owner_user_id, event_type: "TRANSCRIPTION_JOB_COMPLETED", duration_ms: Math.max(60_000, (options.rawText ?? "").length * 1_000) });
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

