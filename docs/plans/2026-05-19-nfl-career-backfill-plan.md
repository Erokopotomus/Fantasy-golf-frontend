# NFL Career-Data Backfill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Backfill NFL career data for ~1,500-2,500 fantasy-relevant players (1999-2025), wire lazy-fetch for everyone else, so the PlayerDrawer surfaces meaningful careers for any active 2026 player.

**Architecture:** Pool-then-filter backfill on top of existing `nflHistoricalSync` machinery. Position-tiered top-N-per-season computes the qualifying pool; a wrapper restricts ingestion to pool members. New `NflPlayerDataState` table tracks fetch state. Drawer API route gains an inline lazy-fetch fallback for non-pool players.

**Tech Stack:** Prisma + raw SQL bulk inserts (matching existing `nflHistoricalSync.js` pattern), nflverse CSV releases via existing `nflClient.js`, Node verification scripts in `backend/scripts/`.

**Reference design:** `docs/plans/2026-05-19-nfl-career-backfill-design.md`

---

## Pre-flight

- Read the design doc first.
- All work touches `backend/`. No frontend changes (drawer is already dynamic and was wired in commit `8973116`).
- Verification is via Node scripts that hit the real DB + nflverse — no jest setup. Run scripts directly with `node backend/scripts/...`.
- Pattern-match existing services: `backend/src/services/nflHistoricalSync.js` is the reference for bulk SQL inserts. `backend/src/services/nflClient.js` is the nflverse fetch surface.
- Frequent commits. One commit per task at minimum.

---

## Task 1: Schema migration — NflPlayerDataState model

**Files:**
- Modify: `backend/prisma/schema.prisma` (add new model + relation on `Player`)
- Create: `backend/prisma/migrations/<timestamp>_nfl_player_data_state/migration.sql` (autogen via prisma migrate)

**Step 1: Add the model to schema.prisma**

Add this model after the `NflPlayerGame` model:

```prisma
model NflPlayerDataState {
  id              String   @id @default(cuid())
  playerId        String   @unique
  player          Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)

  inPool          Boolean  @default(false)
  fetchedThrough  Int?
  earliestFetched Int?
  lastFetchedAt   DateTime?

  lazyFetchedAt   DateTime?
  lazyFetchError  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([inPool])
  @@map("nfl_player_data_state")
}
```

Add the back-relation on `Player`:

```prisma
model Player {
  // ... existing fields ...
  nflPlayerDataState NflPlayerDataState?
}
```

**Step 2: Generate the migration**

Run: `cd backend && npx prisma migrate dev --name nfl_player_data_state --create-only`
Expected: New migration directory created under `backend/prisma/migrations/`, no DB writes yet.

**Step 3: Inspect the SQL**

Read the generated `migration.sql`. It should contain:
- `CREATE TABLE "nfl_player_data_state" (...)`
- `CREATE UNIQUE INDEX "nfl_player_data_state_playerId_key" ON ...`
- `CREATE INDEX "nfl_player_data_state_inPool_idx" ON ...`
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...`

No `ALTER TABLE players` should be there (the back-relation is virtual, not a column).

**Step 4: Apply locally**

Run: `cd backend && npx prisma migrate dev`
Expected: Migration applies, `npx prisma generate` runs, "Migration applied successfully."

**Step 5: Smoke-test the model**

Create `backend/scripts/check-player-data-state.js`:

```js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

;(async () => {
  const count = await prisma.nflPlayerDataState.count()
  console.log(`NflPlayerDataState rows: ${count}`)
  await prisma.$disconnect()
})()
```

Run: `cd backend && node scripts/check-player-data-state.js`
Expected: `NflPlayerDataState rows: 0`

**Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/scripts/check-player-data-state.js
git commit -m "feat(nfl): add NflPlayerDataState model for backfill + lazy-fetch tracking"
```

---

## Task 2: Half-PPR fantasy scoring helper

**Files:**
- Create: `backend/src/services/nfl/computeFantasyPoints.js`

The pool computation needs a deterministic per-row fantasy-points score so we can rank players within a season. Pure function — no DB, no IO.

**Step 1: Write the function**

```js
/**
 * Compute Half-PPR fantasy points from a single nflverse weekly stat row.
 * Returns a number (possibly negative due to interceptions/fumbles).
 *
 * Half PPR scoring:
 *   Pass: 0.04/yd, 4/TD, -2/INT
 *   Rush: 0.1/yd, 6/TD, -2/fumble lost
 *   Rec:  0.1/yd, 6/TD, 0.5/reception
 */
function computeHalfPpr(row) {
  const num = (v) => (v == null || v === '' ? 0 : Number(v))

  // Handle both legacy (passing_yards) and new (pass_yards) column names.
  const passYds = num(row.passing_yards ?? row.pass_yards)
  const passTd  = num(row.passing_tds ?? row.pass_tds)
  const passInt = num(row.passing_interceptions ?? row.interceptions)
  const rushYds = num(row.rushing_yards ?? row.rush_yards)
  const rushTd  = num(row.rushing_tds ?? row.rush_tds)
  const recYds  = num(row.receiving_yards ?? row.rec_yards)
  const recTd   = num(row.receiving_tds ?? row.rec_tds)
  const rec     = num(row.receptions)
  const fumLost = num(row.rushing_fumbles_lost ?? row.receiving_fumbles_lost ?? row.fumbles_lost)

  return (
    passYds * 0.04 + passTd * 4 - passInt * 2 +
    rushYds * 0.10 + rushTd * 6 - fumLost * 2 +
    recYds * 0.10 + recTd * 6 + rec * 0.5
  )
}

module.exports = { computeHalfPpr }
```

