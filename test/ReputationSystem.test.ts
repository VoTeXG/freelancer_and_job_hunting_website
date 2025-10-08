import { expect } from 'chai';
import hre from 'hardhat';
const { ethers } = hre;
import { ReputationSystem } from '../typechain-types';

describe('ReputationSystem', function () {
  let reputation: ReputationSystem;
  let owner: any;
  let reviewer: any;
  let reviewee: any;

  beforeEach(async function () {
    [owner, reviewer, reviewee] = await ethers.getSigners();
    const ReputationSystemFactory = await ethers.getContractFactory('ReputationSystem');
    reputation = (await ReputationSystemFactory.deploy()) as ReputationSystem;
  });

  it('should allow submitting and verifying a review', async function () {
    const escrowId = 1;
    const rating = 5;
    const comment = 'Great work!';

    const tx = await reputation.connect(reviewer).submitReview(
      reviewee.address,
      escrowId,
      rating,
      comment,
      true
    );
    await expect(tx).to.emit(reputation, 'ReviewSubmitted');

    const reviewId = 0; // first review
    await expect(reputation.verifyReview(reviewId)).to.emit(reputation, 'ReviewVerified');

    const userRep = await reputation.getUserReputation(reviewee.address);
    // averageRating stored * 100
    expect(userRep.averageRating).to.be.greaterThan(0);
  });

  it('should update job stats via escrow contract only (owner can set escrow address)', async function () {
    await reputation.setEscrowContract(owner.address);
    await expect(
      reputation.updateJobStats(reviewee.address, ethers.parseEther('1'), true)
    ).to.emit(reputation, 'ReputationUpdated');
  });
});
