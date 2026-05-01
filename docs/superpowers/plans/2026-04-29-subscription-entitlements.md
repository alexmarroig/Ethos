# Subscription & Entitlement Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plan-based entitlement system (Trial/Free/Basic/Premium) with admin plan management, user-facing pricing page, and feature gates across the app.

**Architecture:** Plans are defined as constants in both control plane and frontend. The control plane derives feature flags from the user's active plan and serves them via `GET /v1/entitlements`. The frontend `EntitlementsContext` exposes `canUse(feature)` and plan metadata. Feature gates wrap pages with `<FeatureGate>` that shows an upgrade prompt when the user lacks access.

**Tech Stack:** React 18 + TypeScript + Tailwind + shadcn/ui (Frontend); Node.js HTTP server in-memory (Control Plane); Vitest + @testing-library/react (Frontend tests); node:test (Control Plane tests).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `Frontend/src/types/plan.ts` | Create | Plan type, labels, colors, feature table |
| `apps/ethos-control-plane/src/server.ts` | Modify | Plan fields on User, PLAN_ENTITLEMENTS, deriveEntitlements, new endpoints |
| `apps/ethos-control-plane/test/control-plane.test.ts` | Modify | Update entitlements assertions; add plan endpoint tests |
| `Frontend/src/services/entitlementService.ts` | Modify | Extend Entitlements type with plan, trial_ends_at, new flags |
| `Frontend/src/services/billingService.ts` | Modify | Add subscribe() method |
| `Frontend/src/contexts/EntitlementsContext.tsx` | Modify | Add plan, trialEndsAt, isTrialing, daysLeftInTrial to context |
| `Frontend/src/contexts/EntitlementsContext.test.ts` | Create | Tests for daysLeftInTrial utility |
| `Frontend/src/components/FeatureGate.tsx` | Create | Render children if entitled, else UpgradePrompt |
| `Frontend/src/components/UpgradePrompt.tsx` | Create | "Disponível no plano X — Ver planos" card |
| `Frontend/src/components/FeatureGate.test.tsx` | Create | Tests for FeatureGate gate logic |
| `Frontend/src/components/TrialBanner.tsx` | Create | Countdown banner when trial ≤ 3 days |
| `Frontend/src/pages/PlanosPage.tsx` | Create | Pricing page: 3 columns, current plan, upgrade CTA |
| `Frontend/src/pages/admin/AdminUsersPage.tsx` | Modify | Real user list, plan badges, plan assignment, invite modal |
| `Frontend/src/pages/pageRegistry.tsx` | Modify | Register planos page |
| `Frontend/src/components/Sidebar.tsx` | Modify | Add "Planos" nav item (Crown icon) |
| `Frontend/src/pages/HomePage.tsx` | Modify | Mount TrialBanner |
| `Frontend/src/pages/FormsPage.tsx` | Modify | Wrap with FeatureGate feature="forms_enabled" |
| `Frontend/src/pages/ScalesPage.tsx` | Modify | Wrap with FeatureGate feature="scales_enabled" |
| `Frontend/src/pages/FinancePage.tsx` | Modify | Wrap with FeatureGate feature="finance_enabled" |
| `Frontend/src/pages/BackupPage.tsx` | Modify | Wrap with FeatureGate feature="backup_enabled" |

---

## Task 1: Plan Types (`Frontend/src/types/plan.ts`)

**Files:**
- Create: `Frontend/src/types/plan.ts`

- [ ] **Step 1: Create the file**

```typescript
// Frontend/src/types/plan.ts

export type Plan = "trial" | "free" | "basic" | "premium";

export const PLAN_LABELS: Record<Plan, string> = {
  trial:   "Trial",
  free:    "Gratuito",
  basic:   "Básico",
  premium: "Premium",
};

export const PLAN_COLORS: Record<Plan, string> = {
  trial:   "bg-amber-100 text-amber-800 border-amber-200",
  free:    "bg-muted text-muted-foreground border-border",
  basic:   "bg-blue-100 text-blue-800 border-blue-200",
  premium: "bg-teal-100 text-teal-800 border-teal-200",
};

/** Minimum plan required for each feature — used by UpgradePrompt */
export const FEATURE_MIN_PLAN: Record<string, Plan> = {
  forms_enabled:   "basic",
  scales_enabled:  "basic",
  finance_enabled: "basic",
  exports_enabled: "basic",
  packages_enabled: "basic",
  backup_enabled:  "premium",
  ai_features_enabled: "premium",
};

/** Plan order for comparison */
export const PLAN_ORDER: Plan[] = ["trial", "free", "basic", "premium"];
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/types/plan.ts
git commit -m "feat: add Plan type and constants"
```

---

## Task 2: Control Plane — Plan System

**Files:**
- Modify: `apps/ethos-control-plane/src/server.ts`

- [ ] **Step 1: Replace the type definitions at the top of server.ts**

Find this block (lines 4-18):
```typescript
type Role = "admin" | "user";
type User = { id: string; email: string; name: string; role: Role; status: "active" | "disabled"; password_hash: string; created_at: string };
type Invite = { id: string; email: string; token_hash: string; expires_at: string; created_at: string; used_at?: string };
type Session = { token: string; user_id: string; expires_at: string };

type Entitlements = {
  exports_enabled: boolean;
  backup_enabled: boolean;
  forms_enabled: boolean;
  scales_enabled: boolean;
  finance_enabled: boolean;
  transcription_minutes_per_month: number;
  max_patients: number;
  max_sessions_per_month: number;
};

type EntitlementSnapshot = {
  user_id: string;
  entitlements: Entitlements;
  source_subscription_status: "none" | "active" | "past_due";
  grace_days: number;
  grace_until?: string;
};
```

