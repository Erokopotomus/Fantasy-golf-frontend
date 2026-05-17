# Manager Intelligence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship the backward-looking characteristic extraction pipeline that turns imported league history into 19 bias-vocabulary-aligned characteristics per user, stored in a private admin-only data store with a 3-page admin observability dashboard.

**Architecture:** New `ManagerCharacteristic` table (one row per user×characteristic) + nightly-aggregated `CharacteristicAggregate` table for fast Library queries. Extraction orchestrator runs per-user, dispatches to per-characteristic extractor functions (error-isolated). Triggered on import completion + owner-claim event + manual re-run from admin. Frontend gets a new `/admin/intelligence` tab inside the existing AdminDashboard with Library / Detail / User Profile pages. Confidence model: composite 0-100 score from N + consistency + effect size, with HIGH/MED/LOW labels.

**Tech Stack:** Node/Express + Prisma + PostgreSQL on Railway. React/Vite frontend. node-cron for nightly aggregation. No formal test framework — smoke-test scripts in `backend/scripts/intelligence/`.

**Reference design:** `docs/plans/2026-05-17-manager-intelligence-design.md`
**Reference vocab:** `docs/CLUTCH_DECISION_CAPTURE_SPEC.md` v3 — Year 1 forward decision capture, this plan is its backward twin.

---

## Phase 1 — Schema + storage foundations

### Task 1: Schema migration — ManagerCharacteristic + CharacteristicAggregate

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/53_manager_intelligence/migration.sql`

**Step 1: Add ManagerCharacteristic model**

In schema.prisma, after the existing analytics models (search for `// ============ ANALYTICS`), add:

```prisma
model ManagerCharacteristic {
  id                  String   @id @default(cuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  characteristicType  String   @db.VarChar(50)
  value               Json
  sampleSize          Int
  consistencyPct      Float
  effectSize          Float
  confidenceScore     Float
  confidenceLabel     String   @db.VarChar(10) // 'HIGH' | 'MEDIUM' | 'LOW'

  rawEvidence         Json
  sourceImportIds     String[] @default([])
  computedAt          DateTime @default(now())

  @@unique([userId, characteristicType])
  @@index([characteristicType, confidenceScore(sort: Desc)])
  @@index([userId])
  @@map("manager_characteristics")
}

model CharacteristicAggregate {
  id                    String   @id @default(cuid())
  characteristicType    String   @unique @db.VarChar(50)
  totalUsers            Int
  usersWithData         Int
  highConfidenceCount   Int      @default(0)
  medConfidenceCount    Int      @default(0)
  lowConfidenceCount    Int      @default(0)
  noDataCount           Int      @default(0)
  avgConfidenceScore    Float    @default(0)
  promoteToCoach        Boolean  @default(false)
  suppressed            Boolean  @default(false)
  thresholdsOverride    Json?    // optional per-class HIGH/MED/LOW threshold tweaks
  adminNotes            String?
  computedAt            DateTime @default(now())

  @@map("characteristic_aggregates")
}
```

**Step 2: Add back-relation on User**

Find `model User {` (line 15). Inside the relations block (search for similar `model[] @relation` lines), add:
```prisma
  managerCharacteristics ManagerCharacteristic[]
```

**Step 3: Generate migration**

```bash
cd /Users/ericsaylor/Desktop/Clutch/backend
mkdir -p prisma/migrations/53_manager_intelligence
set -a && source ./.env && set +a
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/53_manager_intelligence/migration.sql
```

**Step 4: Verify SQL is additive only**

```bash
cat prisma/migrations/53_manager_intelligence/migration.sql
```

Expected: 2 CREATE TABLE + 3 CREATE INDEX + 1 ADD CONSTRAINT (FK). No DROP, no NOT NULL backfill.

**Step 5: prisma generate + commit**

```bash
npx prisma generate
cd /Users/ericsaylor/Desktop/Clutch
git add backend/prisma/schema.prisma backend/prisma/migrations/53_manager_intelligence/
git commit -m "feat(intelligence): schema for ManagerCharacteristic + CharacteristicAggregate"
```

---

### Task 2: Confidence scoring helper

**Files:**
- Create: `backend/src/services/intelligence/confidence.js`
- Create: `backend/scripts/intelligence/test-confidence.js`

**Step 1: Implement scoring**

