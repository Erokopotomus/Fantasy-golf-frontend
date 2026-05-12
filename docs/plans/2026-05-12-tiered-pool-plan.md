# Tiered Golf Pool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a single-tournament tiered pick'em pool for the PGA Championship weekend — commissioner creates pool + tiers, friends enter anonymously via link, live leaderboard scores via existing Clutch infra.

**Architecture:** Standalone Pool entity (5 new Prisma models, parallel to League). Anonymous entry — `PoolEntry.userId` is nullable for future account-linkage. Reuses existing Tournament/Player/Performance/scoringService infrastructure. Two new crons (lock + score) ride alongside the existing live cron.

**Tech Stack:** Node/Express, Prisma 6, PostgreSQL on Railway, React 18 + Vite + Tailwind, Resend for email. CommonJS (`require`/`module.exports`) throughout backend.

**Design doc:** `docs/plans/2026-05-12-tiered-pool-design.md`

**Conventions for this codebase:**
- Backend: CommonJS, `const prisma = require('../lib/prisma.js')`, `const router = express.Router()`, mount in `backend/src/index.js`.
- Frontend: React function components, Tailwind classes from existing brand system (`bg-blaze`, `font-mono`, `text-slate`, etc.), API calls via `services/api.js` singleton.
- No tests / no test framework — verification via `backend/scripts/verify-*.js` against prod DB (existing pattern: see `backend/scripts/check-cadillac-live.js`).
- Schema changes: edit `backend/prisma/schema.prisma` then run `npx prisma db push --accept-data-loss` (existing Railway flow). No migration files needed.
- Commit after each task. Push at natural checkpoints (after backend done, after frontend done, after smoke test).

---

## Task 1: Add Pool schema to Prisma

**Files:**
- Modify: `backend/prisma/schema.prisma` (append at end, before existing enums)

**Step 1: Append the new models + enum to schema.prisma**

Add at the bottom of the file, before the existing `// ============ ENUMS ============` section:

```prisma
// ============ POOLS (tiered pick'em) ============

model Pool {
  id                String      @id @default(cuid())
  slug              String      @unique
  name              String
  tournamentId      String      @map("tournament_id")
  commissionerEmail String      @map("commissioner_email")
  adminToken        String      @unique @map("admin_token")
  status            PoolStatus  @default(DRAFT)
  locksAt           DateTime?   @map("locks_at")
  scoringPreset     String      @default("standard") @map("scoring_preset")
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")

  tournament        Tournament  @relation(fields: [tournamentId], references: [id])
  tiers             PoolTier[]
  entries           PoolEntry[]

  @@map("pools")
}

model PoolTier {
  id            String           @id @default(cuid())
  poolId        String           @map("pool_id")
  tierNumber    Int              @map("tier_number")
  label         String?
  picksRequired Int              @map("picks_required")

  pool          Pool             @relation(fields: [poolId], references: [id], onDelete: Cascade)
  players       PoolTierPlayer[]
  picks         PoolPick[]

  @@unique([poolId, tierNumber])
  @@map("pool_tiers")
}

model PoolTierPlayer {
  id       String   @id @default(cuid())
  tierId   String   @map("tier_id")
  playerId String   @map("player_id")

  tier     PoolTier @relation(fields: [tierId], references: [id], onDelete: Cascade)
  player   Player   @relation(fields: [playerId], references: [id])

  @@unique([tierId, playerId])
  @@map("pool_tier_players")
}

model PoolEntry {
  id                 String     @id @default(cuid())
  poolId             String     @map("pool_id")
  userId             String?    @map("user_id")
  entrantName        String     @map("entrant_name")
  entrantEmail       String     @map("entrant_email")
  teamName           String     @map("team_name")
  tiebreakerScore    Int        @map("tiebreaker_score")
  totalFantasyPoints Float      @default(0) @map("total_fantasy_points")
  submittedAt        DateTime   @default(now()) @map("submitted_at")

  pool               Pool       @relation(fields: [poolId], references: [id], onDelete: Cascade)
  user               User?      @relation(fields: [userId], references: [id])
  picks              PoolPick[]

  @@unique([poolId, teamName])
  @@map("pool_entries")
}

model PoolPick {
  id            String    @id @default(cuid())
  entryId       String    @map("entry_id")
  tierId        String    @map("tier_id")
  playerId      String    @map("player_id")
  fantasyPoints Float?    @map("fantasy_points")

  entry         PoolEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  tier          PoolTier  @relation(fields: [tierId], references: [id])
  player        Player    @relation(fields: [playerId], references: [id])

  @@unique([entryId, tierId, playerId])
  @@map("pool_picks")
}
```

Then in the existing ENUMS section, append:

```prisma
enum PoolStatus {
  DRAFT
  OPEN
  LOCKED
  COMPLETED
}
```

**Step 2: Add back-references to existing models**

Edit `Tournament` model (find `model Tournament {`), add inside the relations block:
```prisma
  pools             Pool[]
```

Edit `User` model, add:
```prisma
  poolEntries       PoolEntry[]
```

Edit `Player` model, add:
```prisma
  poolTierPlayers   PoolTierPlayer[]
  poolPicks         PoolPick[]
```

**Step 3: Push schema to prod DB**

```
cd ~/Desktop/Clutch/backend && npx prisma db push --accept-data-loss
```

Expected output: `🚀 Your database is now in sync with your Prisma schema. ✔ Generated Prisma Client`

**Step 4: Verify tables exist**

```
cd ~/Desktop/Clutch/backend && node -e "const p = require('./src/lib/prisma'); (async () => { console.log('Pool:', await p.pool.count()); console.log('PoolTier:', await p.poolTier.count()); console.log('PoolEntry:', await p.poolEntry.count()); await p.\$disconnect(); })()"
```

Expected: all counts = 0, no errors.

