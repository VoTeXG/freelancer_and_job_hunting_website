import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { FreelancerEscrow, ReputationSystem, CertificateNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FreelancerEscrow", function () {
  let escrow: FreelancerEscrow;
  let reputation: ReputationSystem;
  let certificate: CertificateNFT;
  let owner: SignerWithAddress;
  let client: SignerWithAddress;
  let freelancer: SignerWithAddress;
  let platform: SignerWithAddress;

  const PLATFORM_FEE_PERCENTAGE = 250; // 2.5%
  const PROJECT_VALUE = ethers.parseEther("1");
  const PLATFORM_FEE = (PROJECT_VALUE * BigInt(PLATFORM_FEE_PERCENTAGE)) / BigInt(10000);
  const TOTAL_PAYMENT = PROJECT_VALUE + PLATFORM_FEE;

  beforeEach(async function () {
    [owner, client, freelancer, platform] = await ethers.getSigners();

    // Deploy contracts
    const FreelancerEscrowFactory = await ethers.getContractFactory("FreelancerEscrow");
    escrow = await FreelancerEscrowFactory.deploy(platform.address);

    const ReputationSystemFactory = await ethers.getContractFactory("ReputationSystem");
    reputation = await ReputationSystemFactory.deploy();

    const CertificateNFTFactory = await ethers.getContractFactory("CertificateNFT");
    certificate = await CertificateNFTFactory.deploy(
      "BlockFreelancer Certificates",
      "BFC",
      "https://api.blockfreelancer.com/metadata"
    );

    // Set up contract relationships
    await reputation.setEscrowContract(await escrow.getAddress());
    await certificate.setEscrowContract(await escrow.getAddress());
    await certificate.setReputationContract(await reputation.getAddress());
  });

  describe("Escrow Creation", function () {
    it("Should create an escrow with milestones", async function () {
      const milestoneDescriptions = ["Design phase", "Development phase", "Testing phase"];
      const milestoneAmounts = [
        ethers.parseEther("0.3"),
        ethers.parseEther("0.5"),
        ethers.parseEther("0.2")
      ];
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now
      const jobDescription = "Build a DeFi application";

      await expect(
        escrow.connect(client).createEscrow(
          freelancer.address,
          milestoneDescriptions,
          milestoneAmounts,
          deadline,
          jobDescription,
          { value: TOTAL_PAYMENT }
        )
      ).to.emit(escrow, "EscrowCreated")
        .withArgs(0, client.address, freelancer.address, PROJECT_VALUE);

      const escrowData = await escrow.getEscrow(0);
      expect(escrowData.client).to.equal(client.address);
      expect(escrowData.freelancer).to.equal(freelancer.address);
      expect(escrowData.totalAmount).to.equal(PROJECT_VALUE);
      expect(escrowData.platformFee).to.equal(PLATFORM_FEE);

      const milestones = await escrow.getMilestones(0);
      expect(milestones.length).to.equal(3);
      expect(milestones[0].description).to.equal("Design phase");
      expect(milestones[0].amount).to.equal(ethers.parseEther("0.3"));
    });

    it("Should fail with insufficient payment", async function () {
      const milestoneDescriptions = ["Phase 1"];
      const milestoneAmounts = [PROJECT_VALUE];
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30;
      const jobDescription = "Test project";

      await expect(
        escrow.connect(client).createEscrow(
          freelancer.address,
          milestoneDescriptions,
          milestoneAmounts,
          deadline,
          jobDescription,
          { value: PROJECT_VALUE } // Missing platform fee
        )
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should fail with invalid freelancer address", async function () {
      const milestoneDescriptions = ["Phase 1"];
      const milestoneAmounts = [PROJECT_VALUE];
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30;
      const jobDescription = "Test project";

      await expect(
        escrow.connect(client).createEscrow(
          ethers.ZeroAddress,
          milestoneDescriptions,
          milestoneAmounts,
          deadline,
          jobDescription,
          { value: TOTAL_PAYMENT }
        )
      ).to.be.revertedWith("Invalid freelancer address");
    });
  });

  describe("Milestone Management", function () {
    let escrowId: number;

    beforeEach(async function () {
      const milestoneDescriptions = ["Phase 1", "Phase 2"];
      const milestoneAmounts = [
        ethers.parseEther("0.6"),
        ethers.parseEther("0.4")
      ];
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30;
      const jobDescription = "Test project";

      await escrow.connect(client).createEscrow(
        freelancer.address,
        milestoneDescriptions,
        milestoneAmounts,
        deadline,
        jobDescription,
        { value: TOTAL_PAYMENT }
      );
      escrowId = 0;
    });

    it("Should allow freelancer to complete milestones", async function () {
      await expect(
        escrow.connect(freelancer).completeMilestone(escrowId, 0)
      ).to.emit(escrow, "MilestoneCompleted")
        .withArgs(escrowId, 0);

      const milestones = await escrow.getMilestones(escrowId);
      expect(milestones[0].completed).to.be.true;
      expect(milestones[1].completed).to.be.false;
    });

    it("Should fail if non-freelancer tries to complete milestone", async function () {
      await expect(
        escrow.connect(client).completeMilestone(escrowId, 0)
      ).to.be.revertedWith("Only freelancer can complete milestones");
    });

    it("Should allow client to release payment for completed milestone", async function () {
      // Freelancer completes milestone
      await escrow.connect(freelancer).completeMilestone(escrowId, 0);

      const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);

      // Client releases payment
      await expect(
        escrow.connect(client).releaseMilestonePayment(escrowId, 0)
      ).to.emit(escrow, "PaymentReleased")
        .withArgs(escrowId, ethers.parseEther("0.6"), freelancer.address);

      const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
      expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(ethers.parseEther("0.6"));

      const milestones = await escrow.getMilestones(escrowId);
      expect(milestones[0].paid).to.be.true;
    });

    it("Should fail to release payment for incomplete milestone", async function () {
      await expect(
        escrow.connect(client).releaseMilestonePayment(escrowId, 0)
      ).to.be.revertedWith("Milestone not completed");
    });

    it("Should complete escrow when all milestones are paid", async function () {
      // Complete and pay both milestones
      await escrow.connect(freelancer).completeMilestone(escrowId, 0);
      await escrow.connect(client).releaseMilestonePayment(escrowId, 0);
      
      await escrow.connect(freelancer).completeMilestone(escrowId, 1);
      await escrow.connect(client).releaseMilestonePayment(escrowId, 1);

      const escrowData = await escrow.getEscrow(escrowId);
      expect(escrowData.status).to.equal(1); // EscrowStatus.Completed
    });
  });

  describe("Dispute Management", function () {
    let escrowId: number;

    beforeEach(async function () {
      const milestoneDescriptions = ["Phase 1"];
      const milestoneAmounts = [PROJECT_VALUE];
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30;
      const jobDescription = "Test project";

      await escrow.connect(client).createEscrow(
        freelancer.address,
        milestoneDescriptions,
        milestoneAmounts,
        deadline,
        jobDescription,
        { value: TOTAL_PAYMENT }
      );
      escrowId = 0;
    });

    it("Should allow parties to raise disputes", async function () {
      const disputeReason = "Work not completed as agreed";

      await expect(
        escrow.connect(client).raiseDispute(escrowId, disputeReason)
      ).to.emit(escrow, "DisputeRaised")
        .withArgs(escrowId, client.address, disputeReason);

      const escrowData = await escrow.getEscrow(escrowId);
      expect(escrowData.status).to.equal(2); // EscrowStatus.Disputed
      expect(escrowData.disputeStatus).to.equal(1); // DisputeStatus.Pending
    });

    it("Should allow owner to resolve disputes", async function () {
      // Raise dispute first
      await escrow.connect(client).raiseDispute(escrowId, "Dispute reason");

      const clientAmount = ethers.parseEther("0.3");
      const freelancerAmount = ethers.parseEther("0.7");

      const clientBalanceBefore = await ethers.provider.getBalance(client.address);
      const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);

      await expect(
        escrow.connect(owner).resolveDispute(escrowId, clientAmount, freelancerAmount)
      ).to.emit(escrow, "DisputeResolved");

      const clientBalanceAfter = await ethers.provider.getBalance(client.address);
      const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);

      expect(clientBalanceAfter - clientBalanceBefore).to.equal(clientAmount);
      expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(freelancerAmount);

      const escrowData = await escrow.getEscrow(escrowId);
      expect(escrowData.status).to.equal(1); // EscrowStatus.Completed
    });
  });

  describe("Emergency Withdrawal", function () {
    let escrowId: number;

    beforeEach(async function () {
      const milestoneDescriptions = ["Phase 1"];
      const milestoneAmounts = [PROJECT_VALUE];
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30;
      const jobDescription = "Test project";

      await escrow.connect(client).createEscrow(
        freelancer.address,
        milestoneDescriptions,
        milestoneAmounts,
        deadline,
        jobDescription,
        { value: TOTAL_PAYMENT }
      );
      escrowId = 0;
    });

    it("Should fail emergency withdrawal before timeout", async function () {
      await expect(
        escrow.connect(client).emergencyWithdrawal(escrowId)
      ).to.be.revertedWith("Emergency timeout not reached");
    });

    it("Should allow emergency withdrawal after timeout", async function () {
      // Fast forward time by 31 days
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const clientBalanceBefore = await ethers.provider.getBalance(client.address);

      await expect(
        escrow.connect(client).emergencyWithdrawal(escrowId)
      ).to.emit(escrow, "EmergencyWithdrawal")
        .withArgs(escrowId, client.address);

      const clientBalanceAfter = await ethers.provider.getBalance(client.address);
      
      // Client should get back the project value (platform keeps fee)
      expect(clientBalanceAfter).to.be.gt(clientBalanceBefore);

      const escrowData = await escrow.getEscrow(escrowId);
      expect(escrowData.status).to.equal(3); // EscrowStatus.Cancelled
    });
  });
});
