import crypto from "node:crypto";
import type {
  AnamnesisResponse,
  AnamnesisTemplate,
  AudioRecord,
  ClinicalNote,
  ClinicalReport,
  FinancialEntry,
  FormEntry,
  FormTemplate,
  Patient,
  Receipt,
  Scale,
  ScaleRecord,
  Session,
  SessionStatus,
  Transcript,
  User,
} from "./types";

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export const db = {
  users: new Map<string, User>(),
  patients: new Map<string, Patient>(),
  sessions: new Map<string, Session>(),
  audioRecords: new Map<string, AudioRecord>(),
  transcripts: new Map<string, Transcript>(),
  clinicalNotes: new Map<string, ClinicalNote>(),
  reports: new Map<string, ClinicalReport>(),
  anamnesisTemplates: new Map<string, AnamnesisTemplate>(),
  anamnesisResponses: new Map<string, AnamnesisResponse>(),
  scales: new Map<string, Scale>(),
  scaleRecords: new Map<string, ScaleRecord>(),
  formTemplates: new Map<string, FormTemplate>(),
  formEntries: new Map<string, FormEntry>(),
  financialEntries: new Map<string, FinancialEntry>(),
  receipts: new Map<string, Receipt>(),
};

const defaultUserId = id();
db.users.set(defaultUserId, { id: defaultUserId, name: "Default Psychologist", email: "local@ethos", role: "psychologist", created_at: now() });

const defaultPatientId = id();
db.patients.set(defaultPatientId, { id: defaultPatientId, user_id: defaultUserId, name: "Paciente Offline", contact_info: "local", created_at: now() });

export const seeds = { defaultUserId, defaultPatientId };

export const createSession = (patientId: string, scheduledAt: string) => {
  const session: Session = { id: id(), patient_id: patientId, scheduled_at: scheduledAt, status: "scheduled", created_at: now() };
  db.sessions.set(session.id, session);
  return session;
};

export const patchSessionStatus = (sessionId: string, status: SessionStatus) => {
  const session = db.sessions.get(sessionId);
  if (!session) return null;
  session.status = status;
  return session;
};

export const addAudio = (sessionId: string, encryptedPath: string, consentConfirmed: boolean) => {
  const record: AudioRecord = {
    id: id(),
    session_id: sessionId,
    file_path: encryptedPath,
    consent_confirmed: consentConfirmed,
    created_at: now(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
  db.audioRecords.set(record.id, record);
  return record;
};

export const addTranscript = (sessionId: string, rawText: string) => {
  const transcript: Transcript = {
    id: id(),
    session_id: sessionId,
    raw_text: rawText,
    segments: [{ start: 0, end: 1, text: rawText.slice(0, 80) }],
    created_at: now(),
  };
  db.transcripts.set(transcript.id, transcript);
  return transcript;
};

export const createClinicalNoteDraft = (sessionId: string, content: string) => {
  const version = Array.from(db.clinicalNotes.values()).filter((n) => n.session_id === sessionId).length + 1;
  const note: ClinicalNote = { id: id(), session_id: sessionId, content, status: "draft", version, created_at: now() };
  db.clinicalNotes.set(note.id, note);
  return note;
};

export const validateClinicalNote = (noteId: string) => {
  const note = db.clinicalNotes.get(noteId);
  if (!note) return null;
  note.status = "validated";
  note.validated_at = now();
  return note;
};

export const createReport = (patientId: string, purpose: "instituição" | "profissional" | "paciente", content: string) => {
  const sessionIds = Array.from(db.sessions.values()).filter((s) => s.patient_id === patientId).map((s) => s.id);
  const hasValidated = Array.from(db.clinicalNotes.values()).some((n) => sessionIds.includes(n.session_id) && n.status === "validated");
  if (!hasValidated) return null;
  const report: ClinicalReport = { id: id(), patient_id: patientId, purpose, content, created_at: now() };
  db.reports.set(report.id, report);
  return report;
};

export const createAnamnesis = (patientId: string, templateId: string, content: Record<string, unknown>) => {
  const version = Array.from(db.anamnesisResponses.values()).filter((a) => a.patient_id === patientId && a.template_id === templateId).length + 1;
  const response: AnamnesisResponse = { id: id(), patient_id: patientId, template_id: templateId, content, version, created_at: now() };
  db.anamnesisResponses.set(response.id, response);
  return response;
};

export const createScaleRecord = (scaleId: string, patientId: string, score: number) => {
  const record: ScaleRecord = { id: id(), scale_id: scaleId, patient_id: patientId, score, recorded_at: now() };
  db.scaleRecords.set(record.id, record);
  return record;
};

export const createFormEntry = (patientId: string, formId: string, content: Record<string, unknown>) => {
  const entry: FormEntry = { id: id(), patient_id: patientId, form_id: formId, content, created_at: now() };
  db.formEntries.set(entry.id, entry);
  return entry;
};

export const createFinancialEntry = (payload: Omit<FinancialEntry, "id">) => {
  const entry: FinancialEntry = { id: id(), ...payload };
  db.financialEntries.set(entry.id, entry);
  return entry;
};

export const createReceipt = (financialEntryId: string) => {
  const receipt: Receipt = {
    id: id(),
    financial_entry_id: financialEntryId,
    generated_at: now(),
    file_path: `vault://receipts/${financialEntryId}.pdf`,
  };
  db.receipts.set(receipt.id, receipt);
  return receipt;
};
