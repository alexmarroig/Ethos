# Checklist de Release

> Executar esta lista antes de cada deploy em produção.

## 1) Validação de endpoints críticos
- [ ] `POST /auth/login` responde 200 para credenciais válidas
- [ ] `POST /auth/refresh` renova sessão sem erro
- [ ] `GET /entitlements/me` retorna plano/flags corretos
- [ ] `GET /health` retorna status saudável
- [ ] Fluxo crítico clínico validado (sessão -> registro -> export)

## 2) Variáveis de ambiente no Render
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` aponta para o banco correto
- [ ] `JWT_SECRET` configurado e rotacionado conforme política
- [ ] `ENCRYPTION_KEY` presente e consistente com ambiente
- [ ] `CORS_ORIGIN` restrito aos domínios oficiais
- [ ] `WEBHOOK_SECRET`/segredos de integrações conferidos

## 3) Smoke de autenticação/entitlements
- [ ] Login com usuário válido
- [ ] Tentativa inválida retorna erro esperado (401/403)
- [ ] Refresh token funciona após expiração curta
- [ ] Entitlements por perfil (control/clinical/mobile) retornam conforme contrato
- [ ] Usuário sem permissão não acessa recurso protegido

## 4) Aprovação e rastreabilidade
- [ ] PR mergeada em `main` com checklist completo
- [ ] Tag de versão criada para cada serviço afetado
- [ ] Registro no changelog de deploy publicado (`docs/releases/deploy-changelog.md`)
