import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import {
  detectAnomalousBehavior,
  detectBottlenecks,
  generateUserSimulation,
  predictFailureRisk,
  suggestRootCauseFromLogs,
} from "../src/application/aiObservability";
import { createEthosBackend } from "../src/server";

test("detectBottlenecks encontra gargalos críticos", () => {
  const alerts = detectBottlenecks([
    { timestamp: "2026-01-01T00:00:00.000Z", latencyMs: 600, errorRate: 0.04, cpuPercent: 90, memoryPercent: 88 },
    { timestamp: "2026-01-01T00:01:00.000Z", latencyMs: 550, errorRate: 0.02, cpuPercent: 82, memoryPercent: 87 },
  ]);

  assert.ok(alerts.some((alert) => alert.metric === "latency"));
  assert.ok(alerts.some((alert) => alert.metric === "error_rate"));
  assert.ok(alerts.some((alert) => alert.metric === "cpu"));
});

test("predictFailureRisk detecta tendência de falha", () => {
  const prediction = predictFailureRisk([
    { timestamp: "2026-01-01T00:00:00.000Z", latencyMs: 120, errorRate: 0.005, cpuPercent: 45, memoryPercent: 50 },
    { timestamp: "2026-01-01T00:01:00.000Z", latencyMs: 130, errorRate: 0.008, cpuPercent: 50, memoryPercent: 52 },
    { timestamp: "2026-01-01T00:02:00.000Z", latencyMs: 580, errorRate: 0.09, cpuPercent: 93, memoryPercent: 70 },
  ]);

  assert.equal(prediction.riskLevel, "high");
  assert.ok(prediction.riskScore > 0.75);
});

test("detectAnomalousBehavior encontra picos fora do padrão", () => {
  const anomalies = detectAnomalousBehavior([
    { timestamp: "1", latencyMs: 100, errorRate: 0.01, cpuPercent: 40, memoryPercent: 40 },
    { timestamp: "2", latencyMs: 95, errorRate: 0.01, cpuPercent: 41, memoryPercent: 40 },
    { timestamp: "3", latencyMs: 110, errorRate: 0.01, cpuPercent: 43, memoryPercent: 40 },
    { timestamp: "4", latencyMs: 98, errorRate: 0.01, cpuPercent: 44, memoryPercent: 40 },
    { timestamp: "5", latencyMs: 900, errorRate: 0.01, cpuPercent: 45, memoryPercent: 40 },
  ]);

  assert.equal(anomalies.length, 1);
  assert.match(anomalies[0].probableCause, /latência/i);
});

test("suggestRootCauseFromLogs sugere causa para timeout", () => {
  const suggestion = suggestRootCauseFromLogs([
    { timestamp: "2026-01-01", service: "api", message: "Request timeout on dependency", stack: "Error: ETIMEDOUT" },
  ]);

  assert.match(suggestion, /timeout|rede/i);
});

test("generateUserSimulation cria usuários virtuais de carga", () => {
  const simulation = generateUserSimulation(3, 4000);
  assert.equal(simulation.length, 3);
  assert.deepEqual(simulation[0].actions, ["login", "create_session", "write_note", "export_report"]);
});


const req = async (base: string, path: string, method: string, body?: unknown, token?: string) => {
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

const bootstrapAdmin = async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const login = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
  return { server, base, adminToken: login.json.data.token as string };
};

test("integração observability: gera alerta após ingestão", async () => {
  const { server, base, adminToken } = await bootstrapAdmin();

  await req(base, "/admin/observability/performance-samples", "POST", {
    timestamp: "2026-01-01T00:00:00.000Z",
    latencyMs: 640,
    errorRate: 0.05,
    cpuPercent: 91,
    memoryPercent: 87,
  }, adminToken);

  const alerts = await req(base, "/admin/observability/alerts", "GET", undefined, adminToken);
  assert.equal(alerts.status, 200);
  assert.ok(alerts.json.data.some((item: any) => item.source === "detectBottlenecks"));

  server.close();
});

test("integração observability: deduplica alertas repetidos", async () => {
  const { server, base, adminToken } = await bootstrapAdmin();

  const sample = {
    timestamp: "2026-01-01T00:00:00.000Z",
    latencyMs: 660,
    errorRate: 0.05,
    cpuPercent: 93,
    memoryPercent: 86,
  };

  await req(base, "/admin/observability/performance-samples", "POST", sample, adminToken);
  await req(base, "/admin/observability/performance-samples", "POST", { ...sample, timestamp: "2026-01-01T00:01:00.000Z" }, adminToken);

  const alerts = await req(base, "/admin/observability/alerts", "GET", undefined, adminToken);
  const latencyAlert = alerts.json.data.find((item: any) => item.fingerprint === "bottleneck:latency:high");
  assert.ok(latencyAlert);
  assert.ok(latencyAlert.occurrences >= 2);

  server.close();
});
