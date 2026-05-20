# Chopped Format for Fantasy Golf Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task.

**Goal:** Port Chopped league format to PGA Tour fantasy golf — finalized-score chop after each tournament, live Safe % during in-progress tournaments.

**Architecture:** Parallel golf services in `backend/src/services/chopped/`. NFL services stay byte-for-byte untouched. New `ChoppedLiveSnapshot` Prisma model. Two existing crons get a one-line hook each (Thu-Sun live scoring + Sunday 10:30 PM finalization). One new cron Monday 4 AM ET fires the chop fallback.

**Tech Stack:** Node.js + Express + Prisma + Postgres. node-cron for scheduling. Existing sport-agnostic Chopped pieces (`survivalService.js`, `tiebreaker.js`, `safePercentService.computeSafePercentsFromTeams`) are reused as-is.

**Design source:** `docs/plans/2026-05-20-chopped-golf-design.md`

**Existing files to reference:**
- `backend/src/services/chopped/safePercentService.js` — sport-agnostic math (`computeSafePercentsFromTeams`) gets reused
- `backend/src/services/chopped/survivalService.js` — sport-agnostic `executeChop()` gets reused
- `backend/src/services/chopped/autoChopCron.js` — NFL version, golf cron mirrors its structure
- `backend/src/services/chopped/variance.js` — `normalCdf` is reusable; `teamVariance` is NFL-position-only (not reused)
- `backend/src/services/fantasyTracker.js:255` — pattern for `WeeklyTeamResult` upsert (we read from this table)
- `backend/src/index.js:501-534` — existing Thu-Sun every-5-min live scoring cron (hook target)
- `backend/src/index.js:652-672` — existing Sunday 10:30 PM `processCompletedWeeks` cron (hook target)
- `backend/src/routes/chopped.js` — current routes, needs sport branching

---

## Phase A — Schema

### Task 1: Migration for `ChoppedLiveSnapshot` model

**Files:**
- Modify: `backend/prisma/schema.prisma` (add model + back-relations)
- Create: `backend/prisma/migrations/56_chopped_live_snapshot/migration.sql`

**Step 1: Add the model to `schema.prisma`**

Find a good spot near the existing `ChopEvent` model. Add:

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

  league       League     @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  team         Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([leagueId, tournamentId, teamId])
  @@index([leagueId, tournamentId])
}
```

**Step 2: Add back-relations on `League`, `Tournament`, `Team`**

In each of those models, add a one-line relation:
```prisma
choppedLiveSnapshots ChoppedLiveSnapshot[]
```

**Step 3: Generate the migration**

```bash
cd backend
npx prisma migrate dev --name chopped_live_snapshot --create-only
```

This generates `backend/prisma/migrations/56_chopped_live_snapshot/migration.sql`. Review the SQL to verify it's just `CREATE TABLE "ChoppedLiveSnapshot" ...` + indexes + FKs — no destructive operations.

**Step 4: Apply locally**

```bash
cd backend && npx prisma migrate deploy
```

**Step 5: Verify**

```bash
cd backend && node -e "
const prisma = require('./src/lib/prisma')
;(async () => {
  // Just check the table exists
  const count = await prisma.choppedLiveSnapshot.count()
  console.log('ChoppedLiveSnapshot rows:', count)
  await prisma.\$disconnect()
})()
"
```
Expected: `ChoppedLiveSnapshot rows: 0`

**Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/56_chopped_live_snapshot
git commit -m "feat(chopped): add ChoppedLiveSnapshot model for golf live Safe %"
```

---

## Phase B — Backend services

### Task 2: `golfScoreSource.js` — read finalized tournament results

**Files:**
- Create: `backend/src/services/chopped/golfScoreSource.js`

**Step 1: Write the file**

