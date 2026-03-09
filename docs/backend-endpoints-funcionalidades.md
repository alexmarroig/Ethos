# ETHOS Backend — Funcionalidades e Endpoints Implementados

## Funcionalidades implementadas

- Arquitetura limpa por camadas (`domain`, `application`, `infra`, `api`).
- Multiusuário com isolamento total por `owner_user_id` em entidades clínicas.
- Auth por convite (admin cria convite, usuário aceita e define senha, login/logout por token).
- RBAC com regra explícita: admin global não acessa conteúdo clínico.
- Jobs assíncronos para transcrição/export/backup com polling por `job_id`.
- Webhook para atualização de status de jobs de transcrição.
- Padronização de resposta e erro com `request_id`.
- Idempotência para rotas críticas via `Idempotency-Key`.
- Paginação (`page`, `page_size`) e filtros de listagem.
- Telemetria/auditoria sanitizadas (sem payload clínico em logs/eventos).
- Retenção de áudio (`expires_at`) e purge por usuário.
- OpenAPI 3.0 publicado em `/openapi.yaml`.

## Endpoints disponíveis

### Contratos / Especificação
- `GET /openapi.yaml`
- `GET /contracts`

### Autenticação
- `POST /auth/invite` (admin)
- `POST /auth/accept-invite`
- `POST /auth/login`
- `POST /auth/logout`

### Administração (sanitizado)
- `GET /admin/metrics/overview`
- `GET /admin/audit`

### Sessões clínicas
- `POST /sessions`
- `GET /sessions`
- `GET /sessions/{id}`
- `PATCH /sessions/{id}/status`
- `POST /sessions/{id}/audio`
- `POST /sessions/{id}/transcribe`
- `POST /sessions/{id}/clinical-note`

### Prontuário / relatórios
- `POST /clinical-notes/{id}/validate`
- `POST /reports`
- `GET /reports`

### Anamnese
- `POST /anamnesis`
- `GET /anamnesis`

### Escalas
- `POST /scales/record`
- `GET /scales/records`

### Formulários
- `POST /forms/entry`
- `GET /forms`

### Financeiro
- `POST /financial/entry`
- `GET /financial/entries`

### Jobs / Operação
- `GET /jobs/{id}`
- `POST /api/webhook`
- `POST /webhooks/transcriber`

### Export / backup / restore / purge
- `POST /export/pdf`
- `POST /export/docx`
- `POST /backup`
- `POST /restore`
- `POST /purge`

### IA utilitária
- `POST /ai/organize`

## Alinhamento com o conceito de produto ETHOS

O mapeamento completo entre requisitos do produto (módulos, segurança/ética, papéis e fronteiras Clinical Plane x Control Plane) e o backend está em:

- `docs/backend-product-coverage.md`
