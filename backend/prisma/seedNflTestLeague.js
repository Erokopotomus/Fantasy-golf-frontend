/**
 * NFL Test League Seed Script
 *
 * Creates an isolated mock NFL league with 8 teams, real 2024 player rosters,
 * scored weeks, and H2H matchups — so you can see the full NFL experience.
 *
 * ALL test data is tagged with [TEST] prefix and tracked in a manifest file
 * for easy cleanup. Run the cleanup function to remove everything.
 *
 * Usage:
 *   node prisma/seedNflTestLeague.js          # Create test data
 *   node prisma/seedNflTestLeague.js cleanup   # Remove all test data
 */

const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')

// Block running against production database
const dbUrl = process.env.DATABASE_URL || '';
if (/rlwy\.net|railway/i.test(dbUrl)) {
  console.error('\n🚫 BLOCKED: Cannot run NFL test league seed against production (Railway).');
  console.error('   Point DATABASE_URL at a local database first.\n');
  process.exit(1);
}

const prisma = new PrismaClient()
const MANIFEST_PATH = path.join(__dirname, 'nfl-test-manifest.json')

// ─── Test Data Constants ────────────────────────────────────────────────────
const TEST_PREFIX = '[TEST] '
const TEST_EMAIL_DOMAIN = '@clutch-test.local'
const TEST_PASSWORD_HASH = '$2b$10$testhashdoesnotmatterforseeding000000000000' // won't be used for login

const FAKE_MANAGERS = [
  { name: 'Marcus Thompson', team: 'Thompson Dynasty' },
  { name: 'Sarah Chen', team: 'Chen\'s Champions' },
  { name: 'Jake Williams', team: 'Williams Warriors' },
  { name: 'Priya Patel', team: 'Patel Powerhouse' },
  { name: 'Diego Martinez', team: 'Martinez Mavericks' },
  { name: 'Olivia Johnson', team: 'Johnson Juggernauts' },
  { name: 'Tyler Brooks', team: 'Brooks Brigade' },
]

// Roster shape: QB, RB, RB, WR, WR, TE, FLEX(RB/WR/TE), K, DST + 6 bench
const ROSTER_SHAPE = {
  starters: [
    { pos: 'QB', count: 1 },
    { pos: 'RB', count: 2 },
    { pos: 'WR', count: 2 },
    { pos: 'TE', count: 1 },
    { pos: 'FLEX', count: 1, from: ['RB', 'WR', 'TE'] },
    { pos: 'K', count: 1 },
    { pos: 'DST', count: 1 },
  ],
  benchCount: 6,
}

// ─── Seed Function ──────────────────────────────────────────────────────────

