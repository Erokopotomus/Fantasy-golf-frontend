/**
 * Seed a CHOPPED TEST league for end-to-end Chopped format smoke testing.
 *
 * Creates:
 *   - One league named "CHOPPED TEST 2026" owned by Eric (ericmsaylor@gmail.com)
 *   - 8 teams total: Eric (commish) + 7 placeholder users (chopped-test-1..7@clutchtest.com)
 *
 * Idempotent: safe to re-run. Will reuse the existing league + users + teams if present.
 *
 * Cleanup: `node backend/scripts/chopped/cleanup-test-league.js`
 */

const bcrypt = require('bcryptjs')
const prisma = require('../../src/lib/prisma')

const CHOPPED_TEST_NAMES = [
  'Eric (Commish)',
  'Chop Test Bravo',
  'Chop Test Charlie',
  'Chop Test Delta',
  'Chop Test Echo',
  'Chop Test Foxtrot',
  'Chop Test Golf',
  'Chop Test Hotel',
]

;(async () => {
  const commish = await prisma.user.findFirst({
    where: { email: 'ericmsaylor@gmail.com' },
  })
  if (!commish) {
    console.error('Eric user not found (ericmsaylor@gmail.com). Aborting.')
    process.exit(1)
  }
  console.log('Commish:', commish.id, commish.email)

  // Idempotent: re-use existing CHOPPED TEST league if present
  let league = await prisma.league.findFirst({
    where: { name: 'CHOPPED TEST 2026', ownerId: commish.id },
  })

  if (league) {
    console.log('League already exists:', league.id)
  } else {
    const sportRecord = await prisma.sport.findFirst({ where: { slug: 'nfl' } })

    league = await prisma.league.create({
      data: {
        name: 'CHOPPED TEST 2026',
        sport: 'NFL',
        sportId: sportRecord?.id || null,
        format: 'CHOPPED',
        draftType: 'SNAKE',
        isPublic: false,
        ownerId: commish.id,
        maxTeams: 8,
        settings: {
          chopsPerWeek: 1,
          manualChopEnabled: true,
          autoChopFallback: true,
          minTeamsToStart: 4,
          rosterSize: 17,
          scoringType: 'half_ppr',
          budget: 1000, // FAAB
        },
        members: {
          create: { userId: commish.id, role: 'OWNER' },
        },
      },
    })
    console.log('Created league:', league.id)
  }

  // Make sure the commish has a Team in this league
  let commishTeam = await prisma.team.findFirst({
    where: { leagueId: league.id, userId: commish.id },
  })
  if (!commishTeam) {
    commishTeam = await prisma.team.create({
      data: {
        leagueId: league.id,
        userId: commish.id,
        name: CHOPPED_TEST_NAMES[0],
      },
    })
    console.log('Created commish team:', commishTeam.id)
  } else {
    console.log('Commish team exists:', commishTeam.id)
  }

  // Hash a throwaway password ONCE for all placeholder users (they never log in)
  const placeholderHash = await bcrypt.hash('chopped-test-placeholder', 10)

  // 7 placeholder users + LeagueMember + Team
  for (let i = 1; i <= 7; i++) {
    const email = `chopped-test-${i}@clutchtest.com`
    const teamName = CHOPPED_TEST_NAMES[i]

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
      console.log(`Created user ${i}:`, user.id)
    }

    const existingMember = await prisma.leagueMember.findFirst({
      where: { leagueId: league.id, userId: user.id },
    })
    if (!existingMember) {
      await prisma.leagueMember.create({
        data: { leagueId: league.id, userId: user.id, role: 'MEMBER' },
      })
      console.log(`Added member ${i} to league`)
    }

    const existingTeam = await prisma.team.findFirst({
      where: { leagueId: league.id, userId: user.id },
    })
    if (!existingTeam) {
      await prisma.team.create({
        data: {
          leagueId: league.id,
          userId: user.id,
          name: teamName,
        },
      })
      console.log(`Created team ${i}: ${teamName}`)
    }
  }

  const teamCount = await prisma.team.count({ where: { leagueId: league.id } })
  const memberCount = await prisma.leagueMember.count({ where: { leagueId: league.id } })

  console.log('')
  console.log('========================================')
  console.log(`League ${league.id}: ${teamCount} teams, ${memberCount} members ready`)
  console.log(`League URL:  https://clutchfantasysports.com/leagues/${league.id}`)
  console.log(`Chop Zone:   https://clutchfantasysports.com/leagues/${league.id}/chop`)
  console.log('========================================')
  process.exit(0)
})().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
