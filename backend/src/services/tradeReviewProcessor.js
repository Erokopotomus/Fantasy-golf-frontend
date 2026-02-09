/**
 * Trade Review Processor
 *
 * Processes trades that have passed their review period.
 * If veto threshold not met, trade executes. Otherwise, trade is vetoed.
 */

const { createNotification } = require('./notificationService')

/**
 * Process all trades that have expired review periods.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function processExpiredReviews(prisma) {
  const now = new Date()

  // Find trades past their review period
  const expiredTrades = await prisma.trade.findMany({
    where: {
      status: 'IN_REVIEW',
      reviewUntil: { lte: now },
    },
    include: {
      league: { include: { members: { select: { userId: true } } } },
      senderTeam: true,
      receiverTeam: true,
    },
  })

  if (expiredTrades.length === 0) return []

  const results = []

  for (const trade of expiredTrades) {
    try {
      const votes = Array.isArray(trade.vetoVotes) ? trade.vetoVotes : []
      const vetoThreshold = trade.league.settings?.tradeVetoThreshold || 50
      const eligibleVoters = trade.league.members.filter(
        m => m.userId !== trade.initiatorId && m.userId !== trade.receiverId
      ).length

      const vetoCount = votes.filter(v => v.vote === 'veto').length
      const vetoPercent = eligibleVoters > 0 ? (vetoCount / eligibleVoters) * 100 : 0

      if (vetoPercent >= vetoThreshold) {
        // Vetoed
        await prisma.trade.update({
          where: { id: trade.id },
          data: { status: 'VETOED' },
        })

        try {
          await createNotification({
            userId: trade.initiatorId,
            type: 'TRADE_VETOED',
            title: 'Trade Vetoed',
            message: 'Your trade was vetoed by league vote',
            actionUrl: `/leagues/${trade.leagueId}/trades`,
            data: { tradeId: trade.id, leagueId: trade.leagueId },
          }, prisma)
        } catch (err) { console.error('Trade veto notification failed:', err.message) }

        results.push({ tradeId: trade.id, result: 'vetoed' })
      } else {
        // Execute the trade
        const senderPlayerIds = Array.isArray(trade.senderPlayers) ? trade.senderPlayers : []
        const receiverPlayerIds = Array.isArray(trade.receiverPlayers) ? trade.receiverPlayers : []

        await prisma.$transaction([
          ...senderPlayerIds.map(playerId =>
            prisma.rosterEntry.update({
              where: { teamId_playerId: { teamId: trade.senderTeamId, playerId } },
              data: { teamId: trade.receiverTeamId },
            })
          ),
          ...receiverPlayerIds.map(playerId =>
            prisma.rosterEntry.update({
              where: { teamId_playerId: { teamId: trade.receiverTeamId, playerId } },
              data: { teamId: trade.senderTeamId },
            })
          ),
          prisma.trade.update({
            where: { id: trade.id },
            data: { status: 'ACCEPTED' },
          }),
        ])

        try {
          await createNotification({
            userId: trade.initiatorId,
            type: 'TRADE_ACCEPTED',
            title: 'Trade Approved',
            message: 'Your trade passed league review and has been executed',
            actionUrl: `/leagues/${trade.leagueId}/trades`,
            data: { tradeId: trade.id, leagueId: trade.leagueId },
          }, prisma)
        } catch (err) { console.error('Trade accepted notification failed:', err.message) }

        results.push({ tradeId: trade.id, result: 'executed' })
      }
    } catch (err) {
      console.error(`[tradeReviewProcessor] Failed to process trade ${trade.id}:`, err.message)
      results.push({ tradeId: trade.id, result: 'error', error: err.message })
    }
  }

  if (results.length > 0) {
    console.log(`[tradeReviewProcessor] Processed ${results.length} expired reviews`)
  }

  return results
}

module.exports = { processExpiredReviews }
