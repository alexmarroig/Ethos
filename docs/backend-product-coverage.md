# ETHOS Backend — Cobertura do Conceito do Produto

Este documento garante, de forma explícita, como o **backend do ETHOS** implementa o conceito de produto enviado:

- separação de planos (**Clinical Plane local** x **Control Plane cloud não-clínico**),
- sigilo clínico por padrão,
- e cobertura funcional dos módulos.

> Regra principal: o backend em nuvem não deve armazenar/processar conteúdo clínico sensível (PHI).

## 1) Fronteira de responsabilidade (o que é backend vs app local)

### Clinical Plane (local no dispositivo)
Fica no app local (mobile/desktop) e não deve ser persistido na nuvem:
- pacientes, sessões, áudio, transcrição, prontuário, documentos;
- diário/formulários, escalas, financeiro clínico;
- backup/restore/purge do cofre local.

### Control Plane (backend cloud não-clínico)
Responsável por:
- autenticação/convites e sessão de conta;
- entitlements/assinatura e sincronização local com grace offline;
- observabilidade e auditoria **sanitizadas**;
- rate limit e governança de integrações.

## 2) Objetivos não negociáveis no backend

### Zero PHI na cloud por padrão
Aplicação prática no backend:
- telemetria e audit com payload sanitizado;
- métricas admin somente agregadas;
- rotas administrativas sem acesso ao conteúdo clínico.

Referências:
- `docs/security-sigilo.md`
- `apps/ethos-backend/src/application/aiObservability.ts`
- `apps/ethos-backend/src/api/httpServer.ts` (`/admin/*`, `/ai/organize`)

### Consentimento e revisão humana
- IA deve operar em conteúdo desidentificado e com revisão do profissional;
- saída de IA deve ser rascunho editável.

Referências:
- endpoint `POST /ai/organize`
- fluxo de nota clínica com validação explícita (`POST /clinical-notes/{id}/validate`)

### Logs e telemetria sanitizados
- não registrar transcrição, texto clínico, caminhos de arquivo sensíveis ou payload bruto de sessão.

Referências:
- `docs/security-sigilo.md`
- testes de observabilidade em `apps/ethos-backend/test/ai-observability.test.ts`

## 3) Matriz de cobertura por módulo de produto

| Módulo | Cobertura no backend | Endpoints/chaves |
|---|---|---|
| 1. Autenticação e Convites | Implementado | `/auth/invite`, `/auth/accept-invite`, `/auth/login`, `/auth/logout`, `/local/entitlements`, `/local/entitlements/sync` |
| 2. Pacientes | Implementado no plano clínico local exposto por API | `/patients`, `/patients/access`, `/patient/permissions` |
| 3. Agenda e Sessões | Implementado | `/sessions`, `/sessions/{id}`, `/sessions/{id}/status`, `/patient/sessions` |
| 4. Gravação/Vault/Transcrição | Fluxo de orquestração e jobs implementado; captura/cripto em app local | `/sessions/{id}/audio`, `/sessions/{id}/transcribe`, `/jobs/{id}`, `/webhooks/transcriber` |
| 5. Notas/Prontuário/Relatórios | Implementado | `/sessions/{id}/clinical-note`, `/clinical-notes/{id}/validate`, `/reports` |
| 6. Formulários e Diários | Implementado | `/forms/entry`, `/forms`, `/patient/diary/entries` |
| 7. Escalas | Implementado | `/scales`, `/scales/record`, `/scales/records`, `/patient/scales/record` |
| 8. Financeiro | Implementado | `/financial/entry`, `/financial/entries` |
| 9. Backup/Restore/Purge | Implementado | `/backup`, `/restore`, `/purge` |
| 10. IA via API segura | Implementado com abordagem utilitária + observabilidade sanitizada | `/ai/organize`, `/admin/observability/*` |

## 4) Cobertura por tipo de usuário

### Psicólogo (role clínico)
- Pode operar rotas clínicas (sessões, pacientes, notas, formulários, escalas, financeiro, export e jobs).

### Paciente
- Rotas específicas e limitadas de paciente (`/patient/*`) com checagem de vínculo de acesso.

### Admin global
- Apenas visão sanitizada/agregada (`/admin/metrics/overview`, `/admin/audit`, observability);
- sem acesso a conteúdo clínico individual.

## 5) Diagnóstico/QA do backend

A cobertura de QA operacional do backend está consolidada em:
- `docs/backend-validation-checklist.md`
- suíte em `apps/ethos-backend/test/`

Inclui:
- isolamento multiusuário,
- fluxo clínico ponta-a-ponta,
- resiliência de jobs (simulação de worker killed),
- contratos OpenAPI,
- validação de sanitização de logs.

## 6) Decisão arquitetural para “garantir que tudo do backend tenha isso”

Para evitar ambiguidade no time:
1. Todo requisito novo deve ser classificado como **Clinical Plane** ou **Control Plane**.
2. Se houver risco de PHI na nuvem, requisito deve ser bloqueado até desidentificação/sanitização explícita.
3. Endpoints administrativos só podem expor dados agregados e técnicos.
4. Toda capacidade de IA deve manter revisão humana como etapa obrigatória.

Esse é o critério oficial de aceite para backend alinhado ao conceito ETHOS.
