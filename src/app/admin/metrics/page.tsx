"use client";
import React, { useEffect, useState } from 'react';

interface MetricCounters { [k: string]: number; }
interface RecentEvent { ts: number; name: string; payloadSize?: number; error?: boolean }
interface SLOEndpointAgg {
  name: string;
  targetP95: number | null;
  status: 'OK' | 'WATCH' | 'CRITICAL';
  short: { count: number; avg: number | null; min: number | null; max: number | null; p50: number | null; p95: number | null; p99: number | null } | null;
  long: { count: number; avg: number | null; min: number | null; max: number | null; p50: number | null; p95: number | null; p99: number | null } | null;
}
interface SLOAvailability {
  targetErrorRate: number;
  errorRateShort: number;
  errorRateLong: number;
  burnRateShort: number | null;
  burnRateLong: number | null;
  remainingBudget: number;
  status: 'OK' | 'WATCH' | 'CRITICAL';
}
interface Snapshot { generatedAt: string; counters: MetricCounters; recentEvents: RecentEvent[]; limits: { maxRecentEvents: number }; slo?: { endpoints: SLOEndpointAgg[]; availability: SLOAvailability } }

export default function AdminMetricsPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalMs, setIntervalMs] = useState(5000);

  async function load() {
    setError(null);
    try {
      const token = (typeof window !== 'undefined') ? localStorage.getItem('admin_token') : null; // simplistic dev storage
      const res = await fetch('/api/admin/metrics', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Unknown error');
        return;
      }
      setData(json.metrics);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [autoRefresh, intervalMs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Metrics Dashboard</h1>
        <div className="flex items-center gap-4">
          <label htmlFor="auto-refresh" className="flex items-center gap-2 text-sm">
            <input id="auto-refresh" type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto Refresh
          </label>
          <label htmlFor="refresh-interval" className="sr-only">Refresh Interval</label>
          <select id="refresh-interval" className="border rounded px-2 py-1 text-sm" value={intervalMs} onChange={e => setIntervalMs(Number(e.target.value))}>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <button onClick={load} className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700" aria-label="Refresh metrics">Refresh</button>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm">Error: {error}</div>}
      {!data && !error && <div className="text-sm text-gray-500">Loading...</div>}
      {data && (
        <div className="space-y-8">
          <section>
            <h2 className="font-medium mb-2">Counters</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(data.counters).sort().map(([k,v]) => (
                <div key={k} className="border rounded p-3 bg-white/50 dark:bg-zinc-900/40 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{k}</div>
                  <div className="text-lg font-semibold tabular-nums">{v}</div>
                </div>
              ))}
            </div>
          </section>
          {data.slo && (
            <section>
              <h2 className="font-medium mb-2 flex items-center gap-2">Service Level Objectives <span className="text-xs text-gray-500">(Rolling 5m & 60m)</span></h2>
              <div className="mb-4 border rounded p-4 bg-white/50 dark:bg-zinc-900/40">
                <h3 className="text-sm font-semibold mb-2">Availability</h3>
                <AvailabilityCard availability={data.slo.availability} />
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.slo.endpoints.map(ep => <EndpointSLOCard key={ep.name} ep={ep} />)}
              </div>
            </section>
          )}
          <section>
            <h2 className="font-medium mb-2">Rate Limiting</h2>
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              {['event.ratelimit.allow','event.ratelimit.block'].map(k => (
                <div key={k} className="border rounded p-3 bg-white/50 dark:bg-zinc-900/40 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{k}</div>
                  <div className="text-lg font-semibold tabular-nums">{data.counters[k] || 0}</div>
                </div>
              ))}
              <RateLimitRatio counters={data.counters} />
            </div>
            <p className="text-xs text-gray-500 max-w-prose">Counters increment on each token bucket decision. <strong>allow</strong> = request consumed a token; <strong>block</strong> = bucket empty (HTTP 429 advisable). Use these to monitor burstiness and tune limits.</p>
          </section>
          <section>
            <h2 className="font-medium mb-2">Cache</h2>
            <div className="grid md:grid-cols-5 gap-4 mb-4">
              {['event.cache.hit','event.cache.miss','event.cache.version.bump'].map(k => (
                <div key={k} className="border rounded p-3 bg-white/50 dark:bg-zinc-900/40 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{k}</div>
                  <div className="text-lg font-semibold tabular-nums">{data.counters[k] || 0}</div>
                </div>
              ))}
              <CacheHitRatio counters={data.counters} />
            </div>
            <p className="text-xs text-gray-500 max-w-prose">Hit ratio guides TTL & key strategy tuning. Low ratio may indicate overly specific cache keys or too-short TTL. Version bumps invalidate groups; monitor for excessive churn.</p>
          </section>
          <section>
            <h2 className="font-medium mb-2">Recent Events (most recent first)</h2>
            <div className="overflow-x-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-zinc-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Event</th>
                    <th className="px-3 py-2 text-right">Payload Bytes</th>
                    <th className="px-3 py-2 text-center">Error?</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEvents.slice(0,100).map(ev => (
                    <tr key={ev.ts + ev.name} className="border-t last:border-b">
                      <td className="px-3 py-1 whitespace-nowrap tabular-nums">{new Date(ev.ts).toLocaleTimeString()}</td>
                      <td className="px-3 py-1 font-mono text-xs">{ev.name}</td>
                      <td className="px-3 py-1 text-right tabular-nums">{ev.payloadSize || 0}</td>
                      <td className="px-3 py-1 text-center">{ev.error ? <span className="text-red-600 font-semibold">yes</span> : 'no'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
      <p className="text-xs text-gray-500">This dashboard uses in-memory ephemeral metrics; deploy a persistent metrics backend & tracing system for production SLIs.</p>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case 'OK': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'WATCH': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default: return 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-200';
  }
}

function formatMs(v: number | null | undefined) { if (v == null) return '—'; return `${Math.round(v)}ms`; }
function formatRate(v: number | null | undefined) { if (v == null) return '—'; return (v*100).toFixed(2)+'%'; }

const EndpointSLOCard: React.FC<{ ep: SLOEndpointAgg }> = ({ ep }) => {
  const p95Short = formatMs(ep.short?.p95);
  const p95Long = formatMs(ep.long?.p95);
  const target = ep.targetP95 ? `${ep.targetP95}ms` : '—';
  return (
    <div className="border rounded p-4 bg-white/50 dark:bg-zinc-900/40 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm font-mono">{ep.name}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor(ep.status)}`}>{ep.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 text-xs">
        <div className="space-y-1">
          <div className="text-gray-500">p95 (5m)</div>
          <div className="font-mono">{p95Short}</div>
          <div className="text-gray-500">p95 (60m)</div>
          <div className="font-mono">{p95Long}</div>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Target</div>
            <div className="font-mono">{target}</div>
          <div className="text-gray-500">Samples (5m)</div>
          <div className="font-mono">{ep.short?.count ?? 0}</div>
          <div className="text-gray-500">Samples (60m)</div>
          <div className="font-mono">{ep.long?.count ?? 0}</div>
        </div>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer select-none text-gray-600">More</summary>
        <div className="mt-1 grid grid-cols-3 gap-2 font-mono">
          <div><span className="text-gray-500">p50:</span> {formatMs(ep.long?.p50)}</div>
            <div><span className="text-gray-500">p99:</span> {formatMs(ep.long?.p99)}</div>
            <div><span className="text-gray-500">avg 5m:</span> {formatMs(ep.short?.avg || null)}</div>
            <div><span className="text-gray-500">avg 60m:</span> {formatMs(ep.long?.avg || null)}</div>
            <div><span className="text-gray-500">min:</span> {formatMs(ep.long?.min)}</div>
            <div><span className="text-gray-500">max:</span> {formatMs(ep.long?.max)}</div>
        </div>
      </details>
    </div>
  );
};

const AvailabilityCard: React.FC<{ availability: SLOAvailability }> = ({ availability }) => {
  const { targetErrorRate, errorRateShort, errorRateLong, burnRateShort, burnRateLong, remainingBudget, status } = availability;
  return (
    <div className="grid md:grid-cols-5 gap-4 items-start">
      <div className="space-y-1 text-xs"><div className="text-gray-500">Target Err Rate</div><div className="font-mono">{formatRate(targetErrorRate)}</div></div>
      <div className="space-y-1 text-xs"><div className="text-gray-500">Err 5m</div><div className="font-mono">{formatRate(errorRateShort)}</div></div>
      <div className="space-y-1 text-xs"><div className="text-gray-500">Err 60m</div><div className="font-mono">{formatRate(errorRateLong)}</div></div>
      <div className="space-y-1 text-xs"><div className="text-gray-500">Burn 5m</div><div className="font-mono">{burnRateShort == null ? '—' : burnRateShort.toFixed(2)}x</div></div>
      <div className="space-y-1 text-xs"><div className="text-gray-500">Burn 60m</div><div className="font-mono">{burnRateLong == null ? '—' : burnRateLong.toFixed(2)}x</div></div>
      <div className="space-y-1 text-xs"><div className="text-gray-500">Remaining Budget</div><div className="font-mono">{formatRate(remainingBudget)}</div></div>
      <div className="space-y-1 text-xs flex flex-col items-start"><div className="text-gray-500">Status</div><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor(status)}`}>{status}</span></div>
    </div>
  );
};

const RateLimitRatio: React.FC<{ counters: MetricCounters }> = ({ counters }) => {
  const allow = counters['event.ratelimit.allow'] || 0;
  const block = counters['event.ratelimit.block'] || 0;
  const total = allow + block;
  const blockRate = total > 0 ? (block / total) : 0;
  return (
    <div className="border rounded p-3 bg-white/50 dark:bg-zinc-900/40 shadow-sm flex flex-col justify-between">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">ratelimit.block_rate</div>
        <div className="text-lg font-semibold tabular-nums">{(blockRate*100).toFixed(1)}%</div>
      </div>
      <div className="text-[10px] text-gray-500 mt-1">{block}/{total} blocked</div>
    </div>
  );
};

const CacheHitRatio: React.FC<{ counters: MetricCounters }> = ({ counters }) => {
  const hit = counters['event.cache.hit'] || 0;
  const miss = counters['event.cache.miss'] || 0;
  const total = hit + miss;
  const ratio = total > 0 ? (hit / total) : 0;
  return (
    <div className="border rounded p-3 bg-white/50 dark:bg-zinc-900/40 shadow-sm flex flex-col justify-between">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">cache.hit_ratio</div>
        <div className="text-lg font-semibold tabular-nums">{(ratio*100).toFixed(1)}%</div>
      </div>
      <div className="text-[10px] text-gray-500 mt-1">{hit}/{total} hits</div>
    </div>
  );
};