/**
 * NFL Prep API routes (DS-12).
 *
 * Phase 5 of the NFL Data Spine. Consumes the data populated by DS-1..DS-11
 * (NflTeam, NflCoachingStaff, NflRosterSlot, NflTeamUnitRank,
 * NflPlayerProjection, PrepQuizCard, PrepQuizReview, PrepUserSettings).
 *
 * All routes are authenticated. The admin force-refresh endpoint is
 * additionally gated by requireAdmin.
 */

const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { requireAdmin } = require('../middleware/requireAdmin')
const prisma = require('../lib/prisma')
const { getDueCardsForUser, recordReview } = require('../services/prep/quizSession')
const { syncCurrentRosters } = require('../services/prep/nflRosterSync')
const { syncCoachingStaff } = require('../services/prep/nflCoachingSync')
const { syncUnitRanks } = require('../services/prep/nflUnitRankSync')
const { regenerateAllCards } = require('../services/prep/quizCardGenerator')

// Position priority for sort/cap in /changes — surface QBs first so they
// don't get drowned out by WR/TE volume when we cap the list at 100.
const POSITION_ORDER = { QB: 0, RB: 1, WR: 2, TE: 3, K: 4, DST: 5 }
const positionRank = (pos) =>
  POSITION_ORDER[pos] !== undefined ? POSITION_ORDER[pos] : 99

router.use(authenticate)

/**
 * GET /api/prep/teams
 *
 * Returns all 32 teams with a small summary tile shape: identity + current
 * 2026 head/offensive/defensive coordinators + latest (2025) OL/DL ranks +
 * year-over-year deltas (2025 - 2024). Negative delta = improved (rank went
 * down, which is better — rank 1 is best).
 *
 * Bulk-loaded: one query each for teams / coaching staff / unit ranks; stitch
 * in JS to avoid N+1.
 */
router.get('/teams', async (req, res) => {
  try {
    const [teams, staff, ranks] = await Promise.all([
      prisma.nflTeam.findMany({
        orderBy: [{ conference: 'asc' }, { division: 'asc' }, { abbreviation: 'asc' }],
      }),
      prisma.nflCoachingStaff.findMany({ where: { season: 2026 } }),
      prisma.nflTeamUnitRank.findMany({ where: { season: { in: [2024, 2025] } } }),
    ])

    // Index coaching staff: teamId -> { HC, OC, DC, hcIsNewFor2026 }
    // Source data doesn't reliably populate hiredAt (GridironExperts scrape
    // doesn't expose hire dates), so for v1 we hardcode the 2026 new-hire
    // team set against the names we know from the offseason cycle. When a
    // future sync source carries real hiredAt values, swap this out for a
    // date comparison.
    const NEW_FOR_2026_HC_TEAM_ABBRS = new Set([
      'BUF', 'CHI', 'DAL', 'NE', 'NO', 'NYG', 'NYJ', 'PIT',
    ])
    const teamAbbrByIdLocal = new Map(teams.map((t) => [t.id, t.abbreviation]))
    const staffByTeam = new Map()
    for (const row of staff) {
      const entry = staffByTeam.get(row.teamId) || {}
      entry[row.role] = row.name
      if (row.role === 'HC') {
        const abbr = teamAbbrByIdLocal.get(row.teamId)
        entry.hcIsNewFor2026 = NEW_FOR_2026_HC_TEAM_ABBRS.has(abbr)
      }
      staffByTeam.set(row.teamId, entry)
    }

    // Index ranks: teamId -> { OL: {2024, 2025}, DL: {2024, 2025} }
    const ranksByTeam = new Map()
    for (const row of ranks) {
      const entry = ranksByTeam.get(row.teamId) || { OL: {}, DL: {} }
      if (entry[row.unit]) entry[row.unit][row.season] = row.rank
      ranksByTeam.set(row.teamId, entry)
    }

    const result = teams.map((t) => {
      const s = staffByTeam.get(t.id) || {}
      const r = ranksByTeam.get(t.id) || { OL: {}, DL: {} }
      const olRank = r.OL[2025] ?? null
      const dlRank = r.DL[2025] ?? null
      const ol2024 = r.OL[2024] ?? null
      const dl2024 = r.DL[2024] ?? null
      return {
        id: t.id,
        abbreviation: t.abbreviation,
        city: t.city,
        name: t.name,
        conference: t.conference,
        division: t.division,
        hcName: s.HC ?? null,
        ocName: s.OC ?? null,
        dcName: s.DC ?? null,
        hcIsNewFor2026: s.hcIsNewFor2026 ?? false,
        olRank,
        dlRank,
        olRankDelta: olRank != null && ol2024 != null ? olRank - ol2024 : null,
        dlRankDelta: dlRank != null && dl2024 != null ? dlRank - dl2024 : null,
      }
    })

    res.json({ teams: result })
  } catch (e) {
    console.error('[prep] GET /teams failed:', e.message)
    res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/prep/teams/:abbr
 *
 * Full team detail page payload — identity + 2026 coaching trio + per-season
 * unit ranks (2023/2024/2025) + current roster joined to projections.
 *
 * 404 if abbr doesn't match a known team.
 */
router.get('/teams/:abbr', async (req, res) => {
  const abbr = req.params.abbr.toUpperCase()
  try {
    const team = await prisma.nflTeam.findUnique({ where: { abbreviation: abbr } })
    if (!team) {
      return res.status(404).json({ error: `Unknown team: ${abbr}` })
    }

    const [staff, ranks, rosterSlots] = await Promise.all([
      prisma.nflCoachingStaff.findMany({
        where: { teamId: team.id, season: 2026 },
      }),
      prisma.nflTeamUnitRank.findMany({
        where: { teamId: team.id, season: { in: [2023, 2024, 2025] } },
      }),
      prisma.nflRosterSlot.findMany({
        where: { teamId: team.id, snapshotType: 'current' },
        include: { player: true },
      }),
    ])

    // Coaching trio
    const coaching = { hc: null, oc: null, dc: null }
    for (const row of staff) {
      const key = row.role.toLowerCase() // HC -> hc, etc.
      if (key === 'hc' || key === 'oc' || key === 'dc') {
        coaching[key] = {
          name: row.name,
          previousTeamAbbr: row.previousTeamAbbr,
          previousRole: row.previousRole,
          hiredAt: row.hiredAt,
        }
      }
    }

    // Ranks indexed by season
    const ranksOut = { 2023: { olRank: null, dlRank: null }, 2024: { olRank: null, dlRank: null }, 2025: { olRank: null, dlRank: null } }
    for (const row of ranks) {
      const bucket = ranksOut[row.season]
      if (!bucket) continue
      if (row.unit === 'OL') bucket.olRank = row.rank
      else if (row.unit === 'DL') bucket.dlRank = row.rank
    }

    // Pull projections for this team's players in one query
    const playerIds = rosterSlots.map((s) => s.playerId)
    const projections = playerIds.length
      ? await prisma.nflPlayerProjection.findMany({
          where: {
            playerId: { in: playerIds },
            season: 2026,
            scoringType: 'ppr',
            source: 'sleeper_consensus',
          },
        })
      : []
    const projByPlayer = new Map(projections.map((p) => [p.playerId, p]))

    const roster = rosterSlots
      .map((slot) => {
        const proj = projByPlayer.get(slot.playerId)
        return {
          playerId: slot.playerId,
          name: slot.player?.name ?? null,
          position: slot.position,
          depthRank: slot.depthRank,
          status: slot.status,
          projection: proj
            ? {
                projectedPoints: proj.projectedPoints,
                adp: proj.adp,
                positionRank: proj.positionRank,
              }
            : null,
        }
      })
      .sort((a, b) => {
        const pr = positionRank(a.position) - positionRank(b.position)
        if (pr !== 0) return pr
        return (a.depthRank ?? 99) - (b.depthRank ?? 99)
      })

    res.json({
      team: {
        id: team.id,
        abbreviation: team.abbreviation,
        city: team.city,
        name: team.name,
        conference: team.conference,
        division: team.division,
      },
      coaching,
      ranks: ranksOut,
      roster,
    })
  } catch (e) {
    console.error(`[prep] GET /teams/${abbr} failed:`, e.message)
    res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/prep/changes
 *
 * "What Changed" — compares the end_of_2025_season roster snapshot against
 * the current snapshot. End-of-2025 is the *actual* 2026 offseason anchor:
 * who was where when 2025 ended, vs. who's where now (with the 2026 offseason
 * shuffle baked in). Plus 2024 → 2025 unit rank movement.
 *
 * Response shape:
 *   playerMoves: one row per player who changed teams. Includes both endpoints
 *     so the frontend can render a single "FROM → TO" line. Players whose
 *     destination is unknown (departed and unsigned) are excluded — without a
 *     concrete TO, the move is too speculative to surface in v1.
 *   unitRankMovers: teams whose OL/DL rank moved >=5 spots 2024 → 2025.
 */
router.get('/changes', async (req, res) => {
  try {
    const [teams, currentRoster, eoy2025Roster, ranks2024, ranks2025] = await Promise.all([
      prisma.nflTeam.findMany(),
      prisma.nflRosterSlot.findMany({
        where: { snapshotType: 'current' },
        include: { player: true },
      }),
      prisma.nflRosterSlot.findMany({
        where: { snapshotType: 'end_of_2025_season' },
        include: { player: true },
      }),
      prisma.nflTeamUnitRank.findMany({ where: { season: 2024 } }),
      prisma.nflTeamUnitRank.findMany({ where: { season: 2025 } }),
    ])

    const teamAbbrById = new Map(teams.map((t) => [t.id, t.abbreviation]))

    // Build playerId -> snapshot for each side.
    const currentByPlayer = new Map()
    for (const s of currentRoster) currentByPlayer.set(s.playerId, s)
    const eoy2025ByPlayer = new Map()
    for (const s of eoy2025Roster) eoy2025ByPlayer.set(s.playerId, s)

    // Single move per player. Each row carries both endpoints so the
    // frontend doesn't have to dedupe.
    const playerMoves = []
    for (const [playerId, prev] of eoy2025ByPlayer) {
      const curr = currentByPlayer.get(playerId)
      if (!curr) continue // left the league or not yet signed — skip
      if (curr.teamId === prev.teamId) continue // stayed put
      const fromAbbr = teamAbbrById.get(prev.teamId) ?? null
      const toAbbr = teamAbbrById.get(curr.teamId) ?? null
      if (!fromAbbr || !toAbbr) continue
      playerMoves.push({
        player: {
          id: playerId,
          name: prev.player?.name ?? curr.player?.name ?? null,
          position: prev.position ?? curr.position,
        },
        fromTeamAbbr: fromAbbr,
        toTeamAbbr: toAbbr,
      })
    }

    // Sort by position priority then alphabetical so QB moves surface first.
    playerMoves.sort((a, b) => {
      const pr = positionRank(a.player.position) - positionRank(b.player.position)
      if (pr !== 0) return pr
      return (a.player.name ?? '').localeCompare(b.player.name ?? '')
    })
    const cappedMoves = playerMoves.slice(0, 80)

    // Unit rank movers: |2025 - 2024| >= 5
    const rank2024ByKey = new Map()
    for (const r of ranks2024) rank2024ByKey.set(`${r.teamId}::${r.unit}`, r.rank)
    const unitRankMovers = []
    for (const r of ranks2025) {
      const prev = rank2024ByKey.get(`${r.teamId}::${r.unit}`)
      if (prev == null) continue
      const delta = r.rank - prev
      if (Math.abs(delta) < 5) continue
      const abbr = teamAbbrById.get(r.teamId) ?? null
      unitRankMovers.push({
        teamAbbr: abbr,
        unit: r.unit,
        from: prev,
        to: r.rank,
        delta,
      })
    }
    unitRankMovers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

    res.json({
      playerMoves: cappedMoves,
      unitRankMovers,
    })
  } catch (e) {
    console.error('[prep] GET /changes failed:', e.message)
    res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/prep/quiz/due
 *
 * Thin wrapper around quizSession.getDueCardsForUser. Returns the user's due
 * cards plus their current settings (focusMode, cardsPerDay, streak data).
 *
 * Creates a default PrepUserSettings row if none exists so the response is
 * always populated.
 */
router.get('/quiz/due', async (req, res) => {
  const userId = req.user.id
  try {
    const cards = await getDueCardsForUser(userId)
    let settings = await prisma.prepUserSettings.findUnique({ where: { userId } })
    if (!settings) {
      settings = await prisma.prepUserSettings.create({ data: { userId } })
    }
    res.json({
      cards,
      settings: {
        focusMode: settings.focusMode,
        cardsPerDay: settings.cardsPerDay,
        currentStreak: settings.currentStreak,
        longestStreak: settings.longestStreak,
      },
    })
  } catch (e) {
    console.error('[prep] GET /quiz/due failed:', e.message)
    res.status(500).json({ error: e.message })
  }
})

/**
 * POST /api/prep/quiz/review
 * Body: { cardId: string, quality: 0|1|2|3 }
 *
 * Records a review via SM-2 and updates the user's streak. Returns the
 * upserted PrepQuizReview row plus the user's updated streak state.
 */
router.post('/quiz/review', async (req, res) => {
  const userId = req.user.id
  const { cardId, quality } = req.body || {}

  if (typeof cardId !== 'string' || !cardId) {
    return res.status(400).json({ error: 'cardId must be a non-empty string' })
  }
  if (!Number.isInteger(quality) || quality < 0 || quality > 3) {
    return res.status(400).json({ error: 'quality must be an integer between 0 and 3' })
  }

  try {
    const review = await recordReview(userId, cardId, quality)
    const settings = await prisma.prepUserSettings.findUnique({ where: { userId } })
    res.json({
      review: {
        interval: review.interval,
        easeFactor: review.easeFactor,
        repetitions: review.repetitions,
        dueDate: review.dueDate,
        correctCount: review.correctCount,
        incorrectCount: review.incorrectCount,
      },
      settings: {
        currentStreak: settings?.currentStreak ?? 0,
        longestStreak: settings?.longestStreak ?? 0,
        lastQuizDate: settings?.lastQuizDate ?? null,
      },
    })
  } catch (e) {
    console.error('[prep] POST /quiz/review failed:', e.message)
    res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/prep/quiz/settings
 *
 * Returns the user's PrepUserSettings row, creating defaults if missing.
 */
router.get('/quiz/settings', async (req, res) => {
  const userId = req.user.id
  try {
    let settings = await prisma.prepUserSettings.findUnique({ where: { userId } })
    if (!settings) {
      settings = await prisma.prepUserSettings.create({ data: { userId } })
    }
    res.json({
      focusMode: settings.focusMode,
      cardsPerDay: settings.cardsPerDay,
      currentStreak: settings.currentStreak,
      longestStreak: settings.longestStreak,
      lastQuizDate: settings.lastQuizDate,
    })
  } catch (e) {
    console.error('[prep] GET /quiz/settings failed:', e.message)
    res.status(500).json({ error: e.message })
  }
})

const FOCUS_MODE_DIVISION_RE = /^(AFC|NFC)_(EAST|WEST|NORTH|SOUTH)$/

/**
 * PATCH /api/prep/quiz/settings
 * Body: { focusMode?: string|null, cardsPerDay?: number }
 *
 * Validates focusMode against the accepted set ('AFC' | 'NFC' | division
 * combos | null) and cardsPerDay (integer 1..50). Upserts the user's settings.
 */
router.patch('/quiz/settings', async (req, res) => {
  const userId = req.user.id
  const { focusMode, cardsPerDay } = req.body || {}

  const updates = {}
  if (focusMode !== undefined) {
    if (focusMode === null) {
      updates.focusMode = null
    } else if (typeof focusMode === 'string') {
      if (focusMode === 'AFC' || focusMode === 'NFC' || FOCUS_MODE_DIVISION_RE.test(focusMode)) {
        updates.focusMode = focusMode
      } else {
        return res.status(400).json({
          error: "focusMode must be null, 'AFC', 'NFC', or a division like 'AFC_EAST'",
        })
      }
    } else {
      return res.status(400).json({
        error: "focusMode must be null, 'AFC', 'NFC', or a division like 'AFC_EAST'",
      })
    }
  }
  if (cardsPerDay !== undefined) {
    if (!Number.isInteger(cardsPerDay) || cardsPerDay < 1 || cardsPerDay > 50) {
      return res.status(400).json({ error: 'cardsPerDay must be an integer between 1 and 50' })
    }
    updates.cardsPerDay = cardsPerDay
  }

  try {
    const settings = await prisma.prepUserSettings.upsert({
      where: { userId },
      create: { userId, ...updates },
      update: updates,
    })
    res.json({
      focusMode: settings.focusMode,
      cardsPerDay: settings.cardsPerDay,
      currentStreak: settings.currentStreak,
      longestStreak: settings.longestStreak,
      lastQuizDate: settings.lastQuizDate,
    })
  } catch (e) {
    console.error('[prep] PATCH /quiz/settings failed:', e.message)
    res.status(500).json({ error: e.message })
  }
})

/**
 * POST /api/prep/admin/force-refresh
 *
 * Admin-only. Runs the four prep syncs synchronously in order:
 *   1. Roster sync (current snapshot)
 *   2. Coaching staff (season=2026)
 *   3. Unit ranks (2023/2024/2025)
 *   4. Quiz card regeneration
 *
 * Each step is timed and its error caught so one failure doesn't block the
 * subsequent steps. The response always returns ok:true with a per-step
 * stats|error breakdown so the admin UI can render which steps succeeded.
 */
router.post('/admin/force-refresh', requireAdmin, async (req, res) => {
  const steps = []

  const runStep = async (name, fn) => {
    const startedAt = Date.now()
    try {
      const stats = await fn()
      steps.push({ name, durationMs: Date.now() - startedAt, stats: stats ?? null })
    } catch (e) {
      console.error(`[prep] admin/force-refresh step "${name}" failed:`, e)
      steps.push({ name, durationMs: Date.now() - startedAt, error: e.message })
    }
  }

  try {
    await runStep('roster', () => syncCurrentRosters({ db: prisma }))
    await runStep('coaching', () => syncCoachingStaff({ db: prisma, season: 2026 }))
    await runStep('ranks', () => syncUnitRanks({ db: prisma, seasons: [2023, 2024, 2025] }))
    await runStep('cards', () => regenerateAllCards({ db: prisma }))
    res.json({ ok: true, steps })
  } catch (e) {
    // Should be unreachable — runStep swallows per-step errors — but guard
    // against an orchestrator-level failure just in case.
    console.error('[prep] POST /admin/force-refresh failed:', e.message)
    res.status(500).json({ error: e.message, steps })
  }
})

module.exports = router