**Step 5: Commit**

```
git add backend/prisma/schema.prisma && git commit -m "Pool schema: 5 new models for tiered pick'em pool"
```

---

## Task 2: Slug + adminToken generators

**Files:**
- Create: `backend/src/services/poolService.js`

**Step 1: Create the service**

```js
const crypto = require('crypto')
const prisma = require('../lib/prisma')

// Slug: 6 lowercase alphanumeric chars (~36^6 ≈ 2B possibilities, fine for low collision risk).
function randomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

async function generateUniqueSlug(maxAttempts = 8) {
  for (let i = 0; i < maxAttempts; i++) {
    const slug = randomSlug()
    const existing = await prisma.pool.findUnique({ where: { slug }, select: { id: true } })
    if (!existing) return slug
  }
  throw new Error('Could not generate unique slug after 8 attempts')
}

function generateAdminToken() {
  return crypto.randomBytes(24).toString('hex')
}

module.exports = { generateUniqueSlug, generateAdminToken, randomSlug }
```

**Step 2: Quick verification**

```
cd ~/Desktop/Clutch/backend && node -e "const s = require('./src/services/poolService'); s.generateUniqueSlug().then(slug => { console.log('slug:', slug); console.log('token:', s.generateAdminToken()); })"
```

Expected: slug is 6 chars alphanumeric, token is 48-char hex.

**Step 3: Commit**

```
git add backend/src/services/poolService.js && git commit -m "Pool service: slug + admin token generators"
```

---

## Task 3: Public pool routes (read + entry submission)

**Files:**
- Create: `backend/src/routes/pools.js`
- Modify: `backend/src/index.js` (mount the router)

**Step 1: Create pools.js**

```js
const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { generateUniqueSlug, generateAdminToken } = require('../services/poolService')

// ─── PUBLIC: GET pool by slug ──────────────────────────────────────────────
router.get('/:slug', async (req, res, next) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { slug: req.params.slug },
      include: {
        tournament: { include: { course: true } },
        tiers: {
          orderBy: { tierNumber: 'asc' },
          include: {
            players: {
              include: {
                player: {
                  select: {
                    id: true, name: true, country: true, countryFlag: true,
                    headshotUrl: true, owgrRank: true, primaryTour: true,
                    sgTotal: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!pool) return res.status(404).json({ error: 'Pool not found' })

    // Strip admin token from public response
    const { adminToken, commissionerEmail, ...publicPool } = pool
    res.json({ pool: publicPool })
  } catch (e) { next(e) }
})

// ─── PUBLIC: GET leaderboard ───────────────────────────────────────────────
router.get('/:slug/leaderboard', async (req, res, next) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, status: true, tournamentId: true },
    })
    if (!pool) return res.status(404).json({ error: 'Pool not found' })

    const [entries, winner] = await Promise.all([
      prisma.poolEntry.findMany({
        where: { poolId: pool.id },
        include: {
          picks: {
            include: {
              player: { select: { id: true, name: true, countryFlag: true, headshotUrl: true } },
              tier: { select: { tierNumber: true, label: true } },
            },
          },
        },
      }),
      // Tournament leader (lowest totalToPar) for tiebreaker resolution
      prisma.performance.findFirst({
        where: { tournamentId: pool.tournamentId, status: { not: 'WD' } },
        orderBy: [{ position: 'asc' }],
        select: { totalToPar: true },
      }),
    ])
    const actualWinningScore = winner?.totalToPar ?? null

    const ranked = entries
      .map(e => ({
        ...e,
        tiebreakerDiff: actualWinningScore == null ? null : Math.abs((e.tiebreakerScore ?? 0) - actualWinningScore),
      }))
      .sort((a, b) => {
        if (a.totalFantasyPoints !== b.totalFantasyPoints) return b.totalFantasyPoints - a.totalFantasyPoints
        if (a.tiebreakerDiff != null && b.tiebreakerDiff != null && a.tiebreakerDiff !== b.tiebreakerDiff) {
          return a.tiebreakerDiff - b.tiebreakerDiff
        }
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      })

    res.json({ leaderboard: ranked, status: pool.status, actualWinningScore })
  } catch (e) { next(e) }
})

// ─── PUBLIC: POST entry ────────────────────────────────────────────────────
router.post('/:slug/entries', async (req, res, next) => {
  try {
    const { entrantName, entrantEmail, teamName, tiebreakerScore, picks } = req.body
    if (!entrantName || !entrantEmail || !teamName || tiebreakerScore == null || !Array.isArray(picks)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (!/^[a-zA-Z0-9 _-]{2,30}$/.test(teamName)) {
      return res.status(400).json({ error: 'Team name must be 2-30 chars, letters/numbers/space/_/- only' })
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entrantEmail)) {
      return res.status(400).json({ error: 'Invalid email' })
    }

    const pool = await prisma.pool.findUnique({
      where: { slug: req.params.slug },
      include: { tiers: { include: { players: true } } },
    })
    if (!pool) return res.status(404).json({ error: 'Pool not found' })
    if (pool.status !== 'OPEN') return res.status(409).json({ error: `Pool is ${pool.status.toLowerCase()}, not accepting entries` })

    // Validate exactly picksRequired per tier, all picks belong to the tier
    const picksByTier = new Map()
    for (const p of picks) {
      if (!picksByTier.has(p.tierId)) picksByTier.set(p.tierId, [])
      picksByTier.get(p.tierId).push(p.playerId)
    }
    for (const tier of pool.tiers) {
      const tierPicks = picksByTier.get(tier.id) || []
      if (tierPicks.length !== tier.picksRequired) {
        return res.status(400).json({ error: `Tier ${tier.tierNumber}: need ${tier.picksRequired} pick(s), got ${tierPicks.length}` })
      }
      const validPlayerIds = new Set(tier.players.map(tp => tp.playerId))
      for (const pid of tierPicks) {
        if (!validPlayerIds.has(pid)) {
          return res.status(400).json({ error: `Player ${pid} is not in tier ${tier.tierNumber}` })
        }
      }
    }

    const entry = await prisma.poolEntry.create({
      data: {
        poolId: pool.id,
        entrantName, entrantEmail, teamName,
        tiebreakerScore: parseInt(tiebreakerScore),
        picks: { create: picks.map(p => ({ tierId: p.tierId, playerId: p.playerId })) },
      },
      include: { picks: { include: { player: true, tier: true } } },
    })

    res.status(201).json({ entry })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Team name already taken in this pool' })
    next(e)
  }
})

module.exports = router
```

