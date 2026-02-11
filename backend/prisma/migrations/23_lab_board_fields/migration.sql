-- AlterTable: Add league context fields to DraftBoard
ALTER TABLE "clutch_draft_boards" ADD COLUMN "league_type" TEXT;
ALTER TABLE "clutch_draft_boards" ADD COLUMN "team_count" INTEGER;
ALTER TABLE "clutch_draft_boards" ADD COLUMN "draft_type" TEXT;
ALTER TABLE "clutch_draft_boards" ADD COLUMN "roster_config" JSONB;
