import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { resetDatabaseForTests } from "../src/infra/database";
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

const bootstrap = async () => {
  resetDatabaseForTests();
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

const waitForJobCompletion = async (base: string, jobId: string, token: string) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const job = await req(base, `/jobs/${jobId}`, "GET", undefined, token);
    if (job.json.data.status === "completed" && job.json.data.draft_note_id) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return req(base, `/jobs/${jobId}`, "GET", undefined, token);
};

const shutdown = (server: ReturnType<typeof createEthosBackend>) => {
  server.closeAllConnections();
  server.close();
};

test("api regression suite", async (t) => {
  await t.test("auth convite + rbac admin", async () => {
    const { server, base, adminToken, userToken } = await bootstrap();
    try {
      const denied = await req(base, "/sessions", "GET", undefined, adminToken);
      assert.equal(denied.status, 403);
      const allowed = await req(base, "/sessions", "GET", undefined, userToken);
      assert.equal(allowed.status, 200);
    } finally {
      shutdown(server);
    }
  });

  await t.test("isolamento owner_user_id", async () => {
    const { server, base, adminToken, userToken } = await bootstrap();
    try {
      const invite2 = await req(base, "/auth/invite", "POST", { email: "user2@ethos.local" }, adminToken);
      await req(base, "/auth/accept-invite", "POST", { token: invite2.json.data.invite_token, name: "User 2", password: "secret321" });
      const login2 = await req(base, "/auth/login", "POST", { email: "user2@ethos.local", password: "secret321" });

      const session = await req(base, "/sessions", "POST", { patient_id: "p1", scheduled_at: new Date().toISOString() }, userToken);
      const forbidden = await req(base, `/sessions/${session.json.data.id}`, "GET", undefined, login2.json.data.token);
      assert.equal(forbidden.status, 404);
    } finally {
      shutdown(server);
    }
  });

  await t.test("state machine: nota draft -> validated e report depende de validacao", async () => {
    const { server, base, userToken } = await bootstrap();
    try {
      const session = await req(base, "/sessions", "POST", { patient_id: "p2", scheduled_at: new Date().toISOString() }, userToken);
      const note = await req(base, `/sessions/${session.json.data.id}/clinical-note`, "POST", { content: "rascunho" }, userToken);
      assert.equal(note.json.data.status, "draft");

      const blocked = await req(base, "/reports", "POST", { patient_id: "p2", purpose: "profissional", content: "x" }, userToken);
      assert.equal(blocked.status, 422);

      await req(base, `/clinical-notes/${note.json.data.id}/validate`, "POST", {}, userToken);
      const report = await req(base, "/reports", "POST", { patient_id: "p2", purpose: "profissional", content: "ok" }, userToken);
      assert.equal(report.status, 201);
    } finally {
      shutdown(server);
    }
  });

  await t.test("jobs async + webhook + idempotency", async () => {
    const { server, base, userToken } = await bootstrap();
    try {
      const payload = { patient_id: "p3", scheduled_at: new Date().toISOString() };
      const session = await req(base, "/sessions", "POST", payload, userToken, "idem-1");
      const session2 = await req(base, "/sessions", "POST", payload, userToken, "idem-1");
      assert.equal(session.json.data.id, session2.json.data.id);

      const transcribe = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "texto" }, userToken);
      assert.equal(transcribe.status, 202);
      const hook = await req(base, "/api/webhook", "POST", { job_id: transcribe.json.data.job_id, status: "completed" }, userToken);
      assert.equal(hook.status, 202);

      const job = await waitForJobCompletion(base, transcribe.json.data.job_id as string, userToken);
      assert.equal(job.json.data.status, "completed");
      assert.ok(job.json.data.draft_note_id);

      const note = await req(base, `/clinical-notes/${job.json.data.draft_note_id}`, "GET", undefined, userToken);
      assert.equal(note.status, 200);
      assert.match(note.json.data.content, /S \(Subjetivo\):/);
      assert.match(note.json.data.content, /P \(Plano\):/);
    } finally {
      shutdown(server);
    }
  });

  await t.test("paginacao valida parametros e normaliza limites", async () => {
    const { server, base, userToken } = await bootstrap();
    try {
      const negativePage = await req(base, "/sessions?page=-1", "GET", undefined, userToken);
      assert.equal(negativePage.status, 200);
      assert.equal(negativePage.json.data.page, 1);

      const invalidPage = await req(base, "/sessions?page=abc", "GET", undefined, userToken);
      assert.equal(invalidPage.status, 422);
      assert.equal(invalidPage.json.error.code, "VALIDATION_ERROR");

      const zeroPageSize = await req(base, "/sessions?page_size=0", "GET", undefined, userToken);
      assert.equal(zeroPageSize.status, 200);
      assert.equal(zeroPageSize.json.data.page_size, 20);

      const hugePageSize = await req(base, "/sessions?page_size=100000", "GET", undefined, userToken);
      assert.equal(hugePageSize.status, 200);
      assert.equal(hugePageSize.json.data.page_size, 20);
    } finally {
      shutdown(server);
    }
  });

  await t.test("patient portal expoe apenas sessoes, documentos e notificacoes proprios", async () => {
    const { server, base, userToken } = await bootstrap();
    try {
      const access = await req(base, "/patients/access", "POST", {
        patient_id: "portal-patient",
        patient_email: "portal-patient@ethos.local",
        patient_name: "Portal Patient",
        patient_password: "patient123",
      }, userToken);
      assert.equal(access.status, 201);

      const session = await req(base, "/sessions", "POST", {
        patient_id: "portal-patient",
        scheduled_at: new Date().toISOString(),
      }, userToken);
      assert.equal(session.status, 201);

      const document = await req(base, "/documents", "POST", {
        patient_id: "portal-patient",
        case_id: "portal-case",
        template_id: "session-summary",
        title: "Orientacoes da sessao",
      }, userToken);
      assert.equal(document.status, 201);

      const patientLogin = await req(base, "/auth/login", "POST", {
        email: "portal-patient@ethos.local",
        password: "patient123",
      });
      assert.equal(patientLogin.status, 200);
      const patientToken = patientLogin.json.data.token as string;

      const patientSessions = await req(base, "/patient/sessions", "GET", undefined, patientToken);
      assert.equal(patientSessions.status, 200);
      assert.equal(patientSessions.json.data.total, 1);

      const patientDocuments = await req(base, "/patient/documents", "GET", undefined, patientToken);
      assert.equal(patientDocuments.status, 200);
      assert.equal(patientDocuments.json.data.total, 1);

      const patientDocumentDetail = await req(base, `/patient/documents/${document.json.data.id}`, "GET", undefined, patientToken);
      assert.equal(patientDocumentDetail.status, 200);
      assert.equal(patientDocumentDetail.json.data.document.id, document.json.data.id);

      const notifications = await req(base, "/notifications", "GET", undefined, patientToken);
      assert.equal(notifications.status, 200);
      assert.ok(Array.isArray(notifications.json.data));
      assert.ok(notifications.json.data.length >= 1);

      const blockedPatients = await req(base, "/patients", "GET", undefined, patientToken);
      assert.equal(blockedPatients.status, 403);
    } finally {
      shutdown(server);
    }
  });

  await t.test("emotional diary respeita isolamento entre paciente e psicologo", async () => {
    const { server, base, userToken } = await bootstrap();
    try {
      const firstAccess = await req(base, "/patients/access", "POST", {
        patient_id: "diary-patient-a",
        patient_email: "diary-a@ethos.local",
        patient_name: "Diary A",
        patient_password: "patient123",
      }, userToken);
      assert.equal(firstAccess.status, 201);

      const secondAccess = await req(base, "/patients/access", "POST", {
        patient_id: "diary-patient-b",
        patient_email: "diary-b@ethos.local",
        patient_name: "Diary B",
        patient_password: "patient123",
      }, userToken);
      assert.equal(secondAccess.status, 201);

      const patientALogin = await req(base, "/auth/login", "POST", {
        email: "diary-a@ethos.local",
        password: "patient123",
      });
      assert.equal(patientALogin.status, 200);
      const patientAToken = patientALogin.json.data.token as string;

      const createdEntry = await req(base, "/patient/diary", "POST", {
        mood: 4,
        intensity: 7,
        description: "Mais leve hoje",
        thoughts: "Consegui descansar melhor.",
        tags: ["sono", "rotina"],
      }, patientAToken);
      assert.equal(createdEntry.status, 201);
      assert.equal(createdEntry.json.data.mood, 4);

      const patientAEntries = await req(base, "/patient/diary", "GET", undefined, patientAToken);
      assert.equal(patientAEntries.status, 200);
      assert.equal(patientAEntries.json.data.total, 1);

      const psychologistEntries = await req(base, "/psychologist/patient/diary-patient-a/diary", "GET", undefined, userToken);
      assert.equal(psychologistEntries.status, 200);
      assert.equal(psychologistEntries.json.data.total, 1);
      assert.equal(psychologistEntries.json.data.items[0].description, "Mais leve hoje");

      const patientBLogin = await req(base, "/auth/login", "POST", {
        email: "diary-b@ethos.local",
        password: "patient123",
      });
      assert.equal(patientBLogin.status, 200);
      const patientBToken = patientBLogin.json.data.token as string;

      const patientBEntries = await req(base, "/patient/diary", "GET", undefined, patientBToken);
      assert.equal(patientBEntries.status, 200);
      assert.equal(patientBEntries.json.data.total, 0);

      const blockedPsychologistRoute = await req(base, "/psychologist/patient/diary-patient-a/diary", "GET", undefined, patientAToken);
      assert.equal(blockedPsychologistRoute.status, 403);
    } finally {
      shutdown(server);
    }
  });
});