**Step 2: Mount the router in `backend/src/index.js`**

Find the section where other routes are mounted (search for `app.use('/api/`). Add:

```js
const poolRoutes = require('./routes/pools')
// ... existing mounts ...
app.use('/api/pools', poolRoutes)
```

**Step 3: Smoke test (locally, requires backend running OR test against prod after deploy)**

For now, defer the live smoke test to Task 12. Just confirm the file parses:

```
cd ~/Desktop/Clutch/backend && node --check src/routes/pools.js && echo OK
```

Expected: `OK`

**Step 4: Commit**

```
git add backend/src/routes/pools.js backend/src/index.js && git commit -m "Pool routes: public GET + entry submission"
```

---

## Task 4: Admin pool routes (create, edit, publish, lock, DQ)

**Files:**
- Modify: `backend/src/routes/pools.js` (append admin routes)

**Step 1: Add an admin-token middleware function (top of pools.js, after the requires)**

```js
async function requireAdmin(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token']
  if (!token) return res.status(401).json({ error: 'Admin token required' })
  const pool = await prisma.pool.findUnique({
    where: { slug: req.params.slug },
    select: { id: true, adminToken: true },
  })
  if (!pool || pool.adminToken !== token) return res.status(403).json({ error: 'Invalid admin token' })
  req.poolId = pool.id
  next()
}
```

**Step 2: Append the admin routes BEFORE `module.exports = router`**

```js
// ─── ADMIN: POST create pool ───────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { name, tournamentId, commissionerEmail, scoringPreset, tiers } = req.body
    if (!name || !tournamentId || !commissionerEmail || !Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    for (const t of tiers) {
      if (typeof t.tierNumber !== 'number' || typeof t.picksRequired !== 'number' || !Array.isArray(t.playerIds)) {
        return res.status(400).json({ error: 'Each tier needs tierNumber, picksRequired, playerIds' })
      }
      if (t.playerIds.length < t.picksRequired) {
        return res.status(400).json({ error: `Tier ${t.tierNumber} has fewer players (${t.playerIds.length}) than picksRequired (${t.picksRequired})` })
      }
    }
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true } })
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' })

    const slug = await generateUniqueSlug()
    const adminToken = generateAdminToken()

    const pool = await prisma.pool.create({
      data: {
        slug, adminToken, name, tournamentId, commissionerEmail,
        scoringPreset: scoringPreset || 'standard',
        status: 'DRAFT',
        tiers: {
          create: tiers.map(t => ({
            tierNumber: t.tierNumber,
            label: t.label || null,
            picksRequired: t.picksRequired,
            players: { create: t.playerIds.map(pid => ({ playerId: pid })) },
          })),
        },
      },
    })

    res.status(201).json({ slug: pool.slug, adminToken: pool.adminToken })
  } catch (e) { next(e) }
})

// ─── ADMIN: POST publish (DRAFT → OPEN, computes locksAt) ─────────────────
router.post('/:slug/publish', requireAdmin, async (req, res, next) => {
  try {
    // locksAt = earliest R1 tee time. Fall back to tournament startDate at 11 AM ET if no tee time.
    const earliestR1 = await prisma.roundScore.findFirst({
      where: { tournamentId: { in: [(await prisma.pool.findUnique({ where: { id: req.poolId }, select: { tournamentId: true } })).tournamentId] }, roundNumber: 1, teeTime: { not: null } },
      orderBy: { teeTime: 'asc' },
      select: { teeTime: true },
    })
    let locksAt = earliestR1?.teeTime
    if (!locksAt) {
      const pool = await prisma.pool.findUnique({ where: { id: req.poolId }, include: { tournament: true } })
      locksAt = new Date(pool.tournament.startDate)
      locksAt.setUTCHours(15) // 11 AM ET fallback
    }

    const updated = await prisma.pool.update({
      where: { id: req.poolId },
      data: { status: 'OPEN', locksAt },
    })
    res.json({ pool: updated })
  } catch (e) { next(e) }
})

// ─── ADMIN: POST lock (OPEN → LOCKED) ──────────────────────────────────────
router.post('/:slug/lock', requireAdmin, async (req, res, next) => {
  try {
    const updated = await prisma.pool.update({
      where: { id: req.poolId },
      data: { status: 'LOCKED' },
    })
    res.json({ pool: updated })
  } catch (e) { next(e) }
})

// ─── ADMIN: GET admin view (all entries + admin metadata) ─────────────────
router.get('/:slug/admin', requireAdmin, async (req, res, next) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.poolId },
      include: {
        tournament: true,
        tiers: { orderBy: { tierNumber: 'asc' }, include: { players: { include: { player: true } } } },
        entries: { include: { picks: { include: { player: true, tier: true } } } },
      },
    })
    res.json({ pool })
  } catch (e) { next(e) }
})

// ─── ADMIN: DELETE entry (DQ) ──────────────────────────────────────────────
router.delete('/:slug/entries/:entryId', requireAdmin, async (req, res, next) => {
  try {
    await prisma.poolEntry.delete({ where: { id: req.params.entryId } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})
```

**Step 3: Syntax check**

