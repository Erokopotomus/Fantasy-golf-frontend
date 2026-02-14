/**
 * NFL Routes — NFL-specific API endpoints
 *
 * GET  /api/nfl/players                             — Browse NFL players (filterable by position, team)
 * GET  /api/nfl/players/:id                         — NFL player detail with game log
 * GET  /api/nfl/schedule                            — NFL schedule by season/week
 * GET  /api/nfl/teams                               — All 32 NFL teams
 * GET  /api/nfl/teams/:abbr                         — Team detail with roster + schedule
 * GET  /api/nfl/scoring-systems                     — Available NFL scoring presets
 * GET  /api/nfl/leagues/:leagueId/weekly-scores/:wk — Team scores for a specific NFL week
 * POST /api/nfl/leagues/:leagueId/score-week        — Commissioner: manually score a week
 */

const express = require('express')
const { optionalAuth, authenticate } = require('../middleware/auth')
const { calculateFantasyPoints, resolveRules, getScoringSchema, PRESETS } = require('../services/nflScoringService')
const { scoreNflWeek, computeNflWeeklyResults } = require('../services/nflFantasyTracker')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// ─── NFL Players ────────────────────────────────────────────────────────────

// GET /api/nfl/players — Browse NFL players
router.get('/players', optionalAuth, async (req, res, next) => {
  try {
    const {
      search,
      position,
      team,
      season,
      limit = 50,
      offset = 0,
      sortBy = 'name',
      sortOrder = 'asc',
      scoring = 'half_ppr',
      available,
      leagueId,
    } = req.query

    // Determine which season to pull stats for
    const targetSeason = season ? parseInt(season) : null

    const where = {
      nflPosition: { not: null }, // Only NFL players
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }
    if (position) {
      where.nflPosition = position.toUpperCase()
    }
    if (team) {
      where.nflTeamAbbr = team.toUpperCase()
    }

    // Filter out rostered players in a specific league
    if (available === 'true' && leagueId) {
      const rostered = await prisma.rosterEntry.findMany({
        where: { team: { leagueId } },
        select: { playerId: true },
      })
      where.id = { notIn: rostered.map(r => r.playerId) }
    }

    // Stat sort fields require post-query sort — fetch all, sort, then paginate
    const statSortFields = ['fantasyPts', 'passYards', 'passTds', 'interceptions',
      'rushYards', 'rushTds', 'receptions', 'recYards', 'recTds', 'targets', 'fumblesLost',
      'fgMade', 'fgAttempts', 'xpMade', 'xpAttempts',
      'sacks', 'defInterceptions', 'fumblesRecovered', 'fumblesForced', 'defTds']
    const isStatSort = statSortFields.includes(sortBy)

    // For DB-level sorts, apply orderBy + pagination
    // For stat sorts, fetch all then paginate after computing stats
    let orderBy = { name: 'asc' }
    if (!isStatSort) {
      if (sortBy === 'name') orderBy = { name: sortOrder }
      else if (sortBy === 'nflPosition') orderBy = { nflPosition: sortOrder }
      else if (sortBy === 'nflTeamAbbr') orderBy = { nflTeamAbbr: sortOrder }
    }

    const gameStatsSelect = {
      where: targetSeason ? { game: { season: targetSeason } } : undefined,
      select: {
        passYards: true, passTds: true, interceptions: true,
        rushYards: true, rushTds: true, receptions: true,
        recYards: true, recTds: true, targets: true, fumblesLost: true,
        fgMade: true, fgAttempts: true, xpMade: true, xpAttempts: true,
        sacks: true, defInterceptions: true, fumblesRecovered: true,
        fumblesForced: true, defTds: true,
        fantasyPtsStd: true, fantasyPtsPpr: true, fantasyPtsHalf: true,
      },
    }

    const playerSelect = {
      id: true, name: true, firstName: true, lastName: true, gsisId: true,
      nflPosition: true, nflTeamAbbr: true, nflNumber: true,
      headshotUrl: true, isActive: true, college: true,
      nflPlayerGames: gameStatsSelect,
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy,
        ...(isStatSort ? {} : { take: parseInt(limit), skip: parseInt(offset) }),
        select: playerSelect,
      }),
      prisma.player.count({ where }),
    ])

    // If leagueId provided, load league-specific scoring rules
    let leagueRules = null
    if (leagueId) {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: { scoringSystem: true },
      })
      if (league?.scoringSystem) {
        leagueRules = resolveRules(league.scoringSystem)
      }
    }

    // Compute season totals and per-game averages
    const playersWithStats = players.map(p => {
      const games = p.nflPlayerGames || []
      const gamesPlayed = games.length

      // Sum up season stats
      const seasonStats = {
        gamesPlayed,
        passYards: games.reduce((s, g) => s + (g.passYards || 0), 0),
        passTds: games.reduce((s, g) => s + (g.passTds || 0), 0),
        interceptions: games.reduce((s, g) => s + (g.interceptions || 0), 0),
        rushYards: games.reduce((s, g) => s + (g.rushYards || 0), 0),
        rushTds: games.reduce((s, g) => s + (g.rushTds || 0), 0),
        receptions: games.reduce((s, g) => s + (g.receptions || 0), 0),
        recYards: games.reduce((s, g) => s + (g.recYards || 0), 0),
        recTds: games.reduce((s, g) => s + (g.recTds || 0), 0),
        targets: games.reduce((s, g) => s + (g.targets || 0), 0),
        fumblesLost: games.reduce((s, g) => s + (g.fumblesLost || 0), 0),
        // Kicking
        fgMade: games.reduce((s, g) => s + (g.fgMade || 0), 0),
        fgAttempts: games.reduce((s, g) => s + (g.fgAttempts || 0), 0),
        xpMade: games.reduce((s, g) => s + (g.xpMade || 0), 0),
        xpAttempts: games.reduce((s, g) => s + (g.xpAttempts || 0), 0),
        // DST
        sacks: games.reduce((s, g) => s + (g.sacks || 0), 0),
        defInterceptions: games.reduce((s, g) => s + (g.defInterceptions || 0), 0),
        fumblesRecovered: games.reduce((s, g) => s + (g.fumblesRecovered || 0), 0),
        fumblesForced: games.reduce((s, g) => s + (g.fumblesForced || 0), 0),
        defTds: games.reduce((s, g) => s + (g.defTds || 0), 0),
      }

      // Calculate fantasy points per game using league-specific rules or preset
      let fantasyPts = 0
      if (leagueRules) {
        // League-specific scoring: calculate each game with custom rules, sum up
        fantasyPts = games.reduce((s, g) => s + calculateFantasyPoints(g, leagueRules).total, 0)
      } else if (scoring === 'ppr') {
        fantasyPts = games.reduce((s, g) => s + (g.fantasyPtsPpr || 0), 0)
      } else if (scoring === 'half_ppr') {
        fantasyPts = games.reduce((s, g) => s + (g.fantasyPtsHalf || 0), 0)
      } else {
        fantasyPts = games.reduce((s, g) => s + (g.fantasyPtsStd || 0), 0)
      }

      const { nflPlayerGames, ...rest } = p
      return {
        ...rest,
        season: seasonStats,
        fantasyPts: Math.round(fantasyPts * 100) / 100,
        fantasyPtsPerGame: gamesPlayed > 0
          ? Math.round((fantasyPts / gamesPlayed) * 100) / 100
          : 0,
      }
    })

    // Post-query sort + paginate for stat sort fields
    if (isStatSort) {
      playersWithStats.sort((a, b) => {
        const aVal = sortBy === 'fantasyPts' ? (a.fantasyPts || 0) : (a.season?.[sortBy] || 0)
        const bVal = sortBy === 'fantasyPts' ? (b.fantasyPts || 0) : (b.season?.[sortBy] || 0)
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
      })
    }

    // Apply pagination (for stat sorts it's post-sort; for DB sorts it was already applied)
    const finalPlayers = isStatSort
      ? playersWithStats.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
      : playersWithStats

    res.json({
      players: finalPlayers,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset), hasMore: parseInt(offset) + finalPlayers.length < total },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfl/players/:id — NFL player detail with game log
