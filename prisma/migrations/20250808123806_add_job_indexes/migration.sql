-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "public"."jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_clientId_idx" ON "public"."jobs"("clientId");

-- CreateIndex
CREATE INDEX "jobs_createdAt_idx" ON "public"."jobs"("createdAt");