```
cd ~/Desktop/Clutch/backend && node --check src/routes/pools.js && echo OK
```

**Step 4: Commit**

```
git add backend/src/routes/pools.js && git commit -m "Pool admin routes: create, publish, lock, view, DQ"
```

---

## Task 5: Scoring service for pools

**Files:**
- Modify: `backend/src/services/poolService.js` (append)

**Step 1: Append scoring logic to poolService.js**

```js
const { calculateFantasyPoints, getDefaultScoringConfig } = require('./scoringService')

/**
 * Recompute fantasyPoints on every PoolPick for this pool, then sum into
 * PoolEntry.totalFantasyPoints. Idempotent — safe to run repeatedly.
 */
async function recomputePoolScores(poolId, prismaClient = prisma) {
  const pool = await prismaClient.pool.findUnique({
    where: { id: poolId },
    select: { tournamentId: true, scoringPreset: true },
  })
  if (!pool) return { updated: 0 }

  const scoringConfig = getDefaultScoringConfig(pool.scoringPreset || 'standard')

  const performances = await prismaClient.performance.findMany({
    where: { tournamentId: pool.tournamentId },
    include: {
      roundScores: { where: { tournamentId: pool.tournamentId } },
    },
  })
  const perfByPlayer = new Map(performances.map(p => [p.playerId, p]))

  const entries = await prismaClient.poolEntry.findMany({
    where: { poolId },
    include: { picks: true },
  })

  const pickUpdates = []
  const entryUpdates = []
  for (const entry of entries) {
    let entryTotal = 0
    for (const pick of entry.picks) {
      const perf = perfByPlayer.get(pick.playerId)
      const points = perf ? (calculateFantasyPoints({ ...perf, roundScores: perf.roundScores || [] }, scoringConfig).total || 0) : 0
      if (pick.fantasyPoints !== points) {
        pickUpdates.push(prismaClient.poolPick.update({ where: { id: pick.id }, data: { fantasyPoints: points } }))
      }
      entryTotal += points
    }
    if (entry.totalFantasyPoints !== entryTotal) {
      entryUpdates.push(prismaClient.poolEntry.update({ where: { id: entry.id }, data: { totalFantasyPoints: entryTotal } }))
    }
  }

  await Promise.all([...pickUpdates, ...entryUpdates])
  return { entries: entries.length, picksUpdated: pickUpdates.length, entriesUpdated: entryUpdates.length }
}

module.exports = { generateUniqueSlug, generateAdminToken, randomSlug, recomputePoolScores }
```

**Step 2: Syntax check**

```
cd ~/Desktop/Clutch/backend && node --check src/services/poolService.js && echo OK
```

**Step 3: Commit**

```
git add backend/src/services/poolService.js && git commit -m "Pool scoring: recomputePoolScores using existing fantasy engine"
```

---

## Task 6: Lock + score crons

**Files:**
- Modify: `backend/src/index.js`

**Step 1: Add the cron registrations**

Find the existing live cron block (search for `'*/5 * * * 4,5,6,0'` — the DataGolf live scoring cron near line 525). Add immediately after that block:

```js
    // ─── Pool locking — every 2 min, all week ────────────────────────────
    cron.schedule('*/2 * * * *', async () => {
      try {
        const now = new Date()
        const due = await cronPrisma.pool.findMany({
          where: { status: 'OPEN', locksAt: { lte: now } },
          select: { id: true, slug: true, name: true },
        })
        for (const p of due) {
          await cronPrisma.pool.update({ where: { id: p.id }, data: { status: 'LOCKED' } })
          cronLog('pool-lock', `Locked pool ${p.slug} (${p.name})`)
        }
      } catch (e) { cronLog('pool-lock', `Error: ${e.message}`) }
    })

    // ─── Pool scoring — every 5 min Thu-Sun, riding alongside live ───────
    const poolService = require('./services/poolService')
    cron.schedule('*/5 * * * 4,5,6,0', async () => {
      try {
        const active = await cronPrisma.pool.findMany({
          where: { status: { in: ['LOCKED', 'COMPLETED'] } },
          select: { id: true, slug: true },
        })
        for (const p of active) {
          const r = await poolService.recomputePoolScores(p.id, cronPrisma)
          if (r.entriesUpdated > 0) cronLog('pool-score', `${p.slug}: ${r.entriesUpdated} entries updated`)
        }
      } catch (e) { cronLog('pool-score', `Error: ${e.message}`) }
    }, { timezone: 'America/New_York' })
```

**Step 2: Syntax check**

```
cd ~/Desktop/Clutch/backend && node --check src/index.js && echo OK
```

**Step 3: Commit**

```
git add backend/src/index.js && git commit -m "Pool crons: 2-min lock check + 5-min Thu-Sun scoring"
```

---

## Task 7: Email confirmations via Resend

**Files:**
- Modify: `backend/src/routes/pools.js` (add email calls inside create + entry handlers)

**Step 1: Check the existing Resend wiring**

```
cd ~/Desktop/Clutch && grep -rn "resend\|Resend" backend/src/services/ | head -5
```

Find the email service (likely `backend/src/services/emailService.js` or `notificationService.js`). Read it to see the existing function signature (e.g., `sendEmail({ to, subject, html })`). If no Resend wrapper exists, create one — but Eric's memory says Resend is already wired for Clutch.

**Step 2: Import the email function at the top of `pools.js`**

```js
const { sendEmail } = require('../services/emailService') // or whatever path the existing wrapper uses
```

**Step 3: After successful pool create (inside `POST /`), send admin email**

