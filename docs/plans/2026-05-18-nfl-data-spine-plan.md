# NFL Data Spine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development for same-session execution) to implement this plan task-by-task.

**Goal:** Ship the NFL data foundation that powers three pre-draft prep surfaces (Team Browser, What Changed, Daily SRS Quiz) under `/lab/prep/*` and unblocks every downstream NFL feature (MI pick-quality extractors, AI Coach NFL context, August 2026 Draft Room).

**Architecture:** Six new canonical tables under the existing Phase 4 data architecture (provider-agnostic at the consumer layer, sync services own translation). Daily Sleeper roster sync, nflverse historical stats backfill, ESPN adjusted-line-yards for unit ranks, FantasyPros for projections + ADP. Quiz engine uses templated card generators + Anki SM-2 spaced repetition.

**Tech Stack:** Node/Express + Prisma, PostgreSQL on Railway, React/Vite frontend, node-cron for schedulers. CommonJS modules, function-style backend (no TypeScript). Smoke test scripts in `backend/scripts/prep/`.

**Reference design:** `docs/plans/2026-05-18-nfl-data-spine-design.md`

**Workflow conventions** (lifted from MI build which validated cleanly):
- Each implementer subagent gets full task text + context, doesn't read the design
- Two-stage review per task: spec compliance, then code quality
- Smoke tests under `backend/scripts/prep/test-*.js` mirroring MI pattern
- Commits use `feat(prep): ...` prefix; amend during review-fix cycles
- Push after both reviews pass

---

## Phase 1 — Schema foundation

### Task 1: Schema migration — 6 new tables

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/54_nfl_data_spine/migration.sql`

**Step 1: Add models to schema.prisma**

After the existing `NflPlayerGame` model (search for `model NflPlayerGame`), add the six models defined in the design doc:
- `NflCoachingStaff`
- `NflRosterSlot`
- `NflTeamUnitRank`
- `NflPlayerProjection`
- `PrepQuizCard`
- `PrepQuizReview`
- `PrepUserSettings`

Use the exact Prisma schema in `docs/plans/2026-05-18-nfl-data-spine-design.md` Layer 1 section.

**Step 2: Add back-relations**

- In `model User { ... }`: add `prepReviews PrepQuizReview[]` and `prepSettings PrepUserSettings?`
- In `model Player { ... }`: add `nflRosterSlots NflRosterSlot[]` and `nflProjections NflPlayerProjection[]`
- In `model NflTeam { ... }`: add `coachingStaff NflCoachingStaff[]`, `rosterSlots NflRosterSlot[]`, `unitRanks NflTeamUnitRank[]`

**Step 3: Generate migration**

```bash
cd /Users/ericsaylor/Desktop/Clutch/backend
mkdir -p prisma/migrations/54_nfl_data_spine
set -a && source ./.env && set +a
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/54_nfl_data_spine/migration.sql
```

**Step 4: Verify SQL is additive only**

```bash
cat prisma/migrations/54_nfl_data_spine/migration.sql
```
Expected: 7 CREATE TABLE statements, multiple CREATE INDEX statements, multiple ADD CONSTRAINT statements (FKs). No DROP. No NOT NULL backfill.

**Step 5: Run prisma generate**

```bash
npx prisma generate
```

**Step 6: Commit**

```bash
cd /Users/ericsaylor/Desktop/Clutch
git add backend/prisma/schema.prisma backend/prisma/migrations/54_nfl_data_spine/
git commit -m "feat(prep): migration 54 — NFL data spine schema (6 new tables)"
```

Do not push yet — wait for spec review.

---

## Phase 2 — Sync services (can run in parallel as separate subagent tasks)

### Task 2: Roster sync service (Sleeper API)

**Files:**
- Create: `backend/src/services/prep/nflRosterSync.js`
- Create: `backend/scripts/prep/test-roster-sync.js`

**Goal:** Daily 4 AM ET cron writes "current" snapshot rows to `NflRosterSlot` for all 32 teams. Each row links a `playerId` (canonical Clutch `Player.id`) to a team + position + depth rank.

**Files to read for context first:**
- `backend/src/services/sleeperImport.js` — existing Sleeper API integration patterns (auth, rate limiting, pagination)
- `backend/src/services/playerMatcher.js` — `matchAndLink` function for resolving Sleeper player IDs to Clutch Player.id
- `backend/src/services/intelligence/coachPromotion.js` — fire-and-forget pattern, error handling style

**Implementation outline:**

```js
async function syncCurrentRosters({ db = prisma, force = false } = {}) {
  const teams = await db.nflTeam.findMany()
  const stats = { teamsProcessed: 0, slotsUpserted: 0, errors: [] }

  for (const team of teams) {
    try {
      // 1. Fetch team roster from Sleeper API
      const sleeperRoster = await fetchSleeperRoster(team.abbreviation)
      
      // 2. For each player, resolve to Clutch Player.id via matchAndLink
      // 3. Determine depth rank from Sleeper's depth chart endpoint
      // 4. Upsert NflRosterSlot rows with snapshotType='current'
      // 5. Soft-delete (set status='removed') any 'current' slots not present in fresh sync
      
      stats.teamsProcessed++
    } catch (e) {
      stats.errors.push({ team: team.abbreviation, error: e.message })
    }
  }
  return stats
}

