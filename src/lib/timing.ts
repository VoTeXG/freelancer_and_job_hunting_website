export interface TimingHandle {
  end: () => void;
  duration: () => number;
}

export class ServerTiming {
  private marks: { key: string; start: number; dur?: number; desc?: string }[] = [];
  mark(key: string, desc?: string): TimingHandle {
    const entry = { key, start: performance.now(), desc };
    this.marks.push(entry);
    return {
      end: () => { entry.dur = performance.now() - entry.start; },
      duration: () => (entry.dur ?? (performance.now() - entry.start)),
    };
  }
  serialize(): string {
    return this.marks
      .filter(m => typeof m.dur === 'number')
      .map(m => `${m.key};dur=${Math.round(m.dur!)}${m.desc ? `;desc="${m.desc}"` : ''}`)
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