import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import {
  detectAnomalousBehavior,
  detectBottlenecks,
  defaultPredictFailureRiskConfig,
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
    { timestamp: "2026-01-01T00:00:00.000Z", latencyMs: 180, errorRate: 0.01, cpuPercent: 55, memoryPercent: 55 },
    { timestamp: "2026-01-01T00:01:00.000Z", latencyMs: 220, errorRate: 0.015, cpuPercent: 58, memoryPercent: 56 },
    { timestamp: "2026-01-01T00:02:00.000Z", latencyMs: 300, errorRate: 0.022, cpuPercent: 66, memoryPercent: 58 },
    { timestamp: "2026-01-01T00:03:00.000Z", latencyMs: 430, errorRate: 0.03, cpuPercent: 78, memoryPercent: 62 },
    { timestamp: "2026-01-01T00:04:00.000Z", latencyMs: 560, errorRate: 0.041, cpuPercent: 89, memoryPercent: 70 },
    { timestamp: "2026-01-01T00:05:00.000Z", latencyMs: 640, errorRate: 0.052, cpuPercent: 93, memoryPercent: 76 },
  ]);

  assert.equal(prediction.riskLevel, "high");
  assert.ok(prediction.riskScore > defaultPredictFailureRiskConfig.highRiskThreshold);
  assert.match(prediction.reason, /latência|taxa de erro|CPU/i);
});

test("predictFailureRisk evita falso positivo com pico isolado", () => {
  const prediction = predictFailureRisk([
    { timestamp: "2026-01-01T00:00:00.000Z", latencyMs: 100, errorRate: 0.003, cpuPercent: 40, memoryPercent: 45 },
    { timestamp: "2026-01-01T00:01:00.000Z", latencyMs: 98, errorRate: 0.002, cpuPercent: 39, memoryPercent: 44 },
    { timestamp: "2026-01-01T00:02:00.000Z", latencyMs: 105, errorRate: 0.003, cpuPercent: 41, memoryPercent: 45 },
    { timestamp: "2026-01-01T00:03:00.000Z", latencyMs: 260, errorRate: 0.004, cpuPercent: 45, memoryPercent: 46 },
    { timestamp: "2026-01-01T00:04:00.000Z", latencyMs: 102, errorRate: 0.003, cpuPercent: 40, memoryPercent: 45 },
    { timestamp: "2026-01-01T00:05:00.000Z", latencyMs: 99, errorRate: 0.002, cpuPercent: 39, memoryPercent: 44 },
  ]);

  assert.equal(prediction.riskLevel, "low");
  assert.ok(prediction.riskScore < defaultPredictFailureRiskConfig.mediumRiskThreshold);
});

test("predictFailureRisk reduz falso negativo com tendência sustentada", () => {
  const prediction = predictFailureRisk(
    [
      { timestamp: "2026-01-01T00:00:00.000Z", latencyMs: 120, errorRate: 0.006, cpuPercent: 48, memoryPercent: 50 },
      { timestamp: "2026-01-01T00:01:00.000Z", latencyMs: 140, errorRate: 0.007, cpuPercent: 52, memoryPercent: 52 },
      { timestamp: "2026-01-01T00:02:00.000Z", latencyMs: 165, errorRate: 0.009, cpuPercent: 56, memoryPercent: 53 },
      { timestamp: "2026-01-01T00:03:00.000Z", latencyMs: 190, errorRate: 0.012, cpuPercent: 60, memoryPercent: 55 },
      { timestamp: "2026-01-01T00:04:00.000Z", latencyMs: 220, errorRate: 0.015, cpuPercent: 63, memoryPercent: 57 },
      { timestamp: "2026-01-01T00:05:00.000Z", latencyMs: 250, errorRate: 0.019, cpuPercent: 67, memoryPercent: 60 },
    ],
    {
      mediumRiskThreshold: 0.35,
      highRiskThreshold: 0.8,
    },
  );

  assert.equal(prediction.riskLevel, "medium");
  assert.ok(prediction.riskScore >= 0.35);
  assert.match(prediction.reason, /slope/i);
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
  assert.equal(anomalies[0].metric, "latency");
  assert.match(anomalies[0].severity, /low|medium|high/);
  assert.match(anomalies[0].probableCause, /latência/i);
});

test("detectAnomalousBehavior detecta anomalia por erro alto sem pico de latência", () => {
  const anomalies = detectAnomalousBehavior(
    [
      { timestamp: "1", latencyMs: 100, errorRate: 0.01, cpuPercent: 40, memoryPercent: 40 },
      { timestamp: "2", latencyMs: 102, errorRate: 0.011, cpuPercent: 42, memoryPercent: 41 },
      { timestamp: "3", latencyMs: 98, errorRate: 0.009, cpuPercent: 41, memoryPercent: 40 },
      { timestamp: "4", latencyMs: 101, errorRate: 0.01, cpuPercent: 43, memoryPercent: 42 },
      { timestamp: "5", latencyMs: 100, errorRate: 0.08, cpuPercent: 40, memoryPercent: 40 },
    ],
    {
      zScoreByMetric: { error_rate: 1.7, latency: 2.5 },
      scoreThreshold: 0.8,
      weights: { error_rate: 0.6, latency: 0.2, cpu: 0.1, memory: 0.1 },
    },
  );

  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0].timestamp, "5");
  assert.equal(anomalies[0].metric, "error_rate");
  assert.match(anomalies[0].probableCause, /erro/i);
  assert.match(anomalies[0].suggestedAction, /Métrica que disparou/i);
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