```javascript
const prisma = require('../../lib/prisma')

/**
 * Returns each team's finalized fantasy points for the most recently
 * completed PGA Tour tournament for this league.
 *
 * Returns: [{ teamId, totalPoints, tournamentId, tournamentName, completedAt }]
 *           sorted ascending by totalPoints (lowest first — the team most
 *           likely to be chopped is at index 0).
 *
 * Returns [] if no tournament has finalized for this league recently.
 */
async function getMostRecentTournamentResults(leagueId) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      season: { include: { sport: true } },
      teams: { where: { eliminatedAt: null } },
    },
  })
  if (!league) return []
  if (league.season?.sport?.slug !== 'golf') return []

  // Most recently finalized tournament for this league's season
  const tournament = await prisma.tournament.findFirst({
    where: {
      seasonId: league.seasonId,
      status: 'FINAL',
    },
    orderBy: { endDate: 'desc' },
  })
  if (!tournament) return []

  const teamIds = league.teams.map(t => t.id)
  const results = await prisma.weeklyTeamResult.findMany({
    where: {
      teamId: { in: teamIds },
      tournamentId: tournament.id,
    },
  })

  // Map results back to teams; teams with no row treated as 0 points
  const resultByTeam = new Map(results.map(r => [r.teamId, r]))
  const rows = league.teams.map(t => {
    const r = resultByTeam.get(t.id)
    return {
      teamId: t.id,
      teamName: t.name,
      totalPoints: r?.totalPoints ?? 0,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      completedAt: tournament.endDate,
    }
  })
  rows.sort((a, b) => a.totalPoints - b.totalPoints)
  return rows
}

module.exports = { getMostRecentTournamentResults }
```

**Step 2: Commit**

```bash
git add backend/src/services/chopped/golfScoreSource.js
git commit -m "feat(chopped): golfScoreSource — read finalized tournament WeeklyTeamResult"
```

---

### Task 3: `golfSafePercent.js` — live computation + snapshot write

**Files:**
- Create: `backend/src/services/chopped/golfSafePercent.js`

**Step 1: Write the file**