module.exports = { syncCurrentRosters }
```

Use Sleeper's public API: `https://api.sleeper.app/v1/players/nfl` for the master player map, then `/v1/league/<id>/rosters` if needed for depth chart. Sleeper rate-limits at ~1000 req/min — we're well below.

For depth ranks: Sleeper exposes depth chart at `https://api.sleeper.app/v1/players/nfl/research/regular/2026` (verify endpoint at implementation time). If unavailable, fall back to ordering by Sleeper's `search_rank`.

**Smoke test (`test-roster-sync.js`):**
1. Run `syncCurrentRosters({ force: true })`
2. Verify 32 teams processed, ≥1500 roster slots upserted total (32 teams × ~50 players each)
3. Spot-check one team: query `NflRosterSlot WHERE teamAbbr='KC' AND snapshotType='current'`, verify ≥40 rows
4. Exit 0 if stats.errors.length === 0

**Commit:**
```bash
git add backend/src/services/prep/nflRosterSync.js backend/scripts/prep/test-roster-sync.js
git commit -m "feat(prep): nflRosterSync — daily Sleeper roster snapshot to NflRosterSlot"
```

---

### Task 3: Coaching staff curation + sync service

**Files:**
- Create: `backend/src/services/prep/nflCoachingSync.js`
- Create: `backend/data/prep/coaching_staff_2026.json` — manually curated seed
- Create: `backend/scripts/prep/test-coaching-sync.js`

**Goal:** Populate `NflCoachingStaff` with HC/OC/DC for each team for the active season (2026). v1 is manual curation — one JSON file per season. PFR scraping is a v2 upgrade.

**The JSON file** (commit alongside the service):

```json
{
  "season": 2026,
  "teams": {
    "BUF": { "HC": "Sean McDermott", "OC": "Joe Brady", "DC": "Bobby Babich" },
    "MIA": { "HC": "Mike McDaniel", "OC": "Frank Smith", "DC": "Anthony Weaver" },
    "NE":  { "HC": "Mike Vrabel", "OC": "Alex Van Pelt", "DC": "Terrell Williams" },
    ...
  },
  "movement": [
    { "team": "NE", "role": "HC", "name": "Mike Vrabel", "previousTeamAbbr": "TEN", "previousRole": "HC" },
    ...
  ]
}
```

**Implementation outline:**

```js
async function syncCoachingStaff({ db = prisma, season = 2026 } = {}) {
  const data = require(`../../../data/prep/coaching_staff_${season}.json`)
  const teams = await db.nflTeam.findMany()
  const teamByAbbr = Object.fromEntries(teams.map(t => [t.abbreviation, t.id]))

  for (const [abbr, roles] of Object.entries(data.teams)) {
    const teamId = teamByAbbr[abbr]
    if (!teamId) continue

    for (const [role, name] of Object.entries(roles)) {
      const movement = data.movement?.find(m => m.team === abbr && m.role === role)
      await db.nflCoachingStaff.upsert({
        where: { teamId_season_role: { teamId, season, role } },
        create: {
          teamId, season, role, name,
          previousTeamAbbr: movement?.previousTeamAbbr ?? null,
          previousRole: movement?.previousRole ?? null,
        },
        update: { name, previousTeamAbbr: movement?.previousTeamAbbr ?? null },
      })
    }
  }
}
```

Curate the JSON file by referencing PFR or NFL.com — one afternoon for 32 × 3 = 96 entries. Use real 2026 staffs.

**Smoke test:**
1. Run sync against the JSON
2. Verify 96 `NflCoachingStaff` rows for season=2026
3. Verify movement entries populated `previousTeamAbbr` on the right rows

**Commit:**
```bash
git add backend/src/services/prep/nflCoachingSync.js \
        backend/data/prep/coaching_staff_2026.json \
        backend/scripts/prep/test-coaching-sync.js
git commit -m "feat(prep): nflCoachingSync — manual JSON-driven coaching staff curation"
```

---

### Task 4: Unit rank sync service (ESPN adjusted line yards)

**Files:**
- Create: `backend/src/services/prep/nflUnitRankSync.js`
- Create: `backend/scripts/prep/test-unit-rank-sync.js`

**Goal:** Populate `NflTeamUnitRank` with OL + DL overall rank for 3 seasons (2023, 2024, 2025) from ESPN adjusted line yards.

