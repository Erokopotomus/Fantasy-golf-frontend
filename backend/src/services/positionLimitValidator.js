/**
 * Position Limit Validator
 *
 * Validates that adding a player to a team won't exceed the league's
 * per-position roster limits. Used by roster add, trades, and waivers.
 */

/**
 * Validate that adding a player won't exceed position limits.
 *
 * @param {string} teamId - The team receiving the player
 * @param {string} playerId - The player being added
 * @param {string} leagueId - The league ID
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ dropPlayerIds?: string[] }} options - Players being dropped/sent out in the same transaction
 * @returns {{ valid: boolean, position?: string, limit?: number, current?: number }}
 */
async function validatePositionLimits(teamId, playerId, leagueId, prisma, options = {}) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true, sport: true },
  })

  // Only applies to NFL leagues with position limits configured
  if (!league || league.sport?.toLowerCase() !== 'nfl') {
    return { valid: true }
  }

  const positionLimits = league.settings?.positionLimits
  if (!positionLimits) {
    return { valid: true }
  }

  // Get the incoming player's position
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { nflPosition: true, position: true },
  })
  if (!player) {
    return { valid: true }
  }

  const playerPosition = player.nflPosition || player.position
  if (!playerPosition) {
    return { valid: true }
  }

  // Check if this position has a limit
  const limit = positionLimits[playerPosition]
  if (limit === null || limit === undefined) {
    return { valid: true } // null = unlimited
  }

  // Count current roster entries at this position
  const currentRoster = await prisma.rosterEntry.findMany({
    where: { teamId, isActive: true },
    include: { player: { select: { nflPosition: true, position: true } } },
  })

  // Count players at this position, excluding any being dropped
  const dropPlayerIds = options.dropPlayerIds || []
  const currentCount = currentRoster.filter(entry => {
    if (dropPlayerIds.includes(entry.playerId)) return false
    const pos = entry.player?.nflPosition || entry.player?.position
    return pos === playerPosition
  }).length

  if (currentCount >= limit) {
    return {
      valid: false,
      position: playerPosition,
      limit,
      current: currentCount,
    }
  }

  return { valid: true }
}

module.exports = { validatePositionLimits }
