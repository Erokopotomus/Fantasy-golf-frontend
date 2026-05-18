const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const { runBackfill, summarizeMisses } = require('../services/intelligence/playerIdBackfill')
const prisma = require('../lib/prisma')
const { runForUser, EXTRACTORS } = require('../services/intelligence')
const { aggregateAll } = require('../services/intelligence/aggregateCron')
const { CHARACTERISTIC_META } = require('../services/intelligence/characteristicMeta')

/** Set of valid characteristic types — derived from registered EXTRACTORS for safety. */
const VALID_TYPES = new Set(EXTRACTORS.map((e) => e.type))

/** 404 helper for unknown :type. */
function ensureValidType(type, res) {
  if (!VALID_TYPES.has(type)) {
    res.status(404).json({ error: `Unknown characteristic type: ${type}` })
    return false
  }
  return true
}

// Single in-memory job state. Persists across requests in this Node process,
// resets on Railway restart (acceptable for a one-shot backfill).
let currentJob = {
  id: null,
  status: 'idle',           // 'idle' | 'running' | 'done' | 'failed'
  dryRun: null,
  startedAt: null,
  finishedAt: null,
  progress: null,           // { picksProcessed, totalPicksEstimate, currentSeasonIndex, totalSeasons, stats }
  result: null,             // { stats, missesByPlatform, missesCount, durationMs } when done
  error: null,
}

router.use(authenticate, requireAdmin)

/**
 * POST /api/admin/intelligence/backfill-player-ids?dryRun=true|false
 *
 * Kicks off the backfill in a background promise. Returns immediately.
 * Poll /backfill-status to see progress + final result.
 *
 * If a job is already running, returns 409 with the existing jobId.
 */
router.post('/backfill-player-ids', async (req, res) => {
  if (currentJob.status === 'running') {
    return res.status(409).json({
      error: 'already_running',
      jobId: currentJob.id,
      startedAt: currentJob.startedAt,
      progress: currentJob.progress,
    })
  }

  const dryRun = req.query.dryRun === 'true'
  const jobId = `backfill-${Date.now()}`

  currentJob = {
    id: jobId,
    status: 'running',
    dryRun,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    progress: { picksProcessed: 0, totalPicksEstimate: 0, currentSeasonIndex: 0, totalSeasons: 0, stats: null },
    result: null,
    error: null,
  }

  // Fire and forget — let the request return immediately
  ;(async () => {
    try {
      const { stats, misses, durationMs } = await runBackfill({
        dryRun,
        onProgress: async (progress) => {
          // Mutate the in-memory job state on each progress callback
          currentJob.progress = progress
        },
      })
      currentJob.status = 'done'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.result = {
        stats,
        missesByPlatform: summarizeMisses(misses),
        missesCount: misses.length,
        durationMs,
      }
    } catch (e) {
      currentJob.status = 'failed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.error = { message: e.message, stack: e.stack }
      console.error('[backfill] failed:', e)
    }
  })()

  res.json({
    jobId,
    status: 'running',
    dryRun,
    startedAt: currentJob.startedAt,
    pollUrl: '/api/admin/intelligence/backfill-status',
  })
})

/**
 * GET /api/admin/intelligence/backfill-status
 *
 * Returns the current job state. Status is one of:
 *   - 'idle': no job has ever run on this process
 *   - 'running': in progress, see .progress
 *   - 'done': finished successfully, see .result
 *   - 'failed': errored out, see .error
 */
router.get('/backfill-status', (req, res) => {
  res.json(currentJob)
})

// ============================================================================
// MI-14: Manager Intelligence admin API
// Library / Detail / User Profile pages (MI-15/16/17) plus admin overrides.
// ============================================================================

