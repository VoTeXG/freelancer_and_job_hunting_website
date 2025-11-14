# Conflict Resolution UX Guide

Explains the draft conflict system for job creation and how users resolve divergent state.

## Purpose
When a job draft is edited from multiple tabs or devices, field-level conflicts can emerge. The system tracks last-updated timestamps per field to merge changes safely.

## Mechanism
- Local draft persisted in `localStorage` with structure: `{ form: {...}, _fieldTs: { fieldName: epochMs } }`.
- Server draft stored via `/api/job-drafts` with same shape.
- On restore, server & local timestamps compared; newer field wins automatically.
- Conflicting fields (changed independently after last sync) surfaced to user for manual selection.

## Conflict Detection
1. Fetch latest server draft.
2. Compare each field's timestamp vs local `_fieldTs` or server update time.
3. If both sides changed (different values & both timestamps newer since last merge) → mark conflict.

## UI Behavior
- Banner / modal lists conflicting fields.
- Each conflict provides Accept Server / Keep Local buttons.
- Accepting a resolution updates local form & immediately syncs to server (bypasses debounce) for that field.

## Autosave
- Debounced (600ms) local save.
- Debounced (2000ms) server sync (except immediate on conflict resolution action).

## Retry / Failures
- Server sync failure logs console warning; local draft remains.
- Manual refresh re-attempts merge logic.

## Best Practices for Users
- Avoid editing same draft in many tabs simultaneously.
- Resolve conflicts promptly to prevent cascading divergences.

## Developer Notes
- Timestamps captured whenever a field's value JSON differs from previous snapshot.
- Conflict component should remain stateless; receives structured conflict object.
- Future enhancement: CRDT-based merge or more granular diff for arrays.

## Metrics & Observability (Planned)
- Emit `draft.conflict.detected` with count of fields.
- Emit `draft.conflict.resolved` per field resolution.

## Future Enhancements
- Batch resolution UI.
- Visual diff for long text fields.
- Expiration / stale conflict cleanup.
