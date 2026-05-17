/**
 * One-time backfill: resolve raw platform player IDs across all
 * HistoricalSeason.draftData rows, populating Player.{platform}Id
 * columns via playerMatcher.matchAndLink as a side effect.
 *
 * Safe to re-run — exact platform-ID hits short-circuit without writes.
 *
 * Usage:
 *   node backend/scripts/intelligence/backfill-player-ids.js
 *   node backend/scripts/intelligence/backfill-player-ids.js --dry-run
 */

const prisma = require('../../src/lib/prisma')
const { matchAndLink, matchPlayer } = require('../../src/services/playerMatcher')
const fs = require('fs')
const path = require('path')

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(DRY_RUN ? '[DRY RUN] No writes will occur.' : '[LIVE] Running with writes enabled.')
  const start = Date.now()

  // Fetch every historical season with draftData. Include import platform.
  const seasons = await prisma.historicalSeason.findMany({
    where: { draftData: { not: null } },
    select: {
      id: true,
      leagueId: true,
      seasonYear: true,
      ownerName: true,
      draftData: true,
      import: { select: { sourcePlatform: true } },
    },
  })

  console.log(`Found ${seasons.length} HistoricalSeason rows with draftData`)

  const stats = {
    totalPicks: 0,
    skippedNoPlatform: 0,
    skippedNoPlayerId: 0,
    skippedFantrax: 0, // Fantrax has no platform IDs by design
    skippedMflNoName: 0,
    exactMatch: 0,
    fuzzyMatchEnriched: 0,
    missed: 0,
    errors: 0,
  }
  const misses = [] // collect for audit JSON

  for (const season of seasons) {
    const platform = season.import?.sourcePlatform?.toLowerCase()
    if (!platform) { stats.skippedNoPlatform++; continue }
    if (platform === 'fantrax') { stats.skippedFantrax++; continue }

    const picks = Array.isArray(season.draftData?.picks) ? season.draftData.picks : []

    for (const pick of picks) {
      stats.totalPicks++

      if (!pick.playerId) { stats.skippedNoPlayerId++; continue }
      if (platform === 'mfl' && !pick.playerName) { stats.skippedMflNoName++; /* still try */ }

      try {
        // Snapshot whether the Player.{platform}Id column was populated BEFORE matchAndLink
        const idField = `${platform}Id`
        const preMatch = await prisma.player.findFirst({
          where: { [idField]: String(pick.playerId) },
          select: { id: true },
        })

        if (DRY_RUN) {
          if (preMatch) { stats.exactMatch++; continue }
          // Dry-run a fuzzy lookup without enriching
          const fuzzy = await matchPlayer({
            name: pick.playerName,
            platform,
            platformId: pick.playerId,
            position: pick.position,
            sport: 'nfl',
          }, prisma)
          if (fuzzy) { stats.fuzzyMatchEnriched++; continue }
          stats.missed++
          misses.push({
            platform,
            playerId: pick.playerId,
            playerName: pick.playerName,
            position: pick.position,
            seasonYear: season.seasonYear,
            ownerName: season.ownerName,
            leagueId: season.leagueId,
          })
          continue
        }

        const matched = await matchAndLink({
          name: pick.playerName,
          platform,
          platformId: String(pick.playerId),
          position: pick.position,
          sport: 'nfl',
        }, prisma, { createIfMissing: false })

        if (matched) {
          if (preMatch) stats.exactMatch++
          else stats.fuzzyMatchEnriched++
        } else {
          stats.missed++
          misses.push({
            platform,
            playerId: pick.playerId,
            playerName: pick.playerName,
            position: pick.position,
            seasonYear: season.seasonYear,
            ownerName: season.ownerName,
            leagueId: season.leagueId,
          })
        }
      } catch (e) {
        stats.errors++
        console.warn(`[backfill] error on ${platform} pick ${pick.playerName} (${pick.playerId}):`, e.message)
      }
    }
  }

  const durationS = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n=== Backfill complete in ${durationS}s ===`)
  console.log(JSON.stringify(stats, null, 2))

  // Write misses to JSON for audit (PIR-3)
  if (misses.length > 0) {
    const outDir = path.join(__dirname, '_misses')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outPath = path.join(outDir, `misses-${DRY_RUN ? 'dryrun-' : ''}${stamp}.json`)
    fs.writeFileSync(outPath, JSON.stringify(misses, null, 2))
    console.log(`\n${misses.length} misses written to: ${outPath}`)

    // Print top miss platforms + sample names
    const byPlatform = {}
    for (const m of misses) {
      byPlatform[m.platform] = byPlatform[m.platform] || { count: 0, samples: new Set() }
      byPlatform[m.platform].count++
      if (byPlatform[m.platform].samples.size < 10) {
        byPlatform[m.platform].samples.add(m.playerName || '(no name)')
      }
    }
    console.log('\nMisses by platform:')
    for (const [p, data] of Object.entries(byPlatform)) {
      console.log(`  ${p}: ${data.count} misses. Samples: ${[...data.samples].join(', ')}`)
    }
  }

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
