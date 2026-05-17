# Chopped Format Implementation Design

**Date:** 2026-05-17
**Status:** Approved, ready for implementation plan
**Scope:** NFL-only v1, golf deferred
**Spec depends on:** `CLUTCH_DECISION_CAPTURE_SPEC.md` v3 (envelope helpers, waiver primitive)

---

## Goal

Ship a new league format — **Chopped** — where the lowest-scoring team is eliminated each week until one Survivor remains. Reuses existing waiver/FAAB infrastructure, layered on top of the standard NFL league shell. Commissioner-controlled with analytical Safe % math driving credibility.

## Why now

- Queue item #199 has been parked because it's a multi-day greenfield build that needed design first
- Existing fantasy platforms (ESPN, Sleeper, Yahoo) don't offer this format — clear differentiator
- Reuses 90%+ of existing infra: leagues, rosters, waivers, FAAB, scoring, standings
- 2026 NFL season starts September — gives a real runway to ship + run sims pre-season

## Architecture

Chopped is a **league format**, not a separate product. It piggybacks on every existing NFL league surface (rosters, waivers, scoring, standings) and adds:

1. A weekly elimination engine (manual + auto-fallback)
2. A Safe % probability service (analytical, not Monte Carlo for v1)
3. A `/leagues/:id/chop` Chop Zone surface
4. A provider abstraction layer for live NFL stats (ESPN free + SportsDataIO stub, paid flip at season start)

Eliminated teams are flagged but not deleted — their owners can still view league surfaces in spectator mode.

## Tech stack

- Backend: Node/Express, Prisma → PostgreSQL on Railway
- Frontend: React/Vite, Tailwind, Recharts for Safe % visualizations
- Live data v1: ESPN scoreboard polling (free) + SportsDataIO adapter stub (paid flip)
- Math: analytical pairwise Safe % using normal CDF, position-based variance defaults
- Existing systems reused: waiver/FAAB engine, decision capture envelopes, push/email/in-app notifications

---

## Section A — Scope + Schema

### A.1 League format enum

`schema.prisma` — extend the `LeagueFormat` enum:

```prisma
enum LeagueFormat {
  STANDARD
  KEEPER
  DYNASTY
  CHOPPED  // new
}
```

### A.2 Team eliminations

Add three nullable columns to `Team`:

```prisma
model Team {
  // ... existing fields
  eliminatedAt     DateTime?
  eliminationWeek  Int?
  finalRank        Int?       // assigned at elimination: last out = 2, second-to-last = 3, etc.
}
```

Final rank is assigned in *reverse* elimination order so Survivor = rank 1.

### A.3 Chopped settings on League.settings JSON

No new columns — extend the existing `League.settings` JSON blob with a `chopped` sub-object:

```json
{
  "chopped": {
    "chopsPerWeek": 1,
    "manualChopEnabled": true,
    "autoChopFallback": true,
    "tradeDeadline": null,
    "minTeamsToStart": 4
  },
  "waiverCloseDay": "TUESDAY",   // platform-wide, also used by standard leagues
  "waiverCloseTime": "23:59",
  "waiverCloseTimezone": "America/New_York"
}
```

`waiverCloseDay`/`waiverCloseTime` are **new platform-wide settings**, not Chopped-specific. Currently hardcoded in cron expressions; this exposes them per-league.

### A.4 ChopEvent audit table

New table — every chop (manual or auto) writes a row:

```prisma
model ChopEvent {
  id               String   @id @default(cuid())
  leagueId         String
  teamId           String
  week             Int
  scoredPoints     Float
  safePercent      Float    // computed Safe % at time of chop
  triggerType      String   // 'manual' | 'auto_fallback'
  triggeredByUserId String? // null if auto
  tiebreakerUsed   String?  // 'cumulative_pts' | 'point_diff' | 'coinflip' | null
  reasoning        String?  // commish optional note
  createdAt        DateTime @default(now())

  league League @relation(fields: [leagueId], references: [id])
  team   Team   @relation(fields: [teamId], references: [id])

  @@index([leagueId, week])
}
```

---

## Section B — Backend Services

### B.1 `choppedSurvivalService.js`

Core elimination engine.

**Public API:**

```js
async function executeChop({
  leagueId,
  week,
  teamIds,         // array (handles chopsPerWeek=2 or commish multi-select)
  triggerType,     // 'manual' | 'auto_fallback'
  triggeredByUserId,
  reasoning,
  prisma,
})
```

**Steps:**
1. Validate teams are still alive (not already eliminated)
2. For each team:
   - Set `Team.eliminatedAt`, `eliminationWeek`, `finalRank`
   - Release all rostered players → instant return to free agent pool (no waiver delay)
   - Write `ChopEvent` row
   - Write `RosterTransaction` with decision capture envelope (eliminationReason chip)
3. Fire `team_chopped` event → notifications service (push + email + in-app for the chopped owner, in-app for all league members)
4. PostHog: `chopped_team_eliminated` event with `sport: 'nfl'`, week, triggerType
5. If only 1 team remains alive → fire `chopped_season_complete` event, set Survivor's `finalRank=1`

