# 📚 ÍNDICE: Documentação da Migração Local-First

**Gerado em**: 01/05/2026  
**Status**: ✅ Análise Completa + Plano de Implementação Pronto

---

## 📖 DOCUMENTOS CRIADOS

### 1. **RESUMO_COMPARACAO.md** ⭐ COMECE AQUI
**Leitura**: 5 min | **Tipo**: Executivo  
**Para**: Entender o gap entre plano e realidade

- Tabelas de comparação lado-a-lado
- Scorecard 17/60 → alvo 52/60
- O que existe, o que falta
- Próximos passos imediatos

👉 **Ler primeiro se tiver 5 min**

---

### 2. **PLANO_IMPLEMENTACAO_LOCAL_FIRST.md** 🎯 GUIA COMPLETO
**Leitura**: 30 min | **Tipo**: Técnico  
**Para**: Entender estratégia completa

**Conteúdo**:
- PARTE 1: Análise Comparativa (Backend vs Frontend)
- PARTE 2: 6 Fases de implementação com code samples
  - Fase 0: Setup arquitetura
  - Fase 1: IndexedDB local
  - Fase 2: Domain Services
  - Fase 3: Refactor Routing & Providers
  - Fase 4: Sincronização bidirecional
  - Fase 5: Testes & otimizações
  - Fase 6: Desktop & Mobile
- PARTE 3: Roadmap de sprints
- PARTE 4: Checklist técnico
- PARTE 5: Estimativas
- PARTE 6: Dependências & Riscos
- PARTE 7: Próximos passos

👉 **Ler completo antes de começar a implementar**

---

### 3. **CHECKLIST_SPRINTS.md** ✅ RASTREADOR
**Tipo**: Executivo  
**Para**: Acompanhar progresso dia-a-dia

**Formato**:
- Sprint 1-6 com tarefas de [ ]
- Subtarefas específicas
- Arquivo de status

👉 **Usar durante implementation para marcar progresso**

---

### 4. **docs/gptreview/** (13 PDFs)
**Tipo**: Referência  
**Gerado por**: GPT (análise anterior)

**Arquivos**:
- `# RFC — Migração do Ethos para arquitetura local-first.pdf`
- `# ADR – Estratégia de persistência do banco local.pdf`
- `# ADR — Autenticação local versus conta online no Ethos.pdf`
- `# ADR — Criptografia local e estratégia de backup do Ethos.pdf`
- `# Contrato dos repositories por domínio — patients, sessions e records.pdf`
- `# Contrato dos domain services — patients, sessions e records.pdf`
- `# Estrutura alvo de pastas do frontend e plano de quebra do Index.tsx.pdf`
- `# Auditoria de arquitetura atual do Ethos para migração local-first.pdf`
- `# Roadmap técnico por épicos para migrar o Ethos para local-first.pdf`
- `# Backlog por sprint para migração do Ethos para local-first.pdf`
- `# Checklist técnico de implementação local-first.pdf`
- `+ 2 mais`

👉 **Consultar quando precisar de mais contexto estratégico**

---

## 🗺️ JORNADA RECOMENDADA

### 📋 **Dia 1 — Entendimento**
1. Ler [RESUMO_COMPARACAO.md](./RESUMO_COMPARACAO.md) (5 min)
2. Revisar seção "Próximos Passos Imediatos" (3 min)
3. Abrir [PLANO_IMPLEMENTACAO_LOCAL_FIRST.md](./PLANO_IMPLEMENTACAO_LOCAL_FIRST.md) (20 min)

### 🛠️ **Dia 2 — Sprint 1 Setup**
1. Abrir [CHECKLIST_SPRINTS.md](./CHECKLIST_SPRINTS.md) — Sprint 1
2. Criar estrutura de pastas
3. Criar tipos base de Repository
4. Criar tipos DTO

### 🔨 **Dia 3-5 — Sprint 2 IndexedDB**
1. Implementar IndexedDBAdapter
2. Implementar PatientsRepository (PoC)
3. Testes unitários
4. Implementar SessionsRepository
5. Implementar RecordsRepository

### ⚙️ **Dia 6-7 — Sprint 3 Domain Services**
1. Implementar PatientDomainService
2. Criar hooks customizados
3. Testes

*E assim sucessivamente para Sprint 4-6...*

---

## 📊 ROADMAP RÁPIDO

```
Sprint 1 (2 dias):  Setup + Contratos
        ↓
Sprint 2 (3 dias):  IndexedDB + Repositories
        ↓
Sprint 3 (2 dias):  Domain Services + Hooks
        ↓
Sprint 4 (3 dias):  Refactor Routing + AppProvider
        ↓
Sprint 5 (3-4 dias): OperationQueue + Sync + Conflict Resolution
        ↓
Sprint 6 (2-3 dias): Testes, Performance, Desktop/Mobile
```

**Total**: 16-21 dias de desenvolvimento focado

---

## 🎯 SCORECARD ATUAL

