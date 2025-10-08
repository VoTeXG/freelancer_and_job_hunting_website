-- Add escrow rollback tracking columns to jobs table
ALTER TABLE "jobs"
  ADD COLUMN "escrowRollbackRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "escrowRollbackReason" TEXT,
  ADD COLUMN "escrowCancelledAt" TIMESTAMP;

-- Index to query rollback requests quickly
CREATE INDEX "jobs_escrowRollbackRequested_idx" ON "jobs" ("escrowRollbackRequested");