**Player release path:** chopped players bypass the standard waiver queue entirely. They go directly to free agent status, available for immediate FAAB bidding at the next waiver close. This is critical: in Chopped, the meta is built around chopping early Tuesday morning so other Survivors can scheme bids against the released roster.

### B.2 `safePercentService.js`

Analytical Safe % calculator. Runs in microseconds — no Monte Carlo.

**Public API:**

```js
async function computeSafePercents({ leagueId, week, mode })
// mode: 'preweek' (projections-based) | 'live' (live + remaining-projection)
// returns: [{ teamId, projectedTotal, variance, safePct, rank }]
```

**Math:**

For each pair of alive teams (i, j):
```
P(team_i_score < team_j_score) = Φ((mean_j - mean_i) / sqrt(var_i + var_j))
```

where Φ is the standard normal CDF.

`safePct[i] = product over all j≠i of (1 - P(team_i is lowest vs j))`

Approximated via pairwise comparison (avoids combinatorial blowup for 14-team leagues).

**Variance defaults** (position-based, derived from 2024 NFL fantasy point standard deviations):

| Position | σ |
|---|---|
| QB | 8.0 |
| RB | 7.0 |
| WR | 9.0 |
| TE | 6.0 |
| K  | 4.0 |
| DST | 6.0 |

Team variance = sum of starter position variances (independent assumption).

**Live mode:** mean = live points scored + projected remaining points (downweighted by `gameProgress`). Variance shrinks as the game progresses (var × (1 - gameProgress)).

### B.3 `liveStatsProvider.js` — provider abstraction

Adapter pattern. One interface, two implementations.

```js
class LiveStatsProvider {
  async getWeekScoreboard(week) {}       // game-level scores + clock
  async getPlayerStats(week, playerId) {} // box-score stats
  async getProjections(week) {}           // pre-week projections
}
```

**v1 implementation:** `EspnStatsProvider` — polls ESPN public scoreboard JSON (free, no auth). Refresh cadence: every 60 seconds during active games, every 5 minutes pre-game.

**Stubbed implementation:** `SportsDataIOProvider` — full method signatures, returns deterministic mock data. Lets us build/test against the shape we'll get from the paid API. Activated via `LIVE_STATS_PROVIDER=sportsdataio` env var at season start.

Provider selection in a single `getLiveStatsProvider()` factory — no other code references provider implementations directly.

### B.4 Auto-chop cron

`backend/cron/choppedAutoChop.js` — runs every 5 minutes (cheap idle check), but only fires actual chops at the league's configured `waiverCloseTime`.

For each active Chopped league:
- If current time ≥ `waiverCloseTime` AND no manual chop yet this week:
  - Call `safePercentService.computeSafePercents`
  - Select bottom `chopsPerWeek` teams (apply tiebreaker order from D.3)
  - Call `executeChop({ triggerType: 'auto_fallback' })`

### B.5 Commish chop API

```
POST /api/leagues/:id/chopped/chop
Body: { week, teamIds: [...], reasoning? }
Auth: must be commissioner
```

Validates `chopsPerWeek` constraint, calls `executeChop({ triggerType: 'manual' })`.

```
GET /api/leagues/:id/chopped/safe-percents?week=N&mode=live
```
Returns current Safe % rankings. Public to league members.

```
GET /api/leagues/:id/chopped/events
```
Returns ChopEvent history for the league. Public to league members.

---

## Section C — Frontend Surfaces

### C.1 League creation card

`FormatSelector.jsx` — add Chopped card alongside Standard/Keeper/Dynasty.

Card content:
- Title: "Chopped"
- Tagline: "Lowest score each week is eliminated. Last team standing wins."
- Settings revealed when selected:
  - Chops per week: 1 or 2 (radio)
  - Manual commish control: toggle (default on)
  - Auto-chop fallback: toggle (default on, locked if manual off)
  - Trade deadline: date picker (default: none)
- Min team warning: "Chopped works best with 8+ teams. You have N."

### C.2 League Home Chop Zone embed widget

Compact widget on `/leagues/:id` (League Home) for Chopped leagues only.

Shows:
- Current week
- Top 3 + bottom 3 by Safe % (collapsible expand to full)
- "Next chop in: 1d 14h" countdown to `waiverCloseTime`
- Eliminated count: "3 Chopped / 11 Survivors"
- Link: "Open Chop Zone →"

Refresh cadence: every 60s on focus, paused on blur.

### C.3 Dedicated `/leagues/:id/chop` page

New file: `frontend/src/pages/ChopZone.jsx`

