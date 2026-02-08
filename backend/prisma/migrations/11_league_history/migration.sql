-- Player platform IDs for cross-platform matching
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "sleeperId" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "mflId" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "fantraxId" TEXT;

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'SCANNING', 'MAPPING', 'IMPORTING', 'REVIEW', 'COMPLETE', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "league_imports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "sourceLeagueId" TEXT,
    "sourceLeagueName" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "seasonsFound" INTEGER,
    "seasonsImported" JSONB NOT NULL DEFAULT '[]',
    "mappingData" JSONB NOT NULL DEFAULT '{}',
    "errorLog" JSONB NOT NULL DEFAULT '[]',
    "rawData" JSONB,
    "clutchLeagueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "league_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "historical_seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "importId" TEXT,
    "seasonYear" INTEGER NOT NULL,
    "teamName" TEXT,
    "ownerName" TEXT,
    "ownerUserId" TEXT,
    "finalStanding" INTEGER,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsAgainst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "playoffResult" TEXT,
    "draftData" JSONB,
    "rosterData" JSONB,
    "weeklyScores" JSONB,
    "transactions" JSONB,
    "awards" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historical_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "league_imports_userId_idx" ON "league_imports"("userId");
CREATE INDEX IF NOT EXISTS "league_imports_sourcePlatform_status_idx" ON "league_imports"("sourcePlatform", "status");
CREATE INDEX IF NOT EXISTS "historical_seasons_leagueId_seasonYear_idx" ON "historical_seasons"("leagueId", "seasonYear");
CREATE INDEX IF NOT EXISTS "historical_seasons_ownerUserId_idx" ON "historical_seasons"("ownerUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "historical_seasons_leagueId_seasonYear_ownerName_key" ON "historical_seasons"("leagueId", "seasonYear", "ownerName");

-- AddForeignKey (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE "league_imports" ADD CONSTRAINT "league_imports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "league_imports" ADD CONSTRAINT "league_imports_clutchLeagueId_fkey" FOREIGN KEY ("clutchLeagueId") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "historical_seasons" ADD CONSTRAINT "historical_seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "historical_seasons" ADD CONSTRAINT "historical_seasons_importId_fkey" FOREIGN KEY ("importId") REFERENCES "league_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "historical_seasons" ADD CONSTRAINT "historical_seasons_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
