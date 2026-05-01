/**
 * Patient Domain Types
 * 
 * Definição das entidades e value objects do domínio de Pacientes
 * Sprint: 1 (Foundation)
 */

import { UUID, VersionedEntity } from '../../shared/types/index';

/** Patient marital status */
export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
  STABLE_UNION = 'stable_union',
  OTHER = 'other',
}

/** Patient gender */
export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  NON_BINARY = 'NB',
  OTHER = 'O',
  PREFER_NOT_SAY = 'PNS',
}

/** Care status */
export enum PatientCareStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

/**
 * Patient (Paciente)
 */
export interface Patient extends VersionedEntity {
  id: UUID;
  name: string;
  email?: string;
  phone?: string;
  birthDate?: Date;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  cpf?: string; // CPF: Cadastro de Pessoas Físicas
  rg?: string;
  
  // Address
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  
  // Clinical
  careStatus: PatientCareStatus;
  activeClinicianIds?: UUID[];
  
  // Metadata
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  
  // Audit
  createdBy?: UUID;
  ownerUserId: UUID; // Isolamento por tenant
  deletedAt?: Date | null;
}

/**
 * Patient DTO (para API)
 */
export type CreatePatientDTO = Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'syncedAt' | 'syncVersion' | 'version'>;
export type UpdatePatientDTO = Partial<Omit<Patient, 'id' | 'createdAt' | 'ownerUserId'>>;

/**
 * Patient value object: Phone
 */
export interface PhoneNumber {
  number: string;
  countryCode: string;
  type?: 'mobile' | 'home' | 'work';
}

/**
 * Patient value object: Address
 */
export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
