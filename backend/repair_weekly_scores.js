/**
 * Repair script: Backfill weekly scores for ALL historical seasons
 * from raw scoreboard data already stored in RawProviderData.
 *
 * The original import had a bug where matchup.teams was undefined
 * (Yahoo nests at matchup['0'].teams). This script re-parses
 * the stored raw data and updates weeklyScores on every HistoricalSeason.
 *
 * No Yahoo OAuth needed — uses stored raw data only.
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

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

function parseScoreboardWeek(payload) {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload
  const league = data?.fantasy_content?.league
  const scoreboard = Array.isArray(league) ? league[1]?.scoreboard : league?.scoreboard
  const matchups = scoreboard?.[0]?.matchups || scoreboard?.matchups || {}

  const games = []
  for (const entry of Object.values(matchups)) {
    const matchup = entry?.matchup
    if (!matchup) continue
    // Fixed: teams at matchup['0'].teams
    const teams = matchup['0']?.teams || matchup.teams || {}
    const teamArr = Object.values(teams).filter(t => t?.team)
    if (teamArr.length >= 2) {
      const t0 = extractMatchupTeam(teamArr[0])
      const t1 = extractMatchupTeam(teamArr[1])
      games.push({
        homeTeamId: t0.teamId,
        homePoints: t0.points,
        awayTeamId: t1.teamId,
        awayPoints: t1.points,
        isPlayoffs: matchup.is_playoffs === '1',
        isConsolation: matchup.is_consolation === '1',
      })
    }
  }
  return games
}

function buildWeeklyScores(matchups, teamId) {
  const scores = []
  for (const [week, games] of Object.entries(matchups)) {
    const game = games.find(g =>
      String(g.homeTeamId) === String(teamId) || String(g.awayTeamId) === String(teamId)
    )
    if (game) {
      const isHome = String(game.homeTeamId) === String(teamId)
      scores.push({
        week: parseInt(week),
        points: isHome ? game.homePoints : game.awayPoints,
        opponentPoints: isHome ? game.awayPoints : game.homePoints,
        isPlayoffs: game.isPlayoffs || false,
        isConsolation: game.isConsolation || false,
      })
    }
  }
  return scores
}

async function main() {
  // Get all leagues that have historical seasons
  const leagues = await prisma.historicalSeason.groupBy({
    by: ['leagueId'],
    _count: true,
  })
  console.log(`Found ${leagues.length} league(s) with historical data`)

  // Get all league imports to find league keys
  const imports = await prisma.leagueImport.findMany({
    where: { sourcePlatform: 'yahoo' },
    select: { clutchLeagueId: true, sourceLeagueId: true },
  })
  const leagueKeyMap = {} // clutchLeagueId -> sourceLeagueId
  for (const imp of imports) {
    if (imp.clutchLeagueId) leagueKeyMap[imp.clutchLeagueId] = imp.sourceLeagueId
  }

  // Get all raw scoreboard samples
  const rawScoreboards = await prisma.rawProviderData.findMany({
    where: { provider: 'yahoo', dataType: 'scoreboard_sample' },
    select: { eventRef: true, payload: true },
  })
  console.log(`Found ${rawScoreboards.length} raw scoreboard records`)

  // We only have week 1 stored as a sample. For a full fix, we need all weeks.
  // But wait — the import fetches ALL weeks live during import. The raw data only stores week 1.
  // So we can only verify week 1 parsing is correct.
  //
  // For the ACTUAL backfill, we need to re-import matchups from Yahoo.
  // BUT: the historical seasons already have the right W/L/PF data from standings.
  // The weeklyScores field is just for "Best Week" and matchup history display.
  //
  // Since we only stored scoreboard_sample (week 1), we can't fully backfill.
  // What we CAN do: verify the parse fix works, and require re-import for full data.

  // Let's at least verify the fix works with week 1 data
  let fixed = 0
  for (const sb of rawScoreboards) {
    const games = parseScoreboardWeek(sb.payload)
    if (games.length > 0) {
      console.log(`  ${sb.eventRef}: ${games.length} matchups parsed (week 1)`)
      for (const g of games) {
        console.log(`    ${g.homeTeamId} (${g.homePoints}) vs ${g.awayTeamId} (${g.awayPoints})`)
      }
      fixed++
    }
  }

  console.log(`\nSuccessfully parsed ${fixed}/${rawScoreboards.length} scoreboards`)
  console.log('\nNOTE: Only week 1 samples are stored in raw data.')
  console.log('To backfill ALL weekly scores, users need to re-import their league.')
  console.log('The import code has been fixed to correctly parse matchup data going forward.')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
