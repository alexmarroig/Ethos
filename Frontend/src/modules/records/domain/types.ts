/**
 * Clinical Records Domain Types
 * 
 * Definição das entidades de Registros Clínicos (ClinicalNotes, Anamnesis, etc)
 * Sprint: 1 (Foundation)
 */

import { UUID, ClinicalNoteStatus, VersionedEntity } from '../../shared/types/index';

/** Clinical note types */
export enum ClinicalNoteType {
  ANAMNESIS = 'anamnesis', // Initial assessment
  SESSION_NOTE = 'session_note', // Regular session notes
  EVALUATION = 'evaluation', // Formal evaluation
  PROGRESS_NOTE = 'progress_note', // Progress tracking
  DISCHARGE = 'discharge', // Discharge summary
  CONSULTATION = 'consultation', // Consultation note
  PRESCRIPTION = 'prescription', // Prescription
  EXAM_RESULT = 'exam_result', // Lab/exam results
}

/**
 * Clinical Note (Prontuário/Anotação Clínica)
 */
export interface ClinicalNote extends VersionedEntity {
  id: UUID;
  
  // Basic info
  type: ClinicalNoteType;
  status: ClinicalNoteStatus;
  title?: string;
  
  // Relationships
  patientId: UUID;
  sessionId?: UUID;
  clinicianId: UUID;
  
  // Content
  content: string; // Rich text or markdown
  structuredData?: ClinicalNoteStructuredData;
  
  // Findings
  observations?: string[];
  assessments?: string[];
  recommendations?: string[];
  
  // Tags & Classification
  tags?: string[];
  confidential?: boolean;
  
  // Attachments
  attachments?: Attachment[];
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Audit
  createdBy: UUID;
  ownerUserId: UUID;
  finalizedAt?: Date;
  deletedAt?: Date | null;
}

/**
 * Structured data for clinical notes
 */
export interface ClinicalNoteStructuredData {
  complaints?: string[];
  symptoms?: {
    name: string;
    severity?: number; // 1-10
    duration?: string;
  }[];
  medicalHistory?: string[];
  currentMedications?: Medication[];
  allergies?: Allergy[];
  vitals?: Vitals;
  physicalExam?: string;
  diagnosis?: Diagnosis[];
  treatment?: string;
  followUp?: string;
  referrals?: Referral[];
}

/**
 * Medication
 */
export interface Medication {
  id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  indication?: string;
  route?: 'oral' | 'intravenous' | 'intramuscular' | 'topical' | 'other';
}

/**
 * Allergy
 */
export interface Allergy {
  id?: string;
  substance: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

/**
 * Vitals (Sinais Vitais)
 */
export interface Vitals {
  temperature?: number; // °C
  bloodPressure?: string; // "120/80"
  heartRate?: number; // bpm
  respiratoryRate?: number; // breaths/min
  bloodOxygenation?: number; // %
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
}

/**
 * Diagnosis
 */
export interface Diagnosis {
  id?: string;
  code?: string; // ICD-10
  description: string;
  confirmed?: boolean;
  date?: Date;
}

/**
 * Referral
 */
export interface Referral {
  id?: string;
  specialty: string;
  clinician?: string;
  reason: string;
  urgent?: boolean;
  date?: Date;
}

/**
 * Attachment
 */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  url?: string;
  localPath?: string; // para IndexedDB
}

/**
 * Clinical Note DTO
 */
export type CreateClinicalNoteDTO = Omit<ClinicalNote, 'id' | 'createdAt' | 'updatedAt' | 'syncedAt' | 'syncVersion' | 'version' | 'finalizedAt'>;
export type UpdateClinicalNoteDTO = Partial<Omit<ClinicalNote, 'id' | 'createdAt' | 'createdBy' | 'ownerUserId'>>;
