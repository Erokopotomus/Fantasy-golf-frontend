# Personal AI Coach Vault — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give each user a persistent coaching memory vault — structured JSON documents that the AI coach reads for personalized, continuity-aware coaching.

**Architecture:** Two new Prisma models (CoachingMemory + CoachingInteraction), a weekly Memory Writer cron that distills behavioral patterns into vault documents, a context assembly service that pulls relevant docs per coaching situation, API routes for vault CRUD, and a Coach Settings page for user preferences.

**Tech Stack:** Prisma 6 (PostgreSQL), Express 5, React 18, node-cron, existing Claude API integration

**Design doc:** `docs/plans/2026-03-03-personal-ai-coach-vault-design.md`

---

## Task 1: Database Migration — CoachingMemory + CoachingInteraction

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: Migration via `prisma migrate dev`

**Step 1: Add CoachingMemory model to schema.prisma**

Add after the existing `UserIntelligenceProfile` model (around line 3015):

```prisma
// ============ COACHING MEMORY VAULT (Per-User AI Coach) ============

model CoachingMemory {
  id            String   @id @default(cuid())
  userId        String
  sport         String?  // null = cross-sport
  documentType  String   // identity, draft_patterns, roster_patterns, predictions, coaching_log, season_narrative
  content       Json
  version       Int      @default(1)
  lastUpdatedBy String   // system_cron, user_input, coach_interaction
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id])

  @@unique([userId, sport, documentType])
  @@index([userId])
  @@index([documentType])
}

model CoachingInteraction {
  id              String   @id @default(cuid())
  userId          String
  insightType     String   // ambient, contextual, deep, briefing
  summary         String
  context         String?  // what triggered it: draft, waiver, prediction, etc.
  userReaction    String?  // helpful, not_useful, ignored
  behaviorChanged Boolean  @default(false)
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([userId, createdAt])
}
```

**Step 2: Add relations to User model**

Find the `User` model in schema.prisma. Add these relation fields alongside the existing ones (look for `UserIntelligenceProfile` relation as a landmark):

```prisma
  coachingMemories     CoachingMemory[]
  coachingInteractions CoachingInteraction[]
```

**Step 3: Run migration**

```bash
cd /Users/ericsaylor/Desktop/Clutch/backend
npx prisma migrate dev --name coaching_memory_vault
```

Expected: Migration creates `CoachingMemory` and `CoachingInteraction` tables with indexes.

**Step 4: Verify**

```bash
npx prisma studio
```

Open in browser, confirm both tables exist with correct columns.

**Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add CoachingMemory + CoachingInteraction models for AI coach vault"
```

---

## Task 2: Coach Context Assembly Service

**Files:**
- Create: `backend/src/services/coachContextAssembly.js`

**Step 1: Create the service**

```javascript
/**
 * Coach Context Assembly Service
 *
 * Reads relevant vault documents per coaching situation.
 * Keeps AI API calls small by pulling only what's needed.
 */

const prisma = require('../lib/prisma.js')

// Which vault documents to pull per coaching situation
const CONTEXT_RULES = {
  briefing: ['identity', 'coaching_log'],
  draft_prep: ['identity', 'draft_patterns', 'coaching_log'],
  waiver_decision: ['identity', 'roster_patterns', 'season_narrative'],
  prediction: ['identity', 'predictions', 'coaching_log'],
  live_scoring: ['identity', 'season_narrative'],
  deep_report: null, // pull all documents
}

/**
 * Assemble coaching context for a specific situation.
 *
 * @param {string} userId
 * @param {object} situation - { type, sport?, leagueId?, playerId? }
 * @returns {object} { documents: Record<string, object>, userIdentity: object, coachingHistory: object[] }
 */
