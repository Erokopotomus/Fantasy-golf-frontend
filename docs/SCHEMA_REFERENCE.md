# DATABASE SCHEMA REFERENCE

> **Moved from CLAUDE.md** — Full SQL schemas for reference. The authoritative schema is always `backend/prisma/schema.prisma` (~2,800 lines, 91+ models).

---

## Existing Core Tables (built in Phase 1)
- `users` — id, email, name, avatar, role (user/admin), password, notificationPreferences, created_at
- `leagues` — id, name, format, draftType, maxTeams, settings (JSONB), sportId, scoringSystemId, status, inviteCode, ownerId
- `league_members` — league_id, user_id, role, joined_at
- `players` — id, name, sportId, rank, sgTotal, sgOffTee, sgApproach, sgAroundGreen, sgPutting, primaryTour, headshotUrl, countryFlag, recentForm, etc.
- `teams` — id, name, leagueId, userId, totalPoints
- `roster_entries` — id, teamId, playerId, position, rosterStatus, isActive, droppedAt, acquiredVia, isKeeper, keeperCost, keeperYear, keptAt, keeperYearsKept
- `matchups` — id, leagueId, fantasyWeekId, homeTeamId, awayTeamId, homeScore, awayScore, result
- `transactions` (RosterTransaction) — id, teamId, leagueId, type, playerId, playerName, metadata
- `draft_picks` — id, draftId, teamId, playerId, round, pickNumber, playerRank
- `notifications` — id, userId, type, title, message, actionUrl, isRead, data
- `draft_dollar_accounts` — id, teamId, leagueSeasonId, currentBalance, nextYearBalance (@@unique teamId+leagueSeasonId)
- `draft_dollar_transactions` — id, leagueId, leagueSeasonId, fromTeamId, toTeamId, amount, yearType, category, description, tradeId, initiatedById

## Sport/Season Infrastructure (built in Phase 1)
- `sports` — id, name, slug, config (JSONB)
- `seasons` — id, sportId, year, isCurrent, startDate, endDate
- `fantasy_weeks` — id, seasonId, name, status, startDate, endDate, tournamentId
- `scoring_systems` — id, sportId, name, config (JSONB)
- `league_seasons` — id, leagueId, seasonId, status
- `team_seasons` — id, teamId, leagueSeasonId, totalPoints, wins, losses, ties, rank
- `weekly_team_results` — id, teamSeasonId, fantasyWeekId, totalPoints, optimalPoints, benchPoints
- `fantasy_scores` — id, fantasyWeekId, playerRef, scoringSystemId, totalPoints, breakdown (JSONB)
- `lineup_snapshots` — id, teamId, fantasyWeekId, activePlayerIds, benchPlayerIds
- `team_budgets` — id, teamId, leagueSeasonId, totalBudget, remainingBudget

## Analytics & Profiles (built in Phase 1)
- `manager_profiles` — cross-sport lifetime stats per user per sport
- `head_to_head_records` — W/L/T between user pairs
- `achievements` — 32 seeded achievement definitions
- `achievement_unlocks` — per-user unlock records
- `manager_season_summaries` — per-user per-sport per-season rollups
- `positions`, `player_positions`, `roster_slot_definitions`, `player_tags`, `player_tag_assignments`, `sport_player_profiles`
- `draft_grades`, `mock_draft_results`
- `push_tokens` — web push subscription storage
- `waiver_claims` — FAAB/rolling waiver claim records

---

## New Tables (Phases 2-4)