**Source:** ESPN's adjusted line yards page (publicly accessible HTML, no API key needed). Example URL pattern: `https://www.espn.com/nfl/stats/team/_/season/2025/seasontype/2/table/offense/sort/adjustedLineYards/dir/desc`. Scrape OL and DL tables for each season.

**Implementation outline:**

```js
async function syncUnitRanks({ db = prisma, seasons = [2023, 2024, 2025] } = {}) {
  for (const season of seasons) {
    const olRanks = await fetchEspnRanks(season, 'OL') // returns [{teamAbbr, rank, score}]
    const dlRanks = await fetchEspnRanks(season, 'DL')
    
    const teams = await db.nflTeam.findMany()
    const teamByAbbr = Object.fromEntries(teams.map(t => [t.abbreviation, t.id]))
    
    for (const r of [...olRanks, ...dlRanks]) {
      const teamId = teamByAbbr[r.teamAbbr]
      if (!teamId) continue
      await db.nflTeamUnitRank.upsert({
        where: { teamId_season_unit: { teamId, season, unit: r.unit } },
        create: { teamId, season, unit: r.unit, rank: r.rank, score: r.score, source: 'espn_aly' },
        update: { rank: r.rank, score: r.score, source: 'espn_aly' },
      })
    }
  }
}
```

`fetchEspnRanks` uses `axios` + `cheerio` to scrape the HTML table. If `cheerio` isn't installed: `npm install cheerio` in backend (lightweight, no security concerns). If ESPN's page structure changes, log + skip rather than crashing.

**Smoke test:**
1. Run sync for 2023, 2024, 2025
2. Verify 192 rows total (32 teams × 2 units × 3 seasons)
3. Spot-check rank distribution: each season should have rank values 1-32 in each unit

**Commit:**
```bash
git add backend/src/services/prep/nflUnitRankSync.js backend/scripts/prep/test-unit-rank-sync.js
git commit -m "feat(prep): nflUnitRankSync — ESPN adjusted line yards backfill"
```

---

### Task 5: Projection sync (extend existing `projectionSync.js`)

**Files:**
- Modify: `backend/src/services/projectionSync.js` — add NFL-specific path
- Create: `backend/scripts/prep/test-projection-sync-nfl.js`

**Goal:** Pull 2026 NFL projections + ADP from FantasyPros free consensus endpoints. Populate `NflPlayerProjection` for ~600 fantasy-relevant players (QB/RB/WR/TE/K/DST).

**Read first:** `backend/src/services/projectionSync.js` — existing golf projection logic. Add an NFL branch.

**Source:** FantasyPros publishes free consensus rankings + projections at `https://www.fantasypros.com/nfl/rankings/consensus-cheatsheets.php` (HTML scrape) and `https://www.fantasypros.com/nfl/adp/overall.php` (ADP). Both are public.

**Implementation outline:**

```js
async function syncNflProjections({ db = prisma, season = 2026, scoringTypes = ['std', 'ppr', 'half_ppr'] } = {}) {
  for (const scoringType of scoringTypes) {
    const rows = await fetchFantasyProsConsensus(season, scoringType)
    // rows: [{ playerName, position, team, projectedPoints, positionRank, adp }]
    
    for (const r of rows) {
      const player = await resolveNflPlayerByName(r.playerName, r.team, db)
      if (!player) continue
      await db.nflPlayerProjection.upsert({
        where: { playerId_season_scoringType_source: {
          playerId: player.id, season, scoringType, source: 'fantasypros_consensus'
        }},
        create: { playerId: player.id, season, scoringType, projectedPoints: r.projectedPoints,
                  adp: r.adp, positionRank: r.positionRank, source: 'fantasypros_consensus' },
        update: { projectedPoints: r.projectedPoints, adp: r.adp, positionRank: r.positionRank },
      })
    }
  }
}
```

`resolveNflPlayerByName` uses normalized name + position + team matching (same pattern as `playerMatcher.js`). If FantasyPros lists a player not in Clutch's Player table, log + skip.

**Smoke test:**
1. Run sync for season=2026, scoringType='ppr'
2. Verify ≥400 projection rows (top fantasy-relevant players across positions)
3. Verify `adp` is populated on ≥80% of rows (top players definitely have ADP)

**Commit:**
```bash
git add backend/src/services/projectionSync.js backend/scripts/prep/test-projection-sync-nfl.js
git commit -m "feat(prep): NFL projection sync — FantasyPros consensus + ADP for 2026"
```

---

## Phase 3 — Historical backfill execution

### Task 6: Extend `nflHistoricalSync.js` to cover 2023 + 2025

**Files:**
- Modify: `backend/src/services/nflHistoricalSync.js`
- Create: `backend/scripts/prep/backfill-2023.js`
- Create: `backend/scripts/prep/backfill-2025.js`

