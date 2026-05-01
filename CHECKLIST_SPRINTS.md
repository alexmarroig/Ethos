# CHECKLIST: Sprint-by-Sprint Implementation

**Formato**: Use este documento para rastrear progresso real  
**Update**: A cada dia, marque as tarefas completas com [x]

---

## 🟢 SPRINT 1: FOUNDATION (Dias 1-2)

### 1.1 - Estrutura de Pastas

```
[ ] Criar diretório: Frontend/src/app/
[ ] Criar diretório: Frontend/src/providers/
[ ] Criar diretório: Frontend/src/shell/
[ ] Criar diretório: Frontend/src/modules/
[ ] Criar diretório: Frontend/src/modules/shared/
[ ] Criar diretório: Frontend/src/modules/patients/domain
[ ] Criar diretório: Frontend/src/modules/patients/application
[ ] Criar diretório: Frontend/src/modules/patients/infra
[ ] Criar diretório: Frontend/src/modules/patients/ui
[ ] Criar diretório: Frontend/src/modules/sessions/[domain,application,infra,ui]
[ ] Criar diretório: Frontend/src/modules/records/[domain,application,infra,ui]
```

### 1.2 - Contratos de Repository

```
[ ] Criar: Frontend/src/modules/shared/infra/repository.base.ts
    [ ] Interface Repository<T> com getById, create, update, delete, list
    [ ] Interface CRUDRepository extends Repository
    [ ] Tipos genéricos de erro

[ ] Criar: Frontend/src/modules/shared/infra/errors.ts
    [ ] NotFoundError
    [ ] ValidationError
    [ ] SyncError
    [ ] ConflictError

[ ] Criar: Frontend/src/modules/shared/types/pagination.ts
    [ ] PaginationParams interface
    [ ] PaginationResult<T> interface
```

### 1.3 - DTOs por Domínio

```
[ ] Criar: Frontend/src/modules/patients/domain/types.ts
    [ ] PatientDTO (id, name, email, care_status, etc)
    [ ] CreatePatientInput
    [ ] UpdatePatientInput
    [ ] PatientFilters

[ ] Criar: Frontend/src/modules/sessions/domain/types.ts
    [ ] SessionDTO
    [ ] CreateSessionInput
    [ ] UpdateSessionInput
    [ ] SessionStatus type

[ ] Criar: Frontend/src/modules/records/domain/types.ts
    [ ] RecordDTO
    [ ] CreateRecordInput
    [ ] ClinicalNoteDTO
```

### 1.4 - Documentação

```
[ ] Criar: Frontend/src/modules/README.md
    [ ] Explicar estrutura de módulos
    [ ] Convenção de imports
    [ ] How to add a new module

[ ] Update root README.md
    [ ] Adicionar seção "Architecture" com diagrama
    [ ] Link para PLANO_IMPLEMENTACAO_LOCAL_FIRST.md
```

---

## 🟠 SPRINT 2: INDEXEDDB & REPOSITORIES (Dias 3-5)

### 2.1 - IndexedDB Adapter

```
[ ] Criar: Frontend/src/modules/shared/infra/indexeddb.adapter.ts
    [ ] Classe IndexedDBAdapter
    [ ] Método init() - abrir DB com versionamento
    [ ] Método get<T>(store, key) - retrieve item
    [ ] Método put<T>(store, item) - create/update
    [ ] Método delete(store, key)
    [ ] Método getAll<T>(store)
    [ ] Método query<T>(store, filter)
    [ ] Métodos de transaction para múltiplos stores
    [ ] Error handling e retry logic

[ ] Testes: Frontend/src/modules/shared/infra/indexeddb.adapter.test.ts
    [ ] Test init()
    [ ] Test put/get
    [ ] Test delete
    [ ] Test getAll
    [ ] Test múltiplas transações
```

### 2.2 - Patients Repository (PoC)

```
[ ] Criar: Frontend/src/modules/patients/infra/repository.ts
    [ ] Interface PatientsRepository extends Repository<PatientDTO>
    [ ] Implementação: IndexedDBPatientsRepository
    [ ] Método getById(id: string)
    [ ] Método create(patient: PatientDTO)
    [ ] Método update(id, partial)
    [ ] Método delete(id)
    [ ] Método list(filters?)
    [ ] Método listByOwner(ownerUserId)
    [ ] Validação em cada operação

[ ] Testes: Frontend/src/modules/patients/infra/repository.test.ts
    [ ] Test create
    [ ] Test getById (hit + miss)
    [ ] Test update
    [ ] Test delete
    [ ] Test list com filtros
    [ ] Test listByOwner
```

