const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { recordEvent } = require('./opinionTimelineService')

async function createCapture(userId, { content, sourceType, sourceName, sentiment, playerIds }) {
  const result = await prisma.$transaction(async (tx) => {
    const capture = await tx.labCapture.create({
      data: {
        userId,
        content,
        sourceType: sourceType || null,
        sourceName: sourceName || null,
        sentiment: sentiment || null,
      },
    })

    if (playerIds && playerIds.length > 0) {
      await tx.labCapturePlayer.createMany({
        data: playerIds.map(p => ({
          captureId: capture.id,
          playerId: typeof p === 'string' ? p : p.id,
          autoDetected: typeof p === 'object' ? (p.autoDetected || false) : false,
          confirmed: true,
        })),
      })
    }

    return tx.labCapture.findUnique({
      where: { id: capture.id },
      include: {
        players: {
          include: { player: { select: { id: true, name: true, headshotUrl: true, nflPosition: true, nflTeamAbbr: true } } },
        },
      },
    })
  })

  // Fire-and-forget: record opinion events for linked players
  if (result?.players?.length > 0) {
    for (const lp of result.players) {
      const sport = lp.player?.nflPosition ? 'nfl' : 'golf'
      recordEvent(userId, lp.player.id, sport, 'CAPTURE', {
        content: content?.substring(0, 200),
        sentiment: sentiment || null,
        source: sourceType || null,
      }, result.id, 'LabCapture').catch(() => {})
    }
  }

  return result
}

async function listCaptures(userId, { sport, sentiment, search, limit = 20, offset = 0 } = {}) {
  const where = { userId }

  if (sentiment) {
    where.sentiment = sentiment
  }

  if (search) {
    where.content = { contains: search, mode: 'insensitive' }
  }

  // Sport filter requires joining through players
  let captureIds = null
  if (sport) {
    const sportPositions = sport === 'nfl'
      ? { not: null }
      : null // golf players don't have nflPosition
    const links = await prisma.labCapturePlayer.findMany({
      where: {
        capture: { userId },
        player: sport === 'nfl'
          ? { nflPosition: { not: null } }
          : { nflPosition: null, sportId: { not: null } },
      },
      select: { captureId: true },
      distinct: ['captureId'],
    })
    captureIds = links.map(l => l.captureId)
    where.id = { in: captureIds }
  }

  const [captures, total] = await Promise.all([
    prisma.labCapture.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        players: {
          include: { player: { select: { id: true, name: true, headshotUrl: true, nflPosition: true, nflTeamAbbr: true } } },
        },
      },
    }),
    prisma.labCapture.count({ where }),
  ])

  return { captures, total }
}

async function getRecentCaptures(userId, limit = 5) {
  return prisma.labCapture.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
    include: {
      players: {
        include: { player: { select: { id: true, name: true, headshotUrl: true, nflPosition: true, nflTeamAbbr: true } } },
      },
    },
  })
}

