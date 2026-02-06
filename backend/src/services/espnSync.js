/**
 * ESPN Hole-by-Hole Scorecard Sync
 *
 * Fetches per-hole scoring data from ESPN's free public API and stores
 * it in our RoundScore + HoleScore tables.
 */

const espn = require('./espnClient')

/**
 * Sync hole-by-hole scores for a tournament.
 * @param {string} tournamentId - Our internal tournament ID
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function syncHoleScores(tournamentId, prisma) {
  console.log(`[ESPN Sync] Starting hole score sync for tournament ${tournamentId}`)

  // 1. Get our tournament
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  })
  if (!tournament) throw new Error(`Tournament ${tournamentId} not found`)

  // 2. Find the ESPN event ID (use cached espnEventId or search)
  let espnEventId = tournament.espnEventId || null

  if (!espnEventId) {
    espnEventId = await espn.findEventId(tournament.name, tournament.startDate)
    if (!espnEventId) {
      console.log(`[ESPN Sync] Could not find ESPN event for "${tournament.name}"`)
      return { matched: 0, holes: 0, error: 'ESPN event not found' }
    }
    // Cache the ESPN event ID on the tournament (we'll add this column)
    try {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { espnEventId },
      })
    } catch (e) {
      // Column might not exist yet — that's fine, we found the ID
      console.log(`[ESPN Sync] Note: could not cache espnEventId (column may not exist yet)`)
    }
  }

  // 3. Fetch ESPN scorecard data
  const { competitors, status } = await espn.getEventScorecard(espnEventId)
  if (!competitors.length) {
    console.log(`[ESPN Sync] No competitors found for event ${espnEventId}`)
    return { matched: 0, holes: 0 }
  }

  console.log(`[ESPN Sync] Got ${competitors.length} competitors from ESPN`)

  // 4. Build player matching map (espnId -> ourPlayerId, name -> ourPlayerId)
  const allPlayers = await prisma.player.findMany({
    select: { id: true, name: true, espnId: true, firstName: true, lastName: true },
  })

  // Index by espnId
  const byEspnId = new Map()
  for (const p of allPlayers) {
    if (p.espnId) byEspnId.set(p.espnId, p.id)
  }

  // Index by normalized name
  const byName = new Map()
  for (const p of allPlayers) {
    byName.set(normalizeName(p.name), p.id)
    // Also index "Last, First" format
    if (p.firstName && p.lastName) {
      byName.set(normalizeName(`${p.firstName} ${p.lastName}`), p.id)
    }
  }

  // 5. Load existing RoundScores for this tournament (for linking HoleScores)
  const existingRoundScores = await prisma.roundScore.findMany({
    where: { tournamentId },
    select: { id: true, playerId: true, roundNumber: true },
  })
  const roundScoreMap = new Map()
  for (const rs of existingRoundScores) {
    roundScoreMap.set(`${rs.playerId}_${rs.roundNumber}`, rs.id)
  }

  // 6. Process each competitor
  let matchedPlayers = 0
  let totalHoles = 0
  const espnIdUpdates = [] // players we need to set espnId for

  const roundScoreOps = []
  const holeScoreOps = []

  for (const comp of competitors) {
    const espnId = comp.id
    const espnName = comp.athlete?.fullName || comp.athlete?.displayName

    // Match to our player
    let playerId = byEspnId.get(espnId)
    if (!playerId && espnName) {
      playerId = byName.get(normalizeName(espnName))
      // Save espnId for future matching
      if (playerId) {
        espnIdUpdates.push({ id: playerId, espnId })
      }
    }

    if (!playerId) continue
    matchedPlayers++

    // Process each round's linescores
    const linescores = comp.linescores || []
    for (const roundData of linescores) {
      const roundNumber = roundData.period
      if (!roundNumber || roundNumber < 1 || roundNumber > 4) continue

      const roundStrokes = roundData.value ? Math.round(roundData.value) : null
      const holeEntries = roundData.linescores || []
      if (!holeEntries.length && !roundStrokes) continue

      // Ensure RoundScore exists
      const rsKey = `${playerId}_${roundNumber}`
      let roundScoreId = roundScoreMap.get(rsKey)

      if (!roundScoreId) {
        // Create RoundScore
        roundScoreOps.push({
          playerId,
          roundNumber,
          score: roundStrokes,
          tournamentId,
        })
      } else if (roundStrokes != null) {
        // Update score if we have it
        roundScoreOps.push({
          _update: true,
          id: roundScoreId,
          score: roundStrokes,
        })
      }

      // Process hole-by-hole data
      for (const holeData of holeEntries) {
        const holeNumber = holeData.period
        const strokes = holeData.value != null ? Math.round(holeData.value) : null
        const scoreTypeStr = holeData.scoreType?.displayValue

        if (!holeNumber || holeNumber < 1 || holeNumber > 18) continue

        // Derive par from strokes and scoreType
        let par = null
        let toPar = null
        if (strokes != null && scoreTypeStr) {
          if (scoreTypeStr === 'E') {
            par = strokes
            toPar = 0
          } else {
            const diff = parseInt(scoreTypeStr)
            if (!isNaN(diff)) {
              par = strokes - diff
              toPar = diff
            }
          }
        }

        holeScoreOps.push({
          playerId,
          roundNumber,
          holeNumber,
          par: par || 4, // Default par 4 if can't derive
          score: strokes,
          toPar,
        })
        totalHoles++
      }

      // Compute round stats from hole data
      if (holeEntries.length > 0) {
        const stats = computeRoundStats(holeEntries)
        if (roundScoreId) {
          roundScoreOps.push({
            _update: true,
            id: roundScoreId,
            ...stats,
          })
        }
      }
    }
  }

  // 7. Execute database operations

  // Update espnId for matched players
  if (espnIdUpdates.length > 0) {
    const espnOps = espnIdUpdates.map((u) =>
      prisma.player.update({ where: { id: u.id }, data: { espnId: u.espnId } })
    )
    await batchTransaction(prisma, espnOps)
    console.log(`[ESPN Sync] Updated espnId for ${espnIdUpdates.length} players`)
  }

  // Upsert RoundScores
  for (const op of roundScoreOps) {
    if (op._update) {
      const { _update, id, ...data } = op
      await prisma.roundScore.update({ where: { id }, data })
    } else {
      const rs = await prisma.roundScore.upsert({
        where: {
          tournamentId_playerId_roundNumber: {
            tournamentId,
            playerId: op.playerId,
            roundNumber: op.roundNumber,
          },
        },
        update: { score: op.score },
        create: op,
      })
      // Cache the new ID
      roundScoreMap.set(`${op.playerId}_${op.roundNumber}`, rs.id)
    }
  }

  // Upsert HoleScores in batches
  const holeOps = []
  for (const h of holeScoreOps) {
    const rsKey = `${h.playerId}_${h.roundNumber}`
    const roundScoreId = roundScoreMap.get(rsKey)
    if (!roundScoreId) continue

    holeOps.push(
      prisma.holeScore.upsert({
        where: {
          roundScoreId_holeNumber: {
            roundScoreId,
            holeNumber: h.holeNumber,
          },
        },
        update: {
          par: h.par,
          score: h.score,
          toPar: h.toPar,
        },
        create: {
          roundScoreId,
          tournamentId,
          holeNumber: h.holeNumber,
          par: h.par,
          score: h.score,
          toPar: h.toPar,
        },
      })
    )
  }

  await batchTransaction(prisma, holeOps)

  console.log(`[ESPN Sync] Done: ${matchedPlayers} players matched, ${totalHoles} hole scores synced`)
  return { matched: matchedPlayers, holes: totalHoles }
}

/**
 * Compute round-level stats from hole data.
 */
function computeRoundStats(holeEntries) {
  let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubleBogeys = 0, worseThanDouble = 0

  for (const h of holeEntries) {
    const scoreType = h.scoreType?.displayValue
    if (!scoreType) continue
    if (scoreType === 'E') pars++
    else {
      const diff = parseInt(scoreType)
      if (diff <= -2) eagles++
      else if (diff === -1) birdies++
      else if (diff === 1) bogeys++
      else if (diff === 2) doubleBogeys++
      else if (diff > 2) worseThanDouble++
    }
  }

  return { eagles, birdies, pars, bogeys, doubleBogeys, worseThanDouble }
}

/** Normalize player name for fuzzy matching (strips diacriticals + Nordic chars) */
function normalizeName(name) {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacriticals
    .replace(/ø/g, 'o').replace(/Ø/g, 'o')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'ae')
    .replace(/å/g, 'a').replace(/Å/g, 'a')
    .replace(/ð/g, 'd').replace(/Ð/g, 'd')
    .replace(/þ/g, 'th').replace(/Þ/g, 'th')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Run ops in batched transactions */
async function batchTransaction(prisma, operations, chunkSize = 50) {
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize)
    await prisma.$transaction(chunk)
  }
}

module.exports = {
  syncHoleScores,
}