### 2.3 - Sessions Repository

```
[ ] Criar: Frontend/src/modules/sessions/infra/repository.ts
    [ ] Interface SessionsRepository extends Repository<SessionDTO>
    [ ] Implementação: IndexedDBSessionsRepository
    [ ] Métodos básicos (create, getById, update, delete, list)
    [ ] Método listByPatient(patientId)
    [ ] Método listByStatus(status)
    [ ] Método listByDateRange(start, end)

[ ] Testes: Frontend/src/modules/sessions/infra/repository.test.ts
    [ ] Test operações básicas
    [ ] Test queries especializadas
```

### 2.4 - Records Repository

```
[ ] Criar: Frontend/src/modules/records/infra/repository.ts
    [ ] Interface RecordsRepository extends Repository<RecordDTO>
    [ ] Implementação: IndexedDBRecordsRepository
    [ ] Métodos básicos

[ ] Testes: Frontend/src/modules/records/infra/repository.test.ts
    [ ] Test operações básicas
```

### 2.5 - Schema & Migration

```
[ ] Criar: Frontend/src/modules/shared/infra/schema.ts
    [ ] Definir schemas para cada store
    [ ] Versioning strategy
    [ ] Migration functions

[ ] Criar: Frontend/src/modules/shared/infra/migrations.ts
    [ ] Migration v1 → v2 (quando schema mudar)
    [ ] Backup antes de migrate
```

---

## 🟡 SPRINT 3: DOMAIN SERVICES (Dias 6-7)

### 3.1 - Patient Domain Service

```
[ ] Criar: Frontend/src/modules/patients/application/service.ts
    [ ] Classe PatientDomainService
    [ ] Método createPatient(input) - com validação
    [ ] Método updatePatient(id, input) - com validação
    [ ] Método getPatientWithStats(id)
    [ ] Método updateCareStatus(id, status) - regras de transição
    [ ] Validação de regras de negócio (ex: name required)

[ ] Testes: Frontend/src/modules/patients/application/service.test.ts
    [ ] Test createPatient com input válido
    [ ] Test createPatient com input inválido
    [ ] Test updatePatient
    [ ] Test getCareStatus transitions
```

### 3.2 - Session Domain Service

```
[ ] Criar: Frontend/src/modules/sessions/application/service.ts
    [ ] Classe SessionDomainService
    [ ] Método createSession(input)
    [ ] Método completeSession(id)
    [ ] Método cancelSession(id, reason)
    [ ] Validações específicas de sessão

[ ] Testes: Frontend/src/modules/sessions/application/service.test.ts
```

### 3.3 - Record Domain Service

```
[ ] Criar: Frontend/src/modules/records/application/service.ts
    [ ] Classe RecordDomainService
    [ ] Métodos básicos com validação

[ ] Testes: Frontend/src/modules/records/application/service.test.ts
```

### 3.4 - Custom Hooks

```
[ ] Criar: Frontend/src/modules/patients/application/usePatientsService.ts
    [ ] Hook usePatientsService() - retorna service + methods
    [ ] Hook usePatient(id) - lazy load de um paciente
    [ ] Hook usePatientsList(filters) - lista com paginação

[ ] Criar: Frontend/src/modules/sessions/application/useSessionsService.ts
    [ ] Hook useSessionsService()
    [ ] Hook useSession(id)
    [ ] Hook useSessionsList(filters)

[ ] Criar: Frontend/src/modules/records/application/useRecordsService.ts
```

---

## 🔵 SPRINT 4: ROUTING & PROVIDERS (Dias 8-10)

### 4.1 - Providers Centralizados

```
[ ] Criar: Frontend/src/providers/AppProvider.tsx
    [ ] Component AppProvider com composition de providers
    [ ] Documentar order de providers (qual depende de qual)

[ ] Refactor: Frontend/src/providers/AuthProvider.tsx
    [ ] Extrair de contexts/ para providers/
    [ ] Atualizar imports nos dependentes

[ ] Criar: Frontend/src/providers/PersistenceProvider.tsx
    [ ] Inicializa IndexedDBAdapter
    [ ] Fornece via context

[ ] Criar: Frontend/src/providers/SyncProvider.tsx
    [ ] Inicializa SyncService
    [ ] Background sync trigger

[ ] Update: Frontend/src/main.tsx
    [ ] Usar AppProvider como root wrapper
```

