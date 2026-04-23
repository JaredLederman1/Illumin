-- CreateTable
CREATE TABLE "signal_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gap_id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "annual_value" DOUBLE PRECISION NOT NULL,
    "lifetime_value" DOUBLE PRECISION,
    "severity" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "payload" JSONB,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signal_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signal_snapshots_user_id_gap_id_captured_at_idx" ON "signal_snapshots"("user_id", "gap_id", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "signal_snapshots_scan_id_idx" ON "signal_snapshots"("scan_id");

-- CreateIndex
CREATE INDEX "signal_snapshots_user_id_captured_at_idx" ON "signal_snapshots"("user_id", "captured_at" DESC);

-- AddForeignKey
ALTER TABLE "signal_snapshots" ADD CONSTRAINT "signal_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_snapshots" ADD CONSTRAINT "signal_snapshots_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