async function seed() {
  console.log('=== NFL Test League Seed ===\n')
  const manifest = { createdAt: new Date().toISOString(), users: [], league: null, teams: [], leagueSeason: null, teamSeasons: [], matchups: [], fantasyScores: [], weeklyResults: [], leagueMembers: [], rosterEntries: [] }

  // 1. Find Eric's real user
  const eric = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (!eric) throw new Error('No admin user found — need your real account')
  console.log(`Found your account: ${eric.name} (${eric.email})`)

  // 2. Find the 2024 NFL season (created by prior test)
  const nflSport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
  if (!nflSport) throw new Error('NFL sport not found')

  let season2024 = await prisma.season.findFirst({ where: { sportId: nflSport.id, year: 2024 } })
  if (!season2024) {
    season2024 = await prisma.season.create({
      data: {
        sportId: nflSport.id, year: 2024, name: `${TEST_PREFIX}2024 NFL Season`,
        slug: '2024', isCurrent: false,
        startDate: new Date('2024-09-05'), endDate: new Date('2025-01-06'),
      },
    })
    manifest.season2024 = season2024.id
  }
  console.log(`2024 NFL Season: ${season2024.id}`)

  // Temporarily make 2024 current so the app routes work
  await prisma.season.updateMany({ where: { sportId: nflSport.id }, data: { isCurrent: false } })
  await prisma.season.update({ where: { id: season2024.id }, data: { isCurrent: true } })
  manifest.originalCurrentSeasonId = (await prisma.season.findFirst({ where: { sportId: nflSport.id, year: 2025 } }))?.id || null

  // 3. Ensure FantasyWeeks exist for 2024
  const existingWeeks = await prisma.fantasyWeek.count({ where: { seasonId: season2024.id } })
  if (existingWeeks === 0) {
    const { createNflFantasyWeeks } = require('../src/services/seasonSetup')
    await createNflFantasyWeeks(2024, prisma)
  }
  const fantasyWeeks = await prisma.fantasyWeek.findMany({
    where: { seasonId: season2024.id },
    orderBy: { weekNumber: 'asc' },
  })
  console.log(`Fantasy weeks: ${fantasyWeeks.length}`)

  // 4. Find Half PPR scoring system
  const scoringSystem = await prisma.scoringSystem.findFirst({
    where: { sportId: nflSport.id, slug: 'half_ppr' },
  })
  if (!scoringSystem) throw new Error('Half PPR scoring system not found')

  // 5. Create 7 fake users
  console.log('\nCreating test users...')
  const testUsers = []
  for (const mgr of FAKE_MANAGERS) {
    const email = `${mgr.name.toLowerCase().replace(/\s+/g, '.')}${TEST_EMAIL_DOMAIN}`
    const user = await prisma.user.create({
      data: { email, password: TEST_PASSWORD_HASH, name: `${TEST_PREFIX}${mgr.name}`, role: 'user' },
    })
    testUsers.push({ user, teamName: mgr.team })
    manifest.users.push(user.id)
    console.log(`  Created ${user.name} (${email})`)
  }

  // 6. Create the league
  console.log('\nCreating test NFL league...')
  const league = await prisma.league.create({
    data: {
      name: `${TEST_PREFIX}NFL Mock League`,
      sport: 'NFL',
      sportId: nflSport.id,
      format: 'HEAD_TO_HEAD',
      maxTeams: 8,
      status: 'ACTIVE',
      scoringSystemId: scoringSystem.id,
      ownerId: eric.id,
      inviteCode: 'TEST-NFL-' + Date.now().toString(36),
      settings: {
        maxActiveLineup: 9,
        benchSlots: 6,
        rosterSize: 15,
        waiverType: 'faab',
        faabBudget: 100,
        tradeDeadline: '2024-11-15',
      },
    },
  })
  manifest.league = league.id
  console.log(`  League: ${league.name} (${league.id})`)

  // 7. Create league members + teams (Eric first, then 7 fakes)
  const allManagers = [{ user: eric, teamName: 'Eric\'s Eagles' }, ...testUsers]

  console.log('\nCreating teams and league members...')
  const teams = []
  for (const mgr of allManagers) {
    const member = await prisma.leagueMember.create({
      data: {
        leagueId: league.id, userId: mgr.user.id,
        role: mgr.user.id === eric.id ? 'OWNER' : 'MEMBER',
      },
    })
    manifest.leagueMembers.push(member.id)

    const team = await prisma.team.create({
      data: {
        name: `${TEST_PREFIX}${mgr.teamName}`,
        leagueId: league.id,
        userId: mgr.user.id,
      },
    })
    teams.push(team)
    manifest.teams.push(team.id)
    console.log(`  ${team.name} — ${mgr.user.name}`)
  }

  // 8. Build rosters from real top-scoring 2024 players
  console.log('\nBuilding rosters from 2024 player data...')
  const playerPool = {}
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DST']) {
    // Get players with week 1 stats, ordered by fantasy points
    const players = await prisma.player.findMany({
      where: {
        nflPosition: pos,
        ...(pos !== 'DST' ? { nflPlayerGames: { some: { game: { season: 2024, week: 1 } } } } : {}),
      },
      include: pos !== 'DST' ? {
        nflPlayerGames: {
          where: { game: { season: 2024, week: 1 } },
          select: { fantasyPtsHalf: true },
        },
      } : undefined,
      take: pos === 'DST' ? 32 : 60,
    })

    // Sort by week 1 fantasy points (for realistic draft-like distribution)
    if (pos !== 'DST') {
      players.sort((a, b) => {
        const aPts = a.nflPlayerGames?.[0]?.fantasyPtsHalf || 0
        const bPts = b.nflPlayerGames?.[0]?.fantasyPtsHalf || 0
        return bPts - aPts
      })
    }

    playerPool[pos] = players.map(p => p.id)
  }

  console.log(`  Player pool: QB=${playerPool.QB.length}, RB=${playerPool.RB.length}, WR=${playerPool.WR.length}, TE=${playerPool.TE.length}, K=${playerPool.K.length}, DST=${playerPool.DST.length}`)

  // Draft-style distribution: snake through teams
  const taken = new Set()
  const positionIndexes = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 }

  function draftPlayer(pos) {
    while (positionIndexes[pos] < playerPool[pos].length) {
      const pid = playerPool[pos][positionIndexes[pos]]
      positionIndexes[pos]++
      if (!taken.has(pid)) {
        taken.add(pid)
        return pid
      }
    }
    return null
  }

  for (let t = 0; t < teams.length; t++) {
    const team = teams[t]
    const roster = []

    // Starters: QB, RB, RB, WR, WR, TE, FLEX, K, DST
    roster.push({ playerId: draftPlayer('QB'), status: 'ACTIVE', pos: 'QB' })
    roster.push({ playerId: draftPlayer('RB'), status: 'ACTIVE', pos: 'RB' })
    roster.push({ playerId: draftPlayer('RB'), status: 'ACTIVE', pos: 'RB' })
    roster.push({ playerId: draftPlayer('WR'), status: 'ACTIVE', pos: 'WR' })
    roster.push({ playerId: draftPlayer('WR'), status: 'ACTIVE', pos: 'WR' })
    roster.push({ playerId: draftPlayer('TE'), status: 'ACTIVE', pos: 'TE' })
    // FLEX: grab next best RB or WR
    const flexRb = playerPool.RB[positionIndexes.RB]
    const flexWr = playerPool.WR[positionIndexes.WR]
    roster.push({ playerId: draftPlayer(flexRb ? 'RB' : 'WR'), status: 'ACTIVE', pos: 'FLEX' })
    roster.push({ playerId: draftPlayer('K'), status: 'ACTIVE', pos: 'K' })
    roster.push({ playerId: draftPlayer('DST'), status: 'ACTIVE', pos: 'DST' })

    // Bench: 2 RB, 2 WR, 1 QB, 1 TE
    roster.push({ playerId: draftPlayer('RB'), status: 'BENCH', pos: 'RB' })
    roster.push({ playerId: draftPlayer('RB'), status: 'BENCH', pos: 'RB' })
    roster.push({ playerId: draftPlayer('WR'), status: 'BENCH', pos: 'WR' })
    roster.push({ playerId: draftPlayer('WR'), status: 'BENCH', pos: 'WR' })
    roster.push({ playerId: draftPlayer('QB'), status: 'BENCH', pos: 'QB' })
    roster.push({ playerId: draftPlayer('TE'), status: 'BENCH', pos: 'TE' })

    // Create roster entries
    for (const r of roster) {
      if (!r.playerId) continue
      const entry = await prisma.rosterEntry.create({
        data: {
          teamId: team.id,
          playerId: r.playerId,
          position: r.pos,
          rosterStatus: r.status,
          isActive: true,
          acquiredVia: 'DRAFT',
        },
      })
      manifest.rosterEntries.push(entry.id)
    }

    const activeCount = roster.filter(r => r.status === 'ACTIVE' && r.playerId).length
    const benchCount = roster.filter(r => r.status === 'BENCH' && r.playerId).length
    console.log(`  ${team.name}: ${activeCount} starters + ${benchCount} bench`)
  }

  // 9. Create LeagueSeason + TeamSeasons
  console.log('\nCreating league season...')
  const leagueSeason = await prisma.leagueSeason.create({
    data: { leagueId: league.id, seasonId: season2024.id, status: 'ACTIVE' },
  })
  manifest.leagueSeason = leagueSeason.id

  const teamSeasonMap = {}
  for (const team of teams) {
    const ts = await prisma.teamSeason.create({
      data: { leagueSeasonId: leagueSeason.id, teamId: team.id, teamName: team.name },
    })
    teamSeasonMap[team.id] = ts
    manifest.teamSeasons.push(ts.id)
  }
  console.log(`  LeagueSeason + ${teams.length} TeamSeasons created`)

  // 10. Generate H2H matchups
  console.log('\nGenerating H2H matchups...')
  const { initializeLeagueSeason } = require('../src/services/seasonSetup')
  // generateH2HMatchups is called inside initializeLeagueSeason but we already created
  // the league season manually, so let's just generate matchups directly
  const teamIds = teams.map(t => t.id)
  const n = teamIds.length
  const teamList = [...teamIds]
  if (n % 2 !== 0) teamList.push(null)
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
          fantasyWeekId: fw.id,
          homeTeamId: home,
          awayTeamId: away,
          isComplete: false,
        })
      }
    }
    const last = teamList.pop()
    teamList.splice(1, 0, last)
  }

  // Repeat pattern for weeks 8-14 and 15-18
  const totalWeeks = fantasyWeeks.length
  while (matchupsToCreate.length < totalWeeks * half) {
    // Already have enough or will cycle
    break
  }

  const createdMatchups = await prisma.matchup.createMany({ data: matchupsToCreate })
  console.log(`  ${matchupsToCreate.length} matchups across ${rounds} weeks`)
  // Store matchup IDs
  const allMatchups = await prisma.matchup.findMany({ where: { leagueId: league.id } })
  manifest.matchups = allMatchups.map(m => m.id)

  // 11. Score week 1 for a quick preview
  console.log('\nScoring week 1...')
  const { scoreNflWeek, computeNflWeeklyResults } = require('../src/services/nflFantasyTracker')
  const { snapshotLineups } = require('../src/services/fantasyTracker')

  const weeksToScore = fantasyWeeks.filter(w => w.weekNumber <= 1)
  for (const week of weeksToScore) {
    process.stdout.write(`  Week ${week.weekNumber}: scoring...`)
    const sr = await scoreNflWeek(week.id, prisma)
    process.stdout.write(` ${sr.players}p × ${sr.systems}s...`)

    await snapshotLineups(week.id, prisma)
    const wr = await computeNflWeeklyResults(week.id, prisma)
    console.log(` ${wr.computed} team results. Done.`)

    // Track created FantasyScores
    const fsIds = await prisma.fantasyScore.findMany({
      where: { fantasyWeekId: week.id },
      select: { id: true },
    })
    manifest.fantasyScores.push(...fsIds.map(f => f.id))

    const wrIds = await prisma.weeklyTeamResult.findMany({
      where: { leagueSeasonId: leagueSeason.id, fantasyWeekId: week.id },
      select: { id: true },
    })
    manifest.weeklyResults.push(...wrIds.map(r => r.id))
  }

  // 11b. Sync Team model totalPoints/wins/losses from TeamSeason
  console.log('\nSyncing Team model from TeamSeason aggregates...')
  for (const team of teams) {
    const ts = await prisma.teamSeason.findFirst({
      where: { leagueSeasonId: leagueSeason.id, teamId: team.id },
    })
    if (ts) {
      await prisma.team.update({
        where: { id: team.id },
        data: {
          totalPoints: Math.round(ts.totalPoints * 100) / 100,
          wins: ts.wins || 0,
          losses: ts.losses || 0,
        },
      })
    }
  }
  console.log('  Team model synced.')

  // 12. Show summary
  console.log('\n=== Test League Ready ===')
  console.log(`League: ${league.name}`)
  console.log(`League ID: ${league.id}`)
  console.log(`Your team: ${teams[0].name}`)
  console.log(`Format: H2H, Half PPR`)
  console.log(`Teams: ${teams.length}`)
  console.log(`Weeks scored: ${weeksToScore.length}`)
  console.log(`URL: http://localhost:5173/leagues/${league.id}`)

  // Show week 1 matchup results
  const week1Matchups = await prisma.matchup.findMany({
    where: { leagueId: league.id, fantasyWeekId: fantasyWeeks[0].id },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  })
  console.log('\nWeek 1 Matchups:')
  for (const m of week1Matchups) {
    const winner = m.homeScore > m.awayScore ? '◀' : m.awayScore > m.homeScore ? '▶' : '='
    console.log(`  ${m.homeTeam.name.replace(TEST_PREFIX, '')} ${m.homeScore} ${winner} ${m.awayScore} ${m.awayTeam.name.replace(TEST_PREFIX, '')}`)
  }

  // Show standings after 4 weeks
  const standings = await prisma.teamSeason.findMany({
    where: { leagueSeasonId: leagueSeason.id },
    include: { team: { select: { name: true } } },
    orderBy: [{ wins: 'desc' }, { totalPoints: 'desc' }],
  })
  console.log('\nStandings after scoring:')
  for (let i = 0; i < standings.length; i++) {
    const ts = standings[i]
    console.log(`  ${i + 1}. ${ts.team.name.replace(TEST_PREFIX, '')} — ${ts.wins}W-${ts.losses}L ${ts.totalPoints.toFixed(1)} PF`)
  }

  // Save manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log(`\nManifest saved to: ${MANIFEST_PATH}`)
  console.log('Run "node prisma/seedNflTestLeague.js cleanup" to remove all test data.')

  await prisma.$disconnect()
}

