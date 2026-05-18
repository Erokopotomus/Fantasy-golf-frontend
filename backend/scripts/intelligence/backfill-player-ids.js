/**
 * One-time backfill CLI wrapper.
 * For production use, prefer the admin HTTP endpoint at
 *   POST /api/admin/intelligence/backfill-player-ids
 * which runs inside Railway (no proxy).
 *
 * Usage:
 *   node backend/scripts/intelligence/backfill-player-ids.js
 *   node backend/scripts/intelligence/backfill-player-ids.js --dry-run
 */

const { runBackfill, summarizeMisses } = require('../../src/services/intelligence/playerIdBackfill')
const fs = require('fs')
const path = require('path')

const DRY_RUN = process.argv.includes('--dry-run')

;(async () => {
  console.log(DRY_RUN ? '[DRY RUN] No writes will occur.' : '[LIVE] Running with writes enabled.')

  const { stats, misses, durationMs } = await runBackfill({
    dryRun: DRY_RUN,
    onProgress: async ({ picksProcessed, totalPicksEstimate, stats }) => {
      const pct = totalPicksEstimate > 0 ? Math.round((picksProcessed / totalPicksEstimate) * 100) : 0
      console.log(`[${pct}%] ${picksProcessed}/${totalPicksEstimate} picks · exact=${stats.exactMatch} fuzzy=${stats.fuzzyMatchEnriched} missed=${stats.missed}`)
    },
  })

  console.log(`\n=== Backfill complete in ${(durationMs / 1000).toFixed(1)}s ===`)
  console.log(JSON.stringify(stats, null, 2))

  if (misses.length > 0) {
    const outDir = path.join(__dirname, '_misses')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outPath = path.join(outDir, `misses-${DRY_RUN ? 'dryrun-' : ''}${stamp}.json`)
    fs.writeFileSync(outPath, JSON.stringify(misses, null, 2))
    console.log(`\n${misses.length} misses written to: ${outPath}`)

    const byPlatform = summarizeMisses(misses)
    console.log('\nMisses by platform:')
    for (const [p, data] of Object.entries(byPlatform)) {
      console.log(`  ${p}: ${data.count} misses. Samples: ${data.samples.join(', ')}`)
    }
  }

  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
