const cron = require('node-cron')
const prisma = require('../../lib/prisma')
const { getMostRecentTournamentResults } = require('./golfScoreSource')
const { executeChop } = require('./survivalService')

/**
 * Check whether "now" is past the league's configured waiver-close time.
 * Defaults for golf: MONDAY @ 04:00 America/New_York — early enough that
 * no West Coast user is awake when the chop fires (1 AM PT).
 */
function isPastWaiverClose(now, settings) {
  const tz = settings?.waiverCloseTimezone || 'America/New_York'
  const day = settings?.waiverCloseDay || 'MONDAY'
  const time = settings?.waiverCloseTime || '04:00'

  const localStr = now.toLocaleString('en-US', { timeZone: tz })
  const local = new Date(localStr)
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  if (dayNames[local.getDay()] !== day) return false

  const [hh, mm] = time.split(':').map(Number)
  if (local.getHours() < hh) return false
  if (local.getHours() === hh && local.getMinutes() < mm) return false
  return true
}

/**
 * Iterate active CHOPPED golf leagues with a recent finalized tournament.
 * Fire auto-chop on any past waiver-close with no ChopEvent yet for that
 * tournament's "week" key.
 *
 * Returns { leaguesChecked, fired } counts for the cron's log line.
 */
async function checkLeagues() {
  const leagues = await prisma.league.findMany({
    where: {
      format: 'CHOPPED',
      status: 'ACTIVE',
      sport: 'GOLF',
    },
    include: {
      teams: { where: { eliminatedAt: null } },
    },
  })

  const now = new Date()
  let fired = 0

  for (const league of leagues) {
    try {
      if (league.teams.length <= 1) continue
      const settings = league.settings || {}
      if (settings.autoChopFallback === false) continue
      if (!isPastWaiverClose(now, settings)) continue

      const results = await getMostRecentTournamentResults(league.id)
      if (results.length === 0) continue

      const tournamentId = results[0].tournamentId
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { weekNumber: true, endDate: true, name: true },
      })
      // Map tournament → "week" integer for ChopEvent uniqueness.
      // Prefer the tournament's seasonal week number; fall back to a derived
      // ISO-week ordinal from endDate if weekNumber is missing.
      const weekKey =
        tournament?.weekNumber ||
        Math.floor(new Date(tournament.endDate).getTime() / (1000 * 60 * 60 * 24 * 7))

      const existing = await prisma.chopEvent.findFirst({
        where: { leagueId: league.id, week: weekKey },
      })
      if (existing) continue // manual chop already fired

      const chopsPerTournament =
        settings.chopsPerTournament || settings.chopsPerWeek || 1
      const targetTeamIds = results.slice(0, chopsPerTournament).map(r => r.teamId)

      console.log(
        `[chopped/golf-auto] league ${league.id} chopping ${targetTeamIds.join(', ')} (tournament ${tournament?.name || tournamentId})`,
      )
      await executeChop({
        leagueId: league.id,
        week: weekKey,
        teamIds: targetTeamIds,
        triggerType: 'auto_fallback',
        triggeredByUserId: null,
        reasoning: `Auto-chop fallback after ${results[0].tournamentName}`,
      })
      fired++
    } catch (e) {
      console.error(`[chopped/golf-auto] league ${league.id} failed:`, e)
    }
  }
  return { leaguesChecked: leagues.length, fired }
}

/**
 * Register the Monday 4 AM ET cron. The Sunday 10:30 PM cron also calls
 * `checkLeagues()` after fantasy finalization (Task 7), but most leagues
 * won't have past their waiver-close at that point — this Monday-morning
 * cron is the real fallback.
 */
function registerGolfAutoChopCron() {
  cron.schedule(
    '0 4 * * 1',
    async () => {
      console.log(`[chopped/golf-auto] ${new Date().toISOString()} — Monday 4 AM check`)
      try {
        const result = await checkLeagues()
        console.log(
          `[chopped/golf-auto] Done: ${result.fired} chops fired across ${result.leaguesChecked} leagues`,
        )
      } catch (e) {
        console.error('[chopped/golf-auto] cron handler crashed:', e)
      }
    },
    { timezone: 'America/New_York' },
  )
  console.log('[cron] golf auto-chop cron registered (Mon 4 AM ET)')
}

module.exports = { registerGolfAutoChopCron, checkLeagues, isPastWaiverClose }
