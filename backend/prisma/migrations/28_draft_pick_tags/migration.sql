-- Phase 6A-2: Draft pick tagging
-- Adds reasoning fields to draft picks for the Decision Graph

ALTER TABLE "draft_picks" ADD COLUMN "pickTag" VARCHAR(20);
ALTER TABLE "draft_picks" ADD COLUMN "boardRankAtPick" INTEGER;
ALTER TABLE "draft_picks" ADD COLUMN "boardId" TEXT;
