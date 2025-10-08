-- AlterTable
ALTER TABLE "public"."jobs" ADD COLUMN     "escrowDeployed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "escrowDeploymentAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "escrowOnChainId" INTEGER,
ADD COLUMN     "escrowPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "useBlockchain" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "jobs_escrowPending_idx" ON "public"."jobs"("escrowPending");

-- CreateIndex
CREATE INDEX "jobs_escrowDeployed_idx" ON "public"."jobs"("escrowDeployed");
