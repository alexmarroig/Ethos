import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createEthosBackend } from "../src/server";

const req = async (base: string, path: string, method: string, body?: unknown, token?: string, idem?: string) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(idem ? { "Idempotency-Key": idem } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() as any };
};

const rawReq = async (base: string, path: string, method: string, body: string | undefined, headers: Record<string, string> = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body,
  });
  return { status: res.status, json: await res.json() as any };
};

const bootstrap = async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const adminLogin = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
  const adminToken = adminLogin.json.data.token;
  const invite = await req(base, "/auth/invite", "POST", { email: "user1@ethos.local" }, adminToken);
  await req(base, "/auth/accept-invite", "POST", { token: invite.json.data.invite_token, name: "User 1", password: "secret123" });
  const login = await req(base, "/auth/login", "POST", { email: "user1@ethos.local", password: "secret123" });
  await req(base, "/local/entitlements/sync", "POST", { snapshot: { entitlements: { transcription_minutes_per_month: 3000, max_sessions_per_month: 2000, exports_enabled: true, backup_enabled: true, forms_enabled: true, scales_enabled: true, finance_enabled: true, max_patients: 2000 }, source_subscription_status: "active", last_successful_subscription_validation_at: new Date().toISOString() } }, login.json.data.token as string);
  await req(base, "/local/entitlements/sync", "POST", { snapshot: { features: { transcription: true, export: true, backup: true }, limits: { sessions_per_month: 100 }, source_subscription_status: "active" } }, login.json.data.token as string);
  return { server, base, adminToken, userToken: login.json.data.token as string };
};

test("auth convite + rbac admin", async () => {
  const { server, base, adminToken, userToken } = await bootstrap();
  const denied = await req(base, "/sessions", "GET", undefined, adminToken);
  assert.equal(denied.status, 403);
  const allowed = await req(base, "/sessions", "GET", undefined, userToken);
  assert.equal(allowed.status, 200);
  server.close();
});

test("isolamento owner_user_id", async () => {
  const { server, base, adminToken, userToken } = await bootstrap();
  const invite2 = await req(base, "/auth/invite", "POST", { email: "user2@ethos.local" }, adminToken);
  await req(base, "/auth/accept-invite", "POST", { token: invite2.json.data.invite_token, name: "User 2", password: "secret321" });
  const login2 = await req(base, "/auth/login", "POST", { email: "user2@ethos.local", password: "secret321" });

  const session = await req(base, "/sessions", "POST", { patient_id: "p1", scheduled_at: new Date().toISOString() }, userToken);
  const forbidden = await req(base, `/sessions/${session.json.data.id}`, "GET", undefined, login2.json.data.token);
  assert.equal(forbidden.status, 404);
  server.close();
});

test("state machine: nota draft -> validated e report depende de validação", async () => {
  const { server, base, userToken } = await bootstrap();
  const session = await req(base, "/sessions", "POST", { patient_id: "p2", scheduled_at: new Date().toISOString() }, userToken);
  const note = await req(base, `/sessions/${session.json.data.id}/clinical-note`, "POST", { content: "rascunho" }, userToken);
  assert.equal(note.json.data.status, "draft");

  const blocked = await req(base, "/reports", "POST", { patient_id: "p2", purpose: "profissional", content: "x" }, userToken);
  assert.equal(blocked.status, 422);

  await req(base, `/clinical-notes/${note.json.data.id}/validate`, "POST", {}, userToken);
  const report = await req(base, "/reports", "POST", { patient_id: "p2", purpose: "profissional", content: "ok" }, userToken);
  assert.equal(report.status, 201);
  server.close();
});

test("jobs async + webhook + idempotency", async () => {
  const { server, base, userToken } = await bootstrap();
  const session = await req(base, "/sessions", "POST", { patient_id: "p3", scheduled_at: new Date().toISOString() }, userToken, "idem-1");
  const session2 = await req(base, "/sessions", "POST", { patient_id: "p3", scheduled_at: new Date().toISOString() }, userToken, "idem-1");
  assert.equal(session.json.data.id, session2.json.data.id);

  const transcribe = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "texto" }, userToken);
  assert.equal(transcribe.status, 202);
  const hook = await req(base, "/api/webhook", "POST", { job_id: transcribe.json.data.job_id, status: "completed" }, userToken);
  assert.equal(hook.status, 202);
  const job = await req(base, `/jobs/${transcribe.json.data.job_id}`, "GET", undefined, userToken);
  assert.equal(job.json.data.status, "completed");
  server.close();
});

test("json inválido no payload retorna 400 e não 500", async () => {
  const { server, base } = await bootstrap();
  const response = await rawReq(base, "/auth/login", "POST", '{"email":"x"', { "content-type": "application/json" });

  assert.equal(response.status, 400);
  assert.notEqual(response.status, 500);
  assert.equal(response.json.error.code, "INVALID_JSON");
  server.close();
});

test("corpo vazio retorna 400 e não 500", async () => {
  const { server, base } = await bootstrap();
  const response = await rawReq(base, "/auth/login", "POST", undefined, { "content-type": "application/json" });

  assert.equal(response.status, 400);
  assert.notEqual(response.status, 500);
  assert.equal(response.json.error.code, "INVALID_JSON");
  server.close();
});

test("content-type não json retorna 400 e não 500", async () => {
  const { server, base } = await bootstrap();
  const response = await rawReq(base, "/auth/login", "POST", "email=x&password=y", { "content-type": "application/x-www-form-urlencoded" });

  assert.equal(response.status, 400);
  assert.notEqual(response.status, 500);
  assert.equal(response.json.error.code, "INVALID_JSON");
  server.close();
});
