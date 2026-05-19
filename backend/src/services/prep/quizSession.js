/**
 * Daily quiz session service (DS-10).
 *
 * Two functions drive the daily-quiz API:
 *   - getDueCardsForUser(userId)   — returns next N cards due, filtered by user focus mode
 *   - recordReview(userId, cardId, quality) — runs SM-2, upserts PrepQuizReview,
 *                                              updates streak in PrepUserSettings
 *
 * Focus modes:
 *   null         — all 32 teams
 *   'AFC' | 'NFC' — conference filter
 *   'AFC_EAST'   — division filter (conference + division)
 *
 * Cards are filtered by `subject` matching a team abbreviation. All v1
 * templates use the team's abbreviation as `subject`. If a future template
 * uses a player name as `subject`, it falls outside the focus filter.
 */

const prisma = require('../../lib/prisma')
const { scheduleNext } = require('./sm2')

const DEFAULT_CARDS_PER_DAY = 10
const DEFAULT_EASE = 2.5

/**
 * Decode a focus mode string into a conference/division filter.
 * Returns null when no filter applies (mode null/unrecognized).
 */
function decodeFocusMode(focusMode) {
  if (!focusMode) return null
  const upper = focusMode.toUpperCase()
  if (upper === 'AFC' || upper === 'NFC') return { conference: upper }
  // Division form: 'AFC_EAST', 'NFC_NORTH', etc.
  const m = /^(AFC|NFC)_(EAST|WEST|NORTH|SOUTH)$/.exec(upper)
  if (m) return { conference: m[1], division: m[2] }
  return null // unknown — treat as all teams
}

/**
 * Resolve a focus mode to a list of team abbreviations. Returns null when
 * no filter applies (all teams).
 */
async function teamAbbrsForFocusMode(focusMode, { db = prisma } = {}) {
  const filter = decodeFocusMode(focusMode)
  if (!filter) return null
  const teams = await db.nflTeam.findMany({
    where: filter,
    select: { abbreviation: true },
  })
  return teams.map((t) => t.abbreviation)
}

/**
 * Get the next N due cards for a user.
 *
 * Selection rules:
 *   - card.isActive = true
 *   - subject matches user's focus mode (or no focus filter)
 *   - either user has no PrepQuizReview row for this card (never seen),
 *     or the review's dueDate is in the past
 *   - prioritize never-seen cards first, then earliest dueDate
 *   - cap at PrepUserSettings.cardsPerDay (default 10)
 *
 * @returns {Promise<Array>} list of PrepQuizCard rows, each augmented with
 *   `userReview` (the existing PrepQuizReview row, or null).
 */
async function getDueCardsForUser(userId, { db = prisma } = {}) {
  const settings = await db.prepUserSettings.findUnique({ where: { userId } })
  const limit = settings?.cardsPerDay ?? DEFAULT_CARDS_PER_DAY
  const focusMode = settings?.focusMode ?? null

  const teamAbbrs = await teamAbbrsForFocusMode(focusMode, { db })
  const now = new Date()

  // Two-phase fetch keeps the query simple and the result deterministic.
  // Phase 1: candidates the user has never seen (no PrepQuizReview row).
  const neverSeen = await db.prepQuizCard.findMany({
    where: {
      isActive: true,
      ...(teamAbbrs ? { subject: { in: teamAbbrs } } : {}),
      reviews: { none: { userId } },
    },
    take: limit,
    orderBy: { generatedAt: 'asc' },
  })

  if (neverSeen.length >= limit) {
    return neverSeen.slice(0, limit).map((c) => ({ ...c, userReview: null }))
  }

  // Phase 2: cards with a review whose dueDate has passed.
  const remaining = limit - neverSeen.length
  const overdueReviews = await db.prepQuizReview.findMany({
    where: {
      userId,
      dueDate: { lte: now },
      card: {
        isActive: true,
        ...(teamAbbrs ? { subject: { in: teamAbbrs } } : {}),
      },
    },
    take: remaining,
    orderBy: { dueDate: 'asc' },
    include: { card: true },
  })

  const combined = [
    ...neverSeen.map((c) => ({ ...c, userReview: null })),
    ...overdueReviews.map((r) => ({ ...r.card, userReview: r })),
  ]
  return combined.slice(0, limit)
}

