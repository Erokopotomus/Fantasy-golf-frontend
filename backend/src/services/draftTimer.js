const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// In-memory timers for auto-pick on timeout
const activeTimers = new Map() // draftId -> timeoutId

// In-memory auction state
const auctionStates = new Map() // draftId -> { phase, budgets, currentNomination, nominationOrder, currentNominatorIndex }

/**
 * Schedule a server-side auto-pick for when the timer expires.
 * Called after each pick, on draft start, and on draft resume.
 */
function scheduleAutoPick(draftId, deadlineISO, io) {
  clearAutoPick(draftId)

  const delay = new Date(deadlineISO).getTime() - Date.now()
  if (delay <= 0) {
    // Already expired, pick immediately
    executeAutoPick(draftId, io)
    return
  }

  const timeoutId = setTimeout(() => {
    executeAutoPick(draftId, io)
  }, delay + 2000) // +2s grace period for client-side picks

  activeTimers.set(draftId, timeoutId)
}

function clearAutoPick(draftId) {
  const existing = activeTimers.get(draftId)
  if (existing) {
    clearTimeout(existing)
    activeTimers.delete(draftId)
  }
}

/**
 * Execute auto-pick: pick the best available player for the current drafter.
 */
async function executeAutoPick(draftId, io) {
  activeTimers.delete(draftId)

  try {
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        league: true,
        draftOrder: { orderBy: { position: 'asc' } },
        picks: { select: { playerId: true } }
      }
    })

    if (!draft || draft.status !== 'IN_PROGRESS') return

    // Determine current drafter (snake logic)
    const totalTeams = draft.draftOrder.length
    const currentPickInRound = (draft.currentPick - 1) % totalTeams
    const isEvenRound = draft.currentRound % 2 === 0
    const currentPosition = isEvenRound
      ? totalTeams - currentPickInRound
      : currentPickInRound + 1
    const currentDrafter = draft.draftOrder.find(o => o.position === currentPosition)
    if (!currentDrafter) return

    // Find best available player (highest OWGR rank = lowest number)
    const draftedIds = draft.picks.map(p => p.playerId)
    const bestPlayer = await prisma.player.findFirst({
      where: {
        isActive: true,
        ...(draftedIds.length > 0 && { id: { notIn: draftedIds } })
      },
      orderBy: [{ owgrRank: { sort: 'asc', nulls: 'last' } }],
      select: { id: true, name: true, country: true, owgrRank: true, headshotUrl: true }
    })

    if (!bestPlayer) return

    // Create the pick
    const pick = await prisma.draftPick.create({
      data: {
        draftId: draft.id,
        teamId: currentDrafter.teamId,
        playerId: bestPlayer.id,
        pickNumber: draft.currentPick,
        round: draft.currentRound,
        isAutoPick: true
      },
      include: {
        player: {
          select: { id: true, name: true, country: true, owgrRank: true, headshotUrl: true }
        },
        team: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    })

    // Add to roster
    await prisma.rosterEntry.create({
      data: {
        teamId: currentDrafter.teamId,
        playerId: bestPlayer.id,
        position: 'ACTIVE'
      }
    })

    // Update draft state
    const newPickNumber = draft.currentPick + 1
    const newRound = Math.ceil(newPickNumber / totalTeams)
    const rosterSize = draft.totalRounds || draft.league.settings?.rosterSize || 6
    const isComplete = newRound > rosterSize

    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        currentPick: newPickNumber,
        currentRound: newRound,
        ...(isComplete && { status: 'COMPLETED', endTime: new Date() })
      }
    })

    if (isComplete) {
      await prisma.league.update({
        where: { id: draft.leagueId },
        data: { status: 'ACTIVE' }
      })
    }

    const pickDeadline = isComplete ? null : new Date(Date.now() + (draft.timePerPick * 1000)).toISOString()

    // Determine next drafter
    let nextDrafterTeamId = null
    if (!isComplete) {
      const nextPickInRound = (newPickNumber - 1) % totalTeams
      const nextIsEvenRound = newRound % 2 === 0
      const nextPosition = nextIsEvenRound
        ? totalTeams - nextPickInRound
        : nextPickInRound + 1
      const nextDrafter = draft.draftOrder.find(o => o.position === nextPosition)
      nextDrafterTeamId = nextDrafter?.teamId || null
    }

    // Emit events
    io.to(`draft-${draftId}`).emit('draft-pick', {
      pick,
      currentPick: newPickNumber,
      currentRound: newRound,
      isComplete,
      pickDeadline,
      nextDrafterTeamId,
      isAutoPick: true
    })

    if (isComplete) {
      io.to(`draft-${draftId}`).emit('draft-completed', { draftId })
    } else {
      // Schedule next auto-pick
      scheduleAutoPick(draftId, pickDeadline, io)
    }

    console.log(`[AutoPick] Draft ${draftId}: Auto-picked ${bestPlayer.name} for team ${currentDrafter.teamId}`)
  } catch (err) {
    console.error(`[AutoPick] Error for draft ${draftId}:`, err.message)
  }
}

