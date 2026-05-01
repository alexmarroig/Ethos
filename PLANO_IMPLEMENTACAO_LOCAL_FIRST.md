# PLANO DE IMPLEMENTAÇÃO: Local-First do Ethos Web

**Status**: Gerado em 01/05/2026  
**Baseline**: Frontend Web (Lovable/Vite) + Backend (ethos-clinic)  
**Objetivo**: Implementar arquitetura local-first com IndexedDB, contratos de repositories, e domain services  

---

## PARTE 1: ANÁLISE COMPARATIVA

### ✅ O que JÁ EXISTE

#### Backend (apps/ethos-clinic/src)
- ✅ Arquitetura limpa: `domain/` → `application/` → `infra/` → `api/`
- ✅ Types bem definidos: Patient, Session, ClinicalNote, etc.
- ✅ Camada de aplicação com Services (SessionService, PatientService)
- ✅ Endpoints documentados em OpenAPI 3.0
- ✅ Multi-usuário com isolamento por `owner_user_id`
- ✅ Paginação, filtros, idempotência

#### Frontend (Frontend/src)
- ✅ 30+ serviços (patientService, sessionService, reportService, etc.)
- ✅ Contextos: AuthContext, OnboardingContext, EntitlementsContext
- ✅ localStorage para auth, settings, rascunhos
- ✅ Draft recovery para sessões (agendaStorage.ts)
- ✅ BackupService para export/restore
- ✅ SavedLocally.tsx para feedback visual
- ✅ ConnectivityBanner.tsx detecta offline

#### Desktop (apps/ethos-desktop)
- ✅ Electron com SQLite local
- ✅ Audio encryption (AES-256-GCM)
- ✅ Token encryption com safeStorage
- ✅ File system access

#### Mobile (apps/ethos-mobile)
- ✅ expo-secure-store para credenciais
- ✅ Expo FileSystem para arquivos
- ✅ LocalReminders (expo-notifications)

### ❌ O QUE FALTA NO FRONTEND WEB

1. **Persistência Local**
   - ❌ IndexedDB não implementado
   - ❌ Sem cache local de pacientes/sessões/notas
   - ❌ localStorage usado apenas para auth/settings

2. **Arquitetura Limpa**
   - ❌ Services soltos em `Frontend/src/services/` sem separação por domínio
   - ❌ Sem layer de Repositories
   - ❌ Sem Domain Services
   - ❌ Sem Contratos (interfaces) de persistência

3. **Refactor de Routing & Providers**
   - ❌ Index.tsx concentra tudo (router + state)
   - ❌ Contextos espalhados, sem AppProvider central
   - ❌ Sem separação de módulos por domínio (patients, sessions, records)

4. **Sincronização Local-Remote**
   - ❌ Sem estratégia de sync bidirecional
   - ❌ Sem conflict resolution
   - ❌ Sem queue de operações offline

---

## PARTE 2: PLANO DE IMPLEMENTAÇÃO POR FASES

### FASE 0: SETUP DA ARQUITETURA (1-2 dias)

**Goal**: Criar base de pasta e contratos

#### 0.1 - Criar estrutura de pastas
```
Frontend/src/
  app/                          # Nova camada de aplicação
  providers/                    # Providers centralizados
    AppProvider.tsx             # Provider raiz
    AuthProvider.tsx
    PersistenceProvider.tsx
    EntitlementsProvider.tsx
  shell/                        # Layout shell
    Sidebar.tsx
    AppShell.tsx
  modules/                      # Módulos por domínio
    patients/
      domain/
        types.ts
        errors.ts
      application/
        services/
      infra/
        repository.ts
      ui/
        pages/
        components/
    sessions/
      domain/
      application/
      infra/
      ui/
    records/
      domain/
      application/
      infra/
      ui/
    shared/
      utils/
      hooks/
```

**Tarefas**:
- [ ] Criar pastas em `Frontend/src/`
- [ ] Mover AppShell + Sidebar para `Frontend/src/shell/`
- [ ] Criar `Frontend/src/app/` como entry point
- [ ] Criar `Frontend/src/providers/` com stubs dos providers

#### 0.2 - Definir contratos de Repository
**Arquivo**: `Frontend/src/modules/shared/infra/repository.base.ts`
```typescript
export interface Repository<T> {
  getById(id: string): Promise<T | null>;
  create(entity: T): Promise<T>;
  update(id: string, partial: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  list(filters?: Record<string, any>): Promise<T[]>;
}
```