**Goal:** Backfill `NflGame` + `NflPlayerGame` for 2023 and 2025 seasons via nflverse. 2024 already synced (per CLAUDE.md).

**Read first:** `backend/src/services/nflHistoricalSync.js` (existing function) — likely has a `syncSeason(year)` function. Verify by reading.

**Backfill scripts** are thin wrappers that call the existing function and report progress. Pattern:

```js
const { syncSeason } = require('../../src/services/nflHistoricalSync')
const t0 = Date.now()
const result = await syncSeason(2025)
console.log(`Backfilled ${result.games} games + ${result.playerGames} player-game rows in ${(Date.now() - t0) / 1000}s`)
```

**Smoke test:** Run both scripts. Verify:
- 2023: ~272 games + ~25,000 player-game rows
- 2025: ~272 games + ~25,000 player-game rows

Total backfill runtime estimated 10-20 minutes per season.

**Commit:**
```bash
git add backend/src/services/nflHistoricalSync.js \
        backend/scripts/prep/backfill-2023.js \
        backend/scripts/prep/backfill-2025.js
git commit -m "feat(prep): NFL historical backfill scripts for 2023 + 2025"
```

After commit lands, RUN both backfills against prod via Railway exec or local-with-DATABASE_URL. Capture stats in a follow-up commit's message.

---

### Task 7: Historical "end_of_2024_season" roster snapshot

**Files:**
- Create: `backend/src/services/prep/historicalRosterSync.js`
- Create: `backend/scripts/prep/backfill-2024-eos-rosters.js`

**Goal:** Populate `NflRosterSlot` with `snapshotType='end_of_2024_season'` rows — the comparison anchor for "What Changed" view.

**Source:** Reconstruct from `NflPlayerGame` (existing 2024 data). For each player who played for a team in 2024, their final game's `teamAbbr` defines their end-of-season team. Position comes from `Player.nflPosition`.

**Implementation outline:**

```js
async function backfillEndOfSeasonRosters(season, db = prisma) {
  // Get final game's team affiliation per player for the season
  const playerGames = await db.nflPlayerGame.findMany({
    where: { game: { season } },
    orderBy: { game: { week: 'desc' } },
    distinct: ['playerId'],
    include: { player: true, game: { select: { week: true } } },
  })
  
  const teams = await db.nflTeam.findMany()
  const teamByAbbr = Object.fromEntries(teams.map(t => [t.abbreviation, t.id]))
  const snapshotType = `end_of_${season}_season`
  const snapshotDate = new Date(`${season + 1}-02-15`) // post-Super-Bowl
  
  for (const pg of playerGames) {
    const teamId = teamByAbbr[pg.teamAbbr]
    if (!teamId || !pg.player.nflPosition) continue
    
    await db.nflRosterSlot.upsert({
      where: { teamId_playerId_snapshotType: { teamId, playerId: pg.playerId, snapshotType }},
      create: {
        teamId, playerId: pg.playerId, snapshotType,
        position: pg.player.nflPosition, depthRank: 99, // depth rank is fuzzy historically; use stats-derived rank in v2
        status: 'active', snapshotDate,
      },
      update: {},
    })
  }
}
```

Note: depth rank for historical snapshots is fuzzy — we don't have point-in-time depth chart records. Default to 99 ("unknown") for v1. The "What Changed" view doesn't need precise depth rank from last season; it just needs "who was on this team."

**Smoke test:**
1. Run backfill for 2024
2. Verify ≥1500 rows with snapshotType='end_of_2024_season'
3. Spot-check Bears 2024 roster — verify Caleb Williams appears

**Commit:**
```bash
git add backend/src/services/prep/historicalRosterSync.js \
        backend/scripts/prep/backfill-2024-eos-rosters.js
git commit -m "feat(prep): historical end-of-2024-season roster snapshot from NflPlayerGame"
```

---

## Phase 4 — Quiz engine

### Task 8: Quiz template library + card generator

**Files:**
- Create: `backend/src/services/prep/quizTemplates.js`
- Create: `backend/src/services/prep/quizCardGenerator.js`
- Create: `backend/scripts/prep/test-card-generation.js`

**Goal:** 10-12 templates that iterate the data spine to produce `PrepQuizCard` rows. Re-run nightly; new cards added, stale cards flipped `isActive=false`.

**Template module (`quizTemplates.js`):**

