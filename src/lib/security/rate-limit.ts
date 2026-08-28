import { NextResponse } from "next/server";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 20_000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }
}

/** 进程内限流。多实例部署需换 Redis；当前足以挡住单机刷接口。 */
export function consumeRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterSec: Math.ceil(opts.windowMs / 1000) };
  }
  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  return { ok: true, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitedResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      error: "リクエストが多すぎます。しばらくしてから再試行してください。",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

export function enforceRateLimit(
  request: Request,
  bucket: string,
  opts: RateLimitOptions,
  identity?: string,
): NextResponse | null {
  const result = consumeRateLimit(`${bucket}:${identity ?? clientIp(request)}`, opts);
  if (result.ok) return null;
  return rateLimitedResponse(result.retryAfterSec);
}

export function failClosedResponse(error: { message: string; code?: string; status?: number }) {
  return NextResponse.json(
    { error: error.message, code: error.code ?? "UNAVAILABLE" },
    { status: error.status ?? 503 },
  );
}