async function assembleCoachContext(userId, situation) {
  const { type, sport } = situation
  const docTypes = CONTEXT_RULES[type] || CONTEXT_RULES.briefing

  // Build query — pull cross-sport (sport=null) + sport-specific documents
  const where = {
    userId,
    ...(docTypes ? { documentType: { in: docTypes } } : {}),
  }

  // Get documents for both cross-sport and sport-specific
  const sportFilters = [null]
  if (sport) sportFilters.push(sport)

  const memories = await prisma.coachingMemory.findMany({
    where: {
      ...where,
      sport: { in: sportFilters },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Organize by document type — sport-specific overrides cross-sport
  const documents = {}
  for (const mem of memories) {
    const key = mem.documentType
    // Sport-specific takes priority over cross-sport
    if (!documents[key] || mem.sport !== null) {
      documents[key] = mem.content
    }
  }

  // For coaching_log context, trim to recent interactions only
  let recentInteractions = []
  if (docTypes === null || docTypes.includes('coaching_log')) {
    const maxInteractions = type === 'deep_report' ? 20 : 5
    recentInteractions = await prisma.coachingInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: maxInteractions,
      select: {
        insightType: true,
        summary: true,
        context: true,
        userReaction: true,
        behaviorChanged: true,
        createdAt: true,
      },
    })
  }

  // Extract identity for easy access
  const identity = documents.identity || getDefaultIdentity()

  return {
    documents,
    identity,
    recentInteractions,
    situation,
    hasVaultData: Object.keys(documents).length > 0,
  }
}

/**
 * Default identity document for users who haven't configured coach settings.
 */
function getDefaultIdentity() {
  return {
    coachingTone: 'encouraging',
    coachingFrequency: 'daily',
    riskAppetite: 'balanced',
    draftPhilosophy: ['best_available'],
    favoriteTeams: [],
    statedBiases: [],
    userNotes: [],
  }
}

/**
 * Format vault context into a compact string for AI prompt injection.
 * Keeps token count predictable.
 */
function formatContextForPrompt(coachContext) {
  const sections = []

  const { identity, documents, recentInteractions } = coachContext

  // Identity section
  sections.push(`## Coach Settings
- Tone: ${identity.coachingTone}
- Risk appetite: ${identity.riskAppetite}
- Draft philosophy: ${(identity.draftPhilosophy || []).join(', ') || 'not set'}`)

  if (identity.userNotes?.length > 0) {
    sections.push(`- User notes: ${identity.userNotes.map(n => n.text).join('; ')}`)
  }

  // Pattern sections — only include if present
  if (documents.draft_patterns) {
    const dp = documents.draft_patterns
    const patterns = dp.repeatingPatterns?.map(p => `${p.pattern} (${p.occurrences}x)`).join(', ') || 'none detected'
    const improvements = dp.improvements?.map(i => i.area).join(', ') || 'none yet'
    sections.push(`## Draft Patterns (${dp.seasonCount || 0} seasons)
- Reach frequency: ${dp.reachFrequency != null ? (dp.reachFrequency * 100).toFixed(0) + '%' : 'unknown'}
- Board adherence: ${dp.boardAdherence != null ? (dp.boardAdherence * 100).toFixed(0) + '%' : 'unknown'}
- Repeating patterns: ${patterns}
- Improvements: ${improvements}`)
  }

  if (documents.roster_patterns) {
    const rp = documents.roster_patterns
    sections.push(`## Roster Patterns
- Trade style: ${rp.tradeStyle || 'unknown'}
- Waiver timing: ${rp.waiverTiming || 'unknown'}
- Lineup optimization: ${rp.lineupOptimizationRate != null ? (rp.lineupOptimizationRate * 100).toFixed(0) + '%' : 'unknown'}`)
  }

  if (documents.predictions) {
    const pp = documents.predictions
    sections.push(`## Prediction Patterns
- Overall accuracy: ${pp.overallAccuracy != null ? (pp.overallAccuracy * 100).toFixed(0) + '%' : 'unknown'}
- Best type: ${pp.bestType || 'unknown'}
- Worst type: ${pp.worstType || 'unknown'}
- Calibration note: ${pp.calibrationNote || 'none'}`)
  }

  if (documents.season_narrative) {
    const sn = documents.season_narrative
    sections.push(`## Current Season
${sn.narrative ? Object.values(sn.narrative).filter(Boolean).join(' ') : 'No season narrative yet.'}`)
  }

  // Recent coaching history
  if (recentInteractions.length > 0) {
    const history = recentInteractions.slice(0, 5).map(i => {
      const reaction = i.userReaction ? ` (${i.userReaction})` : ''
      return `- ${i.summary}${reaction}`
    }).join('\n')
    sections.push(`## Recent Coaching History
${history}`)
  }

  return sections.join('\n\n')
}

module.exports = {
  assembleCoachContext,
  formatContextForPrompt,
  getDefaultIdentity,
  CONTEXT_RULES,
}
```

**Step 2: Verify file loads without errors**

```bash
cd /Users/ericsaylor/Desktop/Clutch/backend
node -e "const ctx = require('./src/services/coachContextAssembly'); console.log(Object.keys(ctx))"
```

Expected: `[ 'assembleCoachContext', 'formatContextForPrompt', 'getDefaultIdentity', 'CONTEXT_RULES' ]`

**Step 3: Commit**

```bash
git add backend/src/services/coachContextAssembly.js
git commit -m "feat: add coach context assembly service for vault document retrieval"
```

---

## Task 3: Memory Writer Service

**Files:**
- Create: `backend/src/services/coachingMemoryWriter.js`

**Step 1: Create the Memory Writer service**

```javascript
/**
 * Coaching Memory Writer Service
 *
 * Weekly cron (Wed 4:30 AM) that reads Pattern Engine output + Decision Graph data
 * and distills it into compact vault documents per user.
 *
 * No AI calls — pure computation and data distillation.
 */

const prisma = require('../lib/prisma.js')
const patternEngine = require('./patternEngine')

/**
 * Run the Memory Writer for all active users.
 */
async function runMemoryWriter() {
  // Active = any activity in the last 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const activeUsers = await prisma.user.findMany({
    where: {
      OR: [
        { predictions: { some: { createdAt: { gte: cutoff } } } },
        { draftPicks: { some: { pickedAt: { gte: cutoff } } } },
        { teams: { some: { updatedAt: { gte: cutoff } } } },
        { coachingInteractions: { some: { createdAt: { gte: cutoff } } } },
      ],
    },
    select: { id: true },
  })

  let updatedDocs = 0
  let errors = 0

  for (const user of activeUsers) {
    try {
      const count = await writeVaultForUser(user.id)
      updatedDocs += count
    } catch (err) {
      errors++
      console.error(`[MemoryWriter] Failed for user ${user.id}:`, err.message)
    }
  }

  console.log(`[MemoryWriter] Done: ${updatedDocs} docs updated for ${activeUsers.length} users (${errors} errors)`)
  return { updatedDocs, usersProcessed: activeUsers.length, errors }
}

/**
 * Write/update vault documents for a single user.
 * Returns number of documents updated.
 */