async function deleteCapture(userId, captureId) {
  const capture = await prisma.labCapture.findUnique({ where: { id: captureId } })
  if (!capture) throw Object.assign(new Error('Capture not found'), { status: 404 })
  if (capture.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  await prisma.labCapture.delete({ where: { id: captureId } })
  return { success: true }
}

async function getCapturesByPlayer(userId, playerId, limit = 10) {
  const links = await prisma.labCapturePlayer.findMany({
    where: {
      playerId,
      capture: { userId },
    },
    select: { captureId: true },
    distinct: ['captureId'],
    take: parseInt(limit),
  })

  if (links.length === 0) return []

  return prisma.labCapture.findMany({
    where: { id: { in: links.map(l => l.captureId) } },
    orderBy: { createdAt: 'desc' },
    include: {
      players: {
        include: { player: { select: { id: true, name: true, headshotUrl: true, nflPosition: true, nflTeamAbbr: true } } },
      },
    },
  })
}

/**
 * Link captures to season outcome data.
 * Runs post-season (January) or mid-season (partial = true).
 * For each capture with player links, pulls outcome metrics and determines verdict.
 */
async function linkCapturesToOutcomes(season, { partial = false } = {}) {
  const captures = await prisma.labCapture.findMany({
    where: {
      outcomeLinked: false,
      players: { some: {} },
    },
    include: {
      players: {
        include: {
          player: {
            select: {
              id: true,
              name: true,
              nflPosition: true,
              nflTeamAbbr: true,
            },
          },
        },
      },
    },
  })

  if (captures.length === 0) return { linked: 0 }

  // Gather all unique player IDs
  const playerIds = [...new Set(captures.flatMap(c => c.players.map(p => p.playerId)))]

  // Pull NFL player season stats (PPG from NflPlayerGame)
  const nflStats = await prisma.nflPlayerGame.groupBy({
    by: ['playerId'],
    where: {
      playerId: { in: playerIds },
      season: parseInt(season),
      fantasyPoints: { not: null },
    },
    _avg: { fantasyPoints: true },
    _count: { id: true },
  })
  const nflStatsMap = new Map(nflStats.map(s => [s.playerId, {
    fantasyPPG: Math.round((s._avg.fantasyPoints || 0) * 10) / 10,
    gamesPlayed: s._count.id,
  }]))

  // Pull golf player season stats (performances)
  const golfPerfs = await prisma.performance.groupBy({
    by: ['playerId'],
    where: {
      playerId: { in: playerIds },
      tournament: { season: { year: parseInt(season) } },
      finalPosition: { not: null },
    },
    _avg: { finalPosition: true },
    _count: { id: true },
  })
  const golfStatsMap = new Map(golfPerfs.map(p => [p.playerId, {
    avgFinish: Math.round((p._avg.finalPosition || 0) * 10) / 10,
    events: p._count.id,
  }]))

  // Pull projection data for ADP context
  const projections = await prisma.clutchProjection.findMany({
    where: {
      playerId: { in: playerIds },
    },
    orderBy: { updatedAt: 'desc' },
    distinct: ['playerId'],
  })
  const projMap = new Map(projections.map(p => [p.playerId, {
    preSeasonRank: p.clutchRank,
    adpRank: p.adpRank,
  }]))

  let linked = 0

  for (const capture of captures) {
    const playerOutcomes = capture.players.map(lp => {
      const player = lp.player
      const isNfl = !!player.nflPosition
      const nfl = nflStatsMap.get(player.id)
      const golf = golfStatsMap.get(player.id)
      const proj = projMap.get(player.id)

      const outcomeMetrics = isNfl
        ? { fantasyPPG: nfl?.fantasyPPG || null, gamesPlayed: nfl?.gamesPlayed || 0, preSeasonRank: proj?.preSeasonRank || null }
        : { avgFinish: golf?.avgFinish || null, events: golf?.events || 0, preSeasonRank: proj?.preSeasonRank || null }

      // Determine verdict based on sentiment vs outcome
      let verdict = 'NOTED'
      const sentiment = capture.sentiment
      if (sentiment && sentiment !== 'neutral') {
        const hasData = isNfl ? (nfl && nfl.gamesPlayed >= 4) : (golf && golf.events >= 3)
        if (hasData) {
          const preRank = proj?.clutchRank || proj?.adpRank
          if (preRank) {
            if (isNfl) {
              // NFL: higher PPG relative to draft position = outperformed
              // Top 12 QB, Top 24 RB, Top 24 WR, Top 12 TE as benchmarks
              const outperformed = nfl.fantasyPPG >= 12 // reasonable PPG threshold
              if (sentiment === 'bullish' && outperformed) verdict = 'CORRECT'
              else if (sentiment === 'bearish' && !outperformed) verdict = 'CORRECT'
              else if (sentiment === 'bullish' && !outperformed) verdict = 'INCORRECT'
              else if (sentiment === 'bearish' && outperformed) verdict = 'INCORRECT'
            } else {
              // Golf: lower avg finish = better
              const outperformed = golf.avgFinish <= 25
              if (sentiment === 'bullish' && outperformed) verdict = 'CORRECT'
              else if (sentiment === 'bearish' && !outperformed) verdict = 'CORRECT'
              else if (sentiment === 'bullish' && !outperformed) verdict = 'INCORRECT'
              else if (sentiment === 'bearish' && outperformed) verdict = 'INCORRECT'
            }
          }
        }

        // Add TRENDING prefix for mid-season partial runs
        if (partial && verdict !== 'NOTED') {
          verdict = `TRENDING_${verdict}`
        }
      }

      return {
        playerId: player.id,
        playerName: player.name,
        captureDate: capture.createdAt.toISOString().split('T')[0],
        captureSentiment: sentiment || null,
        captureContext: capture.content.substring(0, 200),
        outcomeMetrics,
        verdict,
      }
    })

    await prisma.labCapture.update({
      where: { id: capture.id },
      data: {
        outcomeLinked: true,
        outcomeData: {
          players: playerOutcomes,
          linkedAt: new Date().toISOString(),
          season,
          partial,
        },
        outcomeLinkedAt: new Date(),
      },
    })
    linked++
  }

  return { linked }
}

module.exports = {
  createCapture,
  listCaptures,
  getRecentCaptures,
  deleteCapture,
  getCapturesByPlayer,
  linkCapturesToOutcomes,
}
