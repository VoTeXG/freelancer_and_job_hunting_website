// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CertificateNFT
 * @dev NFT contract for work completion certificates
 * Mints non-transferable certificates upon successful job completion
 */
contract CertificateNFT is ERC721, Ownable, ReentrancyGuard {
    // Events
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed freelancer,
        address indexed client,
        uint256 escrowId,
        string skill,
        uint256 projectValue
    );
    event CertificateMetadataUpdated(uint256 indexed tokenId, string newTokenURI);
    event SkillVerified(address indexed freelancer, string skill, uint256 level);

    // Structs
    struct Certificate {
        uint256 tokenId;
        address freelancer;
        address client;
        uint256 escrowId;
        string projectTitle;
        string projectDescription;
        string skill;
        uint256 projectValue;
        uint256 completionDate;
        uint8 rating; // Client's rating of the work (1-5)
        string ipfsHash; // IPFS hash for detailed project information
        bool isVerified;
    }

    struct SkillLevel {
        string skill;
        uint256 level; // 1-100 skill level
        uint256 certificateCount;
        uint256 totalProjectValue;
        uint256 lastUpdated;
    }

    // State variables
    uint256 private _tokenIdCounter;
    mapping(uint256 => Certificate) public certificates;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => uint256[]) public freelancerCertificates;
    mapping(address => mapping(string => SkillLevel)) public freelancerSkills;
    mapping(address => string[]) public freelancerSkillsList;
    mapping(uint256 => bool) public escrowCertificateMinted; // Prevent duplicate certificates
    
    address public escrowContract;
    address public reputationContract;
    string public baseTokenURI;
    
    // Certificate validation requirements
    uint256 public constant MIN_PROJECT_VALUE = 0.01 ether; // Minimum project value for certificate
    uint8 public constant MIN_RATING_FOR_CERTIFICATE = 3; // Minimum rating to earn certificate

    // Modifiers
    modifier onlyEscrowContract() {
        require(msg.sender == escrowContract, "Only escrow contract can mint");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || 
            msg.sender == escrowContract || 
            msg.sender == reputationContract,
            "Not authorized"
        );
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory _baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        baseTokenURI = _baseTokenURI;
    }

    /**
     * @dev Set the escrow contract address
     * @param _escrowContract Address of the escrow contract
     */
    function setEscrowContract(address _escrowContract) external onlyOwner {
        require(_escrowContract != address(0), "Invalid escrow contract");
        escrowContract = _escrowContract;
    }

    /**
     * @dev Set the reputation contract address
     * @param _reputationContract Address of the reputation contract
     */
    function setReputationContract(address _reputationContract) external onlyOwner {
        require(_reputationContract != address(0), "Invalid reputation contract");
        reputationContract = _reputationContract;
    }

    /**
     * @dev Mint a certificate NFT for completed work
     */
    function mintCertificate(
        address freelancer,
        address client,
        uint256 escrowId,
        string memory projectTitle,
        string memory projectDescription,
        string memory skill,
        uint256 projectValue,
        uint8 rating,
        string memory ipfsHash
    ) external onlyAuthorized nonReentrant returns (uint256) {
        require(freelancer != address(0), "Invalid freelancer address");
        require(client != address(0), "Invalid client address");
        require(!escrowCertificateMinted[escrowId], "Certificate already minted for this escrow");
        require(projectValue >= MIN_PROJECT_VALUE, "Project value too low for certificate");
        require(rating >= MIN_RATING_FOR_CERTIFICATE, "Rating too low for certificate");
        require(bytes(projectTitle).length > 0, "Project title required");
        require(bytes(skill).length > 0, "Skill required");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        // Mint the NFT to the freelancer
        _safeMint(freelancer, tokenId);

        // Store certificate data
        certificates[tokenId] = Certificate({
            tokenId: tokenId,
            freelancer: freelancer,
            client: client,
            escrowId: escrowId,
            projectTitle: projectTitle,
            projectDescription: projectDescription,
            skill: skill,
            projectValue: projectValue,
            completionDate: block.timestamp,
            rating: rating,
            ipfsHash: ipfsHash,
            isVerified: false
        });

        // Add to freelancer's certificates
        freelancerCertificates[freelancer].push(tokenId);
        escrowCertificateMinted[escrowId] = true;

        // Update freelancer's skill level
        _updateFreelancerSkill(freelancer, skill, projectValue, rating);

        // Set token URI (will generate metadata)
        string memory tokenURIString = _generateTokenURI(tokenId);
        _setTokenURI(tokenId, tokenURIString);

        emit CertificateMinted(tokenId, freelancer, client, escrowId, skill, projectValue);
        return tokenId;
    }

    /**
     * @dev Verify a certificate (only owner)
     */
    function verifyCertificate(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Certificate does not exist");
        require(!certificates[tokenId].isVerified, "Certificate already verified");

        certificates[tokenId].isVerified = true;
        
        // Boost skill level for verified certificates
        Certificate storage cert = certificates[tokenId];
        _updateFreelancerSkill(cert.freelancer, cert.skill, cert.projectValue, cert.rating + 1); // Bonus for verification
    }

    /**
     * @dev Update freelancer's skill level based on completed work
     */
    function _updateFreelancerSkill(
        address freelancer,
        string memory skill,
        uint256 projectValue,
        uint8 rating
    ) internal {
        SkillLevel storage skillLevel = freelancerSkills[freelancer][skill];
        
        // If this is a new skill for the freelancer, add it to their skills list
        if (skillLevel.lastUpdated == 0) {
            freelancerSkillsList[freelancer].push(skill);
            skillLevel.skill = skill;
        }

        skillLevel.certificateCount++;
        skillLevel.totalProjectValue += projectValue;
        skillLevel.lastUpdated = block.timestamp;

        // Calculate new skill level (1-100)
        uint256 baseLevel = skillLevel.certificateCount * 5; // 5 points per certificate
        uint256 ratingBonus = (rating - 1) * 2; // 0-8 bonus points based on rating
        uint256 valueBonus = (projectValue / 0.1 ether); // 1 point per 0.1 ETH, capped at 20
        if (valueBonus > 20) valueBonus = 20;

        uint256 newLevel = baseLevel + ratingBonus + valueBonus;
        if (newLevel > 100) newLevel = 100; // Cap at 100

        skillLevel.level = newLevel;

        emit SkillVerified(freelancer, skill, newLevel);
    }

    /**
     * @dev Generate metadata URI for a certificate
     */
    function _generateTokenURI(uint256 tokenId) internal view returns (string memory) {
        return string(abi.encodePacked(
            baseTokenURI,
            "/",
            Strings.toString(tokenId),
            ".json"
        ));
    }

    /**
     * @dev Set token URI
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @dev Override tokenURI to return our custom URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Certificate does not exist");
        
        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }

        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override _baseURI
     */
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    // View functions
    function getCertificate(uint256 tokenId) external view returns (
        uint256 id,
        address freelancer,
        address client,
        uint256 escrowId,
        string memory projectTitle,
        string memory projectDescription,
        string memory skill,
        uint256 projectValue,
        uint256 completionDate,
        uint8 rating,
        string memory ipfsHash,
        bool isVerified
    ) {
        Certificate storage cert = certificates[tokenId];
        return (
            cert.tokenId,
            cert.freelancer,
            cert.client,
            cert.escrowId,
            cert.projectTitle,
            cert.projectDescription,
            cert.skill,
            cert.projectValue,
            cert.completionDate,
            cert.rating,
            cert.ipfsHash,
            cert.isVerified
        );
    }

    function getFreelancerCertificates(address freelancer) external view returns (uint256[] memory) {
        return freelancerCertificates[freelancer];
    }

    function getFreelancerSkills(address freelancer) external view returns (string[] memory) {
        return freelancerSkillsList[freelancer];
    }

    function getFreelancerSkillLevel(address freelancer, string memory skill) external view returns (
        uint256 level,
        uint256 certificateCount,
        uint256 totalProjectValue,
        uint256 lastUpdated
    ) {
        SkillLevel storage skillLevel = freelancerSkills[freelancer][skill];
        return (
            skillLevel.level,
            skillLevel.certificateCount,
            skillLevel.totalProjectValue,
            skillLevel.lastUpdated
        );
    }

    function getCertificatesBySkill(string memory skill, uint256 limit) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory result = new uint256[](limit);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= _tokenIdCounter && count < limit; i++) {
            if (keccak256(bytes(certificates[i].skill)) == keccak256(bytes(skill))) {
                result[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory finalResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        
        return finalResult;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // Admin functions
    function setBaseTokenURI(string memory _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    function updateCertificateMetadata(uint256 tokenId, string memory newTokenURI) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Certificate does not exist");
        _setTokenURI(tokenId, newTokenURI);
        emit CertificateMetadataUpdated(tokenId, newTokenURI);
    }
}
