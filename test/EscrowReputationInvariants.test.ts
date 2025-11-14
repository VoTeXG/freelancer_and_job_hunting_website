import { expect } from 'chai';
import hre from 'hardhat';
const { ethers } = (hre as any);

/**
 * Lightweight pseudo-fuzz + invariant checks for FreelancerEscrow & ReputationSystem.
 * NOTE: This is NOT a full property-based test harness; it samples randomized scenarios
 * to catch obvious invariant violations early.
 */

describe('Escrow & Reputation Invariants (pseudo-fuzz)', function() {
  this.timeout(60_000);
  
  async function deploy() {
    const [owner, client, freelancer, other] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory('FreelancerEscrow');
    const escrow = await Escrow.deploy(owner.address);
    await escrow.waitForDeployment();

    const Reputation = await ethers.getContractFactory('ReputationSystem');
    const reputation = await Reputation.deploy();
    await reputation.waitForDeployment();

    return { owner, client, freelancer, other, escrow, reputation };
  }

  const rnd = (max: number) => Math.floor(Math.random() * max);

  it('maintains core invariants across random milestone completion & dispute flows', async () => {
    const { client, freelancer, escrow } = await deploy();

    // Randomized batch of escrows
    const scenarioCount = 8;
    const createdIds: number[] = [];

    for (let i = 0; i < scenarioCount; i++) {
      const milestoneCount = 1 + rnd(4);
      const descs = Array.from({ length: milestoneCount }, (_, m) => `M${m}`);
      const amts = Array.from({ length: milestoneCount }, () => 1 + rnd(5));
      const total = amts.reduce((a,b)=>a+b,0);
      const deadline = Math.floor(Date.now()/1000) + 3600;
      await escrow.connect(client).createEscrow(
        freelancer.address,
        descs,
        amts,
        deadline,
        `Job-${i}`,
        { value: ethers.toBigInt(total + Math.floor(total * 25 / 1000)) } // include approx 2.5% fee (ceil bias acceptable here)
      );
      createdIds.push(i);
    }

    // Invariants we will assert while mutating:
    // 1. Sum(paid milestone amounts) <= escrow.totalAmount always.
    // 2. Escrow status transitions only escalate (Active -> Disputed/Completed/Cancelled) and never revert to Active.
    // 3. Platform fee never exceeds 10% of totalAmount.

    for (let id of createdIds) {
      const escrowData = await escrow.getEscrow(id);
      const milestones = await escrow.getMilestones(id);

      // Randomly mark & pay some milestones
      for (let mIndex = 0; mIndex < milestones.length; mIndex++) {
        if (Math.random() < 0.6) {
          await escrow.connect(freelancer).completeMilestone(id, mIndex).catch(()=>{});
          if (Math.random() < 0.6) {
            await escrow.connect(client).releaseMilestonePayment(id, mIndex).catch(()=>{});
          }
        }
      }

      // Potential dispute raise (only if still Active)
      const afterMilestones = await escrow.getEscrow(id);
      if (afterMilestones[5] === 0 && Math.random() < 0.2) { // status == Active
        await escrow.connect(client).raiseDispute(id, 'quality').catch(()=>{});
      }

      // Check invariants
      const finalData = await escrow.getEscrow(id);
      const finalMilestones = await escrow.getMilestones(id);
      const totalAmount = finalData[3];
      const platformFee = finalData[4];

      // Sum paid amounts
      // milestone tuple: description, amount, completed, paid
      let paidSum = 0n;
      for (const ms of finalMilestones) {
        if (ms.paid) paidSum += ms.amount;
      }
      expect(paidSum <= totalAmount, 'paid exceeds totalAmount').to.be.true;
      expect(platformFee <= totalAmount / 10n, 'platform fee >10%').to.be.true;

      // Status monotonic: once not Active, never back to Active
      // (We only observed single snapshot here; deeper temporal check would track prior states.)
      // Guarantee that if Completed, all milestones paid.
      const status = finalData[5];
      if (status === 1) { // Completed
        for (const ms of finalMilestones) {
          expect(ms.paid, 'completed escrow has unpaid milestone').to.be.true;
        }
      }
    }
  });

  it('reputation math averages remain consistent with weighted inputs', async () => {
    const { client, freelancer, reputation } = await deploy();
    const samples = 12;
    for (let i = 0; i < samples; i++) {
      const rating = 1 + rnd(5);
      await reputation.connect(client).submitReview(
        freelancer.address,
        10_000 + i, // escrowId placeholder distinct
        rating,
        `Comment-${i}`,
        true
      );
      const beforeVerify = await reputation.getUserReputation(freelancer.address);
      // Invariant: averageRating approx = floor(totalScore*100 / reviewCount)
      const calc1 = (beforeVerify[0] * 100n) / (beforeVerify[1] === 0n ? 1n : beforeVerify[1]);
      expect(beforeVerify[2]).to.equal(calc1);
      // Optionally verify
      if (i % 3 === 0) {
        await reputation.verifyReview(i);
        const after = await reputation.getUserReputation(freelancer.address);
        const calc2 = (after[0] * 100n) / (after[1] === 0n ? 1n : after[1]);
        expect(after[2]).to.equal(calc2);
      }
    }
  });
});
