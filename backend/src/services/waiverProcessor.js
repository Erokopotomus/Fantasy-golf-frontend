/**
 * Waiver Processor Service
 *
 * Processes waiver claims for all active leagues.
 * Supports two modes:
 * - FAAB: Highest bid wins (tiebreaker: reverse standings)
 * - Rolling: Priority order wins, winners drop to bottom
 */

const { recordTransaction } = require('./fantasyTracker')
const { createNotification, notifyLeague } = require('./notificationService')

/**
 * Process all pending waiver claims for a single league.
 * Dispatches to FAAB or Rolling processor based on league settings.
 *
 * @param {string} leagueId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ processed: number, won: number, lost: number, invalid: number }}
 */
async function processLeagueWaivers(leagueId, prisma) {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { settings: true } })
  if (league?.settings?.waiverType === 'rolling') {
    return processRollingWaivers(leagueId, prisma)
  }
  return processFaabWaivers(leagueId, prisma)
}

/**
 * Process FAAB waiver claims for a single league.
 */
async function processFaabWaivers(leagueId, prisma) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        include: {
          roster: { where: { isActive: true } },
        },
      },
    },
  })
  if (!league) return { processed: 0, won: 0, lost: 0, invalid: 0 }

  const pendingClaims = await prisma.waiverClaim.findMany({
    where: { leagueId, status: 'PENDING' },
    include: {
      player: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: [{ bidAmount: 'desc' }, { priority: 'asc' }, { createdAt: 'asc' }],
  })

  if (pendingClaims.length === 0) return { processed: 0, won: 0, lost: 0, invalid: 0 }

  // Get current season + league season for budget lookups
  const currentSeason = await prisma.season.findFirst({ where: { isCurrent: true } })
  let leagueSeason = null
  if (currentSeason) {
    leagueSeason = await prisma.leagueSeason.findFirst({
      where: { leagueId, seasonId: currentSeason.id },
    })
  }

  // Build standings order for tiebreaking (worst record picks first)
  const standingsOrder = buildStandingsOrder(league.teams)

  // Build roster count per team
  const rosterCounts = new Map()
  for (const team of league.teams) {
    rosterCounts.set(team.id, team.roster.filter(r => r.isActive).length)
  }

  // Track which players have been claimed this cycle
  const claimedPlayers = new Set()
  // Track budget deductions this cycle
  const budgetDeductions = new Map() // teamId → total deducted

  // Group claims by player
  const claimsByPlayer = new Map()
  for (const claim of pendingClaims) {
    if (!claimsByPlayer.has(claim.playerId)) {
      claimsByPlayer.set(claim.playerId, [])
    }
    claimsByPlayer.get(claim.playerId).push(claim)
  }

  let won = 0
  let lost = 0
  let invalid = 0
  const now = new Date()

  for (const [playerId, claims] of claimsByPlayer) {
    // Sort: highest bid first, then standings priority (worst team first), then earliest submission
    claims.sort((a, b) => {
      if (b.bidAmount !== a.bidAmount) return b.bidAmount - a.bidAmount
      const aOrder = standingsOrder.get(a.teamId) ?? 999
      const bOrder = standingsOrder.get(b.teamId) ?? 999
      return bOrder - aOrder // Higher order = worse record = higher priority
      // createdAt is already in the initial query sort
    })

    let playerClaimed = false

    for (const claim of claims) {
      if (playerClaimed) {
        // Player already won by someone else
        await prisma.waiverClaim.update({
          where: { id: claim.id },
          data: { status: 'LOST', processedAt: now, notes: `Outbid by ${claims[0].team.name}` },
        })
        // Notify claim owner
        try {
          await createNotification({
            userId: claim.userId,
            type: 'WAIVER_LOST',
            title: 'Waiver Claim Lost',
            message: `Your claim for ${claim.player.name} was outbid by ${claims[0].team.name}`,
            actionUrl: `/leagues/${leagueId}/waivers`,
            data: { playerId: claim.playerId, leagueId },
          }, prisma)
        } catch (err) { console.error('Waiver lost notification failed:', err.message) }
        lost++
        continue
      }

      // Validate this claim
      const validationError = await validateClaim(claim, league, leagueSeason, rosterCounts, budgetDeductions, prisma)
      if (validationError) {
        await prisma.waiverClaim.update({
          where: { id: claim.id },
          data: { status: 'INVALID', processedAt: now, notes: validationError },
        })
        // Notify claim owner
        try {
          await createNotification({
            userId: claim.userId,
            type: 'WAIVER_INVALID',
            title: 'Waiver Claim Invalid',
            message: `Your claim for ${claim.player.name} was invalid: ${validationError}`,
            actionUrl: `/leagues/${leagueId}/waivers`,
            data: { playerId: claim.playerId, leagueId },
          }, prisma)
        } catch (err) { console.error('Waiver invalid notification failed:', err.message) }
        invalid++
        continue
      }

      // Process the winning claim
      const maxRosterSize = league.settings?.rosterSize || 6
      const currentCount = rosterCounts.get(claim.teamId) || 0

      // Drop player if specified
      if (claim.dropPlayerId) {
        await prisma.rosterEntry.update({
          where: { teamId_playerId: { teamId: claim.teamId, playerId: claim.dropPlayerId } },
          data: { isActive: false, droppedAt: now },
        })
        rosterCounts.set(claim.teamId, currentCount - 1)

        // Log drop transaction
        const dropPlayer = await prisma.player.findUnique({
          where: { id: claim.dropPlayerId },
          select: { name: true },
        })
        recordTransaction({
          type: 'FREE_AGENT_DROP',
          teamId: claim.teamId,
          playerId: claim.dropPlayerId,
          playerName: dropPlayer?.name || 'Unknown',
          leagueId,
        }, prisma).catch(err => console.error('Waiver drop transaction log failed:', err.message))
      }

      // Add player to roster
      await prisma.rosterEntry.create({
        data: {
          teamId: claim.teamId,
          playerId: claim.playerId,
          position: 'BENCH',
          rosterStatus: 'BENCH',
          acquiredVia: 'WAIVER',
        },
      })
      rosterCounts.set(claim.teamId, (rosterCounts.get(claim.teamId) || 0) + 1)

      // Deduct budget
      if (claim.bidAmount > 0 && leagueSeason) {
        const existing = await prisma.teamBudget.findUnique({
          where: { teamId_leagueSeasonId: { teamId: claim.teamId, leagueSeasonId: leagueSeason.id } },
        })
        if (existing) {
          await prisma.teamBudget.update({
            where: { id: existing.id },
            data: {
              spent: existing.spent + claim.bidAmount,
              remaining: existing.remaining - claim.bidAmount,
            },
          })
        }
        budgetDeductions.set(
          claim.teamId,
          (budgetDeductions.get(claim.teamId) || 0) + claim.bidAmount
        )
      }

      // Log waiver transaction
      recordTransaction({
        type: 'WAIVER_CLAIM',
        teamId: claim.teamId,
        playerId: claim.playerId,
        playerName: claim.player.name,
        leagueId,
        waiverBid: claim.bidAmount,
      }, prisma).catch(err => console.error('Waiver claim transaction log failed:', err.message))

      // Mark as won
      await prisma.waiverClaim.update({
        where: { id: claim.id },
        data: { status: 'WON', processedAt: now, notes: claim.bidAmount > 0 ? `Won with $${claim.bidAmount} bid` : 'Claim successful' },
      })

      // Notify claim owner
      try {
        await createNotification({
          userId: claim.userId,
          type: 'WAIVER_WON',
          title: 'Waiver Claim Won!',
          message: claim.bidAmount > 0
            ? `You won ${claim.player.name} with a $${claim.bidAmount} bid`
            : `You successfully claimed ${claim.player.name}`,
          actionUrl: `/leagues/${leagueId}/waivers`,
          data: { playerId: claim.playerId, leagueId },
        }, prisma)
      } catch (err) { console.error('Waiver won notification failed:', err.message) }

      claimedPlayers.add(playerId)
      playerClaimed = true
      won++
    }
  }

  console.log(`[waiverProcessor] League ${league.name}: ${won} won, ${lost} lost, ${invalid} invalid`)

  // League-wide summary notification
  if (won > 0) {
    try {
      await notifyLeague(leagueId, {
        type: 'WAIVER_PROCESSED',
        title: 'Waivers Processed',
        message: `${won} waiver claim${won > 1 ? 's' : ''} processed in ${league.name}`,
        actionUrl: `/leagues/${leagueId}/waivers`,
        data: { leagueId, won, lost, invalid },
      }, [], prisma)
    } catch (err) { console.error('Waiver summary notification failed:', err.message) }
  }

  return { processed: pendingClaims.length, won, lost, invalid }
}

