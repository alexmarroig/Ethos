# ETHOS Backend (multiusuário, offline-first)

Backend clínico local com isolamento por usuário, RBAC, convite e telemetria sanitizada.

## Destaques
- Auth por convite: `/auth/invite` -> `/auth/accept-invite` -> `/auth/login`
- RBAC: `user` e `admin`
- Isolamento clínico por `owner_user_id` em entidades clínicas
- Admin global com visão sanitizada (sem conteúdo clínico)
- Transcrição assíncrona com jobs (`POST /sessions/{id}/transcribe`, `GET /jobs/{job_id}`)
- OpenAPI disponível em `/openapi.yaml`

## Execução
# ETHOS Backend (offline-first)

Backend clínico local com foco em prontuário draft-first, validação humana obrigatória e segurança ética.

## Princípios implementados
- Offline-first (sem dependências externas obrigatórias)
- Draft-first para prontuário
- Validação humana explícita
- IA restrita a organização textual
- Logging sem conteúdo clínico

## Executar
```bash
npm --workspace apps/ethos-backend run dev
```

## Testes
```bash
npm --workspace apps/ethos-backend run test
```
## Contratos
`GET /contracts` retorna os contratos de endpoint esperados para integração.