router.get('/players/:id', optionalAuth, async (req, res, next) => {
  try {
    const { season } = req.query
    const targetSeason = season ? parseInt(season) : null

    const player = await prisma.player.findUnique({
      where: { id: req.params.id },
      include: {
        nflPlayerGames: {
          where: targetSeason ? { game: { season: targetSeason } } : undefined,
          include: {
            game: {
              include: {
                homeTeam: { select: { abbreviation: true, name: true } },
                awayTeam: { select: { abbreviation: true, name: true } },
              },
            },
          },
          orderBy: { game: { week: 'asc' } },
        },
      },
    })

    if (!player || !player.nflPosition) {
      return res.status(404).json({ error: { message: 'NFL player not found' } })
    }

    // Get available seasons for this player
    const seasonRows = await prisma.nflPlayerGame.findMany({
      where: { playerId: player.id },
      select: { game: { select: { season: true } } },
      distinct: ['gameId'],
    })
    const availableSeasons = [...new Set(seasonRows.map(r => r.game.season))]
      .sort((a, b) => b - a)

    // Build game log
    const gameLog = player.nflPlayerGames.map(pg => {
      const game = pg.game
      const isHome = pg.teamAbbr === game.homeTeam?.abbreviation
      const opponent = isHome ? game.awayTeam : game.homeTeam

      return {
        week: game.week,
        season: game.season,
        gameId: game.id,
        opponent: opponent?.abbreviation || '???',
        isHome,
        result: game.status === 'FINAL'
          ? `${game.homeScore}-${game.awayScore}`
          : game.status,
        stats: {
          passAttempts: pg.passAttempts,
          passCompletions: pg.passCompletions,
          passYards: pg.passYards,
          passTds: pg.passTds,
          interceptions: pg.interceptions,
          rushAttempts: pg.rushAttempts,
          rushYards: pg.rushYards,
          rushTds: pg.rushTds,
          targets: pg.targets,
          receptions: pg.receptions,
          recYards: pg.recYards,
          recTds: pg.recTds,
          fumblesLost: pg.fumblesLost,
          fgMade: pg.fgMade,
          fgAttempts: pg.fgAttempts,
          xpMade: pg.xpMade,
          sacks: pg.sacks,
          defInterceptions: pg.defInterceptions,
          fumblesRecovered: pg.fumblesRecovered,
          fumblesForced: pg.fumblesForced,
          defTds: pg.defTds,
        },
        fantasyPts: {
          standard: pg.fantasyPtsStd,
          ppr: pg.fantasyPtsPpr,
          half_ppr: pg.fantasyPtsHalf,
        },
      }
    })

    // Season totals
    const games = player.nflPlayerGames
    const seasonTotals = {
      gamesPlayed: games.length,
      passYards: games.reduce((s, g) => s + (g.passYards || 0), 0),
      passTds: games.reduce((s, g) => s + (g.passTds || 0), 0),
      interceptions: games.reduce((s, g) => s + (g.interceptions || 0), 0),
      rushYards: games.reduce((s, g) => s + (g.rushYards || 0), 0),
      rushTds: games.reduce((s, g) => s + (g.rushTds || 0), 0),
      receptions: games.reduce((s, g) => s + (g.receptions || 0), 0),
      recYards: games.reduce((s, g) => s + (g.recYards || 0), 0),
      recTds: games.reduce((s, g) => s + (g.recTds || 0), 0),
      fumblesLost: games.reduce((s, g) => s + (g.fumblesLost || 0), 0),
      fgMade: games.reduce((s, g) => s + (g.fgMade || 0), 0),
      fgAttempts: games.reduce((s, g) => s + (g.fgAttempts || 0), 0),
      xpMade: games.reduce((s, g) => s + (g.xpMade || 0), 0),
      xpAttempts: games.reduce((s, g) => s + (g.xpAttempts || 0), 0),
      // DST
      sacks: games.reduce((s, g) => s + (g.sacks || 0), 0),
      defInterceptions: games.reduce((s, g) => s + (g.defInterceptions || 0), 0),
      fumblesRecovered: games.reduce((s, g) => s + (g.fumblesRecovered || 0), 0),
      fumblesForced: games.reduce((s, g) => s + (g.fumblesForced || 0), 0),
      defTds: games.reduce((s, g) => s + (g.defTds || 0), 0),
      fantasyPtsStd: Math.round(games.reduce((s, g) => s + (g.fantasyPtsStd || 0), 0) * 100) / 100,
      fantasyPtsPpr: Math.round(games.reduce((s, g) => s + (g.fantasyPtsPpr || 0), 0) * 100) / 100,
      fantasyPtsHalf: Math.round(games.reduce((s, g) => s + (g.fantasyPtsHalf || 0), 0) * 100) / 100,
    }

    const { nflPlayerGames, ...playerData } = player

    res.json({
      player: playerData,
      gameLog,
      seasonTotals,
      availableSeasons,
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfl/players/:id/profile — Full career profile (all seasons, advanced metrics)
router.get('/players/:id/profile', optionalAuth, async (req, res, next) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.params.id },
      include: {
        nflPlayerGames: {
          include: {
            game: {
              include: {
                homeTeam: { select: { abbreviation: true, name: true } },
                awayTeam: { select: { abbreviation: true, name: true } },
              },
            },
          },
          orderBy: { game: { kickoff: 'asc' } },
        },
      },
    })

    if (!player || !player.nflPosition) {
      return res.status(404).json({ error: { message: 'NFL player not found' } })
    }

    // Group games by season
    const gamesBySeason = {}
    for (const pg of player.nflPlayerGames) {
      const season = pg.game.season
      if (!gamesBySeason[season]) gamesBySeason[season] = []
      gamesBySeason[season].push(pg)
    }

    const seasons = Object.keys(gamesBySeason)
      .map(Number)
      .sort((a, b) => b - a)

    // Build per-season summaries
    const seasonSummaries = seasons.map(season => {
      const games = gamesBySeason[season]
      const gp = games.length

      // Basic totals
      const totals = {
        gamesPlayed: gp,
        passAttempts: games.reduce((s, g) => s + (g.passAttempts || 0), 0),
        passCompletions: games.reduce((s, g) => s + (g.passCompletions || 0), 0),
        passYards: games.reduce((s, g) => s + (g.passYards || 0), 0),
        passTds: games.reduce((s, g) => s + (g.passTds || 0), 0),
        interceptions: games.reduce((s, g) => s + (g.interceptions || 0), 0),
        sacked: games.reduce((s, g) => s + (g.sacked || 0), 0),
        rushAttempts: games.reduce((s, g) => s + (g.rushAttempts || 0), 0),
        rushYards: games.reduce((s, g) => s + (g.rushYards || 0), 0),
        rushTds: games.reduce((s, g) => s + (g.rushTds || 0), 0),
        targets: games.reduce((s, g) => s + (g.targets || 0), 0),
        receptions: games.reduce((s, g) => s + (g.receptions || 0), 0),
        recYards: games.reduce((s, g) => s + (g.recYards || 0), 0),
        recTds: games.reduce((s, g) => s + (g.recTds || 0), 0),
        fumbles: games.reduce((s, g) => s + (g.fumbles || 0), 0),
        fumblesLost: games.reduce((s, g) => s + (g.fumblesLost || 0), 0),
        fgMade: games.reduce((s, g) => s + (g.fgMade || 0), 0),
        fgAttempts: games.reduce((s, g) => s + (g.fgAttempts || 0), 0),
        xpMade: games.reduce((s, g) => s + (g.xpMade || 0), 0),
        xpAttempts: games.reduce((s, g) => s + (g.xpAttempts || 0), 0),
        sacks: games.reduce((s, g) => s + (g.sacks || 0), 0),
        defInterceptions: games.reduce((s, g) => s + (g.defInterceptions || 0), 0),
        fumblesRecovered: games.reduce((s, g) => s + (g.fumblesRecovered || 0), 0),
        fumblesForced: games.reduce((s, g) => s + (g.fumblesForced || 0), 0),
        defTds: games.reduce((s, g) => s + (g.defTds || 0), 0),
      }

      // Fantasy points by format
      const fantasyPts = {
        standard: Math.round(games.reduce((s, g) => s + (g.fantasyPtsStd || 0), 0) * 100) / 100,
        ppr: Math.round(games.reduce((s, g) => s + (g.fantasyPtsPpr || 0), 0) * 100) / 100,
        half_ppr: Math.round(games.reduce((s, g) => s + (g.fantasyPtsHalf || 0), 0) * 100) / 100,
      }

      // Per-game averages for fantasy
      const fantasyPtsPerGame = {
        standard: gp > 0 ? Math.round((fantasyPts.standard / gp) * 100) / 100 : 0,
        ppr: gp > 0 ? Math.round((fantasyPts.ppr / gp) * 100) / 100 : 0,
        half_ppr: gp > 0 ? Math.round((fantasyPts.half_ppr / gp) * 100) / 100 : 0,
      }

      // Advanced metrics (averages from games that have them)
      const gamesWithEpa = games.filter(g => g.epa != null)
      const gamesWithCpoe = games.filter(g => g.cpoe != null)
      const gamesWithSuccessRate = games.filter(g => g.successRate != null)
      const gamesWithTargetShare = games.filter(g => g.targetShare != null)
      const gamesWithSnapPct = games.filter(g => g.snapPct != null)
      const gamesWithRushShare = games.filter(g => g.rushShare != null)

      const advanced = {
        epaTotal: gamesWithEpa.length > 0
          ? Math.round(gamesWithEpa.reduce((s, g) => s + g.epa, 0) * 100) / 100
          : null,
        epaPerGame: gamesWithEpa.length > 0
          ? Math.round((gamesWithEpa.reduce((s, g) => s + g.epa, 0) / gamesWithEpa.length) * 100) / 100
          : null,
        cpoe: gamesWithCpoe.length > 0
          ? Math.round((gamesWithCpoe.reduce((s, g) => s + g.cpoe, 0) / gamesWithCpoe.length) * 100) / 100
          : null,
        successRate: gamesWithSuccessRate.length > 0
          ? Math.round((gamesWithSuccessRate.reduce((s, g) => s + g.successRate, 0) / gamesWithSuccessRate.length) * 1000) / 10
          : null,
        targetShare: gamesWithTargetShare.length > 0
          ? Math.round((gamesWithTargetShare.reduce((s, g) => s + g.targetShare, 0) / gamesWithTargetShare.length) * 1000) / 10
          : null,
        snapPct: gamesWithSnapPct.length > 0
          ? Math.round((gamesWithSnapPct.reduce((s, g) => s + g.snapPct, 0) / gamesWithSnapPct.length) * 10) / 10
          : null,
        rushShare: gamesWithRushShare.length > 0
          ? Math.round((gamesWithRushShare.reduce((s, g) => s + g.rushShare, 0) / gamesWithRushShare.length) * 1000) / 10
          : null,
      }

      // Team played for that season (most common)
      const teamCounts = {}
      for (const g of games) {
        teamCounts[g.teamAbbr] = (teamCounts[g.teamAbbr] || 0) + 1
      }
      const teamAbbr = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

      return { season, teamAbbr, totals, fantasyPts, fantasyPtsPerGame, advanced }
    })

    // Build game log for all seasons
    const gameLog = player.nflPlayerGames.map(pg => {
      const game = pg.game
      const isHome = pg.teamAbbr === game.homeTeam?.abbreviation
      const opponent = isHome ? game.awayTeam : game.homeTeam

      return {
        week: game.week,
        season: game.season,
        gameId: game.id,
        opponent: opponent?.abbreviation || '???',
        isHome,
        result: game.status === 'FINAL'
          ? `${game.homeScore}-${game.awayScore}`
          : game.status,
        stats: {
          passAttempts: pg.passAttempts, passCompletions: pg.passCompletions,
          passYards: pg.passYards, passTds: pg.passTds, interceptions: pg.interceptions,
          rushAttempts: pg.rushAttempts, rushYards: pg.rushYards, rushTds: pg.rushTds,
          targets: pg.targets, receptions: pg.receptions, recYards: pg.recYards, recTds: pg.recTds,
          fumblesLost: pg.fumblesLost,
          fgMade: pg.fgMade, fgAttempts: pg.fgAttempts, xpMade: pg.xpMade,
          sacks: pg.sacks, defInterceptions: pg.defInterceptions,
          fumblesRecovered: pg.fumblesRecovered, fumblesForced: pg.fumblesForced, defTds: pg.defTds,
          // Advanced per-game
          epa: pg.epa != null ? Math.round(pg.epa * 100) / 100 : null,
          cpoe: pg.cpoe != null ? Math.round(pg.cpoe * 100) / 100 : null,
          successRate: pg.successRate != null ? Math.round(pg.successRate * 1000) / 10 : null,
          targetShare: pg.targetShare != null ? Math.round(pg.targetShare * 1000) / 10 : null,
          snapPct: pg.snapPct != null ? Math.round(pg.snapPct * 10) / 10 : null,
        },
        fantasyPts: {
          standard: pg.fantasyPtsStd,
          ppr: pg.fantasyPtsPpr,
          half_ppr: pg.fantasyPtsHalf,
        },
      }
    })

    // Career totals
    const allGames = player.nflPlayerGames
    const careerTotals = {
      gamesPlayed: allGames.length,
      seasons: seasons.length,
      passYards: allGames.reduce((s, g) => s + (g.passYards || 0), 0),
      passTds: allGames.reduce((s, g) => s + (g.passTds || 0), 0),
      interceptions: allGames.reduce((s, g) => s + (g.interceptions || 0), 0),
      rushYards: allGames.reduce((s, g) => s + (g.rushYards || 0), 0),
      rushTds: allGames.reduce((s, g) => s + (g.rushTds || 0), 0),
      receptions: allGames.reduce((s, g) => s + (g.receptions || 0), 0),
      recYards: allGames.reduce((s, g) => s + (g.recYards || 0), 0),
      recTds: allGames.reduce((s, g) => s + (g.recTds || 0), 0),
      totalTds: allGames.reduce((s, g) => s + (g.passTds || 0) + (g.rushTds || 0) + (g.recTds || 0), 0),
      fantasyPts: {
        standard: Math.round(allGames.reduce((s, g) => s + (g.fantasyPtsStd || 0), 0) * 100) / 100,
        ppr: Math.round(allGames.reduce((s, g) => s + (g.fantasyPtsPpr || 0), 0) * 100) / 100,
        half_ppr: Math.round(allGames.reduce((s, g) => s + (g.fantasyPtsHalf || 0), 0) * 100) / 100,
      },
    }

    const { nflPlayerGames, ...playerData } = player

    res.json({
      player: playerData,
      seasonSummaries,
      gameLog,
      careerTotals,
      availableSeasons: seasons,
    })
  } catch (error) {
    next(error)
  }
})