```js
const TEMPLATES = [
  {
    name: 'team_hc',
    category: 'coaching',
    difficulty: 1,
    async generate(spine, db) {
      const cards = []
      for (const team of spine.teams) {
        const hc = spine.coachingByTeam[team.id]?.find(c => c.role === 'HC')
        if (!hc) continue
        const distractors = pickDistractors(spine.allHCs, hc.name, 3, { excludeSameDiv: false })
        cards.push({
          templateName: 'team_hc',
          subject: team.abbreviation,
          question: `Who is the ${team.city} ${team.name}'s head coach?`,
          answer: hc.name,
          distractors,
          difficulty: 1,
          category: 'coaching',
          meta: { teamAbbr: team.abbreviation, role: 'HC' },
        })
      }
      return cards
    }
  },
  // ... 9-11 more templates
]
```

Implement all templates listed in the design doc Quiz Template Library section. Each template is a function returning an array of card objects.

**Card generator (`quizCardGenerator.js`):**

```js
async function regenerateAllCards({ db = prisma } = {}) {
  const spine = await loadSpineSnapshot(db)
  const allNewCards = []
  
  for (const template of TEMPLATES) {
    try {
      const cards = await template.generate(spine, db)
      allNewCards.push(...cards)
    } catch (e) {
      console.error(`[prep card-gen] template ${template.name} failed:`, e.message)
    }
  }
  
  // Upsert by (templateName, subject) — same template + subject = same card slot
  // Mark cards no longer being generated as isActive=false
  const generatedKeys = new Set(allNewCards.map(c => `${c.templateName}::${c.subject}`))
  
  for (const card of allNewCards) {
    await db.prepQuizCard.upsert({
      where: { templateName_subject: { templateName: card.templateName, subject: card.subject }},
      create: { ...card, isActive: true },
      update: { ...card, isActive: true, generatedAt: new Date() },
    })
  }
  
  // Deactivate cards not regenerated this run
  const allCurrent = await db.prepQuizCard.findMany({ where: { isActive: true }, select: { id: true, templateName: true, subject: true }})
  for (const c of allCurrent) {
    if (!generatedKeys.has(`${c.templateName}::${c.subject}`)) {
      await db.prepQuizCard.update({ where: { id: c.id }, data: { isActive: false }})
    }
  }
  
  return { totalActive: allNewCards.length, regenerated: allNewCards.length }
}
```

Add a `@@unique([templateName, subject])` to `PrepQuizCard` if not present. Adjust migration accordingly OR add via the next migration if needed.

**Smoke test:**
1. Run regenerateAllCards
2. Verify ≥300 cards generated
3. Verify all 32 teams have at least 1 `team_hc` card
4. Spot-check distractors: each card has 3 wrong-answer strings

**Commit:**
```bash
git add backend/src/services/prep/quizTemplates.js \
        backend/src/services/prep/quizCardGenerator.js \
        backend/scripts/prep/test-card-generation.js
git commit -m "feat(prep): quiz template library + card generator (10-12 templates)"
```

---

### Task 9: SM-2 scheduler

**Files:**
- Create: `backend/src/services/prep/sm2.js`
- Create: `backend/scripts/prep/test-sm2.js`

**Goal:** Pure-function SM-2 implementation. Given current review state + user response, return new review state.

**Implementation:**

```js
// SM-2 reference: https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm
// Quality: 0=Again, 1=Hard, 2=Good, 3=Easy (mapped from 4-button UI)

const MIN_EASE = 1.3
const MAX_EASE = 2.5

function scheduleNext(state, quality) {
  const { easeFactor, interval, repetitions } = state
  let nextEase = easeFactor
  let nextInterval = interval
  let nextReps = repetitions

  if (quality === 0) { // Again — wrong
    nextInterval = 1
    nextEase = Math.max(MIN_EASE, easeFactor - 0.20)
    nextReps = 0
  } else if (quality === 1) { // Hard
    nextInterval = Math.max(1, Math.round(interval * 1.2))
    nextEase = Math.max(MIN_EASE, easeFactor - 0.15)
    nextReps = repetitions + 1
  } else if (quality === 2) { // Good
    nextInterval = Math.max(1, Math.round(interval * easeFactor))
    nextReps = repetitions + 1
  } else if (quality === 3) { // Easy
    nextInterval = Math.max(1, Math.round(interval * easeFactor * 1.3))
    nextEase = Math.min(MAX_EASE, easeFactor + 0.15)
    nextReps = repetitions + 1
  }

  const dueDate = new Date(Date.now() + nextInterval * 86400000)
  return { easeFactor: nextEase, interval: nextInterval, repetitions: nextReps, dueDate }
}

