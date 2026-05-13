const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { generateUniqueSlug, generateAdminToken } = require('../services/poolService')
const { sendPoolEmail } = require('../services/emailService')
const { authenticate, optionalAuth } = require('../middleware/auth')

/**
 * Admin gate: caller must be signed in AND be the pool's commissioner.
 *
 * Legacy token-in-URL is accepted as a fallback (back-compat for any old
 * admin links saved before this change) but is being phased out — the
 * client no longer surfaces it. Tokens that don't match the commissioner
 * user are rejected even if the token string is valid.
 */
async function requireAdmin(req, res, next) {
  const pool = await prisma.pool.findUnique({
    where: { slug: req.params.slug },
    select: { id: true, adminToken: true, commissionerUserId: true },
  })
  if (!pool) return res.status(404).json({ error: 'Pool not found' })

  // Path 1: authenticated commissioner
  if (req.user && pool.commissionerUserId && req.user.id === pool.commissionerUserId) {
    req.poolId = pool.id
    return next()
  }

  // Path 2: legacy token fallback (kept for any old saved URLs — will be removed later)
  const token = req.query.token || req.headers['x-admin-token']
  if (token && pool.adminToken === token) {
    req.poolId = pool.id
    return next()
  }

  return res.status(403).json({ error: 'Commissioner access required' })
}

// ─── PUBLIC: GET user's pools (commish + entered) ──────────────────────────
// IMPORTANT: must come BEFORE /:slug so Express doesn't match "mine" as a slug.
router.get('/mine', optionalAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.json({ commish: [], entered: [] })
    const [commish, entered] = await Promise.all([
      prisma.pool.findMany({
        where: { commissionerUserId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: { tournament: { select: { name: true, startDate: true } } },
      }),
      prisma.poolEntry.findMany({
        where: { userId: req.user.id },
        orderBy: { submittedAt: 'desc' },
        include: {
          pool: {
            include: { tournament: { select: { name: true, startDate: true } } },
          },
        },
      }),
    ])
    const commishShaped = commish.map(p => ({
      slug: p.slug,
      adminToken: p.adminToken,
      name: p.name,
      tournamentName: p.tournament?.name || '',
      status: p.status,
    }))
    const enteredShaped = entered.map(e => ({
      slug: e.pool.slug,
      teamName: e.teamName,
      poolName: e.pool.name,
      tournamentName: e.pool.tournament?.name || '',
      status: e.pool.status,
      totalFantasyPoints: e.totalFantasyPoints,
    }))
    res.json({ commish: commishShaped, entered: enteredShaped })
  } catch (e) { next(e) }
})

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

