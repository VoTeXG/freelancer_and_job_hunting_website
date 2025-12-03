# Architecture Diagrams

This document captures the core data flows and components of the platform using Mermaid diagrams.

## 1) System architecture (high level)

```mermaid
flowchart LR
  subgraph Client
    A[Next.js App Router]
    B[RainbowKit / wagmi]
    C[Rich text editor]
  end

  subgraph API
    D[/Route Handlers (src/app/api)/]
    E[Sanitization (sanitize-html)]
    F[Rate Limit]
    G[ServerTiming + Metrics]
  end

  subgraph Services
    H[Prisma + PostgreSQL]
    I[(Cache Layer: Redis or In-memory)]
    J[IPFS]
    K[Ethereum Escrow/Rep/NFT]
  end

  A -->|fetch| D
  B -->|Bearer JWT| D
  C -->|HTML| E --> D
  D -->|read/write| H
  D -->|put/get| I
  D -->|upload/read| J
  D -->|tx/call| K
  D --> G
```

## 2) Job creation sequence (rich text + IPFS + escrow intent)

```mermaid
sequenceDiagram
  participant U as User (Client)
  participant FE as Next.js Page - /jobs/create-enhanced
  participant API as POST /api/jobs
  participant SEC as CSRF + JWT + RateLimit
  participant SAN as sanitizeRichTextHTML
  participant DB as Prisma/Postgres
  participant CACHE as Cache (jobs_list)

  U->>FE: Fill form + rich description
  FE->>FE: Upload attachments to IPFS (hashes)
  FE->>API: Submit payload (+IPFS hashes)
  API->>SEC: Validate CSRF, token, scope, rate limit
  SEC-->>API: OK
  API->>SAN: Sanitize description (rich policy)
  SAN-->>API: Safe HTML
  API->>DB: Insert job (escrowPending if requested)
  API->>CACHE: bumpVersion(jobs_list)
  API-->>FE: 201 Created + job JSON
```

## 3) Jobs list with caching and metrics

```mermaid
sequenceDiagram
  participant FE as Next.js Page - /jobs
  participant API as GET /api/jobs
  participant MET as ServerTiming + Metrics
  participant CACHE as cacheJSON("jobs", key)
  participant DB as Prisma/Postgres

  FE->>API: page, limit, filters
  API->>MET: start timing
  API->>CACHE: lookup(key, v=jobs_list)
  alt Cache HIT
    CACHE-->>API: value
  else Cache MISS
    API->>DB: findMany + count
    DB-->>API: rows + total
    API->>CACHE: set(key, ttl=30s)
  end
  API-->>FE: JSON + ETag + X-Cache + Server-Timing
```

## 4) Simplified data model (ERD)

```mermaid
erDiagram
  USER ||--o{ PROFILE : has
  USER ||--o{ JOB : posts
  USER ||--o{ APPLICATION : submits
  JOB ||--o{ APPLICATION : receives

  USER {
    string id
    string username
    string walletAddress
    enum userType
  }
  PROFILE {
    string userId
    string title
    string bio
    string[] skills
    float hourlyRate
    float rating
    int completedJobs
    string avatar
    int experience
  }
  JOB {
    string id
    string clientId
    string title
    string description(HTML)
    float budgetAmount
    enum budgetType(FIXED|HOURLY)
    string currency
    string[] skills
    datetime createdAt
    datetime deadline
    bool useBlockchain
    bool escrowPending
    bool escrowDeployed
    int escrowDeploymentAttempts
    string escrowOnChainId
  }
  APPLICATION {
    string id
    string jobId
    string freelancerId
    string coverLetter
    datetime createdAt
  }
```

## 5) Escrow deployment path (happy path)

```mermaid
sequenceDiagram
  participant CLI as Client Dashboard
  participant API as POST /api/jobs/:id/escrow\n(or server worker)
  participant CHN as Ethereum
  participant DB as Postgres

  CLI->>API: Request escrow deploy
  API->>CHN: Deploy Escrow Contract
  CHN-->>API: tx receipt + escrowId
  API->>DB: Update job { escrowDeployed=true, escrowPending=false, escrowOnChainId }
  API-->>CLI: Success
```

## 6) Observability flow

```mermaid
flowchart TB
  A[Incoming Request] --> B[withLatency wrapper]
  B --> C[Route Handler]
  C --> D[ServerTiming measurements]
  C --> E[Cache events (hit/miss/version)]
  C --> F[App events (success/error)]
  D --> G[Server-Timing header]
  E --> H[Metrics UI / Admin Dashboard]
  F --> H
```

---

Tip: These Mermaid blocks render directly in many viewers (including GitHub). If you want PNGs/SVGs for docs, we can export them or generate an SVG assets folder.

## 7) System architecture (expanded overview)

