# BlockFreelancer - Blockchain Freelance Platform

A modern, decentralized freelance platform built with Next.js, TypeScript, and Web3 technologies. This thesis project demonstrates the integration of blockchain technology into freelance work, providing secure payments, transparent reputation systems, and decentralized identity management.

## 🌟 Features

### Core Functionality
- **Freelancer Profiles**: Comprehensive profiles with skills, portfolios, and blockchain-verified certifications
- **Job Listings**: Smart contract-integrated job postings with escrow payment systems
- **Secure Payments**: Cryptocurrency payments with automatic escrow release
- **Reputation System**: Immutable on-chain reviews and ratings
- **NFT Certificates**: Blockchain-based work completion certificates

### Blockchain Integration
- **Wallet Connection**: MetaMask and WalletConnect support
- **Multi-chain Support**: Ethereum, Polygon, Arbitrum, Optimism, Base
- **Smart Contracts**: Escrow systems for secure payments
- **Token Support**: ETH, USDC, USDT payments
- **Decentralized Identity**: Wallet-based authentication

### User Experience
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Advanced Filtering**: Skills, budget, availability, and rating filters
- **Real-time Updates**: Live job and freelancer status updates
- **Professional UI**: Clean, modern interface with accessibility features

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Headless UI** - Accessible UI components
- **Heroicons** - Beautiful SVG icons

### Blockchain
- **Wagmi** - React hooks for Ethereum
- **RainbowKit** - Wallet connection UI
- **Ethers.js** - Ethereum library
- **Viem** - TypeScript interface for Ethereum

### Development
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Git** - Version control

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- MetaMask or compatible wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd freelancer_and_job_hunting_website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x...
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── freelancers/       # Freelancer browsing page
│   ├── jobs/              # Job listings page
│   ├── profile/           # User profile page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── FreelancerCard.tsx
│   ├── JobListing.tsx
│   └── Navigation.tsx
├── hooks/                # Custom React hooks
│   ├── useWallet.ts      # Wallet connection
│   └── useContract.ts    # Smart contract interactions
├── lib/                  # Utility functions
│   └── utils.ts
├── providers/            # React context providers
│   └── Web3Provider.tsx
└── types/                # TypeScript definitions
    └── index.ts
```

## 🔗 Key Components

### Navigation
- Responsive navigation with wallet connection
- Mobile-friendly hamburger menu
- Clear routing to main sections

### Homepage
- Hero section with compelling value proposition
- Feature highlights with blockchain benefits
- Statistics and call-to-action sections

### Job Listings
- Advanced filtering by skills, budget, and timeline
- Real-time search functionality
- Detailed job cards with client information

### Freelancer Profiles
- Skill-based filtering and sorting
- Availability status and hourly rates
- Portfolio and certification display

### Profile Management
- Wallet integration and earnings tracking
- NFT certification showcase
- Work history and reputation display

## 🔐 Blockchain Features

### Smart Contract Integration
```typescript
// Example escrow creation
const { createEscrow } = useEscrow();
await createEscrow(freelancerAddress, paymentAmount);
```

### Wallet Connection
```typescript
// Connect wallet
const { connectWallet, wallet } = useWallet();
await connectWallet('metaMask');
```

### Payment Processing
- Automatic escrow creation on job acceptance
- Milestone-based payment release
- Dispute resolution mechanisms

## 🎨 UI/UX Design

### Design Principles
- **Accessibility**: WCAG compliant components
- **Mobile-First**: Responsive design for all devices
- **Performance**: Optimized loading and interactions
- **User-Friendly**: Intuitive navigation and clear feedback

### Color Scheme
- Primary: Blue (#2563EB)
- Secondary: Gray (#6B7280)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Quality
- TypeScript for type safety
- ESLint for code consistency
- Prettier for code formatting

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Next.js Team** - For the excellent React framework
- **Wagmi Team** - For Web3 React hooks
- **RainbowKit** - For wallet connection UI
- **Tailwind CSS** - For utility-first styling

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Contact: [your-email@example.com]

---

**Note**: This is a thesis project demonstrating blockchain integration in freelance platforms. For production use, ensure proper smart contract audits and security measures.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
