import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createWebhookServer, webhookSignatureFor, type WebhookEvent, type WebhookLogContext } from "../src/webhookServer";

const secret = "super-secret";

type HttpResult = { statusCode: number; body: string };

const sendWebhookRequest = async (port: number, payload: string, signature?: string): Promise<HttpResult> => {
  return await new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path: "/api/webhook",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          ...(signature ? { "x-ethos-signature": signature } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf-8"),
          });
        });
      },
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
};

const createEventPayload = (eventId: string) =>
  JSON.stringify({
    eventId,
    type: "transcription.completed",
    timestamp: new Date().toISOString(),
    data: {
      sessionId: "session-1",
      transcriptId: "transcript-1",
    },
  });

test("processa webhook válido e gera logs detalhados", async () => {
  const receivedEvents: WebhookEvent[] = [];
  const logs: WebhookLogContext[] = [];
  const server = createWebhookServer({
    secret,
    logger: (entry) => logs.push(entry),
    onEvent: (event) => {
      receivedEvents.push(event);
    },
  });

  server.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  const payload = createEventPayload("evt-1");
  const response = await sendWebhookRequest(port, payload, webhookSignatureFor(payload, secret));

  assert.equal(response.statusCode, 202);
  assert.equal(receivedEvents.length, 1);
  assert.equal(receivedEvents[0]?.eventId, "evt-1");
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.level, "info");
  assert.equal(logs[0]?.statusCode, 202);
  assert.match(String(logs[0]?.durationMs), /^\d+(\.\d+)?$/);

  server.close();
});

test("rejeita assinatura inválida", async () => {
  const server = createWebhookServer({ secret });
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  const payload = createEventPayload("evt-invalid-signature");
  const response = await sendWebhookRequest(port, payload, "sha256=invalid");

  assert.equal(response.statusCode, 401);
  assert.match(response.body, /Invalid signature/);
  server.close();
});

test("garante idempotência para eventos repetidos", async () => {
  const processed: string[] = [];
  const server = createWebhookServer({
    secret,
    onEvent: (event) => processed.push(event.eventId),
  });
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  const payload = createEventPayload("evt-duplicate");
  const signature = webhookSignatureFor(payload, secret);

  const first = await sendWebhookRequest(port, payload, signature);
  const second = await sendWebhookRequest(port, payload, signature);

  assert.equal(first.statusCode, 202);
  assert.equal(second.statusCode, 200);
  assert.equal(processed.length, 1);
  server.close();
});

test("retorna 400 para json malformado", async () => {
  const server = createWebhookServer({ secret });
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  const payload = "{\"eventId\":\"broken\"";
  const response = await sendWebhookRequest(port, payload, webhookSignatureFor(payload, secret));

  assert.equal(response.statusCode, 400);
  assert.match(response.body, /Invalid JSON/);
  server.close();
});

test("protege contra payload muito grande", async () => {
  const server = createWebhookServer({ secret, maxPayloadBytes: 128 });
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  const payload = JSON.stringify({
    eventId: "evt-huge",
    type: "transcription.completed",
    timestamp: new Date().toISOString(),
    data: { text: "a".repeat(300) },
  });
  const response = await sendWebhookRequest(port, payload, webhookSignatureFor(payload, secret));

  assert.equal(response.statusCode, 413);
  server.close();
});

test("mantém estabilidade com carga concorrente", async () => {
  const processed = new Set<string>();
  const server = createWebhookServer({
    secret,
    onEvent: async (event) => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      processed.add(event.eventId);
    },
  });
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  const requests = Array.from({ length: 30 }, (_, index) => {
    const payload = createEventPayload(`evt-burst-${index}`);
    return sendWebhookRequest(port, payload, webhookSignatureFor(payload, secret));
  });

  const responses = await Promise.all(requests);
  assert.equal(responses.filter((result) => result.statusCode === 202).length, 30);
  assert.equal(processed.size, 30);
  server.close();
});
