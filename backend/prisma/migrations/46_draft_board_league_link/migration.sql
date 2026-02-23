-- Add optional league binding to draft boards
ALTER TABLE "clutch_draft_boards" ADD COLUMN IF NOT EXISTS "leagueId" TEXT;

ALTER TABLE "clutch_draft_boards"
  ADD CONSTRAINT "clutch_draft_boards_leagueId_fkey"
  FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "clutch_draft_boards_leagueId_idx" ON "clutch_draft_boards"("leagueId");
