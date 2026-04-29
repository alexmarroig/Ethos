# BioHub Integration - Phase 2

## Schema / migrations
- `apps/ethos-clinic/migrations/20260429_01_biohub_phase2.sql`
- Tabelas: `biohub_access_profiles`, `biohub_subscriptions`, `biohub_plan_overrides`, `biohub_access_audit_logs`

## Admin routes
- `POST /api/admin/biohub/users/:id/override`
- `DELETE /api/admin/biohub/users/:id/override`
- `POST /api/admin/biohub/users/:id/ambassador-toggle`
- `POST /api/admin/biohub/users/:id/block`
- `POST /api/admin/biohub/users/:id/unblock`

## SSO validate
- `POST /api/integrations/sso/validate`

## cURL
```bash
curl -X POST http://localhost:8787/api/integrations/sso/validate -H 'content-type: application/json' -d '{"token":"jwt"}'
```

## Rollback
- Execute section `-- down` from migration file.