Replace with:
```typescript
type Role = "admin" | "user";
type Plan = "trial" | "free" | "basic" | "premium";

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "disabled";
  password_hash: string;
  created_at: string;
  plan: Plan;
  trial_ends_at: string | null;
};

type Invite = { id: string; email: string; token_hash: string; expires_at: string; created_at: string; used_at?: string };
type Session = { token: string; user_id: string; expires_at: string };

type Entitlements = {
  exports_enabled: boolean;
  backup_enabled: boolean;
  forms_enabled: boolean;
  scales_enabled: boolean;
  finance_enabled: boolean;
  packages_enabled: boolean;
  ai_features_enabled: boolean;
  transcription_minutes_per_month: number;
  max_patients: number;
  max_sessions_per_month: number;
  subscription_status: string;
  is_in_grace: boolean;
  grace_until: string | null;
  plan: Plan;
  trial_ends_at: string | null;
};

const PLAN_ENTITLEMENTS: Record<Plan, Omit<Entitlements, "plan" | "trial_ends_at" | "subscription_status" | "is_in_grace" | "grace_until">> = {
  trial: {
    max_patients: 999, max_sessions_per_month: 999,
    forms_enabled: true, scales_enabled: true, finance_enabled: true,
    exports_enabled: true, backup_enabled: true,
    packages_enabled: true, ai_features_enabled: true,
    transcription_minutes_per_month: 300,
  },
  free: {
    max_patients: 5, max_sessions_per_month: 20,
    forms_enabled: false, scales_enabled: false, finance_enabled: false,
    exports_enabled: false, backup_enabled: false,
    packages_enabled: false, ai_features_enabled: false,
    transcription_minutes_per_month: 0,
  },
  basic: {
    max_patients: 30, max_sessions_per_month: 100,
    forms_enabled: true, scales_enabled: true, finance_enabled: true,
    exports_enabled: true, backup_enabled: false,
    packages_enabled: true, ai_features_enabled: false,
    transcription_minutes_per_month: 60,
  },
  premium: {
    max_patients: 999, max_sessions_per_month: 999,
    forms_enabled: true, scales_enabled: true, finance_enabled: true,
    exports_enabled: true, backup_enabled: true,
    packages_enabled: true, ai_features_enabled: true,
    transcription_minutes_per_month: 300,
  },
};

function deriveEntitlements(user: User): Entitlements {
  const effectivePlan =
    user.plan === "trial" && user.trial_ends_at && Date.parse(user.trial_ends_at) < Date.now()
      ? "free"
      : user.plan;
  return {
    ...PLAN_ENTITLEMENTS[effectivePlan],
    subscription_status: user.plan === "trial" ? "trialing" : "active",
    is_in_grace: false,
    grace_until: null,
    plan: user.plan,
    trial_ends_at: user.trial_ends_at,
  };
}
```

- [ ] **Step 2: Update the db object and admin seed (remove old entitlements map)**

Find this block:
```typescript
const db = {
  users: new Map<string, User>(),
  invites: new Map<string, Invite>(),
  sessions: new Map<string, Session>(),
  entitlements: new Map<string, EntitlementSnapshot>(),
  telemetry: new Map<string, Telemetry>(),
  audit: new Map<string, { id: string; actor_user_id: string; event: string; ts: string }>(),
};

const adminId = uid();
db.users.set(adminId, { id: adminId, email: "camila@ethos.local", name: "Camila", role: "admin", status: "active", password_hash: hashPassword("admin123"), created_at: now() });

const defaultEntitlements: Entitlements = {
  exports_enabled: true,
  backup_enabled: true,
  forms_enabled: true,
  scales_enabled: true,
  finance_enabled: true,
  transcription_minutes_per_month: 3000,
  max_patients: 2000,
  max_sessions_per_month: 2000,
};
```

Replace with:
```typescript
const db = {
  users: new Map<string, User>(),
  invites: new Map<string, Invite>(),
  sessions: new Map<string, Session>(),
  telemetry: new Map<string, Telemetry>(),
  audit: new Map<string, { id: string; actor_user_id: string; event: string; ts: string }>(),
};

const adminId = uid();
db.users.set(adminId, {
  id: adminId, email: "camila@ethos.local", name: "Camila",
  role: "admin", status: "active", password_hash: hashPassword("admin123"),
  created_at: now(), plan: "premium", trial_ends_at: null,
});
```

- [ ] **Step 3: Update `POST /v1/auth/accept-invite` to start trial**

Find this line in the accept-invite handler:
```typescript
const user: User = { id: uid(), email: invite.email, name: String(body.name ?? ""), role: "user", status: "active", password_hash: hashPassword(String(body.password ?? "")), created_at: now() };
db.users.set(user.id, user);
upsertEntitlements(user.id, "active");
```

Replace with:
```typescript
const user: User = {
  id: uid(), email: invite.email, name: String(body.name ?? ""),
  role: "user", status: "active", password_hash: hashPassword(String(body.password ?? "")),
  created_at: now(), plan: "trial",
  trial_ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
};
db.users.set(user.id, user);
```

- [ ] **Step 4: Update `GET /v1/entitlements` to use deriveEntitlements**

Find:
```typescript
if (method === "GET" && url.pathname === "/v1/entitlements") return send(res, requestId, 200, db.entitlements.get(auth.user.id) ?? upsertEntitlements(auth.user.id));
```

Replace with:
```typescript
if (method === "GET" && url.pathname === "/v1/entitlements") return send(res, requestId, 200, deriveEntitlements(auth.user));
```

- [ ] **Step 5: Update `GET /v1/admin/users` to include plan**

Find:
```typescript
if (method === "GET" && url.pathname === "/v1/admin/users") {
  if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
  return send(res, requestId, 200, Array.from(db.users.values()).map((user) => ({ id: user.id, email: user.email, role: user.role, status: user.status })));
}
```

Replace with:
```typescript
if (method === "GET" && url.pathname === "/v1/admin/users") {
  if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
  return send(res, requestId, 200, Array.from(db.users.values()).map((user) => ({
    id: user.id, email: user.email, name: user.name, role: user.role,
    status: user.status, plan: user.plan, trial_ends_at: user.trial_ends_at,
  })));
}
```

- [ ] **Step 6: Add `PATCH /v1/admin/users/:id/plan` endpoint**

Find this block (after the existing adminUserPatch block):
```typescript
const adminUserPatch = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)$/);
if (method === "PATCH" && adminUserPatch) {
  if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
  const body = await readJson(req);
  const user = db.users.get(adminUserPatch[1]);
  if (!user) return fail(res, requestId, 404, "NOT_FOUND", "User not found");
  if (body.status === "active" || body.status === "disabled") user.status = body.status;
  return send(res, requestId, 200, { id: user.id, status: user.status });
}
```

