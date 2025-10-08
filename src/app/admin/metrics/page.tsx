"use client";
import React, { useEffect, useState } from 'react';

interface MetricCounters { [k: string]: number; }
interface RecentEvent { ts: number; name: string; payloadSize?: number; error?: boolean }
interface Snapshot { generatedAt: string; counters: MetricCounters; recentEvents: RecentEvent[]; limits: { maxRecentEvents: number } }

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
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto Refresh
          </label>
          <select className="border rounded px-2 py-1 text-sm" value={intervalMs} onChange={e => setIntervalMs(Number(e.target.value))}>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <button onClick={load} className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700">Refresh</button>
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
      <p className="text-xs text-gray-500">This dashboard uses in-memory ephemeral metrics; deploy a persistent metrics backend for production SLIs.</p>
    </div>
  );
}