**Step 2: Create a verification script**

Create `backend/scripts/check-fantasy-points.js`:

```js
const { computeHalfPpr } = require('../src/services/nfl/computeFantasyPoints')

// Synthetic Josh Allen 2023 Week 1 stat line
const allenRow = {
  passing_yards: 236, passing_tds: 3, passing_interceptions: 1,
  rushing_yards: 36, rushing_tds: 0,
  receptions: 0,
}
// 236*0.04 + 3*4 + (-1)*2 + 36*0.1 + 0 = 9.44 + 12 - 2 + 3.6 = 23.04
console.log('Allen expected ~23.04, got:', computeHalfPpr(allenRow).toFixed(2))

// Synthetic CMC stat line
const cmcRow = {
  rushing_yards: 152, rushing_tds: 1,
  receiving_yards: 30, receiving_tds: 0, receptions: 4,
}
// 152*0.1 + 6 + 30*0.1 + 0 + 4*0.5 = 15.2 + 6 + 3 + 2 = 26.2
console.log('CMC expected ~26.20, got:', computeHalfPpr(cmcRow).toFixed(2))
```

**Step 3: Run it**

Run: `cd backend && node scripts/check-fantasy-points.js`
Expected output:
```
Allen expected ~23.04, got: 23.04
CMC expected ~26.20, got: 26.20
```

**Step 4: Commit**

```bash
git add backend/src/services/nfl/computeFantasyPoints.js backend/scripts/check-fantasy-points.js
git commit -m "feat(nfl): add Half-PPR fantasy points helper for pool ranking"
```

---

## Task 3: Single-season pool computer

**Files:**
- Create: `backend/src/services/nfl/computePool.js`

Given the weekly stat rows for one season, group by player, compute season-total Half PPR, take top-N per position. Returns a `Set<gsisId>`.

**Step 1: Write the function**

```js
const { computeHalfPpr } = require('./computeFantasyPoints')

const POSITION_LIMITS = {
  QB: 32,
  RB: 60,
  WR: 80,
  TE: 36,
  K: 32,
}

/**
 * Compute the top-N-per-position pool for a single season.
 *
 * @param {Array} weeklyRows - nflverse weekly stat rows (one per player-week)
 * @returns {Set<string>} gsisIds that qualify for the pool
 */
function computeSeasonPool(weeklyRows) {
  // Aggregate weekly rows → per-player season totals
  const byPlayer = new Map() // gsisId → { position, totalPts }
  for (const row of weeklyRows) {
    const gsisId = row.player_id
    if (!gsisId) continue
    const position = (row.position || row.position_group || '').toUpperCase()
    if (!position) continue
    const pts = computeHalfPpr(row)
    const acc = byPlayer.get(gsisId) || { position, totalPts: 0 }
    acc.totalPts += pts
    byPlayer.set(gsisId, acc)
  }

  // Group by position, sort desc, take top N per position
  const byPosition = new Map()
  for (const [gsisId, { position, totalPts }] of byPlayer) {
    if (!POSITION_LIMITS[position]) continue
    if (!byPosition.has(position)) byPosition.set(position, [])
    byPosition.get(position).push({ gsisId, totalPts })
  }

  const pool = new Set()
  for (const [position, players] of byPosition) {
    players.sort((a, b) => b.totalPts - a.totalPts)
    const limit = POSITION_LIMITS[position]
    for (const p of players.slice(0, limit)) pool.add(p.gsisId)
  }
  return pool
}

module.exports = { computeSeasonPool, POSITION_LIMITS }
```

**Step 2: Verification script — run against real 2024 data**

Create `backend/scripts/check-season-pool.js`:

```js
const nflClient = require('../src/services/nflClient')
const { computeSeasonPool } = require('../src/services/nfl/computePool')

;(async () => {
  console.log('Fetching 2024 weekly stats…')
  const rows = await nflClient.getWeeklyStats(2024)
  console.log(`Got ${rows.length} weekly rows`)

  const pool = computeSeasonPool(rows)
  console.log(`Pool size for 2024: ${pool.size}`)
  console.log(`Expected: ~232 (32 QB + 60 RB + 80 WR + 36 TE + nflverse may omit some K)`)

  // Spot-check Josh Allen and CMC
  const allenInPool = [...pool].some(id => id) // we don't know Allen's gsis_id offline
  // Instead: just print a few pool entries
  console.log('First 5 pool entries:', [...pool].slice(0, 5))
})()
```

**Step 3: Run it**

Run: `cd backend && node scripts/check-season-pool.js`
Expected:
- Logs "Got NNNN weekly rows" (typically 5,000-10,000 for a full season)
- Logs "Pool size for 2024: ~200-240" (close to 240, may vary if nflverse omits some positions)
- Prints sample gsisIds

**Step 4: Commit**

```bash
git add backend/src/services/nfl/computePool.js backend/scripts/check-season-pool.js
git commit -m "feat(nfl): add single-season top-N-per-position pool computer"
```

---

## Task 4: Multi-season pool unioner

**Files:**
- Create: `backend/src/services/nfl/computeMultiSeasonPool.js`

Iterates 1999-2025, fetches weekly stats, computes per-season pool, unions all gsisIds into one master set.

**Step 1: Write the function**

