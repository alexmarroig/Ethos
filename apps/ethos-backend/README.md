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

## Contratos
`GET /contracts` retorna os contratos de endpoint esperados para integração.
