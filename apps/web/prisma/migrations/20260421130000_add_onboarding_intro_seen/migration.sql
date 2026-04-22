-- Records when the user dismissed the cinematic welcome intro. Replaces
-- the per-browser localStorage flag illumin_onboarding_intro_seen so the
-- intro is shown or skipped consistently across devices. Null means the
-- intro has not been seen yet.
ALTER TABLE "onboarding_profiles"
    ADD COLUMN IF NOT EXISTS "intro_seen_at" TIMESTAMP(3);
