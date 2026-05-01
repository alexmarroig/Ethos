/**
 * Patient Repository Interface
 * 
 * Contrato para operações de persistência de Pacientes
 * Camada: Infrastructure
 * Sprint: 1 (Foundation)
 */

import { Repository } from '../../shared/infra/repository.base';
import { Patient, PatientCareStatus } from '../domain/types';
import { UUID } from '../../shared/types/index';

export interface PatientsRepository extends Repository<Patient> {
  /**
   * Buscar pacientes por clínico
   */
  findByClinicianId(clinicianId: UUID): Promise<Patient[]>;
  
  /**
   * Buscar pacientes por status de cuidado
   */
  findByCareStatus(status: PatientCareStatus): Promise<Patient[]>;
  
  /**
   * Buscar pacientes ativos
   */
  findActive(): Promise<Patient[]>;
  
  /**
   * Buscar por CPF
   */
  findByCpf(cpf: string): Promise<Patient | null>;
  
  /**
   * Buscar por email
   */
  findByEmail(email: string): Promise<Patient | null>;
  
  /**
   * Buscar deletados
   */
  findDeleted(): Promise<Patient[]>;
  
  /**
   * Restaurar paciente deletado
   */
  restore(id: UUID): Promise<Patient>;
  
  /**
   * Buscar por tag
   */
  findByTag(tag: string): Promise<Patient[]>;
  
  /**
   * Buscar com paginação avançada
   */
  findPaginatedAdvanced(
    filters: {
      name?: string;
      careStatus?: PatientCareStatus;
      clinicianId?: UUID;
      tags?: string[];
      searchText?: string;
    },
    page?: number,
    pageSize?: number,
    sortBy?: 'name' | 'createdAt' | 'updatedAt'
  ): Promise<{ items: Patient[]; total: number; page: number; pageSize: number }>;
}