// ─── NFL Teams ──────────────────────────────────────────────────────────────

// GET /api/nfl/teams — All 32 NFL teams
router.get('/teams', async (req, res, next) => {
  try {
    const teams = await prisma.nflTeam.findMany({
      orderBy: [{ conference: 'asc' }, { division: 'asc' }, { name: 'asc' }],
    })

    // Group by conference/division
    const grouped = {}
    for (const team of teams) {
      const key = `${team.conference} ${team.division}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(team)
    }

    res.json({ teams, grouped })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfl/teams/:abbr — Team detail with roster + recent games
router.get('/teams/:abbr', async (req, res, next) => {
  try {
    const abbr = req.params.abbr.toUpperCase()
    const team = await prisma.nflTeam.findUnique({
      where: { abbreviation: abbr },
      include: {
        homeGames: {
          include: {
            awayTeam: { select: { abbreviation: true, name: true } },
          },
          orderBy: { week: 'asc' },
          take: 20,
        },
        awayGames: {
          include: {
            homeTeam: { select: { abbreviation: true, name: true } },
          },
          orderBy: { week: 'asc' },
          take: 20,
        },
      },
    })

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } })
    }

    // Get players on this team
    const roster = await prisma.player.findMany({
      where: { nflTeamAbbr: abbr, nflPosition: { not: null } },
      orderBy: [{ nflPosition: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        nflPosition: true,
        nflNumber: true,
        headshotUrl: true,
        isActive: true,
      },
    })

    // Merge and sort schedule
    const schedule = [
      ...team.homeGames.map(g => ({
        ...g,
        opponent: g.awayTeam?.abbreviation,
        opponentName: g.awayTeam?.name,
        isHome: true,
      })),
      ...team.awayGames.map(g => ({
        ...g,
        opponent: g.homeTeam?.abbreviation,
        opponentName: g.homeTeam?.name,
        isHome: false,
      })),
    ].sort((a, b) => a.week - b.week)

    const { homeGames, awayGames, ...teamData } = team

    res.json({ team: teamData, roster, schedule })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfl/teams/:abbr/stats — Team stats aggregated from player + game data
router.get('/teams/:abbr/stats', async (req, res, next) => {
  try {
    const abbr = req.params.abbr.toUpperCase()
    const season = parseInt(req.query.season) || 2024

    const team = await prisma.nflTeam.findUnique({ where: { abbreviation: abbr } })
    if (!team) return res.status(404).json({ error: { message: 'Team not found' } })

    // Get all games for this team in the season
    const games = await prisma.nflGame.findMany({
      where: {
        season,
        status: 'FINAL',
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      orderBy: { week: 'asc' },
      include: {
        homeTeam: { select: { abbreviation: true } },
        awayTeam: { select: { abbreviation: true } },
      },
    })

    // Compute W-L, points for/against from games
    let wins = 0, losses = 0, ties = 0, pointsFor = 0, pointsAgainst = 0
    for (const g of games) {
      const isHome = g.homeTeamId === team.id
      const pf = isHome ? g.homeScore : g.awayScore
      const pa = isHome ? g.awayScore : g.homeScore
      if (pf == null || pa == null) continue
      pointsFor += pf
      pointsAgainst += pa
      if (pf > pa) wins++
      else if (pf < pa) losses++
      else ties++
    }
    const gamesPlayed = wins + losses + ties

    // Get all player game stats for this team in the season
    const playerGames = await prisma.nflPlayerGame.findMany({
      where: { teamAbbr: abbr, game: { season, status: 'FINAL' } },
      include: { player: { select: { nflPosition: true } } },
    })

    // Aggregate offensive stats
    let passYards = 0, passTds = 0, passAttempts = 0, passCompletions = 0, interceptions = 0
    let rushYards = 0, rushTds = 0, rushAttempts = 0
    let recYards = 0, recTds = 0, receptions = 0, targets = 0
    let fumbles = 0, fumblesLost = 0
    let totalEpa = 0, epaCount = 0

    // Aggregate defensive stats
    let defSacks = 0, defInts = 0, defTds = 0, defFumblesForced = 0, defFumblesRecovered = 0
    let defPassesDefended = 0, tacklesSolo = 0, tacklesAssist = 0

    for (const pg of playerGames) {
      // Offense
      passYards += pg.passYards || 0
      passTds += pg.passTds || 0
      passAttempts += pg.passAttempts || 0
      passCompletions += pg.passCompletions || 0
      interceptions += pg.interceptions || 0
      rushYards += pg.rushYards || 0
      rushTds += pg.rushTds || 0
      rushAttempts += pg.rushAttempts || 0
      recYards += pg.recYards || 0
      recTds += pg.recTds || 0
      receptions += pg.receptions || 0
      targets += pg.targets || 0
      fumbles += pg.fumbles || 0
      fumblesLost += pg.fumblesLost || 0
      if (pg.epa != null) { totalEpa += pg.epa; epaCount++ }

      // Defense
      defSacks += pg.sacks || 0
      defInts += pg.defInterceptions || 0
      defTds += pg.defTds || 0
      defFumblesForced += pg.fumblesForced || 0
      defFumblesRecovered += pg.fumblesRecovered || 0
      defPassesDefended += pg.passesDefended || 0
      tacklesSolo += pg.tacklesSolo || 0
      tacklesAssist += pg.tacklesAssist || 0
    }

    const totalTds = passTds + rushTds + recTds
    const totalYards = passYards + rushYards
    const pg = gamesPlayed || 1 // avoid division by zero

    // Get top fantasy performers for this team
    const topPlayers = await prisma.$queryRaw`
      SELECT p.id, p.name, p."nfl_position" as position, p."headshot_url" as "headshotUrl",
             COUNT(pg.id)::int as games,
             ROUND(SUM(COALESCE(pg."fantasy_pts_half", 0))::numeric, 1) as "fantasyPts",
             ROUND((SUM(COALESCE(pg."fantasy_pts_half", 0)) / NULLIF(COUNT(pg.id), 0))::numeric, 1) as "ptsPerGame"
      FROM nfl_player_games pg
      JOIN players p ON p.id = pg."player_id"
      JOIN nfl_games g ON g.id = pg."game_id"
      WHERE pg."team_abbr" = ${abbr} AND g.season = ${season} AND g.status = 'FINAL'
      GROUP BY p.id, p.name, p."nfl_position", p."headshot_url"
      HAVING SUM(COALESCE(pg."fantasy_pts_half", 0)) > 0
      ORDER BY SUM(COALESCE(pg."fantasy_pts_half", 0)) DESC
      LIMIT 10
    `

    // Compute league-wide averages for ranking context (all 32 teams)
    const allTeams = await prisma.nflTeam.findMany({ select: { id: true, abbreviation: true } })
    const allTeamGames = await prisma.nflGame.findMany({
      where: { season, status: 'FINAL' },
      select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
    })

    // Build per-team points for/against for ranking
    const teamPF = {}, teamPA = {}, teamGP = {}
    for (const t of allTeams) { teamPF[t.id] = 0; teamPA[t.id] = 0; teamGP[t.id] = 0 }
    for (const g of allTeamGames) {
      if (g.homeScore == null || g.awayScore == null) continue
      teamPF[g.homeTeamId] += g.homeScore; teamPA[g.homeTeamId] += g.awayScore; teamGP[g.homeTeamId]++
      teamPF[g.awayTeamId] += g.awayScore; teamPA[g.awayTeamId] += g.homeScore; teamGP[g.awayTeamId]++
    }

    // Rank this team's PPG and PA/G
    const ppgList = allTeams.map(t => ({ id: t.id, ppg: teamGP[t.id] ? teamPF[t.id] / teamGP[t.id] : 0 })).sort((a, b) => b.ppg - a.ppg)
    const papgList = allTeams.map(t => ({ id: t.id, papg: teamGP[t.id] ? teamPA[t.id] / teamGP[t.id] : 0 })).sort((a, b) => a.papg - b.papg)
    const offRank = ppgList.findIndex(t => t.id === team.id) + 1
    const defRank = papgList.findIndex(t => t.id === team.id) + 1

    res.json({
      team: { abbreviation: abbr, name: team.name, city: team.city, conference: team.conference, division: team.division },
      season,
      record: { wins, losses, ties, gamesPlayed },
      offense: {
        pointsFor,
        ppg: +(pointsFor / pg).toFixed(1),
        rank: offRank,
        totalYards,
        ypg: +(totalYards / pg).toFixed(1),
        passing: { yards: passYards, tds: passTds, attempts: passAttempts, completions: passCompletions, interceptions, ypg: +(passYards / pg).toFixed(1) },
        rushing: { yards: rushYards, tds: rushTds, attempts: rushAttempts, ypg: +(rushYards / pg).toFixed(1) },
        receiving: { yards: recYards, tds: recTds, receptions, targets },
        totalTds,
        turnovers: interceptions + fumblesLost,
        epa: { total: +totalEpa.toFixed(1), perGame: +(totalEpa / pg).toFixed(2) },
      },
      defense: {
        pointsAgainst,
        papg: +(pointsAgainst / pg).toFixed(1),
        rank: defRank,
        sacks: defSacks,
        interceptions: defInts,
        tds: defTds,
        fumblesForced: defFumblesForced,
        fumblesRecovered: defFumblesRecovered,
        passesDefended: defPassesDefended,
        tackles: { solo: tacklesSolo, assist: tacklesAssist, total: tacklesSolo + tacklesAssist },
      },
      topPlayers,
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfl/leaderboards — Stat leaderboards with filters
router.get('/leaderboards', async (req, res, next) => {
  try {
    const {
      stat = 'fantasy_half',
      season = '2024',
      position,
      team,
      limit: rawLimit = '50',
      offset: rawOffset = '0',
    } = req.query

    const seasonInt = parseInt(season)
    const limitInt = Math.min(parseInt(rawLimit) || 50, 100)
    const offsetInt = parseInt(rawOffset) || 0

    // Map stat param to SQL aggregation
    const statMap = {
      // Fantasy
      fantasy_half: { expr: 'SUM(COALESCE(pg."fantasy_pts_half", 0))', label: 'Fantasy Pts (Half)' },
      fantasy_ppr: { expr: 'SUM(COALESCE(pg."fantasy_pts_ppr", 0))', label: 'Fantasy Pts (PPR)' },
      fantasy_std: { expr: 'SUM(COALESCE(pg."fantasy_pts_std", 0))', label: 'Fantasy Pts (Std)' },
      // Passing
      pass_yards: { expr: 'SUM(COALESCE(pg."pass_yards", 0))', label: 'Passing Yards' },
      pass_tds: { expr: 'SUM(COALESCE(pg."pass_tds", 0))', label: 'Passing TDs' },
      completions: { expr: 'SUM(COALESCE(pg."pass_completions", 0))', label: 'Completions' },
      comp_pct: { expr: 'CASE WHEN SUM(COALESCE(pg."pass_attempts",0)) > 0 THEN ROUND((SUM(COALESCE(pg."pass_completions",0))::numeric / SUM(pg."pass_attempts") * 100), 1) ELSE 0 END', label: 'Comp %' },
      interceptions: { expr: 'SUM(COALESCE(pg."interceptions", 0))', label: 'Interceptions', sortAsc: true },
      // Rushing
      rush_yards: { expr: 'SUM(COALESCE(pg."rush_yards", 0))', label: 'Rushing Yards' },
      rush_tds: { expr: 'SUM(COALESCE(pg."rush_tds", 0))', label: 'Rushing TDs' },
      rush_attempts: { expr: 'SUM(COALESCE(pg."rush_attempts", 0))', label: 'Rush Attempts' },
      // Receiving
      receptions: { expr: 'SUM(COALESCE(pg."receptions", 0))', label: 'Receptions' },
      rec_yards: { expr: 'SUM(COALESCE(pg."rec_yards", 0))', label: 'Receiving Yards' },
      rec_tds: { expr: 'SUM(COALESCE(pg."rec_tds", 0))', label: 'Receiving TDs' },
      targets: { expr: 'SUM(COALESCE(pg."targets", 0))', label: 'Targets' },
      // Advanced
      epa: { expr: 'ROUND(SUM(COALESCE(pg.epa, 0))::numeric, 1)', label: 'EPA' },
      target_share: { expr: 'ROUND(AVG(COALESCE(pg."target_share", 0))::numeric * 100, 1)', label: 'Target Share %' },
      snap_pct: { expr: 'ROUND(AVG(COALESCE(pg."snap_pct", 0))::numeric * 100, 1)', label: 'Snap %' },
      // Defense
      def_sacks: { expr: 'SUM(COALESCE(pg.sacks, 0))', label: 'Sacks' },
      def_ints: { expr: 'SUM(COALESCE(pg."def_interceptions", 0))', label: 'Interceptions' },
      def_tds: { expr: 'SUM(COALESCE(pg."def_tds", 0))', label: 'Defensive TDs' },
      tackles: { expr: 'SUM(COALESCE(pg."tackles_solo", 0)) + SUM(COALESCE(pg."tackles_assist", 0))', label: 'Total Tackles' },
    }

    const statDef = statMap[stat]
    if (!statDef) return res.status(400).json({ error: { message: `Unknown stat: ${stat}. Valid: ${Object.keys(statMap).join(', ')}` } })

    // Build WHERE clauses
    const conditions = [`g.season = ${seasonInt}`, `g.status = 'FINAL'`]
    if (position) conditions.push(`p."nfl_position" = '${position.toUpperCase()}'`)
    if (team) conditions.push(`pg."team_abbr" = '${team.toUpperCase()}'`)
    const whereClause = conditions.join(' AND ')

    const sortDir = statDef.sortAsc ? 'ASC' : 'DESC'

    // Count total matching players
    const countResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT p.id)::int as total
      FROM nfl_player_games pg
      JOIN players p ON p.id = pg."player_id"
      JOIN nfl_games g ON g.id = pg."game_id"
      WHERE ${whereClause}
    `)
    const total = countResult[0]?.total || 0

    // Get leaderboard
    const players = await prisma.$queryRawUnsafe(`
      SELECT p.id, p.name, p."nfl_position" as position, p."nfl_team_abbr" as "teamAbbr",
             p."headshot_url" as "headshotUrl",
             COUNT(pg.id)::int as games,
             ${statDef.expr} as "statValue",
             ROUND(SUM(COALESCE(pg."fantasy_pts_half", 0))::numeric, 1) as "fantasyPtsHalf",
             ROUND(SUM(COALESCE(pg."fantasy_pts_ppr", 0))::numeric, 1) as "fantasyPtsPpr",
             ROUND(SUM(COALESCE(pg."fantasy_pts_std", 0))::numeric, 1) as "fantasyPtsStd",
             SUM(COALESCE(pg."pass_yards", 0))::int as "passYards",
             SUM(COALESCE(pg."pass_tds", 0))::int as "passTds",
             SUM(COALESCE(pg."rush_yards", 0))::int as "rushYards",
             SUM(COALESCE(pg."rush_tds", 0))::int as "rushTds",
             SUM(COALESCE(pg."receptions", 0))::int as "receptions",
             SUM(COALESCE(pg."rec_yards", 0))::int as "recYards",
             SUM(COALESCE(pg."rec_tds", 0))::int as "recTds",
             SUM(COALESCE(pg."targets", 0))::int as "targets"
      FROM nfl_player_games pg
      JOIN players p ON p.id = pg."player_id"
      JOIN nfl_games g ON g.id = pg."game_id"
      WHERE ${whereClause}
      GROUP BY p.id, p.name, p."nfl_position", p."nfl_team_abbr", p."headshot_url"
      HAVING ${statDef.expr} > 0
      ORDER BY "statValue" ${sortDir}
      LIMIT ${limitInt} OFFSET ${offsetInt}
    `)

    // Add rank
    const ranked = players.map((p, i) => ({ ...p, rank: offsetInt + i + 1 }))

    res.json({
      stat,
      statLabel: statDef.label,
      season: seasonInt,
      filters: { position: position || null, team: team || null },
      total,
      limit: limitInt,
      offset: offsetInt,
      players: ranked,
    })
  } catch (error) {
    next(error)
  }
})