module.exports = { scheduleNext, MIN_EASE, MAX_EASE }
```

**Smoke test (`test-sm2.js`):** Unit-test-style script that exercises each quality level:
- Start state: ease=2.5, interval=1, reps=0
- Quality 2 (Good) → interval=3, reps=1, ease=2.5
- Quality 0 (Again) on second card → interval=1, reps=0, ease=2.3
- Quality 3 (Easy) when ease at max → ease stays at 2.5 (ceiling)
- Quality 0 when ease at min → ease stays at 1.3 (floor)

Throw on assertion failures. Exit 0 if all pass.

**Commit:**
```bash
git add backend/src/services/prep/sm2.js backend/scripts/prep/test-sm2.js
git commit -m "feat(prep): SM-2 spaced repetition scheduler (pure function)"
```

---

### Task 10: Daily quiz session service + admin force-refresh

**Files:**
- Create: `backend/src/services/prep/quizSession.js`
- Create: `backend/scripts/prep/test-quiz-session.js`

**Goal:** Two functions that drive the daily quiz API:
1. `getDueCardsForUser(userId, { limit, focusMode })` — returns next N cards due today, filtered by user's focus mode
2. `recordReview(userId, cardId, quality)` — runs SM-2, upserts PrepQuizReview, returns next state

**Implementation outline:**

```js
async function getDueCardsForUser(userId, { db = prisma } = {}) {
  const settings = await db.prepUserSettings.findUnique({ where: { userId }})
  const limit = settings?.cardsPerDay ?? 10
  const focusMode = settings?.focusMode ?? null
  
  // Get teams matching focus mode (or all 32)
  const teamFilter = buildTeamFilterFromFocusMode(focusMode) // returns { in: ['BUF', 'MIA', ...] } or null
  
  // Get due cards: not yet reviewed by user, OR dueDate <= now
  const cards = await db.prepQuizCard.findMany({
    where: {
      isActive: true,
      // Filter by team subject matching focus
      subject: teamFilter ?? undefined,
      // No existing review OR review is due
      OR: [
        { reviews: { none: { userId } } },
        { reviews: { some: { userId, dueDate: { lte: new Date() } } } }
      ]
    },
    include: { reviews: { where: { userId }, take: 1 }},
    take: limit,
    orderBy: [{ reviews: { _count: 'asc' } }] // prioritize never-seen
  })
  return cards
}

async function recordReview(userId, cardId, quality, { db = prisma } = {}) {
  const existing = await db.prepQuizReview.findUnique({
    where: { userId_cardId: { userId, cardId }}
  })
  const state = existing ?? { easeFactor: 2.5, interval: 1, repetitions: 0 }
  const next = scheduleNext(state, quality)
  
  return db.prepQuizReview.upsert({
    where: { userId_cardId: { userId, cardId }},
    create: { userId, cardId, ...next, lastReviewed: new Date(),
              correctCount: quality > 0 ? 1 : 0, incorrectCount: quality === 0 ? 1 : 0 },
    update: { ...next, lastReviewed: new Date(),
              correctCount: existing.correctCount + (quality > 0 ? 1 : 0),
              incorrectCount: existing.incorrectCount + (quality === 0 ? 1 : 0) },
  })
}
```

Streak tracking: update in `recordReview` — if first review of the day and `lastQuizDate === yesterday`, increment streak; if `lastQuizDate < yesterday`, reset.

**Smoke test:**
1. Pick a test user (Eric)
2. Get due cards — expect ≥1 since no reviews exist
3. Record a review (quality=2) for one card
4. Verify PrepQuizReview row created with interval=3, dueDate ≈ 3 days from now
5. Get due cards again — verify the just-reviewed card is excluded (dueDate in future)

**Commit:**
```bash
git add backend/src/services/prep/quizSession.js backend/scripts/prep/test-quiz-session.js
git commit -m "feat(prep): quizSession — due-card query + review recording w/ SM-2"
```

---

### Task 11: Card regeneration cron + spine sync cron

**Files:**
- Modify: `backend/src/index.js`

**Goal:** Wire scheduled jobs into the cron registry.

**Crons to add (verify timezone matches existing crons — `America/New_York`):**

```js
// 4 AM ET daily — refresh current roster snapshot from Sleeper
cron.schedule('0 4 * * *', async () => {
  console.log('[prep cron] starting daily roster sync')
  try {
    const { syncCurrentRosters } = require('./services/prep/nflRosterSync')
    const result = await syncCurrentRosters()
    console.log(`[prep cron] roster sync done: ${result.teamsProcessed} teams, ${result.slotsUpserted} slots`)
  } catch (e) { console.error('[prep cron] roster sync failed:', e.message) }
}, { timezone: 'America/New_York' })

// 4:30 AM ET daily — regenerate quiz cards from current spine
cron.schedule('30 4 * * *', async () => {
  console.log('[prep cron] starting card regeneration')
  try {
    const { regenerateAllCards } = require('./services/prep/quizCardGenerator')
    const result = await regenerateAllCards()
    console.log(`[prep cron] card regen done: ${result.totalActive} active cards`)
  } catch (e) { console.error('[prep cron] card regen failed:', e.message) }
}, { timezone: 'America/New_York' })

// Weekly Tuesday 5 AM ET — refresh unit ranks during season
cron.schedule('0 5 * * 2', async () => {
  // ... call nflUnitRankSync with current season
}, { timezone: 'America/New_York' })

