const { PrismaClient } = require('@prisma/client')
const { calculateFantasyPoints } = require('./nflScoringService')
const prisma = new PrismaClient()

// ── Helpers ──────────────────────────────────────────────────────────────────

function enrichPlayer(player, sport, extras = {}) {
  if (!player) return null
  if (sport === 'nfl') {
    return {
      id: player.id,
      name: player.name,
      headshotUrl: player.headshotUrl,
      position: player.nflPosition,
      team: player.nflTeamAbbr,
      fantasyPts: extras.fantasyPts ?? null,
      gamesPlayed: extras.gamesPlayed ?? null,
      fantasyPtsPerGame: extras.fantasyPtsPerGame ?? null,
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
    cpi: extras.cpi ?? null,
    formScore: extras.formScore ?? null,
    pressureScore: extras.pressureScore ?? null,
  }
}

// Batch-load ClutchScore weekly snapshots for golf players
async function batchLoadClutchScores(playerIds) {
  if (playerIds.length === 0) return new Map()
  const scores = await prisma.clutchScore.findMany({
    where: { playerId: { in: playerIds }, tournamentId: null },
    orderBy: { computedAt: 'desc' },
    distinct: ['playerId'],
    select: { playerId: true, cpi: true, formScore: true, pressureScore: true },
  })
  return new Map(scores.map(s => [s.playerId, s]))
}

// Batch-load NFL fantasy stats for a season + scoring format
async function batchLoadNflFantasyStats(playerIds, scoringFormat) {
  if (playerIds.length === 0) return new Map()
  const games = await prisma.nflPlayerGame.findMany({
    where: { playerId: { in: playerIds } },
    include: { game: { select: { season: true } } },
  })
  // Group by player, filter to most recent season
  const byPlayer = new Map()
  for (const g of games) {
    if (!byPlayer.has(g.playerId)) byPlayer.set(g.playerId, [])
    byPlayer.get(g.playerId).push(g)
  }
  const result = new Map()
  for (const [pid, playerGames] of byPlayer) {
    // Use the latest season available
    const maxSeason = Math.max(...playerGames.map(g => g.game.season))
    const seasonGames = playerGames.filter(g => g.game.season === maxSeason)
    let totalPts = 0
    for (const g of seasonGames) {
      const { total } = calculateFantasyPoints(g, scoringFormat || 'half_ppr')
      totalPts += total
    }
    const gp = seasonGames.length
    result.set(pid, {
      fantasyPts: Math.round(totalPts * 10) / 10,
      gamesPlayed: gp,
      fantasyPtsPerGame: gp > 0 ? Math.round((totalPts / gp) * 10) / 10 : 0,
    })
  }
  return result
}

async function assertOwnership(boardId, userId) {
  const board = await prisma.draftBoard.findUnique({ where: { id: boardId } })
  if (!board) throw Object.assign(new Error('Board not found'), { status: 404 })
  if (board.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  return board
}

// ── Activity Logging ─────────────────────────────────────────────────────────

async function logActivity(boardId, userId, action, playerId, details) {
  try {
    await prisma.boardActivity.create({
      data: { boardId, userId, action, playerId, details },
    })
  } catch (err) {
    // Non-fatal — don't break board ops for logging failures
    console.error('[logActivity] Failed:', err.message)
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

async function createBoard(userId, { name, sport = 'nfl', scoringFormat = 'ppr', boardType = 'overall', season = 2026, startFrom = 'scratch', leagueType, teamCount, draftType, rosterConfig }) {
  // Create the board first
  const board = await prisma.draftBoard.create({
    data: {
      userId, name, sport, scoringFormat, boardType, season,
      ...(leagueType && { leagueType }),
      ...(teamCount && { teamCount }),
      ...(draftType && { draftType }),
      ...(rosterConfig && { rosterConfig }),
    },
  })

  // Log board creation
  logActivity(board.id, userId, 'board_created', null, { name, sport, scoringFormat, startFrom })

  // Pre-populate entries based on startFrom option
  if (startFrom === 'clutch' || startFrom === 'adp') {
    try {
      const format = sport === 'golf' ? 'overall' : scoringFormat
      const rankings = await prisma.clutchProjection.findMany({
        where: { sport, scoringFormat: format, season, week: null },
        orderBy: startFrom === 'adp' && sport === 'nfl'
          ? { adpRank: 'asc' }
          : { clutchRank: 'asc' },
        take: boardType === 'overall' ? 200 : 60,
      })

      // Filter by position if board is position-specific
      let filtered = rankings
      if (boardType !== 'overall' && sport === 'nfl') {
        const posMap = { qb: 'QB', rb: 'RB', wr: 'WR', te: 'TE', k: 'K', def: 'DEF' }
        const posFilter = posMap[boardType]
        if (posFilter) {
          filtered = rankings.filter(r => r.position === posFilter)
        }
      }

      // Auto-assign tiers: every ~12 players in a new tier for overall boards
      const tierSize = boardType === 'overall' ? 12 : 8

      if (filtered.length > 0) {
        const batchSize = 50
        for (let i = 0; i < filtered.length; i += batchSize) {
          const batch = filtered.slice(i, i + batchSize)
          await prisma.draftBoardEntry.createMany({
            data: batch.map((r, j) => ({
              boardId: board.id,
              playerId: r.playerId,
              rank: i + j + 1,
              tier: Math.floor((i + j) / tierSize) + 1,
              baselineRank: i + j + 1, // Baseline = starting rank from projections
            })),
          })
        }
      }
    } catch (err) {
      // Non-fatal — board was created, just empty
      console.error('[createBoard] Failed to pre-populate from projections:', err.message)
    }
  } else if (startFrom === 'previous') {
    try {
      // Copy entries from user's most recent board in this sport (that has entries)
      const prevBoard = await prisma.draftBoard.findFirst({
        where: { userId, sport, id: { not: board.id }, entries: { some: {} } },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      })
      if (prevBoard) {
        const prevEntries = await prisma.draftBoardEntry.findMany({
          where: { boardId: prevBoard.id },
          orderBy: { rank: 'asc' },
        })
        if (prevEntries.length > 0) {
          await prisma.draftBoardEntry.createMany({
            data: prevEntries.map((e, i) => ({
              boardId: board.id,
              playerId: e.playerId,
              rank: i + 1,
              tier: e.tier,
              notes: e.notes,
              tags: e.tags,
              reasonChips: e.reasonChips,
              baselineRank: e.baselineRank,
            })),
          })
        }
      }
    } catch (err) {
      console.error('[createBoard] Failed to copy from previous board:', err.message)
    }
  }
  // startFrom === 'scratch' — no entries, board is empty (default behavior)

  return board
}

async function listBoards(userId) {
  const boards = await prisma.draftBoard.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { entries: true } },
      entries: {
        select: { player: { select: { nflPosition: true } } },
      },
    },
  })
  return boards.map(b => {
    // Compute position coverage for NFL boards
    let positionCoverage = null
    if (b.sport === 'nfl' && b.entries.length > 0) {
      const positions = b.entries.map(e => e.player?.nflPosition).filter(Boolean)
      const posSet = new Set(positions)
      const tracked = ['QB', 'RB', 'WR', 'TE']
      positionCoverage = {
        covered: tracked.filter(p => posSet.has(p)).length,
        total: tracked.length,
        positions: Object.fromEntries(tracked.map(p => [p, positions.filter(pos => pos === p).length])),
      }
    }
    return {
      id: b.id,
      name: b.name,
      sport: b.sport,
      scoringFormat: b.scoringFormat,
      boardType: b.boardType,
      season: b.season,
      isPublished: b.isPublished,
      leagueType: b.leagueType,
      teamCount: b.teamCount,
      draftType: b.draftType,
      playerCount: b._count.entries,
      positionCoverage,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }
  })
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

  // Batch-load enrichment data based on sport
  let extrasMap = new Map()
  if (board.sport === 'golf' && playerIds.length > 0) {
    extrasMap = await batchLoadClutchScores(playerIds)
  } else if (board.sport === 'nfl' && playerIds.length > 0) {
    extrasMap = await batchLoadNflFantasyStats(playerIds, board.scoringFormat)
  }

  const enrichedEntries = entries.map(e => ({
    playerId: e.playerId,
    rank: e.rank,
    tier: e.tier,
    notes: e.notes,
    tags: e.tags,
    reasonChips: e.reasonChips,
    baselineRank: e.baselineRank,
    player: enrichPlayer(playerMap.get(e.playerId), board.sport, extrasMap.get(e.playerId) || {}),
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
  const allowed = ['name', 'scoringFormat', 'boardType', 'isPublished', 'leagueType', 'teamCount', 'draftType', 'rosterConfig']
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
          tags: e.tags ?? null,
          reasonChips: e.reasonChips ?? null,
          baselineRank: e.baselineRank ?? null,
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

  // Log activity
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { name: true } })
  logActivity(boardId, userId, 'player_added', playerId, { playerName: player?.name, rank: nextRank })

  return getBoard(boardId, userId)
}

async function removeEntry(boardId, userId, playerId) {
  await assertOwnership(boardId, userId)

  // Get entry info before deleting for activity log
  const entry = await prisma.draftBoardEntry.findFirst({
    where: { boardId, playerId },
    select: { rank: true },
  })
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { name: true } })

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
      remaining.map((e, i) =>
        prisma.draftBoardEntry.update({
          where: { id: e.id },
          data: { rank: i + 1 },
        })
      )
    )
  }

  logActivity(boardId, userId, 'player_removed', playerId, { playerName: player?.name, rank: entry?.rank })

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

  // Log activity
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { name: true } })
  logActivity(boardId, userId, 'note_added', playerId, { playerName: player?.name, note: notes?.substring(0, 100) })

  return { success: true }
}

// ── Activity Log + Journal ──────────────────────────────────────────────────

async function logMoveActivity(boardId, userId, playerId, playerName, fromRank, toRank, tags, reasonChips) {
  const delta = fromRank - toRank
  logActivity(boardId, userId, 'player_moved', playerId, {
    playerName,
    from: fromRank,
    to: toRank,
    delta,
    tags: tags || [],
    reasonChips: reasonChips || [],
  })
}

async function logTagActivity(boardId, userId, playerId, playerName, tags) {
  logActivity(boardId, userId, 'player_tagged', playerId, {
    playerName,
    tags,
  })
}

async function getBoardActivities(boardId, userId) {
  await assertOwnership(boardId, userId)
  return prisma.boardActivity.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}

async function getUserJournal(userId, { sport, limit = 100 } = {}) {
  const where = { userId }
  if (sport) {
    const boards = await prisma.draftBoard.findMany({
      where: { userId, sport },
      select: { id: true },
    })
    where.boardId = { in: boards.map(b => b.id) }
  }
  const activities = await prisma.boardActivity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      board: { select: { name: true, sport: true } },
    },
  })
  return activities
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
  logMoveActivity,
  logTagActivity,
  getBoardActivities,
  getUserJournal,
}
