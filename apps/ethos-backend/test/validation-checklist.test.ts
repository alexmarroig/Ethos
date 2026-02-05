import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createEthosBackend } from "../src/server";
import { db, uid } from "../src/infra/database";

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

  const inviteA = await req(base, "/auth/invite", "POST", { email: "user-a@ethos.local" }, adminToken);
  await req(base, "/auth/accept-invite", "POST", { token: inviteA.json.data.invite_token, name: "User A", password: "secretA123" });
  const userALogin = await req(base, "/auth/login", "POST", { email: "user-a@ethos.local", password: "secretA123" });

  const inviteB = await req(base, "/auth/invite", "POST", { email: "user-b@ethos.local" }, adminToken);
  await req(base, "/auth/accept-invite", "POST", { token: inviteB.json.data.invite_token, name: "User B", password: "secretB123" });
  const userBLogin = await req(base, "/auth/login", "POST", { email: "user-b@ethos.local", password: "secretB123" });

  await req(base, "/local/entitlements/sync", "POST", { snapshot: { entitlements: { transcription_minutes_per_month: 3000, max_sessions_per_month: 2000, exports_enabled: true, backup_enabled: true, forms_enabled: true, scales_enabled: true, finance_enabled: true, max_patients: 2000 }, source_subscription_status: "active", last_successful_subscription_validation_at: new Date().toISOString() } }, userALogin.json.data.token as string);
  await req(base, "/local/entitlements/sync", "POST", { snapshot: { entitlements: { transcription_minutes_per_month: 3000, max_sessions_per_month: 2000, exports_enabled: true, backup_enabled: true, forms_enabled: true, scales_enabled: true, finance_enabled: true, max_patients: 2000 }, source_subscription_status: "active", last_successful_subscription_validation_at: new Date().toISOString() } }, userBLogin.json.data.token as string);
  await req(base, "/local/entitlements/sync", "POST", { snapshot: { features: { transcription: true, export: true, backup: true }, limits: { sessions_per_month: 100 }, source_subscription_status: "active" } }, userALogin.json.data.token as string);
  await req(base, "/local/entitlements/sync", "POST", { snapshot: { features: { transcription: true, export: true, backup: true }, limits: { sessions_per_month: 100 }, source_subscription_status: "active" } }, userBLogin.json.data.token as string);

  return {
    server,
    base,
    adminToken,
    userAToken: userALogin.json.data.token as string,
    userBToken: userBLogin.json.data.token as string,
  };
};

test("checklist: convite + login", async () => {
  const { server, userAToken } = await setup();
  assert.ok(userAToken.length > 10);
  server.close();
});

test("checklist: isolamento total entre usuários (inclusive por ID)", async () => {
  const { server, base, userAToken, userBToken } = await setup();
  const session = await req(base, "/sessions", "POST", { patient_id: "p-a", scheduled_at: new Date().toISOString() }, userAToken);
  const sid = session.json.data.id as string;

  const byIdForbidden = await req(base, `/sessions/${sid}`, "GET", undefined, userBToken);
  assert.equal(byIdForbidden.status, 404);

  const note = await req(base, `/sessions/${sid}/clinical-note`, "POST", { content: "conteúdo clínico privado" }, userAToken);
  const nid = note.json.data.id as string;
  const noteValidateByOther = await req(base, `/clinical-notes/${nid}/validate`, "POST", {}, userBToken);
  assert.equal(noteValidateByOther.status, 404);

  server.close();
});

test("checklist: admin só vê contagens e nunca conteúdo clínico", async () => {
  const { server, base, adminToken, userAToken } = await setup();

  await req(base, "/sessions", "POST", { patient_id: "p-admin-check", scheduled_at: new Date().toISOString() }, userAToken);
  const adminClinical = await req(base, "/sessions", "GET", undefined, adminToken);
  assert.equal(adminClinical.status, 403);

  const metrics = await req(base, "/admin/metrics/overview", "GET", undefined, adminToken);
  assert.equal(metrics.status, 200);
  assert.ok(typeof metrics.json.data.users_total === "number");
  assert.ok(!("sessions" in metrics.json.data));

  server.close();
});