### predictions
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  sport VARCHAR(20) NOT NULL, -- 'golf', 'nfl', 'nba', 'mlb'
  prediction_type VARCHAR(30) NOT NULL, -- 'performance_call', 'player_benchmark', 'weekly_winner', 'bold_call', 'trade_value', 'draft_value', 'waiver_call'
  category VARCHAR(50) NOT NULL, -- 'weekly', 'season_long', 'tournament', 'draft'
  event_id VARCHAR(100), -- tournament ID, NFL week, matchup ID
  subject_player_id VARCHAR(100), -- player this prediction is about
  prediction_data JSONB NOT NULL, -- {action: 'start', benchmark_value: 18.5, confidence: 'high', reasoning: '...'}
  outcome VARCHAR(20) DEFAULT 'pending', -- 'pending', 'correct', 'incorrect', 'push', 'voided'
  accuracy_score DECIMAL(5,4), -- 0.0 to 1.0, allows partial credit
  is_public BOOLEAN DEFAULT true,
  league_id UUID REFERENCES leagues(id), -- optional league context
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
CREATE INDEX idx_predictions_user ON predictions(user_id, sport, outcome);
CREATE INDEX idx_predictions_event ON predictions(event_id, prediction_type);
CREATE INDEX idx_predictions_pending ON predictions(outcome) WHERE outcome = 'pending';
```

### user_reputation
```sql
CREATE TABLE user_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  sport VARCHAR(20) NOT NULL,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,4) DEFAULT 0,
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  confidence_score DECIMAL(5,4) DEFAULT 0,
  percentile_rank INTEGER, -- 1-100
  tier VARCHAR(20) DEFAULT 'rookie', -- 'rookie', 'contender', 'sharp', 'expert', 'elite'
  badges JSONB DEFAULT '[]',
  weekly_rank INTEGER,
  season_rank INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, sport)
);
CREATE INDEX idx_reputation_sport_tier ON user_reputation(sport, tier);
CREATE INDEX idx_reputation_leaderboard ON user_reputation(sport, accuracy_rate DESC);
```

### analyst_profiles
```sql
CREATE TABLE analyst_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  display_name VARCHAR(50) NOT NULL,
  bio TEXT, -- 280 char max
  avatar_url VARCHAR(500),
  specialties JSONB DEFAULT '[]', -- ['golf', 'dynasty', 'waiver_wire']
  is_verified BOOLEAN DEFAULT false,
  is_creator BOOLEAN DEFAULT false,
  external_links JSONB DEFAULT '{}', -- {youtube: '...', twitter: '...', podcast: '...'}
  follower_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  monetization_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### league_imports
```sql
CREATE TABLE league_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  source_platform VARCHAR(20) NOT NULL, -- 'espn', 'yahoo', 'sleeper', 'fantrax', 'mfl', 'manual_csv'
  source_league_id VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'scraping', 'parsing', 'mapping', 'review', 'complete', 'failed'
  progress_pct INTEGER DEFAULT 0,
  seasons_found INTEGER,
  seasons_imported JSONB DEFAULT '[]',
  mapping_data JSONB DEFAULT '{}',
  error_log JSONB DEFAULT '[]',
  raw_data_url VARCHAR(500),
  clutch_league_id UUID REFERENCES leagues(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### historical_seasons
```sql
CREATE TABLE historical_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  import_id UUID REFERENCES league_imports(id),
  season_year INTEGER NOT NULL,
  team_name VARCHAR(100),
  owner_name VARCHAR(100),
  owner_user_id UUID REFERENCES users(id), -- nullable until claimed
  final_standing INTEGER,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  points_for DECIMAL(10,2) DEFAULT 0,
  points_against DECIMAL(10,2) DEFAULT 0,
  playoff_result VARCHAR(20), -- 'champion', 'runner_up', 'semifinal', 'eliminated', 'missed'
  draft_data JSONB,
  roster_data JSONB,
  transactions JSONB,
  weekly_scores JSONB,
  awards JSONB
);
CREATE INDEX idx_historical_league_year ON historical_seasons(league_id, season_year);
```

## New Tables (Phase 4 — Data Architecture)

### clutch_player_id_map (Rosetta Stone)
```sql
CREATE TABLE clutch_player_id_map (
  clutch_player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport VARCHAR(20) NOT NULL,
  player_name VARCHAR(200) NOT NULL,
  datagolf_id VARCHAR(100),
  pga_tour_id VARCHAR(100),
  espn_id VARCHAR(100),
  owgr_id VARCHAR(100),
  slashgolf_id VARCHAR(100),
  nflverse_id VARCHAR(100),
  pfr_id VARCHAR(100),
  yahoo_id VARCHAR(100),
  draftkings_id VARCHAR(100),
  fanduel_id VARCHAR(100),
  last_synced TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_player_map_sport ON clutch_player_id_map(sport);
CREATE INDEX idx_player_map_datagolf ON clutch_player_id_map(datagolf_id) WHERE datagolf_id IS NOT NULL;
```

### clutch_event_id_map
```sql
CREATE TABLE clutch_event_id_map (
  clutch_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport VARCHAR(20) NOT NULL,
  event_name VARCHAR(200) NOT NULL,
  datagolf_event_id VARCHAR(100),
  espn_event_id VARCHAR(100),
  pga_tour_event_id VARCHAR(100),
  nflverse_game_id VARCHAR(100),
  start_date DATE,
  end_date DATE,
  venue_id VARCHAR(100)
);
```

### clutch_player_rounds (canonical performance data)
```sql
CREATE TABLE clutch_player_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clutch_player_id UUID NOT NULL REFERENCES clutch_player_id_map(clutch_player_id),
  clutch_event_id UUID NOT NULL REFERENCES clutch_event_id_map(clutch_event_id),
  round_number INTEGER,
  score INTEGER,
  sg_total FLOAT,
  sg_ott FLOAT,
  sg_approach FLOAT,
  sg_arg FLOAT,
  sg_putting FLOAT,
  fairways_hit_pct FLOAT,
  gir_pct FLOAT,
  source_provider VARCHAR(50) NOT NULL,
  source_ingested_at TIMESTAMP,
  clutch_transformed_at TIMESTAMP DEFAULT NOW()
);
```

### clutch_scores (proprietary computed metrics)
```sql
CREATE TABLE clutch_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clutch_player_id UUID NOT NULL REFERENCES clutch_player_id_map(clutch_player_id),
  clutch_event_id UUID REFERENCES clutch_event_id_map(clutch_event_id),
  clutch_performance_index FLOAT, -- CPI: -3.0 to +3.0
  clutch_course_fit_score FLOAT, -- 0-100
  clutch_form_score FLOAT,       -- 0-100
  clutch_pressure_score FLOAT,   -- -2.0 to +2.0
  formula_version VARCHAR(10) NOT NULL,
  computed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_clutch_scores_player ON clutch_scores(clutch_player_id, computed_at DESC);
