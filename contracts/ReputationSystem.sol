// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReputationSystem
 * @dev Smart contract for managing on-chain reputation and reviews
 * Provides transparent, immutable feedback system for freelancers and clients
 */
contract ReputationSystem is Ownable, ReentrancyGuard {
    
    // Events
    event ReviewSubmitted(
        uint256 indexed reviewId,
        address indexed reviewer,
        address indexed reviewee,
        uint256 escrowId,
        uint8 rating,
        string comment
    );
    event ReviewVerified(uint256 indexed reviewId, bool verified);
    event ReputationUpdated(address indexed user, uint256 newScore, uint256 totalReviews);

    // Structs
    struct Review {
        uint256 id;
        address reviewer;
        address reviewee;
        uint256 escrowId;
        uint8 rating; // 1-5 stars
        string comment;
        uint256 timestamp;
        bool verified;
        bool isFreelancerReview; // true if reviewing freelancer, false if reviewing client
    }

    struct ReputationScore {
        uint256 totalScore;
        uint256 reviewCount;
        uint256 averageRating; // Calculated rating * 100 for precision (e.g., 450 = 4.5 stars)
        uint256 completedJobs;
        uint256 totalEarnings; // For freelancers
        uint256 totalSpent; // For clients
        bool isVerified;
    }

    // State variables
    mapping(uint256 => Review) public reviews;
    mapping(address => ReputationScore) public reputations;
    mapping(address => uint256[]) public userReviews; // Reviews received by user
    mapping(address => uint256[]) public userSubmittedReviews; // Reviews submitted by user
    mapping(uint256 => bool) public escrowReviewed; // Track if escrow has been reviewed
    mapping(address => mapping(address => bool)) public hasReviewedUser; // Prevent duplicate reviews
    
    uint256 public nextReviewId;
    address public escrowContract;
    uint256 public constant MIN_RATING = 1;
    uint256 public constant MAX_RATING = 5;
    uint256 public constant REPUTATION_DECAY_PERIOD = 365 days; // Reputation slowly decays over time

    // Modifiers
    modifier onlyEscrowContract() {
        require(msg.sender == escrowContract, "Only escrow contract can call");
        _;
    }

    modifier validRating(uint8 rating) {
        require(rating >= MIN_RATING && rating <= MAX_RATING, "Rating must be between 1 and 5");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Sets the escrow contract address
     * @param _escrowContract Address of the escrow contract
     */
    function setEscrowContract(address _escrowContract) external onlyOwner {
        require(_escrowContract != address(0), "Invalid escrow contract address");
        escrowContract = _escrowContract;
    }

    /**
     * @dev Submits a review for a completed escrow
     * @param reviewee Address of the user being reviewed
     * @param escrowId ID of the completed escrow
     * @param rating Rating from 1-5
     * @param comment Text review comment
     * @param isFreelancerReview True if reviewing freelancer, false if reviewing client
     */
    function submitReview(
        address reviewee,
        uint256 escrowId,
        uint8 rating,
        string memory comment,
        bool isFreelancerReview
    ) external validRating(rating) nonReentrant {
        require(reviewee != address(0), "Invalid reviewee address");
        require(reviewee != msg.sender, "Cannot review yourself");
        require(!escrowReviewed[escrowId], "Escrow already reviewed");
        require(!hasReviewedUser[msg.sender][reviewee], "Already reviewed this user");
        require(bytes(comment).length > 0, "Comment cannot be empty");
        require(bytes(comment).length <= 500, "Comment too long");

        // TODO: Verify that the escrow exists and is completed
        // This would require integration with the escrow contract

        uint256 reviewId = nextReviewId++;
        
        reviews[reviewId] = Review({
            id: reviewId,
            reviewer: msg.sender,
            reviewee: reviewee,
            escrowId: escrowId,
            rating: rating,
            comment: comment,
            timestamp: block.timestamp,
            verified: false, // Will be verified by escrow contract or admin
            isFreelancerReview: isFreelancerReview
        });

        userReviews[reviewee].push(reviewId);
        userSubmittedReviews[msg.sender].push(reviewId);
        escrowReviewed[escrowId] = true;
        hasReviewedUser[msg.sender][reviewee] = true;

        // Update reputation immediately (will be recalculated when verified)
        _updateReputation(reviewee, rating, false);

        emit ReviewSubmitted(reviewId, msg.sender, reviewee, escrowId, rating, comment);
    }

    /**
     * @dev Verifies a review (only owner or escrow contract)
     * @param reviewId ID of the review to verify
     */
    function verifyReview(uint256 reviewId) external {
        require(
            msg.sender == owner() || msg.sender == escrowContract,
            "Only owner or escrow contract can verify"
        );
    // Use reviewId bounds to validate existence (supports reviewId = 0)
    require(reviewId < nextReviewId, "Review does not exist");
        require(!reviews[reviewId].verified, "Review already verified");

        reviews[reviewId].verified = true;
        
        // Recalculate reputation with verified status
        _updateReputation(reviews[reviewId].reviewee, reviews[reviewId].rating, true);

        emit ReviewVerified(reviewId, true);
    }

    /**
     * @dev Updates job completion stats for reputation
     * @param user Address of the user
     * @param earnings Amount earned (for freelancers) or spent (for clients)
     * @param isFreelancer True if user is freelancer, false if client
     */
    function updateJobStats(address user, uint256 earnings, bool isFreelancer) external onlyEscrowContract {
        ReputationScore storage reputation = reputations[user];
        reputation.completedJobs++;
        
        if (isFreelancer) {
            reputation.totalEarnings += earnings;
        } else {
            reputation.totalSpent += earnings;
        }

        emit ReputationUpdated(user, reputation.totalScore, reputation.reviewCount);
    }

    /**
     * @dev Internal function to update reputation score
     * @param user Address of the user
     * @param rating New rating to add
     * @param isVerified Whether the review is verified
     */
    function _updateReputation(address user, uint8 rating, bool isVerified) internal {
        ReputationScore storage reputation = reputations[user];
        
        // Weight verified reviews more heavily
        uint256 weight = isVerified ? 2 : 1;
        uint256 weightedRating = rating * weight;
        
        reputation.totalScore += weightedRating;
        reputation.reviewCount += weight;
        
        // Calculate average rating with 2 decimal precision (* 100)
        reputation.averageRating = (reputation.totalScore * 100) / reputation.reviewCount;

        emit ReputationUpdated(user, reputation.totalScore, reputation.reviewCount);
    }

    /**
     * @dev Manually verify a user (KYC verification)
     * @param user Address of the user to verify
     */
    function verifyUser(address user) external onlyOwner {
        reputations[user].isVerified = true;
    }

    /**
     * @dev Remove user verification
     * @param user Address of the user to unverify
     */
    function unverifyUser(address user) external onlyOwner {
        reputations[user].isVerified = false;
    }

    // View functions
    function getReview(uint256 reviewId) external view returns (
        uint256 id,
        address reviewer,
        address reviewee,
        uint256 escrowId,
        uint8 rating,
        string memory comment,
        uint256 timestamp,
        bool verified,
        bool isFreelancerReview
    ) {
        Review storage review = reviews[reviewId];
        return (
            review.id,
            review.reviewer,
            review.reviewee,
            review.escrowId,
            review.rating,
            review.comment,
            review.timestamp,
            review.verified,
            review.isFreelancerReview
        );
    }

    function getUserReputation(address user) external view returns (
        uint256 totalScore,
        uint256 reviewCount,
        uint256 averageRating,
        uint256 completedJobs,
        uint256 totalEarnings,
        uint256 totalSpent,
        bool isVerified
    ) {
        ReputationScore storage reputation = reputations[user];
        return (
            reputation.totalScore,
            reputation.reviewCount,
            reputation.averageRating,
            reputation.completedJobs,
            reputation.totalEarnings,
            reputation.totalSpent,
            reputation.isVerified
        );
    }

    function getUserReviews(address user) external view returns (uint256[] memory) {
        return userReviews[user];
    }

    function getUserSubmittedReviews(address user) external view returns (uint256[] memory) {
        return userSubmittedReviews[user];
    }

    /**
     * @dev Get paginated reviews for a user
     * @param user Address of the user
     * @param offset Starting index
     * @param limit Number of reviews to return
     */
    function getUserReviewsPaginated(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (uint256[] memory reviewIds, uint256 total) 
    {
        uint256[] storage allReviews = userReviews[user];
        total = allReviews.length;
        
        if (offset >= total) {
            return (new uint256[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 length = end - offset;
        reviewIds = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            reviewIds[i] = allReviews[offset + i];
        }
    }

    /**
     * @dev Calculate reputation score with time decay
     * @param user Address of the user
     * @return Adjusted reputation score considering time decay
     */
    function getAdjustedReputationScore(address user) external view returns (uint256) {
        ReputationScore storage reputation = reputations[user];
        if (reputation.reviewCount == 0) {
            return 0;
        }

        // Simple time decay: reduce score by 1% every 30 days, minimum 50% of original
        uint256 daysSinceLastReview = (block.timestamp - _getLastReviewTime(user)) / 1 days;
        uint256 decayFactor = 100 - (daysSinceLastReview / 30); // 1% decay per 30 days
        if (decayFactor < 50) {
            decayFactor = 50; // Minimum 50% of reputation retained
        }

        return (reputation.averageRating * decayFactor) / 100;
    }

    /**
     * @dev Get the timestamp of the user's most recent review
     * @param user Address of the user
     * @return Timestamp of most recent review
     */
    function _getLastReviewTime(address user) internal view returns (uint256) {
        uint256[] storage reviewIds = userReviews[user];
        if (reviewIds.length == 0) {
            return block.timestamp;
        }
        
        uint256 latestTime = 0;
        for (uint256 i = 0; i < reviewIds.length; i++) {
            if (reviews[reviewIds[i]].timestamp > latestTime) {
                latestTime = reviews[reviewIds[i]].timestamp;
            }
        }
        
        return latestTime > 0 ? latestTime : block.timestamp;
    }

    /**
     * @dev Get top rated users
     * @param isFreelancer True to get top freelancers, false for top clients
     * @param limit Maximum number of users to return
     * @return Array of user addresses sorted by reputation
     */
    function getTopRatedUsers(bool isFreelancer, uint256 limit) 
        external 
        view 
        returns (address[] memory) 
    {
        // Note: This is a simplified implementation
        // In production, you'd want to implement this more efficiently
        // possibly with off-chain indexing
        
        // This function would need to be implemented with proper sorting
        // For now, returning empty array as placeholder
        return new address[](0);
    }
}