Replace with:
```typescript
const adminUserPatch = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)$/);
if (method === "PATCH" && adminUserPatch) {
  if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
  const body = await readJson(req);
  const user = db.users.get(adminUserPatch[1]);
  if (!user) return fail(res, requestId, 404, "NOT_FOUND", "User not found");
  if (body.status === "active" || body.status === "disabled") user.status = body.status;
  return send(res, requestId, 200, { id: user.id, status: user.status });
}

const adminUserPlan = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)\/plan$/);
if (method === "PATCH" && adminUserPlan) {
  if (auth.user.role !== "admin") return fail(res, requestId, 403, "FORBIDDEN", "Forbidden");
  const body = await readJson(req);
  const user = db.users.get(adminUserPlan[1]);
  if (!user) return fail(res, requestId, 404, "NOT_FOUND", "User not found");
  const plan = String(body.plan ?? "");
  if (!["free", "basic", "premium"].includes(plan)) return fail(res, requestId, 400, "INVALID_PLAN", "Plan must be free, basic, or premium");
  user.plan = plan as Plan;
  user.trial_ends_at = null;
  db.audit.set(uid(), { id: uid(), actor_user_id: auth.user.id, event: "PLAN_CHANGED", ts: now() });
  return send(res, requestId, 200, { id: user.id, plan: user.plan });
}
```

- [ ] **Step 7: Add `POST /v1/billing/subscribe` endpoint**

Find:
```typescript
if (method === "POST" && url.pathname === "/v1/billing/checkout-session") return send(res, requestId, 200, { checkout_url: "https://billing.local/checkout" });
if (method === "GET" && url.pathname === "/v1/billing/subscription") return send(res, requestId, 200, { status: "active" });
if (method === "POST" && url.pathname === "/v1/billing/portal-session") return send(res, requestId, 200, { portal_url: "https://billing.local/portal" });
```

Replace with:
```typescript
if (method === "POST" && url.pathname === "/v1/billing/checkout-session") return send(res, requestId, 200, { checkout_url: "https://billing.local/checkout" });
if (method === "GET" && url.pathname === "/v1/billing/subscription") {
  const ent = deriveEntitlements(auth.user);
  return send(res, requestId, 200, {
    status: ent.subscription_status, plan: auth.user.plan,
    current_period_end: auth.user.trial_ends_at, cancel_at_period_end: false, portal_url: null,
  });
}
if (method === "POST" && url.pathname === "/v1/billing/portal-session") return send(res, requestId, 200, { portal_url: "https://billing.local/portal" });
if (method === "POST" && url.pathname === "/v1/billing/subscribe") {
  const body = await readJson(req);
  const plan = String(body.plan ?? "");
  if (!["basic", "premium"].includes(plan)) return fail(res, requestId, 400, "INVALID_PLAN", "Plan must be basic or premium");
  return send(res, requestId, 200, { contact_url: "https://wa.me/5511999999999?text=Quero+assinar+o+plano+" + plan });
}
```

- [ ] **Step 8: Remove the now-unused `upsertEntitlements` function**

Find and delete this entire function:
```typescript
const upsertEntitlements = (userId: string, status: EntitlementSnapshot["source_subscription_status"] = "active") => {
  const snapshot: EntitlementSnapshot = {
    user_id: userId,
    entitlements: defaultEntitlements,
    source_subscription_status: status,
    grace_days: 14,
    grace_until: status === "past_due" ? new Date(Date.now() + 14 * 86_400_000).toISOString() : undefined,
  };
  db.entitlements.set(userId, snapshot);
  return snapshot;
};
```

- [ ] **Step 9: Commit**

```bash
git add apps/ethos-control-plane/src/server.ts
git commit -m "feat(control-plane): add plan system with trial/free/basic/premium"
```

---

## Task 3: Control Plane Tests

**Files:**
- Modify: `apps/ethos-control-plane/test/control-plane.test.ts`

- [ ] **Step 1: Update entitlements assertions in the existing test**

The existing test at line ~49-52 checks the old `EntitlementSnapshot` format. The new `/v1/entitlements` returns a flat object. Find:

```typescript
const ent = await req(base, "/v1/entitlements", "GET", undefined, userToken);
assert.equal(ent.status, 200);
assert.equal(ent.json.data.entitlements.transcription_minutes_per_month, 3000);
assert.equal(ent.json.data.grace_days, 14);
```

Replace with:
```typescript
const ent = await req(base, "/v1/entitlements", "GET", undefined, userToken);
assert.equal(ent.status, 200);
// New user starts on trial — should have premium-level entitlements
assert.equal(ent.json.data.transcription_minutes_per_month, 300);
assert.equal(ent.json.data.forms_enabled, true);
assert.equal(ent.json.data.plan, "trial");
assert.ok(ent.json.data.trial_ends_at, "trial_ends_at should be set");
```

- [ ] **Step 2: Add a new test for plan management**

After the closing `server.close()` of the first test, add:

```typescript
test("plan management — admin assigns plan, entitlements update", async () => {
  const { server, base, adminToken } = await bootstrap();

  // Create a user
  const invite = await req(base, "/v1/auth/invite", "POST", { email: "plan-test@ethos.local" }, adminToken);
  await req(base, "/v1/auth/accept-invite", "POST", { token: invite.json.data.invite_token, name: "Plan Tester", password: "secret123" });
  const login = await req(base, "/v1/auth/login", "POST", { email: "plan-test@ethos.local", password: "secret123" });
  const userId = login.json.data.user.id as string;
  const userToken = login.json.data.token as string;

  // New user should be on trial
  const trialEnt = await req(base, "/v1/entitlements", "GET", undefined, userToken);
  assert.equal(trialEnt.json.data.plan, "trial");
  assert.equal(trialEnt.json.data.backup_enabled, true);

  // Admin assigns free plan
  const assignFree = await req(base, `/v1/admin/users/${userId}/plan`, "PATCH", { plan: "free" }, adminToken);
  assert.equal(assignFree.status, 200);
  assert.equal(assignFree.json.data.plan, "free");

  // Entitlements should reflect free plan
  const freeEnt = await req(base, "/v1/entitlements", "GET", undefined, userToken);
  assert.equal(freeEnt.json.data.plan, "free");
  assert.equal(freeEnt.json.data.forms_enabled, false);
  assert.equal(freeEnt.json.data.max_patients, 5);

  // Admin assigns basic plan
  await req(base, `/v1/admin/users/${userId}/plan`, "PATCH", { plan: "basic" }, adminToken);
  const basicEnt = await req(base, "/v1/entitlements", "GET", undefined, userToken);
  assert.equal(basicEnt.json.data.forms_enabled, true);
  assert.equal(basicEnt.json.data.backup_enabled, false);
  assert.equal(basicEnt.json.data.ai_features_enabled, false);

  // Admin assigns premium plan
  await req(base, `/v1/admin/users/${userId}/plan`, "PATCH", { plan: "premium" }, adminToken);
  const premiumEnt = await req(base, "/v1/entitlements", "GET", undefined, userToken);
  assert.equal(premiumEnt.json.data.backup_enabled, true);
  assert.equal(premiumEnt.json.data.ai_features_enabled, true);

  // Invalid plan is rejected
  const bad = await req(base, `/v1/admin/users/${userId}/plan`, "PATCH", { plan: "enterprise" }, adminToken);
  assert.equal(bad.status, 400);

  // Non-admin cannot assign plan
  const forbidden = await req(base, `/v1/admin/users/${userId}/plan`, "PATCH", { plan: "premium" }, userToken);
  assert.equal(forbidden.status, 403);

  // billing/subscribe returns contact_url
  const sub = await req(base, "/v1/billing/subscribe", "POST", { plan: "basic" }, userToken);
  assert.equal(sub.status, 200);
  assert.ok(sub.json.data.contact_url.startsWith("https://wa.me/"));

  // Admin users list includes plan
  const users = await req(base, "/v1/admin/users", "GET", undefined, adminToken);
  const tester = (users.json.data as any[]).find((u: any) => u.email === "plan-test@ethos.local");
  assert.ok(tester, "user should appear in list");
  assert.equal(tester.plan, "premium");

  server.close();
});
```

