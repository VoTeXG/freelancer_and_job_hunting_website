-- Create GIN indexes on array columns to accelerate `hasSome`/array membership queries
-- Profiles.skills (text[])
CREATE INDEX IF NOT EXISTS idx_profiles_skills_gin ON "profiles" USING GIN ("skills");

-- Jobs.skills (text[])
CREATE INDEX IF NOT EXISTS idx_jobs_skills_gin ON "jobs" USING GIN ("skills");