```javascript
const prisma = require('../../lib/prisma')
const { computeSafePercentsFromTeams } = require('./safePercentService')

const TOTAL_HOLES_PER_TOURNAMENT = 72 // standard 4-round PGA event
const DEFAULT_PLAYER_VARIANCE = 4 // σ²=4 fallback when no SG history (σ ≈ 2 pts/round)
const FALLBACK_POINTS_PER_HOLE = 1.5 // fallback when DataGolf skill estimate missing

/**
 * Returns `tournament_progress` in [0, 1]. 0 = Thursday morning before tee
 * off, 1 = Sunday final putt.
 *
 * Driven by the tournament's currentRound + holes-completed proxy if
 * available; otherwise estimated from elapsed time since tournament.startDate.
 */
function tournamentProgress(tournament) {
  if (!tournament) return 0
  if (tournament.status === 'FINAL') return 1
  if (tournament.status !== 'IN_PROGRESS') return 0
  // Round-based estimate. Conservative — if the tournament service
  // doesn't expose a roundsCompleted field, we estimate from elapsed days.
  const startMs = tournament.startDate ? new Date(tournament.startDate).getTime() : Date.now()
  const elapsedMs = Date.now() - startMs
  const days = elapsedMs / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.min(1, days / 4))
}

/**
 * Estimated remaining fantasy points for a player based on holes remaining
 * and their skill baseline. Returns 0 for players who missed cut or aren't
 * in the tournament.
 */
function projectedRemaining(performance, player, tournamentProgress) {
  if (!performance) return 0
  if (performance.madeCut === false) return 0 // missed cut, weekend done
  const holesRemaining = TOTAL_HOLES_PER_TOURNAMENT * (1 - tournamentProgress)
  const baseline =
    player?.seasonStats?.fantasyAvg ||
    (player?.sgTotal != null ? (player.sgTotal + 1) * FALLBACK_POINTS_PER_HOLE : null) ||
    FALLBACK_POINTS_PER_HOLE
  return (holesRemaining / TOTAL_HOLES_PER_TOURNAMENT) * baseline * 4
  // ×4 because baseline is per-round (~18 holes) and we want pts for
  // the full remaining-holes share of the tournament
}

/**
 * Returns the in-progress tournament for this league's season, or null
 * if no tournament is currently live.
 */
async function getInProgressTournament(seasonId) {
  return prisma.tournament.findFirst({
    where: { seasonId, status: 'IN_PROGRESS' },
    orderBy: { startDate: 'desc' },
  })
}

/**
 * Compute live Safe % per team for a specific tournament + league.
 * Returns the sport-agnostic [{teamId, mean, variance, safePct, rank}] shape.
 */
async function computeSafePercentsForLeague(leagueId, tournamentId) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        where: { eliminatedAt: null },
        include: {
          roster: {
            where: { isActive: true },
            include: { player: { include: { seasonStats: true } } },
          },
        },
      },
    },
  })
  if (!league) return []

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  })
  if (!tournament) return []

  const progress = tournamentProgress(tournament)
  const playerIds = league.teams.flatMap(t => t.roster.map(r => r.playerId).filter(Boolean))
  const performances = await prisma.performance.findMany({
    where: { playerId: { in: playerIds }, tournamentId },
  })
  const perfByPlayer = new Map(performances.map(p => [p.playerId, p]))

  const teamsForMath = league.teams.map(t => {
    let mean = 0
    let variance = 0
    for (const r of t.roster) {
      if (!r.player) continue
      const perf = perfByPlayer.get(r.playerId)
      const pointsSoFar = perf?.fantasyPoints ?? 0
      const remaining = projectedRemaining(perf, r.player, progress)
      mean += pointsSoFar + remaining
      variance += DEFAULT_PLAYER_VARIANCE
    }
    variance *= Math.pow(1 - progress, 2)
    return { teamId: t.id, teamName: t.name, mean, variance: Math.max(variance, 0.01) }
  })

  return computeSafePercentsFromTeams(teamsForMath)
}

/**
 * Refresh live Safe % snapshots for every CHOPPED golf league with an
 * in-progress tournament. Called every 5 min by the existing Thu-Sun
 * live scoring cron.
 */
async function refreshActiveLeagues() {
  const leagues = await prisma.league.findMany({
    where: {
      format: 'CHOPPED',
      isActive: true,
      season: { sport: { slug: 'golf' } },
    },
    select: { id: true, seasonId: true },
  })
  let updated = 0
  for (const league of leagues) {
    try {
      const tournament = await getInProgressTournament(league.seasonId)
      if (!tournament) continue
      const results = await computeSafePercentsForLeague(league.id, tournament.id)
      for (const r of results) {
        await prisma.choppedLiveSnapshot.upsert({
          where: {
            leagueId_tournamentId_teamId: {
              leagueId: league.id,
              tournamentId: tournament.id,
              teamId: r.teamId,
            },
          },
          create: {
            leagueId: league.id,
            tournamentId: tournament.id,
            teamId: r.teamId,
            safePct: r.safePct,
            mean: r.mean,
            variance: r.variance,
          },
          update: {
            safePct: r.safePct,
            mean: r.mean,
            variance: r.variance,
            computedAt: new Date(),
          },
        })
        updated++
      }
    } catch (e) {
      console.error(`[chopped/golf-safe] league ${league.id} failed:`, e.message)
    }
  }
  return { leagues: leagues.length, snapshots: updated }
}

module.exports = {
  refreshActiveLeagues,
  computeSafePercentsForLeague,
  tournamentProgress,
  projectedRemaining,
}
```

**Step 2: Commit**

```bash
git add backend/src/services/chopped/golfSafePercent.js
git commit -m "feat(chopped): golfSafePercent — live Safe % from Performance + DataGolf"
```

---

### Task 4: `golfAutoChopCron.js` — chop fallback handler

**Files:**
- Create: `backend/src/services/chopped/golfAutoChopCron.js`

**Step 1: Write the file**

