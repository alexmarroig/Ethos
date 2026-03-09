import crypto from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export type WebhookEvent = {
  eventId: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
};

export type WebhookLogContext = {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  requestId: string;
  statusCode?: number;
  path?: string;
  method?: string;
  eventId?: string;
  durationMs?: number;
  error?: string;
};

export type WebhookServerOptions = {
  secret: string;
  maxPayloadBytes?: number;
  eventTtlMs?: number;
  logger?: (context: WebhookLogContext) => void;
  onEvent?: (event: WebhookEvent) => Promise<void> | void;
};

const WEBHOOK_PATH = "/api/webhook";

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const readBody = async (req: IncomingMessage, maxPayloadBytes: number) => {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.length;
    if (size > maxPayloadBytes) {
      throw new Error("Payload exceeds size limit");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
};

const signPayload = (payload: Buffer, secret: string) => {
  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `sha256=${hash}`;
};

export const createWebhookServer = (options: WebhookServerOptions): Server => {
  const {
    secret,
    maxPayloadBytes = 1024 * 1024,
    eventTtlMs = 5 * 60 * 1000,
    logger = () => undefined,
    onEvent = () => undefined,
  } = options;

  const processedEvents = new Map<string, number>();

  const pruneProcessedEvents = () => {
    const cutoff = Date.now() - eventTtlMs;
    for (const [eventId, processedAt] of processedEvents.entries()) {
      if (processedAt < cutoff) {
        processedEvents.delete(eventId);
      }
    }
  };

  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const start = process.hrtime.bigint();
    const requestId = crypto.randomUUID();

    const complete = (statusCode: number, body: Record<string, string>, level: WebhookLogContext["level"], message: string, extra?: Partial<WebhookLogContext>) => {
      const payload = JSON.stringify(body);
      res.statusCode = statusCode;
      res.setHeader("content-type", "application/json");
      res.end(payload);
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      logger({
        level,
        message,
        requestId,
        statusCode,
        method: req.method,
        path: req.url,
        durationMs,
        ...extra,
      });
    };

    if (req.url !== WEBHOOK_PATH || req.method !== "POST") {
      complete(404, { error: "Not Found" }, "warn", "received request for unsupported route");
      return;
    }

    try {
      const signature = req.headers["x-ethos-signature"];
      if (typeof signature !== "string") {
        complete(401, { error: "Missing signature" }, "warn", "missing webhook signature header");
        return;
      }

      const bodyBuffer = await readBody(req, maxPayloadBytes);
      const expectedSignature = signPayload(bodyBuffer, secret);
      if (!safeCompare(signature, expectedSignature)) {
        complete(401, { error: "Invalid signature" }, "warn", "invalid webhook signature");
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(bodyBuffer.toString("utf-8"));
      } catch {
        complete(400, { error: "Invalid JSON" }, "warn", "invalid json payload");
        return;
      }

      const event = parsed as Partial<WebhookEvent>;
      if (!event?.eventId || !event?.type || !event?.timestamp || !event?.data || typeof event.data !== "object") {
        complete(422, { error: "Invalid webhook event schema" }, "warn", "invalid webhook schema");
        return;
      }

      pruneProcessedEvents();
      if (processedEvents.has(event.eventId)) {
        complete(200, { status: "duplicate_ignored" }, "info", "duplicate webhook ignored", { eventId: event.eventId });
        return;
      }

      await onEvent(event as WebhookEvent);
      processedEvents.set(event.eventId, Date.now());
      complete(202, { status: "accepted" }, "info", "webhook processed successfully", { eventId: event.eventId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      if (message.includes("size limit")) {
        complete(413, { error: "Payload too large" }, "warn", "payload exceeded configured limit", { error: message });
        return;
      }
      complete(500, { error: "Internal server error" }, "error", "unexpected webhook failure", { error: message });
    }
  });
};

export const webhookSignatureFor = (payload: Buffer | string, secret: string) => {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  return signPayload(body, secret);
};
