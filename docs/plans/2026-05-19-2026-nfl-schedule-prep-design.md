# 2026 NFL Schedule Sync + Prep Team-Page Schedule Strip — Design

**Date:** 2026-05-19
**Status:** Approved, ready for implementation plan
**Author:** Claude Code (brainstorming with Eric)

## Goal

Sync the 2026 NFL regular-season schedule into `NflGame` and surface it on the Lab → Prep team detail pages so users can see each team's full 17-game schedule when prepping for fantasy draft.

## Background

`NflGame` currently has 0 rows for `season = 2026` (only 2024 and 2025 are populated). The NFL released the 2026 schedule in mid-May 2026 — data is available via nflverse but we haven't pulled it. The existing `syncScheduleRaw(prisma, season)` service in `backend/src/services/nflHistoricalSync.js` handles the ingest end-to-end.

## What we explicitly are NOT doing

Strength of Schedule heatmap (queue #214) — paused because:
- We don't want to be in the projection business (Eric's call — saturated market, hard to compete)
- No clean free public API exists for per-position SoS data (FantasyPros, NFL.com, ESPN — all require partnership auth or scraping)
- Computing it ourselves from historical data is materially less accurate than Fantasy Footballers / PFF without roster-turnover signals we don't have

Scope here is **schedule data + display only**, no projections, no difficulty coloring on the cells. Difficulty/SoS gets revisited when we either license a data source or change our position on scraping.

## Architecture

Two pieces:

1. **One-time data sync:** Run `syncScheduleRaw(prisma, 2026)` to populate `NflGame` with the 272 regular-season games (32 teams × 17 games + a couple international games). Eventually wire this into the existing Phase 5H cron schedule so flex games and scheduling updates get pulled incrementally.

2. **Surface on team detail pages:** Extend the existing `GET /api/prep/teams/:abbr` response to include `schedule2026: [{ week, opponent, isHome, kickoff, gameType, isPrimetime }]` for that team. New `<TeamScheduleStrip />` component on `/lab/prep/teams/:abbr` renders the 18 weeks.

## Page layout

Team detail page (`/lab/prep/teams/:abbr`) order, top to bottom:
1. Hero strip (existing)
2. Coaching card (existing)
3. 3-year unit trend (existing)
4. Depth chart (existing)
5. **What changed for {abbr}** (existing — stays where it is)
6. **NEW: 2026 Schedule** (new — drops in here)

The schedule lives below What Changed because What Changed is the headline draft-prep context for a team — who joined, who left, who's the new HC. Schedule is the secondary "now where do they play it out" context.

## Schedule strip visual

**Two side-by-side panels** on desktop, stacked on mobile.

- Left panel: weeks 1-9
- Right panel: weeks 10-18

Each panel is a 9-row vertical list. Each row contains:
- Week number (`font-mono text-[10px] uppercase tracking-[0.22em]` muted)
- Left-border accent in opponent's team color (using existing `TEAM_COLORS`, reusing the `PlayerRowAccent` visual pattern from Mock Draft to keep design vocabulary consistent across Prep + Lab)
- Opponent abbreviation (`font-display font-bold`)
- `@` prefix for road games
- Opponent name (truncated on narrow widths)
- Kickoff day (Sun / Thu / Mon — abbreviated)
- Optional primetime pip (TNF / SNF / MNF) if `kickoff` is Thursday night, Sunday night, or Monday night based on the kickoff time

Bye week row: muted gray, no team-color accent, "BYE" label.

Mobile: panels stack vertically (single 18-row list). Mobile widths can collapse the opponent name and keep just abbreviation + @ indicator.

## Data flow

**Backend:**
- Run-once script `backend/scripts/run-nfl-schedule-sync-2026.js` that calls `syncScheduleRaw(prisma, 2026)`. Idempotent — re-runnable any time to refresh.
- Modify `backend/src/routes/prep.js` (`GET /teams/:abbr`) to query `NflGame` for season 2026 where `homeTeamId === team.id || awayTeamId === team.id`, sorted by week. Compute opponent from the other side of the matchup, derive `isHome`, `kickoff`, `gameType`, `isPrimetime` (from kickoff time).

**Frontend:**
- New `<TeamScheduleStrip />` in `frontend/src/components/prep/`
- Slotted into `frontend/src/pages/PrepTeamDetail.jsx` below the existing "What Changed for {abbr}" card

## Primetime detection

Game is primetime if its `kickoff` time falls in one of:
- Thursday 8:15 PM ET or later → TNF
- Sunday 8:20 PM ET or later → SNF
- Monday 8:15 PM ET or later → MNF

Implement as a pure helper function. NFL international games (sometimes Sun 9:30 AM ET in London) are NOT primetime — they're regular Sunday games.

## Error handling

- `syncScheduleRaw(prisma, 2026)` failure → log + exit non-zero. Re-run is safe.
- If `NflGame` has < 17 games for the team season — show a "Schedule loading..." message in the strip, don't render half-empty data.
- If opponent abbreviation isn't in `TEAM_COLORS` — fall back to blaze (same pattern as `teamPrimary()` from lab-draft).

## Out of scope

- Strength of schedule difficulty coloring (deferred — see `What we explicitly are NOT doing` above)
- Hover details on each game cell (kickoff time, venue, weather forecast for future games — none of which we have for forward-looking games anyway)
- Linking each cell to a game detail page (no such page exists yet)
- Postseason / playoff rounds (just regular season weeks 1-18)

## References

- `backend/src/services/nflHistoricalSync.js` — `syncScheduleRaw(prisma, season)` already implemented + tested for prior seasons
- `backend/src/routes/prep.js` — existing team detail route to extend
- `frontend/src/pages/PrepTeamDetail.jsx` — surface to add the strip
- `frontend/src/utils/nflTeamColors.js` — `TEAM_COLORS` palette + `hexToRgba`
- `frontend/src/components/lab-draft/PlayerRowAccent.jsx` — visual pattern to mirror