/**
 * Validate a waiver claim before processing.
 * Returns null if valid, or an error string if invalid.
 */
async function validateClaim(claim, league, leagueSeason, rosterCounts, budgetDeductions, prisma) {
  const maxRosterSize = league.settings?.rosterSize || 6
  const currentCount = rosterCounts.get(claim.teamId) || 0

  // Check roster space (considering drop)
  const effectiveCount = claim.dropPlayerId ? currentCount - 1 : currentCount
  if (effectiveCount >= maxRosterSize) {
    return 'Roster full — no drop target specified'
  }

  // Check if player is already rostered in this league
  const alreadyRostered = await prisma.rosterEntry.findFirst({
    where: { playerId: claim.playerId, isActive: true, team: { leagueId: league.id } },
  })
  if (alreadyRostered) {
    return 'Player already rostered in league'
  }

  // Check budget (FAAB)
  if (claim.bidAmount > 0 && leagueSeason) {
    const budget = await prisma.teamBudget.findUnique({
      where: { teamId_leagueSeasonId: { teamId: claim.teamId, leagueSeasonId: leagueSeason.id } },
    })
    if (budget) {
      const alreadyDeducted = budgetDeductions.get(claim.teamId) || 0
      const effectiveRemaining = budget.remaining - alreadyDeducted
      if (claim.bidAmount > effectiveRemaining) {
        return `Insufficient budget ($${claim.bidAmount} bid, $${effectiveRemaining.toFixed(0)} remaining)`
      }
    }
  }

  // Verify drop target is on the team's active roster
  if (claim.dropPlayerId) {
    const dropEntry = await prisma.rosterEntry.findFirst({
      where: { teamId: claim.teamId, playerId: claim.dropPlayerId, isActive: true },
    })
    if (!dropEntry) {
      return 'Drop target not on active roster'
    }
  }

  return null
}

