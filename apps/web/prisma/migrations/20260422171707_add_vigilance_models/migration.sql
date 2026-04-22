-- Vigilance system data model. Adds three new tables for scheduled scanning
-- and signal persistence (scans, signals, signal_states), plus sync timestamp
-- columns on accounts and transactions so data freshness is observable.
-- Idempotent: all CREATE/ADD operations use IF NOT EXISTS, foreign keys use
-- pg_constraint guards, so this migration can be re-run against a DB that has
-- already received any subset of these objects via prior drift.

-- AlterTable: accounts
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMP(3);
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "last_sync_attempted_at" TIMESTAMP(3);
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "last_sync_error" TEXT;

-- AlterTable: transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMP(3);

-- CreateTable: scans
CREATE TABLE IF NOT EXISTS "scans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "trigger" TEXT NOT NULL,
    "signals_checked" INTEGER NOT NULL DEFAULT 0,
    "signals_flagged" INTEGER NOT NULL DEFAULT 0,
    "signals_resolved" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: signals
CREATE TABLE IF NOT EXISTS "signals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gap_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'new',
    "severity" TEXT NOT NULL DEFAULT 'advisory',
    "annual_value" DOUBLE PRECISION NOT NULL,
    "lifetime_value" DOUBLE PRECISION,
    "payload" JSONB,
    "first_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "acted_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "first_detected_in_scan_id" TEXT,
    "last_updated_in_scan_id" TEXT,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: signal_states
CREATE TABLE IF NOT EXISTS "signal_states" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gap_id" TEXT NOT NULL,
    "current_state" TEXT NOT NULL,
    "state_since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_state" TEXT,
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_value" DOUBLE PRECISION,
    "previous_value" DOUBLE PRECISION,

    CONSTRAINT "signal_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scans_user_id_started_at_idx" ON "scans"("user_id", "started_at" DESC);
CREATE INDEX IF NOT EXISTS "scans_status_idx" ON "scans"("status");
CREATE INDEX IF NOT EXISTS "signals_user_id_state_idx" ON "signals"("user_id", "state");
CREATE INDEX IF NOT EXISTS "signals_user_id_last_seen_at_idx" ON "signals"("user_id", "last_seen_at" DESC);
CREATE INDEX IF NOT EXISTS "signals_domain_idx" ON "signals"("domain");
CREATE UNIQUE INDEX IF NOT EXISTS "signals_user_id_gap_id_key" ON "signals"("user_id", "gap_id");
CREATE INDEX IF NOT EXISTS "signal_states_user_id_current_state_idx" ON "signal_states"("user_id", "current_state");
CREATE UNIQUE INDEX IF NOT EXISTS "signal_states_user_id_gap_id_key" ON "signal_states"("user_id", "gap_id");
CREATE INDEX IF NOT EXISTS "accounts_last_synced_at_idx" ON "accounts"("last_synced_at");

-- AddForeignKey: Postgres has no ADD CONSTRAINT IF NOT EXISTS, so each FK is
-- guarded by a pg_constraint lookup to keep the migration idempotent.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scans_user_id_fkey') THEN
        ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signals_user_id_fkey') THEN
        ALTER TABLE "signals" ADD CONSTRAINT "signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signal_states_user_id_fkey') THEN
        ALTER TABLE "signal_states" ADD CONSTRAINT "signal_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
