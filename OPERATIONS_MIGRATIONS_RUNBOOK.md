# Prisma Migrations Deploy & Rollback Runbook

Purpose: Provide a safe, repeatable procedure to apply Prisma schema changes and roll back if needed.

## Environments
- dev: local workstation
- staging: pre-prod environment mirroring prod schema
- production: live system

## Command Reference
- Generate client (after schema edits): `npm run prisma:generate`
- Create migration (dev only): `npx prisma migrate dev --name <change>`
- Apply pending migrations (staging/prod): `npm run db:deploy`
- Dry-run (preview SQL): `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-db-env DATABASE_URL --script`
- Status: `npx prisma migrate status`

## Workflow: Introducing a Change
1. Edit `prisma/schema.prisma`.
2. Run `npx prisma format` (optional but recommended) then:
3. `npx prisma migrate dev --name <concise_name>` (creates timestamped folder under `prisma/migrations`).
4. Inspect generated SQL (open the new migration directory) for unwanted table rewrites or destructive operations.
5. Run project locally; ensure type generation succeeded: `npm run typecheck`.
6. Commit migration folder + schema changes.
7. Open PR; CI should pass typecheck & scripts.
8. Merge to staging branch (or deploy preview) → run `npm run db:deploy` in staging environment.
9. Smoke test flows touching altered entities.
10. Promote to production: run `npm run db:deploy`.

## Dry-Run / Preview in Staging/Prod
Use diff to preview SQL Prisma will apply without executing:
```
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-db-env DATABASE_URL \
  --script
```
If output contains destructive operations (DROP / ALTER that removes columns) confirm data migration steps or fallback plan.

## Rollback Strategy
Prisma does not generate automatic down migrations by default. Options:
1. Hotfix forward migration (preferred): Create a new migration restoring removed column/table with compatible shape.
2. Manual SQL revert: Use the SQL from the previous migration to reconstruct objects (requires DBA review in prod).
3. Point-in-time database restore (extreme): Use backups (see BACKUPS runbook) to restore or clone to alternate DB, then replay safe migrations.

### Manual Rollback Steps (Emergency)
1. Identify failing migration folder (latest timestamp).
2. Review its SQL; craft inverse SQL script.
3. Put application in maintenance mode (if needed) to stop writes.
4. Apply inverse script inside a transaction if possible.
5. Remove/adjust migration record in `_prisma_migrations` only if absolutely necessary (avoid editing history unless corrupt). Document any manual edits.
6. Deploy patched application.
7. Resume traffic.

## Verification After Deploy
- `npx prisma migrate status` → "Database is up to date".
- Run smoke E2E scenario: post job, apply, escrow milestone action.
- Check metrics/health endpoint for DB connectivity.

## Common Pitfalls
- Accidental full table re-creation due to reordering fields: keep column order changes minimal.
- Renames appear as drop/create: prefer explicit `@@map` or field `@map` for safe renames.
- Large blocking migrations on production (e.g., adding NOT NULL without default): Use two-step migration (add nullable, backfill, then add NOT NULL + default).

## Pre-Deployment Checklist
- [ ] Migration reviewed by at least one peer
- [ ] Backups verified (latest dump < 24h)
- [ ] Dry-run diff inspected
- [ ] App code using new fields behind feature flag if risky
- [ ] Rollback notes prepared (if destructive)

## Post-Deployment Checklist
- [ ] Status reports up-to-date
- [ ] Metrics stable (no spike in 5xx or DB latency)
- [ ] Remove feature flag (if used) after confidence
