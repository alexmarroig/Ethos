# ETHOS Control Plane

Cloud control plane para identidade, billing/entitlements e administração sanitizada.

## Endpoints principais
- Auth: `/v1/auth/*`, `/v1/me`
- Billing: checkout/portal/subscription/webhook
- Entitlements: `/v1/entitlements`
- Telemetria sanitizada: `/v1/telemetry`
- Admin global: `/v1/admin/*`

## Garantias
- Sem conteúdo clínico no control plane.
- Admin nunca acessa dados clínicos.