// ─── NFL Schedule ───────────────────────────────────────────────────────────

// GET /api/nfl/schedule — NFL schedule by season/week
router.get('/schedule', async (req, res, next) => {
  try {
    const { season = 2025, week } = req.query

    const where = { season: parseInt(season) }
    if (week) where.week = parseInt(week)

    const games = await prisma.nflGame.findMany({
      where,
      include: {
        homeTeam: { select: { abbreviation: true, name: true, primaryColor: true, secondaryColor: true } },
        awayTeam: { select: { abbreviation: true, name: true, primaryColor: true, secondaryColor: true } },
      },
      orderBy: [{ week: 'asc' }, { kickoff: 'asc' }],
    })

    // Group by week
    const byWeek = {}
    for (const game of games) {
      if (!byWeek[game.week]) byWeek[game.week] = []
      byWeek[game.week].push(game)
    }

    res.json({ games, byWeek, season: parseInt(season) })
  } catch (error) {
    next(error)
  }
})

// ─── NFL Available Seasons ──────────────────────────────────────────────────

// GET /api/nfl/seasons — Which seasons have game data
router.get('/seasons', async (req, res, next) => {
  try {
    const seasons = await prisma.nflGame.groupBy({
      by: ['season'],
      orderBy: { season: 'desc' },
    })
    res.json({ seasons: seasons.map(s => s.season) })
  } catch (error) {
    next(error)
  }
})

