const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── Stat Leader Cards ─────────────────────────────────────────────────────
// Top season-total leaders across key stats
async function statLeaderCards(season) {
  const leaders = await prisma.$queryRaw`
    SELECT p.id, p.name, p."nfl_position" as position, p."nfl_team_abbr" as "teamAbbr",
           p."headshot_url" as "headshotUrl",
           SUM(COALESCE(pg."pass_yards", 0))::int as "passYards",
           SUM(COALESCE(pg."rush_yards", 0))::int as "rushYards",
           SUM(COALESCE(pg."rec_yards", 0))::int as "recYards",
           SUM(COALESCE(pg."pass_tds", 0))::int as "passTds",
           SUM(COALESCE(pg."rush_tds", 0))::int as "rushTds",
           SUM(COALESCE(pg."rec_tds", 0))::int as "recTds",
           SUM(COALESCE(pg."receptions", 0))::int as "receptions",
           ROUND(SUM(COALESCE(pg."fantasy_pts_half", 0))::numeric, 1) as "fantasyPts",
           COUNT(pg.id)::int as games
    FROM nfl_player_games pg
    JOIN players p ON p.id = pg."player_id"
    JOIN nfl_games g ON g.id = pg."game_id"
    WHERE g.season = ${season} AND g.status = 'FINAL'
    GROUP BY p.id, p.name, p."nfl_position", p."nfl_team_abbr", p."headshot_url"
    HAVING COUNT(pg.id) >= 3
    ORDER BY SUM(COALESCE(pg."fantasy_pts_half", 0)) DESC
    LIMIT 30
  `

  const cards = []
  const stats = [
    { key: 'passYards', label: 'passing yards', pos: ['QB'] },
    { key: 'rushYards', label: 'rushing yards', pos: ['RB', 'QB'] },
    { key: 'recYards', label: 'receiving yards', pos: ['WR', 'TE'] },
    { key: 'receptions', label: 'receptions', pos: ['WR', 'TE', 'RB'] },
    { key: 'fantasyPts', label: 'fantasy points (Half PPR)', pos: null },
  ]

  for (const stat of stats) {
    const filtered = stat.pos
      ? leaders.filter(p => stat.pos.includes(p.position))
      : leaders
    const sorted = [...filtered].sort((a, b) => Number(b[stat.key]) - Number(a[stat.key]))
    const leader = sorted[0]
    if (!leader || Number(leader[stat.key]) === 0) continue

    const value = Number(leader[stat.key]).toLocaleString()
    cards.push({
      id: `stat-leader-${stat.key}-${season}`,
      type: 'stat_leader',
      category: 'Stat Leader',
      headline: `${leader.name} leads NFL in ${stat.label} (${value})`,
      context: `${leader.position} - ${leader.teamAbbr} | ${leader.games} games played`,
      timestamp: new Date().toISOString(),
      actions: [
        { label: 'Player Profile', href: `/nfl/players/${leader.id}` },
        { label: 'Leaderboards', href: '/nfl/leaderboards' },
      ],
      meta: { playerId: leader.id, stat: stat.key, value: Number(leader[stat.key]) },
      priority: 3,
    })
  }

  return cards
}

