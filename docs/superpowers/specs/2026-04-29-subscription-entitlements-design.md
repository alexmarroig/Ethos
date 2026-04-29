# Subscription & Entitlement Management — Design Spec

**Date:** 2026-04-29  
**Status:** Approved

---

## Overview

Add a full plan-based entitlement system to Ethos, enabling the founder/admin to control which features each user can access, with a 7-day free trial (all features) on signup, and three permanent plans: Free, Básico, Premium. Users can see their current plan and request an upgrade (self-serve). The admin can assign or override plans via the admin panel.

---

## Goals

- Auto-start 7-day full-access trial on every new user signup
- Gate features in the UI based on the user's active plan
- Admin can assign / change plans for any user
- Admin can invite new users (psychologist account creation)
- User-facing plans page with upgrade CTA (WhatsApp/contact link now; Stripe later)
- Trial countdown banner when ≤ 3 days remain

## Non-Goals (for now)

- Stripe / payment processing integration
- Patient or secretary plan management (plans apply to psychologists only)
- Per-feature overrides per user (plans only — no mix-and-match)
- Email notifications when trial expires

---

## Data Model

### Control Plane — User record additions

```ts
type Plan = "trial" | "free" | "basic" | "premium";

type User = {
  // ... existing fields ...
  plan: Plan;                    // default: "trial" on invite accept
  trial_ends_at: string | null;  // ISO date, set to now+7d on invite accept
};
```

### Plan → Entitlements derivation

| Entitlement | free | basic | premium | trial |
|---|---|---|---|---|
| `max_patients` | 5 | 30 | 999 | 999 |
| `max_sessions_per_month` | 20 | 100 | 999 | 999 |
| `forms_enabled` | false | true | true | true |
| `scales_enabled` | false | true | true | true |
| `finance_enabled` | false | true | true | true |
| `exports_enabled` | false | true | true | true |
| `backup_enabled` | false | false | true | true |
| `transcription_minutes_per_month` | 0 | 60 | 300 | 300 |
| `packages_enabled` | false | true | true | true |
| `ai_features_enabled` | false | false | true | true |

### Trial expiry rule

When `GET /v1/entitlements` is called and `trial_ends_at < now`, the response returns `free` plan entitlements. The user record is NOT mutated — the admin can still upgrade the user. The frontend checks `plan === "trial"` + `trial_ends_at` to display the countdown banner.

---

## Control Plane API Changes (`apps/ethos-control-plane/src/server.ts`)

### 1. `POST /v1/auth/accept-invite` — trial auto-start

On successful invite acceptance, set:
```ts
user.plan = "trial";
user.trial_ends_at = new Date(Date.now() + 7 * 86_400_000).toISOString();
```

### 2. `GET /v1/entitlements` — plan-derived response

Replace current `upsertEntitlements` stub with `deriveEntitlements(user)`:
```ts
function deriveEntitlements(user: User): Entitlements {
  const effectivePlan =
    user.plan === "trial" && user.trial_ends_at && Date.parse(user.trial_ends_at) < Date.now()
      ? "free"
      : user.plan;
  return PLAN_ENTITLEMENTS[effectivePlan];
}
```

Response also includes `plan` and `trial_ends_at` so the frontend can display plan name and countdown:
```ts
{ ...entitlements, plan: user.plan, trial_ends_at: user.trial_ends_at }
```

### 3. `PATCH /v1/admin/users/:id/plan` — admin assigns plan (NEW endpoint)

```
PATCH /v1/admin/users/:id/plan
Authorization: Bearer <admin-token>
Body: { plan: "free" | "basic" | "premium" }
Response 200: { id, plan }
```

Sets `user.plan` and clears `user.trial_ends_at`.

### 4. `GET /v1/admin/users` — include plan in response

Each user object in the list now includes: `{ id, email, name, role, status, plan, trial_ends_at }`.

### 5. `POST /v1/billing/subscribe` — upgrade request (no Stripe yet)

```
POST /v1/billing/subscribe
Authorization: Bearer <user-token>
Body: { plan: "basic" | "premium" }
Response 200: { contact_url: "https://wa.me/..." }
```

Returns a WhatsApp or contact link. Stripe replaces this endpoint body in a future iteration.

---

## Frontend — New & Modified Files

### New files

