import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createEthosBackend } from "../src/server";

const req = async (base: string, path: string, method = "GET", body?: unknown, token?: string, idem?: string) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(idem ? { "Idempotency-Key": idem } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json() as any;
  return { status: response.status, json };
};

const setup = async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const adminLogin = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
  const adminToken = adminLogin.json.data.token as string;
  const invite = await req(base, "/auth/invite", "POST", { email: "qa@ethos.local" }, adminToken);
  await req(base, "/auth/accept-invite", "POST", { token: invite.json.data.invite_token, name: "QA", password: "qa123456" });
  const login = await req(base, "/auth/login", "POST", { email: "qa@ethos.local", password: "qa123456" });

  await req(base, "/local/entitlements/sync", "POST", { snapshot: { entitlements: { transcription_minutes_per_month: 3000, max_sessions_per_month: 2000, exports_enabled: true, backup_enabled: true, forms_enabled: true, scales_enabled: true, finance_enabled: true, max_patients: 2000 }, source_subscription_status: "active", last_successful_subscription_validation_at: new Date().toISOString() } }, login.json.data.token as string);
  return { server, base, adminToken, userToken: login.json.data.token as string };
};

test("smoke: cobertura dos principais endpoints clínicos e administrativos", async () => {
  const { server, base, adminToken, userToken } = await setup();

  const contracts = await req(base, "/contracts");
  assert.equal(contracts.status, 200);

  const session = await req(base, "/sessions", "POST", { patient_id: "patient-smoke", scheduled_at: new Date().toISOString() }, userToken, "smoke-session-1");
  assert.equal(session.status, 201);
  const sessionId = session.json.data.id as string;

  assert.equal((await req(base, "/sessions", "GET", undefined, userToken)).status, 200);
  assert.equal((await req(base, `/sessions/${sessionId}`, "GET", undefined, userToken)).status, 200);
  assert.equal((await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "confirmed" }, userToken)).status, 200);
  assert.equal((await req(base, `/sessions/${sessionId}/audio`, "POST", { file_path: "vault://x.enc", consent_confirmed: true }, userToken)).status, 201);

  const tJob = await req(base, `/sessions/${sessionId}/transcribe`, "POST", { raw_text: "texto base" }, userToken);
  assert.equal(tJob.status, 202);
  assert.equal((await req(base, `/jobs/${tJob.json.data.job_id}`, "GET", undefined, userToken)).status, 200);

  const note = await req(base, `/sessions/${sessionId}/clinical-note`, "POST", { content: "rascunho clínico" }, userToken);
  assert.equal(note.status, 201);
  assert.equal((await req(base, `/clinical-notes/${note.json.data.id}/validate`, "POST", {}, userToken)).status, 200);

  assert.equal((await req(base, "/reports", "POST", { patient_id: "patient-smoke", purpose: "profissional", content: "relatório" }, userToken)).status, 201);
  assert.equal((await req(base, "/reports", "GET", undefined, userToken)).status, 200);

  assert.equal((await req(base, "/anamnesis", "POST", { patient_id: "patient-smoke", template_id: "default", content: { humor: "ok" } }, userToken)).status, 201);
  assert.equal((await req(base, "/anamnesis", "GET", undefined, userToken)).status, 200);

  assert.equal((await req(base, "/scales/record", "POST", { scale_id: "phq9", patient_id: "patient-smoke", score: 9 }, userToken)).status, 201);
  assert.equal((await req(base, "/scales/records", "GET", undefined, userToken)).status, 200);

  assert.equal((await req(base, "/forms/entry", "POST", { patient_id: "patient-smoke", form_id: "consent", content: { accepted: true } }, userToken)).status, 201);
  assert.equal((await req(base, "/forms", "GET", undefined, userToken)).status, 200);

  assert.equal((await req(base, "/financial/entry", "POST", { patient_id: "patient-smoke", type: "receivable", amount: 120, due_date: new Date().toISOString(), description: "sessão" }, userToken)).status, 201);
  assert.equal((await req(base, "/financial/entries", "GET", undefined, userToken)).status, 200);

  const exportJob = await req(base, "/export/pdf", "POST", {}, userToken);
  assert.equal(exportJob.status, 202);
  assert.equal((await req(base, `/jobs/${exportJob.json.data.job_id}`, "GET", undefined, userToken)).status, 200);

  const backupJob = await req(base, "/backup", "POST", {}, userToken);
  assert.equal(backupJob.status, 202);
  assert.equal((await req(base, "/restore", "POST", {}, userToken)).status, 202);

  assert.equal((await req(base, "/ai/organize", "POST", { text: " texto livre " }, userToken)).status, 200);
  assert.equal((await req(base, "/api/webhook", "POST", { job_id: backupJob.json.data.job_id, status: "completed" }, userToken)).status, 202);

  assert.equal((await req(base, "/admin/metrics/overview", "GET", undefined, adminToken)).status, 200);
  assert.equal((await req(base, "/admin/audit", "GET", undefined, adminToken)).status, 200);

  assert.equal((await req(base, "/purge", "POST", {}, userToken)).status, 202);
  assert.equal((await req(base, "/auth/logout", "POST", {}, userToken)).status, 200);

  server.close();
});
