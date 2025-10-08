-- CreateTable
CREATE TABLE "public"."job_drafts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_drafts_clientId_updatedAt_idx" ON "public"."job_drafts"("clientId", "updatedAt");

-- AddForeignKey
ALTER TABLE "public"."job_drafts" ADD CONSTRAINT "job_drafts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