// Daily 5 AM ET Apr-Aug — refresh projections (pre-draft window)
cron.schedule('0 5 * 4-8 *', async () => {
  // ... call syncNflProjections for season=current+1 if before season starts
}, { timezone: 'America/New_York' })
```

**Smoke test:** Manual invocation via `node -e` of each cron handler. Verify each runs cleanly.

**Commit:**
```bash
git add backend/src/index.js
git commit -m "feat(prep): register 4 cron schedules (roster, cards, ranks, projections)"
```

---

## Phase 5 — API + Frontend

### Task 12: API routes

**Files:**
- Create: `backend/src/routes/prep.js`
- Modify: `backend/src/index.js` (mount route at `/api/prep`)

**Goal:** REST endpoints for the three UI views.

**Routes (all behind `authenticate` middleware):**

```
GET  /api/prep/teams                — list of all 32 teams with summary stats
GET  /api/prep/teams/:abbr          — full team detail (coaching + ranks + roster + 2025 stats)
GET  /api/prep/changes              — what-changed payload (coaching, FA, rookies, OL/DL movers)
GET  /api/prep/quiz/due             — next N due cards for authenticated user (respects focusMode)
POST /api/prep/quiz/review          — body: { cardId, quality }, records SM-2 update
GET  /api/prep/quiz/settings        — current user's PrepUserSettings
PATCH /api/prep/quiz/settings       — body: { focusMode?, cardsPerDay? }, upserts settings
POST /api/prep/admin/force-refresh  — admin-only, triggers all syncs synchronously
```

**Implementation pattern** (follow `backend/src/routes/adminIntelligence.js` style — try/catch per route, consistent error logging):

```js
const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const prisma = require('../lib/prisma')
const { getDueCardsForUser, recordReview } = require('../services/prep/quizSession')

router.use(authenticate)