### 4.2 - App Entry Point

```
[ ] Criar: Frontend/src/app/App.tsx
    [ ] Component App - shell principal
    [ ] Lógica de autenticação/redirecionamento
    [ ] Render Router se autenticado, LoginPage caso contrário

[ ] Criar: Frontend/src/app/Router.tsx
    [ ] Component Router - page resolution
    [ ] Switch case ou routing library
    [ ] Muito mais simples que Index.tsx atual

[ ] Criar: Frontend/src/app/index.ts (barrel export)
```

### 4.3 - Module Entry Points

```
[ ] Criar: Frontend/src/modules/patients/index.tsx
    [ ] Export PatientModule (component)
    [ ] Export usePatientsService (hook)
    [ ] Export types

[ ] Criar: Frontend/src/modules/sessions/index.tsx
    [ ] Similar a patients

[ ] Criar: Frontend/src/modules/records/index.tsx
    [ ] Similar a patients
```

### 4.4 - Mover Componentes

```
[ ] Mover componentes de pacientes para Frontend/src/modules/patients/ui/
[ ] Mover componentes de sessões para Frontend/src/modules/sessions/ui/
[ ] Mover componentes de prontuários para Frontend/src/modules/records/ui/
[ ] Atualizar imports
[ ] Remover Frontend/src/pages/ (mover conteúdo para módulos)
```

### 4.5 - Testar Compatibilidade

```
[ ] URL /patients → rota correta
[ ] URL /sessions → rota correta
[ ] URL /records → rota correta
[ ] Redirecionamentos mantidos
[ ] localStorage de state mantido
```

---

## 🟣 SPRINT 5: SYNCHRONIZATION (Dias 11-14)

### 5.1 - Operation Queue

```
[ ] Criar: Frontend/src/modules/shared/infra/operation-queue.ts
    [ ] Interface PendingOperation
    [ ] Classe OperationQueue com IndexedDB persistence
    [ ] Método add(operation) - add to queue
    [ ] Método getPending() - listar ops pendentes
    [ ] Método markSynced(id)
    [ ] Método incrementRetry(id)
    [ ] Método remove(id)

[ ] Testes: Frontend/src/modules/shared/infra/operation-queue.test.ts
    [ ] Test add
    [ ] Test getPending
    [ ] Test markSynced
    [ ] Test retry increment
```

### 5.2 - Sync Reconciler (Conflict Resolution)

```
[ ] Criar: Frontend/src/modules/shared/application/sync.reconciler.ts
    [ ] Classe SyncReconciler
    [ ] Método reconcilePatient(local, remote) - LWW strategy
    [ ] Método reconcileSession(local, remote)
    [ ] Método reconcileRecord(local, remote)
    [ ] Logging de conflicts

[ ] Testes: Frontend/src/modules/shared/application/sync.reconciler.test.ts
    [ ] Test LWW com timestamps diferentes
    [ ] Test LWW com timestamps iguais (tie-breaker)
    [ ] Test batched reconciliation
```

### 5.3 - Sync Service (Pull Remote → Local)

```
[ ] Criar: Frontend/src/modules/shared/application/sync.service.ts
    [ ] Classe SyncService
    [ ] Método syncPatients() - pull + merge
    [ ] Método syncSessions()
    [ ] Método syncRecords()
    [ ] Método syncAll() - todos os domínios
    [ ] Retorna SyncResult { patients, sessions, records, errors }

[ ] Testes: Frontend/src/modules/shared/application/sync.service.test.ts
    [ ] Test sincronização básica
    [ ] Test com API erro
    [ ] Test com conflitos
```

### 5.4 - Push Service (Push Local → Remote)

```
[ ] Criar: Frontend/src/modules/shared/application/push.service.ts
    [ ] Classe PushService
    [ ] Método pushPatient(id) - sincroniza 1 paciente
    [ ] Método pushSession(id)
    [ ] Método pushRecord(id)
    [ ] Retry logic com backoff exponencial
    [ ] Remove da queue quando synced

[ ] Testes: Frontend/src/modules/shared/application/push.service.test.ts
    [ ] Test push bem-sucedido
    [ ] Test push com erro (retry)
    [ ] Test backoff exponencial
```

