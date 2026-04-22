-- One-time sanitization of transactions.merchant_name to match the runtime
-- cleanup applied at Plaid ingestion. Strips trailing "*//" / "//" tokens,
-- leading / trailing asterisks, collapses whitespace, and trims.
UPDATE "transactions"
SET "merchant_name" = NULLIF(
  BTRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE("merchant_name", '\s*\*?/{2,}\s*$', '', 'g'),
          '^\*+', '', 'g'
        ),
        '\*+$', '', 'g'
      ),
      '\s+', ' ', 'g'
    )
  ),
  ''
)
WHERE "merchant_name" IS NOT NULL
  AND (
    "merchant_name" ~ '\*?/{2,}\s*$'
    OR "merchant_name" ~ '^\*'
    OR "merchant_name" ~ '\*$'
    OR "merchant_name" ~ '\s{2,}'
    OR "merchant_name" ~ '^\s'
    OR "merchant_name" ~ '\s$'
  );
