import { NextRequest, NextResponse } from "next/server";

// محدد معدل بسيط في الذاكرة يحمي نقاط النهاية المفتوحة من الإغراق والتخمين
const buckets = new Map<string, number[]>();

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    return NextResponse.json(
      { error: "طلبات كثيرة جداً، يرجى المحاولة بعد قليل" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return null;
}

// فحص محدد المعدل للمحاولات الخاطئة (مثل تخمين الرمز السري)
export function checkFailedAttempts(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter: 0 };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => now - t < 24 * 60 * 60_000);
  list.push(now);
  buckets.set(key, list);
}

export function clearFailedAttempts(key: string): void {
  buckets.delete(key);
}