// ─── AUTHENTICATED: POST entry ─────────────────────────────────────────────
router.post('/:slug/entries', authenticate, async (req, res, next) => {
  try {
    const { teamName, tiebreakerScore, picks } = req.body
    const entrantName = req.user.name
    const entrantEmail = req.user.email
    if (!teamName || tiebreakerScore == null || !Array.isArray(picks)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (!/^[a-zA-Z0-9 _\-'.&!?]{2,30}$/.test(teamName)) {
      return res.status(400).json({ error: "Team name must be 2-30 chars (letters, numbers, spaces, and ' . - _ & ! ?)" })
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

    // Upsert: if user already has an entry in this pool, replace picks + update metadata.
    // (Pool is OPEN — we already gated above. Existing entries are not editable once LOCKED.)
    const existing = await prisma.poolEntry.findFirst({ where: { poolId: pool.id, userId: req.user.id } })

    if (existing) {
      const entry = await prisma.$transaction(async (tx) => {
        await tx.poolPick.deleteMany({ where: { entryId: existing.id } })
        return tx.poolEntry.update({
          where: { id: existing.id },
          data: {
            teamName,
            tiebreakerScore: parseInt(tiebreakerScore),
            picks: { create: picks.map(p => ({ tierId: p.tierId, playerId: p.playerId })) },
          },
          include: { picks: { include: { player: true, tier: true } } },
        })
      })
      return res.json({ entry, updated: true })
    }

    const entry = await prisma.poolEntry.create({
      data: {
        poolId: pool.id,
        userId: req.user.id,
        entrantName, entrantEmail, teamName,
        tiebreakerScore: parseInt(tiebreakerScore),
        picks: { create: picks.map(p => ({ tierId: p.tierId, playerId: p.playerId })) },
      },
      include: { picks: { include: { player: true, tier: true } } },
    })

    const baseUrl = process.env.FRONTEND_URL || 'https://clutchfantasysports.com'
    const summary = entry.picks.map(p => `<li style="margin:4px 0;">Tier ${p.tier.tierNumber}: <strong>${p.player.name}</strong></li>`).join('')
    sendPoolEmail({
      to: entrantEmail,
      subject: `You're in: ${pool.name}`,
      html: `
        <h2 style="margin:0 0 12px;color:#1E2A3A;">Picks locked for ${teamName}</h2>
        <p style="color:#444;">Your picks:</p>
        <ul style="color:#444;padding-left:20px;">${summary}</ul>
        <p style="color:#444;margin-top:16px;">Tiebreaker: <strong>${tiebreakerScore}</strong></p>
        <p style="margin:24px 0 0;"><a href="${baseUrl}/pools/${pool.slug}" style="color:#D4930D;font-weight:600;">Track the leaderboard →</a></p>
      `,
    }).catch(err => console.error('[Pool email] entry send failed:', err.message))

    res.status(201).json({ entry })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Team name already taken in this pool' })
    next(e)
  }
})

// ─── ADMIN: POST create pool ───────────────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, tournamentId, scoringPreset, tiers } = req.body
    const commissionerEmail = req.body.commissionerEmail || req.user.email
    if (!name || !tournamentId || !Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    for (const t of tiers) {
      if (typeof t.tierNumber !== 'number' || typeof t.picksRequired !== 'number' || !Array.isArray(t.playerIds)) {
        return res.status(400).json({ error: 'Each tier needs tierNumber, picksRequired, playerIds' })
      }
      if (t.playerIds.length < t.picksRequired) {
        return res.status(400).json({ error: `Tier ${t.tierNumber} has fewer players (${t.playerIds.length}) than picksRequired (${t.picksRequired})` })
      }
    }
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true } })
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' })

    const slug = await generateUniqueSlug()
    const adminToken = generateAdminToken()

    const pool = await prisma.pool.create({
      data: {
        slug, adminToken, name, tournamentId, commissionerEmail,
        commissionerUserId: req.user.id,
        scoringPreset: scoringPreset || 'standard',
        status: 'DRAFT',
        tiers: {
          create: tiers.map(t => ({
            tierNumber: t.tierNumber,
            label: t.label || null,
            picksRequired: t.picksRequired,
            players: { create: t.playerIds.map(pid => ({ playerId: pid })) },
          })),
        },
      },
    })

    const baseUrl = process.env.FRONTEND_URL || 'https://clutchfantasysports.com'
    sendPoolEmail({
      to: commissionerEmail,
      subject: `Your Clutch pool "${name}" is ready`,
      html: `
        <h2 style="margin:0 0 12px;color:#1E2A3A;">${name}</h2>
        <p style="color:#444;">Share this link with your friends so they can enter the pool:</p>
        <p style="margin:8px 0 24px;"><a href="${baseUrl}/pools/${pool.slug}" style="color:#D4930D;font-weight:600;">${baseUrl}/pools/${pool.slug}</a></p>
        <p style="color:#444;">Your private admin link — use this to publish, lock the pool, and view all entries:</p>
        <p style="margin:8px 0 24px;"><a href="${baseUrl}/pools/${pool.slug}/admin?token=${pool.adminToken}" style="color:#D4930D;font-weight:600;">${baseUrl}/pools/${pool.slug}/admin?token=${pool.adminToken}</a></p>
        <p style="color:#666;font-size:13px;">Keep the admin link private. Anyone with it can manage the pool.</p>
      `,
    }).catch(err => console.error('[Pool email] admin send failed:', err.message))

    res.status(201).json({ slug: pool.slug, adminToken: pool.adminToken })
  } catch (e) { next(e) }
})

// ─── ADMIN: POST publish (DRAFT → OPEN, computes locksAt) ─────────────────
router.post('/:slug/publish', optionalAuth, requireAdmin, async (req, res, next) => {
  try {
    const pool = await prisma.pool.findUnique({ where: { id: req.poolId }, include: { tournament: true } })
    // locksAt = earliest R1 tee time. Fall back to tournament startDate at 15:00 UTC (11 AM ET) if no tee time.
    const earliestR1 = await prisma.roundScore.findFirst({
      where: { tournamentId: pool.tournamentId, roundNumber: 1, teeTime: { not: null } },
      orderBy: { teeTime: 'asc' },
      select: { teeTime: true },
    })
    let locksAt = earliestR1?.teeTime
    if (!locksAt) {
      locksAt = new Date(pool.tournament.startDate)
      locksAt.setUTCHours(15)
    }

    const updated = await prisma.pool.update({
      where: { id: req.poolId },
      data: { status: 'OPEN', locksAt },
    })
    res.json({ pool: updated })
  } catch (e) { next(e) }
})

