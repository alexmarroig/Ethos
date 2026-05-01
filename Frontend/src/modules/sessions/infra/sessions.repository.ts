/**
 * Sessions Repository Interface
 * 
 * Contrato para operações de persistência de Sessões
 * Camada: Infrastructure
 * Sprint: 1 (Foundation)
 */

import { Repository } from '../../shared/infra/repository.base';
import { Session, SessionStatus, SessionType } from '../domain/types';
import { UUID } from '../../shared/types/index';

export interface SessionsRepository extends Repository<Session> {
  /**
   * Buscar sessões de um paciente
   */
  findByPatientId(patientId: UUID): Promise<Session[]>;
  
  /**
   * Buscar sessões de um clínico
   */
  findByClinicianId(clinicianId: UUID): Promise<Session[]>;
  
  /**
   * Buscar sessões agendadas para uma data
   */
  findByDate(date: Date): Promise<Session[]>;
  
  /**
   * Buscar sessões por status
   */
  findByStatus(status: SessionStatus): Promise<Session[]>;
  
  /**
   * Buscar sessões pendentes
   */
  findPending(): Promise<Session[]>;
  
  /**
   * Buscar sessões completadas
   */
  findCompleted(): Promise<Session[]>;
  
  /**
   * Buscar sessões em intervalo de datas
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Session[]>;
  
  /**
   * Buscar próximas sessões
   */
  findUpcoming(days?: number): Promise<Session[]>;
  
  /**
   * Buscar por tipo de sessão
   */
  findByType(type: SessionType): Promise<Session[]>;
  
  /**
   * Buscar rascunhos de sessão
   */
  findDrafts(): Promise<Session[]>;
  
  /**
   * Buscar com paginação avançada
   */
  findPaginatedAdvanced(
    filters: {
      patientId?: UUID;
      clinicianId?: UUID;
      status?: SessionStatus;
      type?: SessionType;
      startDate?: Date;
      endDate?: Date;
      searchText?: string;
    },
    page?: number,
    pageSize?: number,
    sortBy?: 'scheduledAt' | 'createdAt' | 'updatedAt'
  ): Promise<{ items: Session[]; total: number; page: number; pageSize: number }>;
}
