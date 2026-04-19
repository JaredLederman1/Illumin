-- Expand OnboardingProfile with location, employment, goals, and contract-upload fields.

ALTER TABLE "onboarding_profiles"
  ADD COLUMN "location_city"                 TEXT,
  ADD COLUMN "location_state"                TEXT,
  ADD COLUMN "job_title"                     TEXT,
  ADD COLUMN "employer"                      TEXT,
  ADD COLUMN "employer_start_date"           TIMESTAMP(3),
  ADD COLUMN "target_retirement_income"      DOUBLE PRECISION,
  ADD COLUMN "emergency_fund_months_target"  INTEGER DEFAULT 6,
  ADD COLUMN "major_goals"                   TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "risk_tolerance"                INTEGER,
  ADD COLUMN "contract_parsed_data"          JSONB,
  ADD COLUMN "contract_uploaded_at"          TIMESTAMP(3);
