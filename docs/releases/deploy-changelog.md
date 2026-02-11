# Deploy Changelog (curto)

Objetivo: informar frontend/mobile quais contratos estão ativos por deploy.

## Regra de versionamento por serviço
- Backend API: tag `backend-v<semver>` (ex.: `backend-v0.4.2`)
- Mobile API Gateway/Entitlements: tag `mobile-api-v<semver>`
- Control/Admin APIs: tag `control-api-v<semver>`

> Sempre criar tags somente a partir de commits em `main`.

## Template por deploy
```
## YYYY-MM-DD HH:mm UTC — <ambiente>
- Commit: <sha-curto>
- Tags:
  - backend-vX.Y.Z
  - control-api-vX.Y.Z
  - mobile-api-vX.Y.Z
- Contratos ativos:
  - Auth: vX
  - Entitlements: vX
  - Clinical Records: vX
- Mudanças principais (máx. 5 bullets):
  - ...
- Compatibilidade frontend/mobile:
  - [ ] Sem mudança de contrato
  - [ ] Mudança backward-compatible
  - [ ] Mudança breaking (detalhar)
```

---

## 2026-01-01 00:00 UTC — exemplo
- Commit: `abc1234`
- Tags:
  - `backend-v0.1.0`
  - `control-api-v0.1.0`
  - `mobile-api-v0.1.0`
- Contratos ativos:
  - Auth: `v1`
  - Entitlements: `v1`
  - Clinical Records: `v1`
- Mudanças principais:
  - Primeira baseline de deploy documentada.
- Compatibilidade frontend/mobile:
  - [x] Sem mudança de contrato
  - [ ] Mudança backward-compatible
  - [ ] Mudança breaking (detalhar)