`backend/src/services/intelligence/confidence.js`:
```js
/**
 * Composite confidence score 0-100 from three components:
 *   N (sample size): more observations = more reliable
 *   consistency (0-1): higher = pattern holds more often
 *   effectSize (standardized): higher absolute value = stronger signal vs baseline
 *
 * Designed to be tunable from the admin via thresholdsOverride.
 */

const DEFAULT_THRESHOLDS = {
  highMinN: 5,
  highMinConsistency: 0.80,
  medMinN: 3,
  medMinConsistency: 0.60,
}

function sampleSizeWeight(n) {
  // 0 at N=0, 0.5 at N=3, 0.9 at N=10, ~1 at N=20+
  if (n <= 0) return 0
  return 1 - Math.exp(-n / 5)
}

function consistencyWeight(pct) {
  // pct in [0, 1]; raw input * mild boost above 0.5
  if (pct <= 0) return 0
  if (pct >= 1) return 1
  // S-curve favoring high consistency
  return Math.pow(pct, 1.5)
}

function effectSizeWeight(effect) {
  // Diminishing returns. effect of 0 = 0 weight, effect of 1.0 std dev = 0.63, effect of 2.0 = 0.86
  return 1 - Math.exp(-Math.abs(effect))
}

function computeConfidenceScore({ sampleSize, consistencyPct, effectSize }) {
  const c = consistencyPct > 1 ? consistencyPct / 100 : consistencyPct
  const score = sampleSizeWeight(sampleSize) * consistencyWeight(c) * effectSizeWeight(effectSize) * 100
  return Math.round(score * 10) / 10 // 1 decimal
}

function computeLabel({ sampleSize, consistencyPct }, thresholds = DEFAULT_THRESHOLDS) {
  const c = consistencyPct > 1 ? consistencyPct / 100 : consistencyPct
  if (sampleSize >= thresholds.highMinN && c >= thresholds.highMinConsistency) return 'HIGH'
  if (sampleSize >= thresholds.medMinN && c >= thresholds.medMinConsistency) return 'MEDIUM'
  return 'LOW'
}

module.exports = { computeConfidenceScore, computeLabel, DEFAULT_THRESHOLDS }
```

**Step 2: Smoke test**

`backend/scripts/intelligence/test-confidence.js`:
```js
const { computeConfidenceScore, computeLabel } = require('../../src/services/intelligence/confidence')

// HIGH case
const high = { sampleSize: 10, consistencyPct: 0.9, effectSize: 1.5 }
const highScore = computeConfidenceScore(high)
const highLabel = computeLabel(high)
console.log('HIGH:', highScore, highLabel)
if (highLabel !== 'HIGH') throw new Error(`expected HIGH, got ${highLabel}`)
if (highScore < 60) throw new Error(`expected HIGH score > 60, got ${highScore}`)

// MEDIUM case
const med = { sampleSize: 4, consistencyPct: 0.65, effectSize: 0.8 }
const medLabel = computeLabel(med)
console.log('MED:', computeConfidenceScore(med), medLabel)
if (medLabel !== 'MEDIUM') throw new Error(`expected MEDIUM, got ${medLabel}`)

// LOW case
const low = { sampleSize: 2, consistencyPct: 0.5, effectSize: 0.3 }
const lowLabel = computeLabel(low)
console.log('LOW:', computeConfidenceScore(low), lowLabel)
if (lowLabel !== 'LOW') throw new Error(`expected LOW, got ${lowLabel}`)

// Edge: consistency given as percentage 0-100 instead of 0-1
const pct = computeConfidenceScore({ sampleSize: 10, consistencyPct: 90, effectSize: 1.5 })
const dec = computeConfidenceScore({ sampleSize: 10, consistencyPct: 0.9, effectSize: 1.5 })
if (Math.abs(pct - dec) > 0.5) throw new Error(`percentage vs decimal mismatch: ${pct} vs ${dec}`)

console.log('✓ confidence helpers passed')
```

```bash
mkdir -p backend/scripts/intelligence
node backend/scripts/intelligence/test-confidence.js
```

**Step 3: Commit**

```bash
git add backend/src/services/intelligence/confidence.js backend/scripts/intelligence/test-confidence.js
git commit -m "feat(intelligence): composite confidence scoring + HIGH/MED/LOW labels"
```

---

### Task 3: Extractor orchestrator skeleton

**Files:**
- Create: `backend/src/services/intelligence/extractor.js`

**Step 1: Implement orchestrator**

