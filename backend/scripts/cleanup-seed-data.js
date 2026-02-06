/**
 * One-time cleanup: remove old seed players and tournaments that were
 * replaced by real DataGolf data. Seed records have datagolfId = null.
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Finding seed players (no datagolfId)...')
  const seedPlayers = await prisma.player.findMany({
    where: { datagolfId: null },
    select: { id: true, name: true },
  })
  console.log(`Found ${seedPlayers.length} seed players to remove`)

  if (seedPlayers.length > 0) {
    const seedPlayerIds = seedPlayers.map((p) => p.id)

    // Delete related records first (order matters for foreign keys)
    const holeScores = await prisma.holeScore.deleteMany({
      where: { roundScore: { playerId: { in: seedPlayerIds } } },
    })
    console.log(`  Deleted ${holeScores.count} hole scores`)

    const roundScores = await prisma.roundScore.deleteMany({
      where: { playerId: { in: seedPlayerIds } },
    })
    console.log(`  Deleted ${roundScores.count} round scores`)

    const liveScores = await prisma.liveScore.deleteMany({
      where: { playerId: { in: seedPlayerIds } },
    })
    console.log(`  Deleted ${liveScores.count} live scores`)

    const predictions = await prisma.playerPrediction.deleteMany({
      where: { playerId: { in: seedPlayerIds } },
    })
    console.log(`  Deleted ${predictions.count} predictions`)

    const dfsEntries = await prisma.playerDFSEntry.deleteMany({
      where: { player: { id: { in: seedPlayerIds } } },
    })
    console.log(`  Deleted ${dfsEntries.count} DFS entries`)

    const courseHistory = await prisma.playerCourseHistory.deleteMany({
      where: { playerId: { in: seedPlayerIds } },
    })
    console.log(`  Deleted ${courseHistory.count} course history records`)

    const performances = await prisma.performance.deleteMany({
      where: { playerId: { in: seedPlayerIds } },
    })
    console.log(`  Deleted ${performances.count} performances`)

    const rosterEntries = await prisma.rosterEntry.deleteMany({
      where: { playerId: { in: seedPlayerIds } },
    })
    console.log(`  Deleted ${rosterEntries.count} roster entries`)

    const draftPicks = await prisma.draftPick.deleteMany({
      where: { playerId: { in: seedPlayerIds } },
    })
    console.log(`  Deleted ${draftPicks.count} draft picks`)

    const picks = await prisma.pick.deleteMany({
      where: { playerId: { in: seedPlayerIds } },
    })
    console.log(`  Deleted ${picks.count} picks`)

    const bettingOdds = await prisma.bettingOdds.deleteMany({
      where: { playerId: { in: seedPlayerIds } },
    })
    console.log(`  Deleted ${bettingOdds.count} betting odds`)

    // Now delete the seed players
    const deleted = await prisma.player.deleteMany({
      where: { id: { in: seedPlayerIds } },
    })
    console.log(`Deleted ${deleted.count} seed players`)
  }

  // Clean up seed tournaments (no datagolfId)
  console.log('\nFinding seed tournaments (no datagolfId)...')
  const seedTournaments = await prisma.tournament.findMany({
    where: { datagolfId: null },
    select: { id: true, name: true },
  })
  console.log(`Found ${seedTournaments.length} seed tournaments to remove`)

  if (seedTournaments.length > 0) {
    const seedTournamentIds = seedTournaments.map((t) => t.id)

    // Delete related records
    const tHoleScores = await prisma.holeScore.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tHoleScores.count} hole scores`)

    const tRoundScores = await prisma.roundScore.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tRoundScores.count} round scores`)

    const tLiveScores = await prisma.liveScore.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tLiveScores.count} live scores`)

    const tPredictions = await prisma.playerPrediction.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tPredictions.count} predictions`)

    const tPerformances = await prisma.performance.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tPerformances.count} performances`)

    const tMatchups = await prisma.matchup.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tMatchups.count} matchups`)

    const tPicks = await prisma.pick.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tPicks.count} picks`)

    const tBettingOdds = await prisma.bettingOdds.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tBettingOdds.count} betting odds`)

    const tDfsSlates = await prisma.dFSSlate.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tDfsSlates.count} DFS slates`)

    const tWeather = await prisma.weather.deleteMany({
      where: { tournamentId: { in: seedTournamentIds } },
    })
    console.log(`  Deleted ${tWeather.count} weather records`)

    const deletedT = await prisma.tournament.deleteMany({
      where: { id: { in: seedTournamentIds } },
    })
    console.log(`Deleted ${deletedT.count} seed tournaments`)
  }

  // Clean up seed courses (no external reference)
  console.log('\nFinding orphan courses...')
  const seedCourses = await prisma.course.findMany({
    where: {
      tournaments: { none: {} },
    },
    select: { id: true, name: true },
  })
  if (seedCourses.length > 0) {
    const courseIds = seedCourses.map((c) => c.id)
    await prisma.hole.deleteMany({ where: { courseId: { in: courseIds } } })
    await prisma.playerCourseHistory.deleteMany({ where: { courseId: { in: courseIds } } })
    await prisma.weather.deleteMany({ where: { courseId: { in: courseIds } } })
    const deletedC = await prisma.course.deleteMany({ where: { id: { in: courseIds } } })
    console.log(`Deleted ${deletedC.count} orphan courses`)
  }

  console.log('\nCleanup complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