```javascript
const cron = require('node-cron')
const prisma = require('../../lib/prisma')
const { getMostRecentTournamentResults } = require('./golfScoreSource')
const { executeChop } = require('./survivalService')

/**
 * Check whether "now" is past the league's configured waiver-close time.
 * Defaults: MONDAY @ 04:00 America/New_York (early enough that no west-coast
 * user is awake when the chop fires).
 */
function isPastWaiverClose(now, settings) {
  const tz = settings?.waiverCloseTimezone || 'America/New_York'
  const day = settings?.waiverCloseDay || 'MONDAY'
  const time = settings?.waiverCloseTime || '04:00'

  const localStr = now.toLocaleString('en-US', { timeZone: tz })
  const local = new Date(localStr)
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  if (dayNames[local.getDay()] !== day) return false

  const [hh, mm] = time.split(':').map(Number)
  if (local.getHours() < hh) return false
  if (local.getHours() === hh && local.getMinutes() < mm) return false
  return true
}

/**
 * Iterate active CHOPPED golf leagues with a recent finalized tournament.
 * Fire auto-chop on any past waiver-close with no ChopEvent yet for that
 * tournament's "week" (we use tournamentId as the discriminator).
 */
async function checkLeagues() {
  const leagues = await prisma.league.findMany({
    where: {
      format: 'CHOPPED',
      isActive: true,
      season: { sport: { slug: 'golf' } },
    },
    include: { teams: { where: { eliminatedAt: null } } },
  })

  const now = new Date()
  let fired = 0

  for (const league of leagues) {
    try {
      if (league.teams.length <= 1) continue
      const settings = league.settings || {}
      if (settings.autoChopFallback === false) continue
      if (!isPastWaiverClose(now, settings)) continue

      const results = await getMostRecentTournamentResults(league.id)
      if (results.length === 0) continue

      const tournamentId = results[0].tournamentId
      // Map tournament → "week" integer for ChopEvent uniqueness.
      // We use the tournament's seasonal week number, falling back to the
      // tournament endDate's ISO-week number if not present.
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { weekNumber: true, endDate: true },
      })
      const weekKey =
        tournament?.weekNumber ||
        Math.floor(new Date(tournament.endDate).getTime() / (1000 * 60 * 60 * 24 * 7))

      const existing = await prisma.chopEvent.findFirst({
        where: { leagueId: league.id, week: weekKey },
      })
      if (existing) continue // manual chop already fired

      const chopsPerTournament = settings.chopsPerTournament || settings.chopsPerWeek || 1
      const targetTeamIds = results.slice(0, chopsPerTournament).map(r => r.teamId)

      console.log(
        `[chopped/golf-auto] league ${league.id} chopping ${targetTeamIds.join(', ')} (tournament ${tournament?.weekNumber || tournamentId})`,
      )
      await executeChop({
        leagueId: league.id,
        week: weekKey,
        teamIds: targetTeamIds,
        triggerType: 'auto_fallback',
        triggeredByUserId: null,
        reasoning: `Auto-chop fallback after ${results[0].tournamentName}`,
      })
      fired++
    } catch (e) {
      console.error(`[chopped/golf-auto] league ${league.id} failed:`, e)
    }
  }
  return { leaguesChecked: leagues.length, fired }
}

/**
 * Register the Monday 4 AM ET cron. The Sunday 10:30 PM cron also calls
 * `checkLeagues()` after fantasy finalization, but most leagues won't
 * have past their waiver-close at that point — this Monday-morning cron
 * is the real fallback.
 */
function registerGolfAutoChopCron() {
  cron.schedule(
    '0 4 * * 1',
    async () => {
      console.log(`[chopped/golf-auto] ${new Date().toISOString()} — Monday 4 AM check`)
      try {
        const result = await checkLeagues()
        console.log(`[chopped/golf-auto] Done: ${result.fired} chops fired across ${result.leaguesChecked} leagues`)
      } catch (e) {
        console.error('[chopped/golf-auto] cron handler crashed:', e)
      }
    },
    { timezone: 'America/New_York' },
  )
  console.log('[cron] golf auto-chop cron registered (Mon 4 AM ET)')
}

module.exports = { registerGolfAutoChopCron, checkLeagues, isPastWaiverClose }
```

**Step 2: Commit**

```bash
git add backend/src/services/chopped/golfAutoChopCron.js
git commit -m "feat(chopped): golfAutoChopCron — Monday 4 AM ET chop fallback"
```

---

## Phase C — Cron integration

### Task 5: Register the new Monday 4 AM cron in `index.js`

**Files:**
- Modify: `backend/src/index.js` (find a suitable spot near the other cron registrations)

**Step 1: Add the registration**

Near the other cron registrations (search for `registerAutoChopCron` to find the NFL one), add:

```javascript
// Golf Chopped — Monday 4 AM ET auto-chop fallback
const { registerGolfAutoChopCron } = require('./services/chopped/golfAutoChopCron')
registerGolfAutoChopCron()
```

**Step 2: Restart the dev server + verify log**

```bash
cd backend && npm start
```

Watch for `[cron] golf auto-chop cron registered (Mon 4 AM ET)` in the startup logs. Kill the server.

**Step 3: Commit**

```bash
git add backend/src/index.js
git commit -m "feat(chopped): register Monday 4 AM ET golf auto-chop cron"
```

---

### Task 6: Hook into Thu-Sun live scoring cron

