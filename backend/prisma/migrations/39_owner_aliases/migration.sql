-- Migration 39: Owner Aliases (Commissioner owner name grouping)
-- Idempotent: safe to run multiple times

CREATE TABLE IF NOT EXISTS "owner_aliases" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "league_id" TEXT NOT NULL,
  "owner_name" TEXT NOT NULL,
  "canonical_name" TEXT NOT NULL,
  "owner_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "owner_aliases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "owner_aliases_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "owner_aliases_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Unique constraint: each raw name maps to exactly one canonical name per league
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'owner_aliases_league_id_owner_name_key'
  ) THEN
    ALTER TABLE "owner_aliases" ADD CONSTRAINT "owner_aliases_league_id_owner_name_key" UNIQUE ("league_id", "owner_name");
  END IF;
END $$;

-- Index on leagueId for fast lookups
CREATE INDEX IF NOT EXISTS "owner_aliases_league_id_idx" ON "owner_aliases"("league_id");
