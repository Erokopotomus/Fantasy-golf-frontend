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
      limit = 50,
      offset = 0,
      sortBy = 'name',
      sortOrder = 'asc',
      scoring = 'half_ppr',
      available,
      leagueId,
    } = req.query

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

    // Determine sort field
    let orderBy = { name: 'asc' }
    if (sortBy === 'fantasyPts') {
      // Sort by computed fantasy pts requires post-query sort
      orderBy = { name: 'asc' }
    } else if (sortBy === 'name') {
      orderBy = { name: sortOrder }
    } else if (sortBy === 'nflPosition') {
      orderBy = { nflPosition: sortOrder }
    } else if (sortBy === 'nflTeamAbbr') {
      orderBy = { nflTeamAbbr: sortOrder }
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy,
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          gsisId: true,
          nflPosition: true,
          nflTeamAbbr: true,
          nflNumber: true,
          headshotUrl: true,
          isActive: true,
          college: true,
          // Aggregate season stats from nflPlayerGames
          nflPlayerGames: {
            select: {
              passYards: true,
              passTds: true,
              interceptions: true,
              rushYards: true,
              rushTds: true,
              receptions: true,
              recYards: true,
              recTds: true,
              fumblesLost: true,
              fgMade: true,
              xpMade: true,
              fantasyPtsStd: true,
              fantasyPtsPpr: true,
              fantasyPtsHalf: true,
            },
          },
        },
      }),
      prisma.player.count({ where }),
    ])

    // Compute season totals and per-game averages
    const playersWithStats = players.map(p => {
      const games = p.nflPlayerGames || []
      const gamesPlayed = games.length

      // Sum up season stats
      const season = {
        gamesPlayed,
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
        xpMade: games.reduce((s, g) => s + (g.xpMade || 0), 0),
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
        season,
        fantasyPts: Math.round(fantasyPts * 10) / 10,
        fantasyPtsPerGame: gamesPlayed > 0
          ? Math.round((fantasyPts / gamesPlayed) * 10) / 10
          : 0,
      }
    })

    // Sort by fantasy points if requested
    if (sortBy === 'fantasyPts') {
      playersWithStats.sort((a, b) =>
        sortOrder === 'desc' ? b.fantasyPts - a.fantasyPts : a.fantasyPts - b.fantasyPts
      )
    }

    res.json({
      players: playersWithStats,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset), hasMore: parseInt(offset) + players.length < total },
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