```js
const nflClient = require('../nflClient')
const { computeSeasonPool } = require('./computePool')

/**
 * Compute the union of position-tiered pools across multiple seasons.
 *
 * @param {Array<number>} seasons - e.g., [1999, 2000, ..., 2025]
 * @returns {Promise<{ pool: Set<string>, perSeasonSizes: Object }>}
 */
async function computeMultiSeasonPool(seasons) {
  const pool = new Set()
  const perSeasonSizes = {}

  for (const season of seasons) {
    try {
      console.log(`[pool] Fetching ${season} weekly stats…`)
      const rows = await nflClient.getWeeklyStats(season)
      const seasonPool = computeSeasonPool(rows)
      perSeasonSizes[season] = seasonPool.size
      for (const id of seasonPool) pool.add(id)
      console.log(`[pool] ${season}: ${seasonPool.size} qualifiers (running union: ${pool.size})`)
    } catch (e) {
      console.warn(`[pool] Season ${season} failed: ${e.message} — skipping`)
      perSeasonSizes[season] = 'ERROR'
    }
  }

  return { pool, perSeasonSizes }
}

module.exports = { computeMultiSeasonPool }
```

**Step 2: Run a real multi-season computation (limited range first)**

Create `backend/scripts/check-multi-season-pool.js`:

```js
const { computeMultiSeasonPool } = require('../src/services/nfl/computeMultiSeasonPool')

;(async () => {
  // Start small to verify, then run full range later
  const seasons = [2020, 2021, 2022, 2023, 2024]
  const { pool, perSeasonSizes } = await computeMultiSeasonPool(seasons)
  console.log('\n=== Pool union ===')
  console.log(`Total unique players: ${pool.size}`)
  console.log('Per-season sizes:', perSeasonSizes)
})()
```

Run: `cd backend && node scripts/check-multi-season-pool.js`
Expected:
- 5 seasons of nflverse fetches (each ~10-30 seconds)
- Final pool size: ~500-800 unique players for a 5-year window
- Per-season sizes around 200-240 each

**Step 3: Commit**

```bash
git add backend/src/services/nfl/computeMultiSeasonPool.js backend/scripts/check-multi-season-pool.js
git commit -m "feat(nfl): add multi-season pool unioner"
```

---

## Task 5: Filtered weekly stats import — pool-restricted bulk insert

**Files:**
- Create: `backend/src/services/nfl/filteredBackfill.js`
- Modify (read-only reference): `backend/src/services/nflHistoricalSync.js` lines 375-487 (existing `syncWeeklyStatsRaw` is the template)

The existing `syncWeeklyStatsRaw` inserts every stat row. We want a version that takes a pool `Set<gsisId>` and skips rows whose player isn't in the pool. This dramatically cuts the row count for historical seasons.

**Step 1: Write the filtered weekly-stats inserter**

```js
const nfl = require('../nflClient')
const { genId, sqlVal, normalizeTeamAbbr } = require('./sqlHelpers') // <-- see Step 2

/**
 * Pool-filtered weekly stats backfill for a single season.
 * Mirrors nflHistoricalSync.syncWeeklyStatsRaw but pre-filters by gsisId.
 *
 * Prereqs: Player records exist for every pool member (run syncFilteredPlayers first).
 *
 * @param {PrismaClient} prisma
 * @param {number} season
 * @param {Map<string, string>} playerMap - gsisId -> Player.id
 * @param {Map<string, string>} gameMap - externalId -> NflGame.id
 * @param {Set<string>} pool - qualifying gsisIds
 */
async function syncFilteredWeeklyStats(prisma, season, playerMap, gameMap, pool) {
  const rows = await nfl.getWeeklyStats(season)
  const candidates = rows.filter(r => r.player_id && pool.has(r.player_id))
  console.log(`[filteredBackfill] ${season}: ${candidates.length} of ${rows.length} rows in pool`)

  // Build the stat-row objects expected by the existing bulk insert
  const statRows = []
  for (const r of candidates) {
    const playerId = playerMap.get(r.player_id)
    if (!playerId) continue
    // Build a game key matching what nflHistoricalSync uses
    const externalGameId = r.game_id // nflverse format: "2024_01_KC_BAL"
    const gameId = gameMap.get(externalGameId)
    if (!gameId) continue

    statRows.push({
      playerId,
      gameId,
      teamAbbr: normalizeTeamAbbr(r.recent_team || r.team || ''),
      passAttempts:    r.passing_attempts ?? r.attempts,
      passCompletions: r.passing_completions ?? r.completions,
      passYards:       r.passing_yards ?? r.pass_yards,
      passTds:         r.passing_tds ?? r.pass_tds,
      interceptions:   r.passing_interceptions ?? r.interceptions,
      sacked:          r.sacks_suffered ?? r.sacks,
      sackYards:       r.sack_yards_lost,
      passerRating:    r.passer_rating,
      rushAttempts:    r.carries ?? r.rush_attempts,
      rushYards:       r.rushing_yards ?? r.rush_yards,
      rushTds:         r.rushing_tds ?? r.rush_tds,
      fumbles:         r.rushing_fumbles ?? r.fumbles,
      fumblesLost:     r.rushing_fumbles_lost ?? r.fumbles_lost,
      targets:         r.targets,
      receptions:      r.receptions,
      recYards:        r.receiving_yards ?? r.rec_yards,
      recTds:          r.receiving_tds ?? r.rec_tds,
      targetShare:     r.target_share,
      fantasyPtsStd:   r.fantasy_points,
      fantasyPtsPpr:   r.fantasy_points_ppr,
      fantasyPtsHalf:  r.fantasy_points_half_ppr,
    })
  }

  if (statRows.length === 0) {
    console.log(`[filteredBackfill] ${season}: no rows to insert after filtering`)
    return { inserted: 0 }
  }

  // Bulk insert via raw SQL, matching the existing pattern
  const CHUNK = 500
  let inserted = 0
  const now = new Date().toISOString()

  for (let i = 0; i < statRows.length; i += CHUNK) {
    const chunk = statRows.slice(i, i + CHUNK)
    const values = chunk.map(s => {
      const id = genId()
      return `(${sqlVal(id)}, ${sqlVal(s.playerId)}, ${sqlVal(s.gameId)}, ${sqlVal(s.teamAbbr)}, ${s.passAttempts ?? 'NULL'}, ${s.passCompletions ?? 'NULL'}, ${s.passYards ?? 'NULL'}, ${s.passTds ?? 'NULL'}, ${s.interceptions ?? 'NULL'}, ${s.sacked ?? 'NULL'}, ${s.sackYards ?? 'NULL'}, ${s.passerRating ?? 'NULL'}, ${s.rushAttempts ?? 'NULL'}, ${s.rushYards ?? 'NULL'}, ${s.rushTds ?? 'NULL'}, ${s.fumbles ?? 'NULL'}, ${s.fumblesLost ?? 'NULL'}, ${s.targets ?? 'NULL'}, ${s.receptions ?? 'NULL'}, ${s.recYards ?? 'NULL'}, ${s.recTds ?? 'NULL'}, ${s.targetShare ?? 'NULL'}, ${s.fantasyPtsStd ?? 'NULL'}, ${s.fantasyPtsPpr ?? 'NULL'}, ${s.fantasyPtsHalf ?? 'NULL'}, 'nflverse', '${now}', '${now}', '${now}')`
    }).join(',\n')

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO nfl_player_games (id, "playerId", "gameId", "teamAbbr", "passAttempts", "passCompletions", "passYards", "passTds", "interceptions", "sacked", "sackYards", "passerRating", "rushAttempts", "rushYards", "rushTds", "fumbles", "fumblesLost", "targets", "receptions", "recYards", "recTds", "targetShare", "fantasyPtsStd", "fantasyPtsPpr", "fantasyPtsHalf", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
        VALUES ${values}
        ON CONFLICT ("playerId", "gameId") DO NOTHING
      `)
      inserted += chunk.length
    } catch (e) {
      console.warn(`[filteredBackfill] insert failed at offset ${i}: ${e.message}`)
    }
  }

  return { inserted }
}

