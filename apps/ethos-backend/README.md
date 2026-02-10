# ETHOS Backend

Backend HTTP em TypeScript com foco em isolamento clínico multiusuário.

## Principais garantias
- Isolamento total por `owner_user_id`.
- Auth por convite (`/auth/invite`, `/auth/accept-invite`, `/auth/login`).
- Admin global com métricas/auditoria sanitizadas e bloqueio de conteúdo clínico.
- Jobs assíncronos para transcrição/export/backup + polling por `/jobs/{id}`.
- Idempotência por `Idempotency-Key` em endpoints críticos.
- Contratos padronizados com `request_id`.

## Estrutura
- `src/domain`: tipos de domínio.
- `src/application`: regras de negócio.
- `src/infra`: persistência e utilitários de segurança.
- `src/api`: camada HTTP.

## Rodar
```bash
npm run dev
npm test
```

## Deploy (Start Command x Root Directory)
- Se `Root Directory` ficar em branco, use:
  - `node apps/ethos-backend/dist/index.js`
- Se `Root Directory` for `apps/ethos-backend` (recomendado), use:
  - `node dist/index.js`

Evite misturar `Root Directory` vazio com comandos relativos de subpasta.

## Documentação adicional
- `docs/backend-hardening.md`
- `docs/backend-endpoints-funcionalidades.md`
- `docs/backend-validation-checklist.md`
