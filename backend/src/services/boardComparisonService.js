/**
 * Board vs Reality Comparison Service
 *
 * Generates post-draft analysis comparing a user's draft board
 * to their actual draft picks. Part of Phase 6A (Decision Graph data gaps).
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Generate a comparison between a user's draft board and their mock draft.
 * Called automatically when a mock draft is saved.
 */
async function generateMockDraftComparison(userId, mockDraftId) {
  try {
    const mockDraft = await prisma.mockDraftResult.findUnique({
      where: { id: mockDraftId },
      include: { sport: { select: { slug: true } } },
    })
    if (!mockDraft || mockDraft.userId !== userId) return null

    const sport = mockDraft.sport?.slug || 'golf'
    const userPicks = mockDraft.userPicks || []
    if (userPicks.length === 0) return null

    // Find user's most recent board for this sport
    const board = await prisma.draftBoard.findFirst({
      where: { userId, sport },
      orderBy: { updatedAt: 'desc' },
      include: {
        entries: {
          include: { player: { select: { id: true, name: true } } },
          orderBy: { rank: 'asc' },
        },
      },
    })
    if (!board || board.entries.length === 0) return null

    // Build comparison
    const comparison = buildComparison(userPicks, board.entries, board.id)

    // Check for existing comparison
    const existing = await prisma.draftBoardComparison.findFirst({
      where: { mockDraftId, boardId: board.id },
    })
    if (existing) {
      return prisma.draftBoardComparison.update({
        where: { id: existing.id },
        data: { comparisonData: comparison },
      })
    }

    return prisma.draftBoardComparison.create({
      data: {
        userId,
        mockDraftId,
        boardId: board.id,
        sport,
        comparisonData: comparison,
      },
    })
  } catch (err) {
    console.error('Failed to generate mock draft comparison:', err.message)
    return null
  }
}

/**
 * Generate a comparison between a user's draft board and their real draft.
 * Called when a draft completes.
 */
async function generateDraftComparison(userId, draftId) {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: {
        league: { select: { sport: { select: { slug: true } } } },
        picks: {
          include: {
            player: { select: { id: true, name: true } },
            team: { select: { userId: true } },
          },
          orderBy: { pickNumber: 'asc' },
        },
      },
    })
    if (!draft) return null

    const sport = draft.league?.sport?.slug || 'golf'
    const userPicks = draft.picks
      .filter(p => p.team.userId === userId)
      .map(p => ({
        pickNumber: p.pickNumber,
        round: p.round,
        playerId: p.playerId,
        playerName: p.player.name,
        playerRank: null,
        pickTag: p.pickTag || null,
        boardRankAtPick: p.boardRankAtPick || null,
        amount: p.amount || null,
      }))
    if (userPicks.length === 0) return null

    const board = await prisma.draftBoard.findFirst({
      where: { userId, sport },
      orderBy: { updatedAt: 'desc' },
      include: {
        entries: {
          include: { player: { select: { id: true, name: true } } },
          orderBy: { rank: 'asc' },
        },
      },
    })
    if (!board || board.entries.length === 0) return null

    const comparison = buildComparison(userPicks, board.entries, board.id)

    const existing = await prisma.draftBoardComparison.findFirst({
      where: { draftId, boardId: board.id },
    })
    if (existing) {
      return prisma.draftBoardComparison.update({
        where: { id: existing.id },
        data: { comparisonData: comparison },
      })
    }

    return prisma.draftBoardComparison.create({
      data: {
        userId,
        draftId,
        boardId: board.id,
        sport,
        comparisonData: comparison,
      },
    })
  } catch (err) {
    console.error('Failed to generate draft comparison:', err.message)
    return null
  }
}

/**
 * Build the comparison data structure.
 */
function buildComparison(userPicks, boardEntries, boardId) {
  const boardMap = new Map()
  for (const entry of boardEntries) {
    boardMap.set(entry.playerId, entry)
    boardMap.set((entry.player?.name || '').toLowerCase(), entry)
  }

  let picksMatchingBoard = 0
  let picksDeviatingFromBoard = 0
  let totalDeviation = 0
  let deviationCount = 0

  const picks = userPicks.map((pick, i) => {
    const draftPosition = pick.pickNumber || (i + 1)
    const entry = boardMap.get(pick.playerId) || boardMap.get((pick.playerName || '').toLowerCase())
    const wasOnBoard = !!entry
    const boardRank = entry?.rank || pick.boardRankAtPick || null
    const deviation = boardRank != null ? draftPosition - boardRank : null

    if (wasOnBoard && boardRank != null) {
      if (Math.abs(deviation) <= 3) {
        picksMatchingBoard++
      } else {
        picksDeviatingFromBoard++
      }
      totalDeviation += Math.abs(deviation)
      deviationCount++
    } else {
      picksDeviatingFromBoard++
    }

    // Extract tags and notes from board entry
    const tags = entry?.tags || []
    const reasonChips = entry?.reasonChips || []
    const boardNotes = entry?.notes || null

    return {
      playerId: pick.playerId,
      playerName: pick.playerName,
      draftPosition,
      auctionAmount: pick.amount || null,
      boardRank,
      deviation,
      pickTag: pick.pickTag || null,
      tags: Array.isArray(tags) ? tags : [],
      reasonChips: Array.isArray(reasonChips) ? reasonChips : [],
      boardNotes,
      wasOnBoard,
    }
  })

  // Find board players not drafted
  const draftedPlayerIds = new Set(userPicks.map(p => p.playerId))
  const draftedPlayerNames = new Set(userPicks.map(p => (p.playerName || '').toLowerCase()))

  const boardPlayersNotDrafted = boardEntries
    .filter(e => !draftedPlayerIds.has(e.playerId) && !draftedPlayerNames.has((e.player?.name || '').toLowerCase()))
    .filter(e => e.rank <= userPicks.length * 2) // Only show players ranked within 2x the draft size
    .map(e => ({
      playerId: e.playerId,
      playerName: e.player?.name || 'Unknown',
      boardRank: e.rank,
      tags: Array.isArray(e.tags) ? e.tags : [],
      reasonChips: Array.isArray(e.reasonChips) ? e.reasonChips : [],
      boardNotes: e.notes || null,
    }))

  return {
    totalPicks: userPicks.length,
    picksMatchingBoard,
    picksDeviatingFromBoard,
    averageBoardRankDeviation: deviationCount > 0 ? Math.round((totalDeviation / deviationCount) * 10) / 10 : null,
    boardId,
    picks,
    boardPlayersNotDrafted,
  }
}

/**
 * Get comparison for a user's draft/mock draft.
 */
async function getComparison(userId, { draftId, mockDraftId }) {
  const where = { userId }
  if (draftId) where.draftId = draftId
  if (mockDraftId) where.mockDraftId = mockDraftId

  return prisma.draftBoardComparison.findFirst({ where, orderBy: { createdAt: 'desc' } })
}

/**
 * Get user's most recent comparison.
 */
async function getLatestComparison(userId) {
  return prisma.draftBoardComparison.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

module.exports = {
  generateMockDraftComparison,
  generateDraftComparison,
  getComparison,
  getLatestComparison,
}