// ─── NFL Scoring Systems ────────────────────────────────────────────────────

// GET /api/nfl/scoring-systems — Available NFL scoring presets
router.get('/scoring-systems', async (req, res, next) => {
  try {
    const sport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
    if (!sport) return res.json({ scoringSystems: [] })

    const systems = await prisma.scoringSystem.findMany({
      where: { sportId: sport.id },
      orderBy: { name: 'asc' },
    })

    res.json({ scoringSystems: systems })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfl/scoring-schema — NFL scoring schema metadata for UI
router.get('/scoring-schema', async (req, res, next) => {
  try {
    const schema = getScoringSchema()
    res.json({ schema, presets: Object.keys(PRESETS) })
  } catch (error) {
    next(error)
  }
})

// ─── NFL League Available Players ────────────────────────────────────────

// GET /api/nfl/leagues/:leagueId/available-players — NFL players not rostered in league
router.get('/leagues/:leagueId/available-players', authenticate, async (req, res, next) => {
  try {
    const { leagueId } = req.params
    const { search, position, limit = 100, offset = 0 } = req.query

    // Verify league exists and user is a member
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { members: { select: { userId: true } }, scoringSystem: true },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })
    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember) return res.status(403).json({ error: { message: 'Not a member of this league' } })

    // Get rostered player IDs in this league
    const rostered = await prisma.rosterEntry.findMany({
      where: { team: { leagueId }, isActive: true },
      select: { playerId: true },
    })
    const rosteredIds = rostered.map(r => r.playerId)

    const where = {
      nflPosition: { not: null },
      id: { notIn: rosteredIds },
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }
    if (position && position !== 'All') {
      where.nflPosition = position.toUpperCase()
    }

    // Fetch players with their game stats for season totals
    const nflSeason = await prisma.season.findFirst({
      where: { sport: { slug: 'nfl' }, isCurrent: true },
    })
    const seasonYear = nflSeason?.year || 2024

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        include: {
          nflPlayerGames: {
            where: { game: { season: seasonYear } },
            select: {
              fantasyPtsHalf: true,
              fantasyPtsPpr: true,
              fantasyPtsStd: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.player.count({ where }),
    ])

    // Compute season fantasy points and sort by points desc
    const playersWithPts = players.map(p => {
      const games = p.nflPlayerGames || []
      const fantasyPts = games.reduce((s, g) => s + (g.fantasyPtsHalf || 0), 0)
      const { nflPlayerGames, ...rest } = p
      return {
        ...rest,
        fantasyPts: Math.round(fantasyPts * 100) / 100,
        fantasyPtsPerGame: games.length > 0
          ? Math.round((fantasyPts / games.length) * 100) / 100
          : 0,
        gamesPlayed: games.length,
      }
    })

    // Sort by fantasy points descending
    playersWithPts.sort((a, b) => b.fantasyPts - a.fantasyPts)

    res.json({
      players: playersWithPts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + playersWithPts.length < total,
      },
    })
  } catch (error) {
    next(error)
  }
})