| File | Purpose |
|---|---|
| `Frontend/src/types/plan.ts` | `Plan` type, `PLAN_LABELS`, `PLAN_COLORS`, `PLAN_FEATURES` table |
| `Frontend/src/components/FeatureGate.tsx` | Wrapper: renders children if entitled, else `<UpgradePrompt>` |
| `Frontend/src/components/UpgradePrompt.tsx` | Card: "Disponível no plano X — Ver planos" |
| `Frontend/src/components/TrialBanner.tsx` | Countdown banner when trial ≤ 3 days |
| `Frontend/src/pages/PlanosPage.tsx` | Pricing page: 3 columns, current plan highlighted, upgrade CTA |

### Modified files

| File | Change |
|---|---|
| `Frontend/src/contexts/EntitlementsContext.tsx` | Add `plan`, `trialEndsAt`, `isTrialing`, `daysLeftInTrial` to context |
| `Frontend/src/services/entitlementService.ts` | Extend `Entitlements` type with `plan`, `trial_ends_at`, `packages_enabled`, `ai_features_enabled` |
| `Frontend/src/services/billingService.ts` | Add `subscribe(plan)` method → `POST /v1/billing/subscribe`; keep existing `createCheckoutSession` |
| `Frontend/src/pages/admin/AdminUsersPage.tsx` | Full implementation: user list, plan badges, assign plan select, invite modal |
| `Frontend/src/pages/HomePage.tsx` | Mount `<TrialBanner>` when applicable |
| `Frontend/src/components/Sidebar.tsx` | Add "Planos" nav item (Crown icon); mount `<TrialBanner>` |
| `Frontend/src/pages/FormsPage.tsx` | Wrap with `<FeatureGate feature="forms_enabled">` |
| `Frontend/src/pages/ScalesPage.tsx` | Wrap with `<FeatureGate feature="scales_enabled">` |
| `Frontend/src/pages/FinancePage.tsx` | Wrap with `<FeatureGate feature="finance_enabled">` |
| `Frontend/src/pages/BackupPage.tsx` | Wrap with `<FeatureGate feature="backup_enabled">` |
| `Frontend/src/pages/pageRegistry.tsx` | Register `PlanosPage` route |

---

## Component Details

### `FeatureGate`

```tsx
<FeatureGate feature="forms_enabled">
  <FormsPage />
</FeatureGate>
```

- Uses `useEntitlements().canUse(feature)`
- If false: renders `<UpgradePrompt feature={feature} />`
- `canUse()` returns true when not cloud-connected (offline-first — never block offline users)

### `UpgradePrompt`

Elegant card (not an error state):
- Icon + "Esta funcionalidade está disponível no plano [X]"
- Button: "Ver planos" → navigates to `/planos`

### `TrialBanner`

- Only shown when `isTrialing && daysLeftInTrial <= 3`
- Non-intrusive top bar or inline card in dashboard
- "Seu trial expira em N dias — escolha um plano para continuar." [Ver planos →]

### `PlanosPage`

- 3-column card layout (Free / Básico / Premium)
- Current plan has `ring-2 ring-primary` highlight
- Feature list per column with ✓ / ✗ icons
- If trial active: banner "Você está no trial — aproveite todos os recursos por mais N dias"
- Upgrade button calls `billingService.subscribe(plan)` → opens `contact_url`

### `AdminUsersPage`

- Loads `GET /v1/admin/users` on mount
- Table rows: email, plan badge, trial countdown, status toggle, plan selector
- Plan badge colors: trial=yellow, free=gray, basic=blue, premium=teal
- "Gerar convite" button opens modal with email input → `POST /v1/auth/invite` → copies link to clipboard

---

## EntitlementsContext additions

```ts
interface EntitlementsContextType {
  // existing...
  plan: Plan | null;
  trialEndsAt: string | null;
  isTrialing: boolean;
  daysLeftInTrial: number | null;
  canUse: (feature: keyof EntitlementFlags) => boolean;
}
```

`canUse` extended to cover `packages_enabled` and `ai_features_enabled` in addition to existing flags.

---

## Offline-first Guarantee

`canUse()` returns `true` when `entitlements === null` (not connected to control plane). The `DEFAULT_ENTITLEMENTS` constant already has all features enabled. This ensures offline psychologists are never blocked from their own data.

---

## Migration / Existing Users

The seeded admin user (`camila@ethos.local`) gets `plan = "premium"` with `trial_ends_at = null` — full access, no expiry.

---

## Future: Stripe Integration

When Stripe is ready:
- `POST /v1/billing/subscribe` returns a Stripe Checkout URL instead of a WhatsApp link
- Stripe webhook (`POST /v1/webhooks/stripe`) already exists in the control plane
- `plan` field on the user is set by the webhook handler on `checkout.session.completed`
- No frontend changes needed — the upgrade button already calls `billingService.subscribe()`
