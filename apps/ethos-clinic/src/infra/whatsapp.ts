import { db } from "./database";

export type WhatsAppConnectionState = "open" | "connecting" | "close" | "unknown";

export type WhatsAppQRCode = {
  base64: string;
  code: string;
};

function getConfig() {
  return db.whatsappConfig.get("config");
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    apikey: apiKey,
  };
}

async function evoFetch(
  url: string,
  method: string,
  apiKey: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(url, {
      method,
      headers: buildHeaders(apiKey),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: String(err) } };
  }
}

export async function whatsAppCreateInstance(): Promise<{ ok: boolean; error?: string }> {
  const cfg = getConfig();
  if (!cfg?.url || !cfg?.apiKey || !cfg?.instanceName) {
    return { ok: false, error: "WhatsApp não configurado." };
  }
  const result = await evoFetch(
    `${cfg.url}/instance/create`,
    "POST",
    cfg.apiKey,
    { instanceName: cfg.instanceName, token: cfg.apiKey, qrcode: true },
  );
  return result.ok ? { ok: true } : { ok: false, error: `Erro ${result.status} ao criar instância.` };
}

export async function whatsAppGetQRCode(): Promise<{ ok: boolean; qr?: WhatsAppQRCode; error?: string }> {
  const cfg = getConfig();
  if (!cfg?.url || !cfg?.apiKey || !cfg?.instanceName) {
    return { ok: false, error: "WhatsApp não configurado." };
  }
  const result = await evoFetch(
    `${cfg.url}/instance/connect/${cfg.instanceName}`,
    "GET",
    cfg.apiKey,
  );
  if (!result.ok) return { ok: false, error: `Erro ${result.status} ao obter QR code.` };
  const d = result.data as Record<string, unknown>;
  return {
    ok: true,
    qr: {
      base64: String(d.base64 ?? ""),
      code: String(d.code ?? ""),
    },
  };
}

export async function whatsAppGetConnectionState(): Promise<WhatsAppConnectionState> {
  const cfg = getConfig();
  if (!cfg?.url || !cfg?.apiKey || !cfg?.instanceName) return "unknown";
  const result = await evoFetch(
    `${cfg.url}/instance/connectionState/${cfg.instanceName}`,
    "GET",
    cfg.apiKey,
  );
  if (!result.ok) return "unknown";
  const d = result.data as Record<string, unknown>;
  const instance = d.instance as Record<string, unknown> | undefined;
  const state = String(instance?.state ?? d.state ?? "unknown");
  if (state === "open") return "open";
  if (state === "connecting") return "connecting";
  if (state === "close") return "close";
  return "unknown";
}

export async function whatsAppSendText(phone: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const cfg = getConfig();
  if (!cfg?.url || !cfg?.apiKey || !cfg?.instanceName) {
    return { ok: false, error: "WhatsApp não configurado." };
  }
  if (!cfg.enabled) {
    return { ok: false, error: "WhatsApp desabilitado na configuração." };
  }

  // Normalize phone: keep only digits, ensure country code
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;

  const result = await evoFetch(
    `${cfg.url}/message/sendText/${cfg.instanceName}`,
    "POST",
    cfg.apiKey,
    { number: normalized, text },
  );

  return result.ok
    ? { ok: true }
    : { ok: false, error: `Erro ${result.status} ao enviar mensagem.` };
}