**Tarefas**:
- [ ] Criar tipos base de Repository
- [ ] Definir PatientsRepository, SessionsRepository, RecordsRepository
- [ ] Criar tipos de erro (NotFoundError, ValidationError)

---

### FASE 1: INDEXEDDB LOCAL (2-3 dias)

**Goal**: Implementar persistência local com IndexedDB

#### 1.1 - Criar IndexedDB adapter
**Arquivo**: `Frontend/src/modules/shared/infra/indexeddb.adapter.ts`

```typescript
export class IndexedDBAdapter {
  private dbName = "ethos-clinic";
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = (e) => this.onUpgrade(e);
    });
  }

  private onUpgrade(e: IDBVersionChangeEvent): void {
    const db = (e.target as IDBOpenDBRequest).result;
    // Criar object stores aqui
    if (!db.objectStoreNames.contains("patients")) {
      db.createObjectStore("patients", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("sessions")) {
      db.createObjectStore("sessions", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("clinical_notes")) {
      db.createObjectStore("clinical_notes", { keyPath: "id" });
    }
  }

  async get<T>(store: string, key: string): Promise<T | null> {
    const req = this.db!
      .transaction(store, "readonly")
      .objectStore(store)
      .get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result ?? null);
    });
  }

  async put<T>(store: string, item: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.db!
        .transaction(store, "readwrite")
        .objectStore(store)
        .put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async delete(store: string, key: string): Promise<void> {
    return new Promise((resolve) => {
      this.db!
        .transaction(store, "readwrite")
        .objectStore(store)
        .delete(key);
      resolve();
    });
  }

  async getAll<T>(store: string): Promise<T[]> {
    return new Promise((resolve) => {
      const req = this.db!
        .transaction(store, "readonly")
        .objectStore(store)
        .getAll();
      req.onsuccess = () => resolve(req.result ?? []);
    });
  }
}

export const idbAdapter = new IndexedDBAdapter();
```

**Tarefas**:
- [ ] Implementar IndexedDBAdapter
- [ ] Testar operações básicas (get, put, delete, getAll)
- [ ] Adicionar métodos de transação para múltiplos stores
- [ ] Criar migrações para schema updates

#### 1.2 - Implementar Repositories para cada domínio
**Arquivo**: `Frontend/src/modules/patients/infra/repository.ts`

```typescript
export interface PatientDTO {
  id: string;
  external_id: string;
  name: string;
  email?: string;
  phone?: string;
  care_status: "active" | "paused" | "transferred" | "inactive";
  created_at: string;
  updated_at: string;
  owner_user_id: string;
}

export interface PatientsRepository {
  getById(id: string): Promise<PatientDTO | null>;
  create(patient: PatientDTO): Promise<PatientDTO>;
  update(id: string, partial: Partial<PatientDTO>): Promise<PatientDTO>;
  delete(id: string): Promise<void>;
  list(filters?: { careStatus?: string }): Promise<PatientDTO[]>;
  listByOwner(ownerUserId: string): Promise<PatientDTO[]>;
}

export class IndexedDBPatientsRepository implements PatientsRepository {
  constructor(private idb: IndexedDBAdapter) {}

  async getById(id: string): Promise<PatientDTO | null> {
    return this.idb.get("patients", id);
  }

  async create(patient: PatientDTO): Promise<PatientDTO> {
    await this.idb.put("patients", patient);
    return patient;
  }

  async update(id: string, partial: Partial<PatientDTO>): Promise<PatientDTO> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Patient not found");
    const updated = { ...existing, ...partial, updated_at: new Date().toISOString() };
    await this.idb.put("patients", updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.idb.delete("patients", id);
  }

  async list(filters?: { careStatus?: string }): Promise<PatientDTO[]> {
    const all = await this.idb.getAll<PatientDTO>("patients");
    if (!filters?.careStatus) return all;
    return all.filter((p) => p.care_status === filters.careStatus);
  }

  async listByOwner(ownerUserId: string): Promise<PatientDTO[]> {
    const all = await this.idb.getAll<PatientDTO>("patients");
    return all.filter((p) => p.owner_user_id === ownerUserId);
  }
}
```

