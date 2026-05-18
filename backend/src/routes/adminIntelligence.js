const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const { runBackfill, summarizeMisses } = require('../services/intelligence/playerIdBackfill')

// All admin intelligence routes require auth + admin role
router.use(authenticate, requireAdmin)

/**
 * POST /api/admin/intelligence/backfill-player-ids?dryRun=true|false
 *
 * Streams chunked progress lines (NDJSON), one per ~200 picks.
 * Each line: { type: 'progress' | 'done' | 'error', ... }
 *
 * To run:
 *   curl -N -X POST \
 *     -H "Authorization: Bearer $TOKEN" \
 *     "https://clutch-production-8def.up.railway.app/api/admin/intelligence/backfill-player-ids?dryRun=false"
 */
router.post('/backfill-player-ids', async (req, res) => {
  const dryRun = req.query.dryRun === 'true'

  // Disable Express response timeout for this long-running endpoint
  req.setTimeout(0)
  res.setTimeout(0)

  // Set NDJSON streaming headers
  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.flushHeaders?.()

  const emit = (obj) => {
    try {
      res.write(JSON.stringify(obj) + '\n')
    } catch (e) {
      // Client disconnected — backfill continues, but we can't stream
    }
  }

  try {
    emit({ type: 'start', dryRun, timestamp: new Date().toISOString() })

    const { stats, misses, durationMs } = await runBackfill({
      dryRun,
      onProgress: async ({ picksProcessed, totalPicksEstimate, currentSeasonIndex, totalSeasons, stats }) => {
        emit({
          type: 'progress',
          picksProcessed,
          totalPicksEstimate,
          currentSeasonIndex,
          totalSeasons,
          stats,
        })
      },
    })

    const byPlatform = summarizeMisses(misses)
    emit({
      type: 'done',
      dryRun,
      durationMs,
      stats,
      missesByPlatform: byPlatform,
      missesCount: misses.length,
    })
  } catch (e) {
    emit({ type: 'error', message: e.message, stack: e.stack })
  } finally {
    res.end()
  }
})

module.exports = router