```js
const baseUrl = process.env.FRONTEND_URL || 'https://clutchfantasysports.com'
sendEmail({
  to: commissionerEmail,
  subject: `Your Clutch pool "${name}" is ready`,
  html: `
    <h2>${name}</h2>
    <p>Share this link with your friends to let them enter:</p>
    <p><a href="${baseUrl}/pools/${pool.slug}">${baseUrl}/pools/${pool.slug}</a></p>
    <p>Your admin link (keep this private — it lets you manage the pool):</p>
    <p><a href="${baseUrl}/pools/${pool.slug}/admin?token=${pool.adminToken}">Admin page</a></p>
  `,
}).catch(err => console.error('[Pool email] admin send failed:', err.message))
```

(Use `.catch` to swallow email errors — pool creation should succeed even if email is down.)

**Step 4: After successful entry create, send confirmation email**

Inside `POST /:slug/entries`, after `prisma.poolEntry.create`:

```js
const summary = entry.picks.map(p => `<li>Tier ${p.tier.tierNumber}: ${p.player.name}</li>`).join('')
sendEmail({
  to: entrantEmail,
  subject: `You're in: ${pool.name}`,
  html: `
    <h2>Picks locked in for ${teamName}</h2>
    <ul>${summary}</ul>
    <p>Tiebreaker: ${tiebreakerScore}</p>
    <p><a href="${process.env.FRONTEND_URL || 'https://clutchfantasysports.com'}/pools/${pool.slug}">Track the leaderboard</a></p>
  `,
}).catch(err => console.error('[Pool email] entry send failed:', err.message))
```

**Step 5: Syntax check + commit**

```
cd ~/Desktop/Clutch/backend && node --check src/routes/pools.js && echo OK
git add backend/src/routes/pools.js && git commit -m "Pool emails: admin link on create, confirmation on entry"
```

---

## Task 8: Frontend API client methods

**Files:**
- Modify: `frontend/src/services/api.js`

**Step 1: Find an existing similar API method in `services/api.js` to match style.**

```
cd ~/Desktop/Clutch && grep -n "async getCurrentTournament\|async getLeague" frontend/src/services/api.js | head -3
```

**Step 2: Append (or place alongside related methods) the pool API methods**

```js
  // ─── Pools ──────────────────────────────────────────────────────────────
  async createPool(payload) {
    return this.request('/pools', { method: 'POST', body: JSON.stringify(payload) })
  },
  async getPool(slug) {
    return this.request(`/pools/${slug}`)
  },
  async getPoolLeaderboard(slug) {
    return this.request(`/pools/${slug}/leaderboard`)
  },
  async submitPoolEntry(slug, entry) {
    return this.request(`/pools/${slug}/entries`, { method: 'POST', body: JSON.stringify(entry) })
  },
  async getPoolAdmin(slug, token) {
    return this.request(`/pools/${slug}/admin?token=${encodeURIComponent(token)}`)
  },
  async publishPool(slug, token) {
    return this.request(`/pools/${slug}/publish?token=${encodeURIComponent(token)}`, { method: 'POST' })
  },
  async lockPool(slug, token) {
    return this.request(`/pools/${slug}/lock?token=${encodeURIComponent(token)}`, { method: 'POST' })
  },
  async deletePoolEntry(slug, token, entryId) {
    return this.request(`/pools/${slug}/entries/${entryId}?token=${encodeURIComponent(token)}`, { method: 'DELETE' })
  },
