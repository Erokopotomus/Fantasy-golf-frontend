# Chopped Golf Extension — Design + Plan

**Date:** 2026-05-17 (drafted), build target: this week
**Goal:** Extend the just-shipped Chopped NFL v1 to support golf leagues. Run a real Chopped golf league during the remaining 2026 PGA Tour season to stress-test UI/UX before NFL 2026 season opens.
**Reference:** Builds on `docs/plans/2026-05-17-chopped-format-design.md` (NFL v1). This doc is additive — most of the NFL infrastructure already works for golf with surgical modifications.

---

## Product decisions (from Eric)

1. **Chop cadence:** fires Sunday night after the final round of the tournament. (NFL fires at waiver close on Tuesday; golf decouples the two events.)
2. **Waiver close:** stays Tuesday 23:59 ET — gives bidding window for WDs, projections to firm up before Thursday tee-off.
3. **Default starters:** 5 golfers, but configurable at league creation AND editable in league settings later.
4. **Commish override:** same as NFL — commish can manually chop between Sunday post-round and Tuesday 23:59, otherwise auto-fallback fires.

**Implicit timing:**
- Sun ~11 PM ET: tournament scoring completes → auto-chop fires (or commish has already manually chopped earlier)
- Sun 11 PM onwards: chopped golfers instantly available in FAAB pool, bidding opens
- Tue 23:59 ET: waivers process, winners get released golfers
- Thursday: next tournament tees off with new rosters

---

## What carries over from NFL v1 unchanged

- `LeagueFormat.CHOPPED` enum value (migration 52)
- `Team.eliminatedAt / eliminationWeek / finalRank` columns
- `ChopEvent` audit table — `week` field repurposed as `FantasyWeek.weekNumber` (golf already has FantasyWeeks, one per tournament)
- `survivalService.executeChop` — the core transaction (mark eliminated, soft-delete roster, write ChopEvent, fire notifications, champion detection) is sport-agnostic
- `tiebreaker.js` — pure logic, sport-agnostic
- Per-league `waiverCloseDay/Time/Timezone` settings (Task 19) — exact same fields work for golf
- All 3 Chop Zone surfaces (widget, dedicated page, commish panel) — copy works for both sports, no changes
- ChoppedStandings.jsx — sport-agnostic
- Waiver wire "Recently Chopped" filter — already supports both sports
- TEAM_CHOPPED + CHOPPED_SEASON_COMPLETE notifications — sport-agnostic
- Vocabulary file — sport-agnostic
- `League.settings.chopsPerWeek / manualChopEnabled / autoChopFallback` — same settings, semantics shift slightly (chops per tournament, not per week)

---

## What needs to change

### A. Safe % math — golf-specific mean + variance

**The pure math layer (`computeSafePercentsFromTeams`) is sport-agnostic.** It takes `{teamId, mean, variance}` and runs pairwise normal-CDF. No change needed.

**The DB wrapper (`computeSafePercents`) hardcodes NFL.** It needs to branch on `league.sport`:

- **NFL path (existing):** sum starter projections + sum of position σ² (QB=8, RB=7, WR=9, TE=6, K=4, DST=6).
- **Golf path (new):** sum golfer projections from DataGolf + sum of per-golfer σ² computed from recent finish variance.

**Golf variance helper** — new function:
```js
// backend/src/services/chopped/golfVariance.js
async function computeGolferVariance(playerId, prisma, { lookbackTournaments = 10 } = {}) {
  // Pull last N tournaments' fantasy points for this golfer.
  // Return stdev² (variance). If insufficient data (<3 tournaments), use a
  // sport-wide default ~50 (matches roughly the spread of mid-tier golfers).
}
```

**Mean computation for golf** — use DataGolf projections already integrated:
- Pre-tournament: pull `ClutchProjection` rows for the active tournament (these already exist, computed daily via cron)
- Live mode (Thursday-Sunday during play): use current leaderboard projected total via existing `clutchMetrics` or pull from `LiveScore` table for the tournament

### B. Tournament-cadence cron (replaces "current week" lookup)

Current NFL auto-chop cron pulls `getCurrentNflWeek()` and runs Mon-Wed checking each league's `waiverCloseTime`. For golf, the cadence is different:

- **Trigger:** when a tournament transitions to status `COMPLETED` (Sunday final round done)
- **Existing hook:** the platform already has a Sun 10:30 PM ET cron that finalizes tournaments + processes scoring + resolves predictions. The chop fires AFTER scoring completes so we have final fantasy points.