**Tarefas**:
- [ ] Implementar PatientsRepository (IndexedDB)
- [ ] Implementar SessionsRepository (IndexedDB)
- [ ] Implementar RecordsRepository (IndexedDB)
- [ ] Criar tipos DTO para cada domínio
- [ ] Adicionar validação e error handling

---

### FASE 2: DOMAIN SERVICES (2 dias)

**Goal**: Criar camada de lógica de negócio local

#### 2.1 - Domain Services
**Arquivo**: `Frontend/src/modules/patients/application/service.ts`

```typescript
export class PatientDomainService {
  constructor(private repo: PatientsRepository) {}

  async getPatientWithStats(id: string) {
    const patient = await this.repo.getById(id);
    if (!patient) throw new NotFoundError("Patient not found");

    // Aqui podem ir regras de negócio complexas
    return {
      ...patient,
      stats: {
        totalSessions: 0, // será populado depois
        lastSession: null,
      },
    };
  }

  async createPatient(data: CreatePatientInput): Promise<PatientDTO> {
    // Validação de regras de negócio
    if (!data.name?.trim()) throw new ValidationError("Name is required");

    const patient: PatientDTO = {
      id: generateId(),
      external_id: data.externalId || "",
      name: data.name.trim(),
      email: data.email,
      phone: data.phone,
      care_status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_user_id: data.ownerUserId,
    };

    return this.repo.create(patient);
  }

  async updatePatientStatus(
    id: string,
    status: "active" | "paused" | "transferred" | "inactive"
  ) {
    // Validação: só pode transitar entre certos estados
    const patient = await this.repo.getById(id);
    if (!patient) throw new NotFoundError("Patient not found");

    return this.repo.update(id, { care_status: status });
  }
}
```

**Tarefas**:
- [ ] Implementar PatientDomainService
- [ ] Implementar SessionDomainService
- [ ] Implementar RecordDomainService
- [ ] Adicionar métodos de validação de regras de negócio
- [ ] Criar tipos de input/output

#### 2.2 - Sync Service (sincronização local-remoto)
**Arquivo**: `Frontend/src/modules/shared/application/sync.service.ts`

```typescript
export class SyncService {
  constructor(
    private patientsRepo: PatientsRepository,
    private sessionsRepo: SessionsRepository,
    private recordsRepo: RecordsRepository,
    private api: ApiClient
  ) {}

  async syncPatients(): Promise<{ synced: number; errors: number }> {
    try {
      const remotePatients = await this.api.getPatients();
      let synced = 0;

      for (const patient of remotePatients) {
        await this.patientsRepo.create(patient);
        synced++;
      }

      return { synced, errors: 0 };
    } catch (error) {
      return { synced: 0, errors: 1 };
    }
  }

  async syncSessions(): Promise<{ synced: number; errors: number }> {
    // Similar ao de patients
    return { synced: 0, errors: 0 };
  }

  async syncAll(): Promise<SyncResult> {
    const [patients, sessions, records] = await Promise.allSettled([
      this.syncPatients(),
      this.syncSessions(),
      this.syncRecords(),
    ]);

    return {
      patients: patients.status === "fulfilled" ? patients.value : { synced: 0, errors: 1 },
      sessions: sessions.status === "fulfilled" ? sessions.value : { synced: 0, errors: 1 },
      records: records.status === "fulfilled" ? records.value : { synced: 0, errors: 1 },
    };
  }
}
```

**Tarefas**:
- [ ] Implementar SyncService (pull de remoto para local)
- [ ] Adicionar detecção de conflitos
- [ ] Criar queue de operações offline (criar/atualizar while offline)
- [ ] Implementar retry logic

---

### FASE 3: REFACTOR DE ROUTING & PROVIDERS (2-3 dias)

**Goal**: Reorganizar Index.tsx e criar AppProvider

#### 3.1 - Centralizar Providers
**Arquivo**: `Frontend/src/providers/AppProvider.tsx`

```typescript
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <PersistenceProvider>
        <EntitlementsProvider>
          <SyncProvider>
            {children}
          </SyncProvider>
        </EntitlementsProvider>
      </PersistenceProvider>
    </AuthProvider>
  );
};
```