`backend/src/services/intelligence/extractor.js`:
```js
const prisma = require('../../lib/prisma')
const { computeConfidenceScore, computeLabel } = require('./confidence')

/**
 * Registry of extractor functions. Each entry:
 *   type: characteristicType string
 *   fn: async (userId, prisma) => { value, sampleSize, consistencyPct, effectSize, rawEvidence, sourceImportIds }
 *       or null if no data
 *
 * Populated by per-characteristic modules (Tasks 4-10).
 */
const EXTRACTORS = []

function registerExtractor(type, fn) {
  EXTRACTORS.push({ type, fn })
}

/**
 * Run all registered extractors for one user. Errors per extractor are
 * isolated — one failure doesn't poison the rest.
 *
 * Returns { ok: [...], failed: [{type, error}], skipped: [{type, reason}] }
 */
async function runForUser(userId, { db = prisma } = {}) {
  const ok = []
  const failed = []
  const skipped = []

  for (const { type, fn } of EXTRACTORS) {
    try {
      const result = await fn(userId, db)
      if (!result) {
        skipped.push({ type, reason: 'no data' })
        continue
      }
      const score = computeConfidenceScore(result)
      const label = computeLabel(result)
      await db.managerCharacteristic.upsert({
        where: { userId_characteristicType: { userId, characteristicType: type } },
        create: {
          userId,
          characteristicType: type,
          value: result.value,
          sampleSize: result.sampleSize,
          consistencyPct: result.consistencyPct,
          effectSize: result.effectSize,
          confidenceScore: score,
          confidenceLabel: label,
          rawEvidence: result.rawEvidence || {},
          sourceImportIds: result.sourceImportIds || [],
        },
        update: {
          value: result.value,
          sampleSize: result.sampleSize,
          consistencyPct: result.consistencyPct,
          effectSize: result.effectSize,
          confidenceScore: score,
          confidenceLabel: label,
          rawEvidence: result.rawEvidence || {},
          sourceImportIds: result.sourceImportIds || [],
          computedAt: new Date(),
        },
      })
      ok.push({ type, score, label })
    } catch (e) {
      console.error(`[intelligence] extractor ${type} failed for user ${userId}:`, e.message)
      failed.push({ type, error: e.message })
    }
  }

  return { ok, failed, skipped }
}

module.exports = { runForUser, registerExtractor, EXTRACTORS }
```

**Step 2: Syntax check + commit**

```bash
node --check backend/src/services/intelligence/extractor.js
git add backend/src/services/intelligence/extractor.js
git commit -m "feat(intelligence): extractor orchestrator with per-class error isolation"
```

---

## Phase 2 — Characteristic extractors

Each extractor task creates one file under `backend/src/services/intelligence/extractors/` that:
1. Reads imported data via Prisma (HistoricalSeason.draftData / transactions / etc.)
2. Computes `{ value, sampleSize, consistencyPct, effectSize, rawEvidence, sourceImportIds }`
3. Returns `null` when no data exists for the user
4. Calls `registerExtractor(type, fn)` at module bottom
5. Module is `require()`d in extractor index file so registration happens at boot

### Task 4: Draft data parser + Pick Quality extractors

**Files:**
- Create: `backend/src/services/intelligence/lib/draftPickParser.js`
- Create: `backend/src/services/intelligence/extractors/pickQuality.js`
- Create: `backend/scripts/intelligence/test-pick-quality.js`

**Background:** `HistoricalSeason.draftData` is a JSON blob with platform-specific shape. Sleeper shape (verified at `backend/src/services/sleeperImport.js:264`):
```js
{ type, rounds, picks: [{ round, pick, rosterId, playerId, playerName, position, amount, isKeeper, ownerName, metadata }] }
```
ESPN, Yahoo, Fantrax, MFL have similar `picks[]` shapes — verify before writing the parser by reading their import services.

**Note on ADP:** `pick` (overall pick number) is the actual draft position. ADP at time of pick is generally NOT stored — we'd need an external ADP snapshot. **For v1, compute `pickQuality` using the player's CURRENT ADP** from the Player table OR skip if no ADP data. Note this caveat in `rawEvidence.adpSource`.

**Step 1: Implement `draftPickParser.js`**

