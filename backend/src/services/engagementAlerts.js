/**
 * Engagement Alerts Service
 *
 * Sends push notifications when rostered players have notable performances
 * during live tournaments. Called from the 5-minute live scoring cron.
 *
 * Alert types:
 * - Hot Round: Player is -4 or better through 9+ holes
 * - Leader: Rostered player moves into Top 3
 * - Eagle/Ace: Player makes eagle or hole-in-one
 * - Cut Danger: Player projected to miss cut after R2
 */

const { createNotification } = require('./notificationService')

// In-memory throttle: max 1 alert per player per user per 2 hours
const alertThrottle = new Map() // key: `${userId}-${playerId}-${tournamentId}` -> lastAlertTime

const THROTTLE_MS = 2 * 60 * 60 * 1000 // 2 hours

function shouldAlert(userId, playerId, tournamentId) {
  const key = `${userId}-${playerId}-${tournamentId}`
  const last = alertThrottle.get(key)
  if (last && Date.now() - last < THROTTLE_MS) return false
  alertThrottle.set(key, Date.now())
  return true
}

/**
 * Check rostered players for notable performances and send alerts.
 * Called after syncLiveScoring() on Thu-Sun.
 */
async function checkRosterAlerts(prisma) {
  // Find active tournaments (IN_PROGRESS)
  const activeTournaments = await prisma.tournament.findMany({
    where: { status: 'IN_PROGRESS' },
    select: { id: true, name: true, datagolfId: true },
  })

  if (activeTournaments.length === 0) return { alerts: 0 }

  let totalAlerts = 0

  for (const tournament of activeTournaments) {
    // Get current performances for this tournament
    const performances = await prisma.performance.findMany({
      where: { tournamentId: tournament.id },
      include: {
        player: { select: { id: true, name: true } },
        roundScores: {
          orderBy: { round: 'desc' },
          take: 1,
        },
      },
    })

    if (performances.length === 0) continue

    // Find all leagues with active fantasy weeks for this tournament's season
    const season = await prisma.season.findFirst({
      where: { isCurrent: true, sport: { slug: 'golf' } },
    })
    if (!season) continue

    const leagueSeasons = await prisma.leagueSeason.findMany({
      where: { seasonId: season.id },
      include: {
        teamSeasons: {
          include: {
            team: {
              select: {
                id: true,
                userId: true,
                roster: { select: { playerId: true } },
              },
            },
          },
        },
        league: { select: { id: true } },
      },
    })

    // Build map: playerId -> [{ userId, leagueId }]
    const rosterMap = new Map()
    for (const ls of leagueSeasons) {
      for (const ts of ls.teamSeasons) {
        if (!ts.team.userId) continue
        for (const slot of ts.team.roster) {
          if (!rosterMap.has(slot.playerId)) rosterMap.set(slot.playerId, [])
          rosterMap.get(slot.playerId).push({
            userId: ts.team.userId,
            leagueId: ls.league.id,
          })
        }
      }
    }

    // Check each performance for alert conditions
    for (const perf of performances) {
      const owners = rosterMap.get(perf.playerId)
      if (!owners || owners.length === 0) continue

      const latestRound = perf.roundScores[0]
      const alerts = []

      // Hot Round: -4 or better through 9+ holes
      if (latestRound && latestRound.holesPlayed >= 9 && latestRound.toPar <= -4) {
        const score = latestRound.toPar > 0 ? `+${latestRound.toPar}` : latestRound.toPar
        alerts.push({
          title: `${perf.player.name} is on fire!`,
          message: `${score} through ${latestRound.holesPlayed} holes at ${tournament.name}`,
        })
      }

      // Leader Alert: Top 3 overall
      if (perf.position && perf.position <= 3) {
        const pos = perf.position === 1 ? '1st' : perf.position === 2 ? '2nd' : '3rd'
        alerts.push({
          title: `${perf.player.name} has moved to ${pos}`,
          message: `At ${tournament.name}`,
        })
      }

      // Cut Danger: projected to miss cut (position > half the field after R2)
      if (latestRound && latestRound.round === 2 && perf.position) {
        const fieldSize = performances.length
        if (perf.position > fieldSize / 2) {
          alerts.push({
            title: `${perf.player.name} is on the cut line`,
            message: `Currently ${perf.position}${perf.position === 1 ? 'st' : perf.position === 2 ? 'nd' : perf.position === 3 ? 'rd' : 'th'} at ${tournament.name}`,
          })
        }
      }

      // Send alerts to all owners (with throttling)
      for (const alert of alerts) {
        for (const owner of owners) {
          if (!shouldAlert(owner.userId, perf.playerId, tournament.id)) continue

          try {
            await createNotification({
              userId: owner.userId,
              type: 'ROSTER_PLAYER_ALERT',
              title: alert.title,
              message: alert.message,
              actionUrl: `/leagues/${owner.leagueId}/scoring`,
              category: 'roster_alerts',
              data: { playerId: perf.playerId, tournamentId: tournament.id },
            }, prisma)
            totalAlerts++
          } catch (err) {
            console.error('[engagementAlerts] Failed to send alert:', err.message)
          }
        }
      }
    }
  }

  return { alerts: totalAlerts }
}

module.exports = { checkRosterAlerts }