**Files:**
- Modify: `backend/src/index.js:501-534` (the `cron.schedule('*/5 * * * 4,5,6,0', ...)` block — the FIRST one, not the pool scoring or DataGolf one)

**Step 1: Find the exact cron block**

```bash
grep -n "Every 5 min Thu-Sun — Live scoring for ALL" backend/src/index.js
```

Should point to line 501. Read the surrounding 30 lines to find the closing brace of that cron handler.

**Step 2: Append the Safe % refresh inside the handler**

At the end of the live scoring cron handler (just before the closing `}, { timezone: ... })`), add:

```javascript
        // Golf Chopped — refresh live Safe % snapshots for any in-progress tournaments
        try {
          const { refreshActiveLeagues } = require('./services/chopped/golfSafePercent')
          const result = await refreshActiveLeagues()
          if (result.leagues > 0) {
            console.log(`[chopped/golf-safe] refreshed ${result.snapshots} snapshots across ${result.leagues} leagues`)
          }
        } catch (e) {
          console.error('[chopped/golf-safe] refresh failed:', e.message)
        }
```

**Step 3: Commit**

```bash
git add backend/src/index.js
git commit -m "feat(chopped): hook golf Safe % refresh into Thu-Sun live scoring cron"
```

---

### Task 7: Hook into Sunday 10:30 PM fantasy scoring cron

**Files:**
- Modify: `backend/src/index.js:652-672`

**Step 1: Find the block**

```bash
grep -n "Sunday 10:30 PM ET — Fantasy scoring" backend/src/index.js
```

**Step 2: Append the chop check after `processCompletedWeeks`**

After the `const results = await fantasyTracker.processCompletedWeeks(...)` line (around line 657), add:

```javascript
        // Golf Chopped — try the auto-chop check now in case any league's
        // waiver-close has already passed. Most leagues default to MONDAY
        // 04:00 ET, so this Sunday-night call is usually a no-op; the
        // Monday 4 AM cron does the real work.
        try {
          const { checkLeagues } = require('./services/chopped/golfAutoChopCron')
          const chopResult = await checkLeagues()
          if (chopResult.fired > 0) {
            console.log(`[chopped/golf-auto] Sunday post-finalization fired ${chopResult.fired} chops`)
          }
        } catch (e) {
          console.error('[chopped/golf-auto] Sunday post-finalization failed:', e.message)
        }
```

**Step 3: Commit**

```bash
git add backend/src/index.js
git commit -m "feat(chopped): hook golf auto-chop check into Sunday 10:30 PM finalization"
```

---

## Phase D — Route sport routing

### Task 8: `routes/chopped.js` — sport branching

**Files:**
- Modify: `backend/src/routes/chopped.js` (entire file)

**Step 1: Replace the file contents**

