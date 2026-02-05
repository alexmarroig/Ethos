import assert from "node:assert/strict";
import test from "node:test";
import {
  detectAnomalousBehavior,
  detectBottlenecks,
  defaultPredictFailureRiskConfig,
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
