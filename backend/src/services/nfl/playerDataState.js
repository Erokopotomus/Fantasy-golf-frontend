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
  for (const r of rows) {
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
  return { updated: rows.length }
}

/**
 * Check if a player has been data-loaded (pool OR lazy-fetched).
 * Returns the state row or null.
 */
async function getPlayerDataState(prisma, playerId) {
  return prisma.nflPlayerDataState.findUnique({ where: { playerId } })
}

module.exports = { markPoolPlayersFetched, getPlayerDataState }
