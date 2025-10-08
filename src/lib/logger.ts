import { randomUUID } from 'crypto';

export interface LogFields { [k: string]: any }

export interface Logger {
  child(fields: LogFields): Logger;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
}

function write(level: string, base: LogFields, msg: string, fields?: LogFields) {
  const rec = { ts: new Date().toISOString(), level, msg, ...base, ...(fields || {}) };
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(rec));
}

export function createLogger(base: LogFields = {}): Logger {
  return {
    child(extra: LogFields) { return createLogger({ ...base, ...extra }); },
    info(msg, f) { write('info', base, msg, f); },
    warn(msg, f) { write('warn', base, msg, f); },
    error(msg, f) { write('error', base, msg, f); },
  };
}

export function loggerWithRequest(requestId?: string) {
  return createLogger({ requestId: requestId || randomUUID() });
}