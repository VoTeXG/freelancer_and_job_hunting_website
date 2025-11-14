/** Simple server timing utility (clean reimplementation) */
export interface TimingHandle { end(): void; duration(): number }

interface Entry { key: string; start: number; end?: number; desc?: string }

export class ServerTiming {
  private marks: Entry[] = [];
  mark(key: string, desc?: string): TimingHandle {
    const e: Entry = { key, start: performance.now(), desc };
    this.marks.push(e);
    return {
      end: () => { if (!e.end) e.end = performance.now(); },
      duration: () => (e.end ?? performance.now()) - e.start
    };
  }
  serialize(): string {
    return this.marks
      .filter(m => typeof m.end === 'number')
      .map(m => `${m.key};dur=${Math.round((m.end! - m.start))}${m.desc ? `;desc="${m.desc}"` : ''}`)
      .join(', ');
  }
  mergeInto(existing?: string | null) {
    const cur = this.serialize();
    if (!existing) return cur;
    return existing && cur ? `${existing}, ${cur}` : (existing || cur);
  }
}

export async function withTiming<T>(timing: ServerTiming, key: string, fn: () => Promise<T>, desc?: string) {
  const h = timing.mark(key, desc);
  try { return await fn(); } finally { h.end(); }
}
