/**
 * Seed a CHOPPED GOLF test league for the golf-Chopped pipeline end-to-end.
 *
 * Creates:
 *   - 1 League "Golf Chopped Test League" (GOLF / CHOPPED / ACTIVE)
 *   - 1 LeagueSeason linking the league to the current golf Season
 *   - 1 TeamSeason per team (required by WeeklyTeamResult)
 *   - 4 Teams (synthetic users), 4 active golf players each
 *   - 1 COMPLETED tournament + FantasyWeek (with WeeklyTeamResult per team)
 *       Team 1 = 50.0, Team 2 = 75.0, Team 3 = 85.0, Team 4 = 30.0 (lowest -> auto-chop target)
 *   - 1 IN_PROGRESS tournament + FantasyWeek (for live Safe % refresh testing)
 *
 * Idempotent: re-running deletes the existing test league + test tournaments first,
 * then re-seeds. Output is the new league id.
 *
 * Cleanup-only is implicit via re-run; no separate cleanup script is provided.
 */

const bcrypt = require('bcryptjs')
const prisma = require('../../src/lib/prisma')

const LEAGUE_NAME = 'Golf Chopped Test League'
const TEAM_NAMES = ['Chop Golf Alpha', 'Chop Golf Bravo', 'Chop Golf Charlie', 'Chop Golf Delta']
const TEAM_EMAILS = [
  'chopped-golf-1@clutchtest.com',
  'chopped-golf-2@clutchtest.com',
  'chopped-golf-3@clutchtest.com',
  'chopped-golf-4@clutchtest.com',
]
const TEAM_SCORES = [50.0, 75.0, 85.0, 30.0] // Team 4 = lowest = auto-chop target

const COMPLETED_TOURNAMENT_NAME = 'Chopped Golf Test — Completed Tournament'
const IN_PROGRESS_TOURNAMENT_NAME = 'Chopped Golf Test — Live Tournament'

