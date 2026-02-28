-- Migration 48: Yahoo Player Cache
-- Persistent cache of Yahoo player IDs → names to avoid redundant API calls

CREATE TABLE IF NOT EXISTS "yahoo_player_cache" (
    "yahooId"   INTEGER      NOT NULL,
    "fullName"  TEXT         NOT NULL,
    "position"  TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yahoo_player_cache_pkey" PRIMARY KEY ("yahooId")
);