```js
const prisma = require('../../../lib/prisma')

/**
 * Pull all DraftPick-equivalent records for a user across all their imported leagues.
 * Returns array of normalized picks:
 *   { round, pick, playerId, playerName, position, isAuction, amount, leagueId, seasonYear, importId }
 */
async function getDraftPicksForUser(userId, db = prisma) {
  const seasons = await db.historicalSeason.findMany({
    where: { ownerUserId: userId, draftData: { not: null } },
    select: { id: true, leagueId: true, seasonYear: true, importId: true, draftData: true, ownerName: true },
  })

  const picks = []
  for (const s of seasons) {
    const data = s.draftData
    if (!data || !Array.isArray(data.picks)) continue
    // Filter to this user's picks (ownerName must match the historical row's ownerName)
    const userPicks = data.picks.filter(p =>
      p.ownerName && s.ownerName && p.ownerName === s.ownerName
    )
    for (const p of userPicks) {
      picks.push({
        round: p.round,
        pick: p.pick,
        playerId: p.playerId,
        playerName: p.playerName,
        position: p.position,
        isAuction: data.type === 'auction',
        amount: p.amount,
        leagueId: s.leagueId,
        seasonYear: s.seasonYear,
        importId: s.importId,
      })
    }
  }
  return picks
}

/**
 * Compute pickQuality for a snake pick using current ADP.
 * Mirrors the forward server-side computation in decision-capture spec:
 *   ≥+10 spot delta = STEAL
 *   +3 to +9 = VALUE
 *   ±2 = PAR
 *   ≤-3 = REACH
 */
async function classifyPick(pick, db = prisma) {
  if (pick.isAuction) return null // auction picks use different math; handled separately
  if (!pick.playerId) return null

  const player = await db.player.findFirst({
    where: { OR: [{ id: pick.playerId }, { externalId: pick.playerId }] },
    select: { adp: true },
  })
  if (!player || player.adp == null) return null

  const delta = player.adp - pick.pick // positive = picked LATER than ADP (good value)
  if (delta >= 10) return 'STEAL'
  if (delta >= 3) return 'VALUE'
  if (delta >= -2) return 'PAR'
  return 'REACH'
}

module.exports = { getDraftPicksForUser, classifyPick }
```

**Step 2: Implement four extractors in one file**

`backend/src/services/intelligence/extractors/pickQuality.js`:
```js
const { registerExtractor } = require('../extractor')
const { getDraftPicksForUser, classifyPick } = require('../lib/draftPickParser')

async function classifyAllPicks(userId, db) {
  const picks = await getDraftPicksForUser(userId, db)
  const snakePicks = picks.filter(p => !p.isAuction)
  if (snakePicks.length === 0) return { picks: [], classifications: [] }
  const classifications = await Promise.all(snakePicks.map(p => classifyPick(p, db)))
  // pair each pick with its classification, dropping ones we couldn't classify
  const paired = snakePicks
    .map((p, i) => ({ pick: p, classification: classifications[i] }))
    .filter(c => c.classification != null)
  return { picks: paired, classifications: paired.map(c => c.classification) }
}

function buildExtractor(label) {
  return async function (userId, db) {
    const { picks, classifications } = await classifyAllPicks(userId, db)
    if (classifications.length === 0) return null
    const matches = classifications.filter(c => c === label).length
    const pct = matches / classifications.length
    // Baseline assumption: each class is ~25% of picks. effectSize = (observed - 0.25) / sqrt(0.25 * 0.75 / N)
    // for proportion difference test, but simpler: effect = |obs - 0.25| / 0.43
    const effectSize = Math.abs(pct - 0.25) / 0.43
    return {
      value: { rate: pct, count: matches, total: classifications.length },
      sampleSize: classifications.length,
      consistencyPct: pct, // for these characteristics, "rate" IS the consistency
      effectSize,
      rawEvidence: {
        sample: picks.slice(0, 20).map(c => ({
          pick: c.pick.pick,
          round: c.pick.round,
          playerName: c.pick.playerName,
          classification: c.classification,
          leagueId: c.pick.leagueId,
          seasonYear: c.pick.seasonYear,
        })),
        adpSource: 'current_player_adp', // caveat: not point-in-time ADP
      },
      sourceImportIds: [...new Set(picks.map(c => c.pick.importId).filter(Boolean))],
    }
  }
}

registerExtractor('pick_reach_rate', buildExtractor('REACH'))
registerExtractor('pick_steal_rate', buildExtractor('STEAL'))
registerExtractor('pick_par_rate', buildExtractor('PAR'))
registerExtractor('pick_value_rate', buildExtractor('VALUE'))

module.exports = {}
```

**Step 3: Smoke test against a seeded user (or skip-on-missing)**

