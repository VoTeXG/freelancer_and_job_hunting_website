// Lightweight metrics hook (optional import to avoid hard dep if metrics refactors)
let recordMetricEvent: undefined | ((name: string, payload?: any) => void);
try { // eslint-disable-next-line @typescript-eslint/no-var-requires
  recordMetricEvent = require('./metrics').recordMetricEvent; // CommonJS compat since metrics is TS transpiled
} catch {}
// @ts-nocheck
/**
 * Simple cache abstraction supporting Redis (if REDIS_URL provided) or in-memory fallback.
 * Features:
 *  - Namespaced keys (prefix)
 *  - Version tokens for coarse-grained invalidation (e.g., jobs list global version)
 *  - TTL handling
 *  - JSON serialization convenience helpers
 */
// Optional Redis import (typed as any to avoid build-time dependency if package absent)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Redis = any;

interface CacheDriver {
  get(key: string): Promise<string | null>;
  set(key: string, val: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
}

class MemoryDriver implements CacheDriver {
  private store = new Map<string, { v: string; exp?: number }>();
  async get(key: string) {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.exp && e.exp < Date.now()) { this.store.delete(key); return null; }
    return e.v;
  }
  async set(key: string, val: string, ttlSeconds?: number) {
    this.store.set(key, { v: val, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
  }
  async del(key: string) { this.store.delete(key); }
  async incr(key: string) {
    const current = parseInt((await this.get(key)) || '0');
    const next = current + 1;
    await this.set(key, String(next));
    return next;
  }
}

let redis: Redis | null = null;
let driver: CacheDriver | null = null;

async function init() {
  if (driver) return driver;
  const url = process.env.REDIS_URL;
  if (url) {
    try {
  const mod: any = await import('ioredis' as any); // cast to any to avoid TS resolution error if types missing
  const IORedis = mod.default || mod;
      redis = new IORedis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await redis.connect().catch(()=>{}); // best effort
      driver = {
        get: (k) => redis!.get(k),
        set: (k,v,ttl) => ttl ? redis!.set(k, v, 'EX', ttl) : redis!.set(k, v).then(()=>undefined),
        del: (k) => redis!.del(k).then(()=>undefined),
        incr: (k) => redis!.incr(k),
      };
      return driver;
    } catch (e) {
      // fallback
    }
  }
  driver = new MemoryDriver();
  return driver;
}

function nsKey(ns: string, key: string) { return `${ns}:${key}`; }

/** Coarse version key (increments to invalidate group) */
export async function bumpVersion(ns: string): Promise<number> {
  const d = await init();
  const v = await d.incr(nsKey('v', ns));
  if (recordMetricEvent) recordMetricEvent('cache.version.bump', { ns, v });
  return v;
}

export async function getVersion(ns: string): Promise<number> {
  const d = await init();
  const raw = await d.get(nsKey('v', ns));
  return raw ? parseInt(raw) : 0;
}

import { ServerTiming } from '@/lib/serverTiming';

interface CacheGetJSONOptions<T> {
  ttlSeconds?: number;
  build: () => Promise<T>;
  versionNs?: string;
  keyParts?: string[];
  timing?: ServerTiming; // optional Server-Timing collector
}

export async function cacheJSON<T>(ns: string, baseKey: string, opts: CacheGetJSONOptions<T>): Promise<{ value: T; hit: boolean; version: number; }> {
  const d = await init();
  const version = opts.versionNs ? await getVersion(opts.versionNs) : 0;
  const compositeKey = [ns, baseKey, version, ...(opts.keyParts || [])].join('::');
  const fullKey = nsKey('c', compositeKey);
  const tLookup = opts.timing?.mark?.(`cache_${ns}_lookup`);
  const cached = await d.get(fullKey);
  tLookup?.end?.();
  if (cached) {
    try {
      const tParse = opts.timing?.mark?.(`cache_${ns}_parse`);
      const parsed = JSON.parse(cached) as T;
      tParse?.end?.();
      if (recordMetricEvent) recordMetricEvent('cache.hit', { ns, key: baseKey, version });
      return { value: parsed, hit: true, version };
    } catch {}
  }
  const tBuild = opts.timing?.mark?.(`cache_${ns}_build`);
  const value = await opts.build();
  tBuild?.end?.();
  await d.set(fullKey, JSON.stringify(value), opts.ttlSeconds);
  if (recordMetricEvent) recordMetricEvent('cache.miss', { ns, key: baseKey, version });
  return { value, hit: false, version };
}

export async function invalidatePatternStartsWith(prefix: string) {
  // Only fully implemented for memory driver (Redis would need SCAN pattern)
  if (driver instanceof MemoryDriver) {
    const mem = (driver as any).store as Map<string, { v: string; exp?: number }>;
    for (const k of mem.keys()) if (k.startsWith(prefix)) mem.delete(k);
  } else if (redis) {
    // Best effort SCAN if Redis present
    try {
      let cursor = '0';
      do {
        const res = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', '100');
        cursor = res[0];
        const keys: string[] = res[1];
        if (keys.length) await redis.del(keys);
      } while (cursor !== '0');
    } catch {}
  }
}

export async function health() {
  const d = await init();
  return { backend: redis ? 'redis' : 'memory', ready: !!d };
}

export type CacheHealth = Awaited<ReturnType<typeof health>>;
