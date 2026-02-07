-- Materialized View: mv_manager_league_type_performance
-- Per user x sport x format: W/L, avgFinish, championships
CREATE MATERIALIZED VIEW mv_manager_league_type_performance AS
SELECT
    t."userId",
    l."sportId",
    l."format",
    COUNT(DISTINCT ls."id") AS league_count,
    COUNT(DISTINCT ts."id") AS seasons_played,
    SUM(ts."wins") AS total_wins,
    SUM(ts."losses") AS total_losses,
    SUM(ts."ties") AS total_ties,
    CASE WHEN SUM(ts."wins") + SUM(ts."losses") + SUM(ts."ties") > 0
         THEN ROUND(SUM(ts."wins")::numeric / (SUM(ts."wins") + SUM(ts."losses") + SUM(ts."ties"))::numeric, 4)
         ELSE 0 END AS win_pct,
    AVG(ts."finalRank") AS avg_finish,
    MIN(ts."finalRank") AS best_finish,
    SUM(CASE WHEN ts."isChampion" THEN 1 ELSE 0 END) AS championships,
    SUM(ts."totalPoints") AS total_points,
    AVG(ts."totalPoints") AS avg_points_per_season,
    MAX(ts."bestWeekPoints") AS best_week_ever,
    MAX(ts."maxWinStreak") AS longest_win_streak
FROM team_seasons ts
JOIN teams t ON ts."teamId" = t."id"
JOIN league_seasons ls ON ts."leagueSeasonId" = ls."id"
JOIN leagues l ON ls."leagueId" = l."id"
WHERE l."sportId" IS NOT NULL
GROUP BY t."userId", l."sportId", l."format";

CREATE UNIQUE INDEX mv_manager_league_type_perf_idx
    ON mv_manager_league_type_performance("userId", "sportId", "format");

-- Materialized View: mv_manager_draft_tendency
-- Per user x sport x position: avg spend, avg pick, ROI
CREATE MATERIALIZED VIEW mv_manager_draft_tendency AS
SELECT
    t."userId",
    l."sportId",
    pos."abbr" AS position_abbr,
    pos."name" AS position_name,
    COUNT(dp."id") AS times_drafted,
    AVG(dp."pickNumber") AS avg_pick_number,
    AVG(dp."amount") AS avg_auction_amount,
    AVG(dvt."totalFantasyPoints") AS avg_fantasy_points,
    AVG(dvt."valueOverReplacement") AS avg_vor,
    AVG(dvt."valueVsAdp") AS avg_value_vs_adp,
    CASE WHEN AVG(dp."amount") > 0
         THEN ROUND(AVG(dvt."totalFantasyPoints")::numeric / AVG(dp."amount")::numeric, 2)
         ELSE NULL END AS auction_roi
FROM draft_picks dp
JOIN teams t ON dp."teamId" = t."id"
JOIN drafts d ON dp."draftId" = d."id"
JOIN leagues l ON d."leagueId" = l."id"
LEFT JOIN player_positions pp ON dp."playerId" = pp."playerId" AND pp."isPrimary" = true
LEFT JOIN positions pos ON pp."positionId" = pos."id"
LEFT JOIN draft_value_trackers dvt ON dp."id" = dvt."draftPickId"
WHERE l."sportId" IS NOT NULL
  AND d."status" = 'COMPLETED'
GROUP BY t."userId", l."sportId", pos."abbr", pos."name";

CREATE UNIQUE INDEX mv_manager_draft_tendency_idx
    ON mv_manager_draft_tendency("userId", "sportId", "position_abbr");

-- Materialized View: mv_head_to_head_raw
-- Raw H2H results from WeeklyTeamResult matchups for aggregation
CREATE MATERIALIZED VIEW mv_head_to_head_raw AS
SELECT
    t."userId" AS user_id,
    opp_t."userId" AS opponent_user_id,
    l."sportId" AS sport_id,
    l."format" AS league_format,
    wtr."fantasyWeekId" AS fantasy_week_id,
    wtr."totalPoints" AS points_for,
    wtr."opponentPoints" AS points_against,
    wtr."result",
    wtr."createdAt"
FROM weekly_team_results wtr
JOIN teams t ON wtr."teamId" = t."id"
JOIN league_seasons ls ON wtr."leagueSeasonId" = ls."id"
JOIN leagues l ON ls."leagueId" = l."id"
JOIN teams opp_t ON wtr."opponentTeamId" = opp_t."id"
WHERE wtr."opponentTeamId" IS NOT NULL
  AND wtr."result" IS NOT NULL
  AND l."sportId" IS NOT NULL;

CREATE UNIQUE INDEX mv_head_to_head_raw_idx
    ON mv_head_to_head_raw("user_id", "opponent_user_id", "fantasy_week_id");
CREATE INDEX mv_head_to_head_raw_user_idx ON mv_head_to_head_raw("user_id");
CREATE INDEX mv_head_to_head_raw_opp_idx ON mv_head_to_head_raw("opponent_user_id");