### 5.5 - Background Sync

```
[ ] Criar: Frontend/src/modules/shared/infra/background-sync.ts
    [ ] Usar Service Worker ou Web Worker
    [ ] Periodic sync trigger (a cada X minutos)
    [ ] On connection restored trigger
    [ ] Não bloqueia UI

[ ] Testar em modo offline:
    [ ] Criar ops offline
    [ ] Voltar online
    [ ] Verificar sync automático
```

### 5.6 - Sync Provider (Expõe no contexto)

```
[ ] Update: Frontend/src/providers/SyncProvider.tsx
    [ ] Context SyncContext
    [ ] State: { lastSync, isSyncing, syncStatus }
    [ ] Methods: sync(), pushPending()
    [ ] Auto-sync a cada X minutos
```

---

## 🟢 SPRINT 6: TESTING & POLISH (Dias 15-16)

### 6.1 - Unit Tests

```
[ ] Verificar cobertura de testes
    [ ] Repositories: >90%
    [ ] DomainServices: >85%
    [ ] SyncService: >80%

[ ] npm test -- --coverage
```

### 6.2 - Integration Tests

```
[ ] Teste: Criar paciente local, sincronizar, verificar no mock backend
[ ] Teste: Puxar paciente remoto, verificar em IndexedDB
[ ] Teste: Atualizar paciente localmente + remotamente, verificar LWW
[ ] Teste: Ficar offline, criar 5 ops, voltar online, verificar push
```

### 6.3 - E2E Tests (Playwright)

```
[ ] Teste: User login → view patients → create patient → check localStorage
[ ] Teste: Offline mode → create session → check queue → online → verify sync
[ ] Teste: Conflict scenario simulado
```

### 6.4 - Performance

```
[ ] Benchmark: Listar 1000 pacientes do IndexedDB
[ ] Benchmark: Sincronizar 100 pacientes
[ ] Verificar quota do IndexedDB (target: <50MB)
[ ] Implementar lazy loading se necessário
```

### 6.5 - UI/UX Polish

```
[ ] Componente SyncStatus (sincronizando / última sincronização)
[ ] Componente ConflictResolver (mostrar conflitos e permitir resolução)
[ ] Offline indicator no header
[ ] SavedLocally feedback (já existe, apenas validar)
[ ] Loading states durante sync
```

### 6.6 - Documentação

```
[ ] Atualizar Frontend/README.md
[ ] Criar docs/LOCAL_FIRST_ARCHITECTURE.md
[ ] Criar docs/SYNC_STRATEGY.md
[ ] Criar docs/TROUBLESHOOTING.md
[ ] Code comments explicando regras de negócio
```

---

## 🔴 FASE 7: DESKTOP & MOBILE (Pós-Sprint 6)

### 7.1 - Desktop (apps/ethos-desktop)

```
[ ] Validar SQLite implementation com Web types
[ ] Testar sync desktop ← → web via API
[ ] Verificar parity de features
```

### 7.2 - Mobile (apps/ethos-mobile)

```
[ ] Validar expo-file-system com Web types
[ ] Testar sync mobile ← → web via API
[ ] Verificar parity de features
```

---

## 📊 TRACKING

| Sprint | Status | % Complete | Dias |
|--------|--------|-----------|------|
| 1. Foundation | [ ] Not Started | 0% | 2 |
| 2. IndexedDB & Repos | [ ] Not Started | 0% | 3 |
| 3. Domain Services | [ ] Not Started | 0% | 2 |
| 4. Routing & Providers | [ ] Not Started | 0% | 3 |
| 5. Synchronization | [ ] Not Started | 0% | 4 |
| 6. Testing & Polish | [ ] Not Started | 0% | 2 |
| **TOTAL** | **[ ]** | **0%** | **16** |

---

## 🔗 QUICK LINKS

- [Plano completo](./PLANO_IMPLEMENTACAO_LOCAL_FIRST.md)
- [Resumo de comparação](./RESUMO_COMPARACAO.md)
- [Architecture docs](./docs/)
- [Backend API](./apps/ethos-clinic/README.md)

---

**Last Updated**: 01/05/2026  
**Next Review**: Após Sprint 1