// ─── ADMIN: POST lock (OPEN → LOCKED) ──────────────────────────────────────
router.post('/:slug/lock', optionalAuth, requireAdmin, async (req, res, next) => {
  try {
    const updated = await prisma.pool.update({
      where: { id: req.poolId },
      data: { status: 'LOCKED' },
    })
    res.json({ pool: updated })
  } catch (e) { next(e) }
})

// ─── ADMIN: GET admin view (all entries + admin metadata) ─────────────────
router.get('/:slug/admin', optionalAuth, requireAdmin, async (req, res, next) => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.poolId },
      include: {
        tournament: true,
        tiers: { orderBy: { tierNumber: 'asc' }, include: { players: { include: { player: true } } } },
        entries: { include: { picks: { include: { player: true, tier: true } } } },
      },
    })
    res.json({ pool })
  } catch (e) { next(e) }
})

// ─── ADMIN: DELETE entry (DQ) ──────────────────────────────────────────────
router.delete('/:slug/entries/:entryId', optionalAuth, requireAdmin, async (req, res, next) => {
  try {
    await prisma.poolEntry.delete({ where: { id: req.params.entryId } })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// ─── ADMIN: PATCH tiers (DRAFT-only) ───────────────────────────────────────
// Replace the pool's tier structure. Only allowed while pool is DRAFT — once
// published or locked, tiers are frozen because entries reference them.
router.patch('/:slug/admin/tiers', optionalAuth, requireAdmin, async (req, res, next) => {
  try {
    const { tiers } = req.body
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({ error: 'Provide tiers as a non-empty array' })
    }
    const pool = await prisma.pool.findUnique({
      where: { id: req.poolId },
      select: { id: true, status: true, tournamentId: true },
    })
    if (!pool) return res.status(404).json({ error: 'Pool not found' })
    if (pool.status !== 'DRAFT') {
      return res.status(409).json({ error: `Tiers can only be edited while pool is DRAFT (current: ${pool.status.toLowerCase()})` })
    }

    for (const t of tiers) {
      if (typeof t.tierNumber !== 'number' || typeof t.picksRequired !== 'number' || !Array.isArray(t.playerIds)) {
        return res.status(400).json({ error: 'Each tier needs tierNumber, picksRequired, playerIds' })
      }
      if (t.playerIds.length < t.picksRequired) {
        return res.status(400).json({ error: `Tier ${t.tierNumber} has fewer players (${t.playerIds.length}) than picksRequired (${t.picksRequired})` })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.poolTier.deleteMany({ where: { poolId: pool.id } })
      for (const t of tiers) {
        await tx.poolTier.create({
          data: {
            poolId: pool.id,
            tierNumber: t.tierNumber,
            label: t.label || null,
            picksRequired: t.picksRequired,
            players: { create: t.playerIds.map(pid => ({ playerId: pid })) },
          },
        })
      }
    })

    res.json({ ok: true })
  } catch (e) { next(e) }
})

// ─── ADMIN: POST send invite emails ─────────────────────────────────────
router.post('/:slug/admin/invites', optionalAuth, requireAdmin, async (req, res, next) => {
  try {
    const { emails } = req.body
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Provide emails as an array of strings' })
    }
    const cleaned = emails
      .map(e => String(e).trim().toLowerCase())
      .filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
    const unique = Array.from(new Set(cleaned))
    if (unique.length === 0) return res.status(400).json({ error: 'No valid emails after parsing' })
    if (unique.length > 50) return res.status(400).json({ error: 'Max 50 emails per send' })

    const pool = await prisma.pool.findUnique({
      where: { id: req.poolId },
      include: { tournament: { select: { name: true } } },
    })
    const baseUrl = process.env.FRONTEND_URL || 'https://clutchfantasysports.com'
    const shareUrl = `${baseUrl}/pools/${pool.slug}`

    let sent = 0
    let failed = 0
    for (const to of unique) {
      const r = await sendPoolEmail({
        to,
        subject: `You're invited: ${pool.name}`,
        html: `
          <h2 style="margin:0 0 12px;color:#1E2A3A;">${pool.name}</h2>
          <p style="color:#444;">You've been invited to join a tiered pick'em pool for the <strong>${pool.tournament?.name || 'tournament'}</strong>.</p>
          <p style="color:#444;">Pick one golfer from each tier, set a tiebreaker, and watch the leaderboard during play.</p>
          <p style="margin:24px 0;">
            <a href="${shareUrl}" style="display:inline-block;background:#F06820;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">Enter the pool →</a>
          </p>
          <p style="color:#666;font-size:13px;">Or copy this link: <a href="${shareUrl}" style="color:#D4930D;">${shareUrl}</a></p>
        `,
      }).catch(err => ({ error: err.message }))
      if (r?.sent) sent++
      else failed++
    }
    res.json({ sent, failed, total: unique.length })
  } catch (e) { next(e) }
})

module.exports = router
