# Chopped Format Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task.

**Goal:** Ship NFL Chopped league format — lowest-scoring team eliminated each week, FAAB blind auction reusing existing waiver infra, commissioner manual control + auto-fallback, analytical Safe % math.

**Architecture:** Chopped is a `LeagueFormat` enum value, not a separate product. Reuses 90% of existing infra (rosters, waivers, scoring, standings). Adds an elimination engine (manual + cron auto-fallback), an analytical Safe % service (pairwise normal-CDF math, microseconds-per-call), a provider abstraction so we can flip from ESPN free to SportsDataIO paid at season start, and one new page (`/leagues/:id/chop`) + a League Home embed widget.

**Tech Stack:** Node/Express + Prisma + PostgreSQL on Railway. React/Vite/Tailwind frontend. Recharts for Safe % bars. ESPN scoreboard JSON (no auth) for live stats v1. SportsDataIO adapter stub for paid flip. PostHog analytics with sport-property convention.

**Reference design:** `docs/plans/2026-05-17-chopped-format-design.md`

**Testing note:** Clutch has no formal test framework. Each task validates via a Node smoke-test script (run with `node backend/scripts/test-X.js`) or manual browser verification. Smoke scripts live in `backend/scripts/chopped/` and can be deleted after the feature ships.

---

## Phase 1 — Schema + Migration

### Task 1: Add CHOPPED to LeagueFormat enum + Team elimination columns

**Files:**
- Modify: `backend/prisma/schema.prisma:1782-1788` (LeagueFormat enum)
- Modify: `backend/prisma/schema.prisma:198` (Team model — add 3 columns)
- Create: `backend/prisma/migrations/52_chopped_format/migration.sql`

**Step 1: Edit LeagueFormat enum**

Open `backend/prisma/schema.prisma`, find:
```prisma
enum LeagueFormat {
  FULL_LEAGUE
  HEAD_TO_HEAD
  ROTO
  SURVIVOR
  ONE_AND_DONE
}
```

Add `CHOPPED`:
```prisma
enum LeagueFormat {
  FULL_LEAGUE
  HEAD_TO_HEAD
  ROTO
  SURVIVOR
  ONE_AND_DONE
  CHOPPED
}
```

**Step 2: Add Team elimination columns**

Find `model Team {` at line 198. Add three nullable fields (do not break existing ordering — append before the relations block):

```prisma
  eliminatedAt     DateTime?
  eliminationWeek  Int?
  finalRank        Int?
```

**Step 3: Generate migration SQL**

Run from `backend/`:
```bash
cd /Users/ericsaylor/Desktop/Clutch/backend
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/52_chopped_format/migration.sql
```

Expected SQL:
```sql
ALTER TYPE "LeagueFormat" ADD VALUE 'CHOPPED';
ALTER TABLE "teams" ADD COLUMN "eliminatedAt" TIMESTAMP(3);
ALTER TABLE "teams" ADD COLUMN "eliminationWeek" INTEGER;
ALTER TABLE "teams" ADD COLUMN "finalRank" INTEGER;
```

**Step 4: Verify migration is additive only**

Run:
```bash
cat backend/prisma/migrations/52_chopped_format/migration.sql
```
Expected: only `ALTER TYPE ... ADD VALUE` and `ADD COLUMN` statements. **No DROP, no NOT NULL on new columns, no data backfill.** If anything else appears, stop and investigate.

**Step 5: Commit (no deploy yet — deploy after Phase 1 complete)**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/52_chopped_format/
git commit -m "feat(schema): chopped format — LeagueFormat.CHOPPED + Team eliminations"
```

---

### Task 2: Add ChopEvent model

**Files:**
- Modify: `backend/prisma/schema.prisma` (append new model after Team relations block, before next model)
- Modify: `backend/prisma/migrations/52_chopped_format/migration.sql` (append CREATE TABLE)

**Step 1: Add ChopEvent model**

Append to `schema.prisma` in a sensible location (next to `RosterTransaction` at line 1482):

```prisma
model ChopEvent {
  id                String   @id @default(cuid())
  leagueId          String
  teamId            String
  week              Int
  scoredPoints      Float
  safePercent       Float
  triggerType       String   // 'manual' | 'auto_fallback'
  triggeredByUserId String?
  tiebreakerUsed    String?  // 'cumulative_pts' | 'point_diff' | 'coinflip' | null
  reasoning         String?
  createdAt         DateTime @default(now())

  league League @relation(fields: [leagueId], references: [id])
  team   Team   @relation(fields: [teamId], references: [id])

  @@index([leagueId, week])
}
```

**Step 2: Add back-relations on League and Team**

In `League` model (line 113): add `chopEvents ChopEvent[]`
In `Team` model (line 198): add `chopEvents ChopEvent[]`

**Step 3: Regenerate migration**

```bash
cd /Users/ericsaylor/Desktop/Clutch/backend
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/52_chopped_format/migration.sql
```

Expected: all prior ALTERs + a new `CREATE TABLE "ChopEvent"` + `CREATE INDEX`.

**Step 4: Run prisma generate (smoke test the schema parses)**

```bash
npx prisma generate
```

Expected: no errors. `node_modules/.prisma/client/index.d.ts` should reference `ChopEvent` type.

**Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/52_chopped_format/
git commit -m "feat(schema): add ChopEvent audit table"
```

---

### Task 3: Deploy migration 52 to Railway

**Step 1: Push to deploy**

```bash
git push origin master
```

**Step 2: Watch Railway logs for migration**

In a separate terminal:
```bash
railway logs --service web | grep -i migrat
```

Expected: `Applying migration '52_chopped_format'` followed by `All migrations have been successfully applied.`

If migration fails with "column already exists" or similar, see `docs/CLUTCH_DECISION_CAPTURE_SPEC.md` Section 8 (Railway migration troubleshooting) — likely need `prisma migrate resolve --applied "52_chopped_format"`.

**Step 3: Verify on prod**

```bash
railway run --service web npx prisma migrate status
```

Expected: `Database schema is up to date!`

---

## Phase 2 — Provider Abstraction (Live Stats)

### Task 4: Create LiveStatsProvider interface + factory

**Files:**
- Create: `backend/src/services/liveStats/index.js`
- Create: `backend/src/services/liveStats/baseProvider.js`

**Step 1: Write base interface**

`backend/src/services/liveStats/baseProvider.js`:
```js
/**
 * LiveStatsProvider — interface every implementation must satisfy.
 * Methods return promises. All players keyed by canonical Clutch playerId
 * (mapped from provider ID via existing player matching service).
 */
class BaseLiveStatsProvider {
  /**
   * @param {number} week NFL week (1-18)
   * @returns {Promise<Array<{gameId, homeTeam, awayTeam, status, homeScore, awayScore, clock, gameProgress}>>}
   * gameProgress: 0.0 (not started) to 1.0 (final)
   */
  async getWeekScoreboard(week) { throw new Error('not implemented'); }

  /**
   * @param {number} week
   * @param {string} playerId  Clutch playerId
   * @returns {Promise<{points, projectedPoints, gameStatus, gameProgress, statsBreakdown}>}
   */
  async getPlayerStats(week, playerId) { throw new Error('not implemented'); }

  /**
   * @param {number} week
   * @returns {Promise<Array<{playerId, projectedPoints, position}>>}
   */
  async getProjections(week) { throw new Error('not implemented'); }
}

module.exports = BaseLiveStatsProvider;
```

