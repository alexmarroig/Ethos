/* eslint-disable */
// AUTO-GENERATED FILE.
// Source: apps/ethos-backend/openapi.yaml
// Regenerate with: npm --workspace apps/ethos-desktop run contracts:generate

export const clinicalContract = {
  "/admin/audit": [
    "get"
  ],
  "/admin/metrics/overview": [
    "get"
  ],
  "/ai/organize": [
    "post"
  ],
  "/anamnesis": [
    "get",
    "post"
  ],
  "/api/webhook": [
    "post"
  ],
  "/auth/accept-invite": [
    "post"
  ],
  "/auth/invite": [
    "post"
  ],
  "/auth/login": [
    "post"
  ],
  "/auth/logout": [
    "post"
  ],
  "/backup": [
    "post"
  ],
  "/clinical-notes/{id}": [
    "get"
  ],
  "/clinical-notes/{id}/validate": [
    "post"
  ],
  "/contracts": [
    "get"
  ],
  "/export/docx": [
    "post"
  ],
  "/export/pdf": [
    "post"
  ],
  "/financial/entries": [
    "get"
  ],
  "/financial/entry": [
    "post"
  ],
  "/forms": [
    "get"
  ],
  "/forms/entry": [
    "post"
  ],
  "/jobs/{id}": [
    "get"
  ],
  "/jobs/{job_id}": [
    "get"
  ],
  "/local/entitlements": [
    "get"
  ],
  "/local/entitlements/sync": [
    "post"
  ],
  "/local/telemetry/flush": [
    "post"
  ],
  "/openapi.yaml": [
    "get"
  ],
  "/patients": [
    "get"
  ],
  "/patients/{id}": [
    "get"
  ],
  "/purge": [
    "post"
  ],
  "/reports": [
    "get",
    "post"
  ],
  "/reports/{id}": [
    "get"
  ],
  "/restore": [
    "post"
  ],
  "/scales": [
    "get"
  ],
  "/scales/record": [
    "post"
  ],
  "/scales/records": [
    "get"
  ],
  "/sessions": [
    "get",
    "post"
  ],
  "/sessions/{id}": [
    "get"
  ],
  "/sessions/{id}/audio": [
    "post"
  ],
  "/sessions/{id}/clinical-note": [
    "post"
  ],
  "/sessions/{id}/clinical-notes": [
    "get"
  ],
  "/sessions/{id}/status": [
    "patch"
  ],
  "/sessions/{id}/transcribe": [
    "post"
  ],
  "/webhooks/transcriber": [
    "post"
  ]
} as const;

export type ClinicalContractPath = keyof typeof clinicalContract;
