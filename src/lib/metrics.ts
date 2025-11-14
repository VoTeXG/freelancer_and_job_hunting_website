// Simple in-memory metrics & recent events ring buffer.
// NOTE: Non-persistent; resets on server restart. Suitable for dev / light ops until a real TSDB is attached.

type CounterMap = Record<string, number>;

interface RecentEvent {
  ts: number;
  name: string;
  payloadSize?: number;
  error?: boolean;
}

// Histogram storage: fixed bucket boundaries per histogram name
interface HistogramDefinition {
  name: string;
  buckets: number[]; // ascending ms boundaries
}

interface HistogramData extends HistogramDefinition {
  counts: number[]; // same length as buckets + 1 (overflow)
  sum: number; // total observed value sum (ms)
  count: number; // total samples
  min: number;
  max: number;
}

// ===== Rolling Window SLO Support =====
// We maintain per-endpoint minute buckets for short (5m) and long (60m) windows.
interface MinuteBucket {
  minute: number; // epoch minute (Math.floor(Date.now()/60000))
  count: number;
  sum: number;
  min: number;
  max: number;
  // histogram partial counts per bucket boundary + overflow for percentile approximation
  bucketCounts: number[];
}

interface EndpointWindows {
  name: string; // raw latency name e.g. api.jobs.list
  short: MinuteBucket[]; // size <= SHORT_WINDOW_MINUTES
  long: MinuteBucket[];  // size <= LONG_WINDOW_MINUTES
}

const SHORT_WINDOW_MINUTES = 5;
const LONG_WINDOW_MINUTES = 60;
// SLO targets (p95 latency in ms) per endpoint
const LATENCY_SLO_TARGETS: Record<string, number> = {
  'api.jobs.list': 400,
  'api.freelancers.list': 400,
  'api.escrow.action': 600,
  'api.admin.metrics.json': 250,
};
const AVAILABILITY_ERROR_RATE_TARGET = 0.01; // 1% error budget

const endpointWindows: Record<string, EndpointWindows> = Object.create(null);

function getOrCreateEndpointWindows(name: string): EndpointWindows {
  let ew = endpointWindows[name];
  if (!ew) {
    ew = endpointWindows[name] = { name, short: [], long: [] };
  }
  return ew;
}

function currentEpochMinute(): number { return Math.floor(Date.now() / 60000); }

function observeRolling(name: string, ms: number, bucketIndex: number, totalBuckets: number) {
  const ew = getOrCreateEndpointWindows(name);
  const minute = currentEpochMinute();
  const apply = (arr: MinuteBucket[], capacity: number) => {
    let mb = arr[arr.length - 1];
    if (!mb || mb.minute !== minute) {
      mb = { minute, count: 0, sum: 0, min: Number.POSITIVE_INFINITY, max: 0, bucketCounts: new Array(totalBuckets).fill(0) };
      arr.push(mb);
      // trim old entries beyond capacity
      while (arr.length > capacity) arr.shift();
    }
    mb.count += 1;
    mb.sum += ms;
    if (ms < mb.min) mb.min = ms;
    if (ms > mb.max) mb.max = ms;
    mb.bucketCounts[bucketIndex] += 1;
  };
  apply(ew.short, SHORT_WINDOW_MINUTES);
  apply(ew.long, LONG_WINDOW_MINUTES);
}

interface Percentiles { p50: number | null; p95: number | null; p99: number | null; }

function computePercentiles(mergedCounts: number[], bucketBounds: number[], total: number): Percentiles {
  if (total === 0) return { p50: null, p95: null, p99: null };
  const targets = { p50: total * 0.5, p95: total * 0.95, p99: total * 0.99 } as const;
  let running = 0;
  const result: any = { p50: null, p95: null, p99: null };
  for (let i = 0; i < mergedCounts.length; i++) {
    running += mergedCounts[i];
    const le = i < bucketBounds.length ? bucketBounds[i] : Number.POSITIVE_INFINITY;
    for (const k of ['p50','p95','p99'] as const) {
      if (result[k] === null && running >= (targets as any)[k]) {
        result[k] = le;
      }
    }
  }
  return result as Percentiles;
}

function aggregateWindow(buckets: MinuteBucket[], bucketBounds: number[]) {
  if (buckets.length === 0) return null;
  let count = 0, sum = 0, min = Number.POSITIVE_INFINITY, max = 0;
  const merged = new Array(bucketBounds.length + 1).fill(0);
  for (const b of buckets) {
    count += b.count;
    sum += b.sum;
    if (b.min < min) min = b.min;
    if (b.max > max) max = b.max;
    b.bucketCounts.forEach((c, i) => merged[i] += c);
  }
  const pct = computePercentiles(merged, bucketBounds, count);
  return {
    count,
    avg: count > 0 ? sum / count : null,
    min: count > 0 ? min : null,
    max: count > 0 ? max : null,
    ...pct,
  };
}

