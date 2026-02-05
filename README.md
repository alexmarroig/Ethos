# ETHOS V1

Plataforma clínica multi-plataforma com duas camadas:

1. **Control Plane (cloud)**: auth/convites, billing, entitlements, telemetria sanitizada e admin global.
2. **Clinical Plane (local/offline)**: prontuário e operações clínicas locais com isolamento por usuário.

## Apps
- `apps/ethos-control-plane`
- `apps/ethos-backend`
- `apps/ethos-desktop`
- `apps/ethos-mobile`
- `apps/ethos-transcriber`

## Pacotes
- `packages/ethos-sdk`: SDK para control + clinical plane.

## Docs
- `docs/architecture-v1.md`
- `docs/billing-flow.md`
- `docs/offline-grace.md`
- `docs/mobile-v1.md`
- `docs/troubleshooting.md`
- `docs/security-sigilo.md`
- `docs/webhooks.md`
- `docs/entitlements.md`

## Comandos
```bash
npm run test
npm run build
```

## CI: pipeline e execução local
O workflow em `.github/workflows/ci.yml` executa os seguintes jobs em paralelo:

1. **Build + testes unitários/regressão**
   - `npm run build`
   - `npm test`
2. **Segurança (SAST + dependency audit)**
   - SAST básico por padrões críticos (`eval`, `new Function`, `child_process.exec/spawn`)
   - `npm audit --workspaces --audit-level=high`
3. **Carga smoke com limite**
   - `npm --workspace apps/ethos-backend exec -- node --test -r ts-node/register/transpile-only test/load-smoke.test.ts`
   - Limites padrão: média até `1200ms` e p95 até `2000ms`
4. **Matriz de compatibilidade Node LTS**
   - valida build + testes em Node `18`, `20` e `22`

Todos os jobs publicam artefatos (`reports/`) com logs e relatórios. O pipeline falha automaticamente em regressão (falha de testes/build), falhas de segurança (SAST/audit) ou violação de limite no smoke de carga.

### Rodar localmente (equivalente ao CI)
```bash
npm ci
npm run build
npm test
rg -n "eval\\(|new Function\\(|child_process\\.(exec|spawn|execSync|spawnSync)\\(" apps packages
npm audit --workspaces --audit-level=high
npm --workspace apps/ethos-backend exec -- node --test -r ts-node/register/transpile-only test/load-smoke.test.ts
```

### Ajustar limites do smoke de carga local
```bash
LOAD_SMOKE_REQUESTS=60 \
LOAD_SMOKE_CONCURRENCY=10 \
LOAD_SMOKE_MAX_AVG_MS=1500 \
LOAD_SMOKE_MAX_P95_MS=2500 \
npm --workspace apps/ethos-backend exec -- node --test -r ts-node/register/transpile-only test/load-smoke.test.ts
```
