/* eslint-disable */
// AUTO-GENERATED FILE.
// Source: apps/ethos-control-plane/openapi.yaml
// Regenerate with: npm --workspace apps/ethos-desktop run contracts:generate

export const controlPlaneContract = {
  "/v1/admin/audit": [
    "get"
  ],
  "/v1/admin/metrics/errors": [
    "get"
  ],
  "/v1/admin/metrics/overview": [
    "get"
  ],
  "/v1/admin/metrics/user-usage": [
    "get"
  ],
  "/v1/admin/users": [
    "get"
  ],
  "/v1/admin/users/{id}": [
    "patch"
  ],
  "/v1/auth/accept-invite": [
    "post"
  ],
  "/v1/auth/invite": [
    "post"
  ],
  "/v1/auth/login": [
    "post"
  ],
  "/v1/auth/logout": [
    "post"
  ],
  "/v1/billing/checkout-session": [
    "post"
  ],
  "/v1/billing/portal-session": [
    "post"
  ],
  "/v1/billing/subscription": [
    "get"
  ],
  "/v1/entitlements": [
    "get"
  ],
  "/v1/me": [
    "get",
    "patch"
  ],
  "/v1/telemetry": [
    "post"
  ],
  "/v1/webhooks/stripe": [
    "post"
  ]
} as const;

export type ControlPlaneContractPath = keyof typeof controlPlaneContract;
