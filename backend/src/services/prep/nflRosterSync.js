/**
 * NFL Roster Sync (DS-2)
 *
 * Daily sync that pulls the full NFL player map from Sleeper, groups
 * active players by team, resolves each to a canonical Clutch Player.id
 * via in-memory Sleeper-ID lookup (cache pre-loaded once), and upserts
 * NflRosterSlot rows with snapshotType='current'.
 *
 * Soft-delete: any 'current' slot not seen this run is flipped to
 * status='removed' (preserves history; no DELETE).
 *
 * Designed for the daily 4 AM ET cron registered in DS-11.
 *
 * Performance pattern (mirrors PIR-7):
 *   1. Bulk-load all Players that have sleeperId set (one query)
 *   2. Build in-memory Map<sleeperId, player>
 *   3. Match each Sleeper player in-memory (no DB queries in the loop)
 *   4. Collect upsert payloads, then batch via Promise.all (chunks of 100)
 *   5. Soft-delete pass also batched
 *
 * Sleeper API:
 *   GET https://api.sleeper.app/v1/players/nfl  (~5MB, no auth)
 */

const axios = require('axios')
const prisma = require('../../lib/prisma')

const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl'
const UPSERT_BATCH_SIZE = 100

/**
 * Normalize a Sleeper `status` string to NflRosterSlot.status.
 * Returns null when the player should be skipped (retired/unknown).
 */
function normalizeStatus(sleeperStatus) {
  if (!sleeperStatus) return null
  const s = String(sleeperStatus).toLowerCase()
  // v1 collapses Sleeper's 'Active' + 'Inactive' both → 'active'.
  // Rationale: pre-draft prep window (May-August) has no gameday inactives.
  // 'Inactive' means "rostered but gameday scratch" in-season; that distinction
  // is out of v1 scope. If in-season fantasy uses this data, add 'inactive'
  // to the NflRosterSlot.status enum then.
  if (s === 'active' || s === 'inactive') return 'active'
  if (s === 'injured reserve' || s === 'ir') return 'ir'
  if (s === 'pup' || s.includes('physically unable')) return 'pup'
  if (s === 'suspended') return 'sus'
  return null // retired or unknown — skip
}

/**
 * Daily sync: pulls full NFL player map from Sleeper, builds depth chart
 * slots for all 32 teams, upserts into NflRosterSlot with
 * snapshotType='current'. Players no longer present are flipped to
 * status='removed' (soft delete).
 *
 * @param {Object} [opts]
 * @param {PrismaClient} [opts.db]
 * @returns {Promise<Object>} stats
 */
