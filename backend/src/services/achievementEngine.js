// Achievement Unlock Engine
// Evaluates achievement criteria against user stats and unlocks earned achievements.
// Called: (1) on-demand after key events (championship win, draft complete, trade, prediction resolved)
//         (2) via daily cron for batch evaluation

const prisma = require('../lib/prisma')

async function evaluateUser(userId) {
  const [achievements, unlocks, profile] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.achievementUnlock.findMany({ where: { userId }, select: { achievementId: true } }),
    prisma.managerProfile.findFirst({ where: { userId, sportId: null } }),
  ])
  const unlockedIds = new Set(unlocks.map(u => u.achievementId))
  const newUnlocks = []

  for (const ach of achievements) {
    if (unlockedIds.has(ach.id)) continue
    const earned = await checkCriteria(userId, ach.criteria, profile)
    if (earned) {
      newUnlocks.push({
        userId,
        achievementId: ach.id,
        context: { evaluatedAt: new Date().toISOString(), source: 'engine' },
      })
    }
  }

  if (newUnlocks.length > 0) {
    await prisma.achievementUnlock.createMany({ data: newUnlocks, skipDuplicates: true })
    // Fire notifications for each unlock
    try {
      const { createNotification } = require('./notificationService')
      for (const unlock of newUnlocks) {
        const ach = achievements.find(a => a.id === unlock.achievementId)
        if (ach) {
          createNotification(prisma, {
            userId,
            type: 'ACHIEVEMENT_UNLOCKED',
            title: 'Achievement Unlocked!',
            message: `You earned "${ach.name}" — ${ach.description}`,
            data: { achievementId: ach.id, achievementName: ach.name, tier: ach.tier },
          }).catch(() => {})
        }
      }
    } catch (e) {
      // notificationService may not be available
    }
  }

  return newUnlocks.length
}

async function checkCriteria(userId, criteria, profile) {
  if (!criteria || !criteria.type) return false
  switch (criteria.type) {
    case 'championships':
      return (profile?.championships || 0) >= (criteria.threshold || 1)
    case 'best_finish':
      return (profile?.bestFinish || 999) <= (criteria.threshold || 3)
    case 'total_leagues':
      return (profile?.totalLeagues || 0) >= (criteria.threshold || 1)
    case 'total_seasons':
      return (profile?.totalSeasons || 0) >= (criteria.threshold || 1)
    case 'wins':
      return (profile?.wins || 0) >= (criteria.threshold || 1)
    case 'total_points':
      return (profile?.totalPoints || 0) >= (criteria.threshold || 1000)
    case 'win_pct':
      return (profile?.winPct || 0) >= (criteria.threshold || 0.6)
    case 'trades': {
      const tradeCount = await prisma.trade.count({
        where: { OR: [{ proposerId: userId }, { recipientId: userId }], status: 'COMPLETED' },
      })
      return tradeCount >= (criteria.threshold || 1)
    }
    case 'waiver_claims': {
      const claimCount = await prisma.waiverClaim.count({
        where: { userId, status: 'PROCESSED' },
      })
      return claimCount >= (criteria.threshold || 1)
    }
    case 'predictions_correct': {
      const correctCount = await prisma.prediction.count({
        where: { userId, outcome: 'CORRECT' },
      })
      return correctCount >= (criteria.threshold || 1)
    }
    case 'predictions_total': {
      const totalCount = await prisma.prediction.count({ where: { userId } })
      return totalCount >= (criteria.threshold || 1)
    }
    case 'multi_sport': {
      const sportCount = await prisma.managerProfile.count({
        where: { userId, sportId: { not: null }, totalLeagues: { gt: 0 } },
      })
      return sportCount >= (criteria.threshold || 2)
    }
    case 'draft_efficiency':
      return (profile?.draftEfficiency || 0) >= (criteria.threshold || 80)
    // Complex criteria — stub as false until we have richer league history
    case 'consecutive_championships':
    case 'worst_to_first':
    case 'undefeated_season':
    case 'draft_steal':
    case 'perfect_lineup':
      return false
    default:
      return false
  }
}

// Get current progress toward a criteria (for progress bars)
async function getProgress(userId, criteria, profile) {
  if (!criteria || !criteria.type || !criteria.threshold) return null
  let current = 0
  switch (criteria.type) {
    case 'championships': current = profile?.championships || 0; break
    case 'best_finish': current = profile?.bestFinish || 0; break
    case 'total_leagues': current = profile?.totalLeagues || 0; break
    case 'total_seasons': current = profile?.totalSeasons || 0; break
    case 'wins': current = profile?.wins || 0; break
    case 'total_points': current = profile?.totalPoints || 0; break
    case 'win_pct': current = profile?.winPct || 0; break
    case 'draft_efficiency': current = profile?.draftEfficiency || 0; break
    case 'trades':
      current = await prisma.trade.count({
        where: { OR: [{ proposerId: userId }, { recipientId: userId }], status: 'COMPLETED' },
      })
      break
    case 'waiver_claims':
      current = await prisma.waiverClaim.count({ where: { userId, status: 'PROCESSED' } })
      break
    case 'predictions_correct':
      current = await prisma.prediction.count({ where: { userId, outcome: 'CORRECT' } })
      break
    case 'predictions_total':
      current = await prisma.prediction.count({ where: { userId } })
      break
    case 'multi_sport':
      current = await prisma.managerProfile.count({
        where: { userId, sportId: { not: null }, totalLeagues: { gt: 0 } },
      })
      break
    default:
      return null
  }
  const target = criteria.threshold
  // For best_finish, lower is better — invert the logic
  if (criteria.type === 'best_finish') {
    return { current, target, pct: current > 0 && current <= target ? 100 : 0 }
  }
  return { current, target, pct: Math.min(100, Math.round((current / target) * 100)) }
}

// Batch evaluation — run for all active users
async function evaluateAll() {
  const users = await prisma.user.findMany({ select: { id: true } })
  let totalUnlocks = 0
  for (const user of users) {
    totalUnlocks += await evaluateUser(user.id)
  }
  return totalUnlocks
}

module.exports = { evaluateUser, evaluateAll, checkCriteria, getProgress }