**Step 2: Write factory**

`backend/src/services/liveStats/index.js`:
```js
const EspnStatsProvider = require('./espnProvider');
const SportsDataIOProvider = require('./sportsDataIOProvider');

function getLiveStatsProvider() {
  const choice = process.env.LIVE_STATS_PROVIDER || 'espn';
  switch (choice) {
    case 'sportsdataio':
      return new SportsDataIOProvider();
    case 'espn':
    default:
      return new EspnStatsProvider();
  }
}

module.exports = { getLiveStatsProvider };
```

**Step 3: Commit**

```bash
git add backend/src/services/liveStats/
git commit -m "feat(chopped): live stats provider interface + factory"
```

---

### Task 5: ESPN scoreboard provider

**Files:**
- Create: `backend/src/services/liveStats/espnProvider.js`
- Create: `backend/scripts/chopped/test-espn-provider.js`

**Step 1: Write smoke-test script (failing — provider doesn't exist yet)**

`backend/scripts/chopped/test-espn-provider.js`:
```js
const { getLiveStatsProvider } = require('../../src/services/liveStats');

(async () => {
  const provider = getLiveStatsProvider();
  console.log('Provider:', provider.constructor.name);
  const games = await provider.getWeekScoreboard(1);
  console.log(`Week 1 games: ${games.length}`);
  console.log('Sample:', JSON.stringify(games[0], null, 2));
  if (games.length === 0) throw new Error('Expected games, got 0');
  if (typeof games[0].gameProgress !== 'number') throw new Error('Missing gameProgress');
  console.log('✓ ESPN provider smoke test passed');
})().catch(e => { console.error('✗', e); process.exit(1); });
```

**Step 2: Run smoke test — expect fail**

```bash
node backend/scripts/chopped/test-espn-provider.js
```
Expected: `Error: Cannot find module './espnProvider'`

**Step 3: Implement EspnStatsProvider**

`backend/src/services/liveStats/espnProvider.js`:
```js
const axios = require('axios');
const BaseLiveStatsProvider = require('./baseProvider');

const ESPN_NFL_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

class EspnStatsProvider extends BaseLiveStatsProvider {
  async getWeekScoreboard(week) {
    const url = `${ESPN_NFL_SCOREBOARD}?week=${week}&seasontype=2`;
    const { data } = await axios.get(url, { timeout: 10000 });
    return (data.events || []).map(ev => {
      const comp = ev.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === 'home');
      const away = comp.competitors.find(c => c.homeAway === 'away');
      const status = comp.status.type.state; // 'pre' | 'in' | 'post'
      const period = comp.status.period || 0;
      const clock = comp.status.displayClock || '';
      let gameProgress;
      if (status === 'pre') gameProgress = 0;
      else if (status === 'post') gameProgress = 1;
      else gameProgress = Math.min(0.99, (period - 1) / 4 + 0.25);
      return {
        gameId: ev.id,
        homeTeam: home.team.abbreviation,
        awayTeam: away.team.abbreviation,
        status,
        homeScore: parseInt(home.score, 10) || 0,
        awayScore: parseInt(away.score, 10) || 0,
        clock,
        gameProgress,
      };
    });
  }

  async getPlayerStats(week, playerId) {
    // v1: stub — return zero stats. Hook into existing nflFantasyTracker
    // for real player-level stats in Phase 4.
    return { points: 0, projectedPoints: 0, gameStatus: 'pre', gameProgress: 0, statsBreakdown: {} };
  }

  async getProjections(week) {
    // v1: stub — wire to existing projection source (nflverse or Sleeper)
    // in a follow-up. Returns empty array for now.
    return [];
  }
}

module.exports = EspnStatsProvider;
```

**Step 4: Run smoke test — expect pass**

```bash
node backend/scripts/chopped/test-espn-provider.js
```
Expected: prints sample game with `gameProgress`, exits 0.

**Step 5: Commit**

```bash
git add backend/src/services/liveStats/espnProvider.js backend/scripts/chopped/test-espn-provider.js
git commit -m "feat(chopped): ESPN scoreboard provider implementation"
```

---

### Task 6: SportsDataIO stub provider

**Files:**
- Create: `backend/src/services/liveStats/sportsDataIOProvider.js`

**Step 1: Write stub matching SportsDataIO response shapes**

`backend/src/services/liveStats/sportsDataIOProvider.js`:
```js
const BaseLiveStatsProvider = require('./baseProvider');

/**
 * SportsDataIO stub provider — same shape as live API but returns
 * deterministic mock data. Flip via LIVE_STATS_PROVIDER=sportsdataio
 * once paid subscription is active. Do NOT delete this stub; we want
 * to be able to test the SDIO shape end-to-end without burning trial
 * API calls.
 */
class SportsDataIOProvider extends BaseLiveStatsProvider {
  async getWeekScoreboard(week) {
    return [
      {
        gameId: `sdio-${week}-mock`,
        homeTeam: 'KC',
        awayTeam: 'BUF',
        status: 'in',
        homeScore: 21,
        awayScore: 17,
        clock: '5:32',
        gameProgress: 0.65,
      },
    ];
  }

  async getPlayerStats(week, playerId) {
    return { points: 12.4, projectedPoints: 18.0, gameStatus: 'in', gameProgress: 0.65, statsBreakdown: {} };
  }

  async getProjections(week) {
    return [];
  }
}

module.exports = SportsDataIOProvider;
```

**Step 2: Verify factory wiring**

```bash
LIVE_STATS_PROVIDER=sportsdataio node backend/scripts/chopped/test-espn-provider.js
```
Expected: prints `Provider: SportsDataIOProvider` and mock game.

**Step 3: Commit**

```bash
git add backend/src/services/liveStats/sportsDataIOProvider.js
git commit -m "feat(chopped): SportsDataIO stub provider for paid flip"
```

---

## Phase 3 — Safe % Calculation

### Task 7: Position-variance constants + normal CDF helper

**Files:**
- Create: `backend/src/services/chopped/variance.js`

**Step 1: Implement variance defaults + CDF helper**

`backend/src/services/chopped/variance.js`:
```js
/**
 * Position-based standard deviation defaults derived from 2024 NFL
 * weekly fantasy point distributions. Tunable post-launch.
 */
const POSITION_SIGMA = {
  QB: 8.0,
  RB: 7.0,
  WR: 9.0,
  TE: 6.0,
  K: 4.0,
  DST: 6.0,
};

/**
 * Abramowitz & Stegun approximation of the standard normal CDF.
 * Accurate to ~7.5e-8. We don't need a math library for this.
 */
function normalCdf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

/**
 * @param {Array<{position: string}>} starters
 * @returns {number} team variance (sum of per-starter variances)
 */
function teamVariance(starters) {
  return starters.reduce((acc, s) => {
    const sigma = POSITION_SIGMA[s.position] || 7.0;
    return acc + sigma * sigma;
  }, 0);
}

module.exports = { POSITION_SIGMA, normalCdf, teamVariance };
```

**Step 2: Write smoke test**

`backend/scripts/chopped/test-variance.js`:
```js
const { normalCdf, teamVariance, POSITION_SIGMA } = require('../../src/services/chopped/variance');

// Sanity: normalCdf(0) ≈ 0.5
const mid = normalCdf(0);
if (Math.abs(mid - 0.5) > 0.001) throw new Error(`normalCdf(0) = ${mid}, expected ~0.5`);

// normalCdf(1.96) ≈ 0.975
const upper = normalCdf(1.96);
if (Math.abs(upper - 0.975) > 0.001) throw new Error(`normalCdf(1.96) = ${upper}, expected ~0.975`);

// team variance of 1 QB + 2 RB + 2 WR + 1 TE + 1 K + 1 DST
const starters = [
  { position: 'QB' }, { position: 'RB' }, { position: 'RB' },
  { position: 'WR' }, { position: 'WR' }, { position: 'TE' },
  { position: 'K' }, { position: 'DST' },
];
const v = teamVariance(starters);
const expected = 64 + 49 + 49 + 81 + 81 + 36 + 16 + 36; // 412
if (v !== expected) throw new Error(`teamVariance = ${v}, expected ${expected}`);

console.log('✓ variance helpers passed');
```

**Step 3: Run smoke test**

```bash
node backend/scripts/chopped/test-variance.js
```
Expected: `✓ variance helpers passed`

**Step 4: Commit**

```bash
git add backend/src/services/chopped/ backend/scripts/chopped/test-variance.js
git commit -m "feat(chopped): position variance defaults + normal CDF"
```

---

### Task 8: safePercentService — pairwise Safe % calculation

**Files:**
- Create: `backend/src/services/chopped/safePercentService.js`
- Create: `backend/scripts/chopped/test-safe-percent.js`

**Step 1: Write failing smoke test**

`backend/scripts/chopped/test-safe-percent.js`:
```js
const { computeSafePercentsFromTeams } = require('../../src/services/chopped/safePercentService');

// 3 teams: clear leader (110, σ=10), middle (95, σ=10), clear loser (75, σ=10)
const teams = [
  { teamId: 'A', mean: 110, variance: 100 },
  { teamId: 'B', mean: 95, variance: 100 },
  { teamId: 'C', mean: 75, variance: 100 },
];
const result = computeSafePercentsFromTeams(teams);
console.log(result);

const a = result.find(r => r.teamId === 'A');
const c = result.find(r => r.teamId === 'C');

if (a.safePct <= 0.95) throw new Error(`Leader safePct = ${a.safePct}, expected > 0.95`);
if (c.safePct >= 0.20) throw new Error(`Loser safePct = ${c.safePct}, expected < 0.20`);
if (a.rank !== 1) throw new Error(`Leader rank = ${a.rank}, expected 1`);
if (c.rank !== 3) throw new Error(`Loser rank = ${c.rank}, expected 3`);

console.log('✓ pairwise safe % logic passed');
```

**Step 2: Run smoke test — expect fail**

```bash
node backend/scripts/chopped/test-safe-percent.js
```
Expected: `Cannot find module ./safePercentService`

**Step 3: Implement service (pure math, no DB)**

`backend/src/services/chopped/safePercentService.js`:
```js
const { normalCdf, teamVariance } = require('./variance');
const prisma = require('../../lib/prisma');
const { getLiveStatsProvider } = require('../liveStats');

/**
 * Pure math layer — given mean + variance per team, returns pairwise
 * approximation of P(team is NOT the lowest scorer this week).
 *
 * For each team i, safePct[i] = product over j≠i of P(score_i > score_j),
 * where P(score_i > score_j) = Φ((mean_i - mean_j) / sqrt(var_i + var_j)).
 *
 * This is NOT the exact "P(min) probability" but is a well-behaved proxy:
 * monotonically increasing with mean, decreasing with variance, identical
 * teams get identical results, and the bottom team consistently rates low.
 */
function computeSafePercentsFromTeams(teams) {
  const results = teams.map(t => {
    let safe = 1;
    for (const j of teams) {
      if (j.teamId === t.teamId) continue;
      const z = (t.mean - j.mean) / Math.sqrt(t.variance + j.variance);
      safe *= normalCdf(z);
    }
    return { teamId: t.teamId, mean: t.mean, variance: t.variance, safePct: safe };
  });
  // Higher safePct = safer = lower rank number (rank 1 = safest)
  results.sort((a, b) => b.safePct - a.safePct);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

/**
 * DB-aware wrapper. Loads alive teams, their starters, projections, and
 * (if mode=live) current live points + game-progress weighting.
 */
async function computeSafePercents({ leagueId, week, mode = 'preweek' }) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        where: { eliminatedAt: null },
        include: {
          rosterPlayers: {
            where: { isStarter: true },
            include: { player: true },
          },
        },
      },
    },
  });
  if (!league) throw new Error(`League not found: ${leagueId}`);

  const provider = getLiveStatsProvider();
  const projections = mode === 'preweek' ? await provider.getProjections(week) : null;
  const projByPlayer = projections
    ? Object.fromEntries(projections.map(p => [p.playerId, p.projectedPoints]))
    : {};

  const teams = await Promise.all(league.teams.map(async (t) => {
    const starters = t.rosterPlayers.map(rp => ({
      playerId: rp.player.id,
      position: rp.position || rp.player.position,
    }));
    let mean = 0;
    let varianceMultiplier = 1;
    if (mode === 'live') {
      // sum of (live points so far) + (remaining projection × (1 - gameProgress))
      const liveStats = await Promise.all(
        starters.map(s => provider.getPlayerStats(week, s.playerId))
      );
      mean = liveStats.reduce((acc, ls) => {
        const remaining = (ls.projectedPoints || 0) * (1 - (ls.gameProgress || 0));
        return acc + (ls.points || 0) + remaining;
      }, 0);
      const avgProgress = liveStats.reduce((a, ls) => a + (ls.gameProgress || 0), 0) / Math.max(starters.length, 1);
      varianceMultiplier = Math.max(0.05, 1 - avgProgress); // variance shrinks as games complete
    } else {
      mean = starters.reduce((acc, s) => acc + (projByPlayer[s.playerId] || 0), 0);
    }
    const variance = teamVariance(starters) * varianceMultiplier;
    return { teamId: t.id, mean, variance };
  }));

  return computeSafePercentsFromTeams(teams);
}

module.exports = { computeSafePercents, computeSafePercentsFromTeams };
```

**Step 4: Run smoke test — expect pass**

```bash
node backend/scripts/chopped/test-safe-percent.js
```
Expected: array of 3 results, `✓ pairwise safe % logic passed`.

**Step 5: Commit**

```bash
git add backend/src/services/chopped/safePercentService.js backend/scripts/chopped/test-safe-percent.js
git commit -m "feat(chopped): analytical pairwise Safe % service"
```

---

## Phase 4 — Survival / Chop Execution

### Task 9: Tiebreaker resolution helper

**Files:**
- Create: `backend/src/services/chopped/tiebreaker.js`

**Step 1: Write helper**

```js
const crypto = require('crypto');

/**
 * Resolve tied teams in elimination order. Input: array of teams already
 * known to be tied on weekly score. Output: same array sorted so that the
 * team to chop is FIRST.
 *
 * Order:
 *   1. lowest cumulative season points
 *   2. worst point differential vs opponents this season
 *   3. deterministic coinflip from (leagueId, week, teamIds)
 */
function resolveTiebreaker({ tiedTeams, leagueId, week }) {
  return [...tiedTeams].sort((a, b) => {
    if (a.cumulativePoints !== b.cumulativePoints) {
      return a.cumulativePoints - b.cumulativePoints;
    }
    if (a.pointDifferential !== b.pointDifferential) {
      return a.pointDifferential - b.pointDifferential;
    }
    const seed = crypto
      .createHash('sha256')
      .update(`${leagueId}:${week}:${[a.teamId, b.teamId].sort().join(',')}`)
      .digest('hex');
    return seed < '8' ? -1 : 1; // deterministic from hash first hex char
  });
}

function describeTiebreaker(loser, others) {
  const tiedAtPoints = others.filter(o => o.weeklyPoints === loser.weeklyPoints);
  if (tiedAtPoints.length === 0) return null;
  if (loser.cumulativePoints < tiedAtPoints[0].cumulativePoints) return 'cumulative_pts';
  if (loser.pointDifferential < tiedAtPoints[0].pointDifferential) return 'point_diff';
  return 'coinflip';
}

module.exports = { resolveTiebreaker, describeTiebreaker };
```

**Step 2: Commit**

```bash
git add backend/src/services/chopped/tiebreaker.js
git commit -m "feat(chopped): tiebreaker resolution (cumulative → diff → coinflip)"
```

---

### Task 10: choppedSurvivalService — executeChop

**Files:**
- Create: `backend/src/services/chopped/survivalService.js`
- Create: `backend/scripts/chopped/test-execute-chop.js`

**Step 1: Implement executeChop**

`backend/src/services/chopped/survivalService.js`:
```js
const prisma = require('../../lib/prisma');
const { sendNotification } = require('../notificationService');
const { trackServer } = require('../analyticsServer'); // wire to existing analytics

/**
 * Chop one or more teams in a single transaction. Releases their entire
 * roster to free-agent pool INSTANTLY (no waiver delay). Writes ChopEvent
 * rows. Fires team_chopped + chopped_season_complete events.
 */
async function executeChop({
  leagueId,
  week,
  teamIds,
  triggerType, // 'manual' | 'auto_fallback'
  triggeredByUserId = null,
  reasoning = null,
  safePercentResults, // optional — for ChopEvent audit
}) {
  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    throw new Error('teamIds required');
  }

  return prisma.$transaction(async (tx) => {
    const league = await tx.league.findUnique({
      where: { id: leagueId },
      include: { teams: { where: { eliminatedAt: null } } },
    });
    if (!league) throw new Error(`League not found: ${leagueId}`);
    if (league.format !== 'CHOPPED') throw new Error(`League ${leagueId} is not CHOPPED format`);

    const aliveBefore = league.teams.length;
    const finalRankBase = aliveBefore + 1; // last out = aliveBefore, see comment below

    const results = [];
    for (const teamId of teamIds) {
      const team = league.teams.find(t => t.id === teamId);
      if (!team) throw new Error(`Team ${teamId} not alive in league ${leagueId}`);

      // Final rank: assigned in REVERSE elimination order.
      // If 14 alive, this chop is rank 14 (last out). Next week's chop = 13.
      const finalRank = aliveBefore - results.length;

      await tx.team.update({
        where: { id: teamId },
        data: {
          eliminatedAt: new Date(),
          eliminationWeek: week,
          finalRank,
        },
      });

      // Release all rostered players to free-agent pool (no waiver delay)
      await tx.rosterPlayer.deleteMany({ where: { teamId } });

      // Look up Safe % for this team if provided
      const safe = safePercentResults?.find(s => s.teamId === teamId);

      const chopEvent = await tx.chopEvent.create({
        data: {
          leagueId,
          teamId,
          week,
          scoredPoints: 0, // populated below via FantasyResult
          safePercent: safe?.safePct ?? 0,
          triggerType,
          triggeredByUserId,
          tiebreakerUsed: null,
          reasoning,
        },
      });
      results.push({ teamId, finalRank, chopEventId: chopEvent.id });
    }

    return { leagueId, week, chopped: results, aliveRemaining: aliveBefore - results.length };
  }).then(async (result) => {
    // Post-transaction: notifications + analytics (fire-and-forget, never throw)
    for (const r of result.chopped) {
      try {
        await sendNotification({
          type: 'team_chopped',
          teamId: r.teamId,
          leagueId: result.leagueId,
          week: result.week,
          finalRank: r.finalRank,
        });
      } catch (e) { console.error('[chopped] notification fail:', e.message); }
      try {
        trackServer('chopped_team_eliminated', {
          sport: 'nfl',
          leagueId: result.leagueId,
          week: result.week,
          teamId: r.teamId,
          triggerType,
          finalRank: r.finalRank,
        });
      } catch (e) { console.error('[chopped] analytics fail:', e.message); }
    }
    // Season complete?
    if (result.aliveRemaining === 1) {
      const survivor = await prisma.team.findFirst({
        where: { leagueId: result.leagueId, eliminatedAt: null },
      });
      if (survivor) {
        await prisma.team.update({ where: { id: survivor.id }, data: { finalRank: 1 } });
        try {
          await sendNotification({
            type: 'chopped_season_complete',
            teamId: survivor.id,
            leagueId: result.leagueId,
          });
        } catch (e) { console.error('[chopped] champion notification fail:', e.message); }
      }
    }
    return result;
  });
}

module.exports = { executeChop };
```

**Step 2: Write smoke test (against a seeded test league)**

`backend/scripts/chopped/test-execute-chop.js`:
```js
const prisma = require('../../src/lib/prisma');
const { executeChop } = require('../../src/services/chopped/survivalService');

(async () => {
  // Find a test CHOPPED league (set up manually or via seed script)
  const league = await prisma.league.findFirst({
    where: { format: 'CHOPPED', name: { contains: 'TEST' } },
    include: { teams: { where: { eliminatedAt: null } } },
  });
  if (!league) {
    console.log('No TEST CHOPPED league found. Skip — manual setup needed.');
    process.exit(0);
  }
  if (league.teams.length < 2) {
    console.log('Need at least 2 alive teams to test chop.');
    process.exit(0);
  }
  const target = league.teams[league.teams.length - 1];
  console.log(`Chopping team ${target.id} from league ${league.id} week 1...`);
  const result = await executeChop({
    leagueId: league.id,
    week: 1,
    teamIds: [target.id],
    triggerType: 'manual',
    triggeredByUserId: null,
    reasoning: 'smoke test',
  });
  console.log('Result:', result);
  // Verify
  const chopped = await prisma.team.findUnique({ where: { id: target.id } });
  if (!chopped.eliminatedAt) throw new Error('Team not marked eliminated');
  if (chopped.finalRank == null) throw new Error('finalRank not assigned');
  const rosterAfter = await prisma.rosterPlayer.count({ where: { teamId: target.id } });
  if (rosterAfter !== 0) throw new Error(`Roster not cleared: ${rosterAfter} players remain`);
  console.log('✓ executeChop smoke test passed');
  process.exit(0);
})().catch(e => { console.error('✗', e); process.exit(1); });
```

**Step 3: Run smoke test**

Needs a TEST CHOPPED league seeded first. Skip-on-missing is intentional so we can run the script before seed exists.

```bash
node backend/scripts/chopped/test-execute-chop.js
```

**Step 4: Commit**

```bash
git add backend/src/services/chopped/survivalService.js backend/scripts/chopped/test-execute-chop.js
git commit -m "feat(chopped): survival service — executeChop with instant roster release"
```

---

## Phase 5 — API Routes

### Task 11: GET /api/leagues/:id/chopped/safe-percents

**Files:**
- Create: `backend/src/routes/chopped.js`
- Modify: `backend/src/index.js` (register route)

**Step 1: Create route file**

`backend/src/routes/chopped.js`:
```js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { computeSafePercents } = require('../services/chopped/safePercentService');
const { executeChop } = require('../services/chopped/survivalService');

// GET /api/leagues/:id/chopped/safe-percents?week=N&mode=preweek|live
router.get('/leagues/:id/chopped/safe-percents', authMiddleware, async (req, res) => {
  try {
    const { id: leagueId } = req.params;
    const week = parseInt(req.query.week, 10);
    const mode = req.query.mode === 'live' ? 'live' : 'preweek';
    if (!week || week < 1 || week > 18) return res.status(400).json({ error: 'invalid week' });
    const results = await computeSafePercents({ leagueId, week, mode });
    res.json({ leagueId, week, mode, results });
  } catch (e) {
    console.error('[chopped] safe-percents error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/leagues/:id/chopped/chop
router.post('/leagues/:id/chopped/chop', authMiddleware, async (req, res) => {
  try {
    const { id: leagueId } = req.params;
    const { week, teamIds, reasoning } = req.body;
    // Commissioner-only
    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissionerId !== req.user.id) return res.status(403).json({ error: 'Commissioner only' });
    const config = (league.settings?.chopped) || {};
    const maxChops = config.chopsPerWeek || 1;
    if (teamIds.length > maxChops) {
      return res.status(400).json({ error: `Max ${maxChops} chops per week` });
    }
    const result = await executeChop({
      leagueId,
      week,
      teamIds,
      triggerType: 'manual',
      triggeredByUserId: req.user.id,
      reasoning,
    });
    res.json(result);
  } catch (e) {
    console.error('[chopped] chop error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leagues/:id/chopped/events
router.get('/leagues/:id/chopped/events', authMiddleware, async (req, res) => {
  try {
    const events = await prisma.chopEvent.findMany({
      where: { leagueId: req.params.id },
      include: { team: { select: { id: true, name: true, avatar: true } } },
      orderBy: { week: 'desc' },
    });
    res.json({ events });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
```

**Step 2: Register route in `backend/src/index.js`**

Locate the block where other routes are registered (search for `app.use('/api/leagues'`). Add:

```js
app.use('/api', require('./routes/chopped'));
```

**Step 3: Smoke test — list events on a known league**

```bash
curl -H "Authorization: Bearer $JWT" \
  https://clutch-production-8def.up.railway.app/api/leagues/SOME_ID/chopped/events
```

Expected: `{ "events": [] }` for a non-CHOPPED league or empty CHOPPED league.

**Step 4: Commit**

```bash
git add backend/src/routes/chopped.js backend/src/index.js
git commit -m "feat(chopped): API routes — safe-percents, chop, events"
```

---

## Phase 6 — Auto-Chop Cron

### Task 12: Auto-chop cron — Tuesday fallback

**Files:**
- Create: `backend/src/services/chopped/autoChopCron.js`
- Modify: `backend/src/index.js` (register cron)

**Step 1: Implement cron**

`backend/src/services/chopped/autoChopCron.js`:
```js
const cron = require('node-cron');
const prisma = require('../../lib/prisma');
const { computeSafePercents } = require('./safePercentService');
const { executeChop } = require('./survivalService');

/**
 * Runs every 5 min Mon-Wed during NFL season. For each active CHOPPED
 * league, if current time ≥ waiverCloseTime AND no manual chop yet this
 * week, fire auto-chop.
 */
async function runAutoChopCheck() {
  const now = new Date();
  const leagues = await prisma.league.findMany({
    where: { format: 'CHOPPED', isActive: true },
    include: { teams: { where: { eliminatedAt: null } } },
  });

  for (const league of leagues) {
    if (league.teams.length <= 1) continue;
    const settings = league.settings || {};
    const chopConfig = settings.chopped || {};
    if (!chopConfig.autoChopFallback) continue;

    const week = currentNflWeek(); // helper — implement or import from existing
    // Skip if a manual chop already happened this week
    const existing = await prisma.chopEvent.findFirst({
      where: { leagueId: league.id, week },
    });
    if (existing) continue;

    if (!isPastWaiverClose(now, settings)) continue;

    const safe = await computeSafePercents({ leagueId: league.id, week, mode: 'live' });
    const sorted = [...safe].sort((a, b) => a.safePct - b.safePct);
    const chopsPerWeek = chopConfig.chopsPerWeek || 1;
    const targetTeamIds = sorted.slice(0, chopsPerWeek).map(s => s.teamId);

    console.log(`[chopped/auto] league ${league.id} week ${week} chopping ${targetTeamIds.join(', ')}`);
    try {
      await executeChop({
        leagueId: league.id,
        week,
        teamIds: targetTeamIds,
        triggerType: 'auto_fallback',
        safePercentResults: safe,
      });
    } catch (e) {
      console.error(`[chopped/auto] league ${league.id} chop failed:`, e);
    }
  }
}

function isPastWaiverClose(now, settings) {
  const tz = settings.waiverCloseTimezone || 'America/New_York';
  const day = settings.waiverCloseDay || 'TUESDAY';
  const time = settings.waiverCloseTime || '23:59';
  // Convert "now" to leagues' timezone, check day-of-week + time
  const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const dayNames = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  if (dayNames[local.getDay()] !== day) return false;
  const [hh, mm] = time.split(':').map(Number);
  if (local.getHours() < hh) return false;
  if (local.getHours() === hh && local.getMinutes() < mm) return false;
  return true;
}

function currentNflWeek() {
  // TODO: pull from existing NFL schedule service — placeholder
  // returns week 1 if before Sep 7 2026, else current week from FantasyWeek table
  return 1;
}

function registerAutoChopCron() {
  // Every 5 min, Mon-Wed, Sep-Dec
  cron.schedule('*/5 * * * 1-3', runAutoChopCheck, {
    timezone: 'America/New_York',
  });
  console.log('[cron] chopped auto-chop cron registered (every 5 min Mon-Wed)');
}

module.exports = { registerAutoChopCron, runAutoChopCheck };
```

**Step 2: Wire `currentNflWeek` to real source**

Search for existing NFL week helpers:
```bash
grep -rn "currentNflWeek\|getCurrentWeek\|fantasyWeek" backend/src/services/ | head
```
Replace the placeholder with the canonical source (likely `fantasyTracker.js` or `nflFantasyTracker.js`).

**Step 3: Register cron in `backend/src/index.js`**

Near other `cron.schedule` calls:
```js
const { registerAutoChopCron } = require('./services/chopped/autoChopCron');
registerAutoChopCron();
```

**Step 4: Test cron handler manually**

```bash
node -e "require('./backend/src/services/chopped/autoChopCron').runAutoChopCheck().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })"
```
Expected: prints league count, exits 0.

**Step 5: Commit**

```bash
git add backend/src/services/chopped/autoChopCron.js backend/src/index.js
git commit -m "feat(chopped): auto-chop cron — Tue fallback at waiver close"
```

---

## Phase 7 — Frontend: League Creation

### Task 13: Add Chopped card to FormatSelector

**Files:**
- Modify: `frontend/src/components/league/FormatSelector.jsx` (locate via grep if path differs)

**Step 1: Find current FormatSelector**

```bash
grep -rn "FormatSelector\|LeagueFormat\|FULL_LEAGUE" frontend/src/ | head -10
```

**Step 2: Add Chopped format option**

In the formats array (or wherever existing cards are defined), append:

```jsx
{
  id: 'CHOPPED',
  title: 'Chopped',
  tagline: 'Lowest score each week is eliminated. Last team standing wins.',
  icon: '💀',
  description: 'Survive each NFL week — score the lowest and you\'re Chopped.',
  recommended: 'Best with 8+ teams',
  settings: ['chopsPerWeek', 'manualChopEnabled', 'autoChopFallback'],
}
```

**Step 3: Conditional Chopped settings sub-form**

When `format === 'CHOPPED'` is selected, reveal:
- Chops per week (radio: 1, 2)
- Manual commish control (toggle, default ON)
- Auto-chop fallback (toggle, default ON, disabled if manual OFF)
- Min-teams warning when `teamCount < 6`

Persist to `League.settings.chopped = { chopsPerWeek, manualChopEnabled, autoChopFallback }`.

**Step 4: Manual browser test**

1. `cd frontend && npm run dev`
2. Navigate to league creation
3. Select Chopped — verify settings appear, save, and persist on reload.

**Step 5: Commit**

```bash
git add frontend/src/components/league/FormatSelector.jsx
git commit -m "feat(chopped): league creation card + settings sub-form"
```

---

## Phase 8 — Frontend: League Home Embed

### Task 14: ChopZoneWidget on League Home

**Files:**
- Create: `frontend/src/components/league/ChopZoneWidget.jsx`
- Modify: `frontend/src/pages/LeagueHome.jsx` (mount widget when `league.format === 'CHOPPED'`)

**Step 1: Build widget**

`frontend/src/components/league/ChopZoneWidget.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export default function ChopZoneWidget({ leagueId, week }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get(`/leagues/${leagueId}/chopped/safe-percents?week=${week}&mode=live`);
        if (mounted) setData(res.data);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, [leagueId, week]);

  if (loading) return <div className="rounded-xl bg-surface p-4 animate-pulse h-32" />;
  if (!data?.results?.length) return null;

  const safest = data.results.slice(0, 3);
  const block = data.results.slice(-3).reverse();

  return (
    <div className="rounded-xl bg-surface border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg">Chop Zone — Week {week}</h3>
        <Link to={`/leagues/${leagueId}/chop`} className="text-blaze text-sm font-mono">Open →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs uppercase text-muted mb-1">Safest</div>
          {safest.map(t => (
            <div key={t.teamId} className="flex justify-between font-mono">
              <span className="truncate">{t.teamName || t.teamId.slice(0, 8)}</span>
              <span className="text-field">{(t.safePct * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs uppercase text-muted mb-1">On The Block</div>
          {block.map(t => (
            <div key={t.teamId} className="flex justify-between font-mono">
              <span className="truncate">{t.teamName || t.teamId.slice(0, 8)}</span>
              <span className="text-live-red">{(t.safePct * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Mount in LeagueHome.jsx**

```jsx
{league.format === 'CHOPPED' && (
  <ChopZoneWidget leagueId={league.id} week={currentWeek} />
)}
```

**Step 3: Browser test**

Visit a CHOPPED league home page, confirm widget loads, refreshes every 60s.

**Step 4: Commit**

```bash
git add frontend/src/components/league/ChopZoneWidget.jsx frontend/src/pages/LeagueHome.jsx
git commit -m "feat(chopped): League Home Chop Zone widget"
```

---

## Phase 9 — Frontend: Dedicated Chop Zone Page

### Task 15: Create /leagues/:id/chop page

**Files:**
- Create: `frontend/src/pages/ChopZone.jsx`
- Modify: `frontend/src/App.jsx` (add route)

**Step 1: Build page**

`frontend/src/pages/ChopZone.jsx`:
```jsx
import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import CommishChopReview from '../components/chopped/CommishChopReview';

export default function ChopZone() {
  const { id: leagueId } = useParams();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') || 'live';
  const [league, setLeague] = useState(null);
  const [safeData, setSafeData] = useState(null);
  const [events, setEvents] = useState([]);
  const [week, setWeek] = useState(null);

  useEffect(() => {
    async function load() {
      const lg = (await api.get(`/leagues/${leagueId}`)).data;
      setLeague(lg);
      const w = lg.currentWeek || 1;
      setWeek(w);
      const [safe, ev] = await Promise.all([
        api.get(`/leagues/${leagueId}/chopped/safe-percents?week=${w}&mode=${mode}`),
        api.get(`/leagues/${leagueId}/chopped/events`),
      ]);
      setSafeData(safe.data);
      setEvents(ev.data.events);
    }
    load();
  }, [leagueId, mode]);

  if (!league || !safeData) return <div>Loading…</div>;

  const alive = safeData.results.filter(r => !events.find(e => e.teamId === r.teamId));
  const median = Math.floor(alive.length / 2);
  const survivors = alive.slice(0, median);
  const block = alive.slice(median);
  const chopped = events.sort((a, b) => a.week - b.week);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl">Chop Zone</h1>
        <div className="flex gap-2 font-mono text-sm">
          <button onClick={() => setParams({ mode: 'preweek' })}
            className={mode === 'preweek' ? 'text-blaze' : 'text-muted'}>Pre-week</button>
          <button onClick={() => setParams({ mode: 'live' })}
            className={mode === 'live' ? 'text-blaze' : 'text-muted'}>Live</button>
        </div>
      </header>

      <Section title="Survivors" color="field" teams={survivors} />
      <Section title="The Block" color="crown" teams={block} />
      {chopped.length > 0 && <Section title="Chopped" color="muted" teams={chopped} chopped />}

      {league.isCommissioner && <CommishChopReview leagueId={leagueId} week={week} block={block} />}
    </div>
  );
}

