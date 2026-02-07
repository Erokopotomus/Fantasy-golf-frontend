-- Add playoff tracking fields to TeamSeason
ALTER TABLE "team_seasons" ADD COLUMN "teamName" TEXT;
ALTER TABLE "team_seasons" ADD COLUMN "madePlayoffs" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "team_seasons" ADD COLUMN "playoffSeed" INTEGER;
ALTER TABLE "team_seasons" ADD COLUMN "playoffWins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "team_seasons" ADD COLUMN "playoffLosses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "team_seasons" ADD COLUMN "playoffByes" INTEGER NOT NULL DEFAULT 0;

-- Add playoff match type to Matchup (bracket labeling)
ALTER TABLE "matchups" ADD COLUMN "playoffMatchType" TEXT;