```

Match the existing object-literal vs class-method style — read a few lines above to confirm.

**Step 3: Commit**

```
git add frontend/src/services/api.js && git commit -m "API client: pool create/get/leaderboard/entry/admin methods"
```

---

## Task 9: Pool creation page (commissioner)

**Files:**
- Create: `frontend/src/pages/PoolCreate.jsx`
- Modify: `frontend/src/App.jsx` (add route `/pools/new`)

**Step 1: Build `PoolCreate.jsx`**

Single-page form:
1. Tournament dropdown (fetch `/api/tournaments/upcoming-with-fields`)
2. Pool name input
3. Commissioner email input
4. Tier builder: an array of tiers; each tier has `tierNumber` (auto), `label` (optional text input), `picksRequired` (number), and a player picker — multi-select from the chosen tournament's field, showing name + OWGR + country flag.
5. "+ Add tier" button (max 8)
6. Submit → POST `/api/pools` → show share + admin links on a success screen

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function PoolCreate() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [field, setField] = useState([])
  const [form, setForm] = useState({
    tournamentId: '', name: '', commissionerEmail: '',
    tiers: [{ tierNumber: 1, label: '', picksRequired: 1, playerIds: [] }],
  })
  const [created, setCreated] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.request('/tournaments/upcoming-with-fields').then(d => setTournaments(d.tournaments || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.tournamentId) { setField([]); return }
    const t = tournaments.find(x => x.id === form.tournamentId)
    setField(t?.field || [])
  }, [form.tournamentId, tournaments])

  const updateTier = (idx, patch) => setForm(f => ({ ...f, tiers: f.tiers.map((t, i) => i === idx ? { ...t, ...patch } : t) }))
  const addTier = () => setForm(f => ({ ...f, tiers: [...f.tiers, { tierNumber: f.tiers.length + 1, label: '', picksRequired: 1, playerIds: [] }] }))
  const removeTier = (idx) => setForm(f => ({ ...f, tiers: f.tiers.filter((_, i) => i !== idx).map((t, i) => ({ ...t, tierNumber: i + 1 })) }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const result = await api.createPool(form)
      setCreated(result)
    } catch (err) {
      setError(err.message || 'Failed to create pool')
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    const base = window.location.origin
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-display font-bold">Pool created.</h1>
        <div className="rounded-xl border bg-surface p-4 space-y-2">
          <div>
            <div className="text-sm text-text-2 uppercase tracking-wide font-mono">Share link</div>
            <a className="text-blaze break-all" href={`/pools/${created.slug}`}>{base}/pools/{created.slug}</a>
          </div>
          <div>
            <div className="text-sm text-text-2 uppercase tracking-wide font-mono">Admin link (keep private)</div>
            <a className="text-crown break-all" href={`/pools/${created.slug}/admin?token=${created.adminToken}`}>{base}/pools/{created.slug}/admin?token={created.adminToken}</a>
          </div>
          <p className="text-sm text-text-2 pt-2">Sent both to {form.commissionerEmail}. Go to the admin link and hit Publish when you're ready to accept entries.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-display font-bold">New pool</h1>
      {error && <div className="rounded-md bg-live-red/10 text-live-red p-3">{error}</div>}

      <label className="block">
        <span className="text-sm font-mono uppercase tracking-wide text-text-2">Tournament</span>
        <select className="mt-1 w-full border rounded-md px-3 py-2 bg-surface"
          value={form.tournamentId} onChange={e => setForm({ ...form, tournamentId: e.target.value })} required>
          <option value="">Select tournament…</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name} ({t.startDate?.slice(0, 10)})</option>)}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-mono uppercase tracking-wide text-text-2">Pool name</span>
        <input className="mt-1 w-full border rounded-md px-3 py-2 bg-surface"
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
      </label>

      <label className="block">
        <span className="text-sm font-mono uppercase tracking-wide text-text-2">Your email (gets admin link)</span>
        <input type="email" className="mt-1 w-full border rounded-md px-3 py-2 bg-surface"
          value={form.commissionerEmail} onChange={e => setForm({ ...form, commissionerEmail: e.target.value })} required />
      </label>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Tiers</h2>
          <button type="button" onClick={addTier} className="text-sm bg-blaze text-white rounded-md px-3 py-1.5">+ Add tier</button>
        </div>
        {form.tiers.map((tier, idx) => (
          <div key={idx} className="rounded-xl border p-4 space-y-3 bg-surface">
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg">Tier {tier.tierNumber}</span>
              <input className="flex-1 border rounded-md px-3 py-1" placeholder="Label (optional, e.g. 'Stars')"
                value={tier.label} onChange={e => updateTier(idx, { label: e.target.value })} />
              <label className="text-sm">
                Picks required:
                <input type="number" min="1" max="10" className="ml-2 w-16 border rounded-md px-2 py-1"
                  value={tier.picksRequired} onChange={e => updateTier(idx, { picksRequired: parseInt(e.target.value) || 1 })} />
              </label>
              {form.tiers.length > 1 && (
                <button type="button" onClick={() => removeTier(idx)} className="text-live-red text-sm">Remove</button>
              )}
            </div>
            <select multiple className="w-full border rounded-md p-2 h-40 bg-bg font-mono text-sm"
              value={tier.playerIds}
              onChange={e => updateTier(idx, { playerIds: Array.from(e.target.selectedOptions).map(o => o.value) })}>
              {field.map(p => (
                <option key={p.id} value={p.id}>
                  {p.countryFlag || ''} {p.name} {p.owgrRank ? `#${p.owgrRank}` : ''}
                </option>
              ))}
            </select>
            <div className="text-xs text-text-2 font-mono">{tier.playerIds.length} player(s) selected</div>
          </div>
        ))}
      </div>

      <button type="submit" disabled={submitting} className="w-full bg-blaze text-white font-display font-bold rounded-md py-3 disabled:opacity-50">
        {submitting ? 'Creating…' : 'Create pool'}
      </button>
    </form>
  )
}
```

**Step 2: Mount the route in `App.jsx`**

Find the routes block (search for `<Route path=`), add:

```jsx
<Route path="/pools/new" element={<PoolCreate />} />
```

And the import at the top:

```jsx
import PoolCreate from './pages/PoolCreate'
```

**Step 3: Commit**

```
git add frontend/src/pages/PoolCreate.jsx frontend/src/App.jsx && git commit -m "PoolCreate page: commissioner creation flow"
```

---

## Task 10: Pool entry + leaderboard page

**Files:**
- Create: `frontend/src/pages/PoolView.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Build `PoolView.jsx`**

Renders three states based on `pool.status`:
- `DRAFT` → "This pool isn't open yet. Check back."
- `OPEN` → entry form (tiers as columns, pick required-N, tiebreaker input, name/email/team name, submit)
- `LOCKED` / `COMPLETED` → leaderboard

```jsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'

export default function PoolView() {
  const { slug } = useParams()
  const [pool, setPool] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(null)
  const [entry, setEntry] = useState({ entrantName: '', entrantEmail: '', teamName: '', tiebreakerScore: 0, picks: {} })
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { (async () => {
    try {
      const p = await api.getPool(slug)
      setPool(p.pool)
      if (p.pool.status !== 'OPEN' && p.pool.status !== 'DRAFT') {
        const lb = await api.getPoolLeaderboard(slug)
        setLeaderboard(lb)
      }
    } finally { setLoading(false) }
  })() }, [slug])

  // Auto-refresh leaderboard every 60s when LOCKED/COMPLETED
  useEffect(() => {
    if (!pool || (pool.status !== 'LOCKED' && pool.status !== 'COMPLETED')) return
    const i = setInterval(() => api.getPoolLeaderboard(slug).then(setLeaderboard).catch(() => {}), 60000)
    return () => clearInterval(i)
  }, [pool, slug])

  const togglePick = (tierId, playerId, picksRequired) => {
    setEntry(e => {
      const current = e.picks[tierId] || []
      const has = current.includes(playerId)
      let next
      if (has) next = current.filter(id => id !== playerId)
      else if (current.length < picksRequired) next = [...current, playerId]
      else next = [...current.slice(1), playerId] // bump oldest if at max
      return { ...e, picks: { ...e.picks, [tierId]: next } }
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setSubmitError(null)
    try {
      const picks = []
      for (const tier of pool.tiers) {
        for (const pid of (entry.picks[tier.id] || [])) picks.push({ tierId: tier.id, playerId: pid })
      }
      const result = await api.submitPoolEntry(slug, {
        entrantName: entry.entrantName,
        entrantEmail: entry.entrantEmail,
        teamName: entry.teamName,
        tiebreakerScore: parseInt(entry.tiebreakerScore),
        picks,
      })
      setSubmitted(result.entry)
    } catch (err) {
      setSubmitError(err.message || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (!pool) return <div className="p-6">Pool not found.</div>

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-display font-bold">You're in.</h1>
        <p className="text-text-2">Team <b>{submitted.teamName}</b> submitted. Confirmation email sent to {submitted.entrantEmail}.</p>
        <a href={`/pools/${slug}`} className="inline-block text-blaze">View leaderboard →</a>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-display font-bold">{pool.name}</h1>
        <p className="text-text-2 font-mono">{pool.tournament.name} · {pool.tournament.location || ''}</p>
        {pool.status === 'OPEN' && pool.locksAt && (
          <p className="text-sm text-text-2">Locks {new Date(pool.locksAt).toLocaleString()}</p>
        )}
      </header>

      {pool.status === 'DRAFT' && (
        <div className="rounded-xl border bg-surface p-6 text-center">
          <p className="text-text-2">This pool hasn't opened yet. Check back when the commissioner publishes.</p>
        </div>
      )}

      {pool.status === 'OPEN' && (
        <form onSubmit={submit} className="space-y-6">
          {submitError && <div className="rounded-md bg-live-red/10 text-live-red p-3">{submitError}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pool.tiers.map(tier => {
              const picked = entry.picks[tier.id] || []
              return (
                <div key={tier.id} className="rounded-xl border bg-surface p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold">Tier {tier.tierNumber}{tier.label ? ` — ${tier.label}` : ''}</h3>
                    <span className="font-mono text-sm">{picked.length} / {tier.picksRequired}</span>
                  </div>
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {tier.players.map(tp => {
                      const isPicked = picked.includes(tp.player.id)
                      return (
                        <button type="button" key={tp.player.id}
                          onClick={() => togglePick(tier.id, tp.player.id, tier.picksRequired)}
                          className={`w-full text-left rounded-md px-2 py-1.5 flex items-center gap-2 text-sm ${isPicked ? 'bg-blaze/15 ring-1 ring-blaze' : 'hover:bg-bg'}`}>
                          <span>{tp.player.countryFlag || ''}</span>
                          <span className="flex-1">{tp.player.name}</span>
                          {tp.player.owgrRank && <span className="font-mono text-xs text-text-2">#{tp.player.owgrRank}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border bg-surface p-4 space-y-3">
            <h3 className="font-display font-bold">Your entry</h3>
            <input className="w-full border rounded-md px-3 py-2 bg-bg" placeholder="Team name (2-30 chars)"
              value={entry.teamName} onChange={e => setEntry({ ...entry, teamName: e.target.value })} required />
            <input className="w-full border rounded-md px-3 py-2 bg-bg" placeholder="Your name"
              value={entry.entrantName} onChange={e => setEntry({ ...entry, entrantName: e.target.value })} required />
            <input type="email" className="w-full border rounded-md px-3 py-2 bg-bg" placeholder="Email"
              value={entry.entrantEmail} onChange={e => setEntry({ ...entry, entrantEmail: e.target.value })} required />
            <label className="block">
              <span className="text-sm text-text-2">Tiebreaker: predict the winner's final score relative to par (e.g. -12)</span>
              <input type="number" className="mt-1 w-full border rounded-md px-3 py-2 bg-bg"
                value={entry.tiebreakerScore} onChange={e => setEntry({ ...entry, tiebreakerScore: e.target.value })} required />
            </label>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-blaze text-white font-display font-bold rounded-md py-3 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Lock in my picks'}
          </button>
        </form>
      )}

      {(pool.status === 'LOCKED' || pool.status === 'COMPLETED') && leaderboard && (
        <div className="rounded-xl border bg-surface p-4">
          <h2 className="font-display font-bold mb-3">Leaderboard</h2>
          <table className="w-full text-sm">
            <thead className="font-mono text-text-2 text-xs uppercase">
              <tr><th className="text-left p-2">#</th><th className="text-left p-2">Team</th><th className="text-right p-2">Points</th><th className="text-right p-2">TB Δ</th></tr>
            </thead>
            <tbody>
              {leaderboard.leaderboard.map((e, i) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2 font-mono">{i + 1}</td>
                  <td className="p-2">
                    <div className="font-medium">{e.teamName}</div>
                    <div className="text-xs text-text-2">{e.picks.map(p => p.player.name).join(', ')}</div>
                  </td>
                  <td className="p-2 text-right font-mono">{e.totalFantasyPoints.toFixed(1)}</td>
                  <td className="p-2 text-right font-mono text-text-2">{e.tiebreakerDiff != null ? e.tiebreakerDiff : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Mount the route**

In `App.jsx`:

```jsx
import PoolView from './pages/PoolView'
// ...
<Route path="/pools/:slug" element={<PoolView />} />
```

**Step 3: Commit**

```
git add frontend/src/pages/PoolView.jsx frontend/src/App.jsx && git commit -m "PoolView: entry form + live leaderboard"
```

---

## Task 11: Admin page

**Files:**
- Create: `frontend/src/pages/PoolAdmin.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Build `PoolAdmin.jsx`**

Reads token from `?token=...`. Renders:
- Pool status with Publish button (if DRAFT) and Lock now button (if OPEN)
- Tiers display (read-only for v1 — tier editing post-publish deferred)
- Entries table with DQ button per row

