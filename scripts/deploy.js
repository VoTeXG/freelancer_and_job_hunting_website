const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of BlockFreelancer contracts...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy FreelancerEscrow contract
  console.log("📝 Deploying FreelancerEscrow contract...");
  const FreelancerEscrowFactory = await hre.ethers.getContractFactory("FreelancerEscrow");
  const platformWallet = deployer.address; // Use deployer as platform wallet for now
  const escrow = await FreelancerEscrowFactory.deploy(platformWallet);
  await escrow.waitForDeployment();
  console.log("✅ FreelancerEscrow deployed to:", await escrow.getAddress());

  // Deploy ReputationSystem contract
  console.log("\n📝 Deploying ReputationSystem contract...");
  const ReputationSystemFactory = await hre.ethers.getContractFactory("ReputationSystem");
  const reputation = await ReputationSystemFactory.deploy();
  await reputation.waitForDeployment();
  console.log("✅ ReputationSystem deployed to:", await reputation.getAddress());

  // Deploy CertificateNFT contract
  console.log("\n📝 Deploying CertificateNFT contract...");
  const CertificateNFTFactory = await hre.ethers.getContractFactory("CertificateNFT");
  const certificate = await CertificateNFTFactory.deploy(
    "BlockFreelancer Certificates",
    "BFC",
    "https://api.blockfreelancer.com/metadata"
  );
  await certificate.waitForDeployment();
  console.log("✅ CertificateNFT deployed to:", await certificate.getAddress());

  // Set up contract relationships
  console.log("\n🔗 Setting up contract relationships...");
  
  console.log("Setting escrow contract in reputation system...");
  await reputation.setEscrowContract(await escrow.getAddress());
  
  console.log("Setting escrow contract in certificate system...");
  await certificate.setEscrowContract(await escrow.getAddress());
  
  console.log("Setting reputation contract in certificate system...");
  await certificate.setReputationContract(await reputation.getAddress());

  console.log("✅ Contract relationships established!\n");

  // Display deployment summary
  console.log("🎉 Deployment completed successfully!");
  console.log("=====================================");
  console.log("Contract Addresses:");
  console.log("- FreelancerEscrow:", await escrow.getAddress());
  console.log("- ReputationSystem:", await reputation.getAddress());
  console.log("- CertificateNFT:", await certificate.getAddress());
  console.log("=====================================");

  // Save contract addresses to a file for frontend use
  const contractAddresses = {
    FreelancerEscrow: await escrow.getAddress(),
    ReputationSystem: await reputation.getAddress(),
    CertificateNFT: await certificate.getAddress(),
    network: await hre.ethers.provider.getNetwork(),
    deployedAt: new Date().toISOString(),
    platformWallet: platformWallet
  };

  // Ensure src/contracts directory exists
  const contractsDir = path.join(__dirname, "..", "src", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, "addresses.json"),
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log("📄 Contract addresses saved to src/contracts/addresses.json");

  console.log("\n✨ Ready for frontend integration!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