async function writeVaultForUser(userId) {
  let updated = 0

  // Get sports the user participates in
  const memberships = await prisma.leagueMember.findMany({
    where: { userId },
    include: { league: { select: { sport: true } } },
  })
  const sports = [...new Set(memberships.map(m => (m.league.sport || 'golf').toLowerCase()))]
  if (sports.length === 0) sports.push('golf') // default

  for (const sport of sports) {
    // Get or generate the user's intelligence profile
    let profile
    try {
      profile = await patternEngine.getUserProfile(userId, sport)
    } catch {
      profile = null
    }

    if (profile) {
      // Draft patterns document
      if (profile.draftPatterns?.hasDraftData) {
        const wrote = await writeDraftPatterns(userId, sport, profile.draftPatterns)
        if (wrote) updated++
      }

      // Roster patterns document
      if (profile.rosterPatterns) {
        const wrote = await writeRosterPatterns(userId, sport, profile.rosterPatterns)
        if (wrote) updated++
      }

      // Prediction patterns document
      if (profile.predictionPatterns?.hasPredictionData) {
        const wrote = await writePredictionPatterns(userId, sport, profile.predictionPatterns)
        if (wrote) updated++
      }
    }

    // Coaching log document (from CoachingInteraction records)
    const wrote = await writeCoachingLog(userId, sport)
    if (wrote) updated++

    // Season narrative
    const wroteNarrative = await writeSeasonNarrative(userId, sport)
    if (wroteNarrative) updated++
  }

  return updated
}

/**
 * Upsert a vault document. Only writes if content has meaningfully changed.
 */
async function upsertVaultDoc(userId, sport, documentType, newContent) {
  const existing = await prisma.coachingMemory.findUnique({
    where: { userId_sport_documentType: { userId, sport, documentType } },
  })

  // Skip if content hasn't changed (simple JSON comparison)
  if (existing && JSON.stringify(existing.content) === JSON.stringify(newContent)) {
    return false
  }

  await prisma.coachingMemory.upsert({
    where: { userId_sport_documentType: { userId, sport, documentType } },
    create: {
      userId,
      sport,
      documentType,
      content: newContent,
      version: 1,
      lastUpdatedBy: 'system_cron',
    },
    update: {
      content: newContent,
      version: existing ? existing.version + 1 : 1,
      lastUpdatedBy: 'system_cron',
    },
  })

  return true
}

// ════════════════════════════════════════════════
//  DOCUMENT WRITERS
// ════════════════════════════════════════════════