`backend/scripts/intelligence/test-pick-quality.js`:
```js
const prisma = require('../../src/lib/prisma')
require('../../src/services/intelligence/extractors/pickQuality')
const { runForUser } = require('../../src/services/intelligence/extractor')

;(async () => {
  // Find a user with imported draft history
  const candidate = await prisma.historicalSeason.findFirst({
    where: { ownerUserId: { not: null }, draftData: { not: null } },
    select: { ownerUserId: true },
  })
  if (!candidate) {
    console.log('No imported user found; skip smoke test.')
    process.exit(0)
  }
  const userId = candidate.ownerUserId
  console.log('Running pick quality for user:', userId)
  const result = await runForUser(userId)
  console.log('Result:', JSON.stringify(result, null, 2))
  if (result.failed.length > 0) {
    console.error('Some extractors failed:', result.failed)
    process.exit(1)
  }
  console.log('✓ pick quality smoke passed')
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
```

```bash
node backend/scripts/intelligence/test-pick-quality.js
```

**Step 4: Commit**

```bash
git add backend/src/services/intelligence/lib/draftPickParser.js backend/src/services/intelligence/extractors/pickQuality.js backend/scripts/intelligence/test-pick-quality.js
git commit -m "feat(intelligence): pick quality extractors (reach/steal/par/value)"
```

---

### Task 5: Positional extractors

**Files:**
- Create: `backend/src/services/intelligence/extractors/positional.js`

Build 2 extractors using `getDraftPicksForUser`:

- `r1_position_distribution` — `value: { RB: 0.4, WR: 0.3, QB: 0.2, Other: 0.1 }`. Sample size = number of seasons with R1 picks. Consistency = max frequency / 1 (e.g., if always RB, consistency=1.0). Effect = |max - expectedBaseline| / 0.5.
- `position_round_profile` — `value: { QB: avgRound, RB: avgRound, WR: avgRound, TE: avgRound, ... }`. Consistency = mean of per-position std-dev-stability across years (low variance = high consistency). Effect = mean absolute delta vs. league baselines.

Smoke test in `test-positional.js`. Commit:
```
feat(intelligence): positional anchoring extractors (r1 + position-by-round)
```

---

### Task 6: Auction discipline extractors

**Files:**
- Create: `backend/src/services/intelligence/extractors/auction.js`

Filter picks via `p.isAuction === true && p.amount != null`. 3 extractors:

- `auction_overpay_rate` — % auction wins where final price > player's market value (use `player.auctionValue` from board or a fallback). REACH equivalent for auctions.
- `auction_bargain_rate` — % below market value
- `auction_spend_concentration` — top-3 spend as % of total budget. Value: `{ top3Pct, top5Pct, distributionStdDev }`

Returns `null` if no auction picks in user's history. Smoke test, commit.

---

### Task 7: Trade extractors

**Files:**
- Create: `backend/src/services/intelligence/lib/transactionParser.js`
- Create: `backend/src/services/intelligence/extractors/trade.js`

`transactionParser.js`: parse `HistoricalSeason.transactions` JSON (platform-specific shape — Sleeper has `type: 'trade' | 'waiver' | 'free_agent'`). Filter to trades involving the user.

2 extractors:
- `trade_frequency` — trades per season. Sample size = number of seasons with transaction data. Consistency = how stable the rate is across seasons.
- `roster_endowment_ratio` — for end-of-season rosters, compute avg roster-tenure of drafted players vs. traded-in players. `value: { draftedAvgTenure, tradedInAvgTenure, ratio }`. Sunk cost / endowment proxy.

Returns null on platforms without transaction data (e.g., MFL minimal coverage). Smoke test, commit.

---

### Task 8: Waiver extractors

**Files:**
- Create: `backend/src/services/intelligence/extractors/waiver.js`

Reuse `transactionParser`. Filter to waiver claims.

2 extractors:
- `faab_front_load_pct` — % of FAAB spent in weeks 1-4. Sample size = total seasons with FAAB data. Returns null for non-FAAB leagues.
- `top_bid_rate` — % of claims where this user's bid was the highest. Requires multi-bid visibility (Sleeper exposes this; ESPN partial).

Smoke test, commit.

---

### Task 9: Drop extractors

**Files:**
- Create: `backend/src/services/intelligence/extractors/drop.js`

Reuse `transactionParser`. Filter to free-agent drops without a paired add (naked drops).