// ========================
// AUCTION DRAFT STATE
// ========================

function initAuctionState(draftId, teams, budget) {
  const budgets = {}
  teams.forEach(t => { budgets[t.teamId] = budget })

  const state = {
    phase: 'nominating', // 'nominating' | 'bidding'
    budgets,
    nominationOrder: teams.map(t => t.teamId),
    currentNominatorIndex: 0,
    currentNomination: null, // { playerId, playerName, currentBid, highBidderTeamId, nominatedByTeamId, deadline }
    timer: null
  }
  auctionStates.set(draftId, state)
  return state
}

function getAuctionState(draftId) {
  return auctionStates.get(draftId) || null
}

function clearAuctionState(draftId) {
  const state = auctionStates.get(draftId)
  if (state?.timer) clearTimeout(state.timer)
  auctionStates.delete(draftId)
}

/**
 * Start a nomination: the current nominator picks a player and sets a starting bid.
 */
async function startNomination(draftId, playerId, startingBid, teamId, io) {
  const state = getAuctionState(draftId)
  if (!state) throw new Error('No auction state')
  if (state.phase !== 'nominating') throw new Error('Not in nomination phase')

  const currentNominator = state.nominationOrder[state.currentNominatorIndex]
  if (currentNominator !== teamId) throw new Error('Not your turn to nominate')

  if (startingBid < 1) throw new Error('Minimum bid is $1')
  if (state.budgets[teamId] < startingBid) throw new Error('Insufficient budget')

  // Get player info
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, country: true, owgrRank: true, headshotUrl: true }
  })
  if (!player) throw new Error('Player not found')

  // Check not already drafted
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    select: { picks: { select: { playerId: true } } }
  })
  if (draft.picks.some(p => p.playerId === playerId)) throw new Error('Player already drafted')

  const bidDeadline = new Date(Date.now() + 15000).toISOString() // 15s bid timer

  state.phase = 'bidding'
  state.currentNomination = {
    playerId: player.id,
    playerName: player.name,
    playerData: player,
    currentBid: startingBid,
    highBidderTeamId: teamId,
    nominatedByTeamId: teamId,
    deadline: bidDeadline
  }

  // Set bid timer
  if (state.timer) clearTimeout(state.timer)
  state.timer = setTimeout(() => {
    awardPlayer(draftId, io)
  }, 17000) // 15s + 2s grace

  io.to(`draft-${draftId}`).emit('auction-nomination', {
    playerId: player.id,
    playerName: player.name,
    playerData: player,
    startingBid,
    nominatedByTeamId: teamId,
    currentBid: startingBid,
    highBidderTeamId: teamId,
    deadline: bidDeadline,
    budgets: state.budgets
  })

  return state.currentNomination
}

/**
 * Place a bid on the current nomination.
 */
