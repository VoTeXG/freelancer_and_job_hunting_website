// Shim for phantom references left by TypeScript to removed files / optional deps.
declare module '@/lib/timing' {
  export interface TimingHandle { end(): void; duration(): number }
  export class ServerTiming { mark(key: string, desc?: string): TimingHandle; serialize(): string; mergeInto(existing?: string | null): string }
  export function withTiming<T>(t: ServerTiming, key: string, fn: () => Promise<T>, desc?: string): Promise<T>;
}
