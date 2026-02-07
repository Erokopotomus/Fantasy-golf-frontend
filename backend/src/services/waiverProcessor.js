/**
 * Waiver Processor Service
 *
 * Processes FAAB waiver claims for all active leagues.
 * - Groups pending claims by player
 * - Highest bid wins (tiebreaker: reverse standings = worst record picks first)
 * - Validates budget, roster space, and drop targets
 * - Creates roster entries, deducts budgets, logs transactions
 */

const { recordTransaction } = require('./fantasyTracker')

/**
 * Process all pending waiver claims for a single league.
 *
 * @param {string} leagueId
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {{ processed: number, won: number, lost: number, invalid: number }}
 */
async function processLeagueWaivers(leagueId, prisma) {
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

      claimedPlayers.add(playerId)
      playerClaimed = true
      won++
    }
  }

  console.log(`[waiverProcessor] League ${league.name}: ${won} won, ${lost} lost, ${invalid} invalid`)
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
