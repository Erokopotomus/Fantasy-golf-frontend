const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ── Helpers ──────────────────────────────────────────────────────────────────

function enrichPlayer(player, sport) {
  if (!player) return null
  if (sport === 'nfl') {
    return {
      id: player.id,
      name: player.name,
      headshotUrl: player.headshotUrl,
      position: player.nflPosition,
      team: player.nflTeamAbbr,
    }
  }
  // golf
  return {
    id: player.id,
    name: player.name,
    headshotUrl: player.headshotUrl,
    owgrRank: player.owgrRank,
    sgTotal: player.sgTotal,
    fedexRank: player.fedexRank,
  }
}

async function assertOwnership(boardId, userId) {
  const board = await prisma.draftBoard.findUnique({ where: { id: boardId } })
  if (!board) throw Object.assign(new Error('Board not found'), { status: 404 })
  if (board.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  return board
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

async function createBoard(userId, { name, sport = 'nfl', scoringFormat = 'ppr', boardType = 'overall', season = 2026 }) {
  return prisma.draftBoard.create({
    data: { userId, name, sport, scoringFormat, boardType, season },
  })
}

async function listBoards(userId) {
  const boards = await prisma.draftBoard.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { entries: true } } },
  })
  return boards.map(b => ({
    id: b.id,
    name: b.name,
    sport: b.sport,
    scoringFormat: b.scoringFormat,
    boardType: b.boardType,
    season: b.season,
    isPublished: b.isPublished,
    playerCount: b._count.entries,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }))
}

async function getBoard(boardId, userId) {
  const board = await assertOwnership(boardId, userId)

  const entries = await prisma.draftBoardEntry.findMany({
    where: { boardId },
    orderBy: { rank: 'asc' },
  })

  // Batch-load players
  const playerIds = entries.map(e => e.playerId)
  const players = playerIds.length > 0
    ? await prisma.player.findMany({ where: { id: { in: playerIds } } })
    : []
  const playerMap = new Map(players.map(p => [p.id, p]))

  const enrichedEntries = entries.map(e => ({
    playerId: e.playerId,
    rank: e.rank,
    tier: e.tier,
    notes: e.notes,
    player: enrichPlayer(playerMap.get(e.playerId), board.sport),
  }))

  return {
    id: board.id,
    name: board.name,
    sport: board.sport,
    scoringFormat: board.scoringFormat,
    boardType: board.boardType,
    season: board.season,
    isPublished: board.isPublished,
    publishedAt: board.publishedAt,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    entries: enrichedEntries,
  }
}

async function updateBoard(boardId, userId, data) {
  await assertOwnership(boardId, userId)
  const allowed = ['name', 'scoringFormat', 'boardType', 'isPublished']
  const update = {}
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key]
  }
  if (data.isPublished === true) update.publishedAt = new Date()
  if (data.isPublished === false) update.publishedAt = null
  return prisma.draftBoard.update({ where: { id: boardId }, data: update })
}

async function deleteBoard(boardId, userId) {
  await assertOwnership(boardId, userId)
  return prisma.draftBoard.delete({ where: { id: boardId } })
}

// ── Entries ──────────────────────────────────────────────────────────────────

async function saveEntries(boardId, userId, entries) {
  // entries: [{ playerId, rank, tier, notes }]
  await assertOwnership(boardId, userId)

  await prisma.$transaction([
    prisma.draftBoardEntry.deleteMany({ where: { boardId } }),
    ...entries.map(e =>
      prisma.draftBoardEntry.create({
        data: {
          boardId,
          playerId: e.playerId,
          rank: e.rank,
          tier: e.tier ?? null,
          notes: e.notes ?? null,
        },
      })
    ),
  ])

  // Return refreshed board
  return getBoard(boardId, userId)
}

async function addEntry(boardId, userId, playerId) {
  const board = await assertOwnership(boardId, userId)

  // Get current max rank
  const maxEntry = await prisma.draftBoardEntry.findFirst({
    where: { boardId },
    orderBy: { rank: 'desc' },
    select: { rank: true },
  })
  const nextRank = (maxEntry?.rank ?? 0) + 1

  // Get last tier
  const lastTierEntry = await prisma.draftBoardEntry.findFirst({
    where: { boardId },
    orderBy: { rank: 'desc' },
    select: { tier: true },
  })

  await prisma.draftBoardEntry.create({
    data: {
      boardId,
      playerId,
      rank: nextRank,
      tier: lastTierEntry?.tier ?? 1,
    },
  })

  return getBoard(boardId, userId)
}

async function removeEntry(boardId, userId, playerId) {
  await assertOwnership(boardId, userId)

  await prisma.draftBoardEntry.deleteMany({
    where: { boardId, playerId },
  })

  // Re-rank remaining entries
  const remaining = await prisma.draftBoardEntry.findMany({
    where: { boardId },
    orderBy: { rank: 'asc' },
  })

  if (remaining.length > 0) {
    await prisma.$transaction(
      remaining.map((entry, i) =>
        prisma.draftBoardEntry.update({
          where: { id: entry.id },
          data: { rank: i + 1 },
        })
      )
    )
  }

  return getBoard(boardId, userId)
}

async function updateEntryNotes(boardId, userId, playerId, notes) {
  await assertOwnership(boardId, userId)

  const entry = await prisma.draftBoardEntry.findUnique({
    where: { boardId_playerId: { boardId, playerId } },
  })
  if (!entry) throw Object.assign(new Error('Entry not found'), { status: 404 })

  await prisma.draftBoardEntry.update({
    where: { id: entry.id },
    data: { notes },
  })

  return { success: true }
}

module.exports = {
  createBoard,
  listBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  saveEntries,
  addEntry,
  removeEntry,
  updateEntryNotes,
}
