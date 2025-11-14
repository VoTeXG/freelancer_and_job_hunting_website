import { recordMetricEvent } from '@/lib/metrics';

type Key = string;

// Simple in-memory token bucket per key; for demo/thesis only
const buckets = new Map<Key, { tokens: number; last: number }>();

export function rateLimit({ key, limit, windowMs }: { key: Key; limit: number; windowMs: number }) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: limit, last: now };

  const elapsed = now - bucket.last;
  const refill = Math.floor((elapsed / windowMs) * limit);
  bucket.tokens = Math.min(limit, bucket.tokens + (refill > 0 ? refill : 0));
  bucket.last = refill > 0 ? now : bucket.last;

  if (bucket.tokens <= 0) {
    buckets.set(key, bucket);
    recordMetricEvent('ratelimit.block', { key });
    return { allowed: false, remaining: 0 };
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  recordMetricEvent('ratelimit.allow', { key, remaining: bucket.tokens });
  return { allowed: true, remaining: bucket.tokens };
}
