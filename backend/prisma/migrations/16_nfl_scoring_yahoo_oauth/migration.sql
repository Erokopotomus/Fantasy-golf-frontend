-- 16_nfl_scoring_yahoo_oauth
-- Adds: NflPlayerGame stat fields for custom scoring, UserOAuthToken model

-- ═══ NflPlayerGame new stat columns ═══

-- 2-point conversions
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "pass2pt" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "rush2pt" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "rec2pt" INTEGER;

-- Special teams / return stats
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "returnYards" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "returnTds" INTEGER;

-- Kicking distance breakdown
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "fgMade0_19" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "fgMade20_29" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "fgMade30_39" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "fgMade40_49" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "fgMade50Plus" INTEGER;

-- Team defense extras
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "safeties" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "blockedKicks" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "pointsAllowed" INTEGER;
ALTER TABLE "nfl_player_games" ADD COLUMN IF NOT EXISTS "yardsAllowed" INTEGER;

-- ═══ UserOAuthToken table ═══

CREATE TABLE IF NOT EXISTS "user_oauth_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one token per user per provider
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_oauth_tokens_userId_provider_key'
    ) THEN
        ALTER TABLE "user_oauth_tokens" ADD CONSTRAINT "user_oauth_tokens_userId_provider_key" UNIQUE ("userId", "provider");
    END IF;
END $$;

-- Foreign key to users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_oauth_tokens_userId_fkey'
    ) THEN
        ALTER TABLE "user_oauth_tokens" ADD CONSTRAINT "user_oauth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