```mermaid
flowchart LR
    subgraph Client[Client (Next.js App Router)]
      UI[Pages & Components: jobs, freelancers, auth, dashboard]
      Providers[Client Providers: AuthProvider, Query Client, Theme]
    end

    subgraph API[API Route Handlers (app/api/*)]
      AuthAPI[/Auth Routes (login, register, SIWE)/]
      JobsAPI[/Jobs Routes (create, list, update)/]
      FreelancersAPI[/Freelancers Routes (search, filters)/]
      EscrowAPI[/Escrow Routes (create, release, cancel)/]
      ProfileAPI[/Profile Routes (profiles & settings)/]
    end

    subgraph Backend[Backend Services]
      subgraph DB[PostgreSQL via Prisma]
        Users[(User)]
        Profiles[(Profile)]
        Jobs[(Job)]
        Apps[(Application)]
        Escrows[(Escrow)]
        Reputation[(ReputationEvent)]
        Certs[(Certificate)]
      end

      subgraph Chain[Ethereum / Web3]
        EscrowSC[[FreelancerEscrow.sol]]
        ReputationSC[[ReputationSystem.sol]]
        CertNFT[[CertificateNFT.sol]]
      end
    end

    subgraph Ops[Ops / Tooling]
      Seeds[[Seeding Scripts: seed-admin.ts, seed-sample.ts]]
      Migrations[[Migrations: prisma/migrations]]
      Tests[[Tests: contracts + Playwright e2e]]
      Checks[[Checks: perf & a11y scripts]]
    end

    Client -->|"HTTP (fetch, navigation)"| API
    UI --> Providers

    AuthAPI --> Users
    AuthAPI --> Profiles

    JobsAPI --> Jobs
    JobsAPI --> Users
    JobsAPI --> Profiles

    FreelancersAPI --> Profiles
    FreelancersAPI --> Users

    ProfileAPI --> Profiles

    EscrowAPI --> Escrows
    EscrowAPI --> Jobs
    EscrowAPI --> Users
    EscrowAPI -->|"Ethers.js calls"| EscrowSC
    EscrowAPI -->|"Ethers.js calls"| ReputationSC
    EscrowAPI -->|"Ethers.js calls"| CertNFT

    Seeds --> DB
    Migrations --> DB
    Tests --> DB
    Tests --> Chain
    Checks --> Client
    Checks --> API
```

## 8) Post Job + Escrow flow

```mermaid
sequenceDiagram
    autonumber
    actor ClientUser as Client (Browser)
    participant NextPage as Next.js Page\\n/jobs/create-enhanced
    participant AuthProv as AuthProvider\\n(wallet/SIWE)
    participant JobsAPI as /api/jobs
    participant EscrowAPI as /api/escrow
    participant Prisma as Prisma + PostgreSQL
    participant EscrowSC as FreelancerEscrow.sol\\n(Ethereum)

    ClientUser->>NextPage: Open Post Job (create-enhanced)
    NextPage->>AuthProv: Initialize auth (wallet / SIWE)
    AuthProv-->>NextPage: Auth state + token

    ClientUser->>NextPage: Fill job form + escrow options
    ClientUser->>NextPage: Click "Create job"

    NextPage->>JobsAPI: POST /api/jobs (job data, clientId, budget)
    JobsAPI->>Prisma: Create Job record
    Prisma-->>JobsAPI: Job created (jobId)
    JobsAPI-->>NextPage: 201 Created (jobId, summary)

    NextPage->>EscrowAPI: POST /api/escrow (jobId, terms, amount)
    EscrowAPI->>Prisma: Create Escrow record (pending)
    EscrowAPI->>EscrowSC: call createEscrow(jobId, amount, client wallet)
    EscrowSC-->>EscrowAPI: Tx receipt (escrowId, status)

    EscrowAPI->>Prisma: Update Escrow record with on-chain escrowId & status
    EscrowAPI-->>NextPage: Escrow created (escrowId, status)

    NextPage-->>ClientUser: Show success, redirect to job/escrow detail
```

## 7) Applicant workflow (apply → shortlist → award → fund escrow)

```mermaid
sequenceDiagram
  participant FR as Freelancer FE
  participant CL as Client FE
  participant API as /api/jobs & /api/applications
  participant SEC as CSRF + JWT + RateLimit
  participant DB as Postgres
  participant CHN as Ethereum (Escrow)

  Note over FR: Browse job details
  FR->>API: GET /api/jobs/:id
  API-->>FR: Job JSON
  FR->>API: POST /api/applications { jobId, coverLetter }
  API->>SEC: Validate (CSRF/JWT/rate limit)
  SEC-->>API: OK
  API->>DB: Create application (status=pending)
  API-->>FR: 201 Created

  Note over CL: Review candidates
  CL->>API: GET /api/jobs/:id/applications
  API-->>CL: List of applications
  CL->>API: PATCH /api/applications/:id { status: shortlisted }
  API->>DB: Update application

  alt Client awards job
    CL->>API: PATCH /api/applications/:id { status: awarded }
    API->>DB: Mark awarded; link to job
    CL->>CHN: Fund escrow (amount)
    CHN-->>CL: tx receipt
    API->>DB: Update job { escrowDeployed/OnChainId when available }
  end
```

## 8) Dispute resolution (high-level)

```mermaid
flowchart LR
  subgraph Client Side
    A[Client FE]
    F[Freelancer FE]
  end
  subgraph Server
    API[/API: disputes endpoints/]
    DB[(Postgres)]
  end
  subgraph Chain
    ESC[Escrow Contract]
    ARB[Arbitration Logic (on/off-chain policy)]
  end

  A -- open dispute --> API
  API --> DB
  API -- pause/refer --> ESC
  ESC --> ARB
  ARB -- resolution event --> ESC
  ESC -- payout split --> F
  ESC -- refund/partial --> A
  ESC --> API
  API --> DB
  API -- notify --> A
  API -- notify --> F
```
