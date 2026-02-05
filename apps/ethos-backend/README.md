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
```bash
npm --workspace apps/ethos-backend run dev
```

## Testes
```bash
npm --workspace apps/ethos-backend run test
```
