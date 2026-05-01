/**
 * Shared Types & DTOs
 * 
 * Types compartilhados entre módulos
 * Sprint: 1 (Foundation)
 */

import { VersionedEntity } from '../infra/repository.base';

/** UUID string type */
export type UUID = string & { readonly __brand: 'UUID' };

/** Role enums */
export enum Role {
  PATIENT = 'patient',
  CLINICIAN = 'clinician',
  ADMIN = 'admin',
  STAFF = 'staff',
}

/** Session status */
export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

/** Clinical note status */
export enum ClinicalNoteStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
  ARCHIVED = 'archived',
}

/**
 * Base User DTO
 */
export interface UserDTO extends VersionedEntity {
  id: UUID;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  metadata?: Record<string, any>;
}

/**
 * Base Error Type
 */
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Operation for offline queuing
 */
export interface Operation extends VersionedEntity {
  id: UUID;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'patient' | 'session' | 'clinical_note';
  entityId: UUID;
  payload: Record<string, any>;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retries: number;
  error?: AppError;
  syncedAt?: Date;
}

/**
 * Sync State
 */
export interface SyncState {
  lastSyncAt: Date | null;
  isSyncing: boolean;
  syncProgress: number; // 0-100
  lastError?: AppError;
  totalOperations: number;
  pendingOperations: number;
}
