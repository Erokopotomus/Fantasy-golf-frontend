/**
 * Season Setup Service
 *
 * Initializes league season records when a draft completes:
 * - LeagueSeason + TeamSeason upserts
 * - H2H matchup generation with FantasyWeek links
 * - FAAB TeamBudget creation
 */

/**
 * Initialize a league's season after draft completion.
 * All operations are idempotent (upserts), safe to call multiple times.
 *
 * @param {string} leagueId
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function initializeLeagueSeason(leagueId, prisma) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: { select: { id: true, name: true, userId: true } },
    },
  })
  if (!league) throw new Error(`League ${leagueId} not found`)

  // Find current season
  const currentSeason = await prisma.season.findFirst({
    where: { isCurrent: true },
  })
  if (!currentSeason) {
    console.warn('[seasonSetup] No current season found — skipping season init')
    return null
  }

  // 1. Upsert LeagueSeason
  const leagueSeason = await prisma.leagueSeason.upsert({
    where: {
      leagueId_seasonId: { leagueId, seasonId: currentSeason.id },
    },
    update: {},
    create: {
      leagueId,
      seasonId: currentSeason.id,
      status: 'ACTIVE',
    },
  })

  // 2. Upsert TeamSeason for each team
  for (const team of league.teams) {
    await prisma.teamSeason.upsert({
      where: {
        leagueSeasonId_teamId: {
          leagueSeasonId: leagueSeason.id,
          teamId: team.id,
        },
      },
      update: {},
      create: {
        leagueSeasonId: leagueSeason.id,
        teamId: team.id,
        teamName: team.name,
      },
    })
  }

  // 3. For H2H leagues: generate matchups linked to FantasyWeeks
  if (league.format === 'HEAD_TO_HEAD' && league.teams.length >= 2) {
    await generateH2HMatchups(league, currentSeason, prisma)
  }

  // 4. For FAAB leagues: create TeamBudget records
  const waiverType = league.settings?.waiverType
  const faabBudget = league.settings?.faabBudget || 100
  if (waiverType === 'faab') {
    for (const team of league.teams) {
      await prisma.teamBudget.upsert({
        where: {
          teamId_leagueSeasonId: {
            teamId: team.id,
            leagueSeasonId: leagueSeason.id,
          },
        },
        update: {},
        create: {
          teamId: team.id,
          leagueSeasonId: leagueSeason.id,
          totalBudget: faabBudget,
          spent: 0,
          remaining: faabBudget,
        },
      })
    }
  }

  console.log(`[seasonSetup] Initialized season for league ${league.name}: ${league.teams.length} teams, format=${league.format}, waivers=${waiverType || 'none'}`)

  return { leagueSeasonId: leagueSeason.id, teams: league.teams.length }
}

/**
 * Generate round-robin H2H matchups linked to FantasyWeeks.
 */
async function generateH2HMatchups(league, season, prisma) {
  // Check if matchups already exist
  const existingCount = await prisma.matchup.count({
    where: { leagueId: league.id },
  })
  if (existingCount > 0) {
    console.log(`[seasonSetup] ${existingCount} matchups already exist for league ${league.name} — skipping generation`)
    return
  }

  // Get fantasy weeks for this season, ordered by week number
  const fantasyWeeks = await prisma.fantasyWeek.findMany({
    where: { seasonId: season.id },
    orderBy: { weekNumber: 'asc' },
  })

  if (fantasyWeeks.length === 0) {
    console.warn('[seasonSetup] No fantasy weeks found — skipping matchup generation')
    return
  }

  // Round-robin circle method
  const teamIds = league.teams.map(t => t.id)
  const n = teamIds.length
  const teamList = [...teamIds]

  if (n % 2 !== 0) teamList.push(null) // bye for odd teams
  const half = teamList.length / 2
  const rounds = n % 2 === 0 ? n - 1 : n

  const matchupsToCreate = []

  for (let round = 0; round < rounds; round++) {
    const fw = fantasyWeeks[round % fantasyWeeks.length]

    for (let i = 0; i < half; i++) {
      const home = teamList[i]
      const away = teamList[teamList.length - 1 - i]

      if (home && away) {
        matchupsToCreate.push({
          week: round + 1,
          leagueId: league.id,
          tournamentId: fw.tournamentId || null,
          fantasyWeekId: fw.id,
          homeTeamId: home,
          awayTeamId: away,
          isComplete: false,
        })
      }
    }

    // Rotate (keep first fixed)
    const last = teamList.pop()
    teamList.splice(1, 0, last)
  }

  if (matchupsToCreate.length > 0) {
    await prisma.matchup.createMany({ data: matchupsToCreate })
    console.log(`[seasonSetup] Generated ${matchupsToCreate.length} matchups across ${rounds} weeks`)
  }
}

module.exports = { initializeLeagueSeason }
