/**
 * In-memory rate limiting (S-7).
 * Dependency-free token-bucket/fixed-window limiter keyed by a string
 * (client IP or API key). Server-only; does not persist across restarts,
 * which is acceptable for a per-instance safety net.
 */

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

interface Bucket {
  tokens: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Env override RATE_LIMIT_LIMIT (default 60). */
function envLimit(): number {
  const raw = Number(process.env.RATE_LIMIT_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_LIMIT;
}

/** Env override RATE_LIMIT_WINDOW in ms (default 60000). */
function envWindowMs(): number {
  const raw = Number(process.env.RATE_LIMIT_WINDOW);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_WINDOW_MS;
}

/**
 * Consume one token for `key`. Returns `{ ok: false, retryAfterMs }`
 * when the caller is over the limit.
 */
export function rateLimit(
  key: string,
  opts: RateLimitOptions = {}
): RateLimitResult {
  const limit = opts.limit ?? envLimit();
  const windowMs = opts.windowMs ?? envWindowMs();
  const now = Date.now();

  pruneBuckets(now);

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { tokens: limit - 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return { ok: true };
  }

  return { ok: false, retryAfterMs: bucket.resetAt - now };
}

/** Best-effort: drop expired buckets to bound memory. */
function pruneBuckets(now: number) {
  if (buckets.size < 10_000) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

/** Extract the caller IP from x-forwarded-for (first value) or fall back to null. */
function clientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

/**
 * Apply an IP-based rate limit to a route handler.
 * Returns a 429 `Response` (with `Retry-After`) when over the limit,
 * otherwise `null` so the handler can proceed.
 */
export function withRateLimit(
  request: Request,
  limit?: number,
  windowMs?: number
): Response | null {
  const key = `ip:${clientIp(request) ?? "unknown"}`;
  const result = rateLimit(key, { limit, windowMs });
  if (result.ok) return null;

  const retryAfterSec = Math.max(1, Math.ceil((result.retryAfterMs ?? 0) / 1000));
  return new Response(JSON.stringify({ error: "rate_limited", retry_after_ms: result.retryAfterMs }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSec),
    },
  });
}
