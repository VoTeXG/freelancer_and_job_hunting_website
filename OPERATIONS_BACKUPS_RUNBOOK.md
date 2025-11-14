# Database Backups & Retention Runbook

## Objectives
- Ensure recoverability (RPO) < 24h (or better with PITR in future).
- Support point-in-time or latest backup restore for disaster scenarios.

## Backup Strategy (Initial)
- Nightly full logical dump (pg_dump) stored in object storage (encrypted at rest).
- Retention: 7 daily, 4 weekly (keep Sunday), 3 monthly.

## Scripts
Example (PowerShell / bash style pseudo):
```
# backup-db.ps1
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$fname = "backup_$timestamp.sql.gz"
pg_dump --no-owner --format=plain $Env:DATABASE_URL | gzip > $fname
# Optionally upload: aws s3 cp $fname s3://$Env:BACKUP_BUCKET/$fname --sse AES256
```
Retention prune (run after backup):
```
# prune-backups.ps1
# Keep logic: pattern backup_*.sql.gz
# Implement: list, sort by date segment, group by day/week/month preserving latest.
```
(For portability consider a Node script for cross-platform use.)

## Restore Procedure (Logical)
1. Provision new empty database (same major version).
2. Download desired backup file.
3. Decompress: `gunzip backup_<ts>.sql.gz`.
4. Apply: `psql $DATABASE_URL -f backup_<ts>.sql`.
5. Run `npx prisma migrate deploy` to ensure any subsequent migrations applied (if backup is older).
6. Validate: run smoke queries (count users, jobs) and basic application flows.

## Verification
- Monthly restore test in staging from a random weekly backup.
- Log duration & any errors.

## Encryption & Security
- Use server-side encryption (SSE) or client-side encryption before upload.
- Restrict bucket access to CI role + limited ops users.
- Enable object versioning if feasible.

## Monitoring
- After each backup upload, emit an event metric (future automation) and optional Slack notification.

## Failure Modes
- Backup job fails: alert if no new file in 26h.
- Corrupted dump: restore test fails; escalate & capture new fresh dump immediately.

## Future Enhancements
- Switch to physical base backup + WAL archiving (PITR) via managed service.
- Automated integrity check (pg_restore --list) after dump.