function placeBid(draftId, amount, teamId, io) {
  const state = getAuctionState(draftId)
  if (!state) throw new Error('No auction state')
  if (state.phase !== 'bidding') throw new Error('No active bidding')
  if (!state.currentNomination) throw new Error('No current nomination')

  if (amount <= state.currentNomination.currentBid) {
    throw new Error(`Bid must be higher than $${state.currentNomination.currentBid}`)
  }
  if (state.budgets[teamId] < amount) throw new Error('Insufficient budget')
  if (state.currentNomination.highBidderTeamId === teamId) throw new Error('You already have the highest bid')

  state.currentNomination.currentBid = amount
  state.currentNomination.highBidderTeamId = teamId

  // Reset bid timer (15s from new bid)
  const bidDeadline = new Date(Date.now() + 15000).toISOString()
  state.currentNomination.deadline = bidDeadline
  if (state.timer) clearTimeout(state.timer)
  state.timer = setTimeout(() => {
    awardPlayer(draftId, io)
  }, 17000)

  io.to(`draft-${draftId}`).emit('auction-bid', {
    playerId: state.currentNomination.playerId,
    currentBid: amount,
    highBidderTeamId: teamId,
    deadline: bidDeadline,
    budgets: state.budgets
  })

  return { currentBid: amount, highBidderTeamId: teamId, deadline: bidDeadline }
}

/**
 * Award the current nomination to the highest bidder.
 */
async function awardPlayer(draftId, io) {
  const state = getAuctionState(draftId)
  if (!state || !state.currentNomination) return

  if (state.timer) clearTimeout(state.timer)

  const { playerId, playerName, currentBid, highBidderTeamId, nominatedByTeamId, playerData } = state.currentNomination

  try {
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        league: true,
        draftOrder: { orderBy: { position: 'asc' } },
        picks: true
      }
    })
    if (!draft) return

    const totalTeams = draft.draftOrder.length
    const rosterSize = draft.totalRounds || draft.league.settings?.rosterSize || 6

    // Deduct budget
    state.budgets[highBidderTeamId] -= currentBid

    // Create pick
    const pick = await prisma.draftPick.create({
      data: {
        draftId,
        teamId: highBidderTeamId,
        playerId,
        pickNumber: draft.currentPick,
        round: draft.currentRound,
        amount: currentBid,
        nominatedBy: nominatedByTeamId
      },
      include: {
        player: {
          select: { id: true, name: true, country: true, owgrRank: true, headshotUrl: true }
        },
        team: {
          include: { user: { select: { id: true, name: true, avatar: true } } }
        }
      }
    })

    // Add to roster
    await prisma.rosterEntry.create({
      data: {
        teamId: highBidderTeamId,
        playerId,
        position: 'ACTIVE'
      }
    })

    // Update draft pick counter
    const newPickNumber = draft.currentPick + 1
    const totalPicks = totalTeams * rosterSize
    const isComplete = newPickNumber > totalPicks

    await prisma.draft.update({
      where: { id: draftId },
      data: {
        currentPick: newPickNumber,
        currentRound: Math.ceil(newPickNumber / totalTeams),
        ...(isComplete && { status: 'COMPLETED', endTime: new Date() })
      }
    })

    if (isComplete) {
      await prisma.league.update({
        where: { id: draft.leagueId },
        data: { status: 'ACTIVE' }
      })
    }

    // Emit award event
    io.to(`draft-${draftId}`).emit('auction-won', {
      pick,
      playerId,
      playerName,
      amount: currentBid,
      teamId: highBidderTeamId,
      budgets: state.budgets,
      isComplete
    })

    // Also emit as regular pick for board updates
    io.to(`draft-${draftId}`).emit('draft-pick', {
      pick,
      currentPick: newPickNumber,
      currentRound: Math.ceil(newPickNumber / totalTeams),
      isComplete,
      pickDeadline: null,
      nextDrafterTeamId: null
    })

    if (isComplete) {
      io.to(`draft-${draftId}`).emit('draft-completed', { draftId })
      clearAuctionState(draftId)
      return
    }

    // Move to next nominator
    state.currentNomination = null
    state.phase = 'nominating'
    state.currentNominatorIndex = (state.currentNominatorIndex + 1) % totalTeams

    io.to(`draft-${draftId}`).emit('auction-next-nominator', {
      nominatorTeamId: state.nominationOrder[state.currentNominatorIndex],
      budgets: state.budgets
    })

    console.log(`[Auction] Draft ${draftId}: ${playerName} won by team ${highBidderTeamId} for $${currentBid}`)
  } catch (err) {
    console.error(`[Auction] Award error for draft ${draftId}:`, err.message)
  }
}

module.exports = {
  scheduleAutoPick,
  clearAutoPick,
  initAuctionState,
  getAuctionState,
  clearAuctionState,
  startNomination,
  placeBid,
  awardPlayer
}
