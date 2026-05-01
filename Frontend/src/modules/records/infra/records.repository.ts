/**
 * Clinical Records Repository Interface
 * 
 * Contrato para operações de persistência de Registros Clínicos
 * Camada: Infrastructure
 * Sprint: 1 (Foundation)
 */

import { Repository } from '../../shared/infra/repository.base';
import { ClinicalNote, ClinicalNoteType, ClinicalNoteStatus } from '../domain/types';
import { UUID, ClinicalNoteStatus as SharedClinicalNoteStatus } from '../../shared/types/index';

export interface RecordsRepository extends Repository<ClinicalNote> {
  /**
   * Buscar notas clínicas de um paciente
   */
  findByPatientId(patientId: UUID): Promise<ClinicalNote[]>;
  
  /**
   * Buscar notas de uma sessão
   */
  findBySessionId(sessionId: UUID): Promise<ClinicalNote[]>;
  
  /**
   * Buscar notas criadas por um clínico
   */
  findByClinicianId(clinicianId: UUID): Promise<ClinicalNote[]>;
  
  /**
   * Buscar por tipo de nota
   */
  findByType(type: ClinicalNoteType): Promise<ClinicalNote[]>;
  
  /**
   * Buscar por status
   */
  findByStatus(status: SharedClinicalNoteStatus): Promise<ClinicalNote[]>;
  
  /**
   * Buscar rascunhos de um paciente
   */
  findDraftsByPatientId(patientId: UUID): Promise<ClinicalNote[]>;
  
  /**
   * Buscar notas finalizadas
   */
  findFinalized(): Promise<ClinicalNote[]>;
  
  /**
   * Buscar notas confidenciais
   */
  findConfidential(): Promise<ClinicalNote[]>;
  
  /**
   * Buscar notas com tag específica
   */
  findByTag(tag: string): Promise<ClinicalNote[]>;
  
  /**
   * Buscar notas em intervalo de datas
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<ClinicalNote[]>;
  
  /**
   * Buscar notas recentes de um paciente
   */
  findRecentByPatientId(patientId: UUID, limit?: number): Promise<ClinicalNote[]>;
  
  /**
   * Buscar com paginação avançada
   */
  findPaginatedAdvanced(
    filters: {
      patientId?: UUID;
      sessionId?: UUID;
      clinicianId?: UUID;
      type?: ClinicalNoteType;
      status?: SharedClinicalNoteStatus;
      confidential?: boolean;
      tags?: string[];
      startDate?: Date;
      endDate?: Date;
      searchText?: string;
    },
    page?: number,
    pageSize?: number,
    sortBy?: 'createdAt' | 'updatedAt' | 'finalizedAt'
  ): Promise<{ items: ClinicalNote[]; total: number; page: number; pageSize: number }>;
  
  /**
   * Contar notas não finalizadas de um paciente
   */
  countDraftsByPatientId(patientId: UUID): Promise<number>;
}