**Implementation:** add a new step inside the existing Sun 10:30 PM cron handler:
```js
// After scoring + finalization, before logging "tournament complete"
const { runGolfChopForCompletedTournament } = require('./services/chopped/golfChopRunner')
await runGolfChopForCompletedTournament(completedTournamentId, prisma)
```

`runGolfChopForCompletedTournament` does:
1. Find all golf CHOPPED leagues
2. For each: find the corresponding FantasyWeek for this tournament
3. If a manual chop already exists for this week → skip
4. If `autoChopFallback === false` → skip (commish wants manual or nothing)
5. Compute Safe % using final scores
6. Pick bottom `chopsPerWeek` teams, call `executeChop` with `triggerType: 'auto_fallback'`

**NFL auto-chop cron stays unchanged** — still fires every 5 min Mon-Wed, still keyed off `waiverCloseTime`. Golf gets a totally separate trigger path.

### C. Frontend — enable Chopped for golf

Currently `FormatSelector.jsx` gates Chopped via `NFL_FORMATS = ['head-to-head', 'full-league', 'chopped']`. Need to allow Chopped for golf too.

**Change:**
- Remove the NFL_FORMATS gating for Chopped — show it for both sports.
- Optionally add a `GOLF_FORMATS` array if other formats need similar treatment, but the simpler change is to just drop Chopped from NFL_FORMATS-only filtering.

**ChoppedSettings.jsx:** add a "Starters per tournament" control (default 5 for golf, default starter logic for NFL stays unchanged via existing `formatSettings.startersPerWeek`).

**LeagueSettings page (edit later):** the existing `rosterSize / startersPerWeek` controls already let commish edit roster sizing. Verify these work for Chopped golf leagues without regression.

### D. Default settings on golf Chopped create

In `backend/src/routes/leagues.js` create handler, the NFL Chopped block currently sets:
```js
if (resolvedFormat === 'CHOPPED') {
  combinedSettings.waiverCloseDay = combinedSettings.waiverCloseDay || 'TUESDAY'
  combinedSettings.waiverCloseTime = combinedSettings.waiverCloseTime || '23:59'
  combinedSettings.waiverCloseTimezone = combinedSettings.waiverCloseTimezone || 'America/New_York'
}
```

That's actually exactly right for golf too — Tuesday 23:59 ET. No change needed.

But add:
```js
if (resolvedFormat === 'CHOPPED' && sportSlug === 'golf') {
  combinedSettings.startersPerWeek = combinedSettings.startersPerWeek || 5
}
```

### E. ChopEvent display for golf

The Chopped section in `ChopZone.jsx` currently shows "Wk N" for past chops. For golf, show the tournament name instead.

**Implementation:** when fetching events via `getChoppedEvents`, the backend can include the FantasyWeek + Tournament join. The frontend renders tournament name for golf, "Week N" for NFL.

Or simpler: backend returns a `displayLabel` string per event ("Masters 2026", "Week 5", etc.) and frontend just renders it.

### F. Vocabulary tweaks (optional polish)

`CHOPPED_VOCAB` is centralized — add golf-friendly fallback labels if Eric wants them. For now, "Survivors / Chopped / The Block / Champion" all work for both sports, so probably no change.

---

## Implementation tasks (bite-sized)

Estimated total: **~4-5 hours focused work**. Most of the lift is the golf Safe % math + the new chop runner. Frontend is minimal (one-line FormatSelector change + a starters field).

### Phase 1 — Backend math + cron (Tasks G1-G3)

**Task G1:** `golfVariance.js` — compute per-golfer variance from recent fantasy point history.
- File: `backend/src/services/chopped/golfVariance.js`
- Pull `Performance` rows for the player from the last `lookbackTournaments` (default 10) tournaments
- Compute stdev² of `fantasyPoints` field
- Fallback to `DEFAULT_GOLFER_VARIANCE = 50` if <3 data points
- Smoke test: variance for a known top-tier golfer (low variance) vs a journeyman (high variance)
- ~30 min

**Task G2:** Branch `computeSafePercents` on sport. Add golf path that queries DataGolf projections + golf variance.
- File: `backend/src/services/chopped/safePercentService.js`
- Detect `league.sport === 'GOLF'` (or sport slug); branch the team mean+variance computation
- Golf path: pull league's starters, get tournament projections from existing `ClutchProjection` table, get per-golfer variance from G1, sum
- Live mode: pull live leaderboard projected totals from `LiveScore` for in-progress tournaments
- Smoke test with synthetic golf league (3 teams, real DataGolf projections)
- ~60 min

