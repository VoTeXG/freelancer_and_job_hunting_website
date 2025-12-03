## Diagram 1

``` mermaid
flowchart LR
  subgraph Client
    A[Next.js App Router]
    B[RainbowKit / wagmi]
    C[Rich text editor]
  end

  subgraph API
    D[/Route Handlers (src/app/api) Zod, CSRF, JWT/Scopes/]
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

## Diagram 2

``` mermaid
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

## Diagram 3

``` mermaid
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

## Diagram 4

``` mermaid
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

## Diagram 5

``` mermaid
sequenceDiagram
  participant CLI as Client Dashboard
  participant API as POST /api/jobs/:id/escrow
  participant CHN as Ethereum
  participant DB as Postgres

  CLI->>API: Request escrow deploy
  API->>CHN: Deploy Escrow Contract
  CHN-->>API: tx receipt + escrowId
  API->>DB: Update job { escrowDeployed=true, escrowPending=false, escrowOnChainId }
  API-->>CLI: Success
```
