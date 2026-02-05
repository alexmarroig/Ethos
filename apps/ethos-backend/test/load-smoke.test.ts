import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { createEthosBackend } from "../src/server";

const TOTAL_REQUESTS = Number(process.env.LOAD_SMOKE_REQUESTS ?? 30);
const CONCURRENCY = Number(process.env.LOAD_SMOKE_CONCURRENCY ?? 6);
const MAX_AVG_MS = Number(process.env.LOAD_SMOKE_MAX_AVG_MS ?? 1200);
const MAX_P95_MS = Number(process.env.LOAD_SMOKE_MAX_P95_MS ?? 2000);

test("load smoke: cenário básico respeita limites de latência", async () => {
  const server = createEthosBackend();
  server.listen(0);
  await once(server, "listening");

  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const durations: number[] = [];

  const runRequest = async () => {
    const started = performance.now();
    const response = await fetch(`${base}/contracts`);
    const elapsed = performance.now() - started;
    durations.push(elapsed);
    assert.equal(response.status, 200, "endpoint /contracts deve responder 200");
  };

  const workers = Array.from({ length: CONCURRENCY }, async (_, index) => {
    const perWorker = Math.floor(TOTAL_REQUESTS / CONCURRENCY) + (index < TOTAL_REQUESTS % CONCURRENCY ? 1 : 0);
    for (let i = 0; i < perWorker; i += 1) {
      await runRequest();
    }
  });

  await Promise.all(workers);
  server.close();

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
  assert.ok(avg <= MAX_AVG_MS, `latência média (${avg.toFixed(2)}ms) excedeu limite (${MAX_AVG_MS}ms)`);
  assert.ok(p95 <= MAX_P95_MS, `latência p95 (${p95.toFixed(2)}ms) excedeu limite (${MAX_P95_MS}ms)`);
});