async function writeDraftPatterns(userId, sport, draftPatterns) {
  // Get draft grades for multi-season context
  const draftGrades = await prisma.draftGrade.findMany({
    where: {
      team: { userId },
      draft: { league: { sport: { contains: sport, mode: 'insensitive' } } },
    },
    include: {
      draft: { select: { startTime: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // Detect repeating patterns (3+ occurrences across seasons)
  const repeatingPatterns = []
  if (draftPatterns.reachFrequency > 0.3) {
    repeatingPatterns.push({
      pattern: 'Frequently reaches above ADP',
      occurrences: Math.round(draftPatterns.reachFrequency * (draftPatterns.draftCount || 1) * 10),
      severity: draftPatterns.reachFrequency > 0.5 ? 'high' : 'medium',
    })
  }

  // Track improvements
  const improvements = []
  if (draftPatterns.boardAdherence > 0.6) {
    improvements.push({ area: 'Good board adherence', since: 'current' })
  }

  const content = {
    seasonCount: draftPatterns.draftCount || 0,
    lastUpdated: new Date().toISOString().split('T')[0],
    positionAllocation: draftPatterns.positionAllocation || {},
    reachFrequency: draftPatterns.reachFrequency,
    boardAdherence: draftPatterns.boardAdherence,
    boardAdherenceTrend: null, // requires multi-season comparison — future enhancement
    repeatingPatterns,
    improvements,
    draftGrades: draftGrades.map(dg => ({
      year: dg.draft?.startTime ? new Date(dg.draft.startTime).getFullYear().toString() : 'unknown',
      grade: dg.overallGrade || null,
    })),
  }

  return upsertVaultDoc(userId, sport, 'draft_patterns', content)
}

async function writeRosterPatterns(userId, sport, rosterPatterns) {
  const content = {
    lastUpdated: new Date().toISOString().split('T')[0],
    waiverTiming: rosterPatterns.waiverTendencies?.avgDayOfWeek || 'unknown',
    tradeStyle: rosterPatterns.tradingStyle || 'unknown',
    lineupOptimizationRate: rosterPatterns.lineupOptimality?.optimalRate || null,
    holdTooLong: rosterPatterns.waiverTendencies?.avgDaysHeld > 21,
    dropTooEarly: rosterPatterns.waiverTendencies?.avgDaysHeld < 7,
    waiverWinRate: rosterPatterns.waiverTendencies?.wonClaims
      ? rosterPatterns.waiverTendencies.wonClaims / Math.max(rosterPatterns.waiverTendencies.totalClaims, 1)
      : null,
  }

  return upsertVaultDoc(userId, sport, 'roster_patterns', content)
}

async function writePredictionPatterns(userId, sport, predictionPatterns) {
  // Compute calibration note
  let calibrationNote = null
  if (predictionPatterns.accuracyByConfidence) {
    const highConf = predictionPatterns.accuracyByConfidence.high
    const lowConf = predictionPatterns.accuracyByConfidence.low
    if (highConf?.accuracy < 0.5 && highConf?.total >= 5) {
      calibrationNote = `Overconfident on high-confidence calls (${(highConf.accuracy * 100).toFixed(0)}% accuracy)`
    } else if (lowConf?.accuracy > 0.7 && lowConf?.total >= 5) {
      calibrationNote = `Underconfident — low-confidence calls hit ${(lowConf.accuracy * 100).toFixed(0)}%`
    }
  }

  // Find best and worst prediction types
  let bestType = null
  let worstType = null
  if (predictionPatterns.accuracyByType) {
    const types = Object.entries(predictionPatterns.accuracyByType)
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => b[1].accuracy - a[1].accuracy)
    if (types.length > 0) bestType = types[0][0]
    if (types.length > 1) worstType = types[types.length - 1][0]
  }

  const content = {
    lastUpdated: new Date().toISOString().split('T')[0],
    overallAccuracy: predictionPatterns.overallAccuracy,
    totalPredictions: predictionPatterns.totalPredictions,
    resolved: predictionPatterns.resolved,
    bestType,
    worstType,
    calibrationNote,
    accuracyByType: predictionPatterns.accuracyByType || {},
    streaks: predictionPatterns.streaks || null,
  }

  return upsertVaultDoc(userId, sport, 'predictions', content)
}

async function writeCoachingLog(userId, sport) {
  // Get recent coaching interactions
  const interactions = await prisma.coachingInteraction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (interactions.length === 0) return false

  const helpful = interactions.filter(i => i.userReaction === 'helpful').length
  const notUseful = interactions.filter(i => i.userReaction === 'not_useful').length
  const behaviorChanges = interactions.filter(i => i.behaviorChanged).length

  // Find topics that get ignored vs acted on
  const topicReactions = {}
  for (const i of interactions) {
    const topic = i.context || 'general'
    if (!topicReactions[topic]) topicReactions[topic] = { helpful: 0, ignored: 0 }
    if (i.userReaction === 'helpful') topicReactions[topic].helpful++
    if (i.userReaction === 'not_useful' || i.userReaction === 'ignored') topicReactions[topic].ignored++
  }

  const topIgnored = Object.entries(topicReactions)
    .filter(([, v]) => v.ignored > v.helpful)
    .map(([k]) => k)
  const topHelpful = Object.entries(topicReactions)
    .filter(([, v]) => v.helpful > v.ignored)
    .map(([k]) => k)

  const content = {
    recentInteractions: interactions.slice(0, 20).map(i => ({
      date: i.createdAt.toISOString().split('T')[0],
      type: i.insightType,
      summary: i.summary,
      reaction: i.userReaction,
      behaviorChanged: i.behaviorChanged,
    })),
    ignoredAdviceCount: notUseful + interactions.filter(i => i.userReaction === 'ignored').length,
    helpfulAdviceCount: helpful,
    behaviorChangeRate: interactions.length > 0 ? behaviorChanges / interactions.length : 0,
    topIgnoredTopics: topIgnored.slice(0, 3),
    topHelpfulTopics: topHelpful.slice(0, 3),
  }

  return upsertVaultDoc(userId, sport, 'coaching_log', content)
}

async function writeSeasonNarrative(userId, sport) {
  const currentYear = new Date().getFullYear().toString()

  // Get the user's teams for the current year in this sport
  const teams = await prisma.team.findMany({
    where: {
      userId,
      league: {
        sport: { contains: sport, mode: 'insensitive' },
        season: { contains: currentYear },
      },
    },
    include: {
      league: { select: { name: true, season: true } },
    },
  })

  if (teams.length === 0) return false

  // Build a basic season narrative from available data
  const team = teams[0] // primary team
  const narrative = {
    season: currentYear,
    sport,
    leagueName: team.league.name,
    record: `${team.wins || 0}-${team.losses || 0}`,
    totalPoints: team.totalPoints || 0,
  }

  // Don't overwrite a richer existing narrative with a bare-bones one
  const existing = await prisma.coachingMemory.findUnique({
    where: { userId_sport_documentType: { userId, sport, documentType: 'season_narrative' } },
  })
  if (existing?.content?.narrative && Object.keys(existing.content.narrative).length > 3) {
    // Existing narrative has prose sections — just update stats
    const updated = { ...existing.content, ...narrative }
    return upsertVaultDoc(userId, sport, 'season_narrative', updated)
  }

  return upsertVaultDoc(userId, sport, 'season_narrative', { narrative })
}

module.exports = {
  runMemoryWriter,
  writeVaultForUser,
}
```

**Step 2: Verify file loads**

```bash
cd /Users/ericsaylor/Desktop/Clutch/backend
node -e "const mw = require('./src/services/coachingMemoryWriter'); console.log(Object.keys(mw))"
```

Expected: `[ 'runMemoryWriter', 'writeVaultForUser' ]`

**Step 3: Commit**

```bash
git add backend/src/services/coachingMemoryWriter.js
git commit -m "feat: add Memory Writer service for weekly vault document distillation"
```

---

## Task 4: API Routes for Coach Memory

**Files:**
- Create: `backend/src/routes/coachMemory.js`
- Modify: `backend/src/index.js` (register routes)

**Step 1: Create the route file**

```javascript
/**
 * Coach Memory API Routes
 *
 * CRUD for coaching vault documents + interaction tracking.
 * All routes require authentication.
 */

const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const prisma = require('../lib/prisma.js')
const { getDefaultIdentity } = require('../services/coachContextAssembly')

// ═══════════════════════════════════════════════
//  VAULT DOCUMENTS
// ═══════════════════════════════════════════════

// GET /api/coach/memory — Get all vault documents for current user
router.get('/memory', authenticate, async (req, res) => {
  try {
    const { sport } = req.query
    const where = { userId: req.user.id }
    if (sport) where.sport = sport

    const documents = await prisma.coachingMemory.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    // Group by documentType
    const vault = {}
    for (const doc of documents) {
      vault[doc.documentType] = {
        content: doc.content,
        version: doc.version,
        lastUpdatedBy: doc.lastUpdatedBy,
        updatedAt: doc.updatedAt,
      }
    }

    res.json({ vault })
  } catch (err) {
    console.error('[CoachMemory] GET /memory error:', err.message)
    res.status(500).json({ error: { message: 'Failed to load coaching memory' } })
  }
})

// GET /api/coach/memory/:documentType — Get specific vault document
router.get('/memory/:documentType', authenticate, async (req, res) => {
  try {
    const { sport } = req.query
    const doc = await prisma.coachingMemory.findFirst({
      where: {
        userId: req.user.id,
        documentType: req.params.documentType,
        ...(sport ? { sport } : {}),
      },
    })

    if (!doc) {
      // Return default for identity
      if (req.params.documentType === 'identity') {
        return res.json({ document: { content: getDefaultIdentity(), version: 0 } })
      }
      return res.json({ document: null })
    }

    res.json({
      document: {
        content: doc.content,
        version: doc.version,
        lastUpdatedBy: doc.lastUpdatedBy,
        updatedAt: doc.updatedAt,
      },
    })
  } catch (err) {
    console.error('[CoachMemory] GET /memory/:type error:', err.message)
    res.status(500).json({ error: { message: 'Failed to load document' } })
  }
})

// ═══════════════════════════════════════════════
//  IDENTITY (User-Editable Coach Settings)
// ═══════════════════════════════════════════════

// PUT /api/coach/identity — Update identity document (Coach Settings save)
router.put('/identity', authenticate, async (req, res) => {
  try {
    const { coachingTone, coachingFrequency, riskAppetite, draftPhilosophy } = req.body

    // Get existing or create default
    const existing = await prisma.coachingMemory.findUnique({
      where: { userId_sport_documentType: { userId: req.user.id, sport: null, documentType: 'identity' } },
    })

    const currentContent = existing?.content || getDefaultIdentity()
    const updatedContent = {
      ...currentContent,
      ...(coachingTone && { coachingTone }),
      ...(coachingFrequency && { coachingFrequency }),
      ...(riskAppetite && { riskAppetite }),
      ...(draftPhilosophy && { draftPhilosophy }),
    }

    const doc = await prisma.coachingMemory.upsert({
      where: { userId_sport_documentType: { userId: req.user.id, sport: null, documentType: 'identity' } },
      create: {
        userId: req.user.id,
        sport: null,
        documentType: 'identity',
        content: updatedContent,
        version: 1,
        lastUpdatedBy: 'user_input',
      },
      update: {
        content: updatedContent,
        version: existing ? existing.version + 1 : 1,
        lastUpdatedBy: 'user_input',
      },
    })

    res.json({ identity: doc.content })
  } catch (err) {
    console.error('[CoachMemory] PUT /identity error:', err.message)
    res.status(500).json({ error: { message: 'Failed to save settings' } })
  }
})

// POST /api/coach/identity/notes — Add a user note to identity
router.post('/identity/notes', authenticate, async (req, res) => {
  try {
    const { text } = req.body
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: { message: 'Note text is required' } })
    }
    if (text.length > 500) {
      return res.status(400).json({ error: { message: 'Note must be 500 characters or less' } })
    }

    const existing = await prisma.coachingMemory.findUnique({
      where: { userId_sport_documentType: { userId: req.user.id, sport: null, documentType: 'identity' } },
    })

    const currentContent = existing?.content || getDefaultIdentity()
    const notes = currentContent.userNotes || []

    if (notes.length >= 20) {
      return res.status(400).json({ error: { message: 'Maximum 20 notes allowed' } })
    }

    notes.push({ text: text.trim(), addedAt: new Date().toISOString().split('T')[0] })
    currentContent.userNotes = notes

    await prisma.coachingMemory.upsert({
      where: { userId_sport_documentType: { userId: req.user.id, sport: null, documentType: 'identity' } },
      create: {
        userId: req.user.id,
        sport: null,
        documentType: 'identity',
        content: currentContent,
        version: 1,
        lastUpdatedBy: 'user_input',
      },
      update: {
        content: currentContent,
        version: existing ? existing.version + 1 : 1,
        lastUpdatedBy: 'user_input',
      },
    })

    res.json({ notes: currentContent.userNotes })
  } catch (err) {
    console.error('[CoachMemory] POST /identity/notes error:', err.message)
    res.status(500).json({ error: { message: 'Failed to add note' } })
  }
})

// DELETE /api/coach/identity/notes/:index — Remove a user note
router.delete('/identity/notes/:index', authenticate, async (req, res) => {
  try {
    const index = parseInt(req.params.index)

    const existing = await prisma.coachingMemory.findUnique({
      where: { userId_sport_documentType: { userId: req.user.id, sport: null, documentType: 'identity' } },
    })

    if (!existing) {
      return res.status(404).json({ error: { message: 'No identity document found' } })
    }

    const notes = existing.content?.userNotes || []
    if (index < 0 || index >= notes.length) {
      return res.status(400).json({ error: { message: 'Invalid note index' } })
    }

    notes.splice(index, 1)
    existing.content.userNotes = notes

    await prisma.coachingMemory.update({
      where: { id: existing.id },
      data: {
        content: existing.content,
        version: existing.version + 1,
        lastUpdatedBy: 'user_input',
      },
    })

    res.json({ notes })
  } catch (err) {
    console.error('[CoachMemory] DELETE /identity/notes error:', err.message)
    res.status(500).json({ error: { message: 'Failed to delete note' } })
  }
})

// ═══════════════════════════════════════════════
//  COACHING INTERACTIONS
// ═══════════════════════════════════════════════

// GET /api/coach/interactions — Get recent coaching interactions
router.get('/interactions', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query

    const interactions = await prisma.coachingInteraction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit), 50),
      skip: parseInt(offset),
    })

    const total = await prisma.coachingInteraction.count({
      where: { userId: req.user.id },
    })

    res.json({ interactions, total })
  } catch (err) {
    console.error('[CoachMemory] GET /interactions error:', err.message)
    res.status(500).json({ error: { message: 'Failed to load interactions' } })
  }
})

