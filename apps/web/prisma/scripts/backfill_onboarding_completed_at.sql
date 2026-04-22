-- One-time backfill for onboarding_profiles.completed_at.
--
-- Marks an existing OnboardingProfile as completed iff:
--   (1) all four required Step-1 fields are present (age, annual_income,
--       savings_rate, retirement_age are NOT NULL), AND
--   (2) at least one account row exists for that user.
--
-- Do NOT run automatically. Review the affected rows first, then apply
-- manually in the Supabase SQL editor.
--
-- Dry-run preview:
--   SELECT p.user_id, p.updated_at, count(a.id) AS account_count
--   FROM onboarding_profiles p
--   JOIN accounts a ON a.user_id = p.user_id
--   WHERE p.completed_at IS NULL
--     AND p.age IS NOT NULL
--     AND p.annual_income IS NOT NULL
--     AND p.savings_rate IS NOT NULL
--     AND p.retirement_age IS NOT NULL
--   GROUP BY p.user_id, p.updated_at;
--
-- Apply:
UPDATE "onboarding_profiles" p
   SET "completed_at" = p."updated_at"
 WHERE p."completed_at" IS NULL
   AND p."age" IS NOT NULL
   AND p."annual_income" IS NOT NULL
   AND p."savings_rate" IS NOT NULL
   AND p."retirement_age" IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM "accounts" a WHERE a."user_id" = p."user_id"
   );
