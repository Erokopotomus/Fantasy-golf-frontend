-- Phase 6A-4: Capture-to-outcome linking
-- Links user captures to post-season outcome data for verdict tracking

ALTER TABLE "clutch_lab_captures" ADD COLUMN "outcomeLinked" BOOLEAN DEFAULT false;
ALTER TABLE "clutch_lab_captures" ADD COLUMN "outcomeData" JSONB;
ALTER TABLE "clutch_lab_captures" ADD COLUMN "outcomeLinkedAt" TIMESTAMP(3);