- [ ] **Step 3: Run tests**

```bash
cd apps/ethos-control-plane
node --test -r ts-node/register/transpile-only test/control-plane.test.ts
```

Expected: both tests pass (2 passing).

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-control-plane/test/control-plane.test.ts
git commit -m "test(control-plane): update entitlements assertions; add plan management tests"
```

---

## Task 4: Frontend Services

**Files:**
- Modify: `Frontend/src/services/entitlementService.ts`
- Modify: `Frontend/src/services/billingService.ts`

- [ ] **Step 1: Rewrite `entitlementService.ts`**

```typescript
// Frontend/src/services/entitlementService.ts
// Control Plane Entitlements Service
import { controlApi } from "./controlClient";
import type { ApiResult } from "./apiClient";
import type { Plan } from "@/types/plan";

export interface Entitlements {
  exports_enabled: boolean;
  backup_enabled: boolean;
  forms_enabled: boolean;
  scales_enabled: boolean;
  finance_enabled: boolean;
  packages_enabled: boolean;
  ai_features_enabled: boolean;
  transcription_minutes_per_month: number;
  max_patients: number;
  max_sessions_per_month: number;
  subscription_status: string;
  is_in_grace: boolean;
  grace_until: string | null;
  plan: Plan;
  trial_ends_at: string | null;
}

export const entitlementService = {
  get: (): Promise<ApiResult<Entitlements>> =>
    controlApi.get<Entitlements>("/entitlements"),
};
```

- [ ] **Step 2: Add `subscribe()` to `billingService.ts`**

Open `Frontend/src/services/billingService.ts`. Add after the existing `CheckoutSession` interface:

```typescript
export interface SubscribeResult {
  contact_url: string;
}
```

Add to the `billingService` object:
```typescript
subscribe: (plan: "basic" | "premium"): Promise<ApiResult<SubscribeResult>> =>
  controlApi.post<SubscribeResult>("/billing/subscribe", { plan }),
```

The full file after changes:
```typescript
// Frontend/src/services/billingService.ts
// Control Plane Billing Service
import { controlApi } from "./controlClient";
import type { ApiResult } from "./apiClient";

export interface Subscription {
  status: "trialing" | "active" | "past_due" | "canceled" | "none";
  plan: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  portal_url: string | null;
}

export interface CheckoutSession {
  url: string;
}

export interface SubscribeResult {
  contact_url: string;
}

export const billingService = {
  getSubscription: (): Promise<ApiResult<Subscription>> =>
    controlApi.get<Subscription>("/billing/subscription"),

  createCheckoutSession: (plan?: string): Promise<ApiResult<CheckoutSession>> =>
    controlApi.post<CheckoutSession>("/billing/checkout-session", plan ? { plan } : undefined),

  subscribe: (plan: "basic" | "premium"): Promise<ApiResult<SubscribeResult>> =>
    controlApi.post<SubscribeResult>("/billing/subscribe", { plan }),
};
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/services/entitlementService.ts Frontend/src/services/billingService.ts
git commit -m "feat(frontend): extend entitlement + billing service types"
```

---

## Task 5: EntitlementsContext

**Files:**
- Modify: `Frontend/src/contexts/EntitlementsContext.tsx`
- Create: `Frontend/src/contexts/EntitlementsContext.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `Frontend/src/contexts/EntitlementsContext.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeDaysLeftInTrial } from './EntitlementsContext';

describe('computeDaysLeftInTrial', () => {
  it('returns null when trialEndsAt is null', () => {
    expect(computeDaysLeftInTrial(null)).toBeNull();
  });

  it('returns 0 when trial already expired', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(computeDaysLeftInTrial(past)).toBe(0);
  });

  it('returns correct days remaining', () => {
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(computeDaysLeftInTrial(future)).toBe(3);
  });

  it('rounds down partial days', () => {
    // 2.9 days from now → 2
    const future = new Date(Date.now() + 2.9 * 86_400_000).toISOString();
    expect(computeDaysLeftInTrial(future)).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Frontend
npx vitest run src/contexts/EntitlementsContext.test.ts
```

Expected: FAIL — `computeDaysLeftInTrial` not exported.

- [ ] **Step 3: Rewrite `EntitlementsContext.tsx`**

