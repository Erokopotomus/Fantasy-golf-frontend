const express = require('express')
const { authenticate } = require('../middleware/auth')
const { recordEvent } = require('../services/opinionTimelineService')
const { buildServerEnvelope } = require('../services/decisionEnvelope')
const { sanitizeChips } = require('../constants/reasonChips')

const router = express.Router()
const prisma = require('../lib/prisma.js')

// Snapshot a player's current ClutchProjection (any scoringFormat — bias engine
// doesn't need exact format match). Falls back to null fields if no projection
// exists yet (early-season golf, brand-new NFL rookie, etc).
async function snapshotProjection(playerId, sport) {
  try {
    const proj = await prisma.clutchProjection.findFirst({
      where: { playerId, sport },
      orderBy: { computedAt: 'desc' },
      select: { adpRank: true, projectedPts: true },
    })
    return {
      adp: proj?.adpRank != null ? Number(proj.adpRank) : null,
      projectedPts: proj?.projectedPts ?? null,
    }
  } catch {
    return { adp: null, projectedPts: null }
  }
}

// Fire-and-forget write to WatchlistEvent. Never blocks the user-facing response.
function logWatchlistEvent(data) {
  return prisma.watchlistEvent.create({ data }).catch(err => {
    console.error('[watchList] event log failed:', err.message)
  })
}

// GET /api/watch-list — list all watched players
router.get('/', authenticate, async (req, res) => {
  try {
    const { sport } = req.query
    const where = { userId: req.user.id }
    if (sport) where.sport = sport

    const entries = await prisma.watchListEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        player: {
          select: {
            id: true, name: true, headshotUrl: true,
            nflPosition: true, nflTeamAbbr: true,
            owgrRank: true, sgTotal: true,
          },
        },
      },
    })

    res.json({
      entries: entries.map(e => ({
        id: e.id,
        playerId: e.playerId,
        sport: e.sport,
        note: e.note,
        createdAt: e.createdAt,
        player: {
          id: e.player.id,
          name: e.player.name,
          headshotUrl: e.player.headshotUrl,
          position: e.player.nflPosition,
          team: e.player.nflTeamAbbr,
          owgrRank: e.player.owgrRank,
          sgTotal: e.player.sgTotal,
        },
      })),
    })
  } catch (err) {
    console.error('[watchList] GET failed:', err)
    res.status(500).json({ error: 'Failed to load watch list' })
  }
})

// GET /api/watch-list/ids — lightweight: just player IDs (for star icons)
router.get('/ids', authenticate, async (req, res) => {
  try {
    const entries = await prisma.watchListEntry.findMany({
      where: { userId: req.user.id },
      select: { playerId: true },
    })
    res.json({ playerIds: entries.map(e => e.playerId) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to load watch list IDs' })
  }
})

// POST /api/watch-list — add player to watch list
router.post('/', authenticate, async (req, res) => {
  try {
    const { playerId, sport, note, reasonChips, reasonText } = req.body
    if (!playerId || !sport) {
      return res.status(400).json({ error: 'playerId and sport are required' })
    }

    // Decision capture: snapshot state BEFORE the add so watchlistSizeBefore
    // reflects what the user had when they decided to add.
    const [sizeBefore, snapshot] = await Promise.all([
      prisma.watchListEntry.count({ where: { userId: req.user.id, sport } }),
      snapshotProjection(playerId, sport),
    ])

    const entry = await prisma.watchListEntry.create({
      data: {
        userId: req.user.id,
        playerId,
        sport,
        note: note || null,
      },
    })

    // Fire-and-forget: opinion timeline (legacy)
    recordEvent(req.user.id, playerId, sport, 'WATCH_ADD', {
      note: note || null,
    }, entry.id, 'WatchListEntry').catch(() => {})

    // Fire-and-forget: decision capture event log
    logWatchlistEvent({
      userId: req.user.id,
      playerId,
      sport,
      action: 'ADD',
      adpAtAction: snapshot.adp,
      projectedPtsAtAction: snapshot.projectedPts,
      watchlistSizeBefore: sizeBefore,
      reasonChips: sanitizeChips(reasonChips, sport),
      reasonText: typeof reasonText === 'string' ? reasonText.slice(0, 280) : null,
      ...buildServerEnvelope({ req, surface: 'watchlist' }),
    })

    res.status(201).json({ entry })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Player already on watch list' })
    }
    console.error('[watchList] POST failed:', err)
    res.status(500).json({ error: 'Failed to add to watch list' })
  }
})

// DELETE /api/watch-list/:playerId — remove from watch list
router.delete('/:playerId', authenticate, async (req, res) => {
  try {
    // Look up entry FIRST so we know the sport for the event log.
    const existing = await prisma.watchListEntry.findUnique({
      where: { userId_playerId: { userId: req.user.id, playerId: req.params.playerId } },
      select: { sport: true },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Not on watch list' })
    }

    const sport = existing.sport
    const { reasonChips, reasonText } = req.body || {}

    // Decision capture: size snapshot BEFORE the delete so we know how full
    // the watchlist was when the user pruned it.
    const [sizeBefore, snapshot] = await Promise.all([
      prisma.watchListEntry.count({ where: { userId: req.user.id, sport } }),
      snapshotProjection(req.params.playerId, sport),
    ])

    await prisma.watchListEntry.delete({
      where: {
        userId_playerId: { userId: req.user.id, playerId: req.params.playerId },
      },
    })

    // Fire-and-forget: opinion timeline (legacy)
    recordEvent(req.user.id, req.params.playerId, sport, 'WATCH_REMOVE', {}, null, 'WatchListEntry').catch(() => {})

    // Fire-and-forget: decision capture event log
    logWatchlistEvent({
      userId: req.user.id,
      playerId: req.params.playerId,
      sport,
      action: 'REMOVE',
      adpAtAction: snapshot.adp,
      projectedPtsAtAction: snapshot.projectedPts,
      watchlistSizeBefore: sizeBefore,
      reasonChips: sanitizeChips(reasonChips, sport),
      reasonText: typeof reasonText === 'string' ? reasonText.slice(0, 280) : null,
      ...buildServerEnvelope({ req, surface: 'watchlist' }),
    })

    res.json({ success: true })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not on watch list' })
    }
    console.error('[watchList] DELETE failed:', err)
    res.status(500).json({ error: 'Failed to remove from watch list' })
  }
})

// PATCH /api/watch-list/:playerId/note — update note
router.patch('/:playerId/note', authenticate, async (req, res) => {
  try {
    const entry = await prisma.watchListEntry.update({
      where: {
        userId_playerId: {
          userId: req.user.id,
          playerId: req.params.playerId,
        },
      },
      data: { note: req.body.note || null },
    })
    res.json({ entry })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note' })
  }
})

module.exports = router
