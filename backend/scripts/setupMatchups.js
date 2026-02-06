/**
 * Setup script: creates bot users, teams, rosters, and matchups for demo H2H league.
 * Run with: node scripts/setupMatchups.js
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const LEAGUE_ID = 'cml9pl6nb0002p72tl6dyhcyk'

const BOT_TEAMS = [
  {
    name: 'Bot McBotface',
    email: 'bot1@clutch.gg',
    teamName: "Bot McBotface's Team",
    playerRanks: [5, 6, 7, 8], // Rahm, Åberg, Hovland, Cantlay
  },
  {
    name: 'Par Machine',
    email: 'bot2@clutch.gg',
    teamName: "Par Machine's Team",
    playerRanks: [9, 10, 11, 12], // Clark, Fleetwood, Matsuyama, Lowry
  },
  {
    name: 'Eagle Eye',
    email: 'bot3@clutch.gg',
    teamName: "Eagle Eye's Team",
    playerRanks: [13, 14, 15, 16], // Fitzpatrick, Theegala, Harman, Finau
  },
]

async function main() {
  console.log('Setting up bot teams for matchups...\n')

  // Get all players indexed by rank
  const allPlayers = await prisma.player.findMany({
    orderBy: { owgrRank: 'asc' },
    take: 20,
  })
  const playerByRank = {}
  allPlayers.forEach(p => { playerByRank[p.owgrRank] = p })

  const hashedPassword = await bcrypt.hash('botpass123', 10)

  for (const bot of BOT_TEAMS) {
    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email: bot.email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: bot.name,
          email: bot.email,
          password: hashedPassword,
          avatar: bot.name[0],
        },
      })
      console.log(`Created user: ${bot.name} (${user.id})`)
    } else {
      console.log(`User exists: ${bot.name} (${user.id})`)
    }

    // Check if already a member
    const existing = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId: user.id, leagueId: LEAGUE_ID } },
    })
    if (!existing) {
      await prisma.leagueMember.create({
        data: { userId: user.id, leagueId: LEAGUE_ID, role: 'MEMBER' },
      })
      console.log(`  Joined league`)
    }

    // Check if team exists
    let team = await prisma.team.findFirst({
      where: { userId: user.id, leagueId: LEAGUE_ID },
    })
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: bot.teamName,
          userId: user.id,
          leagueId: LEAGUE_ID,
        },
      })
      console.log(`  Created team: ${team.name} (${team.id})`)
    } else {
      console.log(`  Team exists: ${team.name} (${team.id})`)
    }

    // Add roster entries
    for (let i = 0; i < bot.playerRanks.length; i++) {
      const rank = bot.playerRanks[i]
      const player = playerByRank[rank]
      if (!player) {
        console.log(`  WARNING: No player found at rank ${rank}`)
        continue
      }

      const existingEntry = await prisma.rosterEntry.findFirst({
        where: { teamId: team.id, playerId: player.id },
      })
      if (!existingEntry) {
        await prisma.rosterEntry.create({
          data: {
            teamId: team.id,
            playerId: player.id,
            position: i < 2 ? 'ACTIVE' : 'BENCH', // top 2 active
            acquiredVia: 'DRAFT',
          },
        })
        console.log(`  Rostered: ${player.name} (${i < 2 ? 'ACTIVE' : 'BENCH'})`)
      } else {
        console.log(`  Already rostered: ${player.name}`)
      }
    }
  }

  // Now create matchup records for completed tournaments
  console.log('\nGenerating matchups from completed tournaments...')

  const teams = await prisma.team.findMany({
    where: { leagueId: LEAGUE_ID },
    include: {
      user: { select: { id: true, name: true } },
      roster: { include: { player: true } },
    },
  })

  console.log(`Found ${teams.length} teams in league`)

  const completedTournaments = await prisma.tournament.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { startDate: 'asc' },
  })

  console.log(`Found ${completedTournaments.length} completed tournaments`)

  // Round-robin schedule: for N teams, each week rotate pairings
  // With 4 teams: 3 weeks to play everyone, then repeat
  const teamIds = teams.map(t => t.id)
  const numTeams = teamIds.length

  if (numTeams < 2) {
    console.log('Need at least 2 teams for matchups')
    await prisma.$disconnect()
    return
  }

  // Generate round-robin pairings
  function generateRoundRobin(ids) {
    const n = ids.length
    const rounds = []
    const list = [...ids]

    // If odd number of teams, add a "BYE"
    if (n % 2 !== 0) list.push(null)
    const half = list.length / 2

    for (let round = 0; round < list.length - 1; round++) {
      const matchups = []
      for (let i = 0; i < half; i++) {
        const home = list[i]
        const away = list[list.length - 1 - i]
        if (home && away) {
          matchups.push({ homeTeamId: home, awayTeamId: away })
        }
      }
      rounds.push(matchups)
      // Rotate: keep first fixed, rotate rest
      list.splice(1, 0, list.pop())
    }
    return rounds
  }

  const roundRobin = generateRoundRobin(teamIds)

  // Delete existing matchups for this league
  await prisma.matchup.deleteMany({ where: { leagueId: LEAGUE_ID } })

  let matchupsCreated = 0

  for (let i = 0; i < completedTournaments.length; i++) {
    const tournament = completedTournaments[i]
    const weekPairings = roundRobin[i % roundRobin.length]

    // Get performances for this tournament to calculate scores
    const performances = await prisma.performance.findMany({
      where: { tournamentId: tournament.id },
    })
    const perfByPlayer = {}
    performances.forEach(p => { perfByPlayer[p.playerId] = p })

    for (const pairing of weekPairings) {
      // Calculate each team's score: sum fantasy points of their rostered players
      const homeTeam = teams.find(t => t.id === pairing.homeTeamId)
      const awayTeam = teams.find(t => t.id === pairing.awayTeamId)

      let homeScore = 0
      let awayScore = 0

      if (homeTeam) {
        for (const entry of homeTeam.roster) {
          const perf = perfByPlayer[entry.playerId]
          if (perf) homeScore += perf.fantasyPoints || 0
        }
      }

      if (awayTeam) {
        for (const entry of awayTeam.roster) {
          const perf = perfByPlayer[entry.playerId]
          if (perf) awayScore += perf.fantasyPoints || 0
        }
      }

      await prisma.matchup.create({
        data: {
          week: i + 1,
          leagueId: LEAGUE_ID,
          tournamentId: tournament.id,
          homeTeamId: pairing.homeTeamId,
          awayTeamId: pairing.awayTeamId,
          homeScore: Math.round(homeScore * 10) / 10,
          awayScore: Math.round(awayScore * 10) / 10,
          isComplete: true,
        },
      })
      matchupsCreated++
    }

    console.log(`  Week ${i + 1}: ${tournament.name} — ${weekPairings.length} matchups`)
  }

  // Update team W/L records
  const allMatchups = await prisma.matchup.findMany({
    where: { leagueId: LEAGUE_ID, isComplete: true },
  })

  const records = {}
  teamIds.forEach(id => { records[id] = { wins: 0, losses: 0, ties: 0, totalPoints: 0 } })

  for (const m of allMatchups) {
    records[m.homeTeamId].totalPoints += m.homeScore
    records[m.awayTeamId].totalPoints += m.awayScore

    if (m.homeScore > m.awayScore) {
      records[m.homeTeamId].wins++
      records[m.awayTeamId].losses++
    } else if (m.awayScore > m.homeScore) {
      records[m.awayTeamId].wins++
      records[m.homeTeamId].losses++
    } else {
      records[m.homeTeamId].ties++
      records[m.awayTeamId].ties++
    }
  }

  // Update team records in DB
  for (const teamId of teamIds) {
    const r = records[teamId]
    await prisma.team.update({
      where: { id: teamId },
      data: {
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
        totalPoints: Math.round(r.totalPoints * 10) / 10,
      },
    })
    const team = teams.find(t => t.id === teamId)
    console.log(`  ${team.user.name}: ${r.wins}W-${r.losses}L-${r.ties}T (${r.totalPoints.toFixed(1)} pts)`)
  }

  console.log(`\nDone! Created ${matchupsCreated} matchups.`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