module.exports = { syncFilteredWeeklyStats }
```

**Step 2: Pull shared helpers into one place**

The existing `nflHistoricalSync.js` defines `genId`, `sqlVal`, `normalizeTeamAbbr`, `mapPosition` inline. Extract them into a shared module:

Create `backend/src/services/nfl/sqlHelpers.js`:

```js
const { randomUUID } = require('crypto')

function genId() {
  // cuid-shaped: c + lowercase hex
  return 'c' + randomUUID().replace(/-/g, '').slice(0, 24)
}

function sqlVal(v) {
  if (v == null) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return `'${String(v).replace(/'/g, "''")}'`
}

const TEAM_ALIASES = {
  OAK: 'LV', SD: 'LAC', STL: 'LA', JAC: 'JAX',
}

function normalizeTeamAbbr(abbr) {
  if (!abbr) return null
  const u = String(abbr).toUpperCase().trim()
  return TEAM_ALIASES[u] || u
}

function mapPosition(raw) {
  if (!raw) return null
  const upper = String(raw).toUpperCase()
  if (['QB', 'RB', 'FB', 'WR', 'TE', 'K', 'P'].includes(upper)) {
    return upper === 'FB' ? 'RB' : upper
  }
  return null
}

module.exports = { genId, sqlVal, normalizeTeamAbbr, mapPosition }
```

**Step 3: Verify it doesn't break existing imports**

Run: `cd backend && node -e "require('./src/services/nfl/sqlHelpers'); console.log('OK')"`
Expected: `OK`

(Note: this task does NOT yet refactor `nflHistoricalSync.js` to use the shared helpers — leaving that as a follow-up to avoid disrupting working code. The new code uses the new helpers; the old code keeps its inline definitions.)

**Step 4: Commit**

```bash
git add backend/src/services/nfl/filteredBackfill.js backend/src/services/nfl/sqlHelpers.js
git commit -m "feat(nfl): add pool-filtered weekly stats backfill helper"
```

---

## Task 6: Filtered player import + game import

**Files:**
- Modify: `backend/src/services/nfl/filteredBackfill.js` (add two more functions)

We need to (a) make sure Player rows exist for every pool member, and (b) make sure NflGame rows exist for every season we're inserting stats for.

**Step 1: Add filtered-player creation**

Append to `backend/src/services/nfl/filteredBackfill.js`:

```js
/**
 * Create Player records for any pool gsisIds that don't exist yet.
 * Scans nflverse weekly stats for player metadata (name, position, current team).
 *
 * Reuses existing logic from nflHistoricalSync but constrained to the pool.
 */
