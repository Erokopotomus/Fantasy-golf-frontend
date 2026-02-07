-- Analytics & Performance Indexes (Phase 4)
-- GIN indexes on JSONB columns for fast backtesting queries

-- PlayerSeasonStats JSONB indexes
CREATE INDEX IF NOT EXISTS idx_pss_stats_gin ON player_season_stats USING GIN (stats);
CREATE INDEX IF NOT EXISTS idx_pss_fantasy_points_gin ON player_season_stats USING GIN ("fantasyPoints");
CREATE INDEX IF NOT EXISTS idx_pss_rankings_gin ON player_season_stats USING GIN (rankings);

-- FantasyScore breakdown index
CREATE INDEX IF NOT EXISTS idx_fs_breakdown_gin ON fantasy_scores USING GIN (breakdown);

-- TeamSeason stats index
CREATE INDEX IF NOT EXISTS idx_ts_stats_gin ON team_seasons USING GIN (stats);

-- Sport config index
CREATE INDEX IF NOT EXISTS idx_sport_config_gin ON sports USING GIN (config);

-- ScoringSystem rules index
CREATE INDEX IF NOT EXISTS idx_ss_rules_gin ON scoring_systems USING GIN (rules);

-- Partial index on active roster entries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_roster_active ON roster_entries ("teamId") WHERE "isActive" = true;

-- Compound indexes for backtesting query patterns
CREATE INDEX IF NOT EXISTS idx_fs_season_system_points ON fantasy_scores ("seasonId", "scoringSystemId", "totalPoints" DESC);
CREATE INDEX IF NOT EXISTS idx_fs_player_season ON fantasy_scores ("playerId", "seasonId");
CREATE INDEX IF NOT EXISTS idx_perf_tournament_position ON performances ("tournamentId", position ASC NULLS LAST);

-- PlayerConsistency query patterns
CREATE INDEX IF NOT EXISTS idx_pc_season_system_avg ON player_consistency ("seasonId", "scoringSystemId", "avgPoints" DESC);

-- OwnershipRate query patterns
CREATE INDEX IF NOT EXISTS idx_or_season_week_pct ON ownership_rates ("seasonId", "fantasyWeekId", "ownershipPct" DESC);

-- ─── Materialized Views ──────────────────────────────────────────────────────

-- 1. Player fantasy rankings by season and scoring system
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_player_fantasy_rankings AS
SELECT
  fs."playerId",
  fs."seasonId",
  fs."scoringSystemId",
  COUNT(*) AS weeks_played,
  SUM(fs."totalPoints") AS total_points,
  AVG(fs."totalPoints") AS avg_points,
  MIN(fs."totalPoints") AS min_points,
  MAX(fs."totalPoints") AS max_points,
  RANK() OVER (PARTITION BY fs."seasonId", fs."scoringSystemId" ORDER BY SUM(fs."totalPoints") DESC) AS season_rank
FROM fantasy_scores fs
GROUP BY fs."playerId", fs."seasonId", fs."scoringSystemId";

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pfr_unique ON mv_player_fantasy_rankings ("playerId", "seasonId", "scoringSystemId");
CREATE INDEX IF NOT EXISTS idx_mv_pfr_rank ON mv_player_fantasy_rankings ("seasonId", "scoringSystemId", season_rank);

-- 2. Draft strategy outcomes — each pick with pre-draft stats and actual outcome
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_draft_strategy_outcomes AS
SELECT
  dp.id AS draft_pick_id,
  dp."draftId",
  dp."teamId",
  dp."playerId",
  dp."pickNumber",
  dp.round,
  dp.amount,
  d."leagueId",
  -- Pre-draft player stats (from Player table at time of query refresh)
  p."owgrRank",
  p."sgTotal",
  p."sgPutting",
  p."sgApproach",
  p."sgOffTee",
  p."sgAroundGreen",
  p.events,
  p."top10s",
  p."cutsMade",
  -- Post-draft outcome (from DraftValueTracker)
  dvt."totalFantasyPoints",
  dvt."fantasyRank",
  dvt."valueOverReplacement",
  dvt."valueVsAdp"
FROM draft_picks dp
JOIN drafts d ON dp."draftId" = d.id
JOIN players p ON dp."playerId" = p.id
LEFT JOIN draft_value_trackers dvt ON dvt."draftPickId" = dp.id
WHERE d.status = 'COMPLETED';

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dso_unique ON mv_draft_strategy_outcomes (draft_pick_id);
CREATE INDEX IF NOT EXISTS idx_mv_dso_round ON mv_draft_strategy_outcomes (round, "pickNumber");

-- 3. Weekly scoring leaders — top 50 per week per scoring system
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_weekly_scoring_leaders AS
SELECT
  fs."fantasyWeekId",
  fs."scoringSystemId",
  fs."playerId",
  fs."totalPoints",
  fs.rank,
  fw."weekNumber",
  fw.name AS week_name,
  fw."seasonId"
FROM fantasy_scores fs
JOIN fantasy_weeks fw ON fs."fantasyWeekId" = fw.id
WHERE fs.rank <= 50;

CREATE INDEX IF NOT EXISTS idx_mv_wsl_week ON mv_weekly_scoring_leaders ("fantasyWeekId", "scoringSystemId", rank);
CREATE INDEX IF NOT EXISTS idx_mv_wsl_player ON mv_weekly_scoring_leaders ("playerId", "seasonId");
