-- AlterTable: Add tags and reason_chips columns to draft board entries
ALTER TABLE "clutch_draft_board_entries" ADD COLUMN "tags" JSONB;
ALTER TABLE "clutch_draft_board_entries" ADD COLUMN "reason_chips" JSONB;
