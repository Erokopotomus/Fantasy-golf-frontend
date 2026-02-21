-- Migration 45: Weekly Roster Overrides
-- Allows commissioners to reduce starter count for specific fantasy weeks

CREATE TABLE IF NOT EXISTS "weekly_roster_overrides" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "fantasyWeekId" TEXT NOT NULL,
  "starterCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "weekly_roster_overrides_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one override per league per fantasy week
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_roster_overrides_leagueId_fantasyWeekId_key'
  ) THEN
    ALTER TABLE "weekly_roster_overrides"
      ADD CONSTRAINT "weekly_roster_overrides_leagueId_fantasyWeekId_key"
      UNIQUE ("leagueId", "fantasyWeekId");
  END IF;
END $$;

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_roster_overrides_leagueId_fkey'
  ) THEN
    ALTER TABLE "weekly_roster_overrides"
      ADD CONSTRAINT "weekly_roster_overrides_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_roster_overrides_fantasyWeekId_fkey'
  ) THEN
    ALTER TABLE "weekly_roster_overrides"
      ADD CONSTRAINT "weekly_roster_overrides_fantasyWeekId_fkey"
      FOREIGN KEY ("fantasyWeekId") REFERENCES "fantasy_weeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS "weekly_roster_overrides_leagueId_idx" ON "weekly_roster_overrides"("leagueId");
CREATE INDEX IF NOT EXISTS "weekly_roster_overrides_fantasyWeekId_idx" ON "weekly_roster_overrides"("fantasyWeekId");
