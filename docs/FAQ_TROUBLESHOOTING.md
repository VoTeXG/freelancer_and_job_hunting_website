# FAQ & Troubleshooting

## Wallet Connection Issues
**Problem:** Wallet not connecting.
**Causes:** Unsupported browser, extension disabled, chain mismatch.
**Fix:**
1. Ensure MetaMask (or supported wallet) installed & unlocked.
2. Switch to supported chain (configure network if necessary).
3. Clear site data & retry.

## Signature Fails / SIWE Issues
**Symptoms:** Login fails after nonce retrieval.
**Causes:** Expired nonce, wrong wallet address, signature rejection.
**Fix:**
1. Refresh page to fetch fresh nonce.
2. Verify wallet selected address.
3. Revoke stale sessions (clear local storage tokens).

## CSRF Token Missing
**Cause:** Request without `csrf_token` cookie or mismatched header.
**Fix:**
1. Call `/api/auth/nonce` to bootstrap cookie.
2. Use provided fetch helper that auto sets `X-CSRF-Token`.
3. Ensure `credentials: 'include'` for cross-tab requests.

## Rate Limit Exceeded
**Cause:** Exceeded per-IP token bucket.
**Fix:** Wait for window to replenish; reduce rapid retries. Monitor `X-RateLimit-Remaining` (future) or metrics dashboard counters.

## Job Description Formatting Stripped
**Cause:** Sanitizer removed disallowed tags/attributes.
**Fix:** Use supported formatting only (headings, bold/italic, lists, blockquote, code, links with http/https/mailto).

## Escrow Deployment Stuck
**Cause:** On-chain tx reverted / network congestion.
**Fix:** Retry deployment via UI button; if persistent, inspect contract events & mempool.

## Milestone Release Fails
**Cause:** Wrong milestone index or already released.
**Fix:** Refresh job detail page; confirm index; check explorer for previous release event.

## Rollback Not Possible
**Cause:** Authorization or partial releases.
**Fix:** Ensure client/admin role; verify that rollback conditions allow remaining funds return.

## Notifications Not Arriving
**Cause:** WebSocket disconnected or rate limited.
**Fix:** Check browser console for WS errors; reconnect; ensure not exceeding event rate limits.

## Large Response Warning
**Cause:** Response size budget script flagged payload.
**Fix:** Optimize payload via field slimming, pagination, or caching.

## Cache Misses High
**Cause:** Version churn or overly specific query keys.
**Fix:** Review version bump triggers; consider adjusting TTL or reducing key cardinality.

## Security Concerns / Potential Vulnerability
**Action:** Report privately to maintainers; rotate related secrets if compromised.

## Getting Further Help
Open an issue with reproduction details, environment, and steps taken; attach console/network logs where possible.