```jsx
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../services/api'

export default function PoolAdmin() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = async () => {
    try {
      const r = await api.getPoolAdmin(slug, token)
      setData(r.pool)
    } catch (e) {
      setError(e.message || 'Failed to load')
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [slug, token])

  const publish = async () => {
    await api.publishPool(slug, token)
    refresh()
  }
  const lock = async () => {
    if (!confirm('Lock the pool now? No more entries.')) return
    await api.lockPool(slug, token)
    refresh()
  }
  const dq = async (entryId) => {
    if (!confirm('DQ this entry?')) return
    await api.deletePoolEntry(slug, token, entryId)
    refresh()
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-live-red">{error}</div>
  if (!data) return null

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{data.name} <span className="text-base font-mono text-text-2">[admin]</span></h1>
          <p className="text-text-2 font-mono">{data.tournament.name} · status: {data.status}</p>
        </div>
        <div className="flex gap-2">
          {data.status === 'DRAFT' && <button onClick={publish} className="bg-field text-white px-3 py-2 rounded-md">Publish</button>}
          {data.status === 'OPEN' && <button onClick={lock} className="bg-live-red text-white px-3 py-2 rounded-md">Lock now</button>}
        </div>
      </header>

      <div className="rounded-xl border bg-surface p-4">
        <h2 className="font-display font-bold mb-2">Tiers</h2>
        <ul className="text-sm space-y-1">
          {data.tiers.map(t => (
            <li key={t.id}><span className="font-mono">T{t.tierNumber}</span> {t.label || ''} — {t.players.length} players, pick {t.picksRequired}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-surface p-4">
        <h2 className="font-display font-bold mb-3">Entries ({data.entries.length})</h2>
        <table className="w-full text-sm">
          <thead className="font-mono text-text-2 text-xs uppercase">
            <tr><th className="text-left p-2">Team</th><th className="text-left p-2">Entrant</th><th className="text-right p-2">Pts</th><th className="text-right p-2"></th></tr>
          </thead>
          <tbody>
            {data.entries.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-2 font-medium">{e.teamName}</td>
                <td className="p-2 text-text-2">{e.entrantName} · {e.entrantEmail}</td>
                <td className="p-2 text-right font-mono">{e.totalFantasyPoints.toFixed(1)}</td>
                <td className="p-2 text-right"><button onClick={() => dq(e.id)} className="text-live-red text-xs">DQ</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 2: Mount route**

```jsx
import PoolAdmin from './pages/PoolAdmin'
// ...
<Route path="/pools/:slug/admin" element={<PoolAdmin />} />
```

**Step 3: Commit + push**

```
git add frontend/src/pages/PoolAdmin.jsx frontend/src/App.jsx && git commit -m "PoolAdmin: publish, lock, view + DQ entries"
git push origin master
```

---

## Task 12: End-to-end smoke test

**Step 1: Wait for Railway deploy to finish.** Verify with:

```
curl -sS https://clutch-production-8def.up.railway.app/api/health 2>&1 | head -1
```

**Step 2: Create a real pool against prod via curl** (using the upcoming Truist Championship or whatever's UPCOMING)

```
cd ~/Desktop/Clutch/backend && node -e "
const prisma = require('./src/lib/prisma');
(async () => {
  const t = await prisma.tournament.findFirst({ where: { status: { in: ['UPCOMING', 'IN_PROGRESS'] } }, include: { performances: { take: 20, include: { player: true } } }, orderBy: { startDate: 'asc' } });
  console.log('Tournament:', t.name, t.id);
  console.log('Sample player IDs:', t.performances.slice(0, 10).map(p => p.player.id));
  process.exit(0);
})()
"
```

**Step 3: Use the IDs from step 2 to POST a real pool via curl:**

```
curl -X POST https://clutch-production-8def.up.railway.app/api/pools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smoke Test Pool",
    "tournamentId": "<tournament_id_from_step_2>",
    "commissionerEmail": "ericmsaylor@gmail.com",
    "tiers": [
      { "tierNumber": 1, "label": "A", "picksRequired": 1, "playerIds": ["<player1>", "<player2>"] },
      { "tierNumber": 2, "label": "B", "picksRequired": 1, "playerIds": ["<player3>", "<player4>"] }
    ]
  }'
```

Expected: returns `{ slug, adminToken }`. Email arrives at ericmsaylor@gmail.com.

**Step 4: Walk through the UI**

1. Visit `/pools/<slug>/admin?token=<token>` → publish
2. Visit `/pools/<slug>` → submit an entry as Eric → confirmation
3. Visit `/pools/<slug>/admin?token=<token>` → see entry in table, status OPEN
4. If tournament not yet started, wait for first tee time → cron should auto-lock within 2 min of `locksAt`
5. Once IN_PROGRESS, refresh leaderboard → should populate with fantasy points from existing scoring engine

**Step 5: Clean up smoke test pool**

```
cd ~/Desktop/Clutch/backend && node -e "
const prisma = require('./src/lib/prisma');
(async () => {
  await prisma.pool.deleteMany({ where: { name: 'Smoke Test Pool' } });
  console.log('Cleaned up');
  process.exit(0);
})()
"
```

**Step 6: Final commit (if any fixes needed during smoke test)**

```
git add -A && git commit -m "Pool smoke test fixes" && git push origin master
```

---

## Done criteria

- [ ] Schema deployed
- [ ] All 11 backend + frontend tasks committed
- [ ] Pool created via UI returns share + admin link
- [ ] Anonymous friend can submit entry, gets email
- [ ] Admin can publish and lock
- [ ] Lock cron fires within 2 min of `locksAt`
- [ ] Scoring cron updates leaderboard during IN_PROGRESS tournament
- [ ] Mobile renders (one phone screenshot before declaring done)

## Deferred (intentionally)

- Tier editing post-publish (admin can re-create pool if needed)
- AI coach pick suggestions
- Multi-tournament aggregation
- Reminder emails
- Clutch account linkage for entries (schema-ready already)
- Auto-tiering from OWGR/odds/CPI
