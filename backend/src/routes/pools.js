const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { generateUniqueSlug, generateAdminToken } = require('../services/poolService')

// ─── PUBLIC: GET pool by slug ──────────────────────────────────────────────
router.get('/:slug', async (req, res, next) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { slug: req.params.slug },
      include: {
        tournament: { include: { course: true } },
        tiers: {
          orderBy: { tierNumber: 'asc' },
          include: {
            players: {
              include: {
                player: {
                  select: {
                    id: true, name: true, country: true, countryFlag: true,
                    headshotUrl: true, owgrRank: true, primaryTour: true,
                    sgTotal: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!pool) return res.status(404).json({ error: 'Pool not found' })

    // Strip admin token from public response
    const { adminToken, commissionerEmail, ...publicPool } = pool
    res.json({ pool: publicPool })
  } catch (e) { next(e) }
})

// ─── PUBLIC: GET leaderboard ───────────────────────────────────────────────
router.get('/:slug/leaderboard', async (req, res, next) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, status: true, tournamentId: true },
    })
    if (!pool) return res.status(404).json({ error: 'Pool not found' })

    const [entries, winner] = await Promise.all([
      prisma.poolEntry.findMany({
        where: { poolId: pool.id },
        include: {
          picks: {
            include: {
              player: { select: { id: true, name: true, countryFlag: true, headshotUrl: true } },
              tier: { select: { tierNumber: true, label: true } },
            },
          },
        },
      }),
      // Tournament leader (lowest totalToPar) for tiebreaker resolution
      prisma.performance.findFirst({
        where: { tournamentId: pool.tournamentId, status: { not: 'WD' } },
        orderBy: [{ position: 'asc' }],
        select: { totalToPar: true },
      }),
    ])
    const actualWinningScore = winner?.totalToPar ?? null

    const ranked = entries
      .map(e => ({
        ...e,
        tiebreakerDiff: actualWinningScore == null ? null : Math.abs((e.tiebreakerScore ?? 0) - actualWinningScore),
      }))
      .sort((a, b) => {
        if (a.totalFantasyPoints !== b.totalFantasyPoints) return b.totalFantasyPoints - a.totalFantasyPoints
        if (a.tiebreakerDiff != null && b.tiebreakerDiff != null && a.tiebreakerDiff !== b.tiebreakerDiff) {
          return a.tiebreakerDiff - b.tiebreakerDiff
        }
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      })

    res.json({ leaderboard: ranked, status: pool.status, actualWinningScore })
  } catch (e) { next(e) }
})

// ─── PUBLIC: POST entry ────────────────────────────────────────────────────
router.post('/:slug/entries', async (req, res, next) => {
  try {
    const { entrantName, entrantEmail, teamName, tiebreakerScore, picks } = req.body
    if (!entrantName || !entrantEmail || !teamName || tiebreakerScore == null || !Array.isArray(picks)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (!/^[a-zA-Z0-9 _-]{2,30}$/.test(teamName)) {
      return res.status(400).json({ error: 'Team name must be 2-30 chars, letters/numbers/space/_/- only' })
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entrantEmail)) {
      return res.status(400).json({ error: 'Invalid email' })
    }

    const pool = await prisma.pool.findUnique({
      where: { slug: req.params.slug },
      include: { tiers: { include: { players: true } } },
    })
    if (!pool) return res.status(404).json({ error: 'Pool not found' })
    if (pool.status !== 'OPEN') return res.status(409).json({ error: `Pool is ${pool.status.toLowerCase()}, not accepting entries` })

    // Validate exactly picksRequired per tier, all picks belong to the tier
    const picksByTier = new Map()
    for (const p of picks) {
      if (!picksByTier.has(p.tierId)) picksByTier.set(p.tierId, [])
      picksByTier.get(p.tierId).push(p.playerId)
    }
    for (const tier of pool.tiers) {
      const tierPicks = picksByTier.get(tier.id) || []
      if (tierPicks.length !== tier.picksRequired) {
        return res.status(400).json({ error: `Tier ${tier.tierNumber}: need ${tier.picksRequired} pick(s), got ${tierPicks.length}` })
      }
      const validPlayerIds = new Set(tier.players.map(tp => tp.playerId))
      for (const pid of tierPicks) {
        if (!validPlayerIds.has(pid)) {
          return res.status(400).json({ error: `Player ${pid} is not in tier ${tier.tierNumber}` })
        }
      }
    }

    const entry = await prisma.poolEntry.create({
      data: {
        poolId: pool.id,
        entrantName, entrantEmail, teamName,
        tiebreakerScore: parseInt(tiebreakerScore),
        picks: { create: picks.map(p => ({ tierId: p.tierId, playerId: p.playerId })) },
      },
      include: { picks: { include: { player: true, tier: true } } },
    })

    res.status(201).json({ entry })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Team name already taken in this pool' })
    next(e)
  }
})

module.exports = router
