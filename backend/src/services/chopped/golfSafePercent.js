const prisma = require('../../lib/prisma')
const { computeSafePercentsFromTeams } = require('./safePercentService')

const TOTAL_HOLES_PER_TOURNAMENT = 72 // standard 4-round PGA event
const DEFAULT_PLAYER_VARIANCE = 4 // σ²=4 fallback when no SG history (σ ≈ 2 pts/round)
const BASELINE_PTS_PER_ROUND = 6 // average tour-pro round projection (no SG data)
const SG_TO_PTS_PER_ROUND = 3 // marginal pts/round per stroke of SG above field average
const MISSED_OR_OUT_STATUSES = new Set(['CUT', 'WD', 'DQ'])

/**
 * Returns `tournament_progress` in [0, 1]. 0 = Thursday morning before tee off,
 * 1 = Sunday final putt.
 *
 * Driven by tournament status + elapsed time since tournament.startDate. The
 * 4-day window matches a standard PGA event.
 */
function tournamentProgress(tournament) {
  if (!tournament) return 0
  if (tournament.status === 'COMPLETED') return 1
  if (tournament.status !== 'IN_PROGRESS') return 0
  const startMs = tournament.startDate ? new Date(tournament.startDate).getTime() : Date.now()
  const elapsedMs = Date.now() - startMs
  const days = elapsedMs / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.min(1, days / 4))
}

/**
 * Estimated remaining fantasy points for a player based on holes remaining
 * and their skill baseline.
 *
 * Returns 0 for:
 *   - players who missed cut / withdrew / DQ'd (Performance.status in CUT/WD/DQ)
 *   - players not in the tournament (no Performance row)
 */
function projectedRemaining(performance, player, progress) {
  if (!performance) return 0
  if (MISSED_OR_OUT_STATUSES.has(performance.status)) return 0
  const holesRemaining = TOTAL_HOLES_PER_TOURNAMENT * (1 - progress)
  const remainingRounds = holesRemaining / 18
  // Baseline 6 pts/round for an SG=0 player, +3 pts/round per stroke of SG
  const perRoundBaseline = Math.max(
    0,
    BASELINE_PTS_PER_ROUND + (player?.sgTotal != null ? player.sgTotal * SG_TO_PTS_PER_ROUND : 0),
  )
  return remainingRounds * perRoundBaseline
}

/**
 * Returns the in-progress tournament for this league's season, or null
 * if no tournament is currently live.
 */
async function getInProgressTournament(seasonId) {
  const fw = await prisma.fantasyWeek.findFirst({
    where: {
      seasonId,
      tournamentId: { not: null },
      tournament: { status: 'IN_PROGRESS' },
    },
    include: { tournament: true },
    orderBy: { startDate: 'desc' },
  })
  return fw?.tournament || null
}

/**
 * Compute live Safe % per team for a specific tournament + league.
 * Returns the sport-agnostic [{teamId, mean, variance, safePct, rank}] shape
 * (note: safePct here is the local variable name from the shared math service —
 *  we map it to ChoppedLiveSnapshot.safePercent when writing).
 */
async function computeSafePercentsForLeague(leagueId, tournamentId) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        where: { eliminatedAt: null },
        include: {
          roster: {
            where: { isActive: true, rosterStatus: 'ACTIVE' },
            include: { player: true },
          },
        },
      },
    },
  })
  if (!league) return []

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  })
  if (!tournament) return []

  const progress = tournamentProgress(tournament)
  const playerIds = league.teams.flatMap(t => t.roster.map(r => r.playerId).filter(Boolean))
  const performances = playerIds.length
    ? await prisma.performance.findMany({
        where: { playerId: { in: playerIds }, tournamentId },
      })
    : []
  const perfByPlayer = new Map(performances.map(p => [p.playerId, p]))

  const teamsForMath = league.teams.map(t => {
    let mean = 0
    let variance = 0
    for (const r of t.roster) {
      if (!r.player) continue
      const perf = perfByPlayer.get(r.playerId)
      const pointsSoFar = perf?.fantasyPoints ?? 0
      const remaining = projectedRemaining(perf, r.player, progress)
      mean += pointsSoFar + remaining
      variance += DEFAULT_PLAYER_VARIANCE
    }
    variance *= Math.pow(1 - progress, 2)
    return { teamId: t.id, teamName: t.name, mean, variance: Math.max(variance, 0.01) }
  })

  return computeSafePercentsFromTeams(teamsForMath)
}

/**
 * Refresh ChoppedLiveSnapshot rows for every CHOPPED golf league with an
 * in-progress tournament. Called every 5 min by the existing Thu-Sun live
 * scoring cron (Task 6 hooks this in).
 *
 * Returns { leagues, snapshots } counts for the cron's log line.
 */
async function refreshActiveLeagues() {
  const leagues = await prisma.league.findMany({
    where: {
      format: 'CHOPPED',
      status: 'ACTIVE',
      sport: 'GOLF',
    },
    include: {
      leagueSeasons: {
        where: { status: 'ACTIVE' },
        select: { seasonId: true },
        take: 1,
      },
    },
  })
  let updated = 0
  for (const league of leagues) {
    try {
      const seasonId = league.leagueSeasons[0]?.seasonId
      if (!seasonId) continue
      const tournament = await getInProgressTournament(seasonId)
      if (!tournament) continue
      const results = await computeSafePercentsForLeague(league.id, tournament.id)
      for (const r of results) {
        await prisma.choppedLiveSnapshot.upsert({
          where: {
            leagueId_tournamentId_teamId: {
              leagueId: league.id,
              tournamentId: tournament.id,
              teamId: r.teamId,
            },
          },
          create: {
            leagueId: league.id,
            tournamentId: tournament.id,
            teamId: r.teamId,
            safePercent: r.safePct,
            mean: r.mean,
            variance: r.variance,
          },
          update: {
            safePercent: r.safePct,
            mean: r.mean,
            variance: r.variance,
            computedAt: new Date(),
          },
        })
        updated++
      }
    } catch (e) {
      console.error(`[chopped/golf-safe] league ${league.id} failed:`, e.message)
    }
  }
  return { leagues: leagues.length, snapshots: updated }
}

module.exports = {
  refreshActiveLeagues,
  computeSafePercentsForLeague,
  tournamentProgress,
  projectedRemaining,
  getInProgressTournament,
}
