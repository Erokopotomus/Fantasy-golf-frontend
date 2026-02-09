/**
 * Draft Dollar Service
 *
 * Manages auction draft dollar accounts and transactions between teams.
 * Supports current-year and next-year dollar trading with configurable bumpers.
 */

/**
 * Get or create DraftDollarAccounts for all teams in a league season.
 */
async function getOrCreateAccounts(leagueId, leagueSeasonId, defaultBudget, prisma) {
  const teams = await prisma.team.findMany({
    where: { leagueId },
    select: { id: true },
  })

  const accounts = []
  for (const team of teams) {
    const account = await prisma.draftDollarAccount.upsert({
      where: {
        teamId_leagueSeasonId: {
          teamId: team.id,
          leagueSeasonId,
        },
      },
      update: {},
      create: {
        teamId: team.id,
        leagueSeasonId,
        currentBalance: defaultBudget,
        nextYearBalance: defaultBudget,
      },
    })
    accounts.push(account)
  }

  return accounts
}

/**
 * Validate that a transfer won't violate min/max bumpers.
 */
async function validateBumpers(teamId, leagueSeasonId, amount, yearType, direction, settings, prisma) {
  const account = await prisma.draftDollarAccount.findUnique({
    where: {
      teamId_leagueSeasonId: { teamId, leagueSeasonId },
    },
  })

  if (!account) {
    return { valid: false, balance: 0, limit: null, reason: 'No draft dollar account found' }
  }

  const balance = yearType === 'current' ? account.currentBalance : account.nextYearBalance
  const newBalance = direction === 'subtract' ? balance - amount : balance + amount

  const minBudget = settings.minBudget != null ? settings.minBudget : null
  const maxBudget = settings.maxBudget != null ? settings.maxBudget : null

  if (minBudget != null && newBalance < minBudget) {
    return {
      valid: false,
      balance,
      limit: minBudget,
      reason: `Would drop ${yearType}-year balance to $${newBalance}, below minimum $${minBudget}`,
    }
  }

  if (maxBudget != null && newBalance > maxBudget) {
    return {
      valid: false,
      balance,
      limit: maxBudget,
      reason: `Would raise ${yearType}-year balance to $${newBalance}, above maximum $${maxBudget}`,
    }
  }

  return { valid: true, balance, limit: null }
}

/**
 * Transfer draft dollars between teams.
 * Creates a transaction record and updates both account balances atomically.
 */
async function transferDollars({
  fromTeamId,
  toTeamId,
  amount,
  yearType,
  leagueId,
  leagueSeasonId,
  category,
  description,
  tradeId,
  initiatedById,
  settings,
}, prisma) {
  if (amount <= 0) {
    throw new Error('Transfer amount must be positive')
  }

  // Validate bumpers for the sender (subtract)
  if (fromTeamId) {
    const senderCheck = await validateBumpers(fromTeamId, leagueSeasonId, amount, yearType, 'subtract', settings || {}, prisma)
    if (!senderCheck.valid) {
      throw new Error(senderCheck.reason)
    }
  }

  // Validate bumpers for the receiver (add)
  if (toTeamId) {
    const receiverCheck = await validateBumpers(toTeamId, leagueSeasonId, amount, yearType, 'add', settings || {}, prisma)
    if (!receiverCheck.valid) {
      throw new Error(receiverCheck.reason)
    }
  }

  const balanceField = yearType === 'current' ? 'currentBalance' : 'nextYearBalance'

  return prisma.$transaction(async (tx) => {
    // Deduct from sender
    if (fromTeamId) {
      await tx.draftDollarAccount.update({
        where: {
          teamId_leagueSeasonId: { teamId: fromTeamId, leagueSeasonId },
        },
        data: {
          [balanceField]: { decrement: amount },
        },
      })
    }

    // Add to receiver
    if (toTeamId) {
      await tx.draftDollarAccount.update({
        where: {
          teamId_leagueSeasonId: { teamId: toTeamId, leagueSeasonId },
        },
        data: {
          [balanceField]: { increment: amount },
        },
      })
    }

    // Create transaction record
    const transaction = await tx.draftDollarTransaction.create({
      data: {
        leagueId,
        leagueSeasonId,
        fromTeamId,
        toTeamId,
        amount,
        yearType,
        category,
        description,
        tradeId: tradeId || null,
        initiatedById,
      },
    })

    return transaction
  })
}

module.exports = {
  getOrCreateAccounts,
  validateBumpers,
  transferDollars,
}
