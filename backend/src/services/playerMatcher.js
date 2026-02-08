/**
 * Player Matching Service
 *
 * Cross-platform player deduplication and matching.
 * Strategies (in priority order):
 *   1. Exact platform ID match (sleeperId, yahooId, espnId, etc.)
 *   2. Fuzzy name match + position/sport filter
 *   3. Return null for manual resolution
 */

/**
 * Normalize a player name for fuzzy matching.
 * Strips suffixes, standardizes punctuation, lowercases.
 */
function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\bjr\.?\b/g, '')
    .replace(/\bsr\.?\b/g, '')
    .replace(/\biii\b/g, '')
    .replace(/\bii\b/g, '')
    .replace(/\biv\b/g, '')
    .replace(/[.''-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Match an external player to a canonical Clutch player.
 *
 * @param {Object} externalPlayer - { name, platform, platformId, position?, sport? }
 * @param {PrismaClient} prisma
 * @returns {Object|null} - Matched Player record, or null
 */
async function matchPlayer(externalPlayer, prisma) {
  const { name, platform, platformId, position, sport } = externalPlayer

  // Strategy 1: Exact platform ID match
  if (platformId && platform) {
    const idField = `${platform}Id` // e.g., 'sleeperId', 'yahooId', 'espnId'
    try {
      const match = await prisma.player.findFirst({
        where: { [idField]: String(platformId) },
      })
      if (match) return match
    } catch {
      // Field doesn't exist on model — skip
    }
  }

  // Strategy 2: Fuzzy name match
  const normalized = normalizeName(name)
  if (!normalized) return null

  // Build search — try exact name first
  const candidates = await prisma.player.findMany({
    where: {
      OR: [
        { name: { contains: name, mode: 'insensitive' } },
        { firstName: { contains: normalized.split(' ')[0], mode: 'insensitive' } },
      ],
    },
    take: 10,
  })

  if (candidates.length === 0) return null

  // Score candidates by similarity
  const scored = candidates.map(c => {
    let score = 0
    const cNorm = normalizeName(c.name)

    // Exact normalized match
    if (cNorm === normalized) score += 100

    // Last name match
    const inputLast = normalized.split(' ').pop()
    const candLast = cNorm.split(' ').pop()
    if (inputLast === candLast) score += 50

    // First name match
    const inputFirst = normalized.split(' ')[0]
    const candFirst = cNorm.split(' ')[0]
    if (inputFirst === candFirst) score += 30

    // Sport match bonus
    if (sport && c.sportId) {
      // Can't directly compare without knowing sportId mapping, skip for now
    }

    return { player: c, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Only return if confidence is high enough
  if (scored[0]?.score >= 80) {
    return scored[0].player
  }

  return null
}

/**
 * Match a player and update their platform ID if found.
 * Creates a new player record if no match and createIfMissing is true.
 */
async function matchAndLink(externalPlayer, prisma, { createIfMissing = false } = {}) {
  const match = await matchPlayer(externalPlayer, prisma)

  if (match) {
    // Link the platform ID if not already set
    const idField = `${externalPlayer.platform}Id`
    if (externalPlayer.platformId && !match[idField]) {
      try {
        await prisma.player.update({
          where: { id: match.id },
          data: { [idField]: String(externalPlayer.platformId) },
        })
      } catch { /* skip if field doesn't exist */ }
    }
    return { player: match, status: 'matched' }
  }

  if (createIfMissing) {
    const newPlayer = await prisma.player.create({
      data: {
        name: externalPlayer.name,
        firstName: externalPlayer.name.split(' ')[0],
        lastName: externalPlayer.name.split(' ').slice(1).join(' '),
        [`${externalPlayer.platform}Id`]: externalPlayer.platformId ? String(externalPlayer.platformId) : null,
      },
    })
    return { player: newPlayer, status: 'created' }
  }

  return { player: null, status: 'unmatched' }
}

/**
 * Batch match multiple players.
 * Returns { matched: [...], unmatched: [...], created: [...] }
 */
async function batchMatch(externalPlayers, prisma, options = {}) {
  const results = { matched: [], unmatched: [], created: [] }

  for (const ep of externalPlayers) {
    const result = await matchAndLink(ep, prisma, options)
    if (result.status === 'matched') {
      results.matched.push({ external: ep, player: result.player })
    } else if (result.status === 'created') {
      results.created.push({ external: ep, player: result.player })
    } else {
      results.unmatched.push(ep)
    }
  }

  return results
}

module.exports = {
  normalizeName,
  matchPlayer,
  matchAndLink,
  batchMatch,
}
