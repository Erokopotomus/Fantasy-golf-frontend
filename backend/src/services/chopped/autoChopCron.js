const cron = require('node-cron')
const prisma = require('../../lib/prisma')
const { computeSafePercents } = require('./safePercentService')
const { executeChop } = require('./survivalService')

/**
 * Lookup current NFL week. Returns null outside the NFL season window —
 * cron handler treats null as "no active week, skip everything".
 */
async function getCurrentNflWeek() {
  const fw = await prisma.fantasyWeek.findFirst({
    where: {
      season: { sport: { slug: 'nfl' }, isCurrent: true },
      status: { in: ['IN_PROGRESS', 'UPCOMING'] },
    },
    orderBy: { weekNumber: 'asc' },
    include: { season: true },
  })
  return fw ? fw.weekNumber : null
}

/**
 * Check whether "now" is past the league's configured waiver-close time.
 * Defaults: TUESDAY @ 23:59 America/New_York (matches existing platform default).
 */
function isPastWaiverClose(now, settings) {
  const tz = (settings && settings.waiverCloseTimezone) || 'America/New_York'
  const day = (settings && settings.waiverCloseDay) || 'TUESDAY'
  const time = (settings && settings.waiverCloseTime) || '23:59'

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
 * Main handler: iterate all active CHOPPED leagues, fire auto-chop for any
 * that are past waiver-close with no manual chop yet this week.
 */
async function runAutoChopCheck() {
  const week = await getCurrentNflWeek()
  if (week == null) return // out of season

  const leagues = await prisma.league.findMany({
    where: {
      format: 'CHOPPED',
      status: 'ACTIVE',
    },
    include: { teams: { where: { eliminatedAt: null } } },
  })

  const now = new Date()

  for (const league of leagues) {
    try {
      // Need at least 2 alive teams to chop
      if (league.teams.length <= 1) continue

      const settings = league.settings || {}
      if (settings.autoChopFallback === false) continue

      if (!isPastWaiverClose(now, settings)) continue

      const existing = await prisma.chopEvent.findFirst({
        where: { leagueId: league.id, week },
      })
      if (existing) continue // manual chop already fired this week

      const safe = await computeSafePercents({
        leagueId: league.id,
        week,
        mode: 'live',
      })
      const sorted = [...safe].sort((a, b) => a.safePct - b.safePct)
      const chopsPerWeek = settings.chopsPerWeek || 1
      const targetTeamIds = sorted.slice(0, chopsPerWeek).map(s => s.teamId)

      console.log(`[chopped/auto] league ${league.id} week ${week} chopping ${targetTeamIds.join(', ')}`)
      await executeChop({
        leagueId: league.id,
        week,
        teamIds: targetTeamIds,
        triggerType: 'auto_fallback',
        triggeredByUserId: null,
        reasoning: 'Auto-chop fallback (no manual chop by waiver close)',
        safePercentResults: safe,
      })
    } catch (e) {
      console.error(`[chopped/auto] league ${league.id} auto-chop failed:`, e)
    }
  }
}

/**
 * Register cron schedule. Every 5 min, Mon-Wed (NFL waiver window),
 * America/New_York. The cron is cheap during off-hours (returns immediately
 * from isPastWaiverClose).
 */
function registerAutoChopCron() {
  cron.schedule(
    '*/5 * * * 1-3',
    async () => {
      try {
        await runAutoChopCheck()
      } catch (e) {
        console.error('[chopped/auto] cron handler crashed:', e)
      }
    },
    { timezone: 'America/New_York' }
  )
  console.log('[cron] chopped auto-chop cron registered (every 5 min Mon-Wed)')
}

module.exports = { registerAutoChopCron, runAutoChopCheck, getCurrentNflWeek, isPastWaiverClose }
