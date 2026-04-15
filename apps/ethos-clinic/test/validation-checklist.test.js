"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_events_1 = require("node:events");
const node_test_1 = __importDefault(require("node:test"));
const server_1 = require("../src/server");
const database_1 = require("../src/infra/database");
const req = async (base, path, method = "GET", body, token, idem) => {
    const response = await fetch(`${base}${path}`, {
        method,
        headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...(idem ? { "Idempotency-Key": idem } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json();
    return { status: response.status, json };
};
const setup = async () => {
    (0, database_1.resetDatabaseForTests)();
    const server = (0, server_1.createEthosBackend)();
    server.listen(0);
    await (0, node_events_1.once)(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const adminLogin = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
    const adminToken = adminLogin.json.data.token;
    const inviteA = await req(base, "/auth/invite", "POST", { email: "user-a@ethos.local" }, adminToken);
    await req(base, "/auth/accept-invite", "POST", { token: inviteA.json.data.invite_token, name: "User A", password: "secretA123" });
    const userALogin = await req(base, "/auth/login", "POST", { email: "user-a@ethos.local", password: "secretA123" });
    const inviteB = await req(base, "/auth/invite", "POST", { email: "user-b@ethos.local" }, adminToken);
    await req(base, "/auth/accept-invite", "POST", { token: inviteB.json.data.invite_token, name: "User B", password: "secretB123" });
    const userBLogin = await req(base, "/auth/login", "POST", { email: "user-b@ethos.local", password: "secretB123" });
    await req(base, "/local/entitlements/sync", "POST", { snapshot: { entitlements: { transcription_minutes_per_month: 3000, max_sessions_per_month: 2000, exports_enabled: true, backup_enabled: true, forms_enabled: true, scales_enabled: true, finance_enabled: true, max_patients: 2000 }, source_subscription_status: "active", last_successful_subscription_validation_at: new Date().toISOString() } }, userALogin.json.data.token);
    await req(base, "/local/entitlements/sync", "POST", { snapshot: { entitlements: { transcription_minutes_per_month: 3000, max_sessions_per_month: 2000, exports_enabled: true, backup_enabled: true, forms_enabled: true, scales_enabled: true, finance_enabled: true, max_patients: 2000 }, source_subscription_status: "active", last_successful_subscription_validation_at: new Date().toISOString() } }, userBLogin.json.data.token);
    await req(base, "/local/entitlements/sync", "POST", { snapshot: { features: { transcription: true, export: true, backup: true }, limits: { sessions_per_month: 100 }, source_subscription_status: "active" } }, userALogin.json.data.token);
    await req(base, "/local/entitlements/sync", "POST", { snapshot: { features: { transcription: true, export: true, backup: true }, limits: { sessions_per_month: 100 }, source_subscription_status: "active" } }, userBLogin.json.data.token);
    return {
        server,
        base,
        adminToken,
        userAToken: userALogin.json.data.token,
        userBToken: userBLogin.json.data.token,
    };
};
const waitForJobDraft = async (base, jobId, token) => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        const job = await req(base, `/jobs/${jobId}`, "GET", undefined, token);
        if (job.json.data.status === "completed" && job.json.data.draft_note_id) {
            return job;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return req(base, `/jobs/${jobId}`, "GET", undefined, token);
};
(0, node_test_1.default)("checklist: convite + login", async () => {
    const { server, userAToken } = await setup();
    strict_1.default.ok(userAToken.length > 10);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: isolamento total entre usuários (inclusive por ID)", async () => {
    const { server, base, userAToken, userBToken } = await setup();
    const session = await req(base, "/sessions", "POST", { patient_id: "p-a", scheduled_at: new Date().toISOString() }, userAToken);
    const sid = session.json.data.id;
    const byIdForbidden = await req(base, `/sessions/${sid}`, "GET", undefined, userBToken);
    strict_1.default.equal(byIdForbidden.status, 404);
    const note = await req(base, `/sessions/${sid}/clinical-note`, "POST", { content: "conteúdo clínico privado" }, userAToken);
    const nid = note.json.data.id;
    const noteValidateByOther = await req(base, `/clinical-notes/${nid}/validate`, "POST", {}, userBToken);
    strict_1.default.equal(noteValidateByOther.status, 404);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: idempotência em /sessions é isolada por usuário", async () => {
    const { server, base, userAToken, userBToken } = await setup();
    const idem = "shared-idem";
    const scheduledAt = new Date().toISOString();
    const a1 = await req(base, "/sessions", "POST", { patient_id: "p-isolation", scheduled_at: scheduledAt }, userAToken, idem);
    const a2 = await req(base, "/sessions", "POST", { patient_id: "p-isolation", scheduled_at: scheduledAt }, userAToken, idem);
    strict_1.default.equal(a1.status, 201);
    strict_1.default.equal(a2.status, 201);
    strict_1.default.equal(a1.json.data.id, a2.json.data.id);
    const b1 = await req(base, "/sessions", "POST", { patient_id: "p-isolation", scheduled_at: scheduledAt }, userBToken, idem);
    strict_1.default.equal(b1.status, 201);
    strict_1.default.notEqual(b1.json.data.id, a1.json.data.id);
    const aDifferentBody = await req(base, "/sessions", "POST", { patient_id: "p-isolation-2", scheduled_at: scheduledAt }, userAToken, idem);
    strict_1.default.equal(aDifferentBody.status, 201);
    strict_1.default.notEqual(aDifferentBody.json.data.id, a1.json.data.id);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: idempotência em /sessions expira após TTL", async () => {
    const { server, base, userAToken } = await setup();
    const idem = "ttl-idem";
    const payload = { patient_id: "p-ttl", scheduled_at: new Date().toISOString() };
    const first = await req(base, "/sessions", "POST", payload, userAToken, idem);
    strict_1.default.equal(first.status, 201);
    const key = Array.from(database_1.db.idempotency.keys()).find((candidate) => candidate.includes(`:${idem}:`));
    strict_1.default.ok(key);
    database_1.db.idempotency.get(key).expiresAt = Date.now() - 1;
    const second = await req(base, "/sessions", "POST", payload, userAToken, idem);
    strict_1.default.equal(second.status, 201);
    strict_1.default.notEqual(first.json.data.id, second.json.data.id);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: admin só vê contagens e nunca conteúdo clínico", async () => {
    const { server, base, adminToken, userAToken } = await setup();
    await req(base, "/sessions", "POST", { patient_id: "p-admin-check", scheduled_at: new Date().toISOString() }, userAToken);
    const adminClinical = await req(base, "/sessions", "GET", undefined, adminToken);
    strict_1.default.equal(adminClinical.status, 403);
    const metrics = await req(base, "/admin/metrics/overview", "GET", undefined, adminToken);
    strict_1.default.equal(metrics.status, 200);
    strict_1.default.ok(typeof metrics.json.data.users_total === "number");
    strict_1.default.ok(!("sessions" in metrics.json.data));
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: fluxo completo sessão→áudio→transcrição→rascunho→validar→relatório→export", async () => {
    const { server, base, userAToken } = await setup();
    const session = await req(base, "/sessions", "POST", { patient_id: "patient-flow", scheduled_at: new Date().toISOString() }, userAToken, "flow-idem");
    strict_1.default.equal(session.status, 201);
    const sid = session.json.data.id;
    strict_1.default.equal((await req(base, `/sessions/${sid}/audio`, "POST", { file_path: "vault://audio.enc", consent_confirmed: true }, userAToken)).status, 201);
    const tjob = await req(base, `/sessions/${sid}/transcribe`, "POST", { raw_text: "texto clínico de teste" }, userAToken);
    strict_1.default.equal(tjob.status, 202);
    const tjobId = tjob.json.data.job_id;
    strict_1.default.equal((await req(base, `/jobs/${tjobId}`, "GET", undefined, userAToken)).status, 200);
    const note = await req(base, `/sessions/${sid}/clinical-note`, "POST", { content: "rascunho clínico" }, userAToken);
    strict_1.default.equal(note.status, 201);
    strict_1.default.equal((await req(base, `/clinical-notes/${note.json.data.id}/validate`, "POST", {}, userAToken)).status, 200);
    strict_1.default.equal((await req(base, "/reports", "POST", { patient_id: "patient-flow", purpose: "profissional", content: "relatório final" }, userAToken)).status, 201);
    const exportJob = await req(base, "/export/pdf", "POST", {}, userAToken);
    strict_1.default.equal(exportJob.status, 202);
    strict_1.default.equal((await req(base, `/jobs/${exportJob.json.data.job_id}`, "GET", undefined, userAToken)).status, 200);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: relatório exige nota validada do mesmo paciente (não aceita outro paciente)", async () => {
    const { server, base, userAToken } = await setup();
    const sessionA = await req(base, "/sessions", "POST", { patient_id: "patient-a", scheduled_at: new Date().toISOString() }, userAToken);
    const noteA = await req(base, `/sessions/${sessionA.json.data.id}/clinical-note`, "POST", { content: "nota paciente A" }, userAToken);
    await req(base, `/clinical-notes/${noteA.json.data.id}/validate`, "POST", {}, userAToken);
    const blocked = await req(base, "/reports", "POST", { patient_id: "patient-b", purpose: "profissional", content: "relatório" }, userAToken);
    strict_1.default.equal(blocked.status, 422);
    strict_1.default.equal(blocked.json.error.message, "A validated note for the patient is required before creating reports");
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: relatório aceita nota validada vinculada diretamente ao patient_id", async () => {
    const { server, base, userAToken } = await setup();
    const directNote = await req(base, "/sessions/patient-direct/clinical-note", "POST", { content: "nota direta" }, userAToken);
    await req(base, `/clinical-notes/${directNote.json.data.id}/validate`, "POST", {}, userAToken);
    const report = await req(base, "/reports", "POST", { patient_id: "patient-direct", purpose: "profissional", content: "relatório direto" }, userAToken);
    strict_1.default.equal(report.status, 201);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: kill de worker não corrompe estado (simulação de falha de job)", async () => {
    const { server, base, userAToken } = await setup();
    const session = await req(base, "/sessions", "POST", { patient_id: "patient-worker", scheduled_at: new Date().toISOString() }, userAToken);
    const sid = session.json.data.id;
    const tjob = await req(base, `/sessions/${sid}/transcribe`, "POST", { raw_text: "texto" }, userAToken);
    const failed = await req(base, "/api/webhook", "POST", { job_id: tjob.json.data.job_id, status: "failed", error_code: "WORKER_KILLED" }, userAToken);
    strict_1.default.equal(failed.status, 202);
    const job = await req(base, `/jobs/${tjob.json.data.job_id}`, "GET", undefined, userAToken);
    strict_1.default.equal(job.status, 200);
    strict_1.default.equal(job.json.data.status, "failed");
    strict_1.default.equal(job.json.data.error_code, "WORKER_KILLED");
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: backup + restore funcionam", async () => {
    const { server, base, userAToken } = await setup();
    const backup = await req(base, "/backup", "POST", {}, userAToken);
    strict_1.default.equal(backup.status, 202);
    const restore = await req(base, "/restore", "POST", {}, userAToken);
    strict_1.default.equal(restore.status, 202);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: purge apaga tudo do usuário", async () => {
    const { server, base, userAToken } = await setup();
    await req(base, "/sessions", "POST", { patient_id: "patient-purge", scheduled_at: new Date().toISOString() }, userAToken);
    const before = await req(base, "/sessions", "GET", undefined, userAToken);
    strict_1.default.ok(before.json.data.total >= 1);
    strict_1.default.equal((await req(base, "/purge", "POST", {}, userAToken)).status, 202);
    const afterWithPurgedToken = await req(base, "/sessions", "GET", undefined, userAToken);
    strict_1.default.equal(afterWithPurgedToken.status, 401);
    const relogin = await req(base, "/auth/login", "POST", { email: "user-a@ethos.local", password: "secretA123" });
    strict_1.default.equal(relogin.status, 200);
    const after = await req(base, "/sessions", "GET", undefined, relogin.json.data.token);
    strict_1.default.equal(after.json.data.total, 0);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: purge remove todos os vínculos do usuário (incluindo estruturas derivadas)", async () => {
    const { server, base, userAToken, userBToken } = await setup();
    const ownerId = database_1.db.sessionsTokens.get(userAToken)?.user_id;
    const otherOwnerId = database_1.db.sessionsTokens.get(userBToken)?.user_id;
    strict_1.default.ok(ownerId);
    strict_1.default.ok(otherOwnerId);
    const session = await req(base, "/sessions", "POST", { patient_id: "patient-purge-scope", scheduled_at: new Date().toISOString() }, userAToken);
    const sid = session.json.data.id;
    await req(base, `/sessions/${sid}/audio`, "POST", { file_path: "vault://audio.enc", consent_confirmed: true }, userAToken);
    const note = await req(base, `/sessions/${sid}/clinical-note`, "POST", { content: "conteúdo purgável" }, userAToken);
    await req(base, `/clinical-notes/${note.json.data.id}/validate`, "POST", {}, userAToken);
    await req(base, "/reports", "POST", { patient_id: "patient-purge-scope", purpose: "profissional", content: "relatório" }, userAToken);
    await req(base, "/anamnesis", "POST", { patient_id: "patient-purge-scope", template_id: "tpl-1", content: { q1: "ok" } }, userAToken);
    await req(base, "/scales/record", "POST", { scale_id: "phq9", patient_id: "patient-purge-scope", score: 9 }, userAToken);
    await req(base, "/forms/entry", "POST", { form_id: "f1", patient_id: "patient-purge-scope", content: { a: 1 } }, userAToken);
    await req(base, "/financial/entry", "POST", { patient_id: "patient-purge-scope", type: "receivable", amount: 150, due_date: new Date().toISOString() }, userAToken);
    await req(base, "/export/pdf", "POST", {}, userAToken);
    database_1.db.audit.set((0, database_1.uid)(), { id: (0, database_1.uid)(), actor_user_id: ownerId, target_user_id: otherOwnerId, event: "MANUAL_OWNER_A", ts: new Date().toISOString() });
    database_1.db.audit.set((0, database_1.uid)(), { id: (0, database_1.uid)(), actor_user_id: otherOwnerId, target_user_id: ownerId, event: "MANUAL_TARGET_A", ts: new Date().toISOString() });
    database_1.db.telemetry.set((0, database_1.uid)(), { id: (0, database_1.uid)(), user_id: ownerId, event_type: "MANUAL_OWNER_A", ts: new Date().toISOString() });
    database_1.db.telemetryQueue.set("mixed", [
        { id: (0, database_1.uid)(), user_id: ownerId, event_type: "QUEUE_OWNER_A", ts: new Date().toISOString() },
        { id: (0, database_1.uid)(), user_id: otherOwnerId, event_type: "QUEUE_OWNER_B", ts: new Date().toISOString() },
    ]);
    strict_1.default.equal((await req(base, "/purge", "POST", {}, userAToken)).status, 202);
    const ownedCollections = [
        database_1.db.patients,
        database_1.db.sessions,
        database_1.db.audioRecords,
        database_1.db.transcripts,
        database_1.db.clinicalNotes,
        database_1.db.reports,
        database_1.db.anamnesis,
        database_1.db.scales,
        database_1.db.forms,
        database_1.db.financial,
        database_1.db.jobs,
    ];
    for (const map of ownedCollections) {
        strict_1.default.equal(Array.from(map.values()).some((entry) => entry.owner_user_id === ownerId), false);
    }
    strict_1.default.equal(Array.from(database_1.db.telemetry.values()).some((entry) => entry.user_id === ownerId), false);
    strict_1.default.equal(Array.from(database_1.db.audit.values()).some((entry) => entry.actor_user_id === ownerId || entry.target_user_id === ownerId), false);
    strict_1.default.equal(Array.from(database_1.db.sessionsTokens.values()).some((entry) => entry.user_id === ownerId), false);
    strict_1.default.equal(database_1.db.localEntitlements.has(ownerId), false);
    const telemetryQueue = database_1.db.telemetryQueue.get("mixed") ?? [];
    strict_1.default.equal(telemetryQueue.some((entry) => entry.user_id === ownerId), false);
    strict_1.default.equal(telemetryQueue.some((entry) => entry.user_id === otherOwnerId), true);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: OpenAPI cobre rotas reais principais", async () => {
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
        strict_1.default.match(text, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: logs não expõem texto clínico (telemetria sanitizada)", async () => {
    const { server, base, userAToken } = await setup();
    const sensitive = "PACIENTE JOAO CPF 12345678900";
    const writes = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk, ...args) => {
        writes.push(String(chunk));
        return originalWrite(chunk, ...args);
    });
    try {
        const session = await req(base, "/sessions", "POST", { patient_id: "p-log", scheduled_at: new Date().toISOString() }, userAToken);
        await req(base, `/sessions/${session.json.data.id}/clinical-note`, "POST", { content: sensitive }, userAToken);
    }
    finally {
        process.stdout.write = originalWrite;
    }
    const combined = writes.join("\n");
    strict_1.default.equal(combined.includes(sensitive), false);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("checklist: transcription generates structured draft note", async () => {
    const { server, base, userAToken } = await setup();
    try {
        const session = await req(base, "/sessions", "POST", { patient_id: "patient-draft", scheduled_at: new Date().toISOString() }, userAToken);
        strict_1.default.equal(session.status, 201);
        const transcribe = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "Paciente relata sobrecarga no trabalho, dificuldade para descansar e preocupacao com conflitos familiares recentes." }, userAToken);
        strict_1.default.equal(transcribe.status, 202);
        const completedJob = await waitForJobDraft(base, transcribe.json.data.job_id, userAToken);
        strict_1.default.equal(completedJob.json.data.status, "completed");
        strict_1.default.ok(completedJob.json.data.draft_note_id);
        const note = await req(base, `/clinical-notes/${completedJob.json.data.draft_note_id}`, "GET", undefined, userAToken);
        strict_1.default.equal(note.status, 200);
        strict_1.default.match(note.json.data.content, /## 1\. IDENTIFICA/i);
        strict_1.default.match(note.json.data.content, /## 8\. EVOLU/i);
        strict_1.default.match(note.json.data.content, /S \(Subjetivo\):/);
        strict_1.default.match(note.json.data.content, /O \(Objetivo\):/);
        strict_1.default.match(note.json.data.content, /A \(An.lise\):/);
        strict_1.default.match(note.json.data.content, /P \(Plano\):/);
        strict_1.default.match(note.json.data.content, /## OBSERVA/i);
        strict_1.default.equal(typeof note.json.data.structuredData?.soap?.subjective, "string");
        strict_1.default.equal(typeof note.json.data.structuredData?.soap?.objective, "string");
    }
    finally {
        server.closeAllConnections();
        server.close();
    }
});