/**
 * GET /api/admin/intelligence/library
 *
 * Returns every characteristic in the registry with its display metadata and
 * the latest aggregate snapshot (HIGH/MED/LOW counts, totals, avg score, admin
 * flags). Used by the admin Library page (MI-15).
 *
 * If no CharacteristicAggregate row exists yet for a type (cron hasn't fired
 * since the type was added), aggregate fields are returned as null with
 * aggregatePending: true so the frontend can distinguish "no data yet" from
 * "zero users have this characteristic."
 */
router.get('/library', async (req, res) => {
  try {
    const aggregates = await prisma.characteristicAggregate.findMany()
    const aggByType = new Map(aggregates.map((a) => [a.characteristicType, a]))

    const characteristics = EXTRACTORS.map(({ type }) => {
      const meta = CHARACTERISTIC_META[type] || {
        displayName: type,
        description: '',
        category: 'unknown',
      }
      const agg = aggByType.get(type)
      if (agg) {
        return {
          type,
          displayName: meta.displayName,
          description: meta.description,
          category: meta.category,
          totalUsers: agg.totalUsers,
          usersWithData: agg.usersWithData,
          highConfidenceCount: agg.highConfidenceCount,
          medConfidenceCount: agg.medConfidenceCount,
          lowConfidenceCount: agg.lowConfidenceCount,
          // noDataCount from last nightly cron — may drift up to 24h as new users join
          noDataCount: agg.noDataCount,
          avgConfidenceScore: agg.avgConfidenceScore,
          promoteToCoach: agg.promoteToCoach,
          suppressed: agg.suppressed,
          thresholdsOverride: agg.thresholdsOverride ?? null,
          adminNotes: agg.adminNotes ?? null,
          computedAt: agg.computedAt ?? null,
          aggregatePending: false,
        }
      }
      // No aggregate row yet — surface as pending rather than faking values.
      return {
        type,
        displayName: meta.displayName,
        description: meta.description,
        category: meta.category,
        totalUsers: null,
        usersWithData: null,
        highConfidenceCount: null,
        medConfidenceCount: null,
        lowConfidenceCount: null,
        noDataCount: null,
        avgConfidenceScore: null,
        promoteToCoach: false,
        suppressed: false,
        thresholdsOverride: null,
        adminNotes: null,
        computedAt: null,
        aggregatePending: true,
      }
    })

    res.json({ characteristics })
  } catch (e) {
    console.error('[adminIntelligence] GET /library failed:', e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/admin/intelligence/characteristics/:type
 *
 * Returns:
 *   - meta: display metadata for this characteristic
 *   - aggregate: the CharacteristicAggregate row (or null)
 *   - topUsers: up to 25 users with this characteristic, ordered by confidence DESC,
 *               with identity (displayName, username) joined from User
 *   - distribution: 10-bucket histogram of confidenceScore (0-9, 10-19, ..., 90-100)
 *     Buckets 0-8 are half-open [lo, hi); the top bucket "90-100" is inclusive.
 *
 * 404 if :type isn't a registered extractor.
 */
router.get('/characteristics/:type', async (req, res) => {
  const { type } = req.params
  if (!ensureValidType(type, res)) return

  try {
    const meta = CHARACTERISTIC_META[type] || { displayName: type, description: '', category: 'unknown' }
    const aggregate = await prisma.characteristicAggregate.findUnique({
      where: { characteristicType: type },
    })

    const allRows = await prisma.managerCharacteristic.findMany({
      where: { characteristicType: type },
      orderBy: { confidenceScore: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, username: true },
        },
      },
    })

    const topUsers = allRows.slice(0, 25).map((row) => ({
      userId: row.userId,
      displayName: row.user?.name || null,
      username: row.user?.username || null,
      value: row.value,
      sampleSize: row.sampleSize,
      consistencyPct: row.consistencyPct,
      effectSize: row.effectSize,
      confidenceScore: row.confidenceScore,
      confidenceLabel: row.confidenceLabel,
      computedAt: row.computedAt,
    }))

    // 10-bucket histogram of confidenceScore. Buckets 0-8 are half-open
    // [lo, hi) per Math.floor(score/10); the final bucket "90-100" is
    // inclusive on both ends (score 100 lands there).
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      label: i === 9 ? '90-100' : `${i * 10}-${i * 10 + 9}`,
      count: 0,
    }))
    for (const row of allRows) {
      const s = row.confidenceScore
      // Clamp to [0, 99.999] then floor / 10 to land in 0..9
      const idx = Math.min(9, Math.max(0, Math.floor((s ?? 0) / 10)))
      buckets[idx].count += 1
    }

    res.json({
      type,
      meta,
      aggregate,
      topUsers,
      distribution: { buckets },
    })
  } catch (e) {
    console.error(`[adminIntelligence] GET /characteristics/${type} failed:`, e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/admin/intelligence/users/:userId
 *
 * Returns full intelligence profile for one user — identity + import summary +
 * every characteristic row with its raw evidence. Used by the admin User Profile
 * page (MI-17).
 *
 * 404 if userId doesn't exist.
 */
router.get('/users/:userId', async (req, res) => {
  const { userId } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, email: true },
    })
    if (!user) {
      return res.status(404).json({ error: `User not found: ${userId}` })
    }

    // Import summary
    const imports = await prisma.leagueImport.findMany({
      where: { userId },
      select: { id: true, sourcePlatform: true, status: true },
    })
    const seasonsClaimed = await prisma.historicalSeason.count({
      where: { ownerUserId: userId },
    })
    const platforms = Array.from(new Set(imports.map((i) => i.sourcePlatform))).sort()

    // Characteristics — one query, attach meta in JS to avoid N+1
    const rows = await prisma.managerCharacteristic.findMany({
      where: { userId },
      orderBy: { confidenceScore: 'desc' },
    })

    const characteristics = rows.map((row) => {
      const meta = CHARACTERISTIC_META[row.characteristicType] || {
        displayName: row.characteristicType,
        description: '',
        category: 'unknown',
      }
      return {
        type: row.characteristicType,
        meta,
        value: row.value,
        sampleSize: row.sampleSize,
        consistencyPct: row.consistencyPct,
        effectSize: row.effectSize,
        confidenceScore: row.confidenceScore,
        confidenceLabel: row.confidenceLabel,
        rawEvidence: row.rawEvidence,
        sourceImportIds: row.sourceImportIds,
        computedAt: row.computedAt,
      }
    })

    res.json({
      user: {
        id: user.id,
        displayName: user.name,
        username: user.username,
        email: user.email,
      },
      importSummary: {
        importCount: imports.length,
        seasonsClaimed,
        platforms,
      },
      characteristics,
    })
  } catch (e) {
    console.error(`[adminIntelligence] GET /users/${userId} failed:`, e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * POST /api/admin/intelligence/characteristics/:type/thresholds
 * Body: { highMinN, highMinConsistency, medMinN, medMinConsistency }
 *
 * Persists thresholdsOverride on CharacteristicAggregate. All four fields
 * required and must be numbers. Returns the updated aggregate row.
 */
router.post('/characteristics/:type/thresholds', async (req, res) => {
  const { type } = req.params
  if (!ensureValidType(type, res)) return

  const { highMinN, highMinConsistency, medMinN, medMinConsistency } = req.body || {}
  const allNumbers = [highMinN, highMinConsistency, medMinN, medMinConsistency].every(
    (v) => typeof v === 'number' && Number.isFinite(v)
  )
  if (!allNumbers) {
    return res.status(400).json({
      error: 'thresholds must contain numeric highMinN, highMinConsistency, medMinN, medMinConsistency',
    })
  }

  try {
    const thresholdsOverride = { highMinN, highMinConsistency, medMinN, medMinConsistency }
    const aggregate = await prisma.characteristicAggregate.upsert({
      where: { characteristicType: type },
      create: {
        characteristicType: type,
        totalUsers: 0,
        usersWithData: 0,
        thresholdsOverride,
      },
      update: { thresholdsOverride },
    })
    res.json({ aggregate })
  } catch (e) {
    console.error(`[adminIntelligence] POST /characteristics/${type}/thresholds failed:`, e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * POST /api/admin/intelligence/characteristics/:type/toggle-promote
 * Body: { enabled: boolean }
 */
router.post('/characteristics/:type/toggle-promote', async (req, res) => {
  const { type } = req.params
  if (!ensureValidType(type, res)) return

  const { enabled } = req.body || {}
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be boolean' })
  }

  try {
    const aggregate = await prisma.characteristicAggregate.upsert({
      where: { characteristicType: type },
      create: {
        characteristicType: type,
        totalUsers: 0,
        usersWithData: 0,
        promoteToCoach: enabled,
      },
      update: { promoteToCoach: enabled },
    })
    res.json({ aggregate })
  } catch (e) {
    console.error(`[adminIntelligence] POST /characteristics/${type}/toggle-promote failed:`, e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * POST /api/admin/intelligence/characteristics/:type/toggle-suppress
 * Body: { suppressed: boolean }
 */
router.post('/characteristics/:type/toggle-suppress', async (req, res) => {
  const { type } = req.params
  if (!ensureValidType(type, res)) return

  const { suppressed } = req.body || {}
  if (typeof suppressed !== 'boolean') {
    return res.status(400).json({ error: 'suppressed must be boolean' })
  }

  try {
    const aggregate = await prisma.characteristicAggregate.upsert({
      where: { characteristicType: type },
      create: {
        characteristicType: type,
        totalUsers: 0,
        usersWithData: 0,
        suppressed,
      },
      update: { suppressed },
    })
    res.json({ aggregate })
  } catch (e) {
    console.error(`[adminIntelligence] POST /characteristics/${type}/toggle-suppress failed:`, e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * POST /api/admin/intelligence/characteristics/:type/notes
 * Body: { notes: string }
 */
router.post('/characteristics/:type/notes', async (req, res) => {
  const { type } = req.params
  if (!ensureValidType(type, res)) return

  const { notes } = req.body || {}
  if (typeof notes !== 'string') {
    return res.status(400).json({ error: 'notes must be a string' })
  }

  try {
    const aggregate = await prisma.characteristicAggregate.upsert({
      where: { characteristicType: type },
      create: {
        characteristicType: type,
        totalUsers: 0,
        usersWithData: 0,
        adminNotes: notes,
      },
      update: { adminNotes: notes },
    })
    res.json({ aggregate })
  } catch (e) {
    console.error(`[adminIntelligence] POST /characteristics/${type}/notes failed:`, e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * POST /api/admin/intelligence/users/:userId/recompute
 *
 * Synchronously re-runs all extractors for one user. Admin pressed a button
 * and is watching for feedback — so we await the run and return the
 * { ok, failed, skipped } summary directly. 404 if user doesn't exist.
 */
router.post('/users/:userId/recompute', async (req, res) => {
  const { userId } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return res.status(404).json({ error: `User not found: ${userId}` })
    }

    const result = await runForUser(userId, { db: prisma })
    res.json({ userId, ...result })
  } catch (e) {
    console.error(`[adminIntelligence] POST /users/${userId}/recompute failed:`, e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * POST /api/admin/intelligence/aggregate-now
 *
 * Synchronously recompute every CharacteristicAggregate row. The "refresh
 * aggregates" admin button — bypasses the 3 AM ET nightly cron. Cheap
 * (one groupBy per type), safe to call on-demand.
 */
router.post('/aggregate-now', async (req, res) => {
  try {
    const result = await aggregateAll({ db: prisma })
    res.json(result)
  } catch (e) {
    console.error('[adminIntelligence] POST /aggregate-now failed:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
