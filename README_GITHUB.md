# BlockFreelancer - Blockchain Freelance Platform

## 🎯 Overview
A comprehensive blockchain-based freelancing platform with smart contracts, real-time features, and multi-token payments.

## ✅ Current Status: Phase 4 Complete
- **Phase 1**: Foundation & Core Setup ✅ COMPLETED
- **Phase 2**: Core Functionality Development ✅ COMPLETED  
- **Phase 3**: Blockchain Integration ✅ COMPLETED
- **Phase 4**: Advanced Features ✅ COMPLETED

## 🚀 Key Features

### 🔗 Blockchain Integration
- **Smart Contract Escrow**: Milestone-based payments with dispute resolution
- **NFT Certificates**: ERC-721 tokens for completed work verification
- **On-chain Reputation**: Immutable review and rating system
- **Multi-token Payments**: Support for ETH, USDC, USDT, DAI

### 💬 Real-time Features
- **Live Notifications**: Socket.IO powered real-time updates
- **Professional Messaging**: Chat system with file sharing
- **User Presence**: Online/offline status indicators
- **Instant Updates**: Job applications, payments, milestones

### 📊 Advanced Analytics
- **Financial Dashboard**: Comprehensive earnings tracking
- **Performance Metrics**: Success rates and trend analysis
- **Multi-currency Support**: Real-time balance tracking
- **Payment History**: Complete transaction records

### 🤖 AI-Powered Matching
- **Smart Job Matching**: Percentage-based compatibility scores
- **Skill Analysis**: Advanced filtering and recommendations
- **Dynamic Search**: Real-time filtering with multiple criteria

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hooks** and modern patterns

### Blockchain
- **Ethereum** smart contracts
- **Hardhat** development environment
- **OpenZeppelin** security standards
- **Wagmi + RainbowKit** for Web3 integration

### Backend
- **PostgreSQL** database
- **Prisma ORM** for type-safe queries
- **Next.js API Routes**
- **Socket.IO** for real-time features

### Storage & Infrastructure
- **IPFS/Helia** for decentralized storage
- **JWT** authentication
- **Git** version control

## 📋 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd freelancer_and_job_hunting_website

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database and other configurations

# Set up database
npx prisma migrate dev
npx prisma generate

# Compile smart contracts
npx hardhat compile

# Start local blockchain (in separate terminal)
npx hardhat node

# Deploy smart contracts to local network
npx hardhat run scripts/deploy.ts --network localhost

# Start development server
npm run dev
```

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/freelancer_db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Blockchain
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL="http://127.0.0.1:8545"
```

## 🏗️ Project Structure

```
├── contracts/           # Smart contracts (Solidity)
├── src/
│   ├── app/            # Next.js app router pages
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   ├── providers/      # React context providers
│   └── types/          # TypeScript type definitions
├── prisma/             # Database schema and migrations
├── scripts/            # Deployment scripts
└── test/               # Smart contract tests
```

## 🧪 Testing

```bash
# Run smart contract tests
npx hardhat test

# Run frontend build
npm run build

# Type checking
npm run type-check
```

## 🚀 Deployment

### Smart Contracts
```bash
# Deploy to testnet (e.g., Sepolia)
npx hardhat run scripts/deploy.ts --network sepolia

# Verify contracts
npx hardhat verify --network sepolia <contract-address>
```

### Frontend
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📖 Key Components
## 📚 Additional Docs
- Developer Guide: `docs/DEVELOPER_GUIDE.md`
- Public Roadmap: `docs/ROADMAP_PUBLIC.md`
- Changelog: `CHANGELOG.md`
- Support: `.github/SUPPORT.md`


### Smart Contracts
- **FreelancerEscrow.sol**: Multi-party escrow with milestones
- **ReputationSystem.sol**: On-chain reviews and ratings  
- **CertificateNFT.sol**: ERC-721 work certificates

### Frontend Features
- **Real-time Dashboard**: Complete project overview
- **Job Management**: Creation, applications, tracking
- **Wallet Integration**: Seamless Web3 connectivity
- **File Management**: IPFS integration for decentralized storage

## 🎓 Academic Contribution

This project demonstrates:
- **Blockchain Application Development**: Real-world smart contract implementation
- **Decentralized Systems**: IPFS integration and Web3 patterns
- **Modern Web Development**: Full-stack TypeScript application
- **User Experience Design**: Professional UI/UX for blockchain apps
- **Security Best Practices**: Smart contract security and Web3 safety

## 🤝 Contributing

This is a thesis project, but contributions and suggestions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is created for academic purposes. Please contact for licensing information.

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Hardhat team for excellent development tools
- Next.js team for the amazing framework
- Web3 community for inspiration and resources

---

**Built with ❤️ for blockchain innovation and decentralized freelancing**

*Last Updated: July 31, 2025*
