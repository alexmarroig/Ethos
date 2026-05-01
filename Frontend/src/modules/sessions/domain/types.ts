/**
 * Session Domain Types
 * 
 * Definição das entidades de Sessões (Sessions/Appointments)
 * Sprint: 1 (Foundation)
 */

import { UUID, SessionStatus, VersionedEntity } from '../../shared/types/index';

/** Session type */
export enum SessionType {
  INDIVIDUAL = 'individual',
  COUPLE = 'couple',
  FAMILY = 'family',
  GROUP = 'group',
}

/** Session format */
export enum SessionFormat {
  IN_PERSON = 'in_person',
  REMOTE = 'remote',
  PHONE = 'phone',
  HYBRID = 'hybrid',
}

/**
 * Session (Sessão/Consulta)
 */
export interface Session extends VersionedEntity {
  id: UUID;
  
  // Basic info
  title?: string;
  description?: string;
  type: SessionType;
  format: SessionFormat;
  status: SessionStatus;
  
  // Participants
  patientIds: UUID[];
  clinicianId: UUID;
  supportStaffIds?: UUID[];
  
  // Timing
  scheduledAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // in minutes
  
  // Location
  location?: string;
  remoteMeetingUrl?: string;
  
  // Content
  notes?: string;
  tags?: string[];
  
  // Cost/Billing
  cost?: number;
  currencyCode?: string;
  paymentStatus?: 'pending' | 'paid' | 'cancelled';
  
  // Metadata
  metadata?: Record<string, any>;
  attachments?: string[]; // file URLs/IDs
  
  // Audit
  createdBy?: UUID;
  ownerUserId: UUID;
  deletedAt?: Date | null;
}

/**
 * Session DTO
 */
export type CreateSessionDTO = Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'syncedAt' | 'syncVersion' | 'version' | 'startedAt' | 'endedAt'>;
export type UpdateSessionDTO = Partial<Omit<Session, 'id' | 'createdAt' | 'ownerUserId'>>;

/**
 * Session Event (for event sourcing)
 */
export interface SessionEvent extends VersionedEntity {
  id: UUID;
  sessionId: UUID;
  type: 'CREATED' | 'STARTED' | 'ENDED' | 'RESCHEDULED' | 'CANCELLED';
  timestamp: Date;
  actor: UUID;
  details?: Record<string, any>;
}
