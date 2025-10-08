// Simple in-memory metrics & recent events ring buffer.
// NOTE: Non-persistent; resets on server restart. Suitable for dev / light ops until a real TSDB is attached.

type CounterMap = Record<string, number>;

interface RecentEvent {
  ts: number;
  name: string;
  payloadSize?: number;
  error?: boolean;
}

const counters: CounterMap = Object.create(null);
const recentEvents: RecentEvent[] = [];
const MAX_EVENTS = 200;

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
  };
}

export type MetricsSnapshot = ReturnType<typeof getMetricsSnapshot>;