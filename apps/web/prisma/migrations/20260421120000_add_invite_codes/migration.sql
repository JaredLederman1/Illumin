-- Invite code gating for public signup. Codes are minted by admins in
-- /admin/invites and consumed once (or up to max_uses times) during signup.
-- Redemptions are recorded in a separate table so we can enforce a per-user
-- unique constraint and audit who used what.
CREATE TABLE IF NOT EXISTS "invite_codes" (
    "id"           TEXT NOT NULL,
    "code"         TEXT NOT NULL,
    "max_uses"     INTEGER NOT NULL DEFAULT 1,
    "used_count"   INTEGER NOT NULL DEFAULT 0,
    "expires_at"   TIMESTAMP(3),
    "note"         TEXT,
    "created_by"   TEXT,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at"  TIMESTAMP(3),

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invite_codes_code_key"
    ON "invite_codes"("code");

CREATE TABLE IF NOT EXISTS "invite_code_redemptions" (
    "id"              TEXT NOT NULL,
    "invite_code_id"  TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "redeemed_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_code_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invite_code_redemptions_invite_code_id_user_id_key"
    ON "invite_code_redemptions"("invite_code_id", "user_id");

CREATE INDEX IF NOT EXISTS "invite_code_redemptions_user_id_idx"
    ON "invite_code_redemptions"("user_id");

ALTER TABLE "invite_code_redemptions"
    ADD CONSTRAINT "invite_code_redemptions_invite_code_id_fkey"
    FOREIGN KEY ("invite_code_id") REFERENCES "invite_codes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
