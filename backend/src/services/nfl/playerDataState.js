/**
 * After a backfill run, mark every pool player with their fetch state.
 * Computes per-player earliest/latest season from NflPlayerGame.
 */
async function markPoolPlayersFetched(prisma, gsisIdToPlayerId, pool, throughSeason) {
  const poolPlayerIds = []
  for (const gid of pool) {
    const pid = gsisIdToPlayerId.get(gid)
    if (pid) poolPlayerIds.push(pid)
  }
  if (poolPlayerIds.length === 0) return { updated: 0 }

  const rows = await prisma.$queryRaw`
    SELECT
      pg."playerId",
      MIN(g.season) AS earliest,
      MAX(g.season) AS latest
    FROM nfl_player_games pg
    JOIN nfl_games g ON g.id = pg."gameId"
    WHERE pg."playerId" = ANY(${poolPlayerIds})
    GROUP BY pg."playerId"
  `

  const now = new Date()
  const seenPlayerIds = new Set()
  for (const r of rows) {
    seenPlayerIds.add(r.playerId)
    await prisma.nflPlayerDataState.upsert({
      where: { playerId: r.playerId },
      create: {
        playerId: r.playerId,
        inPool: true,
        earliestFetched: Number(r.earliest),
        fetchedThrough: Number(r.latest),
        lastFetchedAt: now,
      },
      update: {
        inPool: true,
        earliestFetched: Number(r.earliest),
        fetchedThrough: Number(r.latest),
        lastFetchedAt: now,
      },
    })
  }

  // Pool members with zero NflPlayerGame rows: emit a sentinel state row so the
  // lazy-fetch path can distinguish "tried, no data" from "never tried."
  let sentinelCount = 0
  for (const pid of poolPlayerIds) {
    if (seenPlayerIds.has(pid)) continue
    await prisma.nflPlayerDataState.upsert({
      where: { playerId: pid },
      create: {
        playerId: pid,
        inPool: true,
        earliestFetched: null,
        fetchedThrough: null,
        lastFetchedAt: now,
      },
      update: {
        inPool: true,
        lastFetchedAt: now,
      },
    })
    sentinelCount++
  }

  return { updated: rows.length, sentinels: sentinelCount }
}

/**
 * Check if a player has been data-loaded (pool OR lazy-fetched).
 * Returns the state row or null.
 */
async function getPlayerDataState(prisma, playerId) {
  return prisma.nflPlayerDataState.findUnique({ where: { playerId } })
}

module.exports = { markPoolPlayersFetched, getPlayerDataState }