2 extractors:
- `naked_drop_frequency` — naked drops per season.
- `drop_lag_games` — for each drop, compute games since the player's last positive performance (sunk cost lag). Requires weekly score data; returns null if not available.

Smoke test, commit.

---

### Task 10: Outcome baseline extractors

**Files:**
- Create: `backend/src/services/intelligence/extractors/outcome.js`

Use `HistoricalSeason.finalStanding`, `playoffResult`, wins/losses/pointsFor.

4 extractors (all return data if at least 2 seasons exist):
- `finish_volatility` — std dev of `finalStanding` across seasons. Sample size = # seasons. Consistency = 1 / (1 + stdDev / leagueSize) (normalized stability metric). Effect = stdDev itself.
- `championship_rate` — `playoffResult === 'champion'` count / total seasons.
- `playoff_rate` — `playoffResult IN ('champion', 'runner_up', 'semifinal', 'eliminated')` count / total seasons.
- `career_trajectory_slope` — linear regression slope of `finalStanding` vs. seasonYear. Value: `{ slope, r2 }`. Negative slope = improving.

Smoke test, commit.

---

### Task 11: Extractor index + registration

**Files:**
- Create: `backend/src/services/intelligence/index.js`

`index.js` requires all extractor files (which auto-register via `registerExtractor`):
```js
require('./extractors/pickQuality')
require('./extractors/positional')
require('./extractors/auction')
require('./extractors/trade')
require('./extractors/waiver')
require('./extractors/drop')
require('./extractors/outcome')

const { runForUser, EXTRACTORS } = require('./extractor')

module.exports = { runForUser, EXTRACTORS }
```

Smoke check: `node -e "const i = require('./backend/src/services/intelligence'); console.log('Registered:', i.EXTRACTORS.map(e => e.type))"` should print all 19 characteristic types.

Commit:
```
feat(intelligence): extractor index — registers all 19 characteristics on import
```

---

## Phase 3 — Pipeline wiring

### Task 12: Hook into import completion + owner-claim

**Files:**
- Modify: `backend/src/services/sleeperImport.js` (end of `runFullImport`)
- Modify: `backend/src/services/espnImport.js`
- Modify: `backend/src/services/yahooImport.js`
- Modify: `backend/src/services/fantraxImport.js`
- Modify: `backend/src/services/mflImport.js`
- Modify: `backend/src/routes/imports.js` (the owner-claim route)

