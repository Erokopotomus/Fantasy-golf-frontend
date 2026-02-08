-- Phase 4: Data Architecture & Proprietary Metrics
-- Migration: 12_data_architecture
-- Adds Layer 1 (raw staging), Layer 3 (computed metrics), event ID map, formula log
-- Adds source tracking fields to existing Player, Performance, Tournament tables

-- ============ Source Tracking Fields on Existing Tables ============

-- Player source tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'sourceProvider') THEN
    ALTER TABLE "players" ADD COLUMN "sourceProvider" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'sourceIngestedAt') THEN
    ALTER TABLE "players" ADD COLUMN "sourceIngestedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'clutchTransformedAt') THEN
    ALTER TABLE "players" ADD COLUMN "clutchTransformedAt" TIMESTAMP(3);
  END IF;
END $$;

-- Performance source tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performances' AND column_name = 'sourceProvider') THEN
    ALTER TABLE "performances" ADD COLUMN "sourceProvider" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performances' AND column_name = 'sourceIngestedAt') THEN
    ALTER TABLE "performances" ADD COLUMN "sourceIngestedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performances' AND column_name = 'clutchTransformedAt') THEN
    ALTER TABLE "performances" ADD COLUMN "clutchTransformedAt" TIMESTAMP(3);
  END IF;
END $$;

-- Tournament source tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'sourceProvider') THEN
    ALTER TABLE "tournaments" ADD COLUMN "sourceProvider" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'sourceIngestedAt') THEN
    ALTER TABLE "tournaments" ADD COLUMN "sourceIngestedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'clutchTransformedAt') THEN
    ALTER TABLE "tournaments" ADD COLUMN "clutchTransformedAt" TIMESTAMP(3);
  END IF;
END $$;

-- ============ Layer 1: Raw Provider Data (Staging) ============

CREATE TABLE IF NOT EXISTS "raw_provider_data" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "dataType" TEXT NOT NULL,
  "eventRef" TEXT,
  "payload" JSONB NOT NULL,
  "recordCount" INTEGER,
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "raw_provider_data_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "raw_provider_data_provider_dataType_ingestedAt_idx" ON "raw_provider_data"("provider", "dataType", "ingestedAt");
CREATE INDEX IF NOT EXISTS "raw_provider_data_provider_eventRef_idx" ON "raw_provider_data"("provider", "eventRef");

-- ============ Layer 3: Clutch Computed Metrics ============

CREATE TABLE IF NOT EXISTS "clutch_scores" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "tournamentId" TEXT,
  "cpi" DOUBLE PRECISION,
  "courseFitScore" DOUBLE PRECISION,
  "formScore" DOUBLE PRECISION,
  "pressureScore" DOUBLE PRECISION,
  "cpiComponents" JSONB,
  "formComponents" JSONB,
  "fitComponents" JSONB,
  "pressureComponents" JSONB,
  "formulaVersion" TEXT NOT NULL,
  "inputs" JSONB NOT NULL DEFAULT '{}',
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "clutch_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clutch_scores_playerId_tournamentId_formulaVersion_key" ON "clutch_scores"("playerId", "tournamentId", "formulaVersion");
CREATE INDEX IF NOT EXISTS "clutch_scores_playerId_computedAt_idx" ON "clutch_scores"("playerId", "computedAt" DESC);
CREATE INDEX IF NOT EXISTS "clutch_scores_tournamentId_idx" ON "clutch_scores"("tournamentId");

ALTER TABLE "clutch_scores" DROP CONSTRAINT IF EXISTS "clutch_scores_playerId_fkey";
ALTER TABLE "clutch_scores" ADD CONSTRAINT "clutch_scores_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "clutch_scores" DROP CONSTRAINT IF EXISTS "clutch_scores_tournamentId_fkey";
ALTER TABLE "clutch_scores" ADD CONSTRAINT "clutch_scores_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============ Event ID Map (Rosetta Stone) ============

CREATE TABLE IF NOT EXISTS "clutch_event_id_map" (
  "id" TEXT NOT NULL,
  "sport" TEXT NOT NULL DEFAULT 'golf',
  "eventName" TEXT NOT NULL,
  "datagolfEventId" TEXT,
  "espnEventId" TEXT,
  "pgaTourEventId" TEXT,
  "owgrEventId" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "tournamentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "clutch_event_id_map_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clutch_event_id_map_datagolfEventId_key" ON "clutch_event_id_map"("datagolfEventId");
CREATE UNIQUE INDEX IF NOT EXISTS "clutch_event_id_map_tournamentId_key" ON "clutch_event_id_map"("tournamentId");
CREATE INDEX IF NOT EXISTS "clutch_event_id_map_sport_idx" ON "clutch_event_id_map"("sport");

ALTER TABLE "clutch_event_id_map" DROP CONSTRAINT IF EXISTS "clutch_event_id_map_tournamentId_fkey";
ALTER TABLE "clutch_event_id_map" ADD CONSTRAINT "clutch_event_id_map_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============ Formula Version Audit Log ============

CREATE TABLE IF NOT EXISTS "clutch_formula_log" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "parameters" JSONB NOT NULL DEFAULT '{}',
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deactivatedAt" TIMESTAMP(3),

  CONSTRAINT "clutch_formula_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clutch_formula_log_version_key" ON "clutch_formula_log"("version");

-- Seed initial formula version
INSERT INTO "clutch_formula_log" ("id", "version", "description", "parameters", "activatedAt")
VALUES (
  'clformula_v1',
  'v1.0',
  'Initial Clutch metrics formula: CPI (weighted SG blend + recency decay + field strength), Form (last 4 events weighted), Pressure (pressure vs baseline delta), Course Fit (player profile x course profile dot product)',
  '{"cpi":{"lookbackEvents":12,"decayRate":0.92,"sgWeights":{"offTee":0.30,"approach":0.30,"aroundGreen":0.15,"putting":0.20,"sampleBonus":0.05}},"form":{"eventWeights":[0.40,0.25,0.20,0.15]},"pressure":{"scalingFactor":1.5,"lookbackMonths":24},"courseFit":{"qualityFloor":0.7,"historyBonusCap":10}}',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("version") DO NOTHING;