// ─── Big Performance Cards ─────────────────────────────────────────────────
// Recent games with 25+ fantasy points (half PPR)
async function bigPerformanceCards(season) {
  const performances = await prisma.$queryRaw`
    SELECT pg.id, p.id as "playerId", p.name, p."nfl_position" as position,
           p."nfl_team_abbr" as "teamAbbr", p."headshot_url" as "headshotUrl",
           g.week, g.season,
           ROUND(pg."fantasy_pts_half"::numeric, 1) as "fantasyPts",
           pg."pass_yards" as "passYards", pg."pass_tds" as "passTds",
           pg."rush_yards" as "rushYards", pg."rush_tds" as "rushTds",
           pg."receptions" as "receptions", pg."rec_yards" as "recYards",
           pg."rec_tds" as "recTds", pg.interceptions,
           g.kickoff
    FROM nfl_player_games pg
    JOIN players p ON p.id = pg."player_id"
    JOIN nfl_games g ON g.id = pg."game_id"
    WHERE g.season = ${season} AND g.status = 'FINAL'
      AND pg."fantasy_pts_half" >= 25
    ORDER BY pg."fantasy_pts_half" DESC
    LIMIT 10
  `

  return performances.map(p => {
    const details = []
    if (p.passTds) details.push(`${p.passTds} pass TD${p.passTds > 1 ? 's' : ''}`)
    if (p.passYards) details.push(`${p.passYards} pass yds`)
    if (p.rushTds) details.push(`${p.rushTds} rush TD${p.rushTds > 1 ? 's' : ''}`)
    if (p.rushYards && p.rushYards > 30) details.push(`${p.rushYards} rush yds`)
    if (p.recTds) details.push(`${p.recTds} rec TD${p.recTds > 1 ? 's' : ''}`)
    if (p.receptions) details.push(`${p.receptions} rec`)
    if (p.recYards && p.recYards > 30) details.push(`${p.recYards} rec yds`)

    return {
      id: `big-perf-${p.playerId}-wk${p.week}`,
      type: 'big_performance',
      category: 'Big Performance',
      headline: `${p.name} posted ${p.fantasyPts} pts in Week ${p.week}`,
      context: details.slice(0, 4).join(', '),
      timestamp: p.kickoff?.toISOString?.() || new Date().toISOString(),
      actions: [
        { label: 'Player Profile', href: `/nfl/players/${p.playerId}` },
      ],
      meta: { playerId: p.playerId, week: p.week, fantasyPts: Number(p.fantasyPts) },
      priority: 2,
    }
  })
}

// ─── Team Trend Cards ──────────────────────────────────────────────────────
// Teams with notable scoring averages
async function teamTrendCards(season) {
  const teams = await prisma.$queryRaw`
    SELECT
      t.id, t.abbreviation, t.name, t."logo_url" as "logoUrl",
      COUNT(g.id)::int as games,
      ROUND(AVG(CASE WHEN g."home_team_id" = t.id THEN g."home_score" ELSE g."away_score" END)::numeric, 1) as "ppg",
      ROUND(AVG(CASE WHEN g."home_team_id" = t.id THEN g."away_score" ELSE g."home_score" END)::numeric, 1) as "oppPpg",
      SUM(CASE
        WHEN (g."home_team_id" = t.id AND g."home_score" > g."away_score")
          OR (g."away_team_id" = t.id AND g."away_score" > g."home_score")
        THEN 1 ELSE 0
      END)::int as wins,
      SUM(CASE
        WHEN (g."home_team_id" = t.id AND g."home_score" < g."away_score")
          OR (g."away_team_id" = t.id AND g."away_score" < g."home_score")
        THEN 1 ELSE 0
      END)::int as losses
    FROM nfl_teams t
    JOIN nfl_games g ON (g."home_team_id" = t.id OR g."away_team_id" = t.id)
    WHERE g.season = ${season} AND g.status = 'FINAL' AND g."game_type" = 'REG'
    GROUP BY t.id, t.abbreviation, t.name, t."logo_url"
    HAVING COUNT(g.id) >= 3
    ORDER BY AVG(CASE WHEN g."home_team_id" = t.id THEN g."home_score" ELSE g."away_score" END) DESC
  `

  if (teams.length === 0) return []

  const cards = []

  // Top scoring team
  const topTeam = teams[0]
  cards.push({
    id: `team-trend-top-offense-${season}`,
    type: 'team_trend',
    category: 'Team Trend',
    headline: `${topTeam.name} rank #1 in PPG (${topTeam.ppg})`,
    context: `${topTeam.wins}-${topTeam.losses} record | Allowing ${topTeam.oppPpg} PPG`,
    timestamp: new Date().toISOString(),
    actions: [
      { label: 'Team Stats', href: `/nfl/teams/${topTeam.abbreviation}` },
    ],
    meta: { teamAbbr: topTeam.abbreviation },
    priority: 4,
  })

  // Best defense (least points allowed)
  const bestDef = [...teams].sort((a, b) => Number(a.oppPpg) - Number(b.oppPpg))[0]
  if (bestDef && bestDef.abbreviation !== topTeam.abbreviation) {
    cards.push({
      id: `team-trend-best-defense-${season}`,
      type: 'team_trend',
      category: 'Team Trend',
      headline: `${bestDef.name} lead NFL in scoring defense (${bestDef.oppPpg} PPG allowed)`,
      context: `${bestDef.wins}-${bestDef.losses} record | Scoring ${bestDef.ppg} PPG on offense`,
      timestamp: new Date().toISOString(),
      actions: [
        { label: 'Team Stats', href: `/nfl/teams/${bestDef.abbreviation}` },
      ],
      meta: { teamAbbr: bestDef.abbreviation },
      priority: 4,
    })
  }

  return cards
}