```javascript
const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const prisma = require('../lib/prisma.js')
const { computeSafePercents } = require('../services/chopped/safePercentService')
const { computeSafePercentsForLeague } = require('../services/chopped/golfSafePercent')
const { executeChop } = require('../services/chopped/survivalService')

// Helper: load a league with sport info, exit early if not CHOPPED
async function loadChoppedLeague(leagueId, options = {}) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { season: { include: { sport: true } } },
    ...options,
  })
  return league
}

// GET /api/leagues/:leagueId/chopped/safe-percents
//   - NFL: ?week=N&mode=preweek|live
//   - Golf: returns latest ChoppedLiveSnapshot rows for the in-progress tournament,
//     or computes on-demand if no snapshot exists
router.get('/:leagueId/chopped/safe-percents', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.params
    const league = await loadChoppedLeague(leagueId)
    if (!league) return res.status(404).json({ error: 'League not found' })
    if (league.format !== 'CHOPPED') {
      return res.status(400).json({ error: 'League is not CHOPPED format' })
    }

    const sport = league.season?.sport?.slug
    if (sport === 'golf') {
      const tournament = await prisma.tournament.findFirst({
        where: { seasonId: league.seasonId, status: 'IN_PROGRESS' },
        orderBy: { startDate: 'desc' },
      })
      if (!tournament) {
        return res.json({ leagueId, sport, results: [], tournament: null })
      }
      // Prefer cached snapshots (fresh within the last 6 min — slightly
      // wider than the 5-min cron cadence to absorb a missed tick)
      const snapshots = await prisma.choppedLiveSnapshot.findMany({
        where: { leagueId, tournamentId: tournament.id },
        orderBy: { safePct: 'desc' },
      })
      const isFresh = snapshots[0] && Date.now() - new Date(snapshots[0].computedAt).getTime() < 6 * 60 * 1000
      if (isFresh) {
        return res.json({
          leagueId,
          sport,
          results: snapshots.map((s, i) => ({
            teamId: s.teamId,
            mean: s.mean,
            variance: s.variance,
            safePct: s.safePct,
            rank: i + 1,
          })),
          tournament: { id: tournament.id, name: tournament.name },
          cached: true,
        })
      }
      // No fresh snapshot — compute now
      const results = await computeSafePercentsForLeague(leagueId, tournament.id)
      return res.json({
        leagueId,
        sport,
        results,
        tournament: { id: tournament.id, name: tournament.name },
        cached: false,
      })
    }

    // NFL path — existing behavior
    const week = parseInt(req.query.week, 10)
    const mode = req.query.mode === 'live' ? 'live' : 'preweek'
    if (!week || week < 1 || week > 18) {
      return res.status(400).json({ error: 'invalid week (1-18 required)' })
    }
    const results = await computeSafePercents({ leagueId, week, mode })
    res.json({ leagueId, sport: 'nfl', week, mode, results })
  } catch (e) {
    console.error('[chopped] safe-percents error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/leagues/:leagueId/chopped/chop
// Body: { week?: number, tournamentId?: string, teamIds: string[], reasoning?: string }
router.post('/:leagueId/chopped/chop', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.params
    const { week, tournamentId, teamIds, reasoning } = req.body
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ error: 'teamIds required' })
    }

    const league = await loadChoppedLeague(leagueId)
    if (!league) return res.status(404).json({ error: 'League not found' })
    if (league.format !== 'CHOPPED') {
      return res.status(400).json({ error: 'League is not CHOPPED format' })
    }
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Commissioner only' })
    }

    const settings = league.settings || {}
    const maxChops = settings.chopsPerTournament || settings.chopsPerWeek || 1
    if (teamIds.length > maxChops) {
      return res.status(400).json({ error: `Max ${maxChops} chops per tournament/week` })
    }
    if (settings.manualChopEnabled === false) {
      return res.status(403).json({ error: 'Manual chop disabled for this league' })
    }

    const sport = league.season?.sport?.slug
    let weekKey = week
    if (sport === 'golf') {
      // Resolve tournamentId → week-number for ChopEvent
      if (!tournamentId) {
        return res.status(400).json({ error: 'tournamentId required for golf chop' })
      }
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { weekNumber: true, endDate: true },
      })
      weekKey =
        tournament?.weekNumber ||
        Math.floor(new Date(tournament.endDate).getTime() / (1000 * 60 * 60 * 24 * 7))
    } else {
      if (!week) {
        return res.status(400).json({ error: 'week required for non-golf chop' })
      }
    }

    const result = await executeChop({
      leagueId,
      week: weekKey,
      teamIds,
      triggerType: 'manual',
      triggeredByUserId: req.user.id,
      reasoning: reasoning || null,
    })
    res.json(result)
  } catch (e) {
    console.error('[chopped] chop error:', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/leagues/:leagueId/chopped/events
router.get('/:leagueId/chopped/events', authenticate, async (req, res) => {
  try {
    const events = await prisma.chopEvent.findMany({
      where: { leagueId: req.params.leagueId },
      include: { team: { select: { id: true, name: true, avatar: true, avatarUrl: true } } },
      orderBy: { week: 'desc' },
    })
    res.json({ events })
  } catch (e) {
    console.error('[chopped] events error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
```

**Step 2: Commit**

```bash
git add backend/src/routes/chopped.js
git commit -m "feat(chopped): sport-aware routing in /chopped routes — golf branch added"
```

---

## Phase E — Test scripts

### Task 9: Golf Chopped seed script

**Files:**
- Create: `backend/scripts/chopped/seed-golf-test-league.js`

**Step 1: Write the seeder**