Three-bucket layout:
1. **Survivors** (top half by Safe %) — green accent, full roster expandable
2. **The Block** (bottom 25% or whoever's within 5% Safe of last place) — yellow accent
3. **Chopped** (eliminated) — grayscale, sortable by elimination week

Pre-week vs live toggle (`mode` query param).

Per-team detail row:
- Avatar + name + record
- Projected/live total + variance
- Safe % bar (color-graded green→yellow→red)
- Bye-week warning tag if applicable
- Expand: starter-by-starter projection breakdown

### C.4 Commish Chop Review panel

Visible only to commissioner, only on Tuesdays (or whatever `waiverCloseDay` is).

Multi-select checkboxes on Block teams (max = `chopsPerWeek`).
- Pre-fills the analytically-determined cut(s)
- Shows tiebreaker reasoning if applicable
- Required: optional `reasoning` text field
- Buttons: "Confirm Chop" (red) | "Skip — Let Auto-Chop Decide" (gray)

### C.5 Standings updates

`Standings.jsx` for Chopped leagues:
- W-L column hidden, replaced with "Status" (Alive / Chopped Wk N / Champion)
- Eliminated teams sorted to bottom, grayed out, show `finalRank`
- Champion row gets gold border + 🏆

### C.6 WaiverWire filter pill

`WaiverWire.jsx` for Chopped leagues: add filter pill "💀 Recently Chopped" — shows players released from chopped teams in the last 7 days. Helps Survivors scout the new pool.

### C.7 Notifications

`team_chopped` event triggers:
- Push (chopped owner): "You've been Chopped 💀 — Week N"
- Email (chopped owner): full recap email with their scored points, Safe % at chop time, who survived, final rank
- In-app banner (all league members): "Team X was chopped this week"
- League chat auto-post: bot message announcing the chop

`chopped_season_complete` event:
- Push (Champion): "🏆 You're the Survivor!"
- League-wide email with final rankings

---

## Section D — Edge Cases + Scope Boundaries

### D.1 Branded vocabulary

Centralized in `lib/chopped/vocabulary.js`:

| Concept | Term |
|---|---|
| Active teams | Survivors |
| Eliminated teams | Chopped |
| The act of cutting | Chop |
| Weekly worst | The Block |
| Commish-triggered cut | Manual Chop |
| Last team standing | Champion |

### D.2 Bye weeks — brutal by design

No softening. Bye = 0 points, full stop. Pre-week Chop Zone surfaces a "🚨 3 byes this week" tag on at-risk teams.

### D.3 Tiebreaker order

When teams score identically on the Block:
1. Lowest cumulative season points
2. Worst point differential vs. opponents this season
3. Deterministic coinflip from `(leagueId, week, sortedTeamIds)` hash

Surfaced in Manual Chop panel: "Tied at 87.4 — auto-pick is Team B (lower cumulative). Override?"

### D.4 League size minimum

4 teams hard minimum. Recommended 8-14. League creation warns if `teamCount < 6`.

### D.5 Commish AFK fail-safe

- 12h before auto-chop fires: push + email warning to commish
- At `waiverCloseTime`: if no manual chop yet, auto-chop fires using analytical Safe % + tiebreaker
- `ChopEvent.triggerType = 'auto_fallback'` for analytics
- No undo after auto-chop fires (released players already in waiver pool)

### D.6 Trade deadline

Chopped default: **no trade deadline**. Per-league configurable. Late-season trades between 3-4 surviving teams are part of the strategy.

### D.7 NOT in v1

- Resurrection / buy-back (commish override covers it)
- Paid Chopped contests (Phase 8)
- Cross-league Chopionship tournaments
- Golf Chopped
- Auto-chop on lineup failure (you score 0 and risk being chopped *naturally*)
- Championship reward page (just a badge + Vault entry)
- Changing `chopsPerWeek` mid-season
- Safe % time-decay visualization
- Spectator-mode UX for eliminated owners (they see standard surfaces, just grayed)

---

## Decision capture integration

Every chop writes a `RosterTransaction` row with full decision envelope (per CLUTCH_DECISION_CAPTURE_SPEC v3):
- `surface: 'chop_zone'`
- `sport: 'nfl'`
- `reasonChips: [...]` from `eliminationReason` taxonomy
- `availablePool: <released players>`
- Standard envelope fields (standingsRank, weeksRemaining, etc.)

This gives the bias engine (Year 2+) data on how commissioners use manual override and how often Survivors pick up chopped-team players.

## Open questions resolved

- ✅ FAAB delay: chopped players go **instantly** into free agent pool
- ✅ Waiver close timing: per-league configurable (platform-wide change)
- ✅ Math approach: analytical pairwise Safe %, not Monte Carlo
- ✅ Live data: ESPN free polling + SportsDataIO adapter stub
- ✅ Commish vs auto: both, with auto-fallback at waiver close
- ✅ Buy-back: skipped, commish override is sufficient

## Implementation notes

- Migration must be additive — nullable columns only, no data backfill needed
- All Chopped logic gated behind `League.format === 'CHOPPED'` checks
- Standard league behavior unchanged
- `waiverCloseDay`/`waiverCloseTime` defaults preserve existing cron behavior for legacy leagues
