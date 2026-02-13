-- Migration 42: Commissioner Posts / League Bulletin Board
-- Three tables: league_posts, league_post_reactions, league_post_comments

CREATE TABLE IF NOT EXISTS league_posts (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_league_posts_league ON league_posts(league_id, created_at DESC);

CREATE TABLE IF NOT EXISTS league_post_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES league_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  emoji TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON league_post_reactions(post_id);

CREATE TABLE IF NOT EXISTS league_post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES league_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON league_post_comments(post_id, created_at ASC);

-- Add commissionerNotes to AI feature toggles (update existing singleton)
UPDATE "AiEngineConfig"
SET "featureToggles" = "featureToggles"::jsonb || '{"commissionerNotes": false}'::jsonb
WHERE id = 'singleton'
  AND NOT ("featureToggles"::jsonb ? 'commissionerNotes');
