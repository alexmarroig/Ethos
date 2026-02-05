import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createControlPlane } from "../src/server";

const req = async (base: string, path: string, method = "GET", body?: unknown, token?: string, headers?: Record<string, string>) => {
const req = async (base: string, path: string, method = "GET", body?: unknown, token?: string) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() as any };
};

const bootstrap = async () => {
  const server = createControlPlane();
  server.listen(0);
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const admin = await req(base, "/v1/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
  return { server, base, adminToken: admin.json.data.token as string };
};

test("control plane auth, billing stripe webhook, entitlements and admin sanitized metrics", async () => {
  const { server, base, adminToken } = await bootstrap();
  const invite = await req(base, "/v1/auth/invite", "POST", { email: "pro@ethos.local" }, adminToken);
  assert.equal(invite.status, 201);

  const accepted = await req(base, "/v1/auth/accept-invite", "POST", { token: invite.json.data.invite_token, name: "Pro", password: "secret123" });
  assert.equal(accepted.status, 201);

test("invite/login/rbac/billing/entitlements/telemetry", async () => {
  const { server, base, adminToken } = await bootstrap();
  const invite = await req(base, "/v1/auth/invite", "POST", { email: "pro@ethos.local" }, adminToken);
  assert.equal(invite.status, 201);
  await req(base, "/v1/auth/accept-invite", "POST", { token: invite.json.data.invite_token, name: "Pro", password: "secret123" });
  const login = await req(base, "/v1/auth/login", "POST", { email: "pro@ethos.local", password: "secret123" });
  const userToken = login.json.data.token as string;

  assert.equal((await req(base, "/v1/me", "GET", undefined, userToken)).status, 200);
  assert.equal((await req(base, "/v1/me", "PATCH", { name: "Pro User" }, userToken)).status, 200);

  assert.equal((await req(base, "/v1/billing/checkout-session", "POST", { price_id: "pro_monthly" }, userToken)).status, 200);
  assert.equal((await req(base, "/v1/billing/subscription", "GET", undefined, userToken)).status, 200);
  assert.equal((await req(base, "/v1/billing/portal-session", "POST", {}, userToken)).status, 200);

  const badWebhook = await req(base, "/v1/webhooks/stripe", "POST", { type: "invoice.paid", user_id: login.json.data.user.id });
  assert.equal(badWebhook.status, 401);

  const okWebhook = await req(base, "/v1/webhooks/stripe", "POST", { type: "invoice.payment_failed", user_id: login.json.data.user.id }, undefined, { "stripe-signature": "testsig" });
  assert.equal(okWebhook.status, 202);

  const ent = await req(base, "/v1/entitlements", "GET", undefined, userToken);
  assert.equal(ent.status, 200);
  assert.equal(ent.json.data.entitlements.transcription_minutes_per_month, 3000);
  assert.equal(ent.json.data.grace_days, 14);

  assert.equal((await req(base, "/v1/telemetry", "POST", { event_type: "APP_OPEN", ts: new Date().toISOString(), platform: "desktop" }, userToken)).status, 202);
  assert.equal((await req(base, "/v1/telemetry", "POST", { event_type: "APP_OPEN", transcript: "forbidden" }, userToken)).status, 422);

  assert.equal((await req(base, "/v1/admin/users", "GET", undefined, adminToken)).status, 200);
  assert.equal((await req(base, `/v1/admin/users/${login.json.data.user.id}`, "PATCH", { status: "active" }, adminToken)).status, 200);
  assert.equal((await req(base, "/v1/admin/metrics/overview", "GET", undefined, adminToken)).status, 200);
  assert.equal((await req(base, `/v1/admin/metrics/user-usage?user_id=${login.json.data.user.id}`, "GET", undefined, adminToken)).status, 200);
  assert.equal((await req(base, "/v1/admin/metrics/errors", "GET", undefined, adminToken)).status, 200);
  assert.equal((await req(base, "/v1/admin/audit", "GET", undefined, adminToken)).status, 200);
  assert.equal((await req(base, "/v1/admin/users", "GET", undefined, userToken)).status, 403);
  assert.equal((await req(base, "/v1/admin/users", "GET", undefined, adminToken)).status, 200);

  assert.equal((await req(base, "/v1/billing/checkout-session", "POST", { plan: "pro", interval: "month" }, userToken)).status, 200);
  assert.equal((await req(base, "/v1/billing/subscription", "GET", undefined, userToken)).status, 200);
  assert.equal((await req(base, "/v1/entitlements", "GET", undefined, userToken)).status, 200);
  assert.equal((await req(base, "/v1/billing/portal-session", "POST", {}, userToken)).status, 200);

  assert.equal((await req(base, "/v1/webhooks/stripe", "POST", { type: "invoice.payment_failed", user_id: login.json.data.user.id })).status, 202);
  const ent = await req(base, "/v1/entitlements", "GET", undefined, userToken);
  assert.ok(ent.json.data.grace_until || ent.json.data.source_subscription_status === "past_due");

  assert.equal((await req(base, "/v1/telemetry", "POST", { event_type: "APP_OPEN", ts: new Date().toISOString(), app_version: "1", worker_version: "1" }, userToken)).status, 202);
  assert.equal((await req(base, "/v1/telemetry", "POST", { event_type: "BAD", clinical_text: "secret" }, userToken)).status, 422);

  assert.equal((await req(base, "/v1/admin/metrics/overview", "GET", undefined, adminToken)).status, 200);
  assert.equal((await req(base, "/v1/admin/metrics/errors", "GET", undefined, adminToken)).status, 200);
  assert.equal((await req(base, "/v1/admin/metrics/user-usage?user_id=" + login.json.data.user.id, "GET", undefined, adminToken)).status, 200);

  server.close();
});