function deriveSLOStatus(p95Long: number | null, target: number | undefined, burnRateLong: number | null): 'OK' | 'WATCH' | 'CRITICAL' {
  if (!target || p95Long === null) return 'OK';
  const over = p95Long / target;
  if (burnRateLong !== null && burnRateLong >= 2) return 'CRITICAL';
  if (over > 1.25) return 'CRITICAL';
  if (over > 1.1 || (burnRateLong !== null && burnRateLong >= 1)) return 'WATCH';
  return 'OK';
}

const counters: CounterMap = Object.create(null);
const recentEvents: RecentEvent[] = [];
const MAX_EVENTS = 200;

// Default latency histogram buckets (milliseconds)
const DEFAULT_LATENCY_BUCKETS = [5, 10, 25, 50, 75, 100, 150, 250, 400, 600, 800, 1000, 1500, 2000, 3000, 5000];

// Registry of histograms by name
const histograms: Record<string, HistogramData> = Object.create(null);

function ensureHistogram(name: string, buckets: number[] = DEFAULT_LATENCY_BUCKETS): HistogramData {
  let h = histograms[name];
  if (!h) {
    const sorted = [...buckets].sort((a,b)=>a-b);
    h = histograms[name] = {
      name,
      buckets: sorted,
      counts: new Array(sorted.length + 1).fill(0),
      sum: 0,
      count: 0,
      min: Number.POSITIVE_INFINITY,
      max: 0,
    };
  }
  return h;
}

function observeHistogram(name: string, valueMs: number, buckets?: number[]) {
  const h = ensureHistogram(name, buckets);
  h.sum += valueMs;
  h.count += 1;
  if (valueMs < h.min) h.min = valueMs;
  if (valueMs > h.max) h.max = valueMs;
  // find bucket index
  const idx = h.buckets.findIndex(b => valueMs <= b);
  const bucketIndex = (idx === -1 ? h.counts.length - 1 : idx);
  h.counts[bucketIndex] += 1;
  // Also feed rolling windows for latency.* histograms
  if (name.startsWith('latency.')) {
    const raw = name.replace(/^latency\./,'');
    observeRolling(raw, valueMs, bucketIndex, h.counts.length);
  }
}

function inc(name: string, by = 1) {
  counters[name] = (counters[name] || 0) + by;
}

export function recordMetricEvent(name: string, payload?: any) {
  inc(`event.${name}`);
  inc('events.total');
  const errorLike = name.endsWith('.error') || /error|fail|exception/i.test(name);
  if (errorLike) inc('events.error');
  recentEvents.push({ ts: Date.now(), name, payloadSize: payload ? JSON.stringify(payload).length : 0, error: errorLike });
  if (recentEvents.length > MAX_EVENTS) recentEvents.splice(0, recentEvents.length - MAX_EVENTS);
}

export function recordInternal(name: string, value = 1) { inc(name, value); }

export interface HistogramExport {
  name: string;
  buckets: { le: number | '+Inf'; count: number }[];
  sum: number;
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
}

function exportHistograms(): HistogramExport[] {
  return Object.values(histograms).map(h => {
    const cumulative: { le: number | '+Inf'; count: number }[] = [];
    let running = 0;
    h.buckets.forEach((b, i) => {
      running += h.counts[i];
      cumulative.push({ le: b, count: running });
    });
    running += h.counts[h.counts.length - 1];
    cumulative.push({ le: '+Inf', count: running });
    return {
      name: h.name,
      buckets: cumulative,
      sum: h.sum,
      count: h.count,
      min: h.count > 0 ? h.min : null,
      max: h.count > 0 ? h.max : null,
      avg: h.count > 0 ? h.sum / h.count : null,
    };
  });
}

export function recordLatencyMs(name: string, ms: number) {
  if (Number.isFinite(ms) && ms >= 0) observeHistogram(`latency.${name}`, ms);
}

export async function withLatency<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const dur = performance.now() - start;
    recordLatencyMs(name, dur);
  }
}