| Categoria | Status | Target |
|-----------|--------|--------|
| Persistência Local | 2/10 | 10/10 |
| Arquitetura Limpa | 4/10 | 9/10 |
| Sincronização | 1/10 | 8/10 |
| Separação de Domínios | 1/10 | 9/10 |
| Testes | 3/10 | 8/10 |
| Documentação | 6/10 | 8/10 |
| **TOTAL** | **17/60** | **52/60** |

---

## 🔑 DECISÕES CHAVE

Antes de implementar, time deve decidir:

1. **Versionamento de dados**: Timestamp ou version counter?
2. **Encryption**: AES-256-GCM para todos os dados ou só sensíveis?
3. **Quota strategy**: IndexedDB cheio = archive ou avisar?
4. **Conflict resolution**: Last-Write-Wins (LWW) inicial ou CRDT?
5. **Background sync**: Service Worker ou Web Worker?

👉 **Discutir no kickoff do Sprint 1**

---

## 🚀 COMO COMEÇAR

### Opção A: Ler Completo (Recomendado)
1. RESUMO_COMPARACAO.md (5 min)
2. PLANO_IMPLEMENTACAO_LOCAL_FIRST.md (30 min)
3. CHECKLIST_SPRINTS.md (10 min)
4. **Total**: 45 min para entendimento 100%

### Opção B: Começar Rápido
1. RESUMO_COMPARACAO.md (5 min)
2. Ir para "Primeira tarefa" abaixo
3. Ler PLANO_IMPLEMENTACAO_LOCAL_FIRST.md > PARTE 2 > Fase 0-1 durante

### Opção C: Já Implementando
1. Abrir CHECKLIST_SPRINTS.md
2. Sprint 1 tasks
3. Refer back para PLANO_IMPLEMENTACAO_LOCAL_FIRST.md quando precisar

---

## 📝 PRIMEIRA TAREFA (Execute Hoje)

```bash
# 1. Criar estrutura base
mkdir -p Frontend/src/{app,providers,shell,modules/shared}

# 2. Criar arquivo de contratos
cat > Frontend/src/modules/shared/infra/repository.base.ts << 'EOF'
export interface Repository<T> {
  getById(id: string): Promise<T | null>;
  create(entity: T): Promise<T>;
  update(id: string, partial: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  list(filters?: Record<string, any>): Promise<T[]>;
}
EOF

# 3. Commit inicial
git add Frontend/src/{app,providers,shell,modules}
git commit -m "chore: setup local-first architecture structure"
```

**Tempo**: 5 min  
**Status**: Pronto para Sprint 1

---

## 🔗 REFERÊNCIAS RÁPIDAS

### Dentro do projeto
- [docs/architecture-v1.md](./docs/architecture-v1.md) — Arquitetura atual
- [docs/backend-endpoints-funcionalidades.md](./docs/backend-endpoints-funcionalidades.md) — API backend
- [apps/ethos-clinic/README.md](./apps/ethos-clinic/README.md) — Backend setup
- [Frontend/README.md](./Frontend/README.md) — Frontend setup

### Padrões de código
- Backend (modelo): `apps/ethos-clinic/src/` (domain → app → infra → api)
- Frontend (proposto): `Frontend/src/modules/` (domain → application → infra → ui)

### Discussões relacionadas
- ADRs: `docs/gptreview/# ADR*.pdf`
- Roadmap: `docs/gptreview/# Roadmap*.pdf`
- Contratos: `docs/gptreview/# Contrato*.pdf`

---

## ❓ PERGUNTAS FREQUENTES

### P: Quanto tempo vai levar?
R: **16-21 dias** de full-time. Menos se for mais rápido nos testes.

### P: Preciso ler todos os PDFs?
R: Não. Comece com RESUMO_COMPARACAO.md + PLANO. PDFs são referência se precisar mais contexto.

### P: Posso fazer em paralelo com outra dev?
R: Sim! Sprints 2-3 podem ser feitos em paralelo (different domains). Sprint 4-5 precisam coordenação.

### P: E se encontrar um problema não previsto?
R: Criar issue, discutir com time, atualizar PLANO_IMPLEMENTACAO_LOCAL_FIRST.md e CHECKLIST_SPRINTS.md.

### P: Por onde começo a codar?
R: Execute a "PRIMEIRA TAREFA" acima, depois comece CHECKLIST_SPRINTS.md Sprint 1.

---

## 📞 PRÓXIMAS AÇÕES

- [ ] **Hoje**: Ler RESUMO_COMPARACAO.md
- [ ] **Hoje**: Executar PRIMEIRA TAREFA
- [ ] **Amanhã**: Kickoff Sprint 1
- [ ] **Amanhã**: Decidir sobre versionamento, encryption, quota strategy
- [ ] **Dia 3**: Começar Sprint 1 tasks

---

**Documentação criada em**: 01/05/2026  
**Pronto para**: Sprint 1 (SETUP)  
**Status**: ✅ Análise + Plano Completo  
**Próximo**: Implementação

---

*Para perguntas ou atualizações, consultar time e manter CHECKLIST_SPRINTS.md atualizado.*