```

### clutch_user_sport_ratings (Sport-Specific Clutch Rating — 0-100)
```sql
CREATE TABLE clutch_user_sport_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  sport VARCHAR(20) NOT NULL, -- 'nfl', 'golf', 'nba', 'mlb'
  rating INTEGER, -- 0-100
  accuracy_component FLOAT,     -- 40% weight
  consistency_component FLOAT,  -- 25% weight
  volume_component FLOAT,       -- 20% weight
  breadth_component FLOAT,      -- 15% weight (breadth by category within sport)
  tier VARCHAR(20), -- 'expert', 'sharp', 'proven', 'contender', 'rising'
  trend VARCHAR(10), -- 'up', 'down', 'stable'
  total_graded_calls INTEGER DEFAULT 0,
  qualified BOOLEAN DEFAULT false, -- true when >= 30 graded calls
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, sport)
);
CREATE INDEX idx_sport_ratings_leaderboard ON clutch_user_sport_ratings(sport, rating DESC) WHERE qualified = true;
```

### clutch_user_global_rating (Global Prestige Rating)
```sql
CREATE TABLE clutch_user_global_rating (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  global_rating INTEGER, -- 0-100 (weighted avg of sport ratings + breadth bonus)
  sports_qualified INTEGER DEFAULT 0, -- count of sports with qualified rating
  breadth_bonus FLOAT DEFAULT 0, -- bonus for multi-sport breadth
  global_tier VARCHAR(20), -- same tiers as sport: 'expert', 'sharp', 'proven', 'contender', 'rising'
  trend VARCHAR(10), -- 'up', 'down', 'stable'
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### clutch_user_sport_tags (Expertise Tags for Discovery)
```sql
CREATE TABLE clutch_user_sport_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tag VARCHAR(50) NOT NULL, -- e.g., 'NFL Sharp', 'Golf Expert', 'Dynasty Guru'
  sport VARCHAR(20),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tag)
);
CREATE INDEX idx_sport_tags_discovery ON clutch_user_sport_tags(tag, sport);
```

---

*Last updated: February 22, 2026*
