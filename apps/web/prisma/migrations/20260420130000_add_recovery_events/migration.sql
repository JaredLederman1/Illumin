-- Recovery Counter persistence. Each row records a single moment when a
-- previously open opportunity gap was credited as recovered. Cumulative
-- "recovered" totals on the dashboard sum annual_value across these rows.
-- Currently open totals are computed live from the source data, not stored.
CREATE TABLE "recovery_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gap_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "annual_value" DOUBLE PRECISION NOT NULL,
    "recovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recovery_events_user_id_gap_id_key" ON "recovery_events"("user_id", "gap_id");
CREATE INDEX "recovery_events_user_id_idx" ON "recovery_events"("user_id");

ALTER TABLE "recovery_events"
    ADD CONSTRAINT "recovery_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
