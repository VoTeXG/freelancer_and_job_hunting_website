# Environment Parity Matrix

Goal: Keep dev, staging, and production behavior aligned to avoid environment-specific bugs.

| Variable | Dev | Staging | Production | Notes |
|----------|-----|---------|------------|-------|
| DATABASE_URL | Local Postgres | Managed Postgres staging | Managed Postgres prod | Same major version & extensions |
| NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID | test id | staging id | prod id | Public; rotate only if compromised |
| ADMIN_WALLETS | Developer wallets | Staging admin wallets | Production admin wallets | Do not reuse dev wallets in prod |
| SENTRY_DSN | optional | real DSN (staging proj) | real DSN (prod proj) | Use separate projects |
| NEXT_PUBLIC_POSTHOG_KEY | test key | staging key | prod key | Optional analytics separation |
| JWT_SECRET | dev insecure string | strong secret | strong secret (diff) | 32+ random bytes; never commit |
| REFRESH_TOKEN_PEPPER | dev placeholder | staging secret | prod secret | Used for hashing refresh tokens |
| ENCRYPTION_KEY | local dev key | staging key | prod key | For future encrypted fields (32 bytes) |
| REDIS_URL (future) | local container | staging cache | prod cache | TTL alignment |
| BASE_URL | http://localhost:3000 | https://staging.example.com | https://app.example.com | Used in emails & links |
| NEXT_PUBLIC_APP_ORIGIN | http://localhost:3000 | https://staging.example.com | https://app.example.com | CORS/CSRF origin checks |
| RATE_LIMIT_DEFAULT | 60 | 60 | 60 | Keep identical to validate behavior |
| FEATURE_FLAGS | JSON (all on) | selective | selective | Use per-env gating |
| BACKUP_BUCKET | local path | staging bucket | prod bucket | Encrypted storage |

## Parity Principles
1. Same schema & migrations applied in lockstep.
2. Feature flags stage risky changes before global enable.
3. Identical rate limits & security headers.
4. Distinct secrets per environment; never reuse production secrets elsewhere.
5. Staging mirrors production infra topology as close as cost allows.

## Drift Detection
- Weekly script: compare env var sets and report missing/different critical keys (future automation).
- Prisma migrate status in staging before prod deploy.

## Onboarding Checklist
- [ ] Developer has `.env.local` matching template.
- [ ] Staging `.env` stored in secret manager (e.g., GitHub Environments, Vault).
- [ ] Production `.env` stored in restricted secret manager with audit logging.