/**
 * Returns YYYY-MM-DD for a Date, in UTC. Streak comparison uses date strings
 * to avoid TZ drift; "yesterday in UTC" is consistent enough for v1.
 */
function utcDateKey(d) {
  return d.toISOString().slice(0, 10)
}

/**
 * Decide whether to bump, hold, or reset streak given the existing
 * lastQuizDate (or null) and "today" reference.
 *
 * Returns { currentStreak, longestStreak, lastQuizDate } updates to apply.
 */
function nextStreakState(prev, now) {
  const prevDate = prev.lastQuizDate
  const todayKey = utcDateKey(now)
  if (prevDate) {
    const prevKey = utcDateKey(prevDate)
    if (prevKey === todayKey) {
      // Already counted today — no-op.
      return null
    }
    // Was yesterday → bump. Else → reset.
    const yesterday = new Date(now.getTime() - 86400000)
    const yesterdayKey = utcDateKey(yesterday)
    if (prevKey === yesterdayKey) {
      const next = prev.currentStreak + 1
      return {
        currentStreak: next,
        longestStreak: Math.max(prev.longestStreak, next),
        lastQuizDate: now,
      }
    }
  }
  // First quiz ever OR gap of 2+ days — reset to 1.
  return {
    currentStreak: 1,
    longestStreak: Math.max(prev.longestStreak ?? 0, 1),
    lastQuizDate: now,
  }
}

/**
 * Record a user's response to a card. Computes the next SM-2 state and
 * upserts the PrepQuizReview row. Also updates the user's streak in
 * PrepUserSettings (creates the row if missing).
 *
 * quality: 0=Again, 1=Hard, 2=Good, 3=Easy
 *
 * Returns the upserted PrepQuizReview row.
 */
async function recordReview(userId, cardId, quality, { db = prisma, now = new Date() } = {}) {
  const existing = await db.prepQuizReview.findUnique({
    where: { userId_cardId: { userId, cardId } },
  })
  const state = existing ?? { easeFactor: DEFAULT_EASE, interval: 1, repetitions: 0 }
  const next = scheduleNext(state, quality, now)

  const correctDelta = quality > 0 ? 1 : 0
  const incorrectDelta = quality === 0 ? 1 : 0

  const review = await db.prepQuizReview.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: {
      userId,
      cardId,
      easeFactor: next.easeFactor,
      interval: next.interval,
      repetitions: next.repetitions,
      dueDate: next.dueDate,
      lastReviewed: now,
      correctCount: correctDelta,
      incorrectCount: incorrectDelta,
    },
    update: {
      easeFactor: next.easeFactor,
      interval: next.interval,
      repetitions: next.repetitions,
      dueDate: next.dueDate,
      lastReviewed: now,
      correctCount: (existing?.correctCount ?? 0) + correctDelta,
      incorrectCount: (existing?.incorrectCount ?? 0) + incorrectDelta,
    },
  })

  // Streak update — separate write, but cheap; doesn't need to be transactional
  // with the review (it's recoverable from PrepQuizReview if it drifts).
  const settings = await db.prepUserSettings.findUnique({ where: { userId } })
  const streakChanges = nextStreakState(
    {
      currentStreak: settings?.currentStreak ?? 0,
      longestStreak: settings?.longestStreak ?? 0,
      lastQuizDate: settings?.lastQuizDate ?? null,
    },
    now
  )
  if (streakChanges) {
    if (settings) {
      await db.prepUserSettings.update({
        where: { userId },
        data: streakChanges,
      })
    } else {
      await db.prepUserSettings.create({
        data: { userId, ...streakChanges },
      })
    }
  }

  return review
}

module.exports = {
  getDueCardsForUser,
  recordReview,
  // exported for tests
  decodeFocusMode,
  teamAbbrsForFocusMode,
  nextStreakState,
}