export function getMetricsSnapshot() {
  const { eventsError = 0, eventsTotal = 0 } = {
    eventsError: counters['events.error'] || 0,
    eventsTotal: counters['events.total'] || 0,
  };
  const errorRate = eventsTotal > 0 ? eventsError / eventsTotal : 0;
  // Availability rolling windows (global)
  // For now we approximate rolling error rates using the recentEvents ring buffer filtered by window.
  const now = Date.now();
  const shortWindowFrom = now - SHORT_WINDOW_MINUTES * 60000;
  const longWindowFrom = now - LONG_WINDOW_MINUTES * 60000;
  let shortErrors = 0, shortTotal = 0, longErrors = 0, longTotal = 0;
  for (const ev of recentEvents) {
    if (ev.ts >= longWindowFrom) {
      longTotal++; if (ev.error) longErrors++;
      if (ev.ts >= shortWindowFrom) { shortTotal++; if (ev.error) shortErrors++; }
    }
  }
  const shortErrorRate = shortTotal > 0 ? shortErrors / shortTotal : 0;
  const longErrorRate = longTotal > 0 ? longErrors / longTotal : 0;
  const burnRateShort = shortTotal > 0 ? (shortErrorRate / AVAILABILITY_ERROR_RATE_TARGET) : null;
  const burnRateLong = longTotal > 0 ? (longErrorRate / AVAILABILITY_ERROR_RATE_TARGET) : null;

  // Derive endpoint SLO data
  const endpointSLO = Object.keys(endpointWindows).map(name => {
    const ew = endpointWindows[name];
    // Use latency histogram bucket boundaries for computation (assume all share DEFAULT_LATENCY_BUCKETS)
    const hBounds = DEFAULT_LATENCY_BUCKETS;
    const shortAgg = aggregateWindow(ew.short, hBounds);
    const longAgg = aggregateWindow(ew.long, hBounds);
    const target = LATENCY_SLO_TARGETS[name];
    const status = deriveSLOStatus(longAgg?.p95 ?? null, target, burnRateLong);
    return {
      name,
      targetP95: target || null,
      short: shortAgg,
      long: longAgg,
      status,
    };
  }).sort((a,b) => a.name.localeCompare(b.name));

  const availabilityStatus = deriveSLOStatus(longErrorRate * 1000 /* scale just to reuse function threshold logic */, AVAILABILITY_ERROR_RATE_TARGET * 1000, burnRateLong);
  return {
    generatedAt: new Date().toISOString(),
    counters: { ...counters, 'events.error_rate': Number(errorRate.toFixed(4)) },
    recentEvents: [...recentEvents].reverse(),
    limits: { maxRecentEvents: MAX_EVENTS },
    histograms: exportHistograms(),
    slo: {
      endpoints: endpointSLO,
      availability: {
        targetErrorRate: AVAILABILITY_ERROR_RATE_TARGET,
        errorRateShort: shortErrorRate,
        errorRateLong: longErrorRate,
        burnRateShort,
        burnRateLong,
        remainingBudget: AVAILABILITY_ERROR_RATE_TARGET - longErrorRate,
        status: availabilityStatus,
      }
    },
    realtime: {
      connections: counters['event.realtime.connection'] || 0,
      disconnects: counters['event.realtime.disconnect'] || 0,
      notificationsAck: counters['event.realtime.notification.ack'] || 0,
      notificationsGiveup: counters['event.realtime.notification.giveup'] || 0,
      rateLimited: counters['event.realtime.rate_limited'] || 0,
      emitErrors: counters['event.realtime.emit.error'] || 0,
    }
  };
}

export type MetricsSnapshot = ReturnType<typeof getMetricsSnapshot>;

// Prometheus exposition (basic) text format generator
export function renderPrometheus(): string {
  const lines: string[] = [];
  // Counters
  Object.entries(counters).forEach(([k,v]) => {
    const safeName = k.replace(/[^a-zA-Z0-9_:]/g, '_');
    lines.push(`# TYPE ${safeName} counter`);
    lines.push(`${safeName} ${v}`);
  });
  // Histograms
  for (const h of exportHistograms()) {
    const base = h.name.replace(/[^a-zA-Z0-9_:]/g, '_');
    let runningPrev = 0;
    h.buckets.forEach(b => {
      lines.push(`# TYPE ${base} histogram`); // repeated but acceptable; simple emitter
      const leVal = b.le === '+Inf' ? '+Inf' : b.le;
      lines.push(`${base}_bucket{le="${leVal}"} ${b.count}`);
      runningPrev = b.count;
    });
    lines.push(`${base}_count ${h.count}`);
    lines.push(`${base}_sum ${h.sum}`);
  }
  return lines.join('\n');
}