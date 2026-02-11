## Contexto
- [ ] Issue/objetivo referenciado
- [ ] Impacto descrito (backend/frontend/mobile)

## Checklist obrigatório de integração (`work` -> `main`)
> Esta PR só pode ser mergeada quando todos os itens abaixo estiverem marcados.

### Control
- [ ] Contratos de API revisados e compatíveis
- [ ] Migrações/versionamento de schema validados
- [ ] Observabilidade/monitoramento atualizados para mudança

### Clinical
- [ ] Regras clínicas revisadas (sigilo, isolamento de dados, consentimento)
- [ ] Fluxos de prontuário/exportação sem regressão
- [ ] Logs e telemetria sem conteúdo sensível

### Mobile
- [ ] Compatibilidade de payload com app mobile validada
- [ ] Flags/entitlements sincronizados com consumo mobile
- [ ] Smoke de autenticação mobile concluído

## Evidências
- [ ] Testes automatizados anexados (CI)
- [ ] Checklist de release atualizado em `docs/releases/release-checklist.md`
- [ ] Changelog de deploy registrado em `docs/releases/deploy-changelog.md`