async function syncFilteredPlayers(prisma, seasons, pool) {
  const { mapPosition, normalizeTeamAbbr, genId, sqlVal } = require('./sqlHelpers')

  // Load existing gsisId → playerId map
  const existing = await prisma.player.findMany({
    where: { gsisId: { not: null } },
    select: { id: true, gsisId: true },
  })
  const existingByGsis = new Map(existing.map(p => [p.gsisId, p.id]))

  // Identify pool members we need to create
  const toCreate = new Map() // gsisId → { name, position, team }
  for (const season of seasons) {
    let rows
    try { rows = await nfl.getWeeklyStats(season) }
    catch (e) { continue }
    for (const r of rows) {
      const gid = r.player_id
      if (!gid || !pool.has(gid) || existingByGsis.has(gid) || toCreate.has(gid)) continue
      const pos = mapPosition(r.position || r.position_group)
      if (!pos) continue
      toCreate.set(gid, {
        name: r.player_display_name || r.player_name || 'Unknown',
        position: pos,
        team: normalizeTeamAbbr(r.recent_team || r.team || ''),
      })
    }
  }

  console.log(`[filteredBackfill] Creating ${toCreate.size} new Player records for pool`)
  if (toCreate.size === 0) {
    return { created: 0, gsisIdToPlayerId: existingByGsis }
  }

  // Need the NFL sport.id
  const sport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
  if (!sport) throw new Error('NFL sport row missing — run nflSync first')

  const now = new Date().toISOString()
  const CHUNK = 100
  const entries = [...toCreate.entries()]
  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK)
    const values = chunk.map(([gsisId, p]) => {
      const id = genId()
      existingByGsis.set(gsisId, id) // pre-populate the return map
      return `(${sqlVal(id)}, ${sqlVal(gsisId)}, ${sqlVal(p.name)}, ${sqlVal(p.position)}, ${sqlVal(p.team)}, ${sqlVal(sport.id)}, true, 'nflverse', '${now}', '${now}', '${now}')`
    }).join(',\n')
    await prisma.$executeRawUnsafe(`
      INSERT INTO players (id, "gsisId", name, "nflPosition", "nflTeamAbbr", "sportId", "isActive", "sourceProvider", "sourceIngestedAt", "createdAt", "updatedAt")
      VALUES ${values}
      ON CONFLICT ("gsisId") DO NOTHING
    `)
  }

  return { created: toCreate.size, gsisIdToPlayerId: existingByGsis }
}

module.exports.syncFilteredPlayers = syncFilteredPlayers
```

**Step 2: Reuse existing season schedule import**

For NflGame rows, the existing `nflHistoricalSync.syncScheduleRaw(prisma, season)` already creates them and isn't pool-dependent (schedule is per-team, not per-player). We don't need a filtered version — just call the existing function for each backfill season.

Add an orchestration wrapper at the bottom of `filteredBackfill.js`:

```js
const nflHistoricalSync = require('../nflHistoricalSync')

/**
 * Orchestrate full filtered backfill for one season:
 *   1. Ensure schedule (NflGame rows) exists
 *   2. Filter weekly stats by pool, insert
 *
 * Assumes syncFilteredPlayers has already run for the full year range.
 */
async function runFilteredSeason(prisma, season, gsisIdToPlayerId, pool) {
  console.log(`[filteredBackfill] === Season ${season} ===`)

  // Step 1: schedule
  await nflHistoricalSync.syncScheduleRaw(prisma, season)

  // Step 2: build gameMap (externalId → NflGame.id) for this season
  const games = await prisma.nflGame.findMany({
    where: { season },
    select: { id: true, externalId: true },
  })
  const gameMap = new Map(games.filter(g => g.externalId).map(g => [g.externalId, g.id]))

  // Step 3: filtered weekly stats
  const result = await syncFilteredWeeklyStats(prisma, season, gsisIdToPlayerId, gameMap, pool)
  console.log(`[filteredBackfill] ${season}: inserted ${result.inserted} player-game rows`)
  return result
}

module.exports.runFilteredSeason = runFilteredSeason
```

**Step 3: Verify the imports resolve**

Run: `cd backend && node -e "const m = require('./src/services/nfl/filteredBackfill'); console.log(Object.keys(m))"`
Expected: `[ 'syncFilteredWeeklyStats', 'syncFilteredPlayers', 'runFilteredSeason' ]`

**Step 4: Commit**

```bash
git add backend/src/services/nfl/filteredBackfill.js
git commit -m "feat(nfl): add filtered player import + per-season orchestration"
```

---

## Task 7: NflPlayerDataState bookkeeping helper

**Files:**
- Create: `backend/src/services/nfl/playerDataState.js`

Updates the new `NflPlayerDataState` rows after a backfill completes — and provides the read helper that the lazy-fetch path will call.

**Step 1: Write the helpers**

```js
/**
 * After a backfill run, mark every pool player with their fetch state.
 * Computes per-player earliest/latest season from NflPlayerGame.
 */
async function markPoolPlayersFetched(prisma, gsisIdToPlayerId, pool, throughSeason) {
  const poolPlayerIds = []
  for (const gid of pool) {
    const pid = gsisIdToPlayerId.get(gid)
    if (pid) poolPlayerIds.push(pid)
  }
  if (poolPlayerIds.length === 0) return { updated: 0 }

  // Query each player's earliest/latest synced season
  const rows = await prisma.$queryRaw`
    SELECT
      pg."playerId",
      MIN(g.season) AS earliest,
      MAX(g.season) AS latest
    FROM nfl_player_games pg
    JOIN nfl_games g ON g.id = pg."gameId"
    WHERE pg."playerId" = ANY(${poolPlayerIds})
    GROUP BY pg."playerId"
  `

  const now = new Date()
  // Upsert NflPlayerDataState per player
  for (const r of rows) {
    await prisma.nflPlayerDataState.upsert({
      where: { playerId: r.playerId },
      create: {
        playerId: r.playerId,
        inPool: true,
        earliestFetched: Number(r.earliest),
        fetchedThrough: Number(r.latest),
        lastFetchedAt: now,
      },
      update: {
        inPool: true,
        earliestFetched: Number(r.earliest),
        fetchedThrough: Number(r.latest),
        lastFetchedAt: now,
      },
    })
  }
  return { updated: rows.length }
}

/**
 * Check if a player has been data-loaded (pool OR lazy-fetched).
 * Returns the state row or null.
 */