**Tarefas**:
- [ ] Consolidar AuthContext, EntitlementsContext em AppProvider
- [ ] Criar PersistenceProvider que inicializa IndexedDB
- [ ] Criar SyncProvider para sincronização background
- [ ] Mover todos os providers para `Frontend/src/providers/`
- [ ] Deletar contextos antigos de `Frontend/src/contexts/`

#### 3.2 - Refactor de Routing
**Arquivo**: `Frontend/src/app/App.tsx` (novo)

```typescript
export const App = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <LoginPage />;

  return (
    <AppShell>
      <Router />
    </AppShell>
  );
};
```

**Arquivo**: `Frontend/src/app/Router.tsx` (novo)

```typescript
export const Router = () => {
  const { role } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("home");

  // Muito mais simples que Index.tsx
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage />;
      case "patients":
        return <PatientModule />;
      case "sessions":
        return <SessionModule />;
      // ...
    }
  };

  return renderPage();
};
```

**Tarefas**:
- [ ] Quebrar Index.tsx em App.tsx + Router.tsx
- [ ] Mover páginas para `Frontend/src/modules/*/ui/pages/`
- [ ] Criar module entry points (PatientModule, SessionModule, etc.)
- [ ] Manter compatibilidade com URLs (redirecionamentos)

#### 3.3 - Criar Modules de Domínio
**Arquivo**: `Frontend/src/modules/patients/index.tsx` (entry point)

```typescript
// Exports apenas a interface pública do módulo
export { PatientModule } from "./ui/PatientModule";
export { usePatientsService } from "./application/usePatientsService";
export type { PatientDTO } from "./infra/repository";
```

**Tarefas**:
- [ ] Criar `modules/patients/`, `modules/sessions/`, `modules/records/`
- [ ] Mover componentes de cada domínio para o seu módulo
- [ ] Criar barrel exports em `index.tsx` de cada módulo
- [ ] Criar hooks customizados para cada domínio (usePatientsService, etc.)

---

### FASE 4: SINCRONIZAÇÃO BIDIRECIONAL (3-4 dias)

**Goal**: Implementar push local → remote e pull remote → local com conflict resolution

#### 4.1 - Queue de Operações Offline
**Arquivo**: `Frontend/src/modules/shared/infra/operation-queue.ts`

```typescript
export interface PendingOperation {
  id: string;
  type: "create" | "update" | "delete";
  domain: "patients" | "sessions" | "records";
  entityId: string;
  payload: any;
  createdAt: string;
  retries: number;
  status: "pending" | "failed" | "synced";
}

export class OperationQueue {
  constructor(private idb: IndexedDBAdapter) {}

  async add(op: Omit<PendingOperation, "id" | "createdAt" | "retries" | "status">) {
    const pending: PendingOperation = {
      ...op,
      id: generateId(),
      createdAt: new Date().toISOString(),
      retries: 0,
      status: "pending",
    };
    await this.idb.put("operations", pending);
    return pending;
  }

  async getPending(): Promise<PendingOperation[]> {
    const all = await this.idb.getAll<PendingOperation>("operations");
    return all.filter((op) => op.status === "pending").sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async markSynced(id: string): Promise<void> {
    const op = await this.idb.get<PendingOperation>("operations", id);
    if (op) {
      await this.idb.put("operations", { ...op, status: "synced" });
    }
  }

  async incrementRetry(id: string): Promise<void> {
    const op = await this.idb.get<PendingOperation>("operations", id);
    if (op) {
      await this.idb.put("operations", { ...op, retries: op.retries + 1 });
    }
  }
}
```

**Tarefas**:
- [ ] Implementar OperationQueue com persistência em IndexedDB
- [ ] Adicionar métodos para retry com backoff exponencial
- [ ] Criar schema para tracking de sync status
- [ ] Testar cenários de falha

#### 4.2 - Sincronizador com Conflict Resolution
**Arquivo**: `Frontend/src/modules/shared/application/sync.reconciler.ts`