// ─── Game Result Cards ─────────────────────────────────────────────────────
// Close games and upsets from recent weeks
async function gameResultCards(season) {
  const games = await prisma.$queryRaw`
    SELECT g.id, g.week, g.season, g."home_score" as "homeScore", g."away_score" as "awayScore",
           g."spread_line" as "spreadLine", g.kickoff,
           ht.abbreviation as "homeAbbr", ht.name as "homeName",
           at.abbreviation as "awayAbbr", at.name as "awayName"
    FROM nfl_games g
    JOIN nfl_teams ht ON ht.id = g."home_team_id"
    JOIN nfl_teams at ON at.id = g."away_team_id"
    WHERE g.season = ${season} AND g.status = 'FINAL' AND g."game_type" = 'REG'
    ORDER BY g.week DESC, g.kickoff DESC
    LIMIT 64
  `

  const cards = []

  for (const g of games) {
    if (g.homeScore == null || g.awayScore == null) continue
    const margin = Math.abs(g.homeScore - g.awayScore)
    const homeWon = g.homeScore > g.awayScore
    const winner = homeWon ? g.homeName : g.awayName
    const winnerAbbr = homeWon ? g.homeAbbr : g.awayAbbr
    const loser = homeWon ? g.awayName : g.homeName
    const winScore = homeWon ? g.homeScore : g.awayScore
    const loseScore = homeWon ? g.awayScore : g.homeScore

    // Upset detection (underdog won by spread)
    const isUpset = g.spreadLine != null && (
      (homeWon && g.spreadLine > 3) || (!homeWon && g.spreadLine < -3)
    )

    if (isUpset) {
      const spreadCover = Math.abs(g.spreadLine) + margin
      cards.push({
        id: `game-upset-${g.id}`,
        type: 'game_result',
        category: 'Game Result',
        headline: `${winner} upset ${loser} ${winScore}-${loseScore}`,
        context: `Week ${g.week} | Covered by ${spreadCover.toFixed(1)} points`,
        timestamp: g.kickoff?.toISOString?.() || new Date().toISOString(),
        actions: [
          { label: `${winnerAbbr} Stats`, href: `/nfl/teams/${winnerAbbr}` },
        ],
        meta: { gameId: g.id, week: g.week, margin },
        priority: 1,
      })
    } else if (margin <= 3) {
      cards.push({
        id: `game-close-${g.id}`,
        type: 'game_result',
        category: 'Game Result',
        headline: `${winner} edge ${loser} ${winScore}-${loseScore}`,
        context: `Week ${g.week} | ${margin === 0 ? 'Tied in regulation' : `Decided by ${margin} point${margin > 1 ? 's' : ''}`}`,
        timestamp: g.kickoff?.toISOString?.() || new Date().toISOString(),
        actions: [
          { label: `${winnerAbbr} Stats`, href: `/nfl/teams/${winnerAbbr}` },
        ],
        meta: { gameId: g.id, week: g.week, margin },
        priority: 2,
      })
    }

    if (cards.length >= 6) break
  }

  return cards
}

