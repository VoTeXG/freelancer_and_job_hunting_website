// Lightweight analytics/event emission utility.
// Console destination always active; optional PostHog client if key present.

type EventPayload = Record<string, any> | undefined;

interface AnalyticsDestination {
  send: (name: string, payload?: EventPayload) => void | Promise<void>;
  flush?: () => Promise<void>;
}

class ConsoleDestination implements AnalyticsDestination {
  send(name: string, payload?: EventPayload) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ts: new Date().toISOString(), type: 'event', name, payload }));
  }
}

let posthogClient: any = null;
import { recordMetricEvent } from './metrics';

function initPosthog() {
  if (posthogClient || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  try {
    import('posthog-js').then(mod => {
      posthogClient = mod.default;
      posthogClient.init(key, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com' });
    }).catch(() => {});
  } catch {
    // swallow
  }
}

class PosthogDestination implements AnalyticsDestination {
  send(name: string, payload?: EventPayload) {
    if (!posthogClient) return;
    try { posthogClient.capture(name, payload || {}); } catch { /* noop */ }
  }
}

const destinations: AnalyticsDestination[] = [new ConsoleDestination()];
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  destinations.push(new PosthogDestination());
}

export function recordEvent(name: string, payload?: EventPayload) {
  // Feed metrics aggregator (always on in server context)
  try { recordMetricEvent(name, payload); } catch { /* noop */ }
  for (const d of destinations) {
    try { d.send(name, payload); } catch { /* ignore */ }
  }
}

export function initClientAnalytics() { initPosthog(); }