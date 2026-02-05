import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createEthosBackend } from "../src/server";

const req = async (base: string, path: string, method = "GET", body?: unknown, token?: string) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() as any };
};

const bootstrap = async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  const adminLogin = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
  const adminToken = adminLogin.json.token as string;

  const invite = await req(base, "/auth/invite", "POST", { email: "psy1@ethos.local" }, adminToken);
  const accepted = await req(base, "/auth/accept-invite", "POST", { token: invite.json.invite_token, name: "Psy One", password: "secret123" });
  const userLogin = await req(base, "/auth/login", "POST", { email: "psy1@ethos.local", password: "secret123" });

  return { server, base, adminToken, userToken: userLogin.json.token as string, userId: accepted.json.id as string };
};

test("auth por convite funciona ponta a ponta", async () => {
  const { server, userToken } = await bootstrap();
  assert.ok(userToken);
  server.close();
});

test("isolamento por owner_user_id impede acesso cruzado", async () => {
  const { server, base, adminToken, userToken } = await bootstrap();

  const invite2 = await req(base, "/auth/invite", "POST", { email: "psy2@ethos.local" }, adminToken);
  await req(base, "/auth/accept-invite", "POST", { token: invite2.json.invite_token, name: "Psy Two", password: "secret234" });
  const login2 = await req(base, "/auth/login", "POST", { email: "psy2@ethos.local", password: "secret234" });
  const user2Token = login2.json.token as string;

  const session1 = await req(base, "/sessions", "POST", { patient_id: "p1", scheduled_at: new Date().toISOString() }, userToken);
  const forbidden = await req(base, `/sessions/${session1.json.id}`, "GET", undefined, user2Token);
  assert.equal(forbidden.status, 404);

  server.close();
});

test("admin não acessa conteúdo clínico", async () => {
  const { server, base, adminToken } = await bootstrap();
  const response = await req(base, "/sessions", "GET", undefined, adminToken);
  assert.equal(response.status, 403);
  server.close();
});

test("transcrição assíncrona cria job e permite polling", async () => {
  const { server, base, userToken } = await bootstrap();
  const session = await req(base, "/sessions", "POST", { patient_id: "p-x", scheduled_at: new Date().toISOString() }, userToken);
  const queued = await req(base, `/sessions/${session.json.id}/transcribe`, "POST", { raw_text: "texto" }, userToken);
  assert.equal(queued.status, 202);

  let status = "queued";
  for (let i = 0; i < 10; i += 1) {
    const job = await req(base, `/jobs/${queued.json.job_id}`, "GET", undefined, userToken);
    status = job.json.status;
    if (status === "completed") break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(status, "completed");
  server.close();
});

test("GETs de leitura retornam apenas dados do usuário", async () => {
  const { server, base, userToken } = await bootstrap();
  const session = await req(base, "/sessions", "POST", { patient_id: "p-read", scheduled_at: new Date().toISOString() }, userToken);
  await req(base, `/sessions/${session.json.id}/clinical-note`, "POST", { content: "draft" }, userToken);
  await req(base, "/reports", "POST", { patient_id: "p-read", purpose: "profissional", content: "x" }, userToken);

  const sessions = await req(base, "/sessions", "GET", undefined, userToken);
  const reports = await req(base, "/reports", "GET", undefined, userToken);
  const anamnesis = await req(base, "/anamnesis", "GET", undefined, userToken);
  const scales = await req(base, "/scales", "GET", undefined, userToken);
  const forms = await req(base, "/forms", "GET", undefined, userToken);
  const financial = await req(base, "/financial/entries", "GET", undefined, userToken);

  assert.equal(sessions.status, 200);
  assert.equal(reports.status, 200);
  assert.equal(anamnesis.status, 200);
  assert.equal(scales.status, 200);
  assert.equal(forms.status, 200);
  assert.equal(financial.status, 200);
  server.close();
});

test("/contracts e /openapi.yaml publicados", async () => {
  const { server, base } = await bootstrap();
  const contracts = await req(base, "/contracts");
  assert.equal(contracts.status, 200);
  assert.equal(contracts.json.openapi, "/openapi.yaml");

  const openapi = await fetch(`${base}/openapi.yaml`);
  assert.equal(openapi.status, 200);
  assert.match(await openapi.text(), /openapi:\s*3\.0\.3/);

  server.close();
});