// ─── Tournament Cards (Golf) ───────────────────────────────────────────────
async function tournamentCards() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: { in: ['IN_PROGRESS', 'COMPLETED', 'UPCOMING'] } },
    orderBy: { startDate: 'desc' },
    take: 5,
    include: {
      course: { select: { name: true } },
      performances: {
        where: { status: 'ACTIVE' },
        orderBy: { totalToPar: 'asc' },
        take: 3,
        include: { player: { select: { id: true, name: true } } },
      },
    },
  })

  return tournaments.map(t => {
    const topPerfs = t.performances || []
    let headline = ''
    let context = ''

    if (t.status === 'IN_PROGRESS') {
      const leader = topPerfs[0]
      headline = leader
        ? `${t.name} in progress — ${leader.player.name} leads at ${leader.totalToPar > 0 ? '+' : ''}${leader.totalToPar || 'E'}`
        : `${t.name} is in progress`
      context = topPerfs.length > 1
        ? `Round ${t.currentRound} | ${topPerfs.slice(1).map(p => `${p.player.name} (${p.totalToPar > 0 ? '+' : ''}${p.totalToPar || 'E'})`).join(', ')}`
        : `Round ${t.currentRound} at ${t.course?.name || t.location || ''}`
    } else if (t.status === 'COMPLETED') {
      const winner = topPerfs[0]
      headline = winner
        ? `${winner.player.name} wins ${t.name} at ${winner.totalToPar > 0 ? '+' : ''}${winner.totalToPar || 'E'}`
        : `${t.name} completed`
      context = t.course?.name || t.location || ''
    } else {
      headline = `${t.name} coming up`
      const start = new Date(t.startDate)
      context = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${t.course?.name || t.location || ''}`
    }

    return {
      id: `tournament-${t.id}`,
      type: 'tournament',
      category: 'Tournament',
      headline,
      context,
      timestamp: t.startDate?.toISOString?.() || new Date().toISOString(),
      actions: [
        { label: 'Tournament', href: `/tournaments/${t.id}` },
        ...(topPerfs[0] ? [{ label: 'Leader Profile', href: `/players/${topPerfs[0].player.id}` }] : []),
      ],
      meta: { tournamentId: t.id, status: t.status },
      priority: t.status === 'IN_PROGRESS' ? 1 : t.status === 'COMPLETED' ? 3 : 5,
    }
  })
}

// ─── Main Generator ────────────────────────────────────────────────────────
async function generateFeed(sport, options = {}) {
  const { limit = 8, offset = 0, types } = options
  const season = options.season || 2024 // current synced season

  let cards = []

  if (sport === 'nfl') {
    const results = await Promise.all([
      statLeaderCards(season).catch(() => []),
      bigPerformanceCards(season).catch(() => []),
      teamTrendCards(season).catch(() => []),
      gameResultCards(season).catch(() => []),
    ])
    cards = results.flat()
  } else if (sport === 'golf') {
    cards = await tournamentCards().catch(() => [])
  } else {
    // Both sports
    const results = await Promise.all([
      statLeaderCards(season).catch(() => []),
      bigPerformanceCards(season).catch(() => []),
      teamTrendCards(season).catch(() => []),
      gameResultCards(season).catch(() => []),
      tournamentCards().catch(() => []),
    ])
    cards = results.flat()
  }

  // Filter by types if specified
  if (types) {
    const typeSet = new Set(types.split(','))
    cards = cards.filter(c => typeSet.has(c.type))
  }

  // Sort by priority (lower = higher priority) then recency
  cards.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return new Date(b.timestamp) - new Date(a.timestamp)
  })

  // Deduplicate by player (keep first/best card per player)
  const seenPlayers = new Set()
  cards = cards.filter(c => {
    const pid = c.meta?.playerId
    if (!pid) return true
    if (seenPlayers.has(pid)) return false
    seenPlayers.add(pid)
    return true
  })

  const total = cards.length
  cards = cards.slice(offset, offset + limit)

  return { cards, total, sport }
}

module.exports = { generateFeed }
