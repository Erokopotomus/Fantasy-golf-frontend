-- NFL Expansion: Teams, Games, Player Game Stats
-- Manual migration with IF NOT EXISTS for Railway safety

-- Add NFL ID fields to players table
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "gsisId" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "pfrId" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "nflPosition" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "nflTeamAbbr" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "nflNumber" INTEGER;

-- Unique index on gsisId (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "players_gsisId_key" ON "players"("gsisId");
CREATE INDEX IF NOT EXISTS "players_gsisId_idx" ON "players"("gsisId");

-- NFL Teams
CREATE TABLE IF NOT EXISTS "nfl_teams" (
    "id" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "conference" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nfl_teams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nfl_teams_abbreviation_key" ON "nfl_teams"("abbreviation");

-- NFL Games
CREATE TABLE IF NOT EXISTS "nfl_games" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "gameType" TEXT NOT NULL DEFAULT 'REG',
    "kickoff" TIMESTAMP(3) NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "venue" TEXT,
    "surface" TEXT,
    "roof" TEXT,
    "weather" JSONB,
    "spreadLine" DOUBLE PRECISION,
    "totalLine" DOUBLE PRECISION,
    "homeMoneyline" INTEGER,
    "awayMoneyline" INTEGER,
    "sourceProvider" TEXT,
    "sourceIngestedAt" TIMESTAMP(3),
    "clutchTransformedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nfl_games_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nfl_games_externalId_key" ON "nfl_games"("externalId");
CREATE INDEX IF NOT EXISTS "nfl_games_season_week_idx" ON "nfl_games"("season", "week");
CREATE INDEX IF NOT EXISTS "nfl_games_status_idx" ON "nfl_games"("status");

ALTER TABLE "nfl_games" DROP CONSTRAINT IF EXISTS "nfl_games_homeTeamId_fkey";
ALTER TABLE "nfl_games" ADD CONSTRAINT "nfl_games_homeTeamId_fkey"
    FOREIGN KEY ("homeTeamId") REFERENCES "nfl_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nfl_games" DROP CONSTRAINT IF EXISTS "nfl_games_awayTeamId_fkey";
ALTER TABLE "nfl_games" ADD CONSTRAINT "nfl_games_awayTeamId_fkey"
    FOREIGN KEY ("awayTeamId") REFERENCES "nfl_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- NFL Player Game Stats
CREATE TABLE IF NOT EXISTS "nfl_player_games" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "teamAbbr" TEXT NOT NULL,

    -- Passing
    "passAttempts" INTEGER,
    "passCompletions" INTEGER,
    "passYards" INTEGER,
    "passTds" INTEGER,
    "interceptions" INTEGER,
    "sacked" INTEGER,
    "sackYards" INTEGER,
    "passerRating" DOUBLE PRECISION,

    -- Rushing
    "rushAttempts" INTEGER,
    "rushYards" INTEGER,
    "rushTds" INTEGER,
    "fumbles" INTEGER,
    "fumblesLost" INTEGER,

    -- Receiving
    "targets" INTEGER,
    "receptions" INTEGER,
    "recYards" INTEGER,
    "recTds" INTEGER,

    -- Advanced
    "epa" DOUBLE PRECISION,
    "cpoe" DOUBLE PRECISION,
    "successRate" DOUBLE PRECISION,

    -- Usage
    "snapCount" INTEGER,
    "snapPct" DOUBLE PRECISION,
    "targetShare" DOUBLE PRECISION,
    "rushShare" DOUBLE PRECISION,

    -- Defense/ST
    "sacks" DOUBLE PRECISION,
    "tacklesSolo" INTEGER,
    "tacklesAssist" INTEGER,
    "passesDefended" INTEGER,
    "fumblesForced" INTEGER,
    "fumblesRecovered" INTEGER,
    "defInterceptions" INTEGER,
    "defTds" INTEGER,

    -- Kicking
    "fgMade" INTEGER,
    "fgAttempts" INTEGER,
    "fgPct" DOUBLE PRECISION,
    "xpMade" INTEGER,
    "xpAttempts" INTEGER,

    -- Fantasy
    "fantasyPtsStd" DOUBLE PRECISION,
    "fantasyPtsPpr" DOUBLE PRECISION,
    "fantasyPtsHalf" DOUBLE PRECISION,

    -- Source tracking
    "sourceProvider" TEXT,
    "sourceIngestedAt" TIMESTAMP(3),
    "clutchTransformedAt" TIMESTAMP(3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nfl_player_games_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "nfl_player_games_playerId_gameId_key" ON "nfl_player_games"("playerId", "gameId");
CREATE INDEX IF NOT EXISTS "nfl_player_games_gameId_idx" ON "nfl_player_games"("gameId");
CREATE INDEX IF NOT EXISTS "nfl_player_games_playerId_idx" ON "nfl_player_games"("playerId");
CREATE INDEX IF NOT EXISTS "nfl_player_games_teamAbbr_idx" ON "nfl_player_games"("teamAbbr");

ALTER TABLE "nfl_player_games" DROP CONSTRAINT IF EXISTS "nfl_player_games_playerId_fkey";
ALTER TABLE "nfl_player_games" ADD CONSTRAINT "nfl_player_games_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nfl_player_games" DROP CONSTRAINT IF EXISTS "nfl_player_games_gameId_fkey";
ALTER TABLE "nfl_player_games" ADD CONSTRAINT "nfl_player_games_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "nfl_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
