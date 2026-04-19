"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_events_1 = require("node:events");
const node_perf_hooks_1 = require("node:perf_hooks");
const node_test_1 = __importDefault(require("node:test"));
const server_1 = require("../src/server");
const TOTAL_REQUESTS = Number(process.env.LOAD_SMOKE_REQUESTS ?? 30);
const CONCURRENCY = Number(process.env.LOAD_SMOKE_CONCURRENCY ?? 6);
const MAX_AVG_MS = Number(process.env.LOAD_SMOKE_MAX_AVG_MS ?? 1200);
const MAX_P95_MS = Number(process.env.LOAD_SMOKE_MAX_P95_MS ?? 2000);
(0, node_test_1.default)("load smoke: cenário básico respeita limites de latência", async () => {
    const server = (0, server_1.createEthosBackend)();
    server.listen(0);
    await (0, node_events_1.once)(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const durations = [];
    const runRequest = async () => {
        const started = node_perf_hooks_1.performance.now();
        const response = await fetch(`${base}/health`);
        const elapsed = node_perf_hooks_1.performance.now() - started;
        durations.push(elapsed);
        strict_1.default.equal(response.status, 200, "endpoint /health deve responder 200");
    };
    const workers = Array.from({ length: CONCURRENCY }, async (_, index) => {
        const perWorker = Math.floor(TOTAL_REQUESTS / CONCURRENCY) + (index < TOTAL_REQUESTS % CONCURRENCY ? 1 : 0);
        for (let i = 0; i < perWorker; i += 1) {
            await runRequest();
        }
    });
    try {
        await Promise.all(workers);
    }
    finally {
        server.closeAllConnections();
        server.close();
    }
    const ordered = [...durations].sort((a, b) => a - b);
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p95Index = Math.min(ordered.length - 1, Math.floor(ordered.length * 0.95));
    const p95 = ordered[p95Index];
    const report = {
        totalRequests: durations.length,
        concurrency: CONCURRENCY,
        avgMs: Number(avg.toFixed(2)),
        p95Ms: Number(p95.toFixed(2)),
        limits: {
            maxAvgMs: MAX_AVG_MS,
            maxP95Ms: MAX_P95_MS,
        },
    };
    console.log("load-smoke-report", JSON.stringify(report));
    strict_1.default.ok(avg <= MAX_AVG_MS, `latência média (${avg.toFixed(2)}ms) excedeu limite (${MAX_AVG_MS}ms)`);
    strict_1.default.ok(p95 <= MAX_P95_MS, `latência p95 (${p95.toFixed(2)}ms) excedeu limite (${MAX_P95_MS}ms)`);
});