router.get('/teams', async (req, res) => {
  try {
    const teams = await prisma.nflTeam.findMany({ orderBy: { abbreviation: 'asc' }})
    res.json({ teams })
  } catch (e) {
    console.error('[prep] GET /teams failed:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ... etc
```

**Smoke test:** Manual curl with admin JWT. Verify shapes match design doc.

**Commit:**
```bash
git add backend/src/routes/prep.js backend/src/index.js
git commit -m "feat(prep): API routes — /api/prep/* (teams + changes + quiz + admin)"
```

---

### Task 13: Lab Prep hub overview page

**Files:**
- Create: `frontend/src/pages/lab/PrepHub.jsx`
- Modify: `frontend/src/App.jsx` (register route `/lab/prep`)
- Modify: `frontend/src/services/api.js` (add `prep` namespace with methods)

**Goal:** Landing page for `/lab/prep`. Three cards (Team Browser / What Changed / Daily Quiz), each showing summary status.

**Layout:**
- Lab-style hero banner ("NFL Pre-Draft Prep")
- Grid of 3 cards:
  - **Browse Teams** — "All 32 teams, depth charts, coaching, ranks"
  - **What Changed** — "X coaching moves · Y headline FA · Z rookies" (counts pulled from /api/prep/changes summary)
  - **Daily Quiz** — "N cards due today · Streak: X days"
- Bottom: link to settings (focus mode picker)

**Smoke check:** `cd frontend && npm run build` clean.

**Commit:**
```bash
git add frontend/src/pages/lab/PrepHub.jsx frontend/src/App.jsx frontend/src/services/api.js
git commit -m "feat(prep): Lab Prep hub page at /lab/prep with 3 entry cards"
```

---

### Task 14: Team Browser page

**Files:**
- Create: `frontend/src/pages/lab/PrepTeamBrowser.jsx`
- Create: `frontend/src/components/lab/prep/CoachingPanel.jsx`
- Create: `frontend/src/components/lab/prep/UnitRankPanel.jsx`
- Create: `frontend/src/components/lab/prep/DepthChartGrid.jsx`
- Modify: `frontend/src/App.jsx` (register `/lab/prep/teams/:abbr`)

**Goal:** One page per team. Header strip + coaching panel + rank panel + depth chart grid + "Browse all 32" navigation.

See design doc Team Browser section for exact layout. Use existing `PlayerDrawer` for player clicks.

Brand tokens: `font-display`, `font-mono`, `bg-[var(--surface)]`. Match `IntelligenceUserProfile.jsx` and `IntelligenceLibrary.jsx` styling.

**Smoke check:** `npm run build` clean. Sample: visit `/lab/prep/teams/KC` → renders coaching, ranks, depth chart.

**Commit:**
```bash
git add frontend/src/pages/lab/PrepTeamBrowser.jsx \
        frontend/src/components/lab/prep/CoachingPanel.jsx \
        frontend/src/components/lab/prep/UnitRankPanel.jsx \
        frontend/src/components/lab/prep/DepthChartGrid.jsx \
        frontend/src/App.jsx
git commit -m "feat(prep): Team Browser page — coaching/ranks/depth chart per team"
```

---

### Task 15: What Changed page

**Files:**
- Create: `frontend/src/pages/lab/PrepWhatChanged.jsx`
- Create: `frontend/src/components/lab/prep/WhatChangedAccordion.jsx`
- Modify: `frontend/src/App.jsx` (register `/lab/prep/changes`)

**Goal:** Accordion sections (coaching changes, rookie spotlights, FA movement, OL/DL rank movers) with conference/division filter strip at top.

See design doc What Changed section. Sections default to expanded. Filter strip narrows visible items.

**Smoke check:** `npm run build` clean.

**Commit:**
```bash
git add frontend/src/pages/lab/PrepWhatChanged.jsx \
        frontend/src/components/lab/prep/WhatChangedAccordion.jsx \
        frontend/src/App.jsx
git commit -m "feat(prep): What Changed page — coaching/FA/rookies/rank movers"
```

---

### Task 16: Daily Quiz page

**Files:**
- Create: `frontend/src/pages/lab/PrepQuiz.jsx`
- Create: `frontend/src/components/lab/prep/QuizCard.jsx`
- Create: `frontend/src/components/lab/prep/QuizSettings.jsx`
- Modify: `frontend/src/App.jsx` (register `/lab/prep/quiz`)

**Goal:** Single-card-at-a-time quiz UI with 4-button difficulty rating after answer reveal. Streak header. Settings drawer.

See design doc Daily Quiz section. SM-2 difficulty buttons map to quality 0/1/2/3 → backend POST `/api/prep/quiz/review`.

Empty state ("Nothing due today — come back tomorrow") + completion screen ("Day complete. Streak: X.")

**Smoke check:** `npm run build` clean.

**Commit:**
```bash
git add frontend/src/pages/lab/PrepQuiz.jsx \
        frontend/src/components/lab/prep/QuizCard.jsx \
        frontend/src/components/lab/prep/QuizSettings.jsx \
        frontend/src/App.jsx
git commit -m "feat(prep): Daily Quiz page — single-card SM-2 review flow + settings"
```

---

## Phase 6 — Integration + polish

### Task 17: Add Prep entry to Lab navigation

**Files:**
- Modify: `frontend/src/pages/lab/DraftBoards.jsx` (or wherever the Lab nav lives)

**Goal:** Add a "Prep" pill to the Lab landing page so users discover it. Read existing Lab nav patterns first.

**Smoke check:** Build clean. Visiting `/lab` shows a Prep entry alongside existing tools.

**Commit:**
```bash
git add frontend/src/pages/lab/DraftBoards.jsx
git commit -m "feat(prep): add Prep entry to Lab landing page navigation"
```

---

### Task 18: E2E walkthrough + docs

- Manual e2e:
  1. Run all syncs (roster, coaching, ranks, projections, NFL stats backfill)
  2. Run card regeneration → expect ≥300 active cards
  3. Visit `/lab/prep` → 3 cards render
  4. Visit `/lab/prep/teams/KC` → full team data
  5. Visit `/lab/prep/changes` → accordion sections populate
  6. Visit `/lab/prep/quiz` → 10 cards available, complete one full quiz session, verify streak increments
  7. Visit `/admin/intelligence/users/<eric>` → confirm MI `pick_*_rate` extractors now produce data (since `NflPlayerProjection.adp` is populated)
- Update `CLAUDE.md` with a new Phase 5H entry covering the NFL data spine
- Mark relevant queue items DONE / cross-reference
- Add note to `docs/CLUTCH_STRATEGY_UPDATE_FEB2026.md` about prep features being live

**Commit:**
```bash
git add CLAUDE.md docs/QUEUE.md docs/CLUTCH_STRATEGY_UPDATE_FEB2026.md
git commit -m "docs(prep): NFL data spine shipped — CLAUDE.md + queue cross-refs"
```

---

## Summary

18 tasks across 6 phases. Estimated ~10-14 focused working days.

**Critical dependencies:**
- Task 1 (schema) blocks everything
- Tasks 2-5 (sync services) can run in parallel
- Tasks 6-7 (backfills) require Tasks 1, 5 complete (need schema + Player records)
- Task 8 (templates) requires Tasks 2-7 (needs spine data populated)
- Task 9 (SM-2) parallel-able with Task 8
- Task 10 (quiz session) requires Tasks 8 + 9
- Task 11 (crons) requires Tasks 2-5, 8 complete
- Task 12 (API) requires Tasks 1, 8, 10 complete
- Tasks 13-16 (UI) require Task 12 complete; 13-16 can run in parallel
- Tasks 17-18 (polish) last

**Deploy strategy:**
- Schema migration deploys first (additive, zero risk)
- Backend services + crons deploy without UI — silent data accumulation starts
- Coaching JSON gets curated before crons fire (one afternoon)
- Frontend pages deploy last; users see prep section appear in Lab
