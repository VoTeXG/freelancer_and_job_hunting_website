# Developer Guide

Welcome to BlockFreelancer. This guide helps you get set up locally, understand the architecture, and contribute effectively.

## 1. Prerequisites
- Node.js 20+
- pnpm or npm (repo uses npm scripts)
- PostgreSQL 14+
- Optional: Redis (for caching in prod; in dev we fall back to in-memory)
- MetaMask (or WalletConnect-compatible wallet) for local testing

## 2. Environment Setup
1. Copy `.env.example` to `.env.local` and fill values. At minimum:
   - DATABASE_URL=postgres://user:pass@localhost:5432/blockfreelancer
   - NEXTAUTH_SECRET=... (if used)
   - NEXT_PUBLIC_CI_MINIMAL_WEB3=false
   - REDIS_URL=redis://localhost:6379 (optional)
   - SENTRY_DSN= (optional)
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run prisma:generate`
4. Run migrations: `npm run db:deploy` (dev) or `npm run db:migrate` if iterating
5. Start dev server: `npm run dev`

## 3. Useful Scripts
- `npm run dev` — Next.js dev server
- `npm run build && npm start` — Production build + start
- `npm run typecheck` — Strict type checking (CI parity)
- `npm run test:contracts` — Hardhat tests
- `npm run test:e2e` — Playwright end-to-end tests
- `npm run budget:responses` — Response size budget checks
- `npm run db:dry-run` — Preview pending DB migrations

## 4. Architecture Overview
- Next.js App Router with TypeScript and Tailwind
- API Routes (Prisma/PostgreSQL)
- Web3: wagmi/viem, RainbowKit; Ethereum contracts (Escrow, Reputation, Certificate NFT)
- Caching: versioned JSON cache with optional Redis; Server-Timing + X-Cache
- Observability: in-app metrics UI (`/admin/metrics`), Prometheus exporter (`/api/admin/metrics.prom`), Sentry optional

See `docs/DIAGRAMS.md` for diagrams and flows.

## 5. Contracts & ABIs
- Contracts live in `contracts/`
- Build artifacts/ABIs: `artifacts/` and `typechain-types/`
- Basic deploy scripts: `scripts/deploy.ts`
- Tests: `test/*.ts`

To interact from the app, see hooks in `src/hooks/useEscrow` and related usage in pages under `src/app`.

## 6. Data & Migrations
- Prisma schema: `prisma/schema.prisma`
- Run migrations: `npm run db:migrate` (dev flow) or `npm run db:deploy` (apply)
- Seed helpers: `npm run seed:admin`

## 7. Security & Auth
- JWT with scopes; CSRF enforced on write routes
- Sanitization with zod and `sanitize-html`
- Wallet-based auth flows with SIWE-like patterns

## 8. Development Conventions
- TypeScript strict mode, keep components typed
- Tailwind for styling; keep UI consistent
- Avoid importing server-only modules in client components
- Prefer `withLatency`, `ServerTiming`, and cache helpers for API performance

## 9. Troubleshooting
- Hydration warnings on inputs: set `suppressHydrationWarning` or render client-only
- ReactQuill on React 19: use the in-house Quill wrapper (`src/components/RichTextEditor.tsx`)
- Dual `quill` versions: pin to `quill@1.3.7`
- Response size budget failures: see `scripts/check-response-sizes.*`

## 10. Contributing
- Branch off `master`, open PRs with clear scope
- Run `npm run typecheck` and relevant tests before pushing
- Add/adjust docs when changing public behavior or APIs