// ─── Cleanup Function ───────────────────────────────────────────────────────

async function cleanup() {
  console.log('=== NFL Test League Cleanup ===\n')

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log('No manifest file found. Trying to find test data by prefix...')
    return cleanupByPrefix()
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  console.log(`Manifest from: ${manifest.createdAt}`)

  // Delete in reverse dependency order
  console.log('Removing weekly results...')
  if (manifest.weeklyResults?.length) {
    await prisma.weeklyTeamResult.deleteMany({ where: { id: { in: manifest.weeklyResults } } })
  }

  console.log('Removing fantasy scores...')
  if (manifest.fantasyScores?.length) {
    await prisma.fantasyScore.deleteMany({ where: { id: { in: manifest.fantasyScores } } })
  }

  console.log('Removing lineup snapshots...')
  if (manifest.leagueSeason) {
    await prisma.lineupSnapshot.deleteMany({ where: { leagueSeasonId: manifest.leagueSeason } })
  }

  console.log('Removing matchups...')
  if (manifest.matchups?.length) {
    await prisma.matchup.deleteMany({ where: { id: { in: manifest.matchups } } })
  }

  console.log('Removing roster entries...')
  if (manifest.rosterEntries?.length) {
    await prisma.rosterEntry.deleteMany({ where: { id: { in: manifest.rosterEntries } } })
  }

  console.log('Removing team seasons...')
  if (manifest.teamSeasons?.length) {
    await prisma.teamSeason.deleteMany({ where: { id: { in: manifest.teamSeasons } } })
  }

  console.log('Removing league season...')
  if (manifest.leagueSeason) {
    await prisma.leagueSeason.deleteMany({ where: { id: manifest.leagueSeason } })
  }

  console.log('Removing teams...')
  if (manifest.teams?.length) {
    await prisma.team.deleteMany({ where: { id: { in: manifest.teams } } })
  }

  console.log('Removing league members...')
  if (manifest.leagueMembers?.length) {
    await prisma.leagueMember.deleteMany({ where: { id: { in: manifest.leagueMembers } } })
  }

  console.log('Removing league...')
  if (manifest.league) {
    await prisma.league.deleteMany({ where: { id: manifest.league } })
  }

  console.log('Removing test users...')
  if (manifest.users?.length) {
    await prisma.user.deleteMany({ where: { id: { in: manifest.users } } })
  }

  // Restore original current season
  if (manifest.originalCurrentSeasonId) {
    console.log('Restoring 2025 as current NFL season...')
    const nflSport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
    if (nflSport) {
      await prisma.season.updateMany({ where: { sportId: nflSport.id }, data: { isCurrent: false } })
      await prisma.season.update({ where: { id: manifest.originalCurrentSeasonId }, data: { isCurrent: true } })
    }
  }

  // Remove manifest file
  fs.unlinkSync(MANIFEST_PATH)
  console.log('\nCleanup complete. Manifest file removed.')

  await prisma.$disconnect()
}

