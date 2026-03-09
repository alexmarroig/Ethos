# Validação do Fluxo Completo do Backend ETHOS

Checklist solicitado e validado por teste automatizado (`validation-checklist.test.ts`).

## Resultado

- [x] Consigo criar usuário por convite e logar.
- [x] Um usuário não consegue ver nada do outro (nem por ID).
- [x] Admin vê apenas contagens/uso e não acessa conteúdo clínico.
- [x] Fluxo completo: sessão → áudio → transcrição → rascunho → validar → relatório → export.
- [x] Kill no worker durante transcrição não corrompe estado (simulado por webhook de falha `WORKER_KILLED`).
- [x] Backup + restore funcionam (status e ciclo de endpoints).
- [x] Purge apaga tudo do usuário.
- [x] OpenAPI cobre as rotas reais principais.
- [x] Logs não têm texto clínico (checagem de stdout sem payload sensível).

## Observação importante

A validação de "kill no worker" nesta base atual é **simulada** via atualização de job para `failed` por webhook,
pois não existe processo worker separado no ambiente em memória atual.