async function syncCurrentRosters({ db = prisma } = {}) {
  const startedAt = Date.now()
  const stats = {
    teamsProcessed: 0,
    slotsUpserted: 0,
    slotsMarkedRemoved: 0,
    playersUnresolved: 0,
    errors: [],
  }

  // 1. Fetch the master Sleeper player map
  console.log('[prep roster-sync] fetching Sleeper player map...')
  let sleeperPlayers
  try {
    const res = await axios.get(SLEEPER_PLAYERS_URL, { timeout: 30000 })
    sleeperPlayers = res.data
    console.log(`[prep roster-sync] received ${Object.keys(sleeperPlayers).length} Sleeper players`)
  } catch (e) {
    throw new Error(`Sleeper API fetch failed: ${e.message}`)
  }

  // 2. Build map of NflTeam abbreviation -> team.id
  const teams = await db.nflTeam.findMany()
  const teamByAbbr = Object.fromEntries(teams.map((t) => [t.abbreviation, t.id]))

  // 3. Bulk-load Player cache (PIR-7 pattern): one round-trip, then in-memory lookups
  console.log('[prep roster-sync] bulk-loading Player cache...')
  const allMappedPlayers = await db.player.findMany({
    where: { sleeperId: { not: null } },
    select: { id: true, sleeperId: true, name: true, lastName: true, nflPosition: true },
  })
  console.log(`[prep roster-sync] cached ${allMappedPlayers.length} Players with sleeperId`)

  const playerBySleeperId = new Map()
  for (const p of allMappedPlayers) {
    if (playerBySleeperId.has(p.sleeperId)) {
      console.warn(
        `[prep roster-sync] DUPLICATE sleeperId ${p.sleeperId}: existing=${playerBySleeperId.get(p.sleeperId).id}, new=${p.id}. Keeping existing.`
      )
      continue // keep first-seen, skip the duplicate
    }
    playerBySleeperId.set(p.sleeperId, p)
  }

  // 4. Group active Sleeper players by team
  const playersByTeam = {}
  for (const sleeperPlayer of Object.values(sleeperPlayers)) {
    const status = normalizeStatus(sleeperPlayer.status)
    if (!status) continue // retired/unknown
    if (!sleeperPlayer.team || !teamByAbbr[sleeperPlayer.team]) continue // no team or unknown team
    if (!sleeperPlayer.position) continue // no position — skip

    if (!playersByTeam[sleeperPlayer.team]) playersByTeam[sleeperPlayer.team] = []
    playersByTeam[sleeperPlayer.team].push(sleeperPlayer)
  }

  // 5. For each team, match players in-memory + collect upsert payloads
  // Single snapshot timestamp shared across all upserts + soft-deletes in this run
  const now = new Date()
  const seenPlayerIds = new Set() // for soft-delete pass
  const upserts = []
  const totalTeams = Object.keys(playersByTeam).length

  for (const [abbr, players] of Object.entries(playersByTeam)) {
    const teamId = teamByAbbr[abbr]
    try {
      for (const sleeperPlayer of players) {
        // In-memory lookup by Sleeper ID only (no fuzzy fallback in v1)
        const cached = playerBySleeperId.get(sleeperPlayer.player_id)
        if (!cached) {
          stats.playersUnresolved++
          continue
        }

        const status = normalizeStatus(sleeperPlayer.status)
        const depthRank = Number.isFinite(sleeperPlayer.depth_chart_order)
          ? sleeperPlayer.depth_chart_order
          : 99 // unknown depth

        upserts.push({
          where: {
            teamId_playerId_snapshotType: {
              teamId,
              playerId: cached.id,
              snapshotType: 'current',
            },
          },
          create: {
            teamId,
            playerId: cached.id,
            snapshotType: 'current',
            position: sleeperPlayer.position,
            depthRank,
            status,
            snapshotDate: now,
          },
          update: {
            position: sleeperPlayer.position,
            depthRank,
            status,
            snapshotDate: now,
          },
        })
        seenPlayerIds.add(`${teamId}::${cached.id}`)
      }
      stats.teamsProcessed++

      if (stats.teamsProcessed % 5 === 0) {
        console.log(
          `[prep roster-sync] ${stats.teamsProcessed}/${totalTeams} teams matched in-memory...`
        )
      }
    } catch (e) {
      console.error(`[prep roster-sync] team ${abbr} failed:`, e.message)
      stats.errors.push({ team: abbr, error: e.message })
    }
  }

  // 6. Batched upserts: chunks of UPSERT_BATCH_SIZE concurrent writes
  console.log(
    `[prep roster-sync] writing ${upserts.length} upserts in batches of ${UPSERT_BATCH_SIZE}...`
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
              `[prep roster-sync] upsert failed (team=${u.create.teamId}, player=${u.create.playerId}):`,
              e.message
            )
            stats.errors.push({
              phase: 'upsert',
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
        `[prep roster-sync] ${Math.min(i + UPSERT_BATCH_SIZE, upserts.length)}/${upserts.length} upserts done`
      )
    }
  }

  // 7. Soft-delete pass: mark any 'current' slot not seen this run as status='removed'
  console.log('[prep roster-sync] scanning for soft-deletes...')
  const allCurrentSlots = await db.nflRosterSlot.findMany({
    where: { snapshotType: 'current', status: { not: 'removed' } },
    select: { id: true, teamId: true, playerId: true },
  })
  const toRemove = allCurrentSlots.filter(
    (slot) => !seenPlayerIds.has(`${slot.teamId}::${slot.playerId}`)
  )
  console.log(
    `[prep roster-sync] ${toRemove.length} stale slots to soft-delete (of ${allCurrentSlots.length} scanned)`
  )

  for (let i = 0; i < toRemove.length; i += UPSERT_BATCH_SIZE) {
    const chunk = toRemove.slice(i, i + UPSERT_BATCH_SIZE)
    await Promise.all(
      chunk.map((slot) =>
        db.nflRosterSlot
          .update({
            where: { id: slot.id },
            data: { status: 'removed', snapshotDate: now },
          })
          .then(() => {
            stats.slotsMarkedRemoved++
          })
          .catch((e) => {
            console.error(`[prep roster-sync] soft-delete failed (slot ${slot.id}):`, e.message)
            stats.errors.push({ phase: 'soft-delete', slotId: slot.id, error: e.message })
          })
      )
    )
  }

  stats.durationMs = Date.now() - startedAt
  console.log(
    `[prep roster-sync] done in ${(stats.durationMs / 1000).toFixed(1)}s: ` +
      `${stats.teamsProcessed} teams, ${stats.slotsUpserted} upserted, ` +
      `${stats.slotsMarkedRemoved} removed, ${stats.playersUnresolved} unresolved`
  )

  // Mass-failure detection: throw if >10% of attempted upserts errored.
  // Catches transient DB issues that the daily cron would otherwise miss
  // (per-upsert .catch() above swallows individual errors into stats.errors).
  const attempted = stats.slotsUpserted + stats.errors.length
  const errorRate = attempted > 0 ? stats.errors.length / attempted : 0
  if (errorRate > 0.10) {
    throw new Error(
      `[prep roster-sync] FAILED: ${stats.errors.length}/${attempted} upserts errored (${(errorRate * 100).toFixed(1)}% — threshold 10%)`
    )
  }

  return stats
}

module.exports = { syncCurrentRosters, normalizeStatus }
