const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const { runBackfill, summarizeMisses } = require('../services/intelligence/playerIdBackfill')

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

module.exports = router
