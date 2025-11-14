# Smart Contract ABI Summary

High-level callable/project-relevant functions (non-exhaustive). Refer to compiled artifacts in `artifacts/` for full ABI.

## FreelancerEscrow
| Function | Args | Description |
|----------|------|-------------|
| createEscrow | client, freelancer, milestoneAmounts[], feeBps | Initializes a new escrow with milestone funding structure |
| releaseMilestone | escrowId, milestoneIndex | Releases funds for a completed milestone |
| rollbackEscrow | escrowId | Cancels escrow; returns remaining funds to client |
| dispute | escrowId | Flags escrow as disputed (future extension) |
| resolveDispute | escrowId, resolution | Administrative/manual resolution pathway |

Events:
- EscrowCreated(escrowId, client, freelancer)
- MilestoneReleased(escrowId, milestoneIndex)
- EscrowRolledBack(escrowId)
- EscrowDisputed(escrowId)

## ReputationSystem
| Function | Args | Description |
|----------|------|-------------|
| submitReview | targetAddress, score, metadataURI | Adds rating, updates aggregate score |
| getReputation | address | Returns aggregate rating + count |

Events:
- ReviewSubmitted(reviewer, target, score)

## CertificateNFT
| Function | Args | Description |
|----------|------|-------------|
| mintCertificate | to, tokenURI | Mints NFT certificate representing completed work |
| tokenURI | tokenId | Returns metadata URI |

Events:
- CertificateMinted(to, tokenId)

## Security Notes
- All state-changing functions require appropriate msg.sender roles (client/freelancer/admin).
- Consider adding reentrancy guards to escrow fund release if not already present in implementation.
- Fee basis points (feeBps) validated within expected range (e.g. <= 1000 for <=10%).

## Gas Optimization Considerations
- Packed storage for milestone arrays where possible.
- Avoid unbounded loops on-chain for large milestone sets.

## Future Extensions
- Dispute resolution arbitration contract.
- Multi-sig client escrow ownership.
- Streaming milestone payments.
