import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createEthosBackend } from "../src/server";

const post = async (base: string, path: string, body: unknown, method = "POST") => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() as any };
};

test("clinical note sempre nasce draft e só valida por endpoint", async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  const session = await post(base, "/sessions", { patient_id: "p1", scheduled_at: new Date().toISOString() });
  const note = await post(base, `/sessions/${session.json.id}/clinical-note`, { content: "texto clínico" });
  assert.equal(note.status, 201);
  assert.equal(note.json.status, "draft");

  const validated = await post(base, `/clinical-notes/${note.json.id}/validate`, {});
  assert.equal(validated.status, 200);
  assert.equal(validated.json.status, "validated");

  server.close();
});

test("relatório exige prontuário validado", async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  const session = await post(base, "/sessions", { patient_id: "patient-x", scheduled_at: new Date().toISOString() });
  const forbidden = await post(base, "/reports", { patient_id: "patient-x", purpose: "profissional", content: "r" });
  assert.equal(forbidden.status, 422);

  const note = await post(base, `/sessions/${session.json.id}/clinical-note`, { content: "nota" });
  await post(base, `/clinical-notes/${note.json.id}/validate`, {});
  const allowed = await post(base, "/reports", { patient_id: "patient-x", purpose: "profissional", content: "r" });
  assert.equal(allowed.status, 201);

  server.close();
});

test("audio exige consentimento explícito", async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  const session = await post(base, "/sessions", { patient_id: "p2", scheduled_at: new Date().toISOString() });
  const denied = await post(base, `/sessions/${session.json.id}/audio`, { file_path: "vault://a.enc", consent_confirmed: false });
  assert.equal(denied.status, 422);

  const ok = await post(base, `/sessions/${session.json.id}/audio`, { file_path: "vault://a.enc", consent_confirmed: true });
  assert.equal(ok.status, 201);

  server.close();
});

test("estabilidade em carga leve concorrente", async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  const calls = Array.from({ length: 25 }, (_, i) =>
    post(base, "/sessions", { patient_id: `p-${i}`, scheduled_at: new Date().toISOString() }),
  );
  const results = await Promise.all(calls);
  assert.equal(results.filter((r) => r.status === 201).length, 25);

  server.close();
});
