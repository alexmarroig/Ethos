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

  const session = await req(base, "/sessions", "POST", { patient_id: "p1", scheduled_at: new Date().toISOString() }, token);
  assert.equal(session.status, 201);

  await req(base, "/local/entitlements/sync", "POST", {
    snapshot: {
      entitlements: {
        exports_enabled: true,
        backup_enabled: true,
        forms_enabled: true,
        scales_enabled: true,
        finance_enabled: true,
        transcription_minutes_per_month: 1,
        max_patients: 200,
        max_sessions_per_month: 1,
      },
      source_subscription_status: "active",
      last_successful_subscription_validation_at: new Date().toISOString(),
    },
  }, token);

  const allowedFirst = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "x" }, token);
  assert.equal(allowedFirst.status, 202);
  await new Promise((r) => setTimeout(r, 50));
  const blockedSecond = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "x" }, token);
  assert.equal(blockedSecond.status, 402);

  await req(base, "/local/entitlements/sync", "POST", {
    snapshot: {
      entitlements: {
        exports_enabled: true,
        backup_enabled: true,
        forms_enabled: true,
        scales_enabled: true,
        finance_enabled: true,
        transcription_minutes_per_month: 10,
        max_patients: 200,
        max_sessions_per_month: 2,
      },
      source_subscription_status: "canceled",
      last_successful_subscription_validation_at: new Date().toISOString(),
    },
  }, token);
  assert.equal((await req(base, "/sessions", "POST", { patient_id: "p2", scheduled_at: new Date().toISOString() }, token)).status, 201);

  await req(base, "/local/entitlements/sync", "POST", {
    snapshot: {
      entitlements: {
        exports_enabled: true,
        backup_enabled: true,
        forms_enabled: true,
        scales_enabled: true,
        finance_enabled: true,
        transcription_minutes_per_month: 10,
        max_patients: 200,
        max_sessions_per_month: 2,
      },
      source_subscription_status: "canceled",
      last_successful_subscription_validation_at: "2000-01-01T00:00:00.000Z",
    },
  }, token);

  assert.equal((await req(base, "/sessions", "POST", { patient_id: "p3", scheduled_at: new Date().toISOString() }, token)).status, 402);
  assert.equal((await req(base, "/export/pdf", "POST", {}, token)).status, 202);
  assert.equal((await req(base, "/backup", "POST", {}, token)).status, 202);

  server.close();
});

test("missing GET endpoints are available", async () => {
  const { server, base, token } = await bootstrap();
  await req(base, "/local/entitlements/sync", "POST", {
    snapshot: {
      entitlements: {
        exports_enabled: true,
        backup_enabled: true,
        forms_enabled: true,
        scales_enabled: true,
        finance_enabled: true,
        transcription_minutes_per_month: 3000,
        max_patients: 2000,
        max_sessions_per_month: 2000,
      },
      source_subscription_status: "active",
      last_successful_subscription_validation_at: new Date().toISOString(),
    },
  }, token);

  const session = await req(base, "/sessions", "POST", { patient_id: "p3", scheduled_at: new Date().toISOString() }, token);
  const note = await req(base, `/sessions/${session.json.data.id}/clinical-note`, "POST", { content: "draft" }, token);

  assert.equal((await req(base, `/sessions/${session.json.data.id}/clinical-notes`, "GET", undefined, token)).status, 200);
  assert.equal((await req(base, `/clinical-notes/${note.json.data.id}`, "GET", undefined, token)).status, 200);
  assert.equal((await req(base, "/scales", "GET", undefined, token)).status, 200);
  assert.equal((await req(base, "/patients", "GET", undefined, token)).status, 200);

  server.close();
});