**Task G3:** `golfChopRunner.js` — fires after Sunday tournament scoring completes.
- File: `backend/src/services/chopped/golfChopRunner.js`
- Export `runGolfChopForCompletedTournament(tournamentId, prisma)`
- Look up FantasyWeek for this tournament, find all golf CHOPPED leagues, run the chop logic (manual existing? skip. Auto disabled? skip. Otherwise compute + chop bottom team)
- Wire into existing Sun 10:30 PM cron in `backend/src/index.js` AFTER scoring finalization
- Manual test: trigger handler with a completed tournament ID against a seeded test golf league
- ~45 min

### Phase 2 — Frontend + Backend defaults (Tasks G4-G6)

**Task G4:** Open Chopped to golf in `FormatSelector.jsx` — drop NFL-only gating.
- File: `frontend/src/components/league/FormatSelector.jsx`
- Simplest change: keep NFL_FORMATS array but make Chopped NOT subject to it (separate handling), OR add a `GOLF_FORMATS` array including 'chopped' and 'full-league' and 'head-to-head'
- ~10 min

**Task G5:** Add "Starters per tournament" control to `ChoppedSettings.jsx` (sport-aware label).
- File: `frontend/src/components/league/settings/ChoppedSettings.jsx`
- Selection grid for 3/5/7 starters (or whatever spread makes sense)
- Sport-aware label: "Starters per week" for NFL, "Starters per tournament" for golf
- ~20 min

**Task G6:** Golf Chopped defaults in league create handler.
- File: `backend/src/routes/leagues.js`
- When `resolvedFormat === 'CHOPPED' && sport === 'golf'`, set `startersPerWeek: 5` default
- ~10 min

### Phase 3 — Display polish (Tasks G7-G8)

**Task G7:** Tournament-aware event labels in Chop Zone history.
- Backend: `chopped/events` route — join FantasyWeek → Tournament to surface tournament name on the response
- Frontend: `ChopZone.jsx` Section render — branch on sport for label format
- ~30 min

**Task G8:** Seed a test golf Chopped league + smoke walkthrough.
- File: `backend/scripts/chopped/seed-golf-test-league.js` (modeled on existing NFL seed)
- Create a 6-team golf CHOPPED league using PGA Tour scoring, 5 starters per tournament
- Eric drives a manual e2e: create league → roster → wait for next tournament weekend → chop fires → check the Tuesday waiver flow
- ~30 min

---

## Open product questions (not blocking)

1. **Tournaments per chop.** v1 chops every tournament. Some commissioners might want "chop every other tournament" or "no chop during majors." Skip for v1; revisit if anyone asks.

2. **Cut-day chops.** Some Chopped golf concepts cut a team mid-tournament when their last golfer misses the cut. Skip for v1 — too fiddly.

3. **Live Safe % during round.** NFL has live Safe % every 60s during games. For golf, Safe % could update during R1/R2/R3 as the leaderboard shifts. The math layer supports this, but the live-data integration to LiveScore would need wiring. Likely defer to Phase 4 if Eric wants it.

4. **Champion finalization.** When the second-to-last team is chopped and one team remains, the Champion gets `finalRank = 1`. This already works from NFL v1. No change.

---

## Deploy strategy

The change touches the auto-chop cron path. To avoid disrupting any future NFL Chopped leagues being tested:

1. Ship Tasks G1-G3 (backend math + new runner) BEFORE wiring into the Sun 10:30 PM cron. The new runner exists but isn't called.
2. Spot-check the runner by manually triggering it from a Node REPL against the seeded test golf league.
3. THEN wire into the Sun 10:30 PM cron — single-line change inside the existing handler.
4. Ship Tasks G4-G6 (frontend) — visible UI change, no runtime risk.
5. Ship G7-G8 (polish + seed) anytime after.

Each task is its own commit; push at logical checkpoints.

---

## Success criteria

- Eric can create a Chopped golf league via the UI
- A test league with 6 owners makes it through one Sunday tournament → auto-chop fires → chopped golfers in FAAB pool by Sunday 11:30 PM ET → Tuesday 23:59 waivers process → next tournament tees off with new rosters
- ChopZone surfaces (widget + page + commish panel) render correctly with tournament-context labels
- No regression to NFL Chopped flow (the test seed `CHOPPED TEST 2026` still works end-to-end)
- No regression to existing golf leagues (full-league, head-to-head, roto)
