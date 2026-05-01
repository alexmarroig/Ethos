/**
 * Repository Pattern Base Interface
 * 
 * Define o contrato mínimo para todas as repositories
 * Camada: Infrastructure (Infra)
 * Sprint: 1 (Foundation)
 */

export interface Repository<T, ID = string> {
  /** Buscar por ID */
  getById(id: ID): Promise<T | null>;
  
  /** Criar entidade */
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  
  /** Atualizar parcialmente */
  update(id: ID, partial: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T>;
  
  /** Deletar */
  delete(id: ID): Promise<void>;
  
  /** Listar com filtros opcionais */
  list(filters?: Partial<T>): Promise<T[]>;
  
  /** Buscar com paginação */
  findPaginated(
    filters?: Partial<T>,
    page?: number,
    pageSize?: number
  ): Promise<{ items: T[]; total: number; page: number; pageSize: number }>;
  
  /** Verificar se existe */
  exists(id: ID): Promise<boolean>;
  
  /** Contar total */
  count(filters?: Partial<T>): Promise<number>;
  
  /** Clear all (useful for testing/reset) */
  clear(): Promise<void>;
}

/**
 * Sync Repository - adicional para sincronização
 */
export interface SyncRepository<T, ID = string> extends Repository<T, ID> {
  /** Marcar como sincronizado */
  markAsSynced(id: ID, syncedAt: Date, syncVersion?: number): Promise<void>;
  
  /** Buscar não sincronizados */
  getUnsyncedChanges(): Promise<T[]>;
  
  /** Buscar por syncVersion */
  getBySyncVersion(version: number): Promise<T[]>;
}

/**
 * Versioning info para cada entidade
 */
export interface VersionedEntity {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
  syncVersion?: number;
}
