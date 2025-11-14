# Operational Runbook

Centralized procedures for deploying, rolling back, seeding data, running database migrations, and rotating secrets.

## 1. Environments
- dev: local workstation + ephemeral branches (optional)
- staging: pre-production validation (all migrations dry-run here first)
- production: customer-facing

Environment Parity Checklist:
| Concern | Dev | Staging | Prod |
|---------|-----|---------|------|
| NODE_ENV | development | production | production |
| DB schema | auto migrate dev | migrate deploy | migrate deploy |
| Feature flags | all | subset | minimal |
| Sentry DSN | optional | enabled (sample rate low) | enabled |
| Redis | optional/in-memory fallback | required | required |

## 2. Deployment Procedure
1. Ensure branch is rebased on `master` and CI green.
2. Increment version tag if release-worthy.
3. Build artifact: `npm run build` (PowerShell) or container build.
4. Run smoke tests (Playwright smoke or API ping).
5. Promote image / artifact to staging.
6. Run database migrations (see below) on staging.
7. Execute end-to-end flow (register → post job → apply → escrow create → milestone release → review → certificate mint).
8. If staging pass: deploy to production (blue/green or rolling). Monitor metrics: latency p95, error rate, cache hit ratio, rate limit blocks.
9. Post-deploy check: `/api/admin/health`, metrics dashboard, recent Sentry events.

Rollback Strategy:
- If application error: redeploy previous image (keep last 2 versions cached).
- If migration error:
  - Stop traffic (maintenance mode / scale to zero new app pods).
  - Restore latest backup (see backups script) OR run down migration if explicitly reversible.
  - Verify with `/api/admin/health` + selective queries.

## 3. Database Migrations
Dry Run (staging):
```
npm run db:dry-run
```
Deploy:
```
npm run db:deploy
```
Local dev iteration:
```
prisma migrate dev --name <change>
```
Verification:
- Confirm new tables/indexes exist.
- Run targeted query plan checks for new indexes.
- Monitor for increased slow query logs.

## 4. Seeding
Admin seed (local / staging only):
```
npm run seed:admin
```
Purpose: bootstrap initial admin wallet(s) and demo data. Avoid running in production unless explicitly allowed (idempotent but restricted by wallet allowlist).

## 5. Backup & Restore
Scheduled backups are automated (see `scripts/backup-db.ts`). Manual invocation:
```
npm run db:backup
```
Store artifacts in encrypted storage with retention policy (30d recommended). Test restore quarterly.

## 6. Secret Rotation
1. Add new secret value alongside old (dual key period) if possible.
2. Update environment configuration (staging first) and redeploy.
3. Validate using health & targeted API call.
4. Remove old secret after successful production deploy.
5. Document rotation date in `OPERATIONS_SECRETS_ROTATION.md`.

Secrets to Rotate:
- JWT signing keys (access / refresh)
- Sentry DSN (if compromised)
- Database credentials
- Redis password (if used)
- PostHog key (if event exfil suspected)

## 7. Escrow Incident Handling
Scenario: stuck escrow deployment or rollback requested.
1. Identify job + escrow on-chain state.
2. If pending > threshold, retry deployment job (admin tool or script).
3. For rollback: call escrow contract rollback function (admin authority) then update DB flags (`escrowDeployed=false`, `escrowPending=false`).
4. Log event: `escrow.rollback` + metadata.

## 8. Performance & Capacity
Monitor:
- p95 latency (jobs list < 400ms target)
- Error rate (<1%)
- Cache hit ratio (>40% initial, improve over time)
- Rate limit block rate (<5% normal load)

Scale triggers:
- Sustained CPU > 70% for 10m
- p95 latency breach for > 3 consecutive 5m windows
- Memory pressure causing GC churn

## 9. Security Response
If vulnerability discovered:
1. Create private security advisory internally.
2. Patch & deploy hotfix (skipping non-critical build steps if necessary).
3. Rotate impacted secrets.
4. Add regression test if applicable.

## 10. Checklist Before Production Deploy
- [ ] Typecheck / Lint ✓
- [ ] Tests (contracts + essential e2e) ✓
- [ ] Migrations applied staging ✓
- [ ] E2E flow passes ✓
- [ ] Metrics healthy ✓
- [ ] README updated (major feature toggles) ✓
- [ ] Rollback plan validated ✓

## 11. References
- `OPERATIONS_MIGRATIONS_RUNBOOK.md`
- `OPERATIONS_SECRETS_ROTATION.md`
- `OPERATIONS_BACKUPS_RUNBOOK.md`
- `README.md#Caching & Observability`