Adapted from the NFL `seed-test-league.js` (read that file first as reference at `backend/scripts/chopped/seed-test-league.js`). Key changes:
- `league.format = 'CHOPPED'`
- `league.seasonId` points at the current golf season
- 4 teams with golf player rosters (any 4-player roster from active golf players is fine for the test)
- `League.settings.waiverCloseDay = 'MONDAY'`, `waiverCloseTime = '04:00'`

The script should output the test league's ID so subsequent test commands can reference it.

**Step 2: Run it**

```bash
cd backend && node scripts/chopped/seed-golf-test-league.js
```

Expected: prints `Created CHOPPED golf test league: <leagueId>`.

**Step 3: Commit**

```bash
git add backend/scripts/chopped/seed-golf-test-league.js
git commit -m "test(chopped): seed script for golf CHOPPED test league"
```

---

### Task 10: End-to-end smoke test (manual, no commits)

**Step 1: Run the seeder**

```bash
cd backend && node scripts/chopped/seed-golf-test-league.js
```

Note the league ID.

**Step 2: Synthesize a finalized tournament + `WeeklyTeamResult` rows**

The seeder should also seed an in-progress + a finalized tournament with synthetic `WeeklyTeamResult.totalPoints` for the test teams. Verify with:

```bash
cd backend && node -e "
const prisma = require('./src/lib/prisma')
const LEAGUE_ID = '<paste from step 1>'
;(async () => {
  const results = await prisma.weeklyTeamResult.findMany({
    where: { team: { leagueId: LEAGUE_ID } },
    include: { team: { select: { name: true } }, tournament: { select: { name: true, status: true } } },
    orderBy: { totalPoints: 'asc' },
  })
  for (const r of results) console.log(\`\${r.team.name} \${r.tournament.name} (\${r.tournament.status}): \${r.totalPoints}\`)
  await prisma.\$disconnect()
})()
"
```

**Step 3: Trigger the auto-chop check directly (bypass cron)**

```bash
cd backend && node -e "
const { checkLeagues } = require('./src/services/chopped/golfAutoChopCron')
;(async () => {
  const result = await checkLeagues()
  console.log(result)
  process.exit(0)
})()
"
```

(Time-sensitive — the league's `waiverCloseDay` defaults to MONDAY, so this only fires on Mondays. For testing, temporarily set the seeder to use the current day of the week.)

**Step 4: Verify chop occurred**

```bash
cd backend && node -e "
const prisma = require('./src/lib/prisma')
const LEAGUE_ID = '<paste from step 1>'
;(async () => {
  const events = await prisma.chopEvent.findMany({
    where: { leagueId: LEAGUE_ID },
    include: { team: { select: { name: true } } },
  })
  for (const e of events) console.log(\`Chopped: \${e.team.name} | trigger=\${e.triggerType} | reason=\${e.reasoning}\`)
  const teams = await prisma.team.findMany({
    where: { leagueId: LEAGUE_ID, eliminatedAt: { not: null } },
    select: { name: true, finalRank: true, eliminationWeek: true },
  })
  for (const t of teams) console.log(\`Eliminated: \${t.name} (rank #\${t.finalRank}, week \${t.eliminationWeek})\`)
  await prisma.\$disconnect()
})()
"
```

Expected: the team with the lowest `WeeklyTeamResult.totalPoints` is eliminated, with `triggerType='auto_fallback'`.

**Step 5: Cleanup**

```bash
cd backend && node scripts/chopped/cleanup-test-league.js <leagueId>
```

(The existing NFL cleanup script may work directly; if not, write a golf variant — small task that can be folded into the seeder.)

No commits in this task.

---

## Out of scope

Reminder, NOT in this plan:
- NFL Chopped live-stats provider fix (queue #216)
- Live Safe % via WebSocket (5-min cadence sufficient for v1)
- Commissioner-configurable golf Chopped scoring tweaks
- Mid-tournament "you missed cut, you're cooked" notifications
- Multi-tournament weeks
- Tournament-selection UI (every PGA Tour event automatically counts)
- Frontend Chop page changes — existing components work as-is (data shape is identical)
- Frontend sport-aware vocabulary helpers (cosmetic, deferred unless visible mismatch surfaces)

---

## Done

Plan complete and saved to `docs/plans/2026-05-20-chopped-golf-plan.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** — controller dispatches fresh subagent per task, two-stage review between tasks, fast iteration.
2. **Parallel Session (separate)** — open new session, batch execution with checkpoints.

**Which approach?**
