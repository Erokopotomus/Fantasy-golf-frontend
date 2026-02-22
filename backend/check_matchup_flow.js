/**
 * Simulate the exact matchup fetch + buildWeeklyScores flow using raw stored data
 */
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

function buildWeeklyScores(matchups, teamId) {
  const scores = []
  for (const [week, games] of Object.entries(matchups)) {
    const gameIdx = games.findIndex(g =>
      String(g.homeTeamId) === String(teamId) || String(g.awayTeamId) === String(teamId)
    )
    if (gameIdx >= 0) {
      const game = games[gameIdx]
      const isHome = String(game.homeTeamId) === String(teamId)
      scores.push({
        week: parseInt(week),
        points: isHome ? game.homePoints : game.awayPoints,
        opponentPoints: isHome ? game.awayPoints : game.homePoints,
      })
    }
  }
  return scores
}

function extractMatchupTeam(wrapper) {
  const arr = wrapper?.team
  if (!Array.isArray(arr)) return { teamId: null, points: 0 }
  const meta = {}
  const fields = Array.isArray(arr[0]) ? arr[0] : [arr[0]]
  for (const f of fields) {
    if (f && typeof f === 'object') Object.assign(meta, f)
  }
  let points = 0
  for (let j = 1; j < arr.length; j++) {
    if (arr[j]?.team_points?.total) {
      points = parseFloat(arr[j].team_points.total)
      break
    }
  }
  return { teamId: meta.team_id, points }
}

async function main() {
  // Get raw scoreboard for week 1 of 2020 Bro Montana
  const raw = await p.rawProviderData.findFirst({
    where: { provider: 'yahoo', dataType: 'scoreboard_sample', eventRef: '399.l.784389' },
    select: { payload: true },
  })

  if (!raw) {
    console.log('No scoreboard found for 399.l.784389')
    await p.$disconnect()
    return
  }

  const data = typeof raw.payload === 'string' ? JSON.parse(raw.payload) : raw.payload
  const league = data?.fantasy_content?.league
  const scoreboard = Array.isArray(league) ? league[1]?.scoreboard : league?.scoreboard
  const matchups = scoreboard?.[0]?.matchups || scoreboard?.matchups || {}

  console.log('matchups type:', typeof matchups)
  console.log('matchups keys:', Object.keys(matchups))

  // Parse matchups the same way fetchAllMatchups does
  const weekGames = []
  for (const entry of Object.values(matchups)) {
    const matchup = entry?.matchup
    if (!matchup) continue
    const teams = matchup.teams || {}
    const teamArr = Object.values(teams).filter(t => t?.team)
    console.log(`\nMatchup found: ${teamArr.length} teams`)

    if (teamArr.length >= 2) {
      const t0 = extractMatchupTeam(teamArr[0])
      const t1 = extractMatchupTeam(teamArr[1])
      console.log(`  ${t0.teamId} (${t0.points}) vs ${t1.teamId} (${t1.points})`)
      weekGames.push({
        homeTeamId: t0.teamId,
        homePoints: t0.points,
        awayTeamId: t1.teamId,
        awayPoints: t1.points,
      })
    } else {
      // Debug: what does the matchup structure actually look like?
      console.log('  Matchup structure keys:', Object.keys(matchup))
      console.log('  Matchup.teams:', JSON.stringify(matchup.teams || matchup['0']).slice(0, 300))
    }
  }

  console.log(`\nParsed ${weekGames.length} games for week 1`)

  // Build weekly scores for team 1
  const fakeMatchups = { 1: weekGames }
  const ws = buildWeeklyScores(fakeMatchups, '1')
  console.log('\nWeekly scores for teamId 1:', ws)

  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
