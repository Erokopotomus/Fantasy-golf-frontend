/**
 * Historical roster snapshot (DS-7)
 *
 * Reconstructs end-of-season NFL rosters from NflPlayerGame records.
 * For each player who appeared in a game in `season`, their FINAL game's
 * teamAbbr becomes their end-of-season team affiliation. This is the
 * comparison anchor for the prep "What Changed" view.
 *
 * Limitations:
 *   - depthRank is set to 99 ("unknown") — point-in-time depth charts
 *     aren't reconstructible from box scores. The What Changed view
 *     only needs "who was on this team", not depth.
 *   - status is set to 'active' uniformly — a player who finished the
 *     season on IR but played any game still appears (this is desirable
 *     for "Was on Bears in 2024" comparisons).
 *   - Players who were on a roster but never played a game in the
 *     season won't appear. For v1 this is acceptable since the "What
 *     Changed" view targets contributors users care about.
 *
 * Performance pattern (mirrors PIR-7 / DS-2):
 *   1. Bulk-load all NflPlayerGame rows for the season (one query)
 *   2. JS group-by-player, pick row with max week (final game)
 *   3. Batch upserts via Promise.all (chunks of 100)
 */

const prisma = require('../../lib/prisma')

const UPSERT_BATCH_SIZE = 100

/**
 * Backfill NflRosterSlot with snapshotType=`end_of_${season}_season`.
 *
 * @param {number} season — e.g. 2024
 * @param {{ db?: PrismaClient }} [opts]
 * @returns {Promise<Object>} stats
 */
async function backfillEndOfSeasonRosters(season, { db = prisma } = {}) {
  const startedAt = Date.now()
  const snapshotType = `end_of_${season}_season`
  // Mid-February of the year AFTER `season` — post-Super-Bowl, mirrors when
  // an end-of-season snapshot would have been taken in real time.
  const snapshotDate = new Date(`${season + 1}-02-15T00:00:00Z`)

  const stats = {
    season,
    snapshotType,
    playerGamesScanned: 0,
    uniquePlayers: 0,
    slotsUpserted: 0,
    skippedNoTeam: 0,
    skippedNoPosition: 0,
    errors: [],
  }

  console.log(`[prep historical-roster] backfilling ${snapshotType}...`)

  const teams = await db.nflTeam.findMany()
  const teamByAbbr = Object.fromEntries(teams.map((t) => [t.abbreviation, t.id]))

  const playerGames = await db.nflPlayerGame.findMany({
    where: { game: { season } },
    select: {
      playerId: true,
      teamAbbr: true,
      player: { select: { nflPosition: true } },
      game: { select: { week: true } },
    },
  })
  stats.playerGamesScanned = playerGames.length
  console.log(`[prep historical-roster] scanned ${playerGames.length} NflPlayerGame rows for ${season}`)

  // Group by playerId, keep the row with max week (the FINAL game).
  const finalGameByPlayer = new Map()
  for (const pg of playerGames) {
    const existing = finalGameByPlayer.get(pg.playerId)
    if (!existing || pg.game.week > existing.game.week) {
      finalGameByPlayer.set(pg.playerId, pg)
    }
  }
  stats.uniquePlayers = finalGameByPlayer.size
  console.log(`[prep historical-roster] ${finalGameByPlayer.size} unique players`)

  const upserts = []
  for (const pg of finalGameByPlayer.values()) {
    const teamId = teamByAbbr[pg.teamAbbr]
    if (!teamId) {
      stats.skippedNoTeam++
      continue
    }
    const position = pg.player?.nflPosition
    if (!position) {
      stats.skippedNoPosition++
      continue
    }
    upserts.push({
      where: {
        teamId_playerId_snapshotType: {
          teamId,
          playerId: pg.playerId,
          snapshotType,
        },
      },
      create: {
        teamId,
        playerId: pg.playerId,
        snapshotType,
        position,
        depthRank: 99,
        status: 'active',
        snapshotDate,
      },
      update: {
        position,
        snapshotDate,
      },
    })
  }

  console.log(
    `[prep historical-roster] writing ${upserts.length} upserts in batches of ${UPSERT_BATCH_SIZE}...`
  )
  for (let i = 0; i < upserts.length; i += UPSERT_BATCH_SIZE) {
    const chunk = upserts.slice(i, i + UPSERT_BATCH_SIZE)
    await Promise.all(
      chunk.map((u) =>
        db.nflRosterSlot
          .upsert(u)
          .then(() => {
            stats.slotsUpserted++
          })
          .catch((e) => {
            console.error(
              `[prep historical-roster] upsert failed (team=${u.create.teamId}, player=${u.create.playerId}):`,
              e.message
            )
            stats.errors.push({
              teamId: u.create.teamId,
              playerId: u.create.playerId,
              error: e.message,
            })
          })
      )
    )
    const batchIndex = Math.floor(i / UPSERT_BATCH_SIZE)
    if (batchIndex % 5 === 0) {
      console.log(
        `[prep historical-roster] ${Math.min(i + UPSERT_BATCH_SIZE, upserts.length)}/${upserts.length} done`
      )
    }
  }

  stats.durationMs = Date.now() - startedAt
  console.log(
    `[prep historical-roster] done in ${(stats.durationMs / 1000).toFixed(1)}s: ` +
      `${stats.slotsUpserted} upserted, ${stats.skippedNoTeam} no-team, ${stats.skippedNoPosition} no-pos`
  )

  // Fail-loud on mass failure (mirrors DS-2 pattern)
  const attempted = stats.slotsUpserted + stats.errors.length
  const errorRate = attempted > 0 ? stats.errors.length / attempted : 0
  if (errorRate > 0.1) {
    throw new Error(
      `[prep historical-roster] FAILED: ${stats.errors.length}/${attempted} errored (${(errorRate * 100).toFixed(1)}%)`
    )
  }

  return stats
}

module.exports = { backfillEndOfSeasonRosters }