/**
 * Build standings order map: teamId → priority number.
 * Worst records get highest numbers (= highest waiver priority).
 */
function buildStandingsOrder(teams) {
  const sorted = [...teams].sort((a, b) => {
    const aWins = a.wins || 0
    const bWins = b.wins || 0
    if (aWins !== bWins) return aWins - bWins // fewer wins = higher priority
    const aPoints = a.totalPoints || 0
    const bPoints = b.totalPoints || 0
    return aPoints - bPoints // fewer points = higher priority
  })

  const order = new Map()
  sorted.forEach((team, i) => order.set(team.id, i + 1))
  return order
}

/**
 * Process rolling priority waiver claims for a single league.
 * Winners drop to the bottom of the priority order.
 */
async function processRollingWaivers(leagueId, prisma) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        include: {
          roster: { where: { isActive: true } },
        },
      },
    },
  })
  if (!league) return { processed: 0, won: 0, lost: 0, invalid: 0 }

  const pendingClaims = await prisma.waiverClaim.findMany({
    where: { leagueId, status: 'PENDING' },
    include: {
      player: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })

  if (pendingClaims.length === 0) return { processed: 0, won: 0, lost: 0, invalid: 0 }

  // Get or initialize priority order
  let priorityOrder = league.settings?.waiverPriorityOrder || null
  if (!priorityOrder || !Array.isArray(priorityOrder)) {
    // Init from reverse standings (worst record = first priority)
    const standingsOrder = buildStandingsOrder(league.teams)
    const sorted = [...league.teams].sort((a, b) => {
      const aOrder = standingsOrder.get(a.id) ?? 999
      const bOrder = standingsOrder.get(b.id) ?? 999
      return bOrder - aOrder // higher order number = worse record = picks first
    })
    priorityOrder = sorted.map(t => t.id)
  }

  // Build roster count per team
  const rosterCounts = new Map()
  for (const team of league.teams) {
    rosterCounts.set(team.id, team.roster.filter(r => r.isActive).length)
  }

  const claimedPlayers = new Set()
  const winnersThisCycle = new Set() // teamIds that won, to drop to bottom

  // Group claims by player
  const claimsByPlayer = new Map()
  for (const claim of pendingClaims) {
    if (!claimsByPlayer.has(claim.playerId)) {
      claimsByPlayer.set(claim.playerId, [])
    }
    claimsByPlayer.get(claim.playerId).push(claim)
  }

  let won = 0
  let lost = 0
  let invalid = 0
  const now = new Date()

  for (const [playerId, claims] of claimsByPlayer) {
    // Sort by priority order (lower index in priorityOrder = higher priority)
    claims.sort((a, b) => {
      const aIdx = priorityOrder.indexOf(a.teamId)
      const bIdx = priorityOrder.indexOf(b.teamId)
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
    })

    let playerClaimed = false

    for (const claim of claims) {
      if (playerClaimed) {
        await prisma.waiverClaim.update({
          where: { id: claim.id },
          data: { status: 'LOST', processedAt: now, notes: `Higher priority claim by ${claims[0].team.name}` },
        })
        try {
          await createNotification({
            userId: claim.userId,
            type: 'WAIVER_LOST',
            title: 'Waiver Claim Lost',
            message: `Your claim for ${claim.player.name} was won by a higher priority team`,
            actionUrl: `/leagues/${leagueId}/waivers`,
            data: { playerId: claim.playerId, leagueId },
          }, prisma)
        } catch (err) { console.error('Waiver lost notification failed:', err.message) }
        lost++
        continue
      }

      // Validate the claim
      const maxRosterSize = league.settings?.rosterSize || 6
      const currentCount = rosterCounts.get(claim.teamId) || 0
      const effectiveCount = claim.dropPlayerId ? currentCount - 1 : currentCount

      if (effectiveCount >= maxRosterSize) {
        await prisma.waiverClaim.update({
          where: { id: claim.id },
          data: { status: 'INVALID', processedAt: now, notes: 'Roster full — no drop target specified' },
        })
        try {
          await createNotification({
            userId: claim.userId,
            type: 'WAIVER_INVALID',
            title: 'Waiver Claim Invalid',
            message: `Your claim for ${claim.player.name} was invalid: Roster full`,
            actionUrl: `/leagues/${leagueId}/waivers`,
            data: { playerId: claim.playerId, leagueId },
          }, prisma)
        } catch (err) { console.error('Waiver invalid notification failed:', err.message) }
        invalid++
        continue
      }

      // Check if player is already rostered
      const alreadyRostered = await prisma.rosterEntry.findFirst({
        where: { playerId: claim.playerId, isActive: true, team: { leagueId: league.id } },
      })
      if (alreadyRostered) {
        await prisma.waiverClaim.update({
          where: { id: claim.id },
          data: { status: 'INVALID', processedAt: now, notes: 'Player already rostered in league' },
        })
        invalid++
        continue
      }

      // Verify drop target
      if (claim.dropPlayerId) {
        const dropEntry = await prisma.rosterEntry.findFirst({
          where: { teamId: claim.teamId, playerId: claim.dropPlayerId, isActive: true },
        })
        if (!dropEntry) {
          await prisma.waiverClaim.update({
            where: { id: claim.id },
            data: { status: 'INVALID', processedAt: now, notes: 'Drop target not on active roster' },
          })
          invalid++
          continue
        }
      }

      // Process the winning claim
      if (claim.dropPlayerId) {
        await prisma.rosterEntry.update({
          where: { teamId_playerId: { teamId: claim.teamId, playerId: claim.dropPlayerId } },
          data: { isActive: false, droppedAt: now },
        })
        rosterCounts.set(claim.teamId, (rosterCounts.get(claim.teamId) || 0) - 1)
        const dropPlayer = await prisma.player.findUnique({ where: { id: claim.dropPlayerId }, select: { name: true } })
        recordTransaction({
          type: 'FREE_AGENT_DROP',
          teamId: claim.teamId,
          playerId: claim.dropPlayerId,
          playerName: dropPlayer?.name || 'Unknown',
          leagueId,
        }, prisma).catch(err => console.error('Waiver drop transaction log failed:', err.message))
      }

      await prisma.rosterEntry.create({
        data: {
          teamId: claim.teamId,
          playerId: claim.playerId,
          position: 'BENCH',
          rosterStatus: 'BENCH',
          acquiredVia: 'WAIVER',
        },
      })
      rosterCounts.set(claim.teamId, (rosterCounts.get(claim.teamId) || 0) + 1)

      recordTransaction({
        type: 'WAIVER_CLAIM',
        teamId: claim.teamId,
        playerId: claim.playerId,
        playerName: claim.player.name,
        leagueId,
      }, prisma).catch(err => console.error('Waiver claim transaction log failed:', err.message))

      await prisma.waiverClaim.update({
        where: { id: claim.id },
        data: { status: 'WON', processedAt: now, notes: 'Won via priority' },
      })

      try {
        await createNotification({
          userId: claim.userId,
          type: 'WAIVER_WON',
          title: 'Waiver Claim Won!',
          message: `You successfully claimed ${claim.player.name}`,
          actionUrl: `/leagues/${leagueId}/waivers`,
          data: { playerId: claim.playerId, leagueId },
        }, prisma)
      } catch (err) { console.error('Waiver won notification failed:', err.message) }

      claimedPlayers.add(playerId)
      winnersThisCycle.add(claim.teamId)
      playerClaimed = true
      won++
    }
  }

  // Move winners to the bottom of priority order
  if (winnersThisCycle.size > 0) {
    const nonWinners = priorityOrder.filter(id => !winnersThisCycle.has(id))
    const winners = priorityOrder.filter(id => winnersThisCycle.has(id))
    const newOrder = [...nonWinners, ...winners]

    await prisma.league.update({
      where: { id: leagueId },
      data: {
        settings: { ...league.settings, waiverPriorityOrder: newOrder },
      },
    })
  }

  console.log(`[waiverProcessor] League ${league.name}: ${won} won, ${lost} lost, ${invalid} invalid (rolling)`)

  if (won > 0) {
    try {
      await notifyLeague(leagueId, {
        type: 'WAIVER_PROCESSED',
        title: 'Waivers Processed',
        message: `${won} waiver claim${won > 1 ? 's' : ''} processed in ${league.name}`,
        actionUrl: `/leagues/${leagueId}/waivers`,
        data: { leagueId, won, lost, invalid },
      }, [], prisma)
    } catch (err) { console.error('Waiver summary notification failed:', err.message) }
  }

  return { processed: pendingClaims.length, won, lost, invalid }
}

/**
 * Process waivers for all active leagues that have pending claims.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function processAllWaivers(prisma) {
  // Find leagues with pending waiver claims
  const leaguesWithClaims = await prisma.waiverClaim.findMany({
    where: { status: 'PENDING' },
    select: { leagueId: true },
    distinct: ['leagueId'],
  })

  if (leaguesWithClaims.length === 0) {
    console.log('[waiverProcessor] No pending claims to process')
    return []
  }

  const results = []
  for (const { leagueId } of leaguesWithClaims) {
    const result = await processLeagueWaivers(leagueId, prisma)
    results.push({ leagueId, ...result })
  }

  return results
}

module.exports = { processLeagueWaivers, processAllWaivers }
