-- Clutch Rating V2: Expand from prediction-only to 7-component rating system
-- Extends existing clutch_manager_ratings table with per-component scores + confidences
-- Adds rating_snapshots table for trend tracking

-- V2 metadata columns
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "data_source_summary" TEXT;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "active_since" TIMESTAMP(3);

-- Component scores (0-100 each) and confidences (0-100 each)
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "win_rate_score" DOUBLE PRECISION;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "win_rate_confidence" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "draft_iq_score" DOUBLE PRECISION;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "draft_iq_confidence" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "roster_mgmt_score" DOUBLE PRECISION;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "roster_mgmt_confidence" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "predictions_score" DOUBLE PRECISION;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "predictions_confidence" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "trade_acumen_score" DOUBLE PRECISION;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "trade_acumen_confidence" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "championships_score" DOUBLE PRECISION;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "championships_confidence" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "consistency_score" DOUBLE PRECISION;
ALTER TABLE "clutch_manager_ratings" ADD COLUMN IF NOT EXISTS "consistency_confidence" DOUBLE PRECISION DEFAULT 0;

-- Rating snapshots for trend calculation (30-day comparison)
CREATE TABLE IF NOT EXISTS "rating_snapshots" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "overall" DOUBLE PRECISION NOT NULL,
  "components" JSONB NOT NULL DEFAULT '{}',
  "snapshot_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "rating_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "rating_snapshots_user_date" ON "rating_snapshots"("user_id", "snapshot_date" DESC);
ALTER TABLE "rating_snapshots" ADD CONSTRAINT "rating_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
