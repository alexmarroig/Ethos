export type UUID = string;

export type SessionStatus = "scheduled" | "confirmed" | "missed" | "completed";
export type ClinicalNoteStatus = "draft" | "validated";
export type FinancialType = "receivable" | "payable";
export type FinancialStatus = "open" | "paid";

export type User = {
  id: UUID;
  name: string;
  email: string;
  role: "psychologist";
  created_at: string;
};

export type Patient = {
  id: UUID;
  user_id: UUID;
  name: string;
  contact_info: string;
  created_at: string;
};

export type Session = {
  id: UUID;
  patient_id: UUID;
  scheduled_at: string;
  status: SessionStatus;
  created_at: string;
};

export type AudioRecord = {
  id: UUID;
  session_id: UUID;
  file_path: string;
  consent_confirmed: boolean;
  created_at: string;
  expires_at: string;
};

export type Transcript = {
  id: UUID;
  session_id: UUID;
  raw_text: string;
  segments: Array<{ start: number; end: number; text: string }>;
  created_at: string;
};

export type ClinicalNote = {
  id: UUID;
  session_id: UUID;
  content: string;
  status: ClinicalNoteStatus;
  version: number;
  validated_at?: string;
  created_at: string;
};

export type ClinicalReport = {
  id: UUID;
  patient_id: UUID;
  purpose: "instituição" | "profissional" | "paciente";
  content: string;
  created_at: string;
};

export type AnamnesisTemplate = { id: UUID; name: string; structure: Record<string, unknown>; created_at: string };
export type AnamnesisResponse = { id: UUID; patient_id: UUID; template_id: UUID; content: Record<string, unknown>; version: number; created_at: string };
export type Scale = { id: UUID; name: string; description: string; items: unknown[] };
export type ScaleRecord = { id: UUID; scale_id: UUID; patient_id: UUID; score: number; recorded_at: string };
export type FormTemplate = { id: UUID; name: string; structure: Record<string, unknown> };
export type FormEntry = { id: UUID; patient_id: UUID; form_id: UUID; content: Record<string, unknown>; created_at: string };
export type FinancialEntry = { id: UUID; patient_id: UUID; type: FinancialType; amount: number; due_date: string; status: FinancialStatus; description: string };
export type Receipt = { id: UUID; financial_entry_id: UUID; generated_at: string; file_path: string };

export type ApiError = { error: string; code: string };
