import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createEthosBackend } from "../src/server";

const req = async (base: string, path: string, method = "GET", body?: unknown, token?: string) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() as any };
};

const bootstrap = async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const admin = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
  const invite = await req(base, "/auth/invite", "POST", { email: "gate@ethos.local" }, admin.json.data.token);
  await req(base, "/auth/accept-invite", "POST", { token: invite.json.data.invite_token, name: "Gate", password: "secret123" });
  const login = await req(base, "/auth/login", "POST", { email: "gate@ethos.local", password: "secret123" });
  return { server, base, token: login.json.data.token as string };
};

test("entitlement gating and offline grace", async () => {
  const { server, base, token } = await bootstrap();

  // default local entitlement blocks transcription
  const session = await req(base, "/sessions", "POST", { patient_id: "p1", scheduled_at: new Date().toISOString() }, token);
  assert.equal(session.status, 201);
  const blocked = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "x" }, token);
  assert.equal(blocked.status, 402);

  // sync active entitlement
  await req(base, "/local/entitlements/sync", "POST", { snapshot: { features: { transcription: true, export: true, backup: true }, limits: { sessions_per_month: 1 }, source_subscription_status: "active" } }, token);
  const allowed = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "x" }, token);
  assert.equal(allowed.status, 202);

  // expired subscription but within grace allows transcription
  await req(base, "/local/entitlements/sync", "POST", { snapshot: { features: { transcription: false }, limits: { sessions_per_month: 1 }, source_subscription_status: "canceled", grace_until: new Date(Date.now() + 86400000).toISOString() } }, token);
  const graceAllowed = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "x" }, token);
  assert.equal(graceAllowed.status, 202);

  // new session blocked after limit if canceled and no grace
  await req(base, "/local/entitlements/sync", "POST", { snapshot: { features: { transcription: false }, limits: { sessions_per_month: 1 }, source_subscription_status: "canceled" } }, token);
  const blockedSession = await req(base, "/sessions", "POST", { patient_id: "p2", scheduled_at: new Date().toISOString() }, token);
  assert.equal(blockedSession.status, 402);

  server.close();
});

test("missing GET endpoints are available", async () => {
  const { server, base, token } = await bootstrap();
  await req(base, "/local/entitlements/sync", "POST", { snapshot: { features: { transcription: true, export: true, backup: true }, limits: { sessions_per_month: 100 }, source_subscription_status: "active" } }, token);
  const session = await req(base, "/sessions", "POST", { patient_id: "p3", scheduled_at: new Date().toISOString() }, token);
  assert.equal(session.status, 201);
  const note = await req(base, `/sessions/${session.json.data.id}/clinical-note`, "POST", { content: "draft" }, token);
  assert.equal(note.status, 201);

  assert.equal((await req(base, `/sessions/${session.json.data.id}/clinical-notes`, "GET", undefined, token)).status, 200);
  assert.equal((await req(base, `/clinical-notes/${note.json.data.id}`, "GET", undefined, token)).status, 200);
  assert.equal((await req(base, "/scales", "GET", undefined, token)).status, 200);

  server.close();
});
