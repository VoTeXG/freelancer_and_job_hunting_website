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
  h.counts[idx === -1 ? h.counts.length - 1 : idx] += 1;
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
  return {
    generatedAt: new Date().toISOString(),
    counters: { ...counters, 'events.error_rate': Number(errorRate.toFixed(4)) },
    recentEvents: [...recentEvents].reverse(),
    limits: { maxRecentEvents: MAX_EVENTS },
    histograms: exportHistograms(),
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