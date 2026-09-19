/**
 * TAMIZHTECH ERP 2.0 — ACCELERATION CACHE LAYER
 * Non-Authoritative Speed Acceleration Layer (MongoDB remains single source of truth)
 * Supports:
 * - Upstash / REST Redis or Standard REDIS_URL
 * - Resilient in-memory cache with TTL fallback
 * - Selective, safe cache invalidation on mutations
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlSeconds = 60): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  del(keyPatternOrPrefix: string): void {
    Array.from(this.store.keys()).forEach((key) => {
      if (key.startsWith(keyPatternOrPrefix) || key === keyPatternOrPrefix) {
        this.store.delete(key);
      }
    });
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryCache = new MemoryCache();

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    // Check in-memory acceleration first
    const memVal = memoryCache.get<T>(key);
    if (memVal !== null) return memVal;

    // Upstash REST Redis support if configured
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      const res = await fetch(`${upstashUrl}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          const parsed = JSON.parse(json.result);
          memoryCache.set(key, parsed, 30); // local micro-cache
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn(`[CACHE_GET_WARN] Key: ${key}`, (err as any)?.message);
  }
  return null;
}

export async function setCachedData<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
  try {
    memoryCache.set(key, value, ttlSeconds);

    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      await fetch(`${upstashUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}?EX=${ttlSeconds}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: "no-store",
      }).catch(() => {});
    }
  } catch (err) {
    console.warn(`[CACHE_SET_WARN] Key: ${key}`, (err as any)?.message);
  }
}

export async function invalidateCachePrefix(prefix: string): Promise<void> {
  try {
    memoryCache.del(prefix);

    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      // Fetch keys matching prefix
      const keysRes = await fetch(`${upstashUrl}/keys/${encodeURIComponent(prefix)}*`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
        cache: "no-store",
      });
      if (keysRes.ok) {
        const keysJson = await keysRes.json();
        const keys: string[] = keysJson.result || [];
        if (keys.length > 0) {
          await fetch(`${upstashUrl}/del/${keys.map(k => encodeURIComponent(k)).join("/")}`, {
            headers: { Authorization: `Bearer ${upstashToken}` },
            cache: "no-store",
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn(`[CACHE_INVALIDATE_WARN] Prefix: ${prefix}`, (err as any)?.message);
  }
}

export async function invalidateProductCache(productId?: string): Promise<void> {
  await invalidateCachePrefix("products:");
  await invalidateCachePrefix("catalog:");
  await invalidateCachePrefix("saleable:");
  if (productId) {
    await invalidateCachePrefix(`stock:${productId}`);
  }
  await invalidateCachePrefix("inventory:summary");
  await invalidateCachePrefix("dashboard:stats");
  await invalidateCachePrefix("reports:");
}

export async function invalidateStockCache(productId?: string): Promise<void> {
  if (productId) {
    await invalidateCachePrefix(`stock:${productId}`);
  }
  await invalidateCachePrefix("stock:");
  await invalidateCachePrefix("inventory:summary");
  await invalidateCachePrefix("dashboard:stats");
  await invalidateCachePrefix("reports:");
}
