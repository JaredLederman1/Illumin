-- Distinguishes a skipped Step 3 contract upload from a completed one. The
-- resume logic previously treated both as "advance past Step 3" because
-- contractParsedData was the only signal. Setting this timestamp lets
-- future nudges re-engage users who deferred the upload. Null means the
-- user has not skipped (they may still have uploaded, or not reached
-- Step 3 yet).
ALTER TABLE "onboarding_profiles"
    ADD COLUMN IF NOT EXISTS "contract_step_skipped_at" TIMESTAMP(3);
