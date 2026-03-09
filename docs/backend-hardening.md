# ETHOS Backend Hardening

## Arquitetura
- `domain/`: tipos e contratos de domínio.
- `application/`: regras de negócio (RBAC, jobs, isolamento por owner_user_id).
- `infra/`: banco em memória, hashing, criptografia simulada.
- `api/`: servidor HTTP e mapeamento de rotas.

## Segurança
- Isolamento multiusuário por `owner_user_id` em toda entidade clínica.
- Admin global não acessa conteúdo clínico (`403`).
- Convites expiráveis para onboarding.
- Idempotência por header `Idempotency-Key`.
- Rate-limit básico por IP.
- Logs/telemetria sanitizados (sem payload clínico).
- Criptografia simulada em repouso para áudio/backup.
- Retenção de áudio por 30 dias (`expires_at`).
- Purge por usuário (`POST /purge`).

## Jobs
- Jobs assíncronos para transcrição, export e backup.
- Polling por `GET /jobs/{id}`.
- Webhook de transcriber: `/api/webhook` e `/webhooks/transcriber`.

## Contratos
- Envelope padrão de sucesso:
  - `{ "request_id": "...", "data": ... }`
- Envelope padrão de erro:
  - `{ "request_id": "...", "error": { "code": "...", "message": "..." } }`

## Testes implementados
- Auth por convite.
- RBAC/admin sem conteúdo clínico.
- Isolamento owner.
- State machine draft->validated.
- Jobs assíncronos e webhook.
- Idempotência em endpoints críticos.