```typescript
// Frontend/src/contexts/EntitlementsContext.tsx
import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { entitlementService, Entitlements } from "@/services/entitlementService";
import { billingService, Subscription } from "@/services/billingService";
import type { Plan } from "@/types/plan";

export type EntitlementFeature = keyof Pick<Entitlements,
  "exports_enabled" | "backup_enabled" | "forms_enabled" |
  "scales_enabled" | "finance_enabled" | "packages_enabled" | "ai_features_enabled"
>;

interface EntitlementsContextType {
  entitlements: Entitlements | null;
  subscription: Subscription | null;
  isCloudConnected: boolean;
  plan: Plan | null;
  trialEndsAt: string | null;
  isTrialing: boolean;
  daysLeftInTrial: number | null;
  canUse: (feature: EntitlementFeature) => boolean;
  needsAction: boolean;
  fetchEntitlements: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  clearCloud: () => void;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

const DEFAULT_ENTITLEMENTS: Entitlements = {
  exports_enabled: true,
  backup_enabled: true,
  forms_enabled: true,
  scales_enabled: true,
  finance_enabled: true,
  packages_enabled: true,
  ai_features_enabled: true,
  transcription_minutes_per_month: 999,
  max_patients: 999,
  max_sessions_per_month: 999,
  subscription_status: "none",
  is_in_grace: false,
  grace_until: null,
  plan: "premium",
  trial_ends_at: null,
};

/** Pure utility — exported for testing */
export function computeDaysLeftInTrial(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const msLeft = Date.parse(trialEndsAt) - Date.now();
  return Math.max(0, Math.floor(msLeft / 86_400_000));
}

export const EntitlementsProvider = ({ children }: { children: ReactNode }) => {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const isCloudConnected = !!entitlements;
  const plan = entitlements?.plan ?? null;
  const trialEndsAt = entitlements?.trial_ends_at ?? null;
  const isTrialing = plan === "trial";
  const daysLeftInTrial = useMemo(() => computeDaysLeftInTrial(trialEndsAt), [trialEndsAt]);

  const canUse = useCallback(
    (feature: EntitlementFeature) => {
      const e = entitlements || DEFAULT_ENTITLEMENTS;
      return e[feature] === true;
    },
    [entitlements]
  );

  const needsAction =
    !!subscription &&
    (subscription.status === "past_due" || subscription.status === "canceled");

  const fetchEntitlements = useCallback(async () => {
    const res = await entitlementService.get();
    if (res.success) setEntitlements(res.data);
  }, []);

  const fetchSubscription = useCallback(async () => {
    const res = await billingService.getSubscription();
    if (res.success) setSubscription(res.data);
  }, []);

  const clearCloud = useCallback(() => {
    setEntitlements(null);
    setSubscription(null);
  }, []);

  return (
    <EntitlementsContext.Provider
      value={{
        entitlements, subscription, isCloudConnected,
        plan, trialEndsAt, isTrialing, daysLeftInTrial,
        canUse, needsAction,
        fetchEntitlements, fetchSubscription, clearCloud,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
};

export const useEntitlements = () => {
  const context = useContext(EntitlementsContext);
  if (!context) throw new Error("useEntitlements must be used within EntitlementsProvider");
  return context;
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd Frontend
npx vitest run src/contexts/EntitlementsContext.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/contexts/EntitlementsContext.tsx Frontend/src/contexts/EntitlementsContext.test.ts
git commit -m "feat(frontend): extend EntitlementsContext with plan, trial, and daysLeftInTrial"
```

---

## Task 6: FeatureGate + UpgradePrompt

**Files:**
- Create: `Frontend/src/components/UpgradePrompt.tsx`
- Create: `Frontend/src/components/FeatureGate.tsx`
- Create: `Frontend/src/components/FeatureGate.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `Frontend/src/components/FeatureGate.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureGate } from './FeatureGate';

// Mock useEntitlements
vi.mock('@/contexts/EntitlementsContext', () => ({
  useEntitlements: vi.fn(),
}));

import { useEntitlements } from '@/contexts/EntitlementsContext';

const mockCanUse = (value: boolean) => {
  (useEntitlements as ReturnType<typeof vi.fn>).mockReturnValue({
    canUse: () => value,
    plan: value ? 'premium' : 'free',
  });
};

