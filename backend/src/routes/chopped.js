const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const prisma = require('../lib/prisma.js')
const { computeSafePercents } = require('../services/chopped/safePercentService')
const { computeSafePercentsForLeague } = require('../services/chopped/golfSafePercent')
const { executeChop } = require('../services/chopped/survivalService')

// Mount: app.use('/api/leagues', choppedRoutes) — leagueId is path param on each route

// Helper: load a league with the sport-routing fields we need + active LeagueSeason
async function loadChoppedLeague(leagueId) {
  return prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      leagueSeasons: {
        where: { status: 'ACTIVE' },
        select: { seasonId: true },
        take: 1,
      },
    },
  })
}

// GET /api/leagues/:leagueId/chopped/safe-percents
//   - NFL: ?week=N&mode=preweek|live
//   - Golf: returns latest ChoppedLiveSnapshot rows for the in-progress tournament,
//     or computes on-demand if no snapshot exists
router.get('/:leagueId/chopped/safe-percents', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.params
    const league = await loadChoppedLeague(leagueId)
    if (!league) return res.status(404).json({ error: 'League not found' })
    if (league.format !== 'CHOPPED') {
      return res.status(400).json({ error: 'League is not CHOPPED format' })
    }

    if (league.sport === 'GOLF') {
      const seasonId = league.leagueSeasons[0]?.seasonId
      if (!seasonId) {
        return res.json({ leagueId, sport: 'GOLF', results: [], tournament: null })
      }
      const fw = await prisma.fantasyWeek.findFirst({
        where: {
          seasonId,
          tournamentId: { not: null },
          tournament: { status: 'IN_PROGRESS' },
        },
        include: { tournament: true },
        orderBy: { startDate: 'desc' },
      })
      const tournament = fw?.tournament || null
      if (!tournament) {
        return res.json({ leagueId, sport: 'GOLF', results: [], tournament: null })
      }
      // Prefer cached snapshots fresh within last 6 min (slightly wider than the
      // 5-min cron cadence to absorb a missed tick)
      const snapshots = await prisma.choppedLiveSnapshot.findMany({
        where: { leagueId, tournamentId: tournament.id },
        orderBy: { safePercent: 'desc' },
      })
      const isFresh =
        snapshots[0] &&
        Date.now() - new Date(snapshots[0].computedAt).getTime() < 6 * 60 * 1000
      if (isFresh) {
        return res.json({
          leagueId,
          sport: 'GOLF',
          results: snapshots.map((s, i) => ({
            teamId: s.teamId,
            mean: s.mean,
            variance: s.variance,
            safePct: s.safePercent,
            rank: i + 1,
          })),
          tournament: { id: tournament.id, name: tournament.name },
          cached: true,
        })
      }
      // No fresh snapshot — compute on-demand
      const results = await computeSafePercentsForLeague(leagueId, tournament.id)
      return res.json({
        leagueId,
        sport: 'GOLF',
        results,
        tournament: { id: tournament.id, name: tournament.name },
        cached: false,
      })
    }

    // NFL path — existing behavior
    const week = parseInt(req.query.week, 10)
    const mode = req.query.mode === 'live' ? 'live' : 'preweek'
    if (!week || week < 1 || week > 18) {
      return res.status(400).json({ error: 'invalid week (1-18 required)' })
    }
    const results = await computeSafePercents({ leagueId, week, mode })
    res.json({ leagueId, sport: 'NFL', week, mode, results })
  } catch (e) {
    console.error('[chopped] safe-percents error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/leagues/:leagueId/chopped/chop
// NFL Body: { week: number, teamIds: string[], reasoning?: string }
// Golf Body: { tournamentId: string, teamIds: string[], reasoning?: string }
router.post('/:leagueId/chopped/chop', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.params
    const { week, tournamentId, teamIds, reasoning } = req.body
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ error: 'teamIds required' })
    }

    const league = await loadChoppedLeague(leagueId)
    if (!league) return res.status(404).json({ error: 'League not found' })
    if (league.format !== 'CHOPPED') {
      return res.status(400).json({ error: 'League is not CHOPPED format' })
    }
    if (league.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Commissioner only' })
    }

    const settings = league.settings || {}
    const maxChops = settings.chopsPerTournament || settings.chopsPerWeek || 1
    if (teamIds.length > maxChops) {
      return res.status(400).json({ error: `Max ${maxChops} chops per tournament/week` })
    }
    if (settings.manualChopEnabled === false) {
      return res.status(403).json({ error: 'Manual chop disabled for this league' })
    }

    let weekKey = week
    if (league.sport === 'GOLF') {
      if (!tournamentId) {
        return res.status(400).json({ error: 'tournamentId required for golf chop' })
      }
      const fw = await prisma.fantasyWeek.findFirst({
        where: { tournamentId },
        select: { weekNumber: true, tournament: { select: { endDate: true } } },
      })
      if (!fw?.tournament) {
        return res.status(404).json({ error: 'Tournament not found' })
      }
      weekKey =
        fw.weekNumber != null
          ? fw.weekNumber
          : Math.floor(new Date(fw.tournament.endDate).getTime() / (1000 * 60 * 60 * 24 * 7))
    } else {
      if (!week) {
        return res.status(400).json({ error: 'week required for non-golf chop' })
      }
    }

    const result = await executeChop({
      leagueId,
      week: weekKey,
      teamIds,
      triggerType: 'manual',
      triggeredByUserId: req.user.id,
      reasoning: reasoning || null,
    })
    res.json(result)
  } catch (e) {
    console.error('[chopped] chop error:', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/leagues/:leagueId/chopped/events
router.get('/:leagueId/chopped/events', authenticate, async (req, res) => {
  try {
    const events = await prisma.chopEvent.findMany({
      where: { leagueId: req.params.leagueId },
      include: { team: { select: { id: true, name: true, avatar: true, avatarUrl: true } } },
      orderBy: { week: 'desc' },
    })
    res.json({ events })
  } catch (e) {
    console.error('[chopped] events error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
