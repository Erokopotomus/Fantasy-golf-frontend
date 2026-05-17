/**
 * Cleanup all CHOPPED TEST leagues + placeholder users.
 *
 * Deletes in dependency order:
 *   ChopEvent -> RosterEntry -> Team -> LeagueMember -> League -> placeholder Users
 *
 * Safe to re-run.
 */

const prisma = require('../../src/lib/prisma')

;(async () => {
  const leagues = await prisma.league.findMany({
    where: { name: { startsWith: 'CHOPPED TEST' } },
  })

  if (leagues.length === 0) {
    console.log('No CHOPPED TEST leagues found.')
  }

  for (const league of leagues) {
    console.log(`Cleaning league ${league.id} (${league.name})`)

    // ChopEvent rows referencing this league
    const chopDeleted = await prisma.chopEvent.deleteMany({
      where: { leagueId: league.id },
    })
    console.log(`  - deleted ${chopDeleted.count} ChopEvent rows`)

    const teams = await prisma.team.findMany({ where: { leagueId: league.id } })
    for (const team of teams) {
      await prisma.rosterEntry.deleteMany({ where: { teamId: team.id } })
    }
    console.log(`  - cleared roster entries on ${teams.length} teams`)

    const teamDeleted = await prisma.team.deleteMany({ where: { leagueId: league.id } })
    console.log(`  - deleted ${teamDeleted.count} teams`)

    const memberDeleted = await prisma.leagueMember.deleteMany({
      where: { leagueId: league.id },
    })
    console.log(`  - deleted ${memberDeleted.count} league members`)

    await prisma.league.delete({ where: { id: league.id } })
    console.log(`  - deleted league ${league.id}`)
  }

  // Delete the placeholder test users (these never log in; safe to remove)
  const userDeleted = await prisma.user.deleteMany({
    where: { email: { endsWith: '@clutchtest.com' } },
  })
  console.log(`Deleted ${userDeleted.count} placeholder test users`)

  console.log('Cleanup complete.')
  process.exit(0)
})().catch((e) => {
  console.error('Cleanup failed:', e)
  process.exit(1)
})
