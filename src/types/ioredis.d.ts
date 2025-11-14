// Minimal module declaration to satisfy optional import when types are unavailable.
declare module 'ioredis' {
	// Minimal runtime type facsimile for optional usage (we only touch the methods below)
	export default class Redis {
		constructor(url?: string, opts?: any);
		connect(): Promise<void>;
		get(key: string): Promise<string | null>;
		set(key: string, value: string, mode?: string, ttl?: number): Promise<any>;
		del(keys: string | string[]): Promise<number>;
		incr(key: string): Promise<number>;
		scan(cursor: string, mode: string, pattern: string, countLiteral: string, count: string): Promise<[string, string[]]>;
	}
}