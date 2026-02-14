const { calculateFantasyPoints } = require('./nflScoringService')
const prisma = require('../lib/prisma.js')

async function generateCheatSheet(userId, boardId) {
  // Verify ownership
  const board = await prisma.draftBoard.findUnique({ where: { id: boardId } })
  if (!board) throw Object.assign(new Error('Board not found'), { status: 404 })
  if (board.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  // Load entries with player data
  const entries = await prisma.draftBoardEntry.findMany({
    where: { boardId },
    orderBy: { rank: 'asc' },
    include: {
      player: {
        select: {
          id: true, name: true, nflPosition: true, nflTeamAbbr: true,
          headshotUrl: true, owgrRank: true, sgTotal: true,
        },
      },
    },
  })

  if (entries.length === 0) {
    throw Object.assign(new Error('Board has no entries'), { status: 400 })
  }

  // Load ADP/projections for divergence
  const playerIds = entries.map(e => e.playerId)
  const projections = await prisma.clutchProjection.findMany({
    where: {
      sport: board.sport,
      scoringFormat: board.sport === 'golf' ? 'overall' : board.scoringFormat,
      season: board.season,
      week: null,
      playerId: { in: playerIds },
    },
  })
  const projMap = new Map(projections.map(p => [p.playerId, p]))

  // Build overall rankings
  const overallRankings = entries.map((e, i) => {
    const proj = projMap.get(e.playerId)
    const adpRank = proj?.adpRank || proj?.clutchRank || null
    const gap = adpRank ? adpRank - (i + 1) : null // positive = value (ADP lower than your rank)

    return {
      rank: i + 1,
      playerId: e.playerId,
      name: e.player.name,
      position: e.player.nflPosition || null,
      team: e.player.nflTeamAbbr || null,
      headshotUrl: e.player.headshotUrl,
      adp: adpRank,
      gap,
      note: e.notes || null,
      tier: e.tier || Math.floor(i / 12) + 1,
      tags: e.tags || null,
    }
  })

  // Detect tier breaks (use existing tier or auto-detect from rank gaps)
  const tierBreaks = []
  for (let i = 1; i < overallRankings.length; i++) {
    if (overallRankings[i].tier !== overallRankings[i - 1].tier) {
      tierBreaks.push({ afterRank: overallRankings[i - 1].rank, tier: overallRankings[i - 1].tier })
    }
  }

  // Value picks: top 5 positive and negative divergences
  const withGap = overallRankings.filter(r => r.gap !== null)
  const sorted = [...withGap].sort((a, b) => b.gap - a.gap)
  const valuePicks = sorted.slice(0, 5).map(r => ({
    ...r, direction: 'value',
  }))
  const fades = sorted.slice(-5).reverse().map(r => ({
    ...r, direction: 'fade',
  }))

  // Position tiers
  const positionTiers = {}
  if (board.sport === 'nfl') {
    for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']) {
      const posPlayers = overallRankings.filter(r => r.position === pos)
      if (posPlayers.length === 0) continue
      const tiers = {}
      for (const p of posPlayers) {
        const t = p.tier || 1
        if (!tiers[t]) tiers[t] = []
        tiers[t].push(p)
      }
      positionTiers[pos] = tiers
    }
  }

  const contentJson = {
    overallRankings,
    tierBreaks,
    valuePicks,
    fades,
    positionTiers,
  }

  // Build title
  const scoring = board.scoringFormat === 'ppr' ? 'PPR' : board.scoringFormat === 'half_ppr' ? 'Half PPR' : 'Standard'
  const teamCountStr = board.teamCount ? `${board.teamCount}-Team` : ''
  const leagueTypeStr = board.leagueType ? board.leagueType.charAt(0).toUpperCase() + board.leagueType.slice(1) : ''
  const title = `Your ${board.season} Cheat Sheet${teamCountStr ? ' — ' + teamCountStr : ''}${scoring ? ' ' + scoring : ''}${leagueTypeStr ? ' ' + leagueTypeStr : ''}`

  const formatSettings = {
    showADP: true,
    showNotes: true,
    showBye: false,
    showTierBreaks: true,
  }

  // Upsert — one cheat sheet per board
  const existing = await prisma.labCheatSheet.findFirst({
    where: { userId, boardId },
  })

  let sheet
  if (existing) {
    sheet = await prisma.labCheatSheet.update({
      where: { id: existing.id },
      data: {
        title,
        contentJson,
        formatSettings,
        generatedAt: new Date(),
        reviewedAt: null,
        publishedAt: null,
      },
    })
  } else {
    sheet = await prisma.labCheatSheet.create({
      data: {
        userId,
        boardId,
        title,
        contentJson,
        formatSettings,
      },
    })
  }

  return sheet
}

async function getCheatSheet(userId, sheetId) {
  const sheet = await prisma.labCheatSheet.findUnique({
    where: { id: sheetId },
    include: { board: { select: { name: true, sport: true, scoringFormat: true, leagueType: true, teamCount: true, draftType: true } } },
  })
  if (!sheet) throw Object.assign(new Error('Cheat sheet not found'), { status: 404 })
  if (sheet.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })
  return sheet
}

async function updateCheatSheet(userId, sheetId, updates) {
  const sheet = await prisma.labCheatSheet.findUnique({ where: { id: sheetId } })
  if (!sheet) throw Object.assign(new Error('Cheat sheet not found'), { status: 404 })
  if (sheet.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const data = {}
  if (updates.formatSettings !== undefined) data.formatSettings = updates.formatSettings
  if (updates.contentJson !== undefined) data.contentJson = updates.contentJson
  if (updates.title !== undefined) data.title = updates.title
  data.reviewedAt = new Date()

  return prisma.labCheatSheet.update({ where: { id: sheetId }, data })
}

async function publishCheatSheet(userId, sheetId) {
  const sheet = await prisma.labCheatSheet.findUnique({ where: { id: sheetId } })
  if (!sheet) throw Object.assign(new Error('Cheat sheet not found'), { status: 404 })
  if (sheet.userId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 })

  const updated = await prisma.labCheatSheet.update({
    where: { id: sheetId },
    data: { publishedAt: new Date() },
  })

  // Mark the board as published
  await prisma.draftBoard.update({
    where: { id: sheet.boardId },
    data: { isPublished: true, publishedAt: new Date() },
  })

  return updated
}

async function getCheatSheetByBoard(userId, boardId) {
  return prisma.labCheatSheet.findFirst({
    where: { userId, boardId },
    include: { board: { select: { name: true, sport: true, scoringFormat: true } } },
  })
}

module.exports = {
  generateCheatSheet,
  getCheatSheet,
  updateCheatSheet,
  publishCheatSheet,
  getCheatSheetByBoard,
}
