-- DropForeignKey
ALTER TABLE "public"."refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- AlterTable
ALTER TABLE "public"."refresh_tokens" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "revokedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "jobs_status_createdAt_idx" ON "public"."jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "profiles_hourlyRate_idx" ON "public"."profiles"("hourlyRate");

-- CreateIndex
CREATE INDEX "profiles_experience_idx" ON "public"."profiles"("experience");

-- CreateIndex
CREATE INDEX "profiles_rating_idx" ON "public"."profiles"("rating");

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
