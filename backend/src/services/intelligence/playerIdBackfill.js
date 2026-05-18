const prisma = require('../../lib/prisma')

/**
 * Normalize a player name for fuzzy matching. Mirrors playerMatcher.js.
 */
function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\bjr\.?\b/g, '')
    .replace(/\bsr\.?\b/g, '')
    .replace(/\biii\b/g, '')
    .replace(/\bii\b/g, '')
    .replace(/\biv\b/g, '')
    .replace(/[.''-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build in-memory lookup structures from a list of Player rows.
 * Returns:
 *   byPlatformId: Map<`${platform}:${platformId}`, Player>
 *   byNormalizedName: Map<normalizedName, Player[]> (multiple players can share a normalized name in rare cases)
 *   byLastName: Map<lastName, Player[]>
 */
function buildPlayerCaches(players) {
  const byPlatformId = new Map()
  const byNormalizedName = new Map()
  const byLastName = new Map()

  const platforms = ['sleeper', 'yahoo', 'espn', 'mfl', 'fantrax', 'gsis']

  for (const p of players) {
    for (const platform of platforms) {
      const id = p[`${platform}Id`]
      if (id) byPlatformId.set(`${platform}:${id}`, p)
    }

    const normalized = normalizeName(p.name)
    if (normalized) {
      if (!byNormalizedName.has(normalized)) byNormalizedName.set(normalized, [])
      byNormalizedName.get(normalized).push(p)

      const last = normalized.split(' ').pop()
      if (last) {
        if (!byLastName.has(last)) byLastName.set(last, [])
        byLastName.get(last).push(p)
      }
    }
  }

  return { byPlatformId, byNormalizedName, byLastName }
}

/**
 * In-memory matching mirroring playerMatcher.matchPlayer logic.
 * Returns matched Player object (from cache) or null.
 */
function matchInMemory({ name, platform, platformId, position }, caches) {
  // Strategy 1: exact platform ID
  if (platformId && platform) {
    const hit = caches.byPlatformId.get(`${platform}:${platformId}`)
    if (hit) return { player: hit, strategy: 'exact' }
  }

  // Strategy 2: fuzzy name
  if (!name) return null
  const normalized = normalizeName(name)
  if (!normalized) return null

  // Start with exact normalized name candidates, then last-name candidates
  const candidates = new Set()
  const exactMatches = caches.byNormalizedName.get(normalized) || []
  exactMatches.forEach(p => candidates.add(p))

  const inputLast = normalized.split(' ').pop()
  const lastMatches = inputLast ? (caches.byLastName.get(inputLast) || []) : []
  lastMatches.forEach(p => candidates.add(p))

  if (candidates.size === 0) return null

  const inputFirst = normalized.split(' ')[0]
  let best = null
  let bestScore = 0

  for (const c of candidates) {
    const cNorm = normalizeName(c.name)
    let score = 0
    if (cNorm === normalized) score += 100
    const candLast = cNorm.split(' ').pop()
    if (inputLast && inputLast === candLast) score += 50
    const candFirst = cNorm.split(' ')[0]
    if (inputFirst && inputFirst === candFirst) score += 30

    if (score > bestScore) {
      best = c
      bestScore = score
    }
  }

  if (bestScore >= 80) return { player: best, strategy: 'fuzzy' }
  return null
}

/**
 * Walk every HistoricalSeason.draftData row using an in-memory player cache.
 * Per pick: O(1) Map lookups, no DB queries.
 * Pending DB updates batched at the end (bulk Player.update calls grouped by platform).
 */
async function runBackfill({ dryRun = false, db = prisma, onProgress = null } = {}) {
  const start = Date.now()

  // === PHASE 1: bulk load ===
  const [seasons, players] = await Promise.all([
    db.historicalSeason.findMany({
      where: { draftData: { not: null } },
      select: {
        id: true,
        leagueId: true,
        seasonYear: true,
        ownerName: true,
        draftData: true,
        import: { select: { sourcePlatform: true } },
      },
    }),
    db.player.findMany({
      select: {
        id: true,
        name: true,
        sleeperId: true,
        yahooId: true,
        espnId: true,
        mflId: true,
        fantraxId: true,
        gsisId: true,
      },
    }),
  ])

  const caches = buildPlayerCaches(players)

  // Pending platform-ID writes: { playerId, platform, platformId } — applied in batch at end
  const pendingWrites = []

  const stats = {
    totalPicks: 0,
    skippedNoPlatform: 0,
    skippedNoPlayerId: 0,
    skippedFantrax: 0,
    skippedMflNoName: 0,
    exactMatch: 0,
    fuzzyMatchEnriched: 0,
    missed: 0,
    errors: 0,
  }
  const misses = []

  const totalSeasons = seasons.length
  const totalPicksEstimate = seasons.reduce((acc, s) => {
    return acc + (Array.isArray(s.draftData?.picks) ? s.draftData.picks.length : 0)
  }, 0)

  const PROGRESS_EVERY = 5000 // less frequent now that we're fast

  // === PHASE 2: walk + match in memory ===
  for (let i = 0; i < seasons.length; i++) {
    const season = seasons[i]
    const platform = season.import?.sourcePlatform?.toLowerCase()
    if (!platform) { stats.skippedNoPlatform++; continue }
    if (platform === 'fantrax') { stats.skippedFantrax++; continue }

    const picks = Array.isArray(season.draftData?.picks) ? season.draftData.picks : []

    for (const pick of picks) {
      stats.totalPicks++

      if (!pick.playerId) { stats.skippedNoPlayerId++; continue }
      if (platform === 'mfl' && !pick.playerName) { stats.skippedMflNoName++; }

      try {
        const match = matchInMemory({
          name: pick.playerName,
          platform,
          platformId: String(pick.playerId),
          position: pick.position,
        }, caches)

        if (!match) {
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

        if (match.strategy === 'exact') {
          stats.exactMatch++
          continue
        }

        // Fuzzy match — enrich the cache and queue a DB write
        stats.fuzzyMatchEnriched++
        const idField = `${platform}Id`
        if (!match.player[idField]) {
          // Update cache so subsequent picks in this same run see the enrichment
          match.player[idField] = String(pick.playerId)
          caches.byPlatformId.set(`${platform}:${pick.playerId}`, match.player)
          if (!dryRun) {
            pendingWrites.push({
              playerId: match.player.id,
              platform,
              platformId: String(pick.playerId),
            })
          }
        }
      } catch (e) {
        stats.errors++
      }

      if (onProgress && stats.totalPicks % PROGRESS_EVERY === 0) {
        try {
          await onProgress({
            picksProcessed: stats.totalPicks,
            totalPicksEstimate,
            currentSeasonIndex: i,
            totalSeasons,
            stats: { ...stats },
          })
        } catch (cbError) {
          // ignore
        }
      }
    }
  }

  // === PHASE 3: bulk write enrichments ===
  if (!dryRun && pendingWrites.length > 0) {
    // Group writes by platform so we can update one column at a time
    const byPlatform = {}
    for (const w of pendingWrites) {
      if (!byPlatform[w.platform]) byPlatform[w.platform] = []
      byPlatform[w.platform].push(w)
    }

    // Apply in parallel chunks per platform — still individual updates,
    // but no fuzzy-match work, just direct writes
    for (const [platform, writes] of Object.entries(byPlatform)) {
      const idField = `${platform}Id`
      // Chunk into batches of 100 concurrent updates
      const CHUNK = 100
      for (let i = 0; i < writes.length; i += CHUNK) {
        const batch = writes.slice(i, i + CHUNK)
        await Promise.all(
          batch.map(w =>
            db.player.update({
              where: { id: w.playerId },
              data: { [idField]: w.platformId },
            }).catch(e => {
              // Ignore unique-constraint conflicts (rare race conditions)
              console.warn(`[backfill] write failed for ${w.platform}Id=${w.platformId} on player ${w.playerId}:`, e.message)
              stats.errors++
            })
          )
        )
      }
    }
  }

  return { stats, misses, durationMs: Date.now() - start }
}

function summarizeMisses(misses) {
  const byPlatform = {}
  for (const m of misses) {
    byPlatform[m.platform] = byPlatform[m.platform] || { count: 0, samples: [] }
    byPlatform[m.platform].count++
    if (byPlatform[m.platform].samples.length < 10) {
      byPlatform[m.platform].samples.push(m.playerName || '(no name)')
    }
  }
  return byPlatform
}

module.exports = { runBackfill, summarizeMisses, buildPlayerCaches, matchInMemory, normalizeName }
