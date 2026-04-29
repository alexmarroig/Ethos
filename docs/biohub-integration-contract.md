# BioHub Integration Contract (ETHOS)

## Endpoints
- `POST /api/integrations/biohub/access`
- `POST /biohub/access`

## Compat modes
- Default: envelope ETHOS `{ request_id, data }`
- Raw compat for BIOHUB current clients:
  - query `?compat=raw` OR
  - header `X-Biohub-Compat: raw`

## Example (envelope)
```json
{
  "request_id": "...",
  "data": {
    "allowed": true,
    "access": true,
    "has_access": true,
    "mode": "full",
    "reason": "trial",
    "plan": "trial",
    "source": "trial",
    "can_edit": true,
    "can_publish": true,
    "trial_ends_at": "2026-05-10T00:00:00Z",
    "limits": {}
  }
}
```

## Example (raw compat)
```json
{
  "allowed": true,
  "access": true,
  "has_access": true,
  "mode": "full",
  "reason": "trial",
  "plan": "trial",
  "source": "trial",
  "can_edit": true,
  "can_publish": true,
  "trial_ends_at": "2026-05-10T00:00:00Z",
  "limits": {}
}
```

## Error contract
All errors return JSON:
```json
{
  "error": { "code": "UNAUTHORIZED", "message": "Invalid integration token" },
  "request_id": "..."
}
```

## Rate limit provider
Env:
- `RATE_LIMIT_PROVIDER=redis|memory`
- `REDIS_URL=redis://...`