For each import service, after the successful return path, kick off async (don't block response):
```js
const intelligence = require('./intelligence')
// fire and forget
Promise.resolve().then(() => intelligence.runForUser(userId, prisma)).catch(e =>
  console.error('[intelligence] post-import extraction failed:', e.message)
)
```

Where `userId` is the user who triggered the import.

For owner-claim event (Vault wizard maps a User to HistoricalSeasons): find the existing claim route or service handler, add the same fire-and-forget call.

Smoke test: trigger an import via existing import flow, watch logs for `[intelligence]` lines, confirm `ManagerCharacteristic` rows appear in DB.

Commit:
```
feat(intelligence): wire extraction into all 5 import services + owner-claim
```

---

### Task 13: Aggregate cron

**Files:**
- Create: `backend/src/services/intelligence/aggregateCron.js`
- Modify: `backend/src/index.js` (register cron)

Nightly at 3 AM ET, for each registered characteristicType:
```js
async function aggregateAll() {
  for (const { type } of EXTRACTORS) {
    const rows = await prisma.managerCharacteristic.findMany({
      where: { characteristicType: type },
      select: { confidenceLabel: true, confidenceScore: true },
    })
    const totalUsers = await prisma.user.count() // baseline
    await prisma.characteristicAggregate.upsert({
      where: { characteristicType: type },
      create: {
        characteristicType: type,
        totalUsers,
        usersWithData: rows.length,
        highConfidenceCount: rows.filter(r => r.confidenceLabel === 'HIGH').length,
        medConfidenceCount: rows.filter(r => r.confidenceLabel === 'MEDIUM').length,
        lowConfidenceCount: rows.filter(r => r.confidenceLabel === 'LOW').length,
        noDataCount: totalUsers - rows.length,
        avgConfidenceScore: rows.length > 0 ? rows.reduce((a, r) => a + r.confidenceScore, 0) / rows.length : 0,
      },
      update: {
        totalUsers,
        usersWithData: rows.length,
        highConfidenceCount: rows.filter(r => r.confidenceLabel === 'HIGH').length,
        medConfidenceCount: rows.filter(r => r.confidenceLabel === 'MEDIUM').length,
        lowConfidenceCount: rows.filter(r => r.confidenceLabel === 'LOW').length,
        noDataCount: totalUsers - rows.length,
        avgConfidenceScore: rows.length > 0 ? rows.reduce((a, r) => a + r.confidenceScore, 0) / rows.length : 0,
        computedAt: new Date(),
      },
    })
  }
}
```

Register in index.js: `cron.schedule('0 3 * * *', aggregateAll, { timezone: 'America/New_York' })`

Manual trigger test: `node -e "require('./backend/src/services/intelligence/aggregateCron').aggregateAll().then(() => process.exit(0))"`

Commit:
```
feat(intelligence): nightly aggregate cron for Library page snapshots
```

---

## Phase 4 — Admin API + Frontend

### Task 14: Admin API routes

**Files:**
- Create: `backend/src/routes/adminIntelligence.js`
- Modify: `backend/src/index.js` (mount route)

Routes (all gated by `requireAdmin` middleware — find at `backend/src/middleware/requireAdmin.js`):

```
GET  /api/admin/intelligence/library
  → return all CharacteristicAggregate rows + grouping metadata

GET  /api/admin/intelligence/characteristics/:type
  → distribution histogram + top 25 users + aggregate row + admin overrides

GET  /api/admin/intelligence/users/:userId
  → all ManagerCharacteristic rows for one user + user identity

POST /api/admin/intelligence/characteristics/:type/thresholds
  Body: { highMinN, highMinConsistency, medMinN, medMinConsistency }
  → persist thresholdsOverride on the aggregate row

POST /api/admin/intelligence/characteristics/:type/toggle-promote
  Body: { enabled: boolean }
  → flip promoteToCoach flag

POST /api/admin/intelligence/characteristics/:type/toggle-suppress
  Body: { suppressed: boolean }
  → flip suppressed flag

POST /api/admin/intelligence/characteristics/:type/notes
  Body: { notes: string }
  → update adminNotes

POST /api/admin/intelligence/users/:userId/recompute
  → trigger runForUser(userId) and return result
```

Mount in `index.js` near other admin routes:
```js
app.use('/api/admin/intelligence', require('./routes/adminIntelligence'))
```

Smoke test with curl + admin JWT. Commit:
```
feat(intelligence): admin API routes for Library + Detail + User Profile + tweaks
```

---

### Task 15: Library page

**Files:**
- Modify: `frontend/src/pages/AdminDashboard.jsx` (add 'intelligence' tab)
- Create: `frontend/src/components/admin/intelligence/IntelligenceLibrary.jsx`
- Modify: `frontend/src/services/api.js` (add admin intelligence methods)

In `AdminDashboard.jsx` line 345, add 'intelligence' to the tabs array:
```js
{['users', 'leagues', 'tournaments', 'errors', 'ai', 'intelligence'].map(tab => (
```

Add tab body:
```jsx
{activeTab === 'intelligence' && <IntelligenceLibrary />}
```

`IntelligenceLibrary.jsx`: grid of characteristic cards. Each:
- Name + 1-sentence description (use a CHARACTERISTIC_META constant for descriptions)
- Coverage: "data on 847 of 1000 users"
- Mini histogram (HIGH/MED/LOW/NO_DATA as colored bars)
- Avg confidence score
- Click → navigate to `/admin/intelligence/characteristics/{type}` (Task 16)

Filter strip: sort by coverage / avg confidence / alphabetical. Filter by "promoted to coach."

Commit:
```
feat(intelligence): admin Library page — characteristic grid + distributions
```

---

### Task 16: Characteristic Detail page

**Files:**
- Create: `frontend/src/pages/admin/CharacteristicDetail.jsx`
- Modify: `frontend/src/App.jsx` (register route `/admin/intelligence/characteristics/:type`)
- Create: `frontend/src/components/admin/intelligence/ThresholdSliders.jsx`

The page:
- Header: characteristic name + description
- Full distribution histogram of `value`s across users (use recharts)
- Top 25 users table (clickable rows to User Profile)
- ThresholdSliders component (HIGH/MED/LOW N + consistency boundaries, drag to re-bucket live against the loaded distribution)
- Promote-to-coach toggle (POST to `/toggle-promote`)
- Suppress toggle
- Notes textarea (saves on blur)
- "Recompute aggregates" button (admin-only debug, manually fires the aggregate cron)

Commit:
```
feat(intelligence): admin Characteristic Detail page + threshold sliders
```

---

### Task 17: User Profile page

**Files:**
- Create: `frontend/src/pages/admin/IntelligenceUserProfile.jsx`
- Modify: `frontend/src/App.jsx` (register route `/admin/intelligence/users/:userId`)

The page:
- Identity strip: avatar, displayName, username, # of imports, # of seasons, source platforms (queried from `LeagueImport` table)
- Section per characteristic class (grouped by category — Pick Quality / Positional / Auction / Trade / Waiver / Drop / Outcome)
- Each section shows the user's row for each characteristic in that class, with:
  - Value (formatted nicely — e.g., "REACH on 38% of picks")
  - Confidence label badge
  - N / consistency / effect
  - Expandable evidence drill-down (raw 20 picks, etc. from `rawEvidence`)
- "Recompute" button to fire `runForUser` and refresh

Commit:
```
feat(intelligence): admin User Profile page with per-class drill-down
```

---

### Task 18: Layer 2 stub — promote to coach context

**Files:**
- Modify: `backend/src/services/coachingMemoryWriter.js` (or equivalent)

When `CharacteristicAggregate.promoteToCoach === true` for a characteristic class, the existing Memory Writer cron (Wed 4:30 AM) should pull current `ManagerCharacteristic` rows of that type for the targeted user and append them to the user's `CoachingMemory` document of type `draft_patterns` or `roster_patterns` (depending on which characteristic).

This is a STUB for v1. Just wire the read path:
1. Memory writer cron checks promoted characteristics
2. For each promoted characteristic + each user with HIGH/MED confidence on it
3. Append a structured fact to the user's coaching memory: `{ source: 'manager_intelligence', type, value, confidenceLabel, observedAt }`

The actual coach context assembly already reads from CoachingMemory — it picks this up automatically.

Smoke test: flip one characteristic's `promoteToCoach=true`, manually trigger memory writer, confirm a CoachingMemory row updated.

Commit:
```
feat(intelligence): Layer 2 stub — promoted characteristics feed Coach Vault
```

---

## Phase 5 — Verification + polish

### Task 19: Backfill script — re-run all extractors on existing imported users

**Files:**
- Create: `backend/scripts/intelligence/backfill-all.js`

For every user with `HistoricalSeason.ownerUserId NOT NULL`, queue `runForUser`. Print progress every 50 users.

```bash
node backend/scripts/intelligence/backfill-all.js
```

After backfill, trigger `aggregateAll()` to populate the Library cache.

Commit:
```
feat(intelligence): backfill script for existing imported users
```

---

### Task 20: E2E walkthrough + docs

- Manual e2e: import a multi-season Sleeper league as a test user → confirm extraction fires → check `/admin/intelligence` Library → drill into a characteristic → drill into the user → check evidence
- Add to CLAUDE.md: brief "Manager Intelligence" section under Phase 5
- Mark queue #202 as DONE in `docs/QUEUE.md`
- Update `docs/CLUTCH_DECISION_CAPTURE_SPEC.md` with a note that backward-looking twin is now shipped at `/admin/intelligence`

Commit:
```
docs(intelligence): mark #202 DONE + CLAUDE.md + decision spec cross-ref
```

---

## Summary

20 tasks across 5 phases. Estimated ~12-15 focused hours of work.

**Critical dependencies:**
- Task 1 (schema) blocks everything
- Tasks 2-3 (helpers + orchestrator) block Tasks 4-10 (extractors)
- Tasks 4-10 (extractors) can run in parallel — each is independent
- Task 11 (index) requires 4-10 complete
- Task 12 (import wiring) requires 11
- Task 13 (cron) requires 11
- Task 14 (API) requires 13
- Tasks 15-17 (frontend) require 14
- Task 18 (Layer 2 stub) requires 14
- Tasks 19-20 (polish) last

**Deploy strategy:** ship per-phase. Schema deploys first (additive, zero risk). Backend extractors deploy without admin UI — silent extraction starts immediately for new imports. Frontend admin UI deploys later. Layer 2 promotion stays OFF for all characteristics until Eric flips toggles.

**Out of scope (deferred):**
- Filter/Experiment cohort builder (Phase 1.5)
- Layer 3 user-facing surfaces (Year 2)
- Decision-level counterfactual extraction (Year 2)
- Per-league relative baselines
- Multi-year characteristic drift tracking
