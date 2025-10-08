# BlockFreelancer - Blockchain Freelance Platform

[![Script Consistency Status](https://github.com/OWNER_ORG/REPO_NAME/actions/workflows/script-consistency.yml/badge.svg)](./.github/workflows/script-consistency.yml)

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
- **Sentry (optional)** - Error tracking & performance tracing
- **Usage Events (optional)** - Lightweight analytics (console + optional PostHog) via `recordEvent` & `AnalyticsProvider`
- **In-Memory Metrics (dev)** - Ephemeral counters & recent events at `/admin/metrics`

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
   SENTRY_DSN=your_sentry_dsn  # optional
   NEXT_PUBLIC_POSTHOG_KEY=phc_XXXX   # optional (usage events)
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com  # optional override for usage events
   # Admin wallets (comma-separated) to enable metrics/health endpoints scope
   ADMIN_WALLETS=0xAdminWallet1,0xAdminWallet2
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
- `npm run typecheck` - TypeScript type checks
- `npm run budget:responses` - Check API response payload budgets (requires dev server)
- `npm run check:scripts` (if listed) OR `npx tsx scripts/check-scripts.ts` - Verify required script entries & detect parent lockfile conflicts
 - Playwright E2E: `npm run test:e2e` (UI: `npm run test:e2e:ui`)
 - k6 baseline (optional):
    - Install k6 (https://k6.io/docs/get-started/installation/)
    - Start dev server
    - Run: `k6 run scripts/perf/k6-baseline.js` (optionally `BASE_URL=https://your-host`)

### CI Workflows
- Script Consistency & Typecheck (`.github/workflows/script-consistency.yml`)
  - Runs on push/PR to master/main
  - Steps: install deps, run script consistency checker (`scripts/check-scripts.ts`), then TypeScript typecheck
  - Fails fast if required scripts missing or types break

#### Script Consistency Checker Details
The checker distinguishes between:

Required scripts (errors if missing):
`dev`, `build`, `start`, `lint`, `typecheck`, `prisma:generate`

Recommended scripts (warnings if missing):
`seed:admin`, `check:scripts`, `budget:responses`

Run manually:
```
npx tsx scripts/check-scripts.ts
```

Auto-fix missing required scripts (adds safe defaults):
```
npx tsx scripts/check-scripts.ts --fix
```

Auto-fix required + recommended:
```
npx tsx scripts/check-scripts.ts --fix=all
```

If you consistently see a required script reported missing even though it's present in `package.json`, check for parent `package-lock.json` files (the checker warns about these) and remove or isolate them to avoid npm resolution anomalies.

### Code Quality
- TypeScript for type safety
- ESLint for code consistency
- Prettier for code formatting

### Bundle Analyzer
- Add dev dependency: `@next/bundle-analyzer`
- Enable by setting ANALYZE=true for build
- Example (PowerShell): `$env:ANALYZE='true'; npm run build`

### Security: CSRF usage (double-submit)
- The server issues a `csrf_token` cookie when you call `POST /api/auth/nonce`.
- Use the `apiFetch` helper (`src/lib/utils.ts`) which automatically sets the `X-CSRF-Token` header from the cookie for POST/PUT/PATCH/DELETE.
- If calling fetch manually, include `credentials: 'include'` and set `X-CSRF-Token` to the cookie value.

Troubleshooting “Missing CSRF token”:
- The app bootstraps the CSRF cookie on first load by calling `/api/auth/nonce` (see `ClientProviders.tsx`). If you see this error:
   - Ensure you’re on the same origin as configured by `NEXT_PUBLIC_APP_ORIGIN` (CORS/Origin checks apply).
   - Make sure requests include `credentials: 'include'` so cookies are sent.
   - If a refresh fails due to CSRF, the client will fetch `/api/auth/nonce` and retry once automatically.
   - For API calls from external tools (curl/Postman), include the `csrf_token` cookie and send the same value in `X-CSRF-Token` header. The nonce endpoint (`POST /api/auth/nonce`) returns and sets it.

### CI: API response budgets
- GitHub Actions workflow (`.github/workflows/response-budgets.yml`) enforces payload budgets using `scripts/check-response-sizes.cjs`.
- Optional secret `PROFILE_BUDGET_BEARER` enables checking `/api/profile`; otherwise it’s skipped.
- Local run:
   1. Start dev server
   2. Run `npm run budget:responses`

    ## 🔎 Observability
    ### Usage Events & Metrics
    - `recordEvent(name, payload?)` server & client utility logs structured JSON to console and optional PostHog (if `NEXT_PUBLIC_POSTHOG_KEY`).
    - Events automatically increment in-memory counters & a recent-events ring buffer.
    - Admin metrics endpoint: `GET /api/admin/metrics` (requires `admin:all` scope) returns:
       - `counters` (e.g., `events.total`, `events.error`, `event.jobs.list`)
       - `events.error_rate`
       - `recentEvents` (most recent first, capped at 200)
       - `histograms` (latency distributions described below)
    - Dashboard UI at `/admin/metrics` polls every 5s by default (toggleable) and shows counters + last 100 events.
    - Intended for local/dev operational insight prior to adopting a persistent metrics backend (Prometheus / OpenTelemetry collector).

    #### Latency Histograms (in-memory)
    - Automatic histogram collection for instrumented API paths via `withLatency(name, fn)` helper (`src/lib/metrics.ts`).
    - Default bucket boundaries (ms): `[5,10,25,50,75,100,150,250,400,600,800,1000,1500,2000,3000,5000,+Inf]`.
    - Current instrumentation:
      - `api.jobs.list` (GET /api/jobs)
      - `api.escrow.action` (PATCH /api/jobs/:id/escrow)
      - `api.admin.metrics.json` (GET /api/admin/metrics)
      - Additional endpoints can opt-in by wrapping logic with `withLatency('api.xyz', async () => { ... })`.
    - Snapshot JSON shape for a histogram entry:
      ```jsonc
      {
        "name": "latency.api.jobs.list",
        "buckets": [ { "le": 5, "count": 2 }, { "le": 10, "count": 5 }, { "le": "+Inf", "count": 17 } ],
        "sum": 1234.56,
        "count": 17,
        "min": 3.1,
        "max": 210.4,
        "avg": 72.62
      }
      ```

    #### Prometheus Exporter
    - Text exposition endpoint: `GET /api/admin/metrics.prom` (same auth as JSON metrics endpoint).
    - Emits counters and histograms in basic Prometheus format (no labels yet, each histogram yields `_bucket`, `_count`, `_sum`).
    - Example snippet:
      ```
      # TYPE latency_api_jobs_list histogram
      latency_api_jobs_list_bucket{le="5"} 2
      latency_api_jobs_list_bucket{le="10"} 5
      ...
      latency_api_jobs_list_bucket{le="+Inf"} 17
      latency_api_jobs_list_count 17
      latency_api_jobs_list_sum 1234.56
      ```
    - Intended for development / early ops; replace with a proper metrics SDK (OpenTelemetry) for production-grade label support and remote aggregation.

    Example console event line:
    ```json
    {"ts":"2025-10-08T10:15:30.123Z","type":"event","name":"jobs.list","payload":{"count":10,"total":42,"page":1}}
    ```

   - Every API response includes correlation and basic timing headers:
      - `X-Request-Id` — request correlation ID (propagates from proxies if present)
      - `Server-Timing: app;dur=<ms>` — simple server-side duration for the request
   - JSON responses created via helper also include:
      - `ETag` — for conditional requests (304 support)
      - `X-Response-Bytes` — response payload size in bytes

   How to view headers:
   - In your browser devtools Network tab, select a request and check Response Headers.
   - In Playwright tests, `res.headers()` exposes the same headers.

   ## 🔐 Auth: Scoped JWTs + Refresh Rotation
## 🔐 Auth: Scoped JWTs + Refresh Rotation
- Access tokens: short-lived JWTs with scopes (typ='access'). Default scopes depend on user type:
   - Base: read:jobs, read:applications, read:profile
   - Client: + write:jobs, write:applications, escrow:manage
   - Freelancer/Both: + write:applications, write:profile
- Refresh tokens: opaque, stored hashed in DB (Prisma model `RefreshToken`) with rotation and revocation.
- Cookies set on login/SIWE verify:
   - `session_token` (httpOnly, sameSite=lax, secure in prod) — access token
   - `refresh_token` (httpOnly, sameSite=lax, secure in prod)
- Refresh endpoint: `POST /api/auth/refresh` — reads `refresh_token` cookie (or JSON `{ refreshToken }`), rotates token, and returns a new access token + cookie set.
- Logout: `POST /api/auth/logout` — revokes current refresh token and clears cookies.
- CSRF: All state-changing endpoints (including refresh) require the CSRF double-submit header/cookie setup. Use the `apiFetch` helper to include it automatically.

Prisma migration for refresh tokens:
1. Ensure `DATABASE_URL` is set
2. Generate and apply migration
   - Dev: npm run db:migrate
   - Prod: npm run db:deploy
3. Regenerate client if needed: npm run prisma:generate

Client auto-refresh behavior:
- The `apiFetch` helper automatically performs a one-time refresh on 401 by calling `POST /api/auth/refresh` with CSRF and credentials, then retries the original request.
- A single-flight gate prevents multiple concurrent refresh calls (stampede protection).
- If refresh fails (e.g., revoked/expired), the original 401 is surfaced so callers can redirect to login.

### E2E: Post job → apply
- New Playwright spec: `e2e/post-job-apply.spec.ts`
   - Registers a CLIENT, posts a job, verifies it appears in list
   - Registers a FREELANCER, applies to the job
- Run:
   - Start dev server
   - `npm run test:e2e` (or `npm run test:e2e:ui` for UI runner)

### Admin testing (wallet allowlist)
- Set `ADMIN_WALLETS` in your `.env.local` to a comma-separated list of wallet addresses that should receive admin privileges, for example:
   - `ADMIN_WALLETS=0xYourWalletAddressHere,0xAnotherAdmin`
 - Alternatively (dev only), run `npm run seed:admin` to create a password user:
   - Username: `Admin`
   - Password: `admin`
   - Prints an access token in console; you can also login via `/login` (ensure CSRF cookie first by visiting site).
   - Change defaults with env vars before running: `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- When a listed wallet logs in (SIWE verify), the access token gains the `admin:all` scope.
- To verify:
   1. Log in with your allowlisted wallet.
   2. Call `GET /api/admin/ping` with your `session_token` cookie (or Bearer token). You should get `{ success: true, message: 'admin-ok' }`.
   3. Non-admins receive 403 Forbidden.
## 🧰 Performance & Caching

- Database indexes for hot paths:
   - Profile: hourlyRate, experience, rating (Prisma @@index)
   - Job: (status, createdAt) composite index for "recent open jobs"
   - GIN indexes for array fields:
      - profiles.skills, jobs.skills (raw SQL migration) to accelerate `hasSome` filters
- API caching:
   - Anonymous list endpoints return `Cache-Control: public, max-age=30, s-maxage=60` with `ETag`
   - Authenticated client-only job lists return `Cache-Control: private, max-age=0, no-cache` to avoid shared-cache leaks
- Prisma logging:
   - Development: logs queries for debugging
   - Production: reduced to warn/error to lower noise and overhead

To apply DB changes:
```powershell
npm run prisma:generate
npm run db:deploy
```

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
