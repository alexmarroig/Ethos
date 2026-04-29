# BIOHUB Go-Live

## Pre-deploy checklist
- Set `DATABASE_URL` (required in production)
- Set flags:
  - `BIOHUB_INTEGRATION_ENABLED`
  - `BIOHUB_LEGACY_ACCESS_ENDPOINT_ENABLED`
  - `BIOHUB_SELF_SERVICE_UPGRADE_ENABLED`
  - `BIOHUB_SSO_VALIDATE_ENABLED`
  - `BIOHUB_ADMIN_OVERRIDE_ENABLED`
- Set secrets:
  - `ETHOS_API_TOKEN`
  - `BIOHUB_SSO_JWT_SECRET`

## Migrate / rollback
- Migrate on startup: `runMigrations()` from `src/infra/migrations.ts`
- Rollback: execute `-- down` section from `apps/ethos-clinic/migrations/20260429_01_biohub_phase2.sql`

## Incident runbook
- 401: check bearer token and SSO secret
- 403: user denied / RBAC denied
- 429: tune rate limits or investigate spikes
- 503: feature flag disabled or DB unavailable

## Rollout plan
- 5%: enable `BIOHUB_INTEGRATION_ENABLED` for canary tenant/user subset
- 25%: expand after 24h healthy metrics
- 100%: full rollout after 72h

## Rollback by flag
- Disable `BIOHUB_INTEGRATION_ENABLED`
- Keep `BIOHUB_LEGACY_ACCESS_ENDPOINT_ENABLED=1` while investigating

## Legacy endpoint sunset
- require 30d of zero traffic on `/biohub/access`
- announce deprecation 2 releases ahead
