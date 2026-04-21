import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createEthosBackend } from "./apps/ethos-clinic/src/server";
import { resetDatabaseForTests } from "./apps/ethos-clinic/src/infra/database";

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
  return { server, base, userToken };
};

test("sessions: criar sessão com location_type remote", async () => {
  const { server, base, userToken } = await setup();
  try {
    const res = await req(base, "/sessions", "POST", {
      patient_id: "pt-loc-1",
      scheduled_at: "2026-05-06T09:00:00.000Z",
      duration_minutes: 50,
      location_type: "remote"
    }, userToken);
    assert.equal(res.status, 201);
    assert.equal(res.json.data.location_type, "remote");
  } finally {
    server.close();
  }
});

test("sessions: criar sessão com location_type presencial", async () => {
  const { server, base, userToken } = await setup();
  try {
    const res = await req(base, "/sessions", "POST", {
      patient_id: "pt-loc-2",
      scheduled_at: "2026-05-06T10:00:00.000Z",
      duration_minutes: 50,
      location_type: "presencial"
    }, userToken);
    assert.equal(res.status, 201);
    assert.equal(res.json.data.location_type, "presencial");
  } finally {
    server.close();
  }
});

test("sessions: atualizar location_type", async () => {
  const { server, base, userToken } = await setup();
  try {
    const create = await req(base, "/sessions", "POST", {
      patient_id: "pt-loc-3",
      scheduled_at: "2026-05-06T11:00:00.000Z",
      duration_minutes: 50,
      location_type: "remote"
    }, userToken);
    const sessionId = create.json.data.id;

    const update = await req(base, `/sessions/${sessionId}`, "PATCH", {
      location_type: "presencial"
    }, userToken);
    assert.equal(update.status, 200);
    assert.equal(update.json.data.location_type, "presencial");
  } finally {
    server.close();
  }
});
