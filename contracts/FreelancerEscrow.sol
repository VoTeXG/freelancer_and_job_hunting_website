// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FreelancerEscrow
 * @dev Smart contract for handling escrow payments between clients and freelancers
 * Features milestone-based payments, dispute resolution, and emergency functions
 */
contract FreelancerEscrow is ReentrancyGuard, Ownable, Pausable {
    
    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed client, address indexed freelancer, uint256 amount);
    event MilestoneCompleted(uint256 indexed escrowId, uint256 milestoneIndex);
    event PaymentReleased(uint256 indexed escrowId, uint256 amount, address recipient);
    event DisputeRaised(uint256 indexed escrowId, address indexed raiser, string reason);
    event DisputeResolved(uint256 indexed escrowId, address winner, uint256 clientAmount, uint256 freelancerAmount);
    event EmergencyWithdrawal(uint256 indexed escrowId, address indexed initiator);

    // Enums
    enum EscrowStatus { Active, Completed, Disputed, Cancelled }
    enum DisputeStatus { None, Pending, Resolved }

    // Structs
    struct Milestone {
        string description;
        uint256 amount;
        bool completed;
        bool paid;
    }

    struct Escrow {
        uint256 id;
        address client;
        address freelancer;
        uint256 totalAmount;
        uint256 platformFee;
        EscrowStatus status;
        DisputeStatus disputeStatus;
        Milestone[] milestones;
        uint256 createdAt;
        uint256 deadline;
        string jobDescription;
        address disputeRaiser;
        string disputeReason;
    }

    // State variables
    mapping(uint256 => Escrow) public escrows;
    mapping(address => uint256[]) public userEscrows;
    uint256 public nextEscrowId;
    uint256 public platformFeePercentage = 250; // 2.5% (250 basis points)
    address public platformWallet;
    uint256 public constant DISPUTE_TIMEOUT = 7 days;
    uint256 public constant EMERGENCY_TIMEOUT = 30 days;

    // Modifiers
    modifier onlyParties(uint256 escrowId) {
        require(
            msg.sender == escrows[escrowId].client || 
            msg.sender == escrows[escrowId].freelancer,
            "Only client or freelancer can call this"
        );
        _;
    }

    modifier escrowExists(uint256 escrowId) {
        require(escrowId < nextEscrowId, "Escrow does not exist");
        _;
    }

    modifier escrowActive(uint256 escrowId) {
        require(escrows[escrowId].status == EscrowStatus.Active, "Escrow is not active");
        _;
    }

    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    /**
     * @dev Creates a new escrow with milestones
     * @param freelancer Address of the freelancer
     * @param milestoneDescriptions Array of milestone descriptions
     * @param milestoneAmounts Array of milestone amounts
     * @param deadline Deadline for the project
     * @param jobDescription Description of the job
     */
    function createEscrow(
        address freelancer,
        string[] memory milestoneDescriptions,
        uint256[] memory milestoneAmounts,
        uint256 deadline,
        string memory jobDescription
    ) external payable nonReentrant whenNotPaused {
        require(freelancer != address(0), "Invalid freelancer address");
        require(freelancer != msg.sender, "Client cannot be freelancer");
        require(milestoneDescriptions.length == milestoneAmounts.length, "Milestone arrays length mismatch");
        require(milestoneDescriptions.length > 0, "At least one milestone required");
        require(deadline > block.timestamp, "Deadline must be in the future");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            require(milestoneAmounts[i] > 0, "Milestone amount must be greater than 0");
            totalAmount += milestoneAmounts[i];
        }

        uint256 platformFee = (totalAmount * platformFeePercentage) / 10000;
        require(msg.value == totalAmount + platformFee, "Incorrect payment amount");

        uint256 escrowId = nextEscrowId++;
        Escrow storage newEscrow = escrows[escrowId];
        
        newEscrow.id = escrowId;
        newEscrow.client = msg.sender;
        newEscrow.freelancer = freelancer;
        newEscrow.totalAmount = totalAmount;
        newEscrow.platformFee = platformFee;
        newEscrow.status = EscrowStatus.Active;
        newEscrow.disputeStatus = DisputeStatus.None;
        newEscrow.createdAt = block.timestamp;
        newEscrow.deadline = deadline;
        newEscrow.jobDescription = jobDescription;

        // Add milestones
        for (uint256 i = 0; i < milestoneDescriptions.length; i++) {
            newEscrow.milestones.push(Milestone({
                description: milestoneDescriptions[i],
                amount: milestoneAmounts[i],
                completed: false,
                paid: false
            }));
        }

        userEscrows[msg.sender].push(escrowId);
        userEscrows[freelancer].push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, freelancer, totalAmount);
    }

    /**
     * @dev Marks a milestone as completed by the freelancer
     * @param escrowId The escrow ID
     * @param milestoneIndex Index of the milestone to mark as completed
     */
    function completeMilestone(uint256 escrowId, uint256 milestoneIndex) 
        external 
        escrowExists(escrowId) 
        escrowActive(escrowId) 
        nonReentrant 
    {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.freelancer, "Only freelancer can complete milestones");
        require(milestoneIndex < escrow.milestones.length, "Invalid milestone index");
        require(!escrow.milestones[milestoneIndex].completed, "Milestone already completed");

        escrow.milestones[milestoneIndex].completed = true;
        emit MilestoneCompleted(escrowId, milestoneIndex);
    }

    /**
     * @dev Releases payment for a completed milestone
     * @param escrowId The escrow ID
     * @param milestoneIndex Index of the milestone to pay
     */
    function releaseMilestonePayment(uint256 escrowId, uint256 milestoneIndex) 
        external 
        escrowExists(escrowId) 
        escrowActive(escrowId) 
        nonReentrant 
    {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.client, "Only client can release payments");
        require(milestoneIndex < escrow.milestones.length, "Invalid milestone index");
        require(escrow.milestones[milestoneIndex].completed, "Milestone not completed");
        require(!escrow.milestones[milestoneIndex].paid, "Milestone already paid");

        escrow.milestones[milestoneIndex].paid = true;
        uint256 amount = escrow.milestones[milestoneIndex].amount;

        // Check if all milestones are paid
        bool allPaid = true;
        for (uint256 i = 0; i < escrow.milestones.length; i++) {
            if (!escrow.milestones[i].paid) {
                allPaid = false;
                break;
            }
        }

        if (allPaid) {
            escrow.status = EscrowStatus.Completed;
            // Transfer platform fee
            (bool feeSuccess, ) = platformWallet.call{value: escrow.platformFee}("");
            require(feeSuccess, "Platform fee transfer failed");
        }

        // Transfer payment to freelancer
        (bool success, ) = escrow.freelancer.call{value: amount}("");
        require(success, "Payment transfer failed");

        emit PaymentReleased(escrowId, amount, escrow.freelancer);
    }

    /**
     * @dev Raises a dispute for an escrow
     * @param escrowId The escrow ID
     * @param reason Reason for the dispute
     */
    function raiseDispute(uint256 escrowId, string memory reason) 
        external 
        escrowExists(escrowId) 
        escrowActive(escrowId) 
        onlyParties(escrowId) 
    {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.disputeStatus == DisputeStatus.None, "Dispute already raised");

        escrow.status = EscrowStatus.Disputed;
        escrow.disputeStatus = DisputeStatus.Pending;
        escrow.disputeRaiser = msg.sender;
        escrow.disputeReason = reason;

        emit DisputeRaised(escrowId, msg.sender, reason);
    }

    /**
     * @dev Resolves a dispute (only owner can call)
     * @param escrowId The escrow ID
     * @param clientAmount Amount to be paid to client
     * @param freelancerAmount Amount to be paid to freelancer
     */
    function resolveDispute(uint256 escrowId, uint256 clientAmount, uint256 freelancerAmount) 
        external 
        onlyOwner 
        escrowExists(escrowId) 
        nonReentrant 
    {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.Disputed, "Escrow is not in dispute");
        require(clientAmount + freelancerAmount <= escrow.totalAmount, "Amounts exceed total escrow");

        escrow.status = EscrowStatus.Completed;
        escrow.disputeStatus = DisputeStatus.Resolved;

        address winner = freelancerAmount > clientAmount ? escrow.freelancer : escrow.client;

        // Transfer platform fee
        (bool feeSuccess, ) = platformWallet.call{value: escrow.platformFee}("");
        require(feeSuccess, "Platform fee transfer failed");

        // Transfer amounts
        if (clientAmount > 0) {
            (bool clientSuccess, ) = escrow.client.call{value: clientAmount}("");
            require(clientSuccess, "Client payment failed");
        }

        if (freelancerAmount > 0) {
            (bool freelancerSuccess, ) = escrow.freelancer.call{value: freelancerAmount}("");
            require(freelancerSuccess, "Freelancer payment failed");
        }

        emit DisputeResolved(escrowId, winner, clientAmount, freelancerAmount);
    }

    /**
     * @dev Emergency withdrawal after timeout (only parties can call)
     * @param escrowId The escrow ID
     */
    function emergencyWithdrawal(uint256 escrowId) 
        external 
        escrowExists(escrowId) 
        onlyParties(escrowId) 
        nonReentrant 
    {
        Escrow storage escrow = escrows[escrowId];
        require(
            block.timestamp > escrow.createdAt + EMERGENCY_TIMEOUT, 
            "Emergency timeout not reached"
        );
        require(escrow.status == EscrowStatus.Active, "Escrow not active");

        escrow.status = EscrowStatus.Cancelled;

        // Refund to client minus platform fee
        uint256 refundAmount = escrow.totalAmount;
        (bool success, ) = escrow.client.call{value: refundAmount}("");
        require(success, "Refund failed");

        // Platform keeps the fee for processing
        (bool feeSuccess, ) = platformWallet.call{value: escrow.platformFee}("");
        require(feeSuccess, "Platform fee transfer failed");

        emit EmergencyWithdrawal(escrowId, msg.sender);
    }

    // View functions
    function getEscrow(uint256 escrowId) external view returns (
        uint256 id,
        address client,
        address freelancer,
        uint256 totalAmount,
        uint256 platformFee,
        EscrowStatus status,
        DisputeStatus disputeStatus,
        uint256 createdAt,
        uint256 deadline,
        string memory jobDescription
    ) {
        Escrow storage escrow = escrows[escrowId];
        return (
            escrow.id,
            escrow.client,
            escrow.freelancer,
            escrow.totalAmount,
            escrow.platformFee,
            escrow.status,
            escrow.disputeStatus,
            escrow.createdAt,
            escrow.deadline,
            escrow.jobDescription
        );
    }

    function getMilestones(uint256 escrowId) external view returns (Milestone[] memory) {
        return escrows[escrowId].milestones;
    }

    function getUserEscrows(address user) external view returns (uint256[] memory) {
        return userEscrows[user];
    }

    // Admin functions
    function setPlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, "Fee cannot exceed 10%"); // Max 10%
        platformFeePercentage = newFeePercentage;
    }

    function setPlatformWallet(address newPlatformWallet) external onlyOwner {
        require(newPlatformWallet != address(0), "Invalid platform wallet");
        platformWallet = newPlatformWallet;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
