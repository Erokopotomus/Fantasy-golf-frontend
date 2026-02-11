const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createCapture(userId, { content, sourceType, sourceName, sentiment, playerIds }) {
  return prisma.$transaction(async (tx) => {
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

module.exports = {
  createCapture,
  listCaptures,
  getRecentCaptures,
  deleteCapture,
}
