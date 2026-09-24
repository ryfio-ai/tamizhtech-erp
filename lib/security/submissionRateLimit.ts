/**
 * TAMIZHTECH ERP 2.0 — PUBLIC SUBMISSION RATE LIMITER
 * Edge / Serverless resilient rate limiting:
 * 1. Uses Upstash Redis if configured (distributed across Vercel serverless instances).
 * 2. Falls back to local in-memory sliding window as best-effort defense.
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

interface MemoryWindow {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryWindow>();
const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 10;

export async function checkSubmissionRateLimit(ip: string): Promise<RateLimitResult> {
  const cleanIp = (ip || "unknown").trim();
  const key = `ratelimit:sub:${cleanIp}`;
  const now = Math.floor(Date.now() / 1000);

  // 1. Try Upstash REST Redis if configured
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      // Execute INCR and EXPIRE in pipeline or sequential REST calls
      const incrRes = await fetch(`${upstashUrl}/incr/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: "no-store",
      });

      if (incrRes.ok) {
        const json = await incrRes.json();
        const count = Number(json.result || 1);

        if (count === 1) {
          // First request in this window, set TTL
          await fetch(`${upstashUrl}/expire/${encodeURIComponent(key)}/${WINDOW_SECONDS}`, {
            headers: { Authorization: `Bearer ${upstashToken}` },
            cache: "no-store",
          }).catch(() => {});
        }

        const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - count);
        return {
          allowed: count <= MAX_REQUESTS_PER_WINDOW,
          remaining,
          resetSeconds: WINDOW_SECONDS,
        };
      }
    } catch (err) {
      console.warn("[RATE_LIMIT_REDIS_WARN] Fallback to in-memory window:", (err as any)?.message);
    }
  }

  // 2. Resilient In-Memory Sliding Window Fallback
  const current = memoryStore.get(cleanIp);

  if (!current || now > current.resetAt) {
    memoryStore.set(cleanIp, {
      count: 1,
      resetAt: now + WINDOW_SECONDS,
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetSeconds: WINDOW_SECONDS,
    };
  }

  current.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - current.count);
  const resetSeconds = Math.max(1, current.resetAt - now);

  // Prune expired entries periodically
  if (memoryStore.size > 5000) {
    memoryStore.forEach((v, k) => {
      if (now > v.resetAt) {
        memoryStore.delete(k);
      }
    });
  }

  return {
    allowed: current.count <= MAX_REQUESTS_PER_WINDOW,
    remaining,
    resetSeconds,
  };
}

export function extractClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
