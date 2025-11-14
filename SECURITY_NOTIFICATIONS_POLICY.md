# Notification Ingestion Policy

Purpose: Define accepted structure, validation, and sanitization for realtime notification payloads to prevent injection, spoofing, or resource exhaustion.

## Accepted Notification Envelope
```jsonc
{
  "id": "server-generated UUID v4",
  "type": "application|milestone|payment|dispute|message",
  "createdAt": "ISO-8601",
  "to": "0xRecipientAddress",
  "from": "0xOriginatorAddress(optional)",
  "data": { /* type-specific minimal payload */ }
}
```

## Validation Rules
- `id` MUST be server generated – client-sent IDs ignored.
- `type` MUST be one of allowlist.
- `to` MUST correspond to an authenticated user room or allowed broadcast context.
- `data` shape constrained per `type` (see below) – extraneous keys stripped.
- Length limits: any string field <= 500 chars; arrays <= 25 items; nested depth <= 3.

## Per-Type Data Contracts
| Type | Required Keys | Notes |
| ---- | ------------- | ----- |
| application | jobId, applicantId | Numeric IDs only |
| milestone | jobId, milestoneIndex, status | `status` in [completed, paid] |
| payment | jobId, amount, currency | Amount numeric; currency enum (USD, USDC, ETH) |
| dispute | jobId, reason | `reason` sanitized & truncated 200 chars |
| message | threadId, body | `body` sanitized markdown subset (future) |

## Sanitization
Current sanitizer: minimal HTML removal for any free-form text (reuse `sanitizeUserHTML`). Future rich text editor will whitelist formatting tags only.

## Rate Limiting
- Emission: server enforces token bucket (10s window, 30 events) per authenticated identity.
- Client soft guard: drops >25 notifications / 5s with ack suppression to avoid retry storm.

## Security Objectives
| Threat | Mitigation |
| ------ | ---------- |
| Script injection | HTML sanitizer strips tags & event handlers |
| Room spoofing | Server-only join to `user:<address>`; clients cannot forge join for others |
| Flood / DoS | Token bucket + soft client backpressure |
| Replay of delivery IDs | Server IDs uuidv4 – duplicates ignored if future tracking added |
| Oversized payload | Size & length limits with early rejection |

## Logging & Observability
- On validation failure: emit structured event `event.realtime.ingest.reject` with reason (no raw body for PII safety).
- Accepted delivery increments `event.realtime.notification.sent` counter (future addition).

## Future Enhancements
- Persistent queue (Redis / durable store) for at-least-once delivery after restart.
- Signature-based authenticity for cross-service notification ingestion.
- Per-user notification preference matrix (topic opt-in/out) enforced at fan-out.

Document Owner: Realtime/Backend Lead
Last Updated: (fill on change)
