-- Soft-gate signal for whether a user has finished onboarding. Finalize
-- branch of /api/user/onboarding writes this. Null means "still in progress".
-- Existing rows are NOT backfilled by this migration; a separate one-time
-- script (see prisma/scripts/backfill_onboarding_completed_at.sql) sets
-- completedAt = updatedAt for rows that qualify.
ALTER TABLE "onboarding_profiles"
    ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