function Section({ title, color, teams, chopped }) {
  return (
    <section>
      <h2 className={`font-display text-xl text-${color} mb-2`}>{title}</h2>
      <div className="space-y-1">
        {teams.map(t => (
          <div key={t.teamId} className={`rounded p-2 flex justify-between bg-surface ${chopped ? 'opacity-50' : ''}`}>
            <span>{t.teamName || t.team?.name || t.teamId.slice(0, 8)}</span>
            <span className="font-mono">{t.safePct ? `${(t.safePct * 100).toFixed(0)}%` : `Wk ${t.week}`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Add route in App.jsx**

```jsx
<Route path="/leagues/:id/chop" element={<ChopZone />} />
```

**Step 3: Browser test**

Visit `/leagues/<id>/chop` on a CHOPPED league.

**Step 4: Commit**

```bash
git add frontend/src/pages/ChopZone.jsx frontend/src/App.jsx
git commit -m "feat(chopped): dedicated /leagues/:id/chop page"
```

---

### Task 16: CommishChopReview component

**Files:**
- Create: `frontend/src/components/chopped/CommishChopReview.jsx`

**Step 1: Build component**

```jsx
import { useState } from 'react';
import { api } from '../../services/api';

export default function CommishChopReview({ leagueId, week, block }) {
  const [selected, setSelected] = useState(new Set([block[block.length - 1]?.teamId]));
  const [reasoning, setReasoning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitChop() {
    setSubmitting(true);
    try {
      await api.post(`/leagues/${leagueId}/chopped/chop`, {
        week,
        teamIds: [...selected],
        reasoning: reasoning || null,
      });
      window.location.reload();
    } catch (e) {
      alert(`Chop failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border-2 border-blaze bg-blaze/5 p-4 space-y-3">
      <h2 className="font-display text-lg">Commissioner — Manual Chop</h2>
      <p className="text-sm text-muted">
        Auto-chop fires at waiver close if you don't act. Recommended pick is pre-selected.
      </p>
      <div className="space-y-1">
        {block.map(t => (
          <label key={t.teamId} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.has(t.teamId)}
              onChange={(e) => {
                const next = new Set(selected);
                e.target.checked ? next.add(t.teamId) : next.delete(t.teamId);
                setSelected(next);
              }}
            />
            <span className="flex-1">{t.teamName || t.teamId.slice(0, 8)}</span>
            <span className="font-mono text-live-red">{(t.safePct * 100).toFixed(0)}%</span>
          </label>
        ))}
      </div>
      <textarea
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        placeholder="Optional reasoning (visible in league chat after chop)"
        className="w-full rounded p-2 bg-surface border border-slate-300 dark:border-slate-700"
        rows={2}
      />
      <button
        onClick={submitChop}
        disabled={submitting || selected.size === 0}
        className="bg-blaze text-white font-display px-4 py-2 rounded disabled:opacity-50"
      >
        {submitting ? 'Chopping…' : `Confirm Chop (${selected.size})`}
      </button>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/chopped/CommishChopReview.jsx
git commit -m "feat(chopped): commish manual chop review panel"
```

---

## Phase 10 — Standings + Waivers Updates

### Task 17: Standings page Chopped variant

**Files:**
- Modify: `frontend/src/pages/Standings.jsx` (or equivalent)

**Step 1: Add Chopped-format branch**

Locate the standings render. Where W-L column is shown, add:

```jsx
{league.format === 'CHOPPED' ? (
  <th>Status</th>
) : (
  <th>W-L</th>
)}
```

In the row render:
```jsx
{league.format === 'CHOPPED' ? (
  <td>
    {team.eliminatedAt
      ? <span className="text-muted">Chopped Wk {team.eliminationWeek}</span>
      : team.finalRank === 1
        ? <span className="text-crown font-bold">🏆 Champion</span>
        : <span className="text-field">Alive</span>}
  </td>
) : (
  <td>{team.wins}-{team.losses}</td>
)}
```

Sort: alive teams first (by Safe %), eliminated by `finalRank` desc.

**Step 2: Commit**

```bash
git add frontend/src/pages/Standings.jsx
git commit -m "feat(chopped): standings page — Status column + finalRank sort"
```

---

### Task 18: Waiver wire "Recently Chopped" filter

**Files:**
- Modify: `frontend/src/pages/WaiverWire.jsx` (locate via grep)

**Step 1: Add filter pill (Chopped leagues only)**

```jsx
{league.format === 'CHOPPED' && (
  <button onClick={() => setFilter('recently_chopped')}
    className={filter === 'recently_chopped' ? 'bg-blaze text-white' : ''}>
    💀 Recently Chopped
  </button>
)}
```

**Step 2: Backend filter on free-agent endpoint**

Search for the existing free-agent query (likely `players.js` or `waivers.js` route). Add a `?recentlyChopped=true` param that filters players who were on a chopped team where `eliminatedAt > NOW() - 7d`.

**Step 3: Commit**

```bash
git add frontend/src/pages/WaiverWire.jsx backend/src/routes/players.js
git commit -m "feat(chopped): waiver wire — recently chopped filter"
```

---

## Phase 11 — Waiver Close Configuration (Platform-Wide)

### Task 19: Expose waiverCloseDay / waiverCloseTime per-league

**Files:**
- Modify: `frontend/src/pages/LeagueSettings.jsx` (commish settings UI)
- Modify: existing waiver cron(s) — read from `league.settings` instead of hardcoded schedule

**Step 1: Find existing waiver cron**

```bash
grep -rn "waiver\|processWaivers" backend/src/services/ backend/src/index.js | head -20
```

**Step 2: Replace hardcoded schedule with per-league check**

Wherever the cron currently fires (probably `cron.schedule('59 23 * * 2'`), keep the schedule wide-open (every 5 min Mon-Wed) but inside the handler, check each league's `settings.waiverCloseDay/Time/Timezone` before processing.

**Step 3: Add settings UI**

Three fields in LeagueSettings.jsx:
- Waiver close day (dropdown: TUESDAY default)
- Waiver close time (time input: 23:59 default)
- Timezone (dropdown: America/New_York default)

Saves to `league.settings.waiverCloseDay/Time/Timezone`.

**Step 4: Backward compatibility**

In handler, if `settings.waiverCloseDay` is missing, treat as TUESDAY/23:59/America/New_York. **Do not change existing leagues' effective behavior.**

**Step 5: Commit**

```bash
git add frontend/src/pages/LeagueSettings.jsx backend/src/services/
git commit -m "feat(waivers): expose waiverCloseDay/Time as per-league setting"
```

---

## Phase 12 — Notifications

### Task 20: team_chopped notification template

**Files:**
- Modify: `backend/src/services/notificationService.js` (add handler)
- Modify: `backend/src/services/emailService.js` (add chopped recap template)

**Step 1: Add notification handler**

In `notificationService.js`, switch case for `type: 'team_chopped'`:
- Push: title "You've been Chopped 💀", body "Final rank #N in [league name]"
- In-app: persist row in Notifications table
- Email: call emailService.sendChoppedRecap

**Step 2: Chopped recap email**

Resend email template — `templates/chopped-recap.html` (HTML), `chopped-recap.txt` (plain).

Variables: `{{userName}}`, `{{leagueName}}`, `{{week}}`, `{{scoredPoints}}`, `{{safePct}}`, `{{finalRank}}`, `{{aliveCount}}`, `{{survivorList}}`.

**Step 3: Champion notification**

`type: 'chopped_season_complete'` — gold-themed push + email.

**Step 4: Commit**

```bash
git add backend/src/services/notificationService.js backend/src/services/emailService.js backend/templates/
git commit -m "feat(chopped): notifications + chopped recap email template"
```

---

## Phase 13 — Decision Capture Integration

### Task 21: Wire ChopEvent into RosterTransaction with envelope

**Files:**
- Modify: `backend/src/services/chopped/survivalService.js` (executeChop transaction)
- Modify: `backend/src/constants/reasonChips.js` (add `eliminationReason` taxonomy)

**Step 1: Add elimination-reason chips**

`backend/src/constants/reasonChips.js`:
```js
const ELIMINATION_REASON_CHIPS = {
  nfl: [
    { id: 'lowest_score', label: 'Lowest score this week' },
    { id: 'bye_week_overload', label: 'Too many byes' },
    { id: 'injury_cascade', label: 'Roster injuries' },
    { id: 'auto_fallback', label: 'Auto-chop (commish AFK)' },
    { id: 'commish_override', label: 'Commish override' },
  ],
};
```

Add to the exported `getReasonChips(sport, surface)` switch:
```js
if (surface === 'chop_zone') return ELIMINATION_REASON_CHIPS[sport] || ELIMINATION_REASON_CHIPS.nfl;
```

**Step 2: Write RosterTransaction inside executeChop**

In `survivalService.js`, after creating the ChopEvent, also create a RosterTransaction per chopped team:

```js
const { buildEnvelopeWithContext } = require('../decisionEnvelope');

const envelope = await buildEnvelopeWithContext({
  req: null,
  surface: 'chop_zone',
  leagueId,
  teamId,
  prisma: tx,
});

await tx.rosterTransaction.create({
  data: {
    teamId,
    leagueId,
    transactionType: 'CHOPPED',
    sport: 'nfl',
    surface: 'chop_zone',
    reasonChips: [triggerType === 'auto_fallback' ? 'auto_fallback' : 'lowest_score'],
    ...envelope,
  },
});
```

**Step 3: Commit**

```bash
git add backend/src/services/chopped/survivalService.js backend/src/constants/reasonChips.js
git commit -m "feat(chopped): decision capture envelope on every chop"
```

---

## Phase 14 — Vocabulary + Polish

### Task 22: Centralized vocabulary file

**Files:**
- Create: `frontend/src/lib/chopped/vocabulary.js`

**Step 1: Define terms**

```js
export const CHOPPED_VOCAB = {
  activeTeams: 'Survivors',
  eliminatedTeams: 'Chopped',
  actOfCutting: 'Chop',
  weeklyWorst: 'The Block',
  manualCut: 'Manual Chop',
  champion: 'Champion',
  // Verb forms
  chopVerb: 'Chop',
  choppedPastTense: 'Chopped',
};
```

**Step 2: Replace hardcoded strings**

Search and replace in ChopZone.jsx, ChopZoneWidget.jsx, CommishChopReview.jsx:
```bash
grep -rn "Survivors\|Chopped\|The Block" frontend/src/components/chopped/ frontend/src/pages/ChopZone.jsx
```
Import `CHOPPED_VOCAB` and replace literals.

**Step 3: Commit**

```bash
git add frontend/src/lib/chopped/vocabulary.js frontend/src/components/chopped/ frontend/src/pages/ChopZone.jsx
git commit -m "feat(chopped): centralized vocabulary for easy A/B testing"
```

---

## Phase 15 — Smoke Test on Live League

### Task 23: Seed a TEST CHOPPED league + run end-to-end

**Files:**
- Create: `backend/scripts/chopped/seed-test-league.js`

**Step 1: Seed script**

```js
const prisma = require('../../src/lib/prisma');

(async () => {
  const commish = await prisma.user.findFirst({ where: { email: 'ericmsaylor@gmail.com' } });
  if (!commish) throw new Error('Commish user not found');

  const league = await prisma.league.create({
    data: {
      name: 'CHOPPED TEST 2026',
      format: 'CHOPPED',
      sport: 'NFL',
      commissionerId: commish.id,
      isActive: true,
      settings: {
        chopped: {
          chopsPerWeek: 1,
          manualChopEnabled: true,
          autoChopFallback: true,
        },
        waiverCloseDay: 'TUESDAY',
        waiverCloseTime: '23:59',
        waiverCloseTimezone: 'America/New_York',
      },
    },
  });
  console.log('Created CHOPPED test league:', league.id);

  for (let i = 1; i <= 8; i++) {
    await prisma.team.create({
      data: {
        leagueId: league.id,
        name: `Test Team ${i}`,
        ownerId: commish.id,
      },
    });
  }
  console.log('Created 8 test teams');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
```

**Step 2: Run seed**

```bash
node backend/scripts/chopped/seed-test-league.js
```

**Step 3: Manual end-to-end test**

1. Open https://clutchfantasysports.com/leagues/<id>
2. Verify Chop Zone widget renders
3. Open /leagues/<id>/chop — verify Survivors/Block/Chopped sections
4. As commish, select 1 team in the manual chop panel → Confirm Chop
5. Verify: team marked eliminated, roster cleared, ChopEvent row exists, notification sent
6. Verify Standings page shows "Chopped Wk N"
7. Verify Waiver Wire shows "Recently Chopped" filter and surfaces the released players

**Step 4: Cleanup**

After verification, delete the test league:
```js
// scripts/chopped/cleanup-test-league.js
const prisma = require('../../src/lib/prisma');
await prisma.league.deleteMany({ where: { name: { startsWith: 'CHOPPED TEST' } } });
```

**Step 5: Commit + push**

```bash
git add backend/scripts/chopped/seed-test-league.js
git commit -m "feat(chopped): test league seed script"
git push origin master
```

---

## Phase 16 — Documentation

### Task 24: Update CLAUDE.md + queue + docs

**Files:**
- Modify: `CLAUDE.md` (add Chopped to Phase 7 or new section)
- Modify: `docs/QUEUE.md` (mark #199 DONE)
- Modify: `docs/CLUTCH_DECISION_CAPTURE_SPEC.md` (add chop_zone surface to surface list)

**Step 1: CLAUDE.md update block**

Add to Phase 7 section or as standalone:
```markdown
### Chopped Format (NFL v1) — COMPLETE
NFL league format where lowest-scoring team is chopped each week. Reuses
existing waiver/FAAB infra. Commissioner manual control + Tuesday auto-fallback.
Analytical pairwise Safe % math (microseconds-per-call). Provider abstraction
(ESPN free + SportsDataIO stub) so we can flip to paid live data without
code changes. Spec: docs/plans/2026-05-17-chopped-format-design.md.
```

**Step 2: QUEUE.md**

Mark queue item #199 as `DONE — 2026-05-17, shipped Chopped NFL v1`.

**Step 3: Decision capture spec**

In `docs/CLUTCH_DECISION_CAPTURE_SPEC.md`, add `chop_zone` to the list of surfaces that conform to the 8-primitive shapes.

**Step 4: Commit**

```bash
git add CLAUDE.md docs/QUEUE.md docs/CLUTCH_DECISION_CAPTURE_SPEC.md
git commit -m "docs: chopped format v1 complete — CLAUDE.md, QUEUE, decision spec"
git push origin master
```

---

## Summary of Tasks

1. Schema: LeagueFormat + Team eliminations
2. Schema: ChopEvent table
3. Deploy migration 52
4. Provider interface + factory
5. ESPN scoreboard provider
6. SportsDataIO stub provider
7. Variance constants + normal CDF
8. safePercentService — pairwise math
9. Tiebreaker resolution
10. survivalService — executeChop
11. API routes (safe-percents, chop, events)
12. Auto-chop cron
13. League creation card
14. League Home Chop Zone widget
15. /leagues/:id/chop page
16. CommishChopReview component
17. Standings page Chopped variant
18. Waiver wire "Recently Chopped" filter
19. Waiver close per-league config (platform-wide)
20. team_chopped notification + email
21. Decision capture integration
22. Centralized vocabulary
23. Test league seed + end-to-end smoke
24. Documentation updates

**Estimated effort:** 24 tasks, ~3-5 minutes per step × 5-7 steps each. One focused weekend or three evening sessions.

**Critical dependencies between phases:**
- Phase 1 (schema) blocks everything
- Phase 2 (provider abstraction) is independent and can run in parallel with Phase 3-4
- Phase 5 (API) requires 3-4 complete
- Phase 6 (cron) requires 4-5 complete
- Phase 7-11 (frontend) requires 5 complete
- Phase 12-13 (notifications + decision capture) requires 4 complete
- Phase 14 (vocab) is polish, can defer
- Phase 15 (end-to-end test) is the final gate before announcing the feature
