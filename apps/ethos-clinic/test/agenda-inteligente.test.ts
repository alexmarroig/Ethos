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
      entitlements: { max_sessions_per_month: 500, max_patients: 100 },
      source_subscription_status: "active",
      last_successful_subscription_validation_at: new Date().toISOString(),
    },
  }, userToken);
  return { server, base, userToken };
};

test("agenda: criar sessão recorrente semanal salva recurrence e series_id", async () => {
  const { server, base, userToken } = await setup();
  try {
    const res = await req(base, "/sessions", "POST", {
      patient_id: "pt-recurrence-1",
      scheduled_at: "2026-05-06T09:00:00.000Z",
      duration_minutes: 50,
      recurrence: { type: "weekly", days: ["tuesday"], time: "09:00", duration_minutes: 50 },
    }, userToken);
    assert.equal(res.status, 201);
    const session = res.json.data;
    assert.ok(session.recurrence, "deve ter recurrence");
    assert.equal(session.recurrence.type, "weekly");
    assert.ok(session.series_id, "deve ter series_id");
    assert.equal(session.is_series_anchor, true);
    assert.equal(session.event_type, "session");
  } finally { server.close(); }
});

test("agenda: concluir sessão recorrente gera próxima automaticamente", async () => {
  const { server, base, userToken } = await setup();
  try {
    const create = await req(base, "/sessions", "POST", {
      patient_id: "pt-rolling-1",
      scheduled_at: "2026-05-06T09:00:00.000Z",
      duration_minutes: 50,
      recurrence: { type: "weekly", days: ["tuesday"], time: "09:00", duration_minutes: 50 },
    }, userToken);
    assert.equal(create.status, 201);
    const sessionId = create.json.data.id as string;
    const seriesId = create.json.data.series_id as string;

    await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);

    const list = await req(base, "/sessions?page=1&page_size=50", "GET", undefined, userToken);
    const sessions = list.json.data.items as any[];
    const next = sessions.find((s: any) => s.series_id === seriesId && s.id !== sessionId);
    assert.ok(next, "próxima sessão deve existir");
    assert.equal(next.status, "scheduled");
    const origDate = new Date("2026-05-06T09:00:00.000Z");
    const nextDate = new Date(next.scheduled_at);
    const diffDays = Math.round((nextDate.getTime() - origDate.getTime()) / (24 * 60 * 60 * 1000));
    assert.equal(diffDays, 7, "deve ser exatamente 7 dias depois");
  } finally { server.close(); }
});

test("agenda: concluir sessão recorrente não gera duplicata se próxima já existe", async () => {
  const { server, base, userToken } = await setup();
  try {
    const create = await req(base, "/sessions", "POST", {
      patient_id: "pt-nodup-1",
      scheduled_at: "2026-05-06T09:00:00.000Z",
      duration_minutes: 50,
      recurrence: { type: "weekly", days: ["tuesday"], time: "09:00", duration_minutes: 50 },
    }, userToken);
    const sessionId = create.json.data.id as string;
    const seriesId = create.json.data.series_id as string;

    await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);
    await req(base, `/sessions/${sessionId}/status`, "PATCH", { status: "completed" }, userToken);

    const list = await req(base, "/sessions?page=1&page_size=50", "GET", undefined, userToken);
    const sessions = (list.json.data.items as any[]).filter((s: any) => s.series_id === seriesId && s.id !== sessionId);
    assert.equal(sessions.length, 1, "deve ter apenas uma próxima sessão");
  } finally { server.close(); }
});

test("agenda: criar bloqueio salva event_type=block e block_title", async () => {
  const { server, base, userToken } = await setup();
  try {
    const res = await req(base, "/sessions", "POST", {
      patient_id: "block-patient",
      scheduled_at: "2026-05-06T12:00:00.000Z",
      duration_minutes: 60,
      event_type: "block",
      block_title: "Almoço",
    }, userToken);
    assert.equal(res.status, 201);
    assert.equal(res.json.data.event_type, "block");
    assert.equal(res.json.data.block_title, "Almoço");
  } finally { server.close(); }
});

test("agenda: GET /sessions/suggestions retorna sugestões de série configurada", async () => {
  const { server, base, userToken } = await setup();
  try {
    const create = await req(base, "/sessions", "POST", {
      patient_id: "pt-suggest-1",
      scheduled_at: "2026-04-29T09:00:00.000Z",
      duration_minutes: 50,
      recurrence: { type: "weekly", days: ["tuesday"], time: "09:00", duration_minutes: 50 },
    }, userToken);
    assert.equal(create.status, 201);

    const suggestions = await req(base, "/sessions/suggestions?week_start=2026-05-04", "GET", undefined, userToken);
    assert.equal(suggestions.status, 200);
    const list = suggestions.json.data as any[];
    assert.ok(list.length > 0, "deve ter pelo menos uma sugestão");
    const s = list[0];
    assert.equal(s.source, "rule");
    assert.ok(s.suggested_at, "deve ter suggested_at");
  } finally { server.close(); }
});
