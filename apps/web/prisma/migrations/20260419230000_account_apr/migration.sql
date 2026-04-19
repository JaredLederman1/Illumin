-- Add APR column to accounts table. Nullable because most assets and many
-- liabilities will not have an APR reported by Plaid. The dashboard state
-- detector falls back to a conservative estimate when this is null.
ALTER TABLE "accounts" ADD COLUMN "apr" DOUBLE PRECISION;
