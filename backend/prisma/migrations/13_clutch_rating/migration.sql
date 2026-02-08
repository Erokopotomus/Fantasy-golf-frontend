-- Phase 5: Clutch Manager Rating + User Bio Fields
-- Migration 13_clutch_rating

-- ─── New table: clutch_manager_ratings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS clutch_manager_ratings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  overall_rating FLOAT,
  accuracy_component FLOAT,
  consistency_component FLOAT,
  volume_component FLOAT,
  breadth_component FLOAT,
  tier VARCHAR(20) DEFAULT 'developing',
  trend VARCHAR(10) DEFAULT 'stable',
  total_graded_calls INTEGER DEFAULT 0,
  computation_inputs JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT clutch_manager_ratings_user_id_key UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_clutch_manager_ratings_tier ON clutch_manager_ratings(tier);
CREATE INDEX IF NOT EXISTS idx_clutch_manager_ratings_overall ON clutch_manager_ratings(overall_rating DESC);

-- ─── New columns on users ──────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS tagline VARCHAR(280);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