test("checklist: fluxo completo sessão→áudio→transcrição→rascunho→validar→relatório→export", async () => {
  const { server, base, userAToken } = await setup();

  const session = await req(base, "/sessions", "POST", { patient_id: "patient-flow", scheduled_at: new Date().toISOString() }, userAToken, "flow-idem");
  assert.equal(session.status, 201);
  const sid = session.json.data.id as string;

  assert.equal((await req(base, `/sessions/${sid}/audio`, "POST", { file_path: "vault://audio.enc", consent_confirmed: true }, userAToken)).status, 201);

  const tjob = await req(base, `/sessions/${sid}/transcribe`, "POST", { raw_text: "texto clínico de teste" }, userAToken);
  assert.equal(tjob.status, 202);
  const tjobId = tjob.json.data.job_id as string;
  assert.equal((await req(base, `/jobs/${tjobId}`, "GET", undefined, userAToken)).status, 200);

  const note = await req(base, `/sessions/${sid}/clinical-note`, "POST", { content: "rascunho clínico" }, userAToken);
  assert.equal(note.status, 201);

  assert.equal((await req(base, `/clinical-notes/${note.json.data.id}/validate`, "POST", {}, userAToken)).status, 200);

  assert.equal((await req(base, "/reports", "POST", { patient_id: "patient-flow", purpose: "profissional", content: "relatório final" }, userAToken)).status, 201);

  const exportJob = await req(base, "/export/pdf", "POST", {}, userAToken);
  assert.equal(exportJob.status, 202);
  assert.equal((await req(base, `/jobs/${exportJob.json.data.job_id}`, "GET", undefined, userAToken)).status, 200);

  server.close();
});

test("checklist: kill de worker não corrompe estado (simulação de falha de job)", async () => {
  const { server, base, userAToken } = await setup();

  const session = await req(base, "/sessions", "POST", { patient_id: "patient-worker", scheduled_at: new Date().toISOString() }, userAToken);
  const sid = session.json.data.id as string;
  const tjob = await req(base, `/sessions/${sid}/transcribe`, "POST", { raw_text: "texto" }, userAToken);

  const failed = await req(base, "/api/webhook", "POST", { job_id: tjob.json.data.job_id, status: "failed", error_code: "WORKER_KILLED" }, userAToken);
  assert.equal(failed.status, 202);

  const job = await req(base, `/jobs/${tjob.json.data.job_id}`, "GET", undefined, userAToken);
  assert.equal(job.status, 200);
  assert.equal(job.json.data.status, "failed");
  assert.equal(job.json.data.error_code, "WORKER_KILLED");

  server.close();
});

test("checklist: backup + restore funcionam", async () => {
  const { server, base, userAToken } = await setup();
  const backup = await req(base, "/backup", "POST", {}, userAToken);
  assert.equal(backup.status, 202);
  const restore = await req(base, "/restore", "POST", {}, userAToken);
  assert.equal(restore.status, 202);
  server.close();
});

test("checklist: purge apaga tudo do usuário", async () => {
  const { server, base, userAToken } = await setup();

  await req(base, "/sessions", "POST", { patient_id: "patient-purge", scheduled_at: new Date().toISOString() }, userAToken);
  const before = await req(base, "/sessions", "GET", undefined, userAToken);
  assert.ok(before.json.data.total >= 1);

  assert.equal((await req(base, "/purge", "POST", {}, userAToken)).status, 202);

  const afterWithPurgedToken = await req(base, "/sessions", "GET", undefined, userAToken);
  assert.equal(afterWithPurgedToken.status, 401);

  const relogin = await req(base, "/auth/login", "POST", { email: "user-a@ethos.local", password: "secretA123" });
  assert.equal(relogin.status, 200);
  const after = await req(base, "/sessions", "GET", undefined, relogin.json.data.token as string);
  assert.equal(after.json.data.total, 0);

  server.close();
});

