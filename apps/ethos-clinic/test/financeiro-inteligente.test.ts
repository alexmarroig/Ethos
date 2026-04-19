import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createEthosBackend } from "../src/server";
import { resetDatabaseForTests } from "../src/infra/database";

const req = async (base: string, path: string, method = "GET", body?: unknown, token?: string) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json() as any;
  return { status: response.status, json };
};

const setup = async () => {
  resetDatabaseForTests();
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const login = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
  const userToken = login.json.data.token as string;

  await req(base, "/local/entitlements/sync", "POST", {
    snapshot: {
      entitlements: { finance_enabled: true, max_patients: 100, max_sessions_per_month: 500 },
      source_subscription_status: "active",
      last_successful_subscription_validation_at: new Date().toISOString(),
    },
  }, userToken);

  return { server, base, userToken };
};

test("financeiro: auto-charge cria lançamento ao concluir sessão", async () => {
  const { server, base, userToken } = await setup();
  try {
    const patient = await req(base, "/patients", "POST", {
      name: "Paciente Auto",
      billing: {
        mode: "per_session",
        session_price: 200,
        payment_timing: "after",
        preferred_payment_day: 10,
        billing_auto_charge: true,
        billing_reminder_days: 2,
      },
    }, userToken);
    assert.equal(patient.status, 201);
    const patientId = patient.json.data.id as string;

    const session = await req(base, "/sessions", "POST", {
      patient_id: patientId,
      scheduled_at: new Date().toISOString(),
    }, userToken);
    assert.equal(session.status, 201);
    const sessionId = session.json.data.id as string;

    const complete = await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);
    assert.equal(complete.status, 200);
    assert.equal(complete.json.data.pending_billing, false, "auto-charge should set pending_billing=false");

    const entries = await req(base, "/financial/entries", "GET", undefined, userToken);
    assert.equal(entries.status, 200);
    const created = (entries.json.data.items as any[]).find((e: any) => e.session_id === sessionId);
    assert.ok(created, "lançamento deve existir");
    assert.equal(created.amount, 200);
    assert.equal(created.status, "open");
    assert.equal(created.type, "receivable");
  } finally {
    server.close();
  }
});

test("financeiro: sem auto-charge retorna pending_billing=true", async () => {
  const { server, base, userToken } = await setup();
  try {
    const patient = await req(base, "/patients", "POST", {
      name: "Paciente Manual",
      billing: {
        mode: "per_session",
        session_price: 150,
        payment_timing: "advance",
        billing_auto_charge: false,
      },
    }, userToken);
    assert.equal(patient.status, 201);
    const patientId = patient.json.data.id as string;

    const session = await req(base, "/sessions", "POST", {
      patient_id: patientId,
      scheduled_at: new Date().toISOString(),
    }, userToken);
    const sessionId = session.json.data.id as string;

    const complete = await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);
    assert.equal(complete.status, 200);
    assert.equal(complete.json.data.pending_billing, true, "manual should return pending_billing=true");
    assert.equal(complete.json.data.suggested_amount, 150);
    assert.ok(complete.json.data.suggested_due_date, "deve ter data sugerida");

    const entries = await req(base, "/financial/entries", "GET", undefined, userToken);
    const created = (entries.json.data.items as any[]).find((e: any) => e.session_id === sessionId);
    assert.equal(created, undefined, "não deve criar lançamento automático");
  } finally {
    server.close();
  }
});

test("financeiro: sem session_price retorna pending_billing=false sem criar lançamento", async () => {
  const { server, base, userToken } = await setup();
  try {
    const patient = await req(base, "/patients", "POST", { name: "Sem Preço" }, userToken);
    assert.equal(patient.status, 201);
    const patientId = patient.json.data.id as string;

    const session = await req(base, "/sessions", "POST", {
      patient_id: patientId,
      scheduled_at: new Date().toISOString(),
    }, userToken);
    const sessionId = session.json.data.id as string;

    const complete = await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);
    assert.equal(complete.status, 200);
    assert.equal(complete.json.data.pending_billing, false);

    const entries = await req(base, "/financial/entries", "GET", undefined, userToken);
    const created = (entries.json.data.items as any[]).find((e: any) => e.session_id === sessionId);
    assert.equal(created, undefined);
  } finally {
    server.close();
  }
});

test("financeiro: GET /financial/summary retorna contagens corretas", async () => {
  const { server, base, userToken } = await setup();
  try {
    const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];
    await req(base, "/financial/entry", "POST", {
      patient_id: "summary-test-patient",
      type: "receivable",
      amount: 300,
      due_date: yesterday,
      status: "open",
      description: "Sessão vencida",
    }, userToken);

    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    await req(base, "/financial/entry", "POST", {
      patient_id: "summary-test-patient",
      type: "receivable",
      amount: 200,
      due_date: soon,
      status: "open",
      description: "Sessão futura",
    }, userToken);

    const summary = await req(base, "/financial/summary", "GET", undefined, userToken);
    assert.equal(summary.status, 200);
    assert.equal(summary.json.data.overdue_count, 1);
    assert.equal(summary.json.data.overdue_total, 300);
    assert.equal(summary.json.data.due_soon_count, 1);
  } finally {
    server.close();
  }
});

test("financeiro: calculateDueDate advance usa dia da sessão", async () => {
  const { server, base, userToken } = await setup();
  try {
    const sessionDate = "2026-05-15T10:00:00.000Z";
    const patient = await req(base, "/patients", "POST", {
      name: "Billing Advance",
      billing: { mode: "per_session", session_price: 100, payment_timing: "advance", billing_auto_charge: true },
    }, userToken);
    const patientId = patient.json.data.id as string;

    const session = await req(base, "/sessions", "POST", { patient_id: patientId, scheduled_at: sessionDate }, userToken);
    const sessionId = session.json.data.id as string;

    await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);

    const entries = await req(base, "/financial/entries", "GET", undefined, userToken);
    const created = (entries.json.data.items as any[]).find((e: any) => e.session_id === sessionId);
    assert.ok(created, "lançamento deve existir");
    assert.equal(created.due_date, "2026-05-15");
  } finally {
    server.close();
  }
});
