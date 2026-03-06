/**
 * ESPN Hole-by-Hole Scorecard Sync
 *
 * Fetches per-hole scoring data from ESPN's free public API and stores
 * it in our RoundScore + HoleScore tables.
 */

const espn = require('./espnClient')
const { stageRaw } = require('./etlPipeline')

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
    select: { id: true, playerId: true, roundNumber: true, createdAt: true },
  })

  // YEAR GUARD: If tournament is current/upcoming but existing scores are from
  // a prior year, purge them to prevent stale data contamination (e.g., 2025
  // Arnold Palmer results showing up in 2026 tournament record).
  const tournamentYear = tournament.startDate ? new Date(tournament.startDate).getFullYear() : null
  if (tournamentYear && existingRoundScores.length > 0 &&
      (tournament.status === 'IN_PROGRESS' || tournament.status === 'UPCOMING' || tournament.status === 'SCHEDULED')) {
    const hasStaleData = existingRoundScores.some(rs => {
      const rsYear = rs.createdAt ? new Date(rs.createdAt).getFullYear() : null
      return rsYear && rsYear < tournamentYear
    })
    if (hasStaleData) {
      console.log(`[ESPN Sync] YEAR GUARD: Found stale prior-year data for ${tournament.name} (${tournamentYear}). Purging stale RoundScores + HoleScores.`)
      // Delete HoleScores first (they reference RoundScores)
      await prisma.holeScore.deleteMany({ where: { tournamentId } })
      // Delete stale RoundScores
      await prisma.roundScore.deleteMany({ where: { tournamentId } })
      // Also purge stale Performance records so aggregation starts fresh
      await prisma.performance.deleteMany({ where: { tournamentId } })
      console.log(`[ESPN Sync] YEAR GUARD: Purged all prior-year scores for tournament ${tournamentId}`)
      existingRoundScores.length = 0 // Clear the array so the map below is empty
    }
  }

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

      // Extract tee time from statistics (index 6)
      let teeTime = null
      const stats = roundData.statistics?.categories?.[0]?.stats
      if (stats && stats[6]?.displayValue) {
        try {
          teeTime = new Date(stats[6].displayValue)
          if (isNaN(teeTime.getTime())) teeTime = null
        } catch (e) { teeTime = null }
      }

      if (!holeEntries.length && !roundStrokes && !teeTime) continue

      // Ensure RoundScore exists
      const rsKey = `${playerId}_${roundNumber}`
      let roundScoreId = roundScoreMap.get(rsKey)

      if (!roundScoreId) {
        // Create RoundScore
        roundScoreOps.push({
          playerId,
          roundNumber,
          score: roundStrokes,
          teeTime,
          tournamentId,
        })
      } else {
        // Update score and tee time
        const update = { _update: true, id: roundScoreId }
        if (roundStrokes != null) update.score = roundStrokes
        if (teeTime) update.teeTime = teeTime
        roundScoreOps.push(update)
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
        update: { score: op.score, ...(op.teeTime ? { teeTime: op.teeTime } : {}) },
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

  // Track consecutive birdie-or-better streak
  let currentStreak = 0
  let maxStreak = 0

  // Sort by hole number to ensure correct streak tracking
  const sorted = [...holeEntries].sort((a, b) => (a.period || 0) - (b.period || 0))

  for (const h of sorted) {
    const scoreType = h.scoreType?.displayValue
    if (!scoreType) continue
    if (scoreType === 'E') {
      pars++
      currentStreak = 0
    } else {
      const diff = parseInt(scoreType)
      if (diff <= -2) {
        eagles++
        currentStreak++
      } else if (diff === -1) {
        birdies++
        currentStreak++
      } else if (diff === 1) {
        bogeys++
        currentStreak = 0
      } else if (diff === 2) {
        doubleBogeys++
        currentStreak = 0
      } else if (diff > 2) {
        worseThanDouble++
        currentStreak = 0
      }
    }
    if (currentStreak > maxStreak) maxStreak = currentStreak
  }

  const bogeyFree = bogeys === 0 && doubleBogeys === 0 && worseThanDouble === 0 && sorted.length === 18

  return { eagles, birdies, pars, bogeys, doubleBogeys, worseThanDouble, bogeyFree, consecutiveBirdies: maxStreak }
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

/**
 * Sync ESPN IDs by matching leaderboard competitors to our players.
 * Also sets espnEventId on the tournament record.
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function syncEspnIds(prisma) {
  console.log('[ESPN Sync] Starting ESPN ID sync')

  // 1. Fetch ESPN leaderboard
  const data = await espn.getLeaderboard()
  const events = data?.events || []
  if (!events.length) {
    console.log('[ESPN Sync] No events on ESPN leaderboard')
    return { matched: 0, updated: 0 }
  }

  const event = events[0]
  const espnEventId = event.id
  const competitions = event.competitions || []
  const competitors = competitions[0]?.competitors || []

  console.log(`[ESPN Sync] ESPN event: "${event.name}" (${espnEventId}), ${competitors.length} competitors`)

  // Stage raw data
  await stageRaw(prisma, 'espn', 'leaderboard', espnEventId, data)

  // 2. Update espnEventId on matching tournament
  if (espnEventId) {
    const eventName = event.name || ''
    const eventStart = event.date ? new Date(event.date) : null

    // Try to find our tournament by date range (within 3 days of ESPN event start)
    if (eventStart) {
      const startWindow = new Date(eventStart)
      startWindow.setDate(startWindow.getDate() - 1)
      const endWindow = new Date(eventStart)
      endWindow.setDate(endWindow.getDate() + 3)

      const tournament = await prisma.tournament.findFirst({
        where: {
          startDate: { gte: startWindow, lte: endWindow },
          espnEventId: null,
        },
      })

      if (tournament) {
        await prisma.tournament.update({
          where: { id: tournament.id },
          data: { espnEventId },
        })
        console.log(`[ESPN Sync] Set espnEventId=${espnEventId} on tournament "${tournament.name}"`)
      }
    }
  }

  // 3. Build our player index for matching
  const allPlayers = await prisma.player.findMany({
    select: { id: true, name: true, espnId: true, firstName: true, lastName: true },
  })

  const byEspnId = new Set()
  for (const p of allPlayers) {
    if (p.espnId) byEspnId.add(p.espnId)
  }

  const byName = new Map()
  for (const p of allPlayers) {
    byName.set(normalizeName(p.name), p.id)
    if (p.firstName && p.lastName) {
      byName.set(normalizeName(`${p.firstName} ${p.lastName}`), p.id)
    }
  }

  // 4. Match ESPN competitors to our players
  let matched = 0
  let updated = 0
  const updates = []

  for (const comp of competitors) {
    const espnId = comp.id || comp.athlete?.id
    if (!espnId) continue

    // Skip if we already have this espnId
    if (byEspnId.has(espnId) || byEspnId.has(String(espnId))) continue

    const espnName = comp.athlete?.fullName || comp.athlete?.displayName
    if (!espnName) continue

    const playerId = byName.get(normalizeName(espnName))
    if (!playerId) continue

    matched++
    updates.push(
      prisma.player.update({
        where: { id: playerId },
        data: { espnId: String(espnId) },
      })
    )
  }

  // Execute updates in batches
  await batchTransaction(prisma, updates)
  updated = updates.length

  console.log(`[ESPN Sync] ESPN ID sync done: ${matched} matched, ${updated} updated`)
  return { matched, updated }
}

/**
 * Sync player bios (headshots, birth date, college, etc.) from ESPN.
 * Only fetches for players with espnId but missing headshotUrl.
 * Max 50 per run to keep runtime reasonable.
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function syncPlayerBios(prisma) {
  console.log('[ESPN Sync] Starting player bio sync')

  // Find players with espnId but missing headshotUrl
  const players = await prisma.player.findMany({
    where: {
      espnId: { not: null },
      headshotUrl: null,
    },
    select: { id: true, espnId: true, name: true, birthDate: true, college: true, turnedPro: true, height: true, weight: true },
    take: 50,
  })

  if (!players.length) {
    console.log('[ESPN Sync] No players need bio sync')
    return { fetched: 0, updated: 0 }
  }

  console.log(`[ESPN Sync] Fetching bios for ${players.length} players`)

  let fetched = 0
  let updated = 0

  for (const player of players) {
    try {
      const bio = await espn.getPlayerBio(player.espnId)

      // Stage raw data
      await stageRaw(prisma, 'espn', 'player_bio', null, { espnId: player.espnId, ...bio })

      fetched++

      // Build update object — only set fields that are currently null
      const update = {}

      // Headshot URL
      const headshotUrl = bio?.athlete?.headshot?.href || bio?.headshot?.href
      if (headshotUrl) update.headshotUrl = headshotUrl

      // Birth date
      if (!player.birthDate) {
        const dob = bio?.athlete?.dateOfBirth || bio?.dateOfBirth
        if (dob) {
          const parsed = new Date(dob)
          if (!isNaN(parsed.getTime())) update.birthDate = parsed
        }
      }

      // College
      if (!player.college) {
        const college = bio?.athlete?.college?.name || bio?.college?.name
        if (college) update.college = college
      }

      // Turned pro year
      if (!player.turnedPro) {
        const turnedPro = bio?.athlete?.turnedPro || bio?.turnedPro
        if (turnedPro) {
          const year = parseInt(turnedPro)
          if (!isNaN(year) && year > 1950 && year < 2030) update.turnedPro = year
        }
      }

      // Height (as string like "6'1\"")
      if (!player.height) {
        const height = bio?.athlete?.displayHeight || bio?.displayHeight
        if (height) update.height = height
      }

      // Weight (as integer in pounds)
      if (!player.weight) {
        const weight = bio?.athlete?.displayWeight || bio?.displayWeight
        if (weight) {
          const lbs = parseInt(weight)
          if (!isNaN(lbs) && lbs > 100 && lbs < 400) update.weight = lbs
        }
      }

      if (Object.keys(update).length > 0) {
        await prisma.player.update({
          where: { id: player.id },
          data: update,
        })
        updated++
      }
    } catch (e) {
      console.warn(`[ESPN Sync] Failed bio for ${player.name} (${player.espnId}): ${e.message}`)
    }

    // 2-second delay between requests to be respectful
    await new Promise((r) => setTimeout(r, 2000))
  }

  console.log(`[ESPN Sync] Bio sync done: ${fetched} fetched, ${updated} updated`)
  return { fetched, updated }
}

/**
 * Aggregate HoleScore data up into Performance + RoundScore records.
 * This bridges the gap between ESPN hole-by-hole data and the fantasy
 * scoring engine which reads eagles/birdies/bogeys from Performance
 * and bogeyFree/consecutiveBirdies from RoundScore.
 *
 * @param {string} tournamentId - Our internal tournament ID
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function aggregateHoleScoresToPerformance(tournamentId, prisma) {
  console.log(`[ESPN Agg] Aggregating hole scores for tournament ${tournamentId}`)

  // YEAR GUARD: Verify hole score data belongs to the tournament's year
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { startDate: true, name: true, status: true },
  })
  if (tournament && tournament.startDate) {
    const tournamentYear = new Date(tournament.startDate).getFullYear()
    const sampleScores = await prisma.holeScore.findMany({
      where: { tournamentId },
      select: { createdAt: true },
      take: 5,
    })
    const hasStaleData = sampleScores.some(hs => {
      const hsYear = hs.createdAt ? new Date(hs.createdAt).getFullYear() : null
      return hsYear && hsYear < tournamentYear
    })
    if (hasStaleData && (tournament.status === 'IN_PROGRESS' || tournament.status === 'UPCOMING' || tournament.status === 'SCHEDULED')) {
      console.log(`[ESPN Agg] YEAR GUARD: Stale prior-year hole scores detected for "${tournament.name}" (${tournamentYear}). Skipping aggregation — run syncHoleScores first to purge stale data.`)
      return { performances: 0, rounds: 0 }
    }
  }

  // 1. Load all HoleScores for this tournament, grouped by roundScore
  const holeScores = await prisma.holeScore.findMany({
    where: { tournamentId },
    include: {
      roundScore: {
        select: { id: true, playerId: true, roundNumber: true },
      },
    },
    orderBy: { holeNumber: 'asc' },
  })

  if (!holeScores.length) {
    console.log(`[ESPN Agg] No hole scores found for tournament ${tournamentId}`)
    return { performances: 0, rounds: 0 }
  }

  // 2. Group by playerId → roundNumber → holes
  const playerRounds = new Map() // playerId -> Map(roundNumber -> holes[])
  for (const hs of holeScores) {
    if (!hs.roundScore) continue
    const { playerId, roundNumber } = hs.roundScore

    if (!playerRounds.has(playerId)) playerRounds.set(playerId, new Map())
    const rounds = playerRounds.get(playerId)
    if (!rounds.has(roundNumber)) rounds.set(roundNumber, [])
    rounds.get(roundNumber).push(hs)
  }

  // 3. Compute per-round and per-player aggregates
  const roundUpdates = [] // { roundScoreId, data }
  const playerTotals = new Map() // playerId -> { eagles, birdies, pars, bogeys, doubleBogeys, worseThanDouble }

  for (const [playerId, rounds] of playerRounds) {
    if (!playerTotals.has(playerId)) {
      playerTotals.set(playerId, { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubleBogeys: 0, worseThanDouble: 0 })
    }
    const totals = playerTotals.get(playerId)

    for (const [roundNumber, holes] of rounds) {
      // Classify each hole by toPar
      let rEagles = 0, rBirdies = 0, rPars = 0, rBogeys = 0, rDoubleBogeys = 0, rWorseThanDouble = 0

      // Track consecutive birdie-or-better streak
      let currentStreak = 0
      let maxStreak = 0

      // Sort by hole number for streak tracking
      const sorted = [...holes].sort((a, b) => a.holeNumber - b.holeNumber)

      for (const h of sorted) {
        const tp = h.toPar
        if (tp == null) continue

        if (tp <= -2) {
          rEagles++
          currentStreak++
        } else if (tp === -1) {
          rBirdies++
          currentStreak++
        } else if (tp === 0) {
          rPars++
          currentStreak = 0
        } else if (tp === 1) {
          rBogeys++
          currentStreak = 0
        } else if (tp === 2) {
          rDoubleBogeys++
          currentStreak = 0
        } else {
          rWorseThanDouble++
          currentStreak = 0
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak
      }

      const bogeyFree = rBogeys === 0 && rDoubleBogeys === 0 && rWorseThanDouble === 0 && sorted.length === 18

      // Accumulate into player totals
      totals.eagles += rEagles
      totals.birdies += rBirdies
      totals.pars += rPars
      totals.bogeys += rBogeys
      totals.doubleBogeys += rDoubleBogeys
      totals.worseThanDouble += rWorseThanDouble

      // Queue round score update
      const roundScoreId = sorted[0]?.roundScore?.id
      if (roundScoreId) {
        roundUpdates.push({
          id: roundScoreId,
          data: {
            eagles: rEagles, birdies: rBirdies, pars: rPars,
            bogeys: rBogeys, doubleBogeys: rDoubleBogeys, worseThanDouble: rWorseThanDouble,
            bogeyFree, consecutiveBirdies: maxStreak,
          },
        })
      }
    }
  }

  // 4. Batch update RoundScore records
  if (roundUpdates.length > 0) {
    const rsOps = roundUpdates.map((u) =>
      prisma.roundScore.update({ where: { id: u.id }, data: u.data })
    )
    await batchTransaction(prisma, rsOps)
  }

  // 5. Batch update Performance records
  const perfUpdates = []
  for (const [playerId, totals] of playerTotals) {
    perfUpdates.push(
      prisma.performance.updateMany({
        where: { tournamentId, playerId },
        data: {
          eagles: totals.eagles,
          birdies: totals.birdies,
          pars: totals.pars,
          bogeys: totals.bogeys,
          doubleBogeys: totals.doubleBogeys,
          worseThanDouble: totals.worseThanDouble,
        },
      })
    )
  }
  await batchTransaction(prisma, perfUpdates)

  console.log(`[ESPN Agg] Done: ${playerTotals.size} performances, ${roundUpdates.length} round scores updated`)
  return { performances: playerTotals.size, rounds: roundUpdates.length }
}

module.exports = {
  syncHoleScores,
  syncEspnIds,
  syncPlayerBios,
  aggregateHoleScoresToPerformance,
}
