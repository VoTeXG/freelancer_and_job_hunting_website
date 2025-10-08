-- DropIndex
DROP INDEX "public"."idx_jobs_skills_gin";

-- DropIndex
DROP INDEX "public"."idx_profiles_skills_gin";

-- AlterTable
ALTER TABLE "public"."jobs" ALTER COLUMN "escrowCancelledAt" SET DATA TYPE TIMESTAMP(3);