async function getPlayerDataState(prisma, playerId) {
  return prisma.nflPlayerDataState.findUnique({ where: { playerId } })
}

module.exports = { markPoolPlayersFetched, getPlayerDataState }
```

**Step 2: Smoke-test the queries (without populating)**

Create `backend/scripts/check-data-state-helpers.js`:

```js
const { PrismaClient } = require('@prisma/client')
const { getPlayerDataState } = require('../src/services/nfl/playerDataState')
const prisma = new PrismaClient()

;(async () => {
  // Pick any existing NFL player
  const player = await prisma.player.findFirst({
    where: { gsisId: { not: null } },
    select: { id: true, name: true },
  })
  if (!player) {
    console.log('No NFL players found — run nflSync first')
    return
  }
  console.log(`Checking data state for ${player.name} (${player.id})`)
  const state = await getPlayerDataState(prisma, player.id)
  console.log('State:', state)
  await prisma.$disconnect()
})()
```

Run: `cd backend && node scripts/check-data-state-helpers.js`
Expected: prints a player name + `State: null` (no rows yet).

**Step 3: Commit**

```bash
git add backend/src/services/nfl/playerDataState.js backend/scripts/check-data-state-helpers.js
git commit -m "feat(nfl): add NflPlayerDataState bookkeeping helpers"
```

---

## Task 8: Backfill runner script

**Files:**
- Create: `backend/scripts/run-nfl-career-backfill.js`

The end-to-end one-shot script. Run from terminal: computes pool, creates players, runs each season's backfill, updates data-state rows.

**Step 1: Write the runner**

```js
const { PrismaClient } = require('@prisma/client')
const { computeMultiSeasonPool } = require('../src/services/nfl/computeMultiSeasonPool')
const {
  syncFilteredPlayers,
  runFilteredSeason,
} = require('../src/services/nfl/filteredBackfill')
const { markPoolPlayersFetched } = require('../src/services/nfl/playerDataState')

const prisma = new PrismaClient()

// Parameterized via env so we can test small first.
//   START=2020 END=2025 node scripts/run-nfl-career-backfill.js
const START = parseInt(process.env.START || '1999', 10)
const END = parseInt(process.env.END || '2025', 10)

;(async () => {
  const seasons = []
  for (let y = START; y <= END; y++) seasons.push(y)
  console.log(`[backfill] Range: ${START}-${END} (${seasons.length} seasons)`)

  console.log('\n=== Phase 1: Compute pool ===')
  const { pool, perSeasonSizes } = await computeMultiSeasonPool(seasons)
  console.log(`Pool union: ${pool.size} unique gsisIds`)
  console.log('Per-season:', perSeasonSizes)

  console.log('\n=== Phase 2: Create Player records for pool ===')
  const { created, gsisIdToPlayerId } = await syncFilteredPlayers(prisma, seasons, pool)
  console.log(`Created ${created} new Player rows`)

  console.log('\n=== Phase 3: Per-season filtered backfill ===')
  let totalInserted = 0
  for (const season of seasons) {
    try {
      const r = await runFilteredSeason(prisma, season, gsisIdToPlayerId, pool)
      totalInserted += r.inserted
    } catch (e) {
      console.error(`[backfill] Season ${season} failed: ${e.message}`)
    }
  }
  console.log(`\n[backfill] Total NflPlayerGame rows inserted: ${totalInserted}`)

  console.log('\n=== Phase 4: Mark NflPlayerDataState ===')
  const { updated } = await markPoolPlayersFetched(prisma, gsisIdToPlayerId, pool, END)
  console.log(`Marked ${updated} player data-state rows`)

  await prisma.$disconnect()
  console.log('\n✓ Done.')
})().catch(e => {
  console.error(e)
  process.exit(1)
})
```

**Step 2: Run a small range first (smoke test)**

Run: `cd backend && START=2023 END=2024 node scripts/run-nfl-career-backfill.js`

Expected:
- Phase 1 fetches 2 seasons, builds pool ~300-400 players
- Phase 2 creates 0 new Player rows (we already have 2023+2024 players from existing sync)
- Phase 3 processes 2023 + 2024 — may insert near-zero rows if those seasons are already in NflPlayerGame (ON CONFLICT DO NOTHING handles re-runs)
- Phase 4 marks ~300 NflPlayerDataState rows with `inPool: true`

**Step 3: Sanity-check the data-state results**

Run: `cd backend && node -e "(async () => { const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); const c = await p.nflPlayerDataState.count({ where: { inPool: true } }); console.log('Pool players marked:', c); await p.\$disconnect(); })()"`
Expected: ~300+ rows.

**Step 4: Commit**

```bash
git add backend/scripts/run-nfl-career-backfill.js
git commit -m "feat(nfl): add end-to-end pooled career backfill runner script"
```

---

## Task 9: Lazy-fetch service for non-pool players

**Files:**
- Create: `backend/src/services/nfl/lazyFetch.js`

When a drawer opens for a player not in the pool, this fetches their last-5-seasons of data from nflverse and inserts it. Marks `lazyFetchedAt`.

**Step 1: Write the service**

```js
const nfl = require('../nflClient')
const nflHistoricalSync = require('../nflHistoricalSync')
const { syncFilteredWeeklyStats } = require('./filteredBackfill')

const LAZY_FETCH_SEASONS = [2021, 2022, 2023, 2024, 2025]

/**
 * On-demand fetch of a single player's recent career.
 * Fast-fails if the player has no gsisId. Idempotent — re-running is safe.
 *
 * @param {PrismaClient} prisma
 * @param {string} playerId - canonical Player.id
 * @returns {Promise<{ status: 'fetched' | 'already-loaded' | 'no-gsis-id', inserted?: number }>}
 */
