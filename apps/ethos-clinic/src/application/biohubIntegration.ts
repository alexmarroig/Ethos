import crypto from "node:crypto";

export const isRawCompatMode = (headers: Record<string, string | string[] | undefined>, query: URLSearchParams) => {
  const compatHeader = typeof headers["x-biohub-compat"] === "string" ? headers["x-biohub-compat"] : Array.isArray(headers["x-biohub-compat"]) ? headers["x-biohub-compat"][0] : "";
  return query.get("compat") === "raw" || compatHeader === "raw";
};

type RateLimitResult = { allowed: boolean; remaining: number };
export interface RateLimiterProvider { hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>; }

class MemoryRateLimiter implements RateLimiterProvider {
  private state = new Map<string, { count: number; resetAt: number }>();
  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const current = this.state.get(key);
    if (!current || current.resetAt <= now) {
      this.state.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1 };
    }
    current.count += 1;
    return { allowed: current.count <= limit, remaining: Math.max(limit - current.count, 0) };
  }
}

class RedisRateLimiter implements RateLimiterProvider {
  private redis: any;
  constructor(redis: any) { this.redis = redis; }
  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const bucket = `rl:${key}`;
    const tx = this.redis.multi();
    tx.incr(bucket);
    tx.pttl(bucket);
    const [countRaw, ttlRaw] = await tx.exec().then((rows: any[]) => rows.map((r) => r[1]));
    const count = Number(countRaw ?? 0);
    const ttl = Number(ttlRaw ?? -1);
    if (ttl < 0) await this.redis.pexpire(bucket, windowMs);
    return { allowed: count <= limit, remaining: Math.max(limit - count, 0) };
  }
}

let cachedProvider: RateLimiterProvider | null = null;
export const getRateLimiterProvider = async (): Promise<RateLimiterProvider> => {
  if (cachedProvider) return cachedProvider;
  if ((process.env.RATE_LIMIT_PROVIDER ?? "memory") === "redis" && process.env.REDIS_URL) {
    try {
      const { createClient } = await import("redis");
      const client = createClient({ url: process.env.REDIS_URL });
      await client.connect();
      cachedProvider = new RedisRateLimiter(client);
      return cachedProvider;
    } catch {
      cachedProvider = new MemoryRateLimiter();
      return cachedProvider;
    }
  }
  cachedProvider = new MemoryRateLimiter();
  return cachedProvider;
};

export const hashUserId = (userId: string) => crypto.createHash("sha256").update(userId).digest("hex").slice(0, 12);

export const biohubMetrics = {
  total_requests: 0,
  total_denied: 0,
  total_rate_limited: 0,
  latencies: [] as number[],
  p95_latency: 0,
  observe(latencyMs: number) {
    this.total_requests += 1;
    this.latencies.push(latencyMs);
    if (this.latencies.length > 1000) this.latencies.shift();
    const sorted = [...this.latencies].sort((a, b) => a - b);
    this.p95_latency = sorted[Math.max(0, Math.floor(sorted.length * 0.95) - 1)] ?? 0;
  },
};
