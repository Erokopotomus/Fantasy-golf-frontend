# Chopped Format for Fantasy Golf — Design

**Date:** 2026-05-20
**Status:** Approved, ready for implementation plan
**Author:** Claude Code (brainstorming with Eric)

## Goal

Port the Chopped league format (shipped May 17 for NFL — queue #199) to PGA Tour fantasy golf. Lowest-scoring fantasy team after each PGA tournament gets chopped, roster goes to FAAB waivers. Add live updating Safe % during in-progress tournaments so users can watch their risk level shift hole-by-hole on Sunday afternoon.

## Why this design

NFL Chopped already has a healthy sport-agnostic core: `survivalService.js`, `tiebreaker.js`, `vocabulary.js`, `ChopEvent` table, `Team.eliminatedAt/eliminationWeek/finalRank` columns. The golf port adds parallel sport-specific services without touching NFL code.

Two key product calls:
1. **Chop decision uses finalized `WeeklyTeamResult.totalPoints`** from existing golf fantasy tracker — not Safe % projections like NFL's intent. Golf has clean Sunday-night finalization; the actual lowest scorer gets chopped, no probability math required.
2. **Live Safe % during tournaments** is UX-only texture. It tells users their risk in real time as hole-by-hole scoring updates, but does NOT drive the chop. Sunday 10:30 PM `WeeklyTeamResult` is the truth.

## Architecture decisions (resolved during brainstorm)

1. **Approach 2 — parallel golf services, NFL untouched.** New files in `backend/src/services/chopped/golf*`. Sport routing in `routes/chopped.js` branches by `league.season.sport.slug`. No refactor of existing NFL services.
2. **Cut handling — option A.** No special cut-day chop. A team whose entire active roster misses the cut Friday still "completes" the tournament with `Friday total + 0 weekend` and is chopped Monday based on that total. Matches how everything else in the platform treats golf scoring.
3. **Cron approach — zero new always-running crons.** Hook into existing tournament-aware crons:
   - Existing Thu-Sun 5-min live scoring cron → appended Safe % refresh call.
   - Existing Sunday 10:30 PM fantasy scoring cron → appended chop-check call (no-ops unless past waiver-close).
   - One new cron Monday 4 AM ET (`0 4 * * 1`) — fires the chop fallback for any league that hadn't been chopped yet and is past waiver-close. Fires before any user is awake on the West Coast.
4. **Off-week handling is implicit.** No special "PGA off-week" logic. The existing tournament-aware crons don't fire when there's no tournament; the chop cron queries Tournament for recent finalizations and exits early if there are none.

## Schema change

One new model `ChoppedLiveSnapshot` cached per `[leagueId, tournamentId, teamId]`. Refreshed every 5 min during in-progress tournaments. Read by the frontend Chop page.

```prisma
model ChoppedLiveSnapshot {
  id           String   @id @default(cuid())
  leagueId     String
  tournamentId String
  teamId       String
  safePct      Float
  mean         Float
  variance     Float
  computedAt   DateTime @default(now())

  league       League     @relation(fields: [leagueId], references: [id])
  tournament   Tournament @relation(fields: [tournamentId], references: [id])
  team         Team       @relation(fields: [teamId], references: [id])

  @@unique([leagueId, tournamentId, teamId])
  @@index([leagueId, tournamentId])
}
```

Migration is additive — no existing data touched, NFL Chopped unaffected.

## Data flow

**Pre-tournament (Wed before, baseline):**
A first-call snapshot is written when the live-scoring cron sees a new tournament transition to IN_PROGRESS. Mean = sum of player projections per team. Variance computed from per-player SG-Total round-to-round σ.

**During tournament (Thu-Sun, every 5 min):**
The existing live scoring cron writes/refreshes `Performance` rows (already happens). Immediately after, `golfSafePercent.refreshActiveLeagues()` fires for each CHOPPED golf league with an IN_PROGRESS tournament: pull each team's roster, sum player `points_so_far + projected_remaining`, compute team variance with tournament-progress shrinkage, run `computeSafePercentsFromTeams()` (sport-agnostic, already exists), write `ChoppedLiveSnapshot`.

**Tournament close (Sunday ~7 PM ET):**
Existing `fantasyTracker.js` Sunday 10:30 PM cron finalizes `WeeklyTeamResult.totalPoints` for all golf leagues. Existing behavior — no change.

**Auto-chop fallback (Monday 4 AM ET):**
New cron iterates CHOPPED golf leagues with the most recently finalized tournament endDate within ~3 days. Skip if `League.settings.autoChopFallback === false`, skip if `ChopEvent` already exists for `(leagueId, tournamentId)`, skip if ≤1 alive teams. Otherwise: `getMostRecentTournamentResults(leagueId)` → sort ascending by `totalPoints` → take bottom N → call `executeChop()` with `triggerType: 'auto_fallback'`.

## Live Safe % math

Per team:
- `team_mean = Σ (player_points_so_far + projected_remaining)`
- `team_variance = Σ player_variance × (1 - tournament_progress)²`

Per player:
- `player_points_so_far` — current fantasy contribution from `Performance` row
- `projected_remaining` — `(holes_remaining / 72) × player_skill_baseline`
  - `player_skill_baseline` from DataGolf `skillEstimate` mapped to expected fantasy points, fallback to `seasonStats.fantasyAvg`
  - Missed cut → 0
  - Not in tournament → 0
- `player_variance` — historical SG-Total round-to-round σ² over last 8 rounds. Default σ=2.0 if no history.
- `tournament_progress` — `(rounds_completed × 18 + holes_in_current_round) / 72`. Range 0 (Thursday morning) → 1 (Sunday final putt).

Final step: `computeSafePercentsFromTeams()` (sport-agnostic existing function).

## Files to create / modify

**Backend create:**
- `backend/src/services/chopped/golfScoreSource.js` — `getMostRecentTournamentResults(leagueId)`
- `backend/src/services/chopped/golfSafePercent.js` — `computeSafePercentsForLeague(leagueId, tournamentId)`, `refreshActiveLeagues()`
- `backend/src/services/chopped/golfAutoChopCron.js` — Monday 4 AM ET cron handler + `checkLeagues()` (callable from the Sunday cron too)
- `backend/prisma/migrations/<n>_chopped_live_snapshot/migration.sql` — new model

**Backend modify:**
- `backend/src/routes/chopped.js` — sport branching: golf leagues route to golf services
- Existing Thu-Sun live scoring cron file (TBD — identify during implementation) — append `golfSafePercent.refreshActiveLeagues()` call
- Existing Sunday 10:30 PM fantasy scoring cron file (TBD) — append `golfAutoChopCron.checkLeagues()` call
- `backend/src/index.js` — register new Monday 4 AM cron
- `backend/prisma/schema.prisma` — add `ChoppedLiveSnapshot` model + back-relations on League, Tournament, Team

**Frontend modify:**
- `frontend/src/lib/chopped/vocabulary.js` — add sport-aware label helpers (`cadenceUnit(sport)`, `closeDayLabel(sport)`)
- Existing Chop page components — no changes needed (data shape is identical)

**Test scripts:**
- `backend/scripts/chopped/test-golf-score-source.js`
- `backend/scripts/chopped/test-golf-safe-percent.js`
- `backend/scripts/chopped/seed-golf-test-league.js`

## Error handling

- No tournament finalized in last 7 days when cron fires → no-op + log
- `WeeklyTeamResult` row missing for a team → treat as 0 points (chop them — surface the bug rather than silently skipping)
- DataGolf skill estimate missing → fallback to `seasonStats.fantasyAvg`, then to static 1.5 pts/hole
- Tournament still IN_PROGRESS at Monday 4 AM cron → defer, no-op + warning log
- Snapshot write fails during live update → log + skip that league
- All-zero scores across all teams (data outage) → don't auto-chop, log loudly, commissioner can manually intervene
- `executeChop()` transaction failure → handled by existing `survivalService.js` (Prisma transaction, atomic)

## Out of scope

- NFL Chopped live-stats provider fix (queue #216 — surfaced during this brainstorm but distinct project)
- Live Safe % via WebSocket (5-min refresh cadence is sufficient for v1)
- Commissioner-configurable scoring tweaks for Chopped golf
- Mid-tournament "you're cooked" notifications for teams whose rosters missed the cut
- Multi-tournament weeks (rare two-event weeks; defer until it actually causes a bug)
- Tournament-selection UI (every PGA Tour event automatically counts; defer commissioner picking specific tournaments)

## References

- NFL Chopped: `docs/plans/2026-05-17-chopped-format-design.md`, `docs/plans/2026-05-17-chopped-format-plan.md`
- Sport-agnostic services: `backend/src/services/chopped/survivalService.js`, `tiebreaker.js`, `safePercentService.js` (math only)
- Existing golf fantasy tracker: `backend/src/services/fantasyTracker.js` (lines 255-289 — `WeeklyTeamResult` upsert)
- Live scoring sync (where to hook): existing Thu-Sun 5-min cron (identify during implementation)
- Sunday finalization cron: existing 10:30 PM cron in `backend/src/index.js`
- DataGolf skill estimate source: existing `seasonStats.fantasyAvg` + `Player.sgTotal` / round variance
- Surfaced as queue #216 during brainstorm: NFL Chopped live-stats provider currently returns zeros — fix needed for NFL parity
