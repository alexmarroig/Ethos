import assert from "node:assert/strict";
import test from "node:test";
import {
  detectAnomalousBehavior,
  detectBottlenecks,
  generateUserSimulation,
  predictFailureRisk,
  suggestRootCauseFromLogs,
} from "../src/application/aiObservability";

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