;(async () => {
  // ---- Idempotent cleanup of any prior run ----
  const existing = await prisma.league.findFirst({ where: { name: LEAGUE_NAME } })
  if (existing) {
    console.log(`Existing test league found (${existing.id}); cleaning up first...`)

    // FantasyWeeks tied to our test tournaments need to be unhooked from
    // WeeklyTeamResult/Matchup/etc. before delete. WeeklyTeamResult will cascade
    // via LeagueSeason -> league delete. Matchups + other FantasyWeek children
    // shouldn't exist for this seed, but we still need to delete FantasyWeek rows
    // because they outlive the league (parent is Season, not League).
    const oldTournaments = await prisma.tournament.findMany({
      where: { name: { in: [COMPLETED_TOURNAMENT_NAME, IN_PROGRESS_TOURNAMENT_NAME] } },
      select: { id: true },
    })
    const oldTournamentIds = oldTournaments.map((t) => t.id)
    const oldFantasyWeeks = await prisma.fantasyWeek.findMany({
      where: { tournamentId: { in: oldTournamentIds } },
      select: { id: true },
    })
    const oldFantasyWeekIds = oldFantasyWeeks.map((w) => w.id)

    // ChopEvents reference league -> delete first
    await prisma.chopEvent.deleteMany({ where: { leagueId: existing.id } })
    await prisma.choppedLiveSnapshot.deleteMany({ where: { leagueId: existing.id } })

    // WeeklyTeamResult will cascade with LeagueSeason; explicitly clear anyway
    // to be safe if a future migration changes the cascade rule.
    await prisma.weeklyTeamResult.deleteMany({
      where: { fantasyWeekId: { in: oldFantasyWeekIds } },
    })

    // Roster entries -> teams -> league members -> league (Team/LeagueMember/LeagueSeason cascade off League delete)
    const teams = await prisma.team.findMany({ where: { leagueId: existing.id } })
    for (const team of teams) {
      await prisma.rosterEntry.deleteMany({ where: { teamId: team.id } })
    }
    // League delete cascades Team, LeagueMember, LeagueSeason -> TeamSeason -> WeeklyTeamResult
    await prisma.league.delete({ where: { id: existing.id } })

    // Now safe to delete FantasyWeek and Tournament rows (no more dependents)
    if (oldFantasyWeekIds.length) {
      await prisma.fantasyWeek.deleteMany({ where: { id: { in: oldFantasyWeekIds } } })
    }
    if (oldTournamentIds.length) {
      await prisma.tournament.deleteMany({ where: { id: { in: oldTournamentIds } } })
    }

    console.log('Cleanup complete.')
  }

  // ---- Prereqs ----
  const golfSport = await prisma.sport.findFirst({ where: { slug: 'golf' } })
  if (!golfSport) {
    console.error('Golf sport not found. Aborting.')
    process.exit(1)
  }

  const season = await prisma.season.findFirst({
    where: { sportId: golfSport.id, isCurrent: true },
    orderBy: { startDate: 'desc' },
  })
  if (!season) {
    console.error('No current golf season found. Aborting.')
    process.exit(1)
  }

  const golfPlayers = await prisma.player.findMany({
    where: { sportId: golfSport.id, isActive: true },
    select: { id: true, name: true },
    take: 16,
  })
  if (golfPlayers.length < 16) {
    console.error(`Need 16 active golf players, found ${golfPlayers.length}. Aborting.`)
    process.exit(1)
  }

  // ---- Owner (commish) ----
  let owner = await prisma.user.findFirst({ where: { email: 'ericmsaylor@gmail.com' } })
  if (!owner) {
    // Fall back to any admin / first user; otherwise create a synthetic owner.
    owner = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
  }
  if (!owner) {
    const ownerHash = await bcrypt.hash('chopped-golf-test-owner', 10)
    owner = await prisma.user.create({
      data: {
        email: 'chopped-golf-owner@clutchtest.com',
        name: 'Chopped Golf Test Owner',
        password: ownerHash,
        role: 'user',
      },
    })
    console.log('Created synthetic owner:', owner.id)
  }

  // ---- League ----
  const league = await prisma.league.create({
    data: {
      name: LEAGUE_NAME,
      sport: 'GOLF',
      sportId: golfSport.id,
      format: 'CHOPPED',
      status: 'ACTIVE',
      draftType: 'SNAKE',
      isPublic: false,
      ownerId: owner.id,
      maxTeams: 4,
      settings: {
        chopsPerTournament: 1,
        waiverCloseDay: 'MONDAY',
        waiverCloseTime: '04:00',
        autoChopFallback: true,
        manualChopEnabled: true,
      },
      members: {
        create: { userId: owner.id, role: 'OWNER' },
      },
    },
  })
  console.log('Created league:', league.id)

  // ---- LeagueSeason ----
  const leagueSeason = await prisma.leagueSeason.create({
    data: {
      leagueId: league.id,
      seasonId: season.id,
      status: 'ACTIVE',
    },
  })
  console.log('Created league season:', leagueSeason.id)

  // ---- Teams (4 synthetic users + 4 teams + 4 players each) ----
  const placeholderHash = await bcrypt.hash('chopped-golf-test-placeholder', 10)
  const teams = []
  for (let i = 0; i < 4; i++) {
    const email = TEAM_EMAILS[i]
    const teamName = TEAM_NAMES[i]

    let user = await prisma.user.findFirst({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: teamName,
          password: placeholderHash,
          role: 'user',
        },
      })
    }

    // LeagueMember
    const existingMember = await prisma.leagueMember.findFirst({
      where: { leagueId: league.id, userId: user.id },
    })
    if (!existingMember) {
      await prisma.leagueMember.create({
        data: { leagueId: league.id, userId: user.id, role: 'MEMBER' },
      })
    }

    // Team
    const team = await prisma.team.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        name: teamName,
      },
    })

    // 4 players each (16 total, dealt sequentially)
    const teamPlayers = golfPlayers.slice(i * 4, i * 4 + 4)
    for (const p of teamPlayers) {
      await prisma.rosterEntry.create({
        data: {
          teamId: team.id,
          playerId: p.id,
          position: 'ACTIVE',
          rosterStatus: 'ACTIVE',
          isActive: true,
          acquiredVia: 'DRAFT',
        },
      })
    }

    teams.push(team)
    console.log(`Team ${i + 1} (${teamName}): ${team.id} — ${teamPlayers.length} players`)
  }

  // ---- TeamSeasons (required FK from WeeklyTeamResult) ----
  const teamSeasons = []
  for (const t of teams) {
    const ts = await prisma.teamSeason.create({
      data: {
        leagueSeasonId: leagueSeason.id,
        teamId: t.id,
        teamName: t.name,
      },
    })
    teamSeasons.push(ts)
  }

  // ---- Completed tournament + FantasyWeek + WeeklyTeamResult per team ----
  const now = new Date()
  const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const lastWeekEnd = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)

  const completedTournament = await prisma.tournament.create({
    data: {
      name: COMPLETED_TOURNAMENT_NAME,
      startDate: lastWeekStart,
      endDate: lastWeekEnd,
      status: 'COMPLETED',
      tour: 'PGA',
      format: 'STROKE',
    },
  })

  const completedWeek = await prisma.fantasyWeek.create({
    data: {
      seasonId: season.id,
      // Pick a high week number unlikely to collide with the real schedule
      weekNumber: 990,
      name: COMPLETED_TOURNAMENT_NAME,
      startDate: lastWeekStart,
      endDate: lastWeekEnd,
      status: 'COMPLETED',
      tournamentId: completedTournament.id,
    },
  })
  console.log('Created completed tournament + fantasy week:', completedTournament.id, completedWeek.id)

  for (let i = 0; i < teams.length; i++) {
    await prisma.weeklyTeamResult.create({
      data: {
        leagueSeasonId: leagueSeason.id,
        teamSeasonId: teamSeasons[i].id,
        fantasyWeekId: completedWeek.id,
        teamId: teams[i].id,
        weekNumber: completedWeek.weekNumber,
        totalPoints: TEAM_SCORES[i],
      },
    })
  }
  console.log('Wrote WeeklyTeamResult rows:', TEAM_SCORES.join(', '))

  // ---- In-progress tournament + FantasyWeek (for live Safe % refresh testing) ----
  const inProgressStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const inProgressEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

  const liveTournament = await prisma.tournament.create({
    data: {
      name: IN_PROGRESS_TOURNAMENT_NAME,
      startDate: inProgressStart,
      endDate: inProgressEnd,
      status: 'IN_PROGRESS',
      currentRound: 2,
      tour: 'PGA',
      format: 'STROKE',
    },
  })

  const liveWeek = await prisma.fantasyWeek.create({
    data: {
      seasonId: season.id,
      weekNumber: 991,
      name: IN_PROGRESS_TOURNAMENT_NAME,
      startDate: inProgressStart,
      endDate: inProgressEnd,
      status: 'IN_PROGRESS',
      tournamentId: liveTournament.id,
    },
  })
  console.log('Created in-progress tournament + fantasy week:', liveTournament.id, liveWeek.id)

  console.log('')
  console.log('========================================')
  console.log(`Created CHOPPED golf test league: ${league.id}`)
  console.log(`Season: ${season.name} (${season.id})`)
  console.log(`Teams: ${teams.length}, players each: 4`)
  console.log(`Completed tournament: ${completedTournament.id}`)
  console.log(`Live tournament:      ${liveTournament.id}`)
  console.log('========================================')
  process.exit(0)
})().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
