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

## Comandos
```bash
npm run test
npm run build
```
