# API Reference (Developer)

High-level overview of key REST endpoints used by the frontend. Authentication uses Bearer JWT + CSRF double-submit on state-changing endpoints.

## Auth
| Endpoint | Method | Description | Auth | Notes |
|----------|--------|-------------|------|-------|
| /api/auth/nonce | POST | Issues CSRF token cookie + nonce | none | Returns nonce for SIWE / session bootstrap |
| /api/auth/register | POST | Register wallet + profile | none (wallet addr in body) | Rate limited |
| /api/auth/login | POST | Exchange credentials for tokens | none | Returns access + refresh |
| /api/auth/refresh | POST | Rotate refresh token | refresh token | Invalidates previous chain |

## Jobs
| Endpoint | Method | Description | Auth | Notes |
|----------|--------|-------------|------|-------|
| /api/jobs | GET | List jobs (filter, paginate) | optional | Caching + ETag, versioned invalidation |
| /api/jobs | POST | Create job | scope: write:jobs | Rich text sanitized (rich_html_v1) |
| /api/jobs/:id | GET | Job detail | optional | Returns full description |
| /api/jobs/:id/apply | POST | Apply to job | authenticated | Rate limited |
| /api/job-drafts | POST | Draft upsert | authenticated | Field-level conflict timestamps |
| /api/job-drafts/:id/publish | POST | Publish draft | scope: write:jobs | Bumps jobs_list version |

## Escrow
| Endpoint | Method | Description | Auth | Notes |
|----------|--------|-------------|------|-------|
| /api/jobs/:id/escrow | POST | Perform escrow action (deploy / release / rollback) | scope: escrow:manage | Latency instrumented |
| /api/escrow/stats | GET | Escrow statistics | admin scope | For dashboards |

## Freelancers
| Endpoint | Method | Description | Auth | Notes |
|----------|--------|-------------|------|-------|
| /api/freelancers | GET | List freelancers | optional | Planned caching |
| /api/freelancers/:id | GET | Freelancer profile | optional | Slimmed payload for list page |

## Metrics & Admin
| Endpoint | Method | Description | Auth | Notes |
|----------|--------|-------------|------|-------|
| /api/admin/metrics | GET | JSON metrics snapshot | admin scope | Counters + histograms + SLO rollups |
| /api/admin/metrics.prom | GET | Prometheus export | admin scope | For scraping |
| /api/admin/health | GET | Health info (db, migrations) | admin scope | Returns latest migration count |

## Notifications / Realtime
| Endpoint | Method | Description | Auth | Notes |
|----------|--------|-------------|------|-------|
| /api/notifications | GET | List notifications | authenticated | Paging & read states |
| /api/notifications/ack | POST | Ack delivery | authenticated | Retries tracked |
| /api/socket (WS) | GET | Realtime channel | authenticated | Rate limited (per-user window) |

## Common Responses
Success envelope:
```json
{ "success": true, "<resource>": { ... } }
```
Error envelope:
```json
{ "success": false, "error": "Message", "details": { /* optional validation shape */ } }
```

## Scopes
| Scope | Grants |
|-------|--------|
| write:jobs | Create / publish jobs |
| escrow:manage | Escrow lifecycle actions |
| admin:all | Metrics, health, admin endpoints |

## Rate Limits
Token bucket decisions emit `event.ratelimit.allow` / `event.ratelimit.block` for observability. Default limits:
- Job create: 5 / 5m / IP
- Draft upsert: 30 / hour / IP
- Auth register: 5 / hour / IP

## Caching
- Jobs list: versioned key (namespace `jobs_list`), TTL ~30s, ETag & conditional requests.
- Planned: freelancers list.

## Rich Text
Job description accepted as `rich_html_v1` sanitized server-side; clients should not rely on unsanitized echo.

## Contracts
See `CONTRACT_ABI_SUMMARY.md` for on-chain function summaries.