// ─── NFL Fantasy League Scoring ──────────────────────────────────────────

// GET /api/nfl/leagues/:leagueId/weekly-scores/:weekNumber
// Returns team scores for a specific NFL week in a league
router.get('/leagues/:leagueId/weekly-scores/:weekNumber', authenticate, async (req, res, next) => {
  try {
    const { leagueId, weekNumber } = req.params

    // Verify league exists and user is a member
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        members: { select: { userId: true } },
        scoringSystem: true,
      },
    })
    if (!league) return res.status(404).json({ error: { message: 'League not found' } })

    const isMember = league.members.some(m => m.userId === req.user.id)
    if (!isMember) return res.status(403).json({ error: { message: 'Not a member of this league' } })

    // Find NFL season
    const nflSport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
    if (!nflSport) return res.status(404).json({ error: { message: 'NFL sport not found' } })

    const nflSeason = await prisma.season.findFirst({
      where: { sportId: nflSport.id, isCurrent: true },
    })
    if (!nflSeason) return res.status(404).json({ error: { message: 'No current NFL season' } })

    // Find FantasyWeek
    const fantasyWeek = await prisma.fantasyWeek.findUnique({
      where: {
        seasonId_weekNumber: {
          seasonId: nflSeason.id,
          weekNumber: parseInt(weekNumber),
        },
      },
    })
    if (!fantasyWeek) return res.status(404).json({ error: { message: `Week ${weekNumber} not found` } })

    // Find LeagueSeason
    const leagueSeason = await prisma.leagueSeason.findFirst({
      where: { leagueId, seasonId: nflSeason.id },
    })
    if (!leagueSeason) return res.status(404).json({ error: { message: 'League season not found' } })

    // Fetch WeeklyTeamResults
    const teamResults = await prisma.weeklyTeamResult.findMany({
      where: { leagueSeasonId: leagueSeason.id, fantasyWeekId: fantasyWeek.id },
      include: {
        team: { select: { id: true, name: true, userId: true } },
      },
      orderBy: { weekRank: 'asc' },
    })

    // Fetch Matchups
    const matchups = await prisma.matchup.findMany({
      where: { leagueId, fantasyWeekId: fantasyWeek.id },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    })

    res.json({
      week: {
        id: fantasyWeek.id,
        weekNumber: fantasyWeek.weekNumber,
        name: fantasyWeek.name,
        status: fantasyWeek.status,
        startDate: fantasyWeek.startDate,
        endDate: fantasyWeek.endDate,
      },
      teams: teamResults.map(tr => ({
        teamId: tr.team.id,
        teamName: tr.team.name,
        userId: tr.team.userId,
        totalPoints: tr.totalPoints,
        optimalPoints: tr.optimalPoints,
        pointsLeftOnBench: tr.pointsLeftOnBench,
        weekRank: tr.weekRank,
        result: tr.result,
        opponentPoints: tr.opponentPoints,
        playerScores: tr.playerScores,
      })),
      matchups: matchups.map(m => ({
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        isComplete: m.isComplete,
      })),
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/nfl/leagues/:leagueId/score-week — Commissioner manual trigger
router.post('/leagues/:leagueId/score-week', authenticate, async (req, res, next) => {
  try {
    const { leagueId } = req.params
    const { weekNumber } = req.body

    if (!weekNumber) return res.status(400).json({ error: { message: 'weekNumber is required' } })

    // Verify commissioner
    const member = await prisma.leagueMember.findFirst({
      where: { leagueId, userId: req.user.id },
    })
    if (!member || member.role !== 'commissioner') {
      return res.status(403).json({ error: { message: 'Only the commissioner can manually score weeks' } })
    }

    // Find NFL season
    const nflSport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
    if (!nflSport) return res.status(404).json({ error: { message: 'NFL sport not found' } })

    const nflSeason = await prisma.season.findFirst({
      where: { sportId: nflSport.id, isCurrent: true },
    })
    if (!nflSeason) return res.status(404).json({ error: { message: 'No current NFL season' } })

    // Find FantasyWeek
    const fantasyWeek = await prisma.fantasyWeek.findUnique({
      where: {
        seasonId_weekNumber: {
          seasonId: nflSeason.id,
          weekNumber: parseInt(weekNumber),
        },
      },
    })
    if (!fantasyWeek) return res.status(404).json({ error: { message: `Week ${weekNumber} not found` } })

    // Run scoring pipeline
    const scoreResult = await scoreNflWeek(fantasyWeek.id, prisma)
    const weekResult = await computeNflWeeklyResults(fantasyWeek.id, prisma)

    res.json({
      success: true,
      weekNumber: parseInt(weekNumber),
      scoring: scoreResult,
      results: weekResult,
    })
  } catch (error) {
    next(error)
  }
})

// ─── Prove It — Weekly Props & Picks ─────────────────────────────────────────

const { generateWeeklyProps, resolveWeeklyProps } = require('../services/nflLineGenerator')

// GET /api/nfl/props/:season/:week — Get available prop lines for a week
router.get('/props/:season/:week', optionalAuth, async (req, res, next) => {
  try {
    const season = parseInt(req.params.season)
    const week = parseInt(req.params.week)

    const props = await prisma.propLine.findMany({
      where: {
        sport: 'nfl',
        season,
        week,
        isActive: true,
      },
      include: {
        player: { select: { id: true, name: true, nflPosition: true, nflTeamAbbr: true, headshotUrl: true } },
      },
      orderBy: [{ category: 'asc' }, { propType: 'asc' }, { lineValue: 'desc' }],
    })

    // If user is logged in, also fetch their picks for this week
    let userPicks = []
    if (req.user) {
      userPicks = await prisma.prediction.findMany({
        where: {
          userId: req.user.id,
          sport: 'nfl',
          eventId: { in: props.map(p => p.id) },
        },
        select: {
          id: true,
          eventId: true,
          predictionData: true,
          outcome: true,
          resolvedAt: true,
        },
      })
    }

    // Map picks by prop ID for quick lookup
    const picksByProp = userPicks.reduce((acc, p) => {
      acc[p.eventId] = p
      return acc
    }, {})

    // Enhance props with user pick data
    const enhancedProps = props.map(p => ({
      ...p,
      userPick: picksByProp[p.id] || null,
    }))

    // Group by category
    const playerProps = enhancedProps.filter(p => p.category === 'player_prop')
    const gameProps = enhancedProps.filter(p => p.category === 'game_prop')

    res.json({
      season,
      week,
      playerProps,
      gameProps,
      totalProps: props.length,
      userPickCount: userPicks.length,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/nfl/props/:propId/pick — Submit a pick on a prop line
router.post('/props/:propId/pick', authenticate, async (req, res, next) => {
  try {
    const { propId } = req.params
    const { direction, reasonChip } = req.body // direction: 'over' | 'under'

    if (!['over', 'under'].includes(direction)) {
      return res.status(400).json({ error: 'Direction must be "over" or "under"' })
    }

    // Get the prop line
    const prop = await prisma.propLine.findUnique({ where: { id: propId } })
    if (!prop) return res.status(404).json({ error: 'Prop not found' })
    if (!prop.isActive) return res.status(400).json({ error: 'This prop is no longer active' })

    // Check if locked
    if (prop.locksAt && prop.locksAt <= new Date()) {
      return res.status(400).json({ error: 'This prop is locked — game has started' })
    }

    // Check for existing pick on this prop
    const existing = await prisma.prediction.findFirst({
      where: {
        userId: req.user.id,
        eventId: propId,
        sport: 'nfl',
      },
    })

    if (existing) {
      // Allow changing pick before lock
      const updated = await prisma.prediction.update({
        where: { id: existing.id },
        data: {
          predictionData: {
            direction,
            reasonChip: reasonChip || null,
            propType: prop.propType,
            lineValue: prop.lineValue,
            description: prop.description,
          },
        },
      })
      return res.json({ pick: updated, changed: true })
    }

    // Create new pick
    const prediction = await prisma.prediction.create({
      data: {
        userId: req.user.id,
        sport: 'nfl',
        predictionType: 'player_benchmark',
        category: 'weekly',
        eventId: propId,
        subjectPlayerId: prop.playerId,
        predictionData: {
          direction,
          reasonChip: reasonChip || null,
          propType: prop.propType,
          lineValue: prop.lineValue,
          description: prop.description,
        },
        isPublic: true,
        locksAt: prop.locksAt,
      },
    })

    res.json({ pick: prediction, changed: false })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfl/picks/record — Get user's pick record and stats
router.get('/picks/record', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id

    // Overall NFL pick record
    const [total, correct, incorrect, pending] = await Promise.all([
      prisma.prediction.count({ where: { userId, sport: 'nfl', predictionType: 'player_benchmark' } }),
      prisma.prediction.count({ where: { userId, sport: 'nfl', predictionType: 'player_benchmark', outcome: 'CORRECT' } }),
      prisma.prediction.count({ where: { userId, sport: 'nfl', predictionType: 'player_benchmark', outcome: 'INCORRECT' } }),
      prisma.prediction.count({ where: { userId, sport: 'nfl', predictionType: 'player_benchmark', outcome: 'PENDING' } }),
    ])

    // Get reputation (streaks, tier, etc.)
    const reputation = await prisma.userReputation.findUnique({
      where: { userId_sport: { userId, sport: 'nfl' } },
    })

    // Get Clutch Rating
    const rating = await prisma.clutchManagerRating.findUnique({
      where: { userId },
    })

    // Calculate percentile (what % of users this user beats)
    let percentile = null
    if (total >= 5) {
      const userAccuracy = total > 0 ? correct / (correct + incorrect || 1) : 0
      const allUsers = await prisma.userReputation.findMany({
        where: { sport: 'nfl', totalPredictions: { gte: 5 } },
        select: { accuracyRate: true },
      })
      if (allUsers.length > 0) {
        const beatCount = allUsers.filter(u => userAccuracy > u.accuracyRate).length
        percentile = Math.round((beatCount / allUsers.length) * 100)
      }
    }

    res.json({
      record: {
        total,
        correct,
        incorrect,
        pending,
        accuracy: (correct + incorrect) > 0 ? (correct / (correct + incorrect)).toFixed(3) : null,
        winLoss: `${correct}-${incorrect}`,
      },
      streak: reputation?.streakCurrent || 0,
      bestStreak: reputation?.streakBest || 0,
      tier: reputation?.tier || 'rookie',
      percentile,
      clutchRating: rating?.overallRating || null,
      clutchTier: rating?.tier || 'developing',
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfl/picks/leaderboard — Picks leaderboard
router.get('/picks/leaderboard', optionalAuth, async (req, res, next) => {
  try {
    const { limit = 25 } = req.query

    const leaderboard = await prisma.userReputation.findMany({
      where: {
        sport: 'nfl',
        totalPredictions: { gte: 5 },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ accuracyRate: 'desc' }, { totalPredictions: 'desc' }],
      take: parseInt(limit),
    })

    const entries = leaderboard.map((entry, i) => ({
      rank: i + 1,
      userId: entry.userId,
      name: entry.user.name,
      avatar: entry.user.avatar,
      record: `${entry.correctPredictions}-${entry.totalPredictions - entry.correctPredictions}`,
      accuracy: entry.accuracyRate,
      total: entry.totalPredictions,
      streak: entry.streakCurrent,
      tier: entry.tier,
    }))

    res.json({ leaderboard: entries })
  } catch (error) {
    next(error)
  }
})

// POST /api/nfl/props/generate/:season/:week — Admin: generate props for a week
router.post('/props/generate/:season/:week', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }
    const season = parseInt(req.params.season)
    const week = parseInt(req.params.week)
    const result = await generateWeeklyProps(season, week)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// POST /api/nfl/props/resolve/:season/:week — Admin: resolve props for a week
router.post('/props/resolve/:season/:week', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }
    const season = parseInt(req.params.season)
    const week = parseInt(req.params.week)
    const result = await resolveWeeklyProps(season, week)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// ─── Week in Review ──────────────────────────────────────────────────────────

// GET /api/nfl/leagues/:leagueId/week-review/:week — Week in Review for a user
router.get('/leagues/:leagueId/week-review/:week', authenticate, async (req, res, next) => {
  try {
    const { leagueId, week: weekParam } = req.params
    const weekNumber = parseInt(weekParam)
    const userId = req.user.id

    // Get the league and verify membership
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        members: { where: { userId } },
      },
    })
    if (!league || league.members.length === 0) {
      return res.status(404).json({ error: 'League not found' })
    }

    // Get the user's team
    const team = await prisma.team.findFirst({
      where: { leagueId, userId },
    })
    if (!team) return res.status(404).json({ error: 'Team not found' })

    // Find NFL sport + current season (same pattern as weekly-scores endpoint)
    const nflSport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
    if (!nflSport) return res.status(404).json({ error: 'NFL sport not found' })

    const nflSeason = await prisma.season.findFirst({
      where: { sportId: nflSport.id, isCurrent: true },
    })
    if (!nflSeason) return res.status(404).json({ error: 'No current NFL season' })

    // Get the fantasy week for this NFL week
    const fantasyWeek = await prisma.fantasyWeek.findFirst({
      where: {
        seasonId: nflSeason.id,
        weekNumber,
      },
    })
    if (!fantasyWeek) return res.status(404).json({ error: 'Week not found' })

    // Get the team season via LeagueSeason
    const leagueSeason = await prisma.leagueSeason.findFirst({
      where: { leagueId, seasonId: nflSeason.id },
    })
    const teamSeason = leagueSeason ? await prisma.teamSeason.findFirst({
      where: {
        teamId: team.id,
        leagueSeasonId: leagueSeason.id,
      },
    }) : null

    // Get the weekly result
    const weeklyResult = teamSeason ? await prisma.weeklyTeamResult.findFirst({
      where: {
        teamSeasonId: teamSeason.id,
        fantasyWeekId: fantasyWeek.id,
      },
    }) : null

    // Get all player scores for this team/week from playerScores JSONB
    const playerScores = weeklyResult?.playerScores || []

    // Get the league's roster slot definitions for optimal lineup calculation
    let rosterSlots = await prisma.rosterSlotDefinition.findMany({
      where: { leagueId, slotType: 'STARTER' },
      include: {
        eligibility: {
          include: { position: { select: { abbr: true } } },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })
    if (rosterSlots.length === 0 && league.scoringSystemId) {
      rosterSlots = await prisma.rosterSlotDefinition.findMany({
        where: { scoringSystemId: league.scoringSystemId, slotType: 'STARTER' },
        include: {
          eligibility: {
            include: { position: { select: { abbr: true } } },
          },
        },
        orderBy: { sortOrder: 'asc' },
      })
    }
    const slotConfig = rosterSlots.map(s => ({
      slotKey: s.slotKey,
      eligiblePositions: s.eligibility.map(e => e.position.abbr),
    }))

    // Get roster entries to determine starters vs bench
    const starters = playerScores.filter(p => p.position === 'ACTIVE')
    const bench = playerScores.filter(p => p.position !== 'ACTIVE')

    // Calculate optimal lineup using actual league roster slots
    const allPlayers = [...starters, ...bench]
    const optimalLineup = calculateOptimalLineup(allPlayers, slotConfig)
    const optimalPoints = optimalLineup.reduce((sum, p) => sum + (p.points || 0), 0)
    const actualPoints = starters.reduce((sum, p) => sum + (p.points || 0), 0)

    // Grade each start/sit decision
    const decisions = gradeDecisions(starters, bench)

    // Get matchup result
    const matchup = await prisma.matchup.findFirst({
      where: {
        fantasyWeekId: fantasyWeek.id,
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id },
        ],
      },
    })

    // Get season trends (3+ weeks)
    let seasonTrends = null
    if (weekNumber >= 3 && teamSeason) {
      const allWeeklyResults = await prisma.weeklyTeamResult.findMany({
        where: { teamSeasonId: teamSeason.id },
        include: { fantasyWeek: true },
        orderBy: { fantasyWeek: { weekNumber: 'asc' } },
      })

      seasonTrends = calculateSeasonTrends(allWeeklyResults, slotConfig)
    }

    res.json({
      weekNumber,
      result: matchup ? {
        won: matchup.homeTeamId === team.id
          ? matchup.homeScore > matchup.awayScore
          : matchup.awayScore > matchup.homeScore,
        yourScore: matchup.homeTeamId === team.id ? matchup.homeScore : matchup.awayScore,
        oppScore: matchup.homeTeamId === team.id ? matchup.awayScore : matchup.homeScore,
      } : null,
      lineup: {
        starters,
        bench,
        optimalLineup,
        actualPoints: Math.round(actualPoints * 10) / 10,
        optimalPoints: Math.round(optimalPoints * 10) / 10,
        efficiency: actualPoints > 0 ? Math.round((actualPoints / optimalPoints) * 1000) / 10 : 0,
        pointsLeftOnBench: Math.round((optimalPoints - actualPoints) * 10) / 10,
      },
      decisions,
      seasonTrends,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Calculate optimal lineup from all available players using actual league roster slots.
 * Falls back to standard 9-slot config if no slot config is provided.
 */
function calculateOptimalLineup(players, slotConfig) {
  // Fallback to standard slots if no config provided
  if (!slotConfig || slotConfig.length === 0) {
    slotConfig = [
      { slotKey: 'QB1', eligiblePositions: ['QB'] },
      { slotKey: 'RB1', eligiblePositions: ['RB'] },
      { slotKey: 'RB2', eligiblePositions: ['RB'] },
      { slotKey: 'WR1', eligiblePositions: ['WR'] },
      { slotKey: 'WR2', eligiblePositions: ['WR'] },
      { slotKey: 'TE1', eligiblePositions: ['TE'] },
      { slotKey: 'FLEX1', eligiblePositions: ['RB', 'WR', 'TE'] },
      { slotKey: 'K1', eligiblePositions: ['K'] },
      { slotKey: 'DEF1', eligiblePositions: ['DEF'] },
    ]
  }

  // Sort slots by specificity — fill most restricted slots first (fewer eligible positions)
  const sortedSlots = [...slotConfig].sort((a, b) =>
    a.eligiblePositions.length - b.eligiblePositions.length
  )

  // Sort players by points desc
  const sortedPlayers = [...players].sort((a, b) => (b.points || 0) - (a.points || 0))
  const used = new Set()
  const lineup = []

  for (const slot of sortedSlots) {
    const best = sortedPlayers.find(p =>
      !used.has(p.playerId) && slot.eligiblePositions.includes(p.nflPos)
    )
    if (best) {
      lineup.push({ ...best, optimalSlot: slot.slotKey.replace(/\d+$/, '') })
      used.add(best.playerId)
    }
  }

  return lineup
}

/**
 * Grade start/sit decisions by comparing starters vs bench at same position.
 */
function gradeDecisions(starters, bench) {
  const decisions = []

  for (const starter of starters) {
    // Find bench players at the same position who outscored this starter
    const betterBench = bench.filter(b =>
      b.nflPos === starter.nflPos && (b.points || 0) > (starter.points || 0)
    )

    if (betterBench.length > 0) {
      const best = betterBench[0]
      decisions.push({
        type: 'miss',
        starter: { name: starter.playerName, points: starter.points, pos: starter.nflPos },
        alternative: { name: best.playerName, points: best.points, pos: best.nflPos },
        diff: Math.round(((best.points || 0) - (starter.points || 0)) * 10) / 10,
      })
    } else {
      // Good decision — no bench player at this position outscored
      const samePosOnBench = bench.filter(b => b.nflPos === starter.nflPos)
      if (samePosOnBench.length > 0) {
        decisions.push({
          type: 'good',
          starter: { name: starter.playerName, points: starter.points, pos: starter.nflPos },
          alternative: { name: samePosOnBench[0].playerName, points: samePosOnBench[0].points, pos: samePosOnBench[0].nflPos },
          diff: Math.round(((starter.points || 0) - (samePosOnBench[0].points || 0)) * 10) / 10,
        })
      }
    }
  }

  return decisions.sort((a, b) => {
    // Misses first, then good decisions
    if (a.type !== b.type) return a.type === 'miss' ? -1 : 1
    return Math.abs(b.diff) - Math.abs(a.diff)
  })
}

/**
 * Calculate season trends from weekly results.
 */
function calculateSeasonTrends(weeklyResults, slotConfig) {
  if (weeklyResults.length < 3) return null

  const weeklyEfficiencies = []
  let totalOptimal = 0
  let totalActual = 0

  for (const wr of weeklyResults) {
    const players = wr.playerScores || []
    const starters = players.filter(p => p.position === 'ACTIVE')
    const bench = players.filter(p => p.position !== 'ACTIVE')
    const allPlayers = [...starters, ...bench]

    const actualPts = starters.reduce((s, p) => s + (p.points || 0), 0)
    const optimal = calculateOptimalLineup(allPlayers, slotConfig)
    const optimalPts = optimal.reduce((s, p) => s + (p.points || 0), 0)

    totalActual += actualPts
    totalOptimal += optimalPts

    if (optimalPts > 0) {
      weeklyEfficiencies.push({
        week: wr.fantasyWeek?.weekNumber,
        efficiency: Math.round((actualPts / optimalPts) * 1000) / 10,
        pointsLeft: Math.round((optimalPts - actualPts) * 10) / 10,
      })
    }
  }

  const avgEfficiency = totalOptimal > 0 ? Math.round((totalActual / totalOptimal) * 1000) / 10 : 0

  return {
    weeksAnalyzed: weeklyResults.length,
    avgEfficiency,
    totalPointsLeft: Math.round((totalOptimal - totalActual) * 10) / 10,
    weeklyEfficiencies,
  }
}

module.exports = router
