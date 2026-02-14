const express = require('express')
const { optionalAuth } = require('../middleware/auth')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// GET /api/search?q=query&type=all|players|tournaments|leagues
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { q, type = 'all', limit = 10 } = req.query

    if (!q || q.trim().length < 2) {
      return res.json({ players: [], leagues: [], tournaments: [], news: [] })
    }

    const query = q.trim()
    const maxResults = Math.min(parseInt(limit) || 10, 25)
    const results = { players: [], leagues: [], tournaments: [], news: [] }

    // Players search
    if (type === 'all' || type === 'players') {
      const players = await prisma.player.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          country: true,
          countryFlag: true,
          headshotUrl: true,
          owgrRank: true,
          primaryTour: true,
          sgTotal: true,
          wins: true,
          nflPosition: true,
          nflTeamAbbr: true,
        },
        orderBy: [{ owgrRank: 'asc' }],
        take: maxResults,
      })

      results.players = players.map((p) => ({
        id: p.id,
        name: p.name,
        type: 'player',
        subtitle: p.nflPosition
          ? `${p.nflPosition} - ${p.nflTeamAbbr || '?'}`
          : `#${p.owgrRank || '?'} OWGR${p.primaryTour ? ` - ${p.primaryTour}` : ''}`,
        image: p.headshotUrl,
        countryFlag: p.countryFlag,
        nflPosition: p.nflPosition || null,
        nflTeam: p.nflTeamAbbr || null,
        url: `/players/${p.id}`,
      }))
    }

    // Tournaments search
    if (type === 'all' || type === 'tournaments') {
      const tournaments = await prisma.tournament.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          location: true,
          startDate: true,
          status: true,
          purse: true,
          isMajor: true,
          isSignature: true,
        },
        orderBy: [{ startDate: 'desc' }],
        take: maxResults,
      })

      results.tournaments = tournaments.map((t) => {
        const statusLabel = t.status === 'IN_PROGRESS' ? 'Live' : t.status === 'COMPLETED' ? 'Completed' : 'Upcoming'
        return {
          id: t.id,
          name: t.name,
          type: 'tournament',
          subtitle: `${statusLabel}${t.isMajor ? ' - Major' : t.isSignature ? ' - Signature' : ''}`,
          location: t.location,
          url: `/tournaments/${t.id}`,
        }
      })
    }

    // Leagues search (only user's leagues if authenticated)
    if ((type === 'all' || type === 'leagues') && req.user) {
      const leagues = await prisma.league.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
          members: { some: { userId: req.user.id } },
        },
        select: {
          id: true,
          name: true,
          format: true,
          _count: { select: { members: true } },
          maxTeams: true,
        },
        take: maxResults,
      })

      results.leagues = leagues.map((l) => ({
        id: l.id,
        name: l.name,
        type: 'league',
        subtitle: `${l._count.members}/${l.maxTeams} members - ${l.format}`,
        url: `/leagues/${l.id}`,
      }))
    }

    res.json(results)
  } catch (error) {
    next(error)
  }
})

module.exports = router