async function cleanupByPrefix() {
  console.log('Searching for [TEST] prefixed data...')

  // Find test league
  const testLeagues = await prisma.league.findMany({ where: { name: { startsWith: TEST_PREFIX } } })
  for (const league of testLeagues) {
    console.log(`Found test league: ${league.name} (${league.id})`)

    // Delete all dependent data
    const ls = await prisma.leagueSeason.findMany({ where: { leagueId: league.id } })
    for (const s of ls) {
      await prisma.weeklyTeamResult.deleteMany({ where: { leagueSeasonId: s.id } })
      await prisma.lineupSnapshot.deleteMany({ where: { leagueSeasonId: s.id } })
      await prisma.teamSeason.deleteMany({ where: { leagueSeasonId: s.id } })
    }
    await prisma.leagueSeason.deleteMany({ where: { leagueId: league.id } })
    await prisma.matchup.deleteMany({ where: { leagueId: league.id } })

    const teams = await prisma.team.findMany({ where: { leagueId: league.id } })
    for (const t of teams) {
      await prisma.rosterEntry.deleteMany({ where: { teamId: t.id } })
    }
    await prisma.team.deleteMany({ where: { leagueId: league.id } })
    await prisma.leagueMember.deleteMany({ where: { leagueId: league.id } })
    await prisma.league.delete({ where: { id: league.id } })
  }

  // Delete test users
  const testUsers = await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } })
  console.log(`Removed ${testUsers.count} test users`)

  // Restore 2025 as current NFL season
  const nflSport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
  if (nflSport) {
    const s2025 = await prisma.season.findFirst({ where: { sportId: nflSport.id, year: 2025 } })
    if (s2025) {
      await prisma.season.updateMany({ where: { sportId: nflSport.id }, data: { isCurrent: false } })
      await prisma.season.update({ where: { id: s2025.id }, data: { isCurrent: true } })
      console.log('Restored 2025 as current NFL season')
    }
  }

  if (fs.existsSync(MANIFEST_PATH)) fs.unlinkSync(MANIFEST_PATH)
  console.log('Prefix-based cleanup complete.')
  await prisma.$disconnect()
}

// ─── Main ───────────────────────────────────────────────────────────────────

const cmd = process.argv[2]
if (cmd === 'cleanup') {
  cleanup().catch(e => { console.error('Cleanup failed:', e); process.exit(1) })
} else {
  seed().catch(e => { console.error('Seed failed:', e); process.exit(1) })
}
