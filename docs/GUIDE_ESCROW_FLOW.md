# User Guide: How Escrow Works

This guide explains the lifecycle of an escrow on the platform.

## Overview
Escrow ensures funds are securely held until work milestones are completed. It protects both client and freelancer by minimizing trust requirements.

## Lifecycle Phases
1. Job Creation: Client posts job and optionally selects blockchain escrow.
2. Application & Selection: Freelancer applies; client selects candidate (future: selection workflow). 
3. Escrow Deployment: Smart contract instantiated with milestone amounts + fee basis points.
4. Milestone Delivery: Freelancer completes work for each milestone.
5. Review & Release: Client reviews and calls release for milestone.
6. Completion: All milestones released → final review & reputation update.
7. Rollback (Optional): If project is canceled, rollback returns remaining funds to client.

## Milestones
- Defined at job creation.
- Each has description, amount (ETH or supported token), optional deadline.
- Total amount + platform fee locked at deployment.

## Releasing Funds
- Client triggers `releaseMilestone` on the escrow contract.
- Event emitted; UI updates status; funds transferred to freelancer minus fee (fee retained/forwarded per contract design).

## Rollback Path
Conditions for rollback:
- Stalled project.
- Mutual agreement to terminate.

Steps:
1. Client (or admin) calls `rollbackEscrow` (pending finalization of permission model).
2. Remaining milestones marked canceled; funds returned.
3. UI marks job as rolled back.

## Disputes (Planned)
- Escrow enters disputed state; funds frozen.
- Arbitration / resolution decides distribution.

## Reputation Impact
- Successful releases contribute to freelancer reputation via review + certificate mint.
- Rollbacks may reduce successful completion metrics (no automatic penalty score without review data).

## Certificates
- After final milestone release and positive review, client triggers certificate mint (or automatic hook mints) via `CertificateNFT`.

## Security Considerations
- Smart contract should guard against reentrancy (checks-effects-interactions).
- Validate milestone indexes and amounts.
- Limit rollback after partial releases if necessary.

## Common Issues
| Issue | Cause | Resolution |
|-------|-------|-----------|
| Escrow stuck pending | Deployment tx failed | Retry deployment (UI exposes retry button) |
| Cannot release milestone | Wrong index or already released | Refresh UI; verify milestone state |
| Rollback denied | Not authorized | Check caller role / permissions |

## Monitoring
Key events logged to metrics / events: `escrow.action`, `escrow.rollback`. Observe latency in admin dashboard.

## Future Enhancements
- Partial milestone adjustments.
- Dispute arbitration module.
- Multi-sig or DAO mediated releases.