```typescript
export class SyncReconciler {
  async reconcilePatient(local: PatientDTO, remote: PatientDTO): Promise<PatientDTO> {
    // Estratégia: Last-Write-Wins (LWW)
    const localTime = new Date(local.updated_at).getTime();
    const remoteTime = new Date(remote.updated_at).getTime();

    if (remoteTime > localTime) return remote;
    if (localTime > remoteTime) return local;

    // Mesmo timestamp: usa ID como tie-breaker
    return local.id.localeCompare(remote.id) > 0 ? local : remote;
  }

  async reconcileSessions(locals: SessionDTO[], remotes: SessionDTO[]): Promise<SessionDTO[]> {
    const merged = new Map<string, SessionDTO>();

    for (const session of remotes) {
      merged.set(session.id, session);
    }

    for (const local of locals) {
      const remote = merged.get(local.id);
      if (!remote) {
        merged.set(local.id, local);
      } else {
        merged.set(local.id, await this.reconcileSession(local, remote));
      }
    }

    return Array.from(merged.values());
  }
}
```

**Tarefas**:
- [ ] Implementar estratégia LWW (Last-Write-Wins)
- [ ] Adicionar detecção de conflitos (campo de versão/timestamp)
- [ ] Criar logs de merge
- [ ] Testar cenários de conflito: criar local + remoto, atualizar ambos, etc.

---

### FASE 5: TESTES & OTIMIZAÇÕES (2-3 dias)

**Goal**: Validar funcionalidade e performance

#### 5.1 - Testes Unitários
**Arquivo**: `Frontend/src/modules/patients/infra/repository.test.ts`

```typescript
describe("IndexedDBPatientsRepository", () => {
  let repo: IndexedDBPatientsRepository;

  beforeEach(async () => {
    // Setup mock IndexedDB ou use fake-indexeddb
    const idb = new IndexedDBAdapter();
    await idb.init();
    repo = new IndexedDBPatientsRepository(idb);
  });

  it("should create a patient", async () => {
    const patient: PatientDTO = { /* ... */ };
    const created = await repo.create(patient);
    expect(created.id).toBeDefined();
  });

  it("should retrieve a patient by id", async () => {
    const created = await repo.create(patient);
    const retrieved = await repo.getById(created.id);
    expect(retrieved).toEqual(created);
  });

  // ...mais testes
});
```

**Tarefas**:
- [ ] Criar testes para cada Repository
- [ ] Criar testes para Domain Services
- [ ] Criar testes de integração para SyncService
- [ ] Mock/stub da API remota
- [ ] Testar offline → online transition

#### 5.2 - Testes E2E
**Tarefas**:
- [ ] Teste: criar paciente local, sincronizar, verificar remoto
- [ ] Teste: criar paciente remoto, puxar para local, verificar IndexedDB
- [ ] Teste: conflito de atualização (local + remoto modificam mesmo campo)
- [ ] Teste: offline mode (criar 5 entidades, depois online, verificar sync)

#### 5.3 - Performance
**Tarefas**:
- [ ] Medir tempo de listagem com 1000+ pacientes
- [ ] Implementar paginação/lazy loading em IndexedDB
- [ ] Indexar fields frequentemente consultados em IndexedDB
- [ ] Medir tamanho do banco local (goal: <50MB para case típico)

---

### FASE 6: INTEGRAÇÃO COM DESKTOP & MOBILE (2-3 dias)

**Goal**: Garantir paridade com desktop/mobile

#### 6.1 - Desktop (Electron)
**Tarefas**:
- [ ] Conectar ethos-clinic backend local com SQLite
- [ ] Compartilhar tipos com Frontend web
- [ ] Testar sync between Electron + Web via API

#### 6.2 - Mobile (Expo)
**Tarefas**:
- [ ] Usar same Repositories pattern com Expo
- [ ] Testar con expo-secure-store
- [ ] Verificar sincronização em rede lenta

---

## PARTE 3: ROADMAP DE SPRINTS

### Sprint 1 (2-3 dias) — SETUP
- [ ] Criar estrutura de pastas
- [ ] Implementar IndexedDBAdapter básico
- [ ] Definir contratos de Repository
- [ ] Criar tipos DTO

### Sprint 2 (2-3 dias) — REPOSITORIES
- [ ] Implementar PatientsRepository (IndexedDB)
- [ ] Implementar SessionsRepository (IndexedDB)
- [ ] Implementar RecordsRepository (IndexedDB)
- [ ] Testes básicos

### Sprint 3 (2 dias) — DOMAIN SERVICES
- [ ] Criar PatientDomainService
- [ ] Criar SessionDomainService
- [ ] Criar RecordDomainService
- [ ] Hooks customizados

