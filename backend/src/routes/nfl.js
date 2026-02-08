/**
 * NFL Routes — NFL-specific API endpoints
 *
 * GET /api/nfl/players         — Browse NFL players (filterable by position, team)
 * GET /api/nfl/players/:id     — NFL player detail with game log
 * GET /api/nfl/schedule        — NFL schedule by season/week
 * GET /api/nfl/teams           — All 32 NFL teams
 * GET /api/nfl/teams/:abbr     — Team detail with roster + schedule
 * GET /api/nfl/standings       — NFL standings by conference/division
 * GET /api/nfl/scoring-systems — Available NFL scoring presets
 */

const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { optionalAuth } = require('../middleware/auth')
const { calculateFantasyPoints } = require('../services/nflScoringService')

const router = express.Router()
const prisma = new PrismaClient()

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

      // Use pre-computed fantasy points from nflverse or calculate our own
      let fantasyPts = 0
      if (scoring === 'ppr') {
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
        fantasyPts: Math.round(fantasyPts * 10) / 10,
        fantasyPtsPerGame: gamesPlayed > 0
          ? Math.round((fantasyPts / gamesPlayed) * 10) / 10
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
          orderBy: { game: { week: 'asc' } },
        },
      },
    })

    if (!player || !player.nflPosition) {
      return res.status(404).json({ error: { message: 'NFL player not found' } })
    }

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
      fantasyPtsStd: Math.round(games.reduce((s, g) => s + (g.fantasyPtsStd || 0), 0) * 10) / 10,
      fantasyPtsPpr: Math.round(games.reduce((s, g) => s + (g.fantasyPtsPpr || 0), 0) * 10) / 10,
      fantasyPtsHalf: Math.round(games.reduce((s, g) => s + (g.fantasyPtsHalf || 0), 0) * 10) / 10,
    }

    const { nflPlayerGames, ...playerData } = player

    res.json({
      player: playerData,
      gameLog,
      seasonTotals,
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

module.exports = router
