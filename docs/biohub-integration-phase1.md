# BIOHUB Integration Phase 1 (ETHOS)

## Endpoints
- `POST /api/integrations/biohub/access`
- `POST /biohub/access`
- `POST /api/me/biohub/upgrade-intent`

## Response modes
- Default: envelope `{ request_id, data }`
- Raw compat (BIOHUB): header `X-Biohub-Compat: raw`

## New endpoint sample
Request:
```json
{ "user_id": "u1", "tenant_id": "t1" }
```
Envelope response:
```json
{ "request_id": "...", "data": { "allowed": true, "access": true, "has_access": true, "mode": "full" } }
```
Raw response:
```json
{ "allowed": true, "access": true, "has_access": true, "mode": "full" }
```

## Legacy endpoint sample
Request:
```json
{ "userId": "u1", "action": "read" }
```
Envelope response:
```json
{ "request_id": "...", "data": { "allowed": true } }
```
Raw response:
```json
{ "allowed": true, "access": true, "has_access": true }
```

## Error contract
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid integration token" }, "request_id": "..." }
```

## Feature flags/env
- `BIOHUB_INTEGRATION_ENABLED`
- `BIOHUB_LEGACY_ACCESS_ENDPOINT_ENABLED`
- `BIOHUB_SELF_SERVICE_UPGRADE_ENABLED`
- `RATE_LIMIT_PROVIDER=memory|redis`
- `REDIS_URL=redis://...`
- `ETHOS_API_TOKEN`
