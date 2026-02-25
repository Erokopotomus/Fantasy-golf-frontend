-- Add auction value field to draft board entries
ALTER TABLE "clutch_draft_board_entries" ADD COLUMN IF NOT EXISTS "auction_value" INTEGER;
