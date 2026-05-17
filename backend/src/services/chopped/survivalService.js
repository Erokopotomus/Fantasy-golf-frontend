const prisma = require('../../lib/prisma');
const { createNotification, notifyLeague } = require('../notificationService');

/**
 * Chop one or more teams in a single transaction.
 * Effects:
 *   - Marks each team eliminated (eliminatedAt + eliminationWeek + finalRank)
 *   - Releases their entire roster to free-agent pool INSTANTLY (no waiver delay)
 *   - Writes one ChopEvent row per chopped team
 * Post-transaction (fire-and-forget, never throw):
 *   - Push/in-app notification to each chopped owner
 *   - In-app broadcast to remaining league members
 *   - If only one team alive remains → finalRank=1 + Champion notification
 *
 * @param {object} args
 * @param {string} args.leagueId
 * @param {number} args.week
 * @param {string[]} args.teamIds
 * @param {'manual'|'auto_fallback'} args.triggerType
 * @param {string|null} [args.triggeredByUserId]
 * @param {string|null} [args.reasoning]
 * @param {Array<{teamId,safePct,mean,variance,rank}>|null} [args.safePercentResults]
 */
async function executeChop({
  leagueId,
  week,
  teamIds,
  triggerType,
  triggeredByUserId = null,
  reasoning = null,
  safePercentResults = null,
}) {
  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    throw new Error('teamIds required');
  }

  const result = await prisma.$transaction(async (tx) => {
    const league = await tx.league.findUnique({
      where: { id: leagueId },
      include: { teams: { where: { eliminatedAt: null } } },
    });
    if (!league) throw new Error(`League not found: ${leagueId}`);
    if (league.format !== 'CHOPPED') {
      throw new Error(`League ${leagueId} is not CHOPPED format (got ${league.format})`);
    }

    const aliveBefore = league.teams.length;
    const chopped = [];

    for (const teamId of teamIds) {
      const team = league.teams.find(t => t.id === teamId);
      if (!team) throw new Error(`Team ${teamId} not alive in league ${leagueId}`);

      // Final rank: assigned in REVERSE elimination order.
      // If 14 alive and this is the first chop in batch, rank = 14 (last out).
      // Next chop in same batch (if any) gets rank 13, etc.
      const finalRank = aliveBefore - chopped.length;

      await tx.team.update({
        where: { id: teamId },
        data: {
          eliminatedAt: new Date(),
          eliminationWeek: week,
          finalRank,
        },
      });

      // Release all rostered players — no waiver delay. RosterEntry soft-delete
      // (set isActive=false + droppedAt) is the canonical pattern; do the same
      // as a standard drop transaction.
      await tx.rosterEntry.updateMany({
        where: { teamId, isActive: true },
        data: { isActive: false, droppedAt: new Date() },
      });

      const safe = safePercentResults?.find(s => s.teamId === teamId);

      const chopEvent = await tx.chopEvent.create({
        data: {
          leagueId,
          teamId,
          week,
          scoredPoints: 0, // populated later by scoring pipeline if needed
          safePercent: safe?.safePct ?? 0,
          triggerType,
          triggeredByUserId,
          tiebreakerUsed: null,
          reasoning,
        },
      });

      chopped.push({
        teamId,
        ownerId: team.userId,
        teamName: team.name,
        finalRank,
        chopEventId: chopEvent.id,
      });
    }

    return {
      leagueId,
      leagueName: league.name,
      week,
      chopped,
      aliveRemaining: aliveBefore - chopped.length,
    };
  });

  // Fire-and-forget notifications. Errors logged, never thrown.
  for (const c of result.chopped) {
    try {
      await createNotification({
        userId: c.ownerId,
        type: 'TEAM_CHOPPED',
        title: 'You\'ve been Chopped 💀',
        message: `${c.teamName} eliminated in week ${result.week}. Final rank: #${c.finalRank}`,
        actionUrl: `/leagues/${result.leagueId}/chop`,
        category: 'chopped',
        data: {
          leagueId: result.leagueId,
          teamId: c.teamId,
          week: result.week,
          finalRank: c.finalRank,
          triggerType,
        },
      }, prisma);
    } catch (e) {
      console.error(`[chopped] owner notification failed (${c.teamId}):`, e.message);
    }

    try {
      await notifyLeague(
        result.leagueId,
        {
          type: 'TEAM_CHOPPED',
          title: `${c.teamName} was Chopped`,
          message: `Eliminated in week ${result.week}. ${result.aliveRemaining} team${result.aliveRemaining === 1 ? '' : 's'} remaining.`,
          actionUrl: `/leagues/${result.leagueId}/chop`,
          category: 'chopped',
          data: { teamId: c.teamId, week: result.week, finalRank: c.finalRank },
        },
        [c.ownerId], // exclude owner — they got the personal notification above
        prisma
      );
    } catch (e) {
      console.error(`[chopped] league broadcast failed:`, e.message);
    }
  }

  // Champion detection
  if (result.aliveRemaining === 1) {
    try {
      const survivor = await prisma.team.findFirst({
        where: { leagueId: result.leagueId, eliminatedAt: null },
      });
      if (survivor) {
        await prisma.team.update({
          where: { id: survivor.id },
          data: { finalRank: 1 },
        });
        await createNotification({
          userId: survivor.userId,
          type: 'CHOPPED_SEASON_COMPLETE',
          title: '🏆 Champion!',
          message: `${survivor.name} survived. Last team standing in ${result.leagueName}.`,
          actionUrl: `/leagues/${result.leagueId}/chop`,
          category: 'chopped',
          data: { leagueId: result.leagueId, teamId: survivor.id },
        }, prisma);
      }
    } catch (e) {
      console.error(`[chopped] champion notification failed:`, e.message);
    }
  }

  return result;
}

module.exports = { executeChop };