test("checklist: purge remove todos os vínculos do usuário (incluindo estruturas derivadas)", async () => {
  const { server, base, userAToken, userBToken } = await setup();

  const ownerId = db.sessionsTokens.get(userAToken)?.user_id;
  const otherOwnerId = db.sessionsTokens.get(userBToken)?.user_id;
  assert.ok(ownerId);
  assert.ok(otherOwnerId);

  const session = await req(base, "/sessions", "POST", { patient_id: "patient-purge-scope", scheduled_at: new Date().toISOString() }, userAToken);
  const sid = session.json.data.id as string;
  await req(base, `/sessions/${sid}/audio`, "POST", { file_path: "vault://audio.enc", consent_confirmed: true }, userAToken);
  const note = await req(base, `/sessions/${sid}/clinical-note`, "POST", { content: "conteúdo purgável" }, userAToken);
  await req(base, `/clinical-notes/${note.json.data.id}/validate`, "POST", {}, userAToken);
  await req(base, "/reports", "POST", { patient_id: "patient-purge-scope", purpose: "profissional", content: "relatório" }, userAToken);
  await req(base, "/anamnesis", "POST", { patient_id: "patient-purge-scope", template_id: "tpl-1", content: { q1: "ok" } }, userAToken);
  await req(base, "/scales/record", "POST", { scale_id: "phq9", patient_id: "patient-purge-scope", score: 9 }, userAToken);
  await req(base, "/forms/entry", "POST", { form_id: "f1", patient_id: "patient-purge-scope", content: { a: 1 } }, userAToken);
  await req(base, "/financial/entry", "POST", { patient_id: "patient-purge-scope", type: "receivable", amount: 150, due_date: new Date().toISOString() }, userAToken);
  await req(base, "/export/pdf", "POST", {}, userAToken);

  db.audit.set(uid(), { id: uid(), actor_user_id: ownerId as string, target_user_id: otherOwnerId as string, event: "MANUAL_OWNER_A", ts: new Date().toISOString() });
  db.audit.set(uid(), { id: uid(), actor_user_id: otherOwnerId as string, target_user_id: ownerId as string, event: "MANUAL_TARGET_A", ts: new Date().toISOString() });
  db.telemetry.set(uid(), { id: uid(), user_id: ownerId as string, event_type: "MANUAL_OWNER_A", ts: new Date().toISOString() });
  db.telemetryQueue.set("mixed", [
    { id: uid(), user_id: ownerId as string, event_type: "QUEUE_OWNER_A", ts: new Date().toISOString() },
    { id: uid(), user_id: otherOwnerId as string, event_type: "QUEUE_OWNER_B", ts: new Date().toISOString() },
  ]);

  assert.equal((await req(base, "/purge", "POST", {}, userAToken)).status, 202);

  const ownedCollections = [
    db.patients,
    db.sessions,
    db.audioRecords,
    db.transcripts,
    db.clinicalNotes,
    db.reports,
    db.anamnesis,
    db.scales,
    db.forms,
    db.financial,
    db.jobs,
  ];

  for (const map of ownedCollections) {
    assert.equal(Array.from(map.values()).some((entry) => entry.owner_user_id === ownerId), false);
  }

  assert.equal(Array.from(db.telemetry.values()).some((entry) => entry.user_id === ownerId), false);
  assert.equal(Array.from(db.audit.values()).some((entry) => entry.actor_user_id === ownerId || entry.target_user_id === ownerId), false);
  assert.equal(Array.from(db.sessionsTokens.values()).some((entry) => entry.user_id === ownerId), false);
  assert.equal(db.localEntitlements.has(ownerId as string), false);

  const telemetryQueue = db.telemetryQueue.get("mixed") ?? [];
  assert.equal(telemetryQueue.some((entry) => entry.user_id === ownerId), false);
  assert.equal(telemetryQueue.some((entry) => entry.user_id === otherOwnerId), true);

  server.close();
});


test("checklist: OpenAPI cobre rotas reais principais", async () => {
  const { server, base } = await setup();
  const response = await fetch(`${base}/openapi.yaml`);
  const text = await response.text();

  const mustContain = [
    "/auth/invite",
    "/auth/accept-invite",
    "/auth/login",
    "/sessions",
    "/sessions/{id}",
    "/sessions/{id}/audio",
    "/sessions/{id}/transcribe",
    "/sessions/{id}/clinical-note",
    "/clinical-notes/{id}/validate",
    "/reports",
    "/anamnesis",
    "/scales/record",
    "/scales/records",
    "/forms/entry",
    "/forms",
    "/financial/entry",
    "/financial/entries",
    "/export/pdf",
    "/export/docx",
    "/backup",
    "/restore",
    "/purge",
    "/jobs/{id}",
    "/api/webhook",
    "/webhooks/transcriber",
    "/admin/metrics/overview",
    "/admin/audit",
    "/ai/organize",
    "/contracts",
  ];

  for (const route of mustContain) {
    assert.match(text, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  server.close();
});

test("checklist: logs não expõem texto clínico (telemetria sanitizada)", async () => {
  const { server, base, userAToken } = await setup();
  const sensitive = "PACIENTE JOAO CPF 12345678900";

  const writes: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  (process.stdout.write as unknown as (chunk: any, ...args: any[]) => boolean) = ((chunk: any, ...args: any[]) => {
    writes.push(String(chunk));
    return originalWrite(chunk, ...args);
  }) as any;

  try {
    const session = await req(base, "/sessions", "POST", { patient_id: "p-log", scheduled_at: new Date().toISOString() }, userAToken);
    await req(base, `/sessions/${session.json.data.id}/clinical-note`, "POST", { content: sensitive }, userAToken);
  } finally {
    process.stdout.write = originalWrite as any;
  }

  const combined = writes.join("\n");
  assert.equal(combined.includes(sensitive), false);

  server.close();
});
