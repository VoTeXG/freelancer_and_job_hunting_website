// @ts-nocheck
/** Minimal server timing collector producing a RFC 1036 style Server-Timing header segment. */
export interface TimingHandle { end: () => void; duration: () => number }

interface TimingEntry { key: string; start: number; desc?: string; end?: number; dur?: number }

export class ServerTiming {
  private marks: TimingEntry[] = [];
  mark(key: string, desc?: string): TimingHandle {
    const entry: TimingEntry = { key, start: performance.now(), desc };
    this.marks.push(entry);
    const handle: TimingHandle = {
      end: () => {
        if (!entry.end) {
          entry.end = performance.now();
          (entry as any).dur = entry.end - entry.start; // tolerate stale compiler state
        }
      },
      duration: () => ((entry as any).dur ?? ((entry.end ?? performance.now()) - entry.start))
    };
    return handle;
  }
  serialize(): string {
    return this.marks
      .filter(m => typeof m.end === 'number')
      .map(m => `${m.key};dur=${Math.round((m.dur ?? (m.end! - m.start)))}${m.desc ? `;desc="${m.desc}"` : ''}`)
      .join(', ');
  }
  mergeInto(existing: string | null | undefined): string {
    const cur = this.serialize();
    if (!existing) return cur;
    return existing && cur ? `${existing}, ${cur}` : (existing || cur);
  }
}

export function withTiming<T>(timing: ServerTiming, key: string, fn: () => Promise<T>, desc?: string) {
  const h = timing.mark(key, desc);
  return fn().finally(() => h.end());
}