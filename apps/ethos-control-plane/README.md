# ETHOS Control Plane

Cloud control plane para identidade, billing/entitlements e administração sanitizada.

## Endpoints principais
- Auth: `/v1/auth/*`, `/v1/me`
- Billing: checkout/portal/subscription/webhook
- Entitlements: `/v1/entitlements`
- Telemetria sanitizada: `/v1/telemetry`
- Admin global: `/v1/admin/*`

## Fronteira de dados

### Permitido no Control Plane
- Dados de conta e assinatura: `user_id`, `workspace_id`, `plan`, `status`, `renewal_at`.
- Entitlements não clínicos: limites e flags de recurso.
- Métricas técnicas agregadas/sanitizadas (latência, erro, uso por feature sem conteúdo clínico).
- Auditoria administrativa sem payload clínico bruto.

### Proibido no Control Plane
- Texto clínico, prontuário, transcrição, laudos e diário.
- PII/PHI de paciente (nome, documento, telefone, endereço, dados de saúde).
- Binários ou referências de arquivos clínicos (`audio_blob`, `file_path`, `vault_key`, conteúdo de anexos).

## Exemplos de payload aceitável (Control Plane)

### `POST /v1/telemetry`
```json
{
  "event": "session_transcription_completed",
  "workspace_id": "ws_123",
  "user_id": "usr_456",
  "timestamp": "2026-02-11T12:00:00Z",
  "properties": {
    "duration_ms": 84320,
    "model": "whisper-large-v3",
    "success": true,
    "error_code": null
  }
}
```

### `POST /v1/entitlements/snapshot`
```json
{
  "workspace_id": "ws_123",
  "user_id": "usr_456",
  "plan": "pro",
  "entitlements": {
    "max_sessions_per_month": 400,
    "max_storage_gb": 50,
    "features": ["ai_draft", "reports", "multi_device_sync"]
  },
  "generated_at": "2026-02-11T12:00:00Z"
}
```

## Garantias
- Sem conteúdo clínico no control plane.
- Admin nunca acessa dados clínicos.
- Import de módulos clínicos em `apps/ethos-control-plane` é bloqueado na CI.

## Deploy no Render (CORS + Health Check)
- Configure **Health Check Path** como `/health`.
- Defina a variável de ambiente `CORS_ALLOWED_ORIGINS` com uma lista separada por vírgulas dos frontends permitidos.
- Inclua os domínios do Lovable que chamam a API (exemplo):
  - `https://seu-projeto.lovable.app`
  - `https://seu-projeto.lovable.dev`
- Exemplo:

```bash
CORS_ALLOWED_ORIGINS=https://seu-projeto.lovable.app,https://seu-projeto.lovable.dev
```