async function lazyFetchPlayer(prisma, playerId) {
  // Quick guard
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, gsisId: true, name: true },
  })
  if (!player) return { status: 'not-found' }
  if (!player.gsisId) return { status: 'no-gsis-id' }

  const existing = await prisma.nflPlayerDataState.findUnique({ where: { playerId } })
  if (existing && (existing.inPool || existing.lazyFetchedAt)) {
    return { status: 'already-loaded' }
  }

  console.log(`[lazyFetch] Loading career for ${player.name} (${player.gsisId})`)

  // Single-player gsisId set for the filtered backfill
  const pool = new Set([player.gsisId])
  const playerMap = new Map([[player.gsisId, player.id]])

  let totalInserted = 0
  const seasonStats = {}

  for (const season of LAZY_FETCH_SEASONS) {
    try {
      // Ensure schedule exists
      await nflHistoricalSync.syncScheduleRaw(prisma, season)
      const games = await prisma.nflGame.findMany({
        where: { season },
        select: { id: true, externalId: true },
      })
      const gameMap = new Map(games.filter(g => g.externalId).map(g => [g.externalId, g.id]))

      const r = await syncFilteredWeeklyStats(prisma, season, playerMap, gameMap, pool)
      totalInserted += r.inserted
      seasonStats[season] = r.inserted
    } catch (e) {
      console.warn(`[lazyFetch] ${season} failed for ${player.name}: ${e.message}`)
      seasonStats[season] = `ERROR: ${e.message}`
    }
  }

  // Mark fetched
  const now = new Date()
  await prisma.nflPlayerDataState.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      inPool: false,
      lazyFetchedAt: now,
      fetchedThrough: 2025,
      earliestFetched: LAZY_FETCH_SEASONS[0],
    },
    update: {
      lazyFetchedAt: now,
      fetchedThrough: 2025,
      earliestFetched: LAZY_FETCH_SEASONS[0],
    },
  })

  return { status: 'fetched', inserted: totalInserted, seasonStats }
}

module.exports = { lazyFetchPlayer, LAZY_FETCH_SEASONS }
```

**Step 2: Verification script — fetch one obscure player**

Create `backend/scripts/check-lazy-fetch.js`:

```js
const { PrismaClient } = require('@prisma/client')
const { lazyFetchPlayer } = require('../src/services/nfl/lazyFetch')
const prisma = new PrismaClient()

;(async () => {
  // Pick a player with gsisId but NO NflPlayerGame rows (use a low-volume guy)
  const candidate = await prisma.$queryRaw`
    SELECT p.id, p.name
    FROM players p
    LEFT JOIN nfl_player_games pg ON pg."playerId" = p.id
    LEFT JOIN nfl_player_data_state s ON s."playerId" = p.id
    WHERE p."gsisId" IS NOT NULL AND pg.id IS NULL AND s.id IS NULL
    LIMIT 1
  `
  if (!candidate.length) {
    console.log('No candidate found (every NFL player already has data or state)')
    return
  }
  const target = candidate[0]
  console.log(`Lazy-fetching: ${target.name} (${target.id})`)
  const result = await lazyFetchPlayer(prisma, target.id)
  console.log('Result:', result)
  await prisma.$disconnect()
})()
```

Run: `cd backend && node scripts/check-lazy-fetch.js`
Expected:
- Picks a player without data
- Logs season-by-season insert counts
- Returns `status: 'fetched'`

**Step 3: Commit**

```bash
git add backend/src/services/nfl/lazyFetch.js backend/scripts/check-lazy-fetch.js
git commit -m "feat(nfl): add lazy-fetch service for non-pool players"
```

---

## Task 10: Wire lazy-fetch into the NFL player API route

**Files:**
- Modify: `backend/src/routes/nfl.js:204-405` (the `GET /players/:id` handler)

When the drawer requests a player whose `NflPlayerDataState` is null AND who has no `NflPlayerGame` rows, trigger `lazyFetchPlayer` inline before returning. Keep it under 15s so the drawer doesn't time out.

**Step 1: Find the route handler**

Open `backend/src/routes/nfl.js` and locate `router.get('/players/:id', ...)` (around line 204).

**Step 2: Add the lazy-fetch check at the top of the handler**

Right after the `const { season } = req.query` line, before the existing `targetSeason` resolution, add:

```js
// Lazy-fetch trigger: if we have no game data for this player AND no state row,
// pull their last-5-season career on demand. Caps at ~10s for reasonable UX.
const dataState = await prisma.nflPlayerDataState.findUnique({
  where: { playerId: req.params.id },
})
if (!dataState) {
  const anyGame = await prisma.nflPlayerGame.findFirst({
    where: { playerId: req.params.id },
    select: { id: true },
  })
  if (!anyGame) {
    const { lazyFetchPlayer } = require('../services/nfl/lazyFetch')
    console.log(`[nfl] Triggering lazy-fetch for ${req.params.id}`)
    await lazyFetchPlayer(prisma, req.params.id)
  }
}
```

**Step 3: Test the integration**

Restart the backend (`npm run dev` or whatever the local pattern is), then in a browser open the depth chart for any team, click a player who would NOT be in the pool (an obscure backup). Confirm:
- First click: spinner / 5-10s delay
- Backend log shows `[lazyFetch] Loading career…`
- Drawer eventually renders with career game log
- Second click on same player: instant (data is cached)

**Step 4: Spot-check a high-profile case**

Open `/lab/prep/teams/PIT` (Aaron Rodgers is here in the 2026 fiction). Click Rodgers. Drawer should open showing his ~21-year career from 2005-2025.

**Step 5: Commit**

```bash
git add backend/src/routes/nfl.js
git commit -m "feat(nfl): wire lazy-fetch fallback into GET /api/nfl/players/:id"
```

---

## Task 11: Run the full backfill + verify legends

**Step 1: Run the full 1999-2025 backfill**

```bash
cd backend && START=1999 END=2025 node scripts/run-nfl-career-backfill.js 2>&1 | tee /tmp/nfl-backfill.log
```

Expected: 30-90 minutes wall time. Watch for season-level failures in the log — nflverse sometimes 404s for very old seasons (especially kicking/dst files). Failures are non-fatal; the script continues.

**Step 2: Verify ghost legends**

Create `backend/scripts/check-career-coverage.js`:

```js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const TARGETS = [
  { name: 'Aaron Rodgers',  expectMin: 2005, expectMaxSeasons: 21 },
  { name: 'Matthew Stafford', expectMin: 2009, expectMaxSeasons: 17 },
  { name: 'Josh Allen',     expectMin: 2018, expectMaxSeasons: 8 },
  { name: 'Tom Brady',      expectMin: 2000, expectMaxSeasons: 23 },  // pre-1999 floor he played from 2000
  { name: 'Peyton Manning', expectMin: 1999, expectMaxSeasons: 18 },
]

