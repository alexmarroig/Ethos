"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_events_1 = require("node:events");
const node_test_1 = __importDefault(require("node:test"));
const aiObservability_1 = require("../src/application/aiObservability");
const server_1 = require("../src/server");
(0, node_test_1.default)("detectBottlenecks encontra gargalos críticos", () => {
    const alerts = (0, aiObservability_1.detectBottlenecks)([
        { timestamp: "2026-01-01T00:00:00.000Z", latencyMs: 600, errorRate: 0.04, cpuPercent: 90, memoryPercent: 88 },
        { timestamp: "2026-01-01T00:01:00.000Z", latencyMs: 550, errorRate: 0.02, cpuPercent: 82, memoryPercent: 87 },
    ]);
    strict_1.default.ok(alerts.some((alert) => alert.metric === "latency"));
    strict_1.default.ok(alerts.some((alert) => alert.metric === "error_rate"));
    strict_1.default.ok(alerts.some((alert) => alert.metric === "cpu"));
});
(0, node_test_1.default)("predictFailureRisk detecta tendência de falha", () => {
    const prediction = (0, aiObservability_1.predictFailureRisk)([
        { timestamp: "2026-01-01T00:00:00.000Z", latencyMs: 180, errorRate: 0.01, cpuPercent: 55, memoryPercent: 55 },
        { timestamp: "2026-01-01T00:01:00.000Z", latencyMs: 220, errorRate: 0.015, cpuPercent: 58, memoryPercent: 56 },
        { timestamp: "2026-01-01T00:02:00.000Z", latencyMs: 300, errorRate: 0.022, cpuPercent: 66, memoryPercent: 58 },
        { timestamp: "2026-01-01T00:03:00.000Z", latencyMs: 430, errorRate: 0.03, cpuPercent: 78, memoryPercent: 62 },
        { timestamp: "2026-01-01T00:04:00.000Z", latencyMs: 560, errorRate: 0.041, cpuPercent: 89, memoryPercent: 70 },
        { timestamp: "2026-01-01T00:05:00.000Z", latencyMs: 640, errorRate: 0.052, cpuPercent: 93, memoryPercent: 76 },
    ]);
    strict_1.default.equal(prediction.riskLevel, "high");
    strict_1.default.ok(prediction.riskScore > aiObservability_1.defaultPredictFailureRiskConfig.highRiskThreshold);
    strict_1.default.match(prediction.reason, /latência|taxa de erro|CPU/i);
});
(0, node_test_1.default)("predictFailureRisk evita falso positivo com pico isolado", () => {
    const prediction = (0, aiObservability_1.predictFailureRisk)([
        { timestamp: "2026-01-01T00:00:00.000Z", latencyMs: 100, errorRate: 0.003, cpuPercent: 40, memoryPercent: 45 },
        { timestamp: "2026-01-01T00:01:00.000Z", latencyMs: 98, errorRate: 0.002, cpuPercent: 39, memoryPercent: 44 },
        { timestamp: "2026-01-01T00:02:00.000Z", latencyMs: 105, errorRate: 0.003, cpuPercent: 41, memoryPercent: 45 },
        { timestamp: "2026-01-01T00:03:00.000Z", latencyMs: 260, errorRate: 0.004, cpuPercent: 45, memoryPercent: 46 },
        { timestamp: "2026-01-01T00:04:00.000Z", latencyMs: 102, errorRate: 0.003, cpuPercent: 40, memoryPercent: 45 },
        { timestamp: "2026-01-01T00:05:00.000Z", latencyMs: 99, errorRate: 0.002, cpuPercent: 39, memoryPercent: 44 },
    ]);
    strict_1.default.equal(prediction.riskLevel, "low");
    strict_1.default.ok(prediction.riskScore < aiObservability_1.defaultPredictFailureRiskConfig.mediumRiskThreshold);
});
(0, node_test_1.default)("predictFailureRisk reduz falso negativo com tendência sustentada", () => {
    const prediction = (0, aiObservability_1.predictFailureRisk)([
        { timestamp: "2026-01-01T00:00:00.000Z", latencyMs: 120, errorRate: 0.006, cpuPercent: 48, memoryPercent: 50 },
        { timestamp: "2026-01-01T00:01:00.000Z", latencyMs: 140, errorRate: 0.007, cpuPercent: 52, memoryPercent: 52 },
        { timestamp: "2026-01-01T00:02:00.000Z", latencyMs: 165, errorRate: 0.009, cpuPercent: 56, memoryPercent: 53 },
        { timestamp: "2026-01-01T00:03:00.000Z", latencyMs: 190, errorRate: 0.012, cpuPercent: 60, memoryPercent: 55 },
        { timestamp: "2026-01-01T00:04:00.000Z", latencyMs: 220, errorRate: 0.015, cpuPercent: 63, memoryPercent: 57 },
        { timestamp: "2026-01-01T00:05:00.000Z", latencyMs: 250, errorRate: 0.019, cpuPercent: 67, memoryPercent: 60 },
    ], {
        mediumRiskThreshold: 0.35,
        highRiskThreshold: 0.8,
    });
    strict_1.default.equal(prediction.riskLevel, "medium");
    strict_1.default.ok(prediction.riskScore >= 0.35);
    strict_1.default.match(prediction.reason, /slope/i);
});
(0, node_test_1.default)("detectAnomalousBehavior encontra picos fora do padrão", () => {
    const anomalies = (0, aiObservability_1.detectAnomalousBehavior)([
        { timestamp: "1", latencyMs: 100, errorRate: 0.01, cpuPercent: 40, memoryPercent: 40 },
        { timestamp: "2", latencyMs: 95, errorRate: 0.01, cpuPercent: 41, memoryPercent: 40 },
        { timestamp: "3", latencyMs: 110, errorRate: 0.01, cpuPercent: 43, memoryPercent: 40 },
        { timestamp: "4", latencyMs: 98, errorRate: 0.01, cpuPercent: 44, memoryPercent: 40 },
        { timestamp: "5", latencyMs: 900, errorRate: 0.01, cpuPercent: 45, memoryPercent: 40 },
    ]);
    strict_1.default.equal(anomalies.length, 1);
    strict_1.default.equal(anomalies[0].metric, "latency");
    strict_1.default.match(anomalies[0].severity, /low|medium|high/);
    strict_1.default.match(anomalies[0].probableCause, /latência/i);
});
(0, node_test_1.default)("detectAnomalousBehavior detecta anomalia por erro alto sem pico de latência", () => {
    const anomalies = (0, aiObservability_1.detectAnomalousBehavior)([
        { timestamp: "1", latencyMs: 100, errorRate: 0.01, cpuPercent: 40, memoryPercent: 40 },
        { timestamp: "2", latencyMs: 102, errorRate: 0.011, cpuPercent: 42, memoryPercent: 41 },
        { timestamp: "3", latencyMs: 98, errorRate: 0.009, cpuPercent: 41, memoryPercent: 40 },
        { timestamp: "4", latencyMs: 101, errorRate: 0.01, cpuPercent: 43, memoryPercent: 42 },
        { timestamp: "5", latencyMs: 100, errorRate: 0.08, cpuPercent: 40, memoryPercent: 40 },
    ], {
        zScoreByMetric: { error_rate: 1.7, latency: 2.5 },
        scoreThreshold: 0.8,
        weights: { error_rate: 0.6, latency: 0.2, cpu: 0.1, memory: 0.1 },
    });
    strict_1.default.equal(anomalies.length, 1);
    strict_1.default.equal(anomalies[0].timestamp, "5");
    strict_1.default.equal(anomalies[0].metric, "error_rate");
    strict_1.default.match(anomalies[0].probableCause, /erro/i);
    strict_1.default.match(anomalies[0].suggestedAction, /Métrica que disparou/i);
});
(0, node_test_1.default)("suggestRootCauseFromLogs sugere causa para timeout", () => {
    const suggestion = (0, aiObservability_1.suggestRootCauseFromLogs)([
        { timestamp: "2026-01-01", service: "api", message: "Request timeout on dependency", stack: "Error: ETIMEDOUT" },
    ]);
    strict_1.default.match(suggestion, /timeout|rede/i);
});
(0, node_test_1.default)("generateUserSimulation cria usuários virtuais de carga", () => {
    const simulation = (0, aiObservability_1.generateUserSimulation)(3, 4000);
    strict_1.default.equal(simulation.length, 3);
    strict_1.default.deepEqual(simulation[0].actions, ["login", "create_session", "write_note", "export_report"]);
});
const req = async (base, path, method, body, token) => {
    const res = await fetch(`${base}${path}`, {
        method,
        headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json() };
};
const bootstrapAdmin = async () => {
    const server = (0, server_1.createEthosBackend)();
    server.listen(0);
    await (0, node_events_1.once)(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await req(base, "/auth/login", "POST", { email: "camila@ethos.local", password: "admin123" });
    return { server, base, adminToken: login.json.data.token };
};
(0, node_test_1.default)("integração observability: gera alerta após ingestão", async () => {
    const { server, base, adminToken } = await bootstrapAdmin();
    await req(base, "/admin/observability/performance-samples", "POST", {
        timestamp: "2026-01-01T00:00:00.000Z",
        latencyMs: 640,
        errorRate: 0.05,
        cpuPercent: 91,
        memoryPercent: 87,
    }, adminToken);
    const alerts = await req(base, "/admin/observability/alerts", "GET", undefined, adminToken);
    strict_1.default.equal(alerts.status, 200);
    strict_1.default.ok(alerts.json.data.some((item) => item.source === "detectBottlenecks"));
    server.close();
});
(0, node_test_1.default)("integração observability: deduplica alertas repetidos", async () => {
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
    const latencyAlert = alerts.json.data.find((item) => item.fingerprint === "bottleneck:latency:high");
    strict_1.default.ok(latencyAlert);
    strict_1.default.ok(latencyAlert.occurrences >= 2);
    server.close();
});
