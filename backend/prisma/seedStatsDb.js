/**
 * Seed script for the Stats Database (Phase 1 + 2)
 * Seeds: Sport, Season, FantasyWeek, ScoringSystem
 * Backfills: League.sportId, existing data linkages
 *
 * Run: node prisma/seedStatsDb.js
 */

const { PrismaClient } = require('@prisma/client')
const { STANDARD_CONFIG, DRAFTKINGS_CONFIG } = require('../src/services/scoringService')

const prisma = new PrismaClient()

async function main() {
  console.log('--- Stats Database Seed ---\n')

  // ── 1. Sport ──────────────────────────────────────────────────────────────
  console.log('1. Seeding Sport...')
  const golf = await prisma.sport.upsert({
    where: { slug: 'golf' },
    update: {},
    create: {
      slug: 'golf',
      name: 'Golf',
      isActive: true,
      config: {
        seasonType: 'wrap-around',       // PGA season spans two calendar years
        weekDefinition: 'tournament',     // Each tournament = 1 fantasy week
        statCategories: [
          'sgTotal', 'sgPutting', 'sgApproach', 'sgOffTee', 'sgAroundGreen',
          'drivingDistance', 'drivingAccuracy', 'gir', 'scrambling', 'puttsPerRound'
        ],
        rosterPositions: ['ACTIVE', 'BENCH', 'IR'],
        defaultScoringPresets: ['standard', 'draftkings'],
      },
    },
  })
  console.log(`   Sport: ${golf.name} (${golf.id})`)

  // ── 2. Season ─────────────────────────────────────────────────────────────
  console.log('2. Seeding Season...')

  // Determine season from existing tournaments
  const firstTournament = await prisma.tournament.findFirst({
    orderBy: { startDate: 'asc' },
    select: { startDate: true },
  })
  const lastTournament = await prisma.tournament.findFirst({
    orderBy: { startDate: 'desc' },
    select: { endDate: true },
  })

  const startYear = firstTournament ? firstTournament.startDate.getFullYear() : 2025
  const endYear = lastTournament ? lastTournament.endDate.getFullYear() : 2025
  const seasonSlug = startYear === endYear ? `${startYear}` : `${startYear}-${String(endYear).slice(2)}`

  const season = await prisma.season.upsert({
    where: { sportId_slug: { sportId: golf.id, slug: seasonSlug } },
    update: {},
    create: {
      sportId: golf.id,
      name: `${seasonSlug} PGA Tour Season`,
      year: startYear,
      slug: seasonSlug,
      startDate: firstTournament?.startDate || new Date('2025-01-01'),
      endDate: lastTournament?.endDate || new Date('2025-12-31'),
      isCurrent: true,
    },
  })
  console.log(`   Season: ${season.name} (${season.id})`)

  // ── 3. ScoringSystem ──────────────────────────────────────────────────────
  console.log('3. Seeding ScoringSystem...')

  const standardScoring = await prisma.scoringSystem.upsert({
    where: { sportId_slug: { sportId: golf.id, slug: 'standard' } },
    update: { rules: STANDARD_CONFIG },
    create: {
      sportId: golf.id,
      name: 'Standard',
      slug: 'standard',
      isDefault: true,
      isSystem: true,
      rules: STANDARD_CONFIG,
    },
  })
  console.log(`   ScoringSystem: ${standardScoring.name} (${standardScoring.id})`)

  const dkScoring = await prisma.scoringSystem.upsert({
    where: { sportId_slug: { sportId: golf.id, slug: 'draftkings' } },
    update: { rules: DRAFTKINGS_CONFIG },
    create: {
      sportId: golf.id,
      name: 'DraftKings',
      slug: 'draftkings',
      isDefault: false,
      isSystem: true,
      rules: DRAFTKINGS_CONFIG,
    },
  })
  console.log(`   ScoringSystem: ${dkScoring.name} (${dkScoring.id})`)

  // ── 4. FantasyWeek (one per tournament) ───────────────────────────────────
  console.log('4. Seeding FantasyWeeks from tournaments...')

  const tournaments = await prisma.tournament.findMany({
    orderBy: { startDate: 'asc' },
  })

  let weekNumber = 1
  let weeksCreated = 0

  for (const t of tournaments) {
    const weekStatus = {
      COMPLETED: 'COMPLETED',
      IN_PROGRESS: 'IN_PROGRESS',
      UPCOMING: 'UPCOMING',
      CANCELLED: 'UPCOMING',
    }[t.status] || 'UPCOMING'

    // Check if already exists for this tournament
    const existing = await prisma.fantasyWeek.findFirst({
      where: { seasonId: season.id, tournamentId: t.id },
    })

    if (!existing) {
      await prisma.fantasyWeek.upsert({
        where: { seasonId_weekNumber: { seasonId: season.id, weekNumber } },
        update: { tournamentId: t.id, name: t.name, status: weekStatus },
        create: {
          seasonId: season.id,
          weekNumber,
          name: t.name,
          startDate: t.startDate,
          endDate: t.endDate,
          status: weekStatus,
          tournamentId: t.id,
        },
      })
      weeksCreated++
    }
    weekNumber++
  }
  console.log(`   FantasyWeeks: ${weeksCreated} created from ${tournaments.length} tournaments`)

  // ── 5. Backfill League.sportId ────────────────────────────────────────────
  console.log('5. Backfilling League.sportId...')
  const updated = await prisma.league.updateMany({
    where: { sportId: null },
    data: { sportId: golf.id },
  })
  console.log(`   Updated ${updated.count} leagues with sportId`)

  // ── 6. Backfill existing RosterEntry.isActive ─────────────────────────────
  console.log('6. Backfilling RosterEntry.isActive...')
  const rosterUpdated = await prisma.rosterEntry.updateMany({
    where: { isActive: false, droppedAt: null },
    data: { isActive: true },
  })
  // All existing entries should already have isActive=true (default), but let's verify
  const totalRoster = await prisma.rosterEntry.count()
  console.log(`   ${totalRoster} roster entries verified (${rosterUpdated.count} fixed)`)

  // ── 7. Create LeagueSeason + TeamSeason for existing leagues ──────────────
  console.log('7. Creating LeagueSeason + TeamSeason records...')
  const leagues = await prisma.league.findMany({
    include: { teams: true },
  })

  let leagueSeasonsCreated = 0
  let teamSeasonsCreated = 0

  for (const league of leagues) {
    // Create or find LeagueSeason
    const leagueSeason = await prisma.leagueSeason.upsert({
      where: { leagueId_seasonId: { leagueId: league.id, seasonId: season.id } },
      update: {},
      create: {
        leagueId: league.id,
        seasonId: season.id,
        status: league.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
      },
    })
    leagueSeasonsCreated++

    // Create TeamSeason for each team
    for (const team of league.teams) {
      await prisma.teamSeason.upsert({
        where: { leagueSeasonId_teamId: { leagueSeasonId: leagueSeason.id, teamId: team.id } },
        update: {},
        create: {
          leagueSeasonId: leagueSeason.id,
          teamId: team.id,
          totalPoints: team.totalPoints,
          wins: team.wins,
          losses: team.losses,
          ties: team.ties,
        },
      })
      teamSeasonsCreated++
    }
  }
  console.log(`   ${leagueSeasonsCreated} LeagueSeasons, ${teamSeasonsCreated} TeamSeasons`)

  // ── 8. Backfill RosterTransaction from DraftPick records ──────────────────
  console.log('8. Creating RosterTransactions from existing DraftPicks...')
  const draftPicks = await prisma.draftPick.findMany({
    include: {
      player: { select: { name: true } },
      draft: { select: { leagueId: true } },
    },
  })

  let transactionsCreated = 0
  for (const pick of draftPicks) {
    // Find the LeagueSeason for this draft's league
    const ls = await prisma.leagueSeason.findFirst({
      where: { leagueId: pick.draft.leagueId, seasonId: season.id },
    })
    if (!ls) continue

    const existing = await prisma.rosterTransaction.findFirst({
      where: {
        teamId: pick.teamId,
        playerId: pick.playerId,
        type: 'DRAFT_PICK',
        draftPickNumber: pick.pickNumber,
      },
    })

    if (!existing) {
      await prisma.rosterTransaction.create({
        data: {
          leagueSeasonId: ls.id,
          teamId: pick.teamId,
          type: 'DRAFT_PICK',
          playerId: pick.playerId,
          playerName: pick.player.name,
          draftRound: pick.round,
          draftPickNumber: pick.pickNumber,
          auctionAmount: pick.amount,
          timestamp: pick.pickedAt,
        },
      })
      transactionsCreated++
    }
  }
  console.log(`   ${transactionsCreated} RosterTransactions from draft picks`)

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n--- Stats Database Seed Complete ---')
  console.log(`   Sport: ${golf.name}`)
  console.log(`   Season: ${season.name}`)
  console.log(`   Scoring Systems: 2 (Standard + DraftKings)`)
  console.log(`   Fantasy Weeks: ${weeksCreated}`)
  console.log(`   League Seasons: ${leagueSeasonsCreated}`)
  console.log(`   Team Seasons: ${teamSeasonsCreated}`)
  console.log(`   Roster Transactions: ${transactionsCreated}`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