;(async () => {
  for (const t of TARGETS) {
    const player = await prisma.player.findFirst({
      where: { name: { contains: t.name }, gsisId: { not: null } },
      select: { id: true, name: true },
    })
    if (!player) { console.log(`✗ ${t.name}: not found`); continue }
    const seasons = await prisma.$queryRaw`
      SELECT DISTINCT g.season
      FROM nfl_player_games pg
      JOIN nfl_games g ON g.id = pg."gameId"
      WHERE pg."playerId" = ${player.id}
      ORDER BY g.season ASC
    `
    const years = seasons.map(s => Number(s.season))
    console.log(`${t.name}: ${years.length} seasons [${years[0] ?? '—'}…${years[years.length-1] ?? '—'}]`)
  }
  await prisma.$disconnect()
})()
```

Run: `cd backend && node scripts/check-career-coverage.js`
Expected:
```
Aaron Rodgers: ~20 seasons [2005…2025]
Matthew Stafford: ~16 seasons [2009…2025]
Josh Allen: 8 seasons [2018…2025]
Tom Brady: ~23 seasons [2000…2022]
Peyton Manning: ~17 seasons [1999…2015]
```

(Exact counts may vary if nflverse dropped specific seasons.)

**Step 3: Spot-check in the browser**

Open `/lab/prep/teams/PIT`, click Rodgers. Drawer's year dropdown should show ~20 seasons available. Pick 2011 (his MVP year), confirm game log loads with real data.

**Step 4: Commit**

```bash
git add backend/scripts/check-career-coverage.js /tmp/nfl-backfill.log  # only commit the script, not the log
git add backend/scripts/check-career-coverage.js
git commit -m "feat(nfl): add career-coverage verification script"
```

(If full backfill succeeded, also push so prod gets the lazy-fetch route changes.)

---

## Task 12: Documentation pass

**Files:**
- Modify: `CLAUDE.md` (Phase 7 section)
- Modify: `docs/QUEUE.md` (mark related work done if any)

**Step 1: Update CLAUDE.md Phase 7 NFL section**

Find the `**NFL Fantasy Support**` section under Phase 7. Add a bullet:

```markdown
  - [x] NFL career-data backfill (1999-2025) — pool of ~2000 fantasy-relevant players ingested with full weekly stat history. Lazy-fetch on-demand for non-pool players. New `NflPlayerDataState` model (migration 55) tracks fetch state. Spec: `docs/plans/2026-05-19-nfl-career-backfill-design.md`. Plan: `docs/plans/2026-05-19-nfl-career-backfill-plan.md`.
```

Also bump the "All migrations (1-54)" line to (1-55).

**Step 2: Add a queue cross-ref if applicable**

Search QUEUE.md for "NFL 2025 season data sync" — this work supersedes that item. Mark DONE with a cross-reference to the design doc.

**Step 3: Commit**

```bash
git add CLAUDE.md docs/QUEUE.md
git commit -m "docs(nfl): mark career backfill complete in Phase 7 + queue"
```

---

## Summary

12 tasks across 4 conceptual phases:

| Phase | Tasks | What it produces |
|-------|-------|------------------|
| **Pool computation** | 2, 3, 4 | `Set<gsisId>` of fantasy-relevant players |
| **Filtered backfill** | 1, 5, 6, 7, 8 | `NflPlayerGame` rows for pool + state tracking |
| **Lazy fetch** | 9, 10 | On-demand career fetch for anyone else |
| **Validation + docs** | 11, 12 | Verification + CLAUDE.md sync |

**Critical dependencies:**
- Task 1 (schema) blocks 7, 9, 10
- Tasks 2-4 (pool) block 8
- Tasks 5-7 block 8 (the runner)
- Task 8 must run before 11 (verification)
- Tasks 9-10 (lazy fetch) are parallel to 8; can ship independently

**Deploy strategy:**
- Schema migration deploys with first push (additive, zero risk).
- New service files are dead code until the runner script invokes them — safe to deploy.
- Lazy-fetch route change goes live with first push; for players without data it'll trigger a fetch on click.
- Full backfill runs locally first (against Railway DB via `DATABASE_URL`), then the data is live for everyone.

**Out of scope reminders (do NOT add):**
- "Show full career" toggle UI
- Bulk re-fetch admin tool
- Pre-1999 data
- DraftRecap historical integration