describe('FeatureGate', () => {
  it('renders children when feature is enabled', () => {
    mockCanUse(true);
    render(
      <FeatureGate feature="forms_enabled">
        <div>Protected Content</div>
      </FeatureGate>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders upgrade prompt when feature is disabled', () => {
    mockCanUse(false);
    render(
      <FeatureGate feature="forms_enabled">
        <div>Protected Content</div>
      </FeatureGate>
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText(/plano/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Frontend
npx vitest run src/components/FeatureGate.test.tsx
```

Expected: FAIL — `FeatureGate` not found.

- [ ] **Step 3: Create `UpgradePrompt.tsx`**

```tsx
// Frontend/src/components/UpgradePrompt.tsx
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_MIN_PLAN, PLAN_LABELS } from "@/types/plan";
import type { EntitlementFeature } from "@/contexts/EntitlementsContext";

interface UpgradePromptProps {
  feature: EntitlementFeature;
  onNavigate?: (page: string) => void;
}

export function UpgradePrompt({ feature, onNavigate }: UpgradePromptProps) {
  const minPlan = FEATURE_MIN_PLAN[feature] ?? "basic";
  const planLabel = PLAN_LABELS[minPlan];

  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Crown className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          Disponível no plano {planLabel}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Faça upgrade para desbloquear esta funcionalidade e muito mais.
        </p>
      </div>
      {onNavigate && (
        <Button variant="secondary" onClick={() => onNavigate("planos")}>
          Ver planos
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `FeatureGate.tsx`**

```tsx
// Frontend/src/components/FeatureGate.tsx
import { ReactNode } from "react";
import { useEntitlements, type EntitlementFeature } from "@/contexts/EntitlementsContext";
import { UpgradePrompt } from "./UpgradePrompt";

interface FeatureGateProps {
  feature: EntitlementFeature;
  children: ReactNode;
  onNavigate?: (page: string) => void;
}

export function FeatureGate({ feature, children, onNavigate }: FeatureGateProps) {
  const { canUse } = useEntitlements();
  if (!canUse(feature)) {
    return <UpgradePrompt feature={feature} onNavigate={onNavigate} />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd Frontend
npx vitest run src/components/FeatureGate.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/UpgradePrompt.tsx Frontend/src/components/FeatureGate.tsx Frontend/src/components/FeatureGate.test.tsx
git commit -m "feat(frontend): add FeatureGate and UpgradePrompt components"
```

---

## Task 7: TrialBanner

**Files:**
- Create: `Frontend/src/components/TrialBanner.tsx`

- [ ] **Step 1: Create `TrialBanner.tsx`**

```tsx
// Frontend/src/components/TrialBanner.tsx
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntitlements } from "@/contexts/EntitlementsContext";

interface TrialBannerProps {
  onNavigate?: (page: string) => void;
}

export function TrialBanner({ onNavigate }: TrialBannerProps) {
  const { isTrialing, daysLeftInTrial } = useEntitlements();

  // Only show when trial has 3 or fewer days left
  if (!isTrialing || daysLeftInTrial === null || daysLeftInTrial > 3) return null;

  const dayWord = daysLeftInTrial === 1 ? "dia" : "dias";
  const message =
    daysLeftInTrial === 0
      ? "Seu trial expirou hoje — escolha um plano para continuar."
      : `Seu trial expira em ${daysLeftInTrial} ${dayWord} — escolha um plano para continuar.`;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
      <p className="flex-1 text-amber-800 dark:text-amber-200">{message}</p>
      {onNavigate && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200"
          onClick={() => onNavigate("planos")}
        >
          Ver planos
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/components/TrialBanner.tsx
git commit -m "feat(frontend): add TrialBanner component"
```

---

## Task 8: PlanosPage

**Files:**
- Create: `Frontend/src/pages/PlanosPage.tsx`

- [ ] **Step 1: Create `PlanosPage.tsx`**

```tsx
// Frontend/src/pages/PlanosPage.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { billingService } from "@/services/billingService";
import { useToast } from "@/hooks/use-toast";
import { TrialBanner } from "@/components/TrialBanner";
import { PLAN_LABELS } from "@/types/plan";
import type { Plan } from "@/types/plan";

interface FeatureRow {
  label: string;
  free: boolean | string;
  basic: boolean | string;
  premium: boolean | string;
}

const FEATURES: FeatureRow[] = [
  { label: "Pacientes", free: "até 5", basic: "até 30", premium: "Ilimitados" },
  { label: "Sessões/mês", free: "até 20", basic: "até 100", premium: "Ilimitadas" },
  { label: "Agenda e prontuário", free: true, basic: true, premium: true },
  { label: "Formulários e anamnese", free: false, basic: true, premium: true },
  { label: "Escalas clínicas", free: false, basic: true, premium: true },
  { label: "Financeiro", free: false, basic: true, premium: true },
  { label: "Exportações", free: false, basic: true, premium: true },
  { label: "Pacotes por abordagem", free: false, basic: true, premium: true },
  { label: "Backup e dados", free: false, basic: false, premium: true },
  { label: "Transcrição IA", free: "0 min", basic: "60 min/mês", premium: "300 min/mês" },
  { label: "Síntese clínica IA", free: false, basic: false, premium: true },
  { label: "Diário de sonhos IA", free: false, basic: false, premium: true },
];

const FeatureValue = ({ value }: { value: boolean | string }) => {
  if (value === true) return <Check className="h-4 w-4 text-teal-600 mx-auto" strokeWidth={2} />;
  if (value === false) return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" strokeWidth={2} />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
};

const PlanCard = ({
  plan, isCurrent, onUpgrade, upgrading,
}: {
  plan: Plan; isCurrent: boolean; onUpgrade?: () => void; upgrading: boolean;
}) => {
  const isHighlighted = plan === "premium";
  return (
    <div className={cn(
      "rounded-2xl border p-6 flex flex-col gap-4 transition-all",
      isCurrent ? "ring-2 ring-primary border-primary/30" : "border-border",
      isHighlighted && !isCurrent && "border-teal-200 bg-teal-50/30 dark:border-teal-800 dark:bg-teal-950/10",
    )}>
      <div className="flex items-center gap-2">
        {isHighlighted && <Crown className="h-4 w-4 text-teal-600" strokeWidth={1.5} />}
        <span className="font-semibold text-foreground">{PLAN_LABELS[plan]}</span>
        {isCurrent && (
          <span className="ml-auto text-xs text-primary font-medium">Seu plano</span>
        )}
      </div>
      {isCurrent ? (
        <Button variant="outline" disabled className="w-full">
          Plano atual
        </Button>
      ) : onUpgrade ? (
        <Button
          variant={isHighlighted ? "default" : "secondary"}
          className="w-full"
          onClick={onUpgrade}
          disabled={upgrading}
        >
          {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Assinar {PLAN_LABELS[plan]}
        </Button>
      ) : null}
    </div>
  );
};

interface PlanosPageProps {
  onNavigate?: (page: string) => void;
}

const PlanosPage = ({ onNavigate }: PlanosPageProps) => {
  const { plan, isTrialing, daysLeftInTrial } = useEntitlements();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState<"basic" | "premium" | null>(null);

  const handleUpgrade = async (targetPlan: "basic" | "premium") => {
    setUpgrading(targetPlan);
    try {
      const res = await billingService.subscribe(targetPlan);
      if (res.success) {
        window.open(res.data.contact_url, "_blank", "noopener");
      } else {
        toast({ title: "Erro", description: "Não foi possível iniciar o upgrade.", variant: "destructive" });
      }
    } finally {
      setUpgrading(null);
    }
  };

  const currentPlan = plan ?? "free";

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12 max-w-5xl">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Planos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Escolha o plano ideal para a sua prática clínica.
          </p>
        </motion.header>

        {isTrialing && daysLeftInTrial !== null && (
          <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {daysLeftInTrial > 3
                ? `Você está no trial gratuito — aproveite todos os recursos por mais ${daysLeftInTrial} dias.`
                : daysLeftInTrial === 0
                  ? "Seu trial expirou hoje."
                  : `Seu trial expira em ${daysLeftInTrial} ${daysLeftInTrial === 1 ? "dia" : "dias"}.`}
            </div>
          </motion.div>
        )}

        {/* Plan cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PlanCard
            plan="free"
            isCurrent={currentPlan === "free"}
            upgrading={false}
          />
          <PlanCard
            plan="basic"
            isCurrent={currentPlan === "basic"}
            onUpgrade={currentPlan !== "basic" && currentPlan !== "premium" ? () => handleUpgrade("basic") : undefined}
            upgrading={upgrading === "basic"}
          />
          <PlanCard
            plan="premium"
            isCurrent={currentPlan === "premium"}
            onUpgrade={currentPlan !== "premium" ? () => handleUpgrade("premium") : undefined}
            upgrading={upgrading === "premium"}
          />
        </motion.div>

        {/* Feature comparison table */}
        <motion.div
          className="rounded-xl border border-border overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Funcionalidade</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Gratuito</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Básico</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Premium</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row, i) => (
                <tr key={row.label} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "" : "bg-muted/20")}>
                  <td className="px-4 py-3 text-foreground">{row.label}</td>
                  <td className="px-4 py-3 text-center"><FeatureValue value={row.free} /></td>
                  <td className="px-4 py-3 text-center"><FeatureValue value={row.basic} /></td>
                  <td className="px-4 py-3 text-center"><FeatureValue value={row.premium} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.p
          className="mt-6 text-xs text-muted-foreground text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Ao clicar em "Assinar", você será redirecionado para o WhatsApp para finalizar a contratação.
        </motion.p>
      </div>
    </div>
  );
};

export default PlanosPage;
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/pages/PlanosPage.tsx
git commit -m "feat(frontend): add PlanosPage pricing page"
```

---

## Task 9: AdminUsersPage — Full Implementation

**Files:**
- Modify: `Frontend/src/pages/admin/AdminUsersPage.tsx`

- [ ] **Step 1: Rewrite `AdminUsersPage.tsx`**

```tsx
// Frontend/src/pages/admin/AdminUsersPage.tsx
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Mail, Copy, Check, Loader2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { controlApi } from "@/services/controlClient";
import { PLAN_LABELS, PLAN_COLORS } from "@/types/plan";
import type { Plan } from "@/types/plan";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  status: "active" | "disabled";
  plan: Plan;
  trial_ends_at: string | null;
}

interface Metrics {
  users_total: number;
  trialing: number;
  paid: number;
}

const PlanBadge = ({ plan, trial_ends_at }: { plan: Plan; trial_ends_at: string | null }) => {
  const daysLeft = trial_ends_at
    ? Math.max(0, Math.floor((Date.parse(trial_ends_at) - Date.now()) / 86_400_000))
    : null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", PLAN_COLORS[plan])}>
      {plan === "premium" && <Crown className="h-3 w-3" />}
      {PLAN_LABELS[plan]}
      {plan === "trial" && daysLeft !== null && (
        <span className="ml-1 opacity-70">· {daysLeft}d</span>
      )}
    </span>
  );
};

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await controlApi.get<AdminUser[]>("/admin/users");
      if (res.success) setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await controlApi.post<{ invite_id: string; invite_token: string }>("/auth/invite", { email: inviteEmail.trim() });
      if (res.success) {
        const link = `${window.location.origin}/?invite=${res.data.invite_token}`;
        setInviteLink(link);
        toast({ title: "Convite criado!", description: "Copie o link e envie para o usuário." });
      } else {
        toast({ title: "Erro", description: "Não foi possível criar o convite.", variant: "destructive" });
      }
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCloseInvite = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteLink(null);
    setCopied(false);
  };

  const handlePlanChange = async (userId: string, plan: string) => {
    setChangingPlan(userId);
    try {
      const res = await controlApi.patch<{ id: string; plan: Plan }>(`/admin/users/${userId}/plan`, { plan });
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: res.data.plan, trial_ends_at: null } : u));
        toast({ title: "Plano atualizado", description: `Plano alterado para ${PLAN_LABELS[res.data.plan]}.` });
      } else {
        toast({ title: "Erro", description: "Não foi possível alterar o plano.", variant: "destructive" });
      }
    } finally {
      setChangingPlan(null);
    }
  };

  const metrics: Metrics = {
    users_total: users.length,
    trialing: users.filter(u => u.plan === "trial").length,
    paid: users.filter(u => u.plan === "basic" || u.plan === "premium").length,
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Usuários</h1>
          <p className="mt-2 text-muted-foreground">Gerenciamento de usuários, convites e planos.</p>
        </motion.header>

        {/* Metrics */}
        <motion.div className="grid grid-cols-3 gap-4 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {[
            { label: "Total", value: metrics.users_total },
            { label: "Em trial", value: metrics.trialing },
            { label: "Pagos", value: metrics.paid },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div className="flex gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <Button variant="secondary" className="gap-2" onClick={() => setInviteOpen(true)}>
            <Mail className="w-4 h-4" strokeWidth={1.5} />
            Gerar convite
          </Button>
        </motion.div>

        {/* Users table */}
        <motion.div className="rounded-xl border border-border overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando usuários...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plano</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Alterar plano</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={user.id} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "" : "bg-muted/10")}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{user.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={user.plan} trial_ends_at={user.trial_ends_at} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium", user.status === "active" ? "text-teal-600" : "text-destructive")}>
                        {user.status === "active" ? "Ativo" : "Desativado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === "admin" ? (
                        <span className="text-xs text-muted-foreground">Admin</span>
                      ) : (
                        <Select
                          value={user.plan === "trial" ? "" : user.plan}
                          onValueChange={(val) => handlePlanChange(user.id, val)}
                          disabled={changingPlan === user.id}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue placeholder="Escolher plano" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Gratuito</SelectItem>
                            <SelectItem value="basic">Básico</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </div>

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={open => { if (!open) handleCloseInvite(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar convite</DialogTitle>
          </DialogHeader>
          {!inviteLink ? (
            <>
              <div className="space-y-2 py-2">
                <label className="text-sm font-medium text-foreground">E-mail do usuário</label>
                <Input
                  type="email"
                  placeholder="psi@exemplo.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                  disabled={inviting}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseInvite}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Gerar link
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Envie este link para <strong>{inviteEmail}</strong>. O link expira em 24 horas.
                </p>
                <div className="flex items-center gap-2">
                  <Input value={inviteLink} readOnly className="text-xs" />
                  <Button size="icon" variant="outline" onClick={handleCopyLink}>
                    {copied ? <Check className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseInvite}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
```

- [ ] **Step 2: Check if `controlApi.patch` exists**

Open `Frontend/src/services/controlClient.ts` and verify a `patch` method exists. If it only has `get` and `post`, add:
```typescript
patch: <T>(path: string, body?: unknown): Promise<ApiResult<T>> =>
  request<T>("PATCH", path, body),
```

Run the frontend build to check for TypeScript errors:
```bash
cd Frontend
npx tsc --noEmit 2>&1 | head -30
```

Fix any TypeScript errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/pages/admin/AdminUsersPage.tsx
git commit -m "feat(admin): implement full user management with plan badges and invite modal"
```

---

## Task 10: pageRegistry + Sidebar + HomePage TrialBanner

**Files:**
- Modify: `Frontend/src/pages/pageRegistry.tsx`
- Modify: `Frontend/src/components/Sidebar.tsx`
- Modify: `Frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Register PlanosPage in `pageRegistry.tsx`**

Add import at top (after other imports):
```typescript
const importPlanosPage = () => import("@/pages/PlanosPage");
```

Add `"planos"` to the `Page` type union:
```typescript
export type Page =
  | "home" | "agenda" | "patients" | "patient-detail" | "ethics" | "settings" | "session" | "prontuario"
  | "forms" | "anamnesis" | "reports" | "finance" | "documents" | "account" | "backup"
  | "contracts" | "planos"
  | "patient-home" | "patient-sessions" | "patient-diary" | "patient-messages"
  | "patient-documents" | "patient-payments" | "patient-booking" | "patient-dream-diary"
  | "availability"
  | "admin-dashboard" | "admin-users" | "admin-testlab" | "admin-tickets"
  | "diagnostics";
```

Add to `pageAccess`:
```typescript
planos: ["professional", "admin"],
```

Add to `pages` object:
```typescript
PlanosPage: lazyRetry(importPlanosPage),
```

Add to `pageImporters`:
```typescript
planos: importPlanosPage,
```

- [ ] **Step 2: Add "Planos" nav item to `Sidebar.tsx`**

Add `Crown` to the lucide-react import (find the import block and add `Crown`).

In the `navigation` array, after the `backup` item (line ~79), add:
```typescript
{ id: "planos", label: "Planos", icon: Crown, roles: ["professional"] },
```

- [ ] **Step 3: Add TrialBanner to `HomePage.tsx`**

Add import at top of `HomePage.tsx`:
```typescript
import { TrialBanner } from "@/components/TrialBanner";
```

Find the first `<div>` or `<motion.div>` inside the return statement of `HomePage`, and add `TrialBanner` before the first content section:

```tsx
{/* Trial banner — only visible when trial ≤ 3 days remaining */}
<div className="mb-6">
  <TrialBanner onNavigate={onNavigate} />
</div>
```

Place it after the opening container div but before the first `motion.header` or content section.

- [ ] **Step 4: Also need to wire PlanosPage in App.tsx or the router**

Open `Frontend/src/App.tsx` and check how pages are rendered. Find where the `pages` map is used to render page components. The pattern is typically a switch/condition that renders `pages[PageName]`. Add a case for `planos`:

Look for the block that handles page rendering (search for `PlanosPage` — it won't be there yet). Find the pattern where other pages like `BackupPage` are rendered and add alongside:

```tsx
{currentPage === "planos" && <pages.PlanosPage onNavigate={navigate} />}
```

The exact location depends on how App.tsx structures the page rendering — find the similar lines for other pages and follow the same pattern.

- [ ] **Step 5: Run frontend build check**

```bash
cd Frontend
npx tsc --noEmit 2>&1 | head -40
```

Fix any TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/pages/pageRegistry.tsx Frontend/src/components/Sidebar.tsx Frontend/src/pages/HomePage.tsx Frontend/src/App.tsx
git commit -m "feat(frontend): register PlanosPage, add to sidebar nav, add TrialBanner to dashboard"
```

---

## Task 11: Feature Gates on Pages

**Files:**
- Modify: `Frontend/src/pages/FormsPage.tsx`
- Modify: `Frontend/src/pages/ScalesPage.tsx`
- Modify: `Frontend/src/pages/FinancePage.tsx`
- Modify: `Frontend/src/pages/BackupPage.tsx`

- [ ] **Step 1: Gate FormsPage**

Open `Frontend/src/pages/FormsPage.tsx`. Add import:
```typescript
import { FeatureGate } from "@/components/FeatureGate";
```

Find the `export default` at the bottom (or the component's return statement). Wrap the entire page component's export with FeatureGate. The cleanest way is to create a wrapper:

At the very bottom of `FormsPage.tsx`, after the component definition, change the default export:
```tsx
// Add this wrapper at the bottom, before `export default FormsPage`
const FormsPageGated = (props: React.ComponentProps<typeof FormsPage>) => (
  <FeatureGate feature="forms_enabled" onNavigate={(props as any).onNavigate}>
    <FormsPage {...props} />
  </FeatureGate>
);

export default FormsPageGated;
```

Wait — FormsPage likely already has `export default FormsPage` at the end. Replace it with:
```tsx
const FormsPageGated = ({ onNavigate, ...rest }: Parameters<typeof FormsPage>[0]) => (
  <FeatureGate feature="forms_enabled" onNavigate={onNavigate}>
    <FormsPage onNavigate={onNavigate} {...rest} />
  </FeatureGate>
);

export default FormsPageGated;
```

Actually the simplest approach: just wrap the JSX returned by the component itself. Open `FormsPage.tsx`, find the final `return (` in the main component, and wrap the outermost element:

```tsx
return (
  <FeatureGate feature="forms_enabled" onNavigate={onNavigate}>
    {/* existing JSX unchanged */}
    <div className="min-h-screen">
      ...
    </div>
  </FeatureGate>
);
```

Check if `FormsPage` receives `onNavigate` as a prop — if not, omit it from FeatureGate.

- [ ] **Step 2: Gate ScalesPage**

Same pattern as FormsPage. Open `Frontend/src/pages/ScalesPage.tsx`:

```typescript
import { FeatureGate } from "@/components/FeatureGate";
```

Wrap the return JSX:
```tsx
return (
  <FeatureGate feature="scales_enabled">
    <div className="min-h-screen">
      {/* existing JSX */}
    </div>
  </FeatureGate>
);
```

- [ ] **Step 3: Gate FinancePage**

Open `Frontend/src/pages/FinancePage.tsx`:
```typescript
import { FeatureGate } from "@/components/FeatureGate";
```

Wrap the return JSX:
```tsx
return (
  <FeatureGate feature="finance_enabled">
    <div className="min-h-screen">
      {/* existing JSX */}
    </div>
  </FeatureGate>
);
```

- [ ] **Step 4: Gate BackupPage**

Open `Frontend/src/pages/BackupPage.tsx`:
```typescript
import { FeatureGate } from "@/components/FeatureGate";
```

Wrap the return JSX:
```tsx
return (
  <FeatureGate feature="backup_enabled">
    <div className="min-h-screen">
      {/* existing JSX */}
    </div>
  </FeatureGate>
);
```

- [ ] **Step 5: Run full frontend test suite**

```bash
cd Frontend
npx vitest run
```

Expected: all tests pass (including new EntitlementsContext and FeatureGate tests).

- [ ] **Step 6: Run TypeScript check**

```bash
cd Frontend
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/pages/FormsPage.tsx Frontend/src/pages/ScalesPage.tsx Frontend/src/pages/FinancePage.tsx Frontend/src/pages/BackupPage.tsx
git commit -m "feat(frontend): gate FormsPage, ScalesPage, FinancePage, BackupPage by entitlement"
```

---

## Task 12: Final Integration + PR

- [ ] **Step 1: Run all control plane tests**

```bash
npm --workspace ethos-control-plane run test
```

Expected: all tests pass.

- [ ] **Step 2: Run all frontend tests**

```bash
cd Frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Run TypeScript check**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin HEAD
```

Then open a PR with title: `feat: subscription & entitlement management (trial/free/basic/premium)`

PR body should note:
- Control plane: plan field on users, plan derivation, admin plan endpoint, billing/subscribe
- Frontend: EntitlementsContext with plan/trial metadata, FeatureGate, UpgradePrompt, TrialBanner, PlanosPage, AdminUsersPage full implementation
- All tests passing
- To create account for `psi.camilafreitas@gmail.com`: log into admin panel → Usuários → Gerar convite → enter email → send link