// PATCH /api/coach/interactions/:id/react — Submit reaction to a coaching interaction
router.patch('/interactions/:id/react', authenticate, async (req, res) => {
  try {
    const { reaction } = req.body
    if (!['helpful', 'not_useful'].includes(reaction)) {
      return res.status(400).json({ error: { message: 'Reaction must be helpful or not_useful' } })
    }

    const interaction = await prisma.coachingInteraction.findUnique({
      where: { id: req.params.id },
    })

    if (!interaction || interaction.userId !== req.user.id) {
      return res.status(404).json({ error: { message: 'Interaction not found' } })
    }

    const updated = await prisma.coachingInteraction.update({
      where: { id: req.params.id },
      data: { userReaction: reaction },
    })

    res.json({ interaction: updated })
  } catch (err) {
    console.error('[CoachMemory] PATCH /interactions/:id/react error:', err.message)
    res.status(500).json({ error: { message: 'Failed to save reaction' } })
  }
})

module.exports = router
```

**Step 2: Register routes in index.js**

In `backend/src/index.js`, find where other routes are registered (look for `app.use('/api/ai'` as landmark). Add nearby:

```javascript
const coachMemoryRoutes = require('./routes/coachMemory')
app.use('/api/coach', coachMemoryRoutes)
```

**Step 3: Add the Memory Writer cron to index.js**

Find the existing cron jobs section (look for `Wed 4 AM` Pattern Engine cron as landmark). Add after it:

```javascript
// Wednesday 4:30 AM ET — Coaching Memory Writer (runs after Pattern Engine at 4 AM)
cron.schedule('30 4 * * 3', async () => {
  cronLog('memoryWriter', 'Starting coaching memory writer')
  try {
    const { runMemoryWriter } = require('./services/coachingMemoryWriter')
    const result = await runMemoryWriter()
    cronLog('memoryWriter', `Done: ${result.updatedDocs} docs for ${result.usersProcessed} users (${result.errors} errors)`)
  } catch (e) { cronLog('memoryWriter', `Error: ${e.message}`) }
}, { timezone: 'America/New_York' })
```

**Step 4: Verify server starts**

```bash
cd /Users/ericsaylor/Desktop/Clutch/backend
npm run dev
```

Check logs — server should start without errors. Hit `curl http://localhost:3001/api/coach/memory` (should return 401 since no auth token — confirming route is registered).

**Step 5: Commit**

```bash
git add backend/src/routes/coachMemory.js backend/src/index.js
git commit -m "feat: add coach memory API routes and Memory Writer cron job"
```

---

## Task 5: Frontend API Methods

**Files:**
- Modify: `frontend/src/services/api.js`

**Step 1: Add coach memory methods to ApiService class**

Find the end of the class methods in `api.js` (before `export default new ApiService()`). Add:

```javascript
  // ═══════════════════════════════════════════════
  //  Coach Memory (Personal AI Coach Vault)
  // ═══════════════════════════════════════════════

  async getCoachVault(sport) {
    const params = sport ? `?sport=${sport}` : ''
    return this.request(`/coach/memory${params}`)
  }

  async getCoachDocument(documentType, sport) {
    const params = sport ? `?sport=${sport}` : ''
    return this.request(`/coach/memory/${documentType}${params}`)
  }

  async updateCoachIdentity(data) {
    return this.request('/coach/identity', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async addCoachNote(text) {
    return this.request('/coach/identity/notes', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }

  async deleteCoachNote(index) {
    return this.request(`/coach/identity/notes/${index}`, {
      method: 'DELETE',
    })
  }

  async getCoachInteractions(limit = 20, offset = 0) {
    return this.request(`/coach/interactions?limit=${limit}&offset=${offset}`)
  }

  async reactToCoachInteraction(id, reaction) {
    return this.request(`/coach/interactions/${id}/react`, {
      method: 'PATCH',
      body: JSON.stringify({ reaction }),
    })
  }
```

**Step 2: Commit**

```bash
git add frontend/src/services/api.js
git commit -m "feat: add coach memory API methods to frontend service"
```

---

## Task 6: Coach Settings Page

**Files:**
- Create: `frontend/src/pages/CoachSettings.jsx`
- Create: `frontend/src/hooks/useCoachMemory.js`
- Modify: `frontend/src/App.jsx` (add route)

**Step 1: Create the useCoachMemory hook**

```javascript
import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useCoachMemory() {
  const [identity, setIdentity] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Load identity document + recent interactions
  useEffect(() => {
    Promise.all([
      api.getCoachDocument('identity'),
      api.getCoachInteractions(20),
    ])
      .then(([identityRes, interactionsRes]) => {
        setIdentity(identityRes.document?.content || {
          coachingTone: 'encouraging',
          coachingFrequency: 'daily',
          riskAppetite: 'balanced',
          draftPhilosophy: ['best_available'],
          favoriteTeams: [],
          statedBiases: [],
          userNotes: [],
        })
        setInteractions(interactionsRes.interactions || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const updateIdentity = useCallback(async (updates) => {
    setSaving(true)
    setError(null)
    try {
      const res = await api.updateCoachIdentity(updates)
      setIdentity(res.identity)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [])

  const addNote = useCallback(async (text) => {
    setError(null)
    try {
      const res = await api.addCoachNote(text)
      setIdentity(prev => ({ ...prev, userNotes: res.notes }))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const deleteNote = useCallback(async (index) => {
    setError(null)
    try {
      const res = await api.deleteCoachNote(index)
      setIdentity(prev => ({ ...prev, userNotes: res.notes }))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const reactToInteraction = useCallback(async (id, reaction) => {
    try {
      await api.reactToCoachInteraction(id, reaction)
      setInteractions(prev =>
        prev.map(i => i.id === id ? { ...i, userReaction: reaction } : i)
      )
    } catch (err) {
      setError(err.message)
    }
  }, [])

  return {
    identity,
    interactions,
    loading,
    saving,
    error,
    updateIdentity,
    addNote,
    deleteNote,
    reactToInteraction,
  }
}
```

**Step 2: Create the CoachSettings page**

```jsx
import { useState } from 'react'
import { useCoachMemory } from '../hooks/useCoachMemory'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import NeuralCluster from '../components/common/NeuralCluster'

const TONE_OPTIONS = [
  { value: 'encouraging', label: 'Encouraging', desc: 'Positive reinforcement, celebrates wins' },
  { value: 'direct', label: 'Direct', desc: 'Blunt feedback, no sugarcoating' },
  { value: 'analytical', label: 'Analytical', desc: 'Data-driven, statistical framing' },
]

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily nudges' },
  { value: 'weekly', label: 'Weekly summaries' },
  { value: 'on_demand', label: 'Only when I ask' },
]

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'aggressive', label: 'Aggressive' },
]

const PHILOSOPHY_OPTIONS = [
  { value: 'best_available', label: 'Best Available' },
  { value: 'position_scarcity', label: 'Position Scarcity' },
  { value: 'stars_and_scrubs', label: 'Stars & Scrubs' },
  { value: 'zero_rb', label: 'Zero RB' },
  { value: 'heavy_rb', label: 'Heavy RB' },
]

const CoachSettings = () => {
  const {
    identity, interactions, loading, saving, error,
    updateIdentity, addNote, deleteNote, reactToInteraction,
  } = useCoachMemory()

  const [noteText, setNoteText] = useState('')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <NeuralCluster size="md" intensity="thinking" />
      </div>
    )
  }

  const handleToneChange = (tone) => updateIdentity({ coachingTone: tone })
  const handleFrequencyChange = (freq) => updateIdentity({ coachingFrequency: freq })
  const handleRiskChange = (risk) => updateIdentity({ riskAppetite: risk })

  const handlePhilosophyToggle = (value) => {
    const current = identity?.draftPhilosophy || []
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    updateIdentity({ draftPhilosophy: updated })
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    await addNote(noteText.trim())
    setNoteText('')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <NeuralCluster size="sm" intensity="calm" />
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-1)]">Coach Settings</h1>
          <p className="text-[var(--text-3)] font-body text-sm">
            Customize how your AI coach communicates with you
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Section 1: Coaching Preferences */}
      <Card className="mb-6">
        <h2 className="font-display text-lg font-bold text-[var(--text-1)] mb-4">Coaching Style</h2>

        {/* Tone */}
        <div className="mb-6">
          <label className="block text-sm font-body font-medium text-[var(--text-2)] mb-2">Tone</label>
          <div className="flex gap-2">
            {TONE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleToneChange(opt.value)}
                disabled={saving}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                  identity?.coachingTone === opt.value
                    ? 'bg-blaze text-white'
                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-blaze'
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs opacity-75 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div className="mb-6">
          <label className="block text-sm font-body font-medium text-[var(--text-2)] mb-2">Frequency</label>
          <div className="flex gap-2">
            {FREQUENCY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleFrequencyChange(opt.value)}
                disabled={saving}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                  identity?.coachingFrequency === opt.value
                    ? 'bg-blaze text-white'
                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-blaze'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Appetite */}
        <div className="mb-6">
          <label className="block text-sm font-body font-medium text-[var(--text-2)] mb-2">Risk Appetite</label>
          <div className="flex gap-2">
            {RISK_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleRiskChange(opt.value)}
                disabled={saving}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                  identity?.riskAppetite === opt.value
                    ? 'bg-blaze text-white'
                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-blaze'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Draft Philosophy */}
        <div>
          <label className="block text-sm font-body font-medium text-[var(--text-2)] mb-2">Draft Philosophy</label>
          <div className="flex flex-wrap gap-2">
            {PHILOSOPHY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handlePhilosophyToggle(opt.value)}
                disabled={saving}
                className={`px-3 py-1.5 rounded-full text-sm font-body transition-colors ${
                  (identity?.draftPhilosophy || []).includes(opt.value)
                    ? 'bg-blaze text-white'
                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-blaze'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Section 2: Tell Your Coach */}
      <Card className="mb-6">
        <h2 className="font-display text-lg font-bold text-[var(--text-1)] mb-2">Tell Your Coach</h2>
        <p className="text-[var(--text-3)] text-sm mb-4">
          Share anything your coach should know — biases, preferences, league context
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
            placeholder="e.g., I'm a homer for Ohio State players"
            maxLength={500}
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-1)] text-sm font-body placeholder:text-[var(--text-3)] focus:outline-none focus:border-blaze"
          />
          <Button onClick={handleAddNote} disabled={!noteText.trim()} size="sm">
            Save
          </Button>
        </div>

        {(identity?.userNotes || []).length > 0 && (
          <div className="space-y-2">
            {identity.userNotes.map((note, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div>
                  <span className="text-sm text-[var(--text-1)] font-body">{note.text}</span>
                  <span className="text-xs text-[var(--text-3)] ml-2">{note.addedAt}</span>
                </div>
                <button
                  onClick={() => deleteNote(i)}
                  className="text-[var(--text-3)] hover:text-red-500 transition-colors text-sm ml-2"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section 3: Coaching History */}
      <Card>
        <h2 className="font-display text-lg font-bold text-[var(--text-1)] mb-4">Coaching History</h2>

        {interactions.length === 0 ? (
          <p className="text-[var(--text-3)] text-sm font-body">
            No coaching interactions yet. As your coach delivers insights, they'll appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {interactions.map(interaction => (
              <div key={interaction.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-1)] font-body">{interaction.summary}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--text-3)]">
                      {new Date(interaction.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--text-3)]">
                      {interaction.insightType}
                    </span>
                    {interaction.context && (
                      <span className="text-xs text-[var(--text-3)]">• {interaction.context}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => reactToInteraction(interaction.id, 'helpful')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      interaction.userReaction === 'helpful'
                        ? 'bg-field text-white'
                        : 'bg-[var(--surface)] text-[var(--text-3)] hover:bg-field/20'
                    }`}
                  >
                    👍
                  </button>
                  <button
                    onClick={() => reactToInteraction(interaction.id, 'not_useful')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      interaction.userReaction === 'not_useful'
                        ? 'bg-red-500 text-white'
                        : 'bg-[var(--surface)] text-[var(--text-3)] hover:bg-red-500/20'
                    }`}
                  >
                    👎
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default CoachSettings
```

**Step 3: Add route to App.jsx**

Find the route imports section in `frontend/src/App.jsx` and add:

```javascript
import CoachSettings from './pages/CoachSettings'
```

Then find the route definitions (look for existing routes like `/profile`) and add:

```jsx
<Route path="/coach/settings" element={<CoachSettings />} />
```

**Step 4: Verify page loads**

Start frontend dev server, navigate to `/coach/settings`. Should show the Coach Settings page with defaults (no vault data yet).

**Step 5: Commit**

```bash
git add frontend/src/pages/CoachSettings.jsx frontend/src/hooks/useCoachMemory.js frontend/src/App.jsx
git commit -m "feat: add Coach Settings page with preferences, notes, and interaction history"
```

---

## Task 7: Wire Existing Coach System to Read Vault Context

**Files:**
- Modify: `backend/src/routes/ai.js` (coach briefing reads vault)
- Modify: `backend/src/services/aiInsightPipeline.js` (log interactions to CoachingInteraction)

**Step 1: Update coach briefing to read vault identity**

In `backend/src/routes/ai.js`, at the top of the `GET /coach-briefing` handler (after the cache check), add a vault identity lookup:

```javascript
// Read user's coaching identity from vault (if exists)
const { assembleCoachContext } = require('../services/coachContextAssembly')
const coachCtx = await assembleCoachContext(userId, { type: 'briefing', sport: sport || 'golf' })
const coachTone = coachCtx.identity?.coachingTone || 'encouraging'
```

Then wherever the briefing generates `headline` and `body` text, use `coachTone` to adjust language. For now, a simple prefix approach works:

```javascript
// Adjust tone based on vault identity
function adjustTone(text, tone) {
  // Direct tone stays as-is. Analytical adds data framing. Encouraging adds positive spin.
  // For V1, just return as-is — tone adaptation comes when AI generates text
  return text
}
```

This is a thin wire-up for now. The real tone adaptation happens when AI-generated coaching reads the full context.

**Step 2: Log coaching interactions in the insight pipeline**

In `backend/src/services/aiInsightPipeline.js`, find where insights are saved to `AiInsight` (look for `prisma.aiInsight.create`). After each successful insight creation, also create a `CoachingInteraction`:

```javascript
// Log to coaching interaction history
try {
  await prisma.coachingInteraction.create({
    data: {
      userId: insight.userId,
      insightType: 'ambient',
      summary: insight.title,
      context: insight.insightType,
    },
  })
} catch (err) {
  // Non-critical — don't fail the insight pipeline
  console.error('[InsightPipeline] Failed to log coaching interaction:', err.message)
}
```

**Step 3: Verify server starts and briefing still works**

```bash
cd /Users/ericsaylor/Desktop/Clutch/backend && npm run dev
```

**Step 4: Commit**

```bash
git add backend/src/routes/ai.js backend/src/services/aiInsightPipeline.js
git commit -m "feat: wire coach briefing to vault identity, log insight interactions"
```

---

## Task 8: Navigation Link + Final Verification

**Files:**
- Modify: Frontend nav component (wherever Profile dropdown lives)

**Step 1: Add Coach Settings link to profile dropdown**

Find the profile/user dropdown in the Navbar component. Look for existing links like "Profile" or "Settings". Add a link:

```jsx
<Link to="/coach/settings" className="...existing-dropdown-link-classes...">
  Coach Settings
</Link>
```

Use the same styling as adjacent dropdown items.

**Step 2: Manual end-to-end verification**

1. Navigate to `/coach/settings` — page loads with defaults
2. Change coaching tone to "Direct" — saves without error
3. Add a note: "I always overthink QB picks" — appears in list
4. Delete the note — disappears
5. Check coaching history section — shows "No coaching interactions yet" (expected for fresh vault)
6. Check `/api/coach/memory` in browser (with auth) — returns vault with identity document

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Coach Settings nav link and finalize AI coach vault integration"
```

---

## Summary

| Task | What | New Files | Modified Files |
|------|------|-----------|---------------|
| 1 | Database migration | migration/ | schema.prisma |
| 2 | Context assembly service | coachContextAssembly.js | — |
| 3 | Memory Writer service | coachingMemoryWriter.js | — |
| 4 | API routes + cron | coachMemory.js | index.js |
| 5 | Frontend API methods | — | api.js |
| 6 | Coach Settings page | CoachSettings.jsx, useCoachMemory.js | App.jsx |
| 7 | Wire existing coach to vault | — | ai.js, aiInsightPipeline.js |
| 8 | Nav link + verification | — | Navbar component |

**Total: 6 new files, 6 modified files, 1 migration, 8 commits.**
