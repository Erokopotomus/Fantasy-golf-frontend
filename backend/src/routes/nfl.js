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
const { PrismaClient } = require('@prisma/client')
const { optionalAuth, authenticate } = require('../middleware/auth')
const { calculateFantasyPoints, resolveRules, getScoringSchema, PRESETS } = require('../services/nflScoringService')
const { scoreNflWeek, computeNflWeeklyResults } = require('../services/nflFantasyTracker')

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

    // Get roster entries to determine starters vs bench
    const starters = playerScores.filter(p => p.position === 'ACTIVE')
    const bench = playerScores.filter(p => p.position !== 'ACTIVE')

    // Calculate optimal lineup
    // For NFL: need to respect position limits (1 QB, 2 RB, 2 WR, 1 TE, 1 K, 1 DEF, 1 FLEX)
    const allPlayers = [...starters, ...bench]
    const optimalLineup = calculateOptimalLineup(allPlayers)
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

      seasonTrends = calculateSeasonTrends(allWeeklyResults)
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
 * Calculate optimal lineup from all available players.
 * Standard NFL lineup: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX (RB/WR/TE), 1 K, 1 DEF
 */
function calculateOptimalLineup(players) {
  // Group by NFL position
  const byPos = {}
  for (const p of players) {
    const pos = p.nflPos || 'UNKNOWN'
    if (!byPos[pos]) byPos[pos] = []
    byPos[pos].push(p)
  }

  // Sort each position group by points desc
  for (const pos of Object.keys(byPos)) {
    byPos[pos].sort((a, b) => (b.points || 0) - (a.points || 0))
  }

  const lineup = []
  const used = new Set()

  // Fill required slots
  const slots = [
    { pos: 'QB', count: 1 },
    { pos: 'RB', count: 2 },
    { pos: 'WR', count: 2 },
    { pos: 'TE', count: 1 },
    { pos: 'K', count: 1 },
    { pos: 'DEF', count: 1 },
  ]

  for (const slot of slots) {
    const available = (byPos[slot.pos] || []).filter(p => !used.has(p.playerId))
    for (let i = 0; i < slot.count && i < available.length; i++) {
      lineup.push({ ...available[i], optimalSlot: slot.pos })
      used.add(available[i].playerId)
    }
  }

  // FLEX: best remaining RB/WR/TE
  const flexCandidates = ['RB', 'WR', 'TE']
    .flatMap(pos => (byPos[pos] || []).filter(p => !used.has(p.playerId)))
    .sort((a, b) => (b.points || 0) - (a.points || 0))

  if (flexCandidates.length > 0) {
    lineup.push({ ...flexCandidates[0], optimalSlot: 'FLEX' })
    used.add(flexCandidates[0].playerId)
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
function calculateSeasonTrends(weeklyResults) {
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
    const optimal = calculateOptimalLineup(allPlayers)
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
