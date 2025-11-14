# Secrets Rotation Procedure

## Scope
Covers JWT secrets, refresh token pepper, encryption keys, third-party API keys (Sentry, PostHog), and database credentials.

## Principles
1. Shorten blast radius: rotate critical secrets at least every 90 days (or upon suspicion).
2. Zero downtime: use dual-secret / phased rollout where possible.
3. Audit: log rotation event (commit note or ticket) with timestamp & operator.

## Classification
| Secret | Rotation Cadence | Dual Support Needed? | Notes |
|--------|------------------|----------------------|-------|
| JWT_SECRET | 90d | Yes (grace decode old) | Introduce OLD_JWT_SECRET temporarily |
| REFRESH_TOKEN_PEPPER | 180d | No (force logout) | Rotation will invalidate all refresh tokens |
| ENCRYPTION_KEY | 180d | Yes (re-encrypt data) | Build key versioning scheme (v1, v2) |
| DB Password | 180d | Yes (connection pool reload) | Use managed secret rotation if available |
| SENTRY_DSN | Ad hoc | No | Rare change |
| POSTHOG Key | 180d | No | Update client envs |

## JWT Secret Rotation (Dual Mode)
1. Generate new random 32+ byte secret.
2. Set `JWT_SECRET_NEW` (or keep `JWT_SECRET` as new and move old to `JWT_SECRET_OLD` depending on implementation approach).
3. Update auth verification code to: try primary secret; on failure, attempt old secret decode.
4. Deploy.
5. After TTL of all issued tokens (e.g., 24h) passes, remove old secret variable & fallback logic.

Example pseudo-code:
```ts
const primary = process.env.JWT_SECRET!;
const legacy = process.env.JWT_SECRET_OLD;
function verify(token: string) {
  try { return decodeWith(primary); } catch (e) {
    if (legacy) return decodeWith(legacy); throw e;
  }
}
```

## Refresh Token Pepper Rotation
1. Announce maintenance window (users may be logged out).
2. Replace `REFRESH_TOKEN_PEPPER` with new value.
3. Deploy; all existing hashed refresh tokens become invalid; users re-authenticate.

## Encryption Key Rotation
1. Introduce `ENCRYPTION_KEYS="v1:base64key1,v2:base64key2"` and store current active version `ENCRYPTION_KEY_ACTIVE=v2`.
2. On read: attempt active version; if fails, iterate older versions.
3. Background job: re-encrypt all rows with old version to new version.
4. Remove old version once fully migrated.

## Database Credential Rotation
1. Create new DB user with same privileges.
2. Add new credential to secret store (but not yet active in app).
3. Update connection string env in staging; deploy and verify.
4. Update production env variable; deploy new pods/instances.
5. Revoke old user after all instances confirmed using new user.

## API Key Rotation
- Replace in secret manager; deploy; verify external service metrics.

## Emergency Rotation
Trigger: suspected leak, commit of secret, security advisory.
1. Invalidate compromised secret immediately.
2. Generate replacement and deploy using same steps above skipping waiting periods.
3. Audit logs & alert channel updated.

## Record Keeping
Maintain a private CHANGELOG or ticket for each rotation:
- Date
- Operator
- Secret name(s)
- Reason (scheduled/emergency)
- Notes / follow-up actions

## Automation Candidates
- Script to create & export random base64 secrets.
- Pre-commit hook scanning for committed secret literals (e.g., via gitleaks) (future).