### Sprint 4 (2-3 dias) — REFACTOR ROUTING
- [ ] Quebrar Index.tsx
- [ ] Criar AppProvider
- [ ] Reorganizar providers
- [ ] Mover páginas para módulos

### Sprint 5 (3-4 dias) — SINCRONIZAÇÃO
- [ ] OperationQueue com IndexedDB
- [ ] SyncReconciler (LWW)
- [ ] Push local → remote
- [ ] Pull remote → local

### Sprint 6 (2-3 dias) — TESTES & POLISH
- [ ] Testes unitários e integração
- [ ] Performance & indexação
- [ ] UI feedback (SavedLocally, SyncStatus)
- [ ] Documentação

---

## PARTE 4: CHECKLIST TÉCNICO

### Estrutura de Pastas
- [ ] `Frontend/src/app/`
- [ ] `Frontend/src/providers/`
- [ ] `Frontend/src/shell/`
- [ ] `Frontend/src/modules/{patients,sessions,records}/` com subpastas `domain/`, `application/`, `infra/`, `ui/`
- [ ] `Frontend/src/modules/shared/`

### Contratos TypeScript
- [ ] Repository base interface
- [ ] PatientsRepository, SessionsRepository, RecordsRepository
- [ ] DomainErrors (NotFoundError, ValidationError)
- [ ] DTOs para cada domínio

### IndexedDB
- [ ] Schema versioning (patients, sessions, clinical_notes, operations)
- [ ] Adapter com transações
- [ ] Migrations

### Domain Services
- [ ] PatientDomainService (criar, atualizar, validar)
- [ ] SessionDomainService (criar, completar, cancelar)
- [ ] RecordDomainService (criar, validar)

### Sincronização
- [ ] SyncService (pull remoto)
- [ ] PushService (push local)
- [ ] OperationQueue (persistência de ops offline)
- [ ] SyncReconciler (conflict resolution)
- [ ] Background sync com webWorker ou Service Worker

### UI/UX
- [ ] SyncStatus component (sincronizando / última sincronização)
- [ ] ConflictResolver UI (mostrar conflitos)
- [ ] Offline indicator
- [ ] SavedLocally feedback (já existe)

### Testes
- [ ] Testes unitários para cada Repository
- [ ] Testes para DomainServices
- [ ] Testes de integração de sync
- [ ] Testes E2E (Playwright)
- [ ] Performance benchmarks

---

## PARTE 5: ESTIMATIVAS

| Fase | Tarefa | Sprint | Dias | Responsável |
|------|--------|--------|------|------------|
| 0 | Setup arquitetura | 1 | 1-2 | |
| 1 | IndexedDB Adapter | 1-2 | 2-3 | |
| 1 | Repositories | 2 | 2-3 | |
| 2 | Domain Services | 3 | 2 | |
| 3 | Refactor Routing | 4 | 2-3 | |
| 4 | Sincronização | 5 | 3-4 | |
| 5 | Testes | 6 | 2-3 | |
| 6 | Desktop/Mobile | 6+ | 2-3 | |
| **TOTAL** | | | **16-21 dias** | |

---

## PARTE 6: DEPENDÊNCIAS & RISCOS

### Dependências Externas
- [ ] Lovable sync com Frontend (git)
- [ ] API backend estável (ethos-clinic)
- [ ] TypeScript types definidos no backend

### Riscos
- ❌ **Risco**: IndexedDB quotas (usuário com muitos dados)
  - Mitigação: Implementar compressão, archiving de dados antigos

- ❌ **Risco**: Conflitos de sync complexos
  - Mitigação: Começar com LWW, evoluir para CRDT depois

- ❌ **Risco**: Breaking changes no API backend
  - Mitigação: Versionamento de DTOs, migrations

---

## PARTE 7: PRÓXIMOS PASSOS IMEDIATOS

1. **Hoje**: Criar issue/PR com estrutura de pastas (Sprint 1)
2. **Amanhã**: Implementar IndexedDBAdapter básico
3. **Dia 3**: Implementar PatientsRepository como PoC
4. **Dia 4**: Revisar com time, feedback
5. **Dia 5+**: Sprint 2 — SessionsRepository, RecordsRepository

---

**Gerado em**: 01/05/2026  
**Atualizar quando**: Novo feedback do team
