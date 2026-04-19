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
const req = async (base, path, method = "GET", body, token) => {
    const res = await fetch(`${base}${path}`, {
        method,
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json() };
};
const bootstrap = async () => {
    (0, database_1.resetDatabaseForTests)();
    const server = (0, server_1.createEthosBackend)();
    server.listen(0);
    await (0, node_events_1.once)(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const email = `gate+${(0, database_1.uid)()}@ethos.local`;
    const admin = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
    const invite = await req(base, "/auth/invite", "POST", { email }, admin.json.data.token);
    await req(base, "/auth/accept-invite", "POST", { token: invite.json.data.invite_token, name: "Gate", password: "secret123" });
    const login = await req(base, "/auth/login", "POST", { email, password: "secret123" });
    return {
        server,
        base,
        token: login.json.data.token,
        userId: login.json.data.user.id,
    };
};
const waitForJobStatus = async (base, jobId, token) => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        const job = await req(base, `/jobs/${jobId}`, "GET", undefined, token);
        if (job.json.data.status === "completed") {
            return job;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return req(base, `/jobs/${jobId}`, "GET", undefined, token);
};
(0, node_test_1.default)("entitlement gating and offline grace", async () => {
    const { server, base, token } = await bootstrap();
    const session = await req(base, "/sessions", "POST", { patient_id: "p1", scheduled_at: new Date().toISOString() }, token);
    strict_1.default.equal(session.status, 201);
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
    strict_1.default.equal(allowedFirst.status, 202);
    const firstJob = await waitForJobStatus(base, allowedFirst.json.data.job_id, token);
    strict_1.default.equal(firstJob.json.data.status, "completed");
    const blockedSecond = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "x" }, token);
    strict_1.default.equal(blockedSecond.status, 402);
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
    strict_1.default.equal((await req(base, "/sessions", "POST", { patient_id: "p2", scheduled_at: new Date().toISOString() }, token)).status, 201);
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
    strict_1.default.equal((await req(base, "/sessions", "POST", { patient_id: "p3", scheduled_at: new Date().toISOString() }, token)).status, 402);
    strict_1.default.equal((await req(base, "/export/pdf", "POST", {}, token)).status, 202);
    strict_1.default.equal((await req(base, "/backup", "POST", {}, token)).status, 202);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("entitlement gating ignores events and sessions from same month in previous year", async () => {
    const { server, base, token, userId } = await bootstrap();
    const now = new Date();
    const previousYearSameMonth = new Date(now.getFullYear() - 1, now.getMonth(), 15).toISOString();
    database_1.db.sessions.set((0, database_1.uid)(), {
        id: (0, database_1.uid)(),
        owner_user_id: userId,
        patient_id: "legacy-patient",
        scheduled_at: previousYearSameMonth,
        status: "scheduled",
        created_at: previousYearSameMonth,
    });
    database_1.db.telemetry.set((0, database_1.uid)(), {
        id: (0, database_1.uid)(),
        user_id: userId,
        event_type: "TRANSCRIPTION_JOB_COMPLETED",
        duration_ms: 60000,
        ts: previousYearSameMonth,
    });
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
    const session = await req(base, "/sessions", "POST", { patient_id: "new-year-patient", scheduled_at: new Date().toISOString() }, token);
    strict_1.default.equal(session.status, 201);
    const transcribe = await req(base, `/sessions/${session.json.data.id}/transcribe`, "POST", { raw_text: "x" }, token);
    strict_1.default.equal(transcribe.status, 202);
    server.closeAllConnections();
    server.close();
});
(0, node_test_1.default)("missing GET endpoints are available", async () => {
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
    strict_1.default.equal((await req(base, `/sessions/${session.json.data.id}/clinical-notes`, "GET", undefined, token)).status, 200);
    strict_1.default.equal((await req(base, `/clinical-notes/${note.json.data.id}`, "GET", undefined, token)).status, 200);
    strict_1.default.equal((await req(base, "/scales", "GET", undefined, token)).status, 200);
    strict_1.default.equal((await req(base, "/patients", "GET", undefined, token)).status, 200);
    server.closeAllConnections();
    server.close();
});
