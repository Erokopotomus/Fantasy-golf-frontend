const dg = require('./datagolfClient')
const { calculateFantasyPoints, getDefaultScoringConfig } = require('./scoringService')

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Split "Last, First" or "First Last" into { firstName, lastName } */
function splitName(raw) {
  if (!raw) return { firstName: '', lastName: '' }
  if (raw.includes(',')) {
    const [last, first] = raw.split(',').map((s) => s.trim())
    return { firstName: first || '', lastName: last || '' }
  }
  const parts = raw.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

/** Map 2-letter country code to flag emoji */
function countryToFlag(code) {
  if (!code || code.length !== 2) return null
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => c.charCodeAt(0) + 0x1F1A5))
}

/** Convert DG tour string to our enum-compatible string */
function mapTour(dgTour) {
  const m = { pga: 'PGA', euro: 'DP World', kft: 'Korn Ferry', liv: 'LIV', opp: 'PGA', alt: 'PGA' }
  return m[dgTour] || 'PGA'
}

// ─── 2a. Sync Players ──────────────────────────────────────────────────────

async function syncPlayers(prisma) {
  console.log('[Sync] Starting player sync...')

  const [playerList, rankings, skills] = await Promise.all([
    dg.getPlayerList(),
    dg.getRankings(),
    dg.getSkillRatings('value'),
  ])

  // Index rankings by dg_id
  const rankMap = {}
  if (rankings?.rankings) {
    for (const r of rankings.rankings) {
      rankMap[r.dg_id] = r
    }
  }

  // Index skills by dg_id
  const skillMap = {}
  if (skills?.players) {
    for (const s of skills.players) {
      skillMap[s.dg_id] = s
    }
  }

  let created = 0
  let updated = 0

  // playerList is an array of player objects
  const players = Array.isArray(playerList) ? playerList : playerList?.players || []

  for (const p of players) {
    const dgId = String(p.dg_id)
    const { firstName, lastName } = splitName(p.player_name)
    const name = `${firstName} ${lastName}`.trim()
    const country = p.country || null
    const countryFlag = countryToFlag(p.country_code || p.country)

    const rank = rankMap[p.dg_id] || {}
    const skill = skillMap[p.dg_id] || {}

    const data = {
      firstName,
      lastName,
      name,
      country,
      countryFlag,
      primaryTour: mapTour(p.primary_tour || 'pga'),
      isAmateur: p.amateur === true || p.amateur === 1,
      // Rankings
      datagolfRank: rank.datagolf_rank ?? null,
      datagolfSkill: rank.dg_skill_estimate != null ? rank.dg_skill_estimate : null,
      owgrRank: rank.owgr_rank ?? null,
      // Skill ratings (SG breakdowns)
      sgTotal: skill.sg_total ?? null,
      sgPutting: skill.sg_putt ?? null,
      sgApproach: skill.sg_app ?? null,
      sgOffTee: skill.sg_ott ?? null,
      sgAroundGreen: skill.sg_arg ?? null,
      sgTeeToGreen: skill.sg_t2g ?? null,
      // DG IDs for cross-ref
      draftKingsId: p.dk_id ? String(p.dk_id) : undefined,
      fanDuelId: p.fd_id ? String(p.fd_id) : undefined,
    }

    // Remove undefined keys so Prisma doesn't try to set them
    for (const k of Object.keys(data)) {
      if (data[k] === undefined) delete data[k]
    }

    const existing = await prisma.player.findFirst({ where: { datagolfId: dgId } })

    if (existing) {
      await prisma.player.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.player.create({ data: { datagolfId: dgId, ...data } })
      created++
    }
  }

  console.log(`[Sync] Players done: ${created} created, ${updated} updated, ${created + updated} total`)
  return { created, updated, total: created + updated }
}

// ─── 2b. Sync Schedule ──────────────────────────────────────────────────────

async function syncSchedule(prisma) {
  console.log('[Sync] Starting schedule sync...')

  const scheduleData = await dg.getSchedule('pga')
  const events = scheduleData?.schedule || scheduleData || []

  let created = 0
  let updated = 0

  for (const evt of events) {
    const dgId = String(evt.event_id || evt.dg_id)
    if (!dgId || dgId === 'undefined') continue

    const data = {
      name: evt.event_name || evt.name,
      shortName: evt.event_name_short || null,
      location: evt.course || evt.location || null,
      tour: mapTour(evt.tour || 'pga'),
      purse: evt.purse != null ? parseFloat(evt.purse) : null,
      isMajor: evt.major === true || evt.major === 1,
      isSignature: evt.signature === true || evt.signature === 1,
      isPlayoff: evt.playoff === true || evt.playoff === 1,
    }

    // Parse dates
    if (evt.date || evt.start_date) {
      data.startDate = new Date(evt.date || evt.start_date)
    }
    if (evt.end_date) {
      data.endDate = new Date(evt.end_date)
    } else if (data.startDate) {
      // Default to 4-day event
      data.endDate = new Date(data.startDate.getTime() + 3 * 24 * 60 * 60 * 1000)
    }

    // Determine status based on dates
    const now = new Date()
    if (data.endDate && data.endDate < now) {
      data.status = 'COMPLETED'
    } else if (data.startDate && data.startDate <= now && (!data.endDate || data.endDate >= now)) {
      data.status = 'IN_PROGRESS'
    } else {
      data.status = 'UPCOMING'
    }

    const existing = await prisma.tournament.findFirst({ where: { datagolfId: dgId } })

    if (existing) {
      await prisma.tournament.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.tournament.create({ data: { datagolfId: dgId, ...data } })
      created++
    }
  }

  console.log(`[Sync] Schedule done: ${created} created, ${updated} updated`)
  return { created, updated, total: created + updated }
}

// ─── 2c. Sync Field & Tee Times ────────────────────────────────────────────

async function syncFieldAndTeeTimesForTournament(tournamentDgId, prisma) {
  console.log(`[Sync] Syncing field for tournament DG ID: ${tournamentDgId}`)

  const fieldData = await dg.getFieldUpdates(tournamentDgId)
  const field = fieldData?.field || fieldData || []

  // Find tournament by datagolfId
  const tournament = await prisma.tournament.findFirst({
    where: { datagolfId: String(tournamentDgId) },
  })
  if (!tournament) throw new Error(`Tournament with datagolfId ${tournamentDgId} not found in DB`)

  let playersInField = 0
  let teeTimes = 0
  let dfsSalaries = 0

  for (const entry of field) {
    const dgId = String(entry.dg_id)
    const player = await prisma.player.findFirst({ where: { datagolfId: dgId } })
    if (!player) continue

    // Upsert Performance
    await prisma.performance.upsert({
      where: {
        tournamentId_playerId: { tournamentId: tournament.id, playerId: player.id },
      },
      update: { status: 'ACTIVE' },
      create: {
        tournamentId: tournament.id,
        playerId: player.id,
        status: 'ACTIVE',
      },
    })
    playersInField++

    // Store tee time if available (R1 tee time)
    if (entry.r1_teetime || entry.tee_time) {
      const teeTimeStr = entry.r1_teetime || entry.tee_time
      await prisma.roundScore.upsert({
        where: {
          tournamentId_playerId_roundNumber: {
            tournamentId: tournament.id,
            playerId: player.id,
            roundNumber: 1,
          },
        },
        update: { teeTime: new Date(teeTimeStr) },
        create: {
          tournamentId: tournament.id,
          playerId: player.id,
          roundNumber: 1,
          teeTime: new Date(teeTimeStr),
        },
      })
      teeTimes++
    }

    // DFS salaries if available
    if (entry.dk_salary || entry.fd_salary) {
      // Upsert DraftKings slate/entry
      if (entry.dk_salary) {
        const dkSlate = await getOrCreateSlate(tournament.id, 'DRAFTKINGS', prisma)
        await prisma.playerDFSEntry.upsert({
          where: { slateId_playerId: { slateId: dkSlate.id, playerId: player.id } },
          update: { salary: entry.dk_salary },
          create: { slateId: dkSlate.id, playerId: player.id, salary: entry.dk_salary },
        })
        dfsSalaries++
      }
      if (entry.fd_salary) {
        const fdSlate = await getOrCreateSlate(tournament.id, 'FANDUEL', prisma)
        await prisma.playerDFSEntry.upsert({
          where: { slateId_playerId: { slateId: fdSlate.id, playerId: player.id } },
          update: { salary: entry.fd_salary },
          create: { slateId: fdSlate.id, playerId: player.id, salary: entry.fd_salary },
        })
        dfsSalaries++
      }
    }
  }

  // Update tournament field size
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { fieldSize: playersInField },
  })

  console.log(`[Sync] Field done: ${playersInField} players, ${teeTimes} tee times, ${dfsSalaries} DFS salaries`)
  return { playersInField, teeTimes, dfsSalaries }
}

async function getOrCreateSlate(tournamentId, platform, prisma) {
  let slate = await prisma.dFSSlate.findFirst({
    where: { tournamentId, platform },
  })
  if (!slate) {
    slate = await prisma.dFSSlate.create({
      data: {
        tournamentId,
        platform,
        slateName: `${platform} Main`,
        slateType: 'CLASSIC',
      },
    })
  }
  return slate
}

// ─── 2d. Sync Live Scoring ──────────────────────────────────────────────────

async function syncLiveScoring(tournamentDgId, prisma) {
  console.log(`[Sync] Syncing live scoring for DG ID: ${tournamentDgId}`)

  const liveData = await dg.getLiveInPlay(tournamentDgId)

  const tournament = await prisma.tournament.findFirst({
    where: { datagolfId: String(tournamentDgId) },
  })
  if (!tournament) throw new Error(`Tournament with datagolfId ${tournamentDgId} not found in DB`)

  // The live data contains player-level probabilities and scoring
  const players = liveData?.data || liveData?.players || liveData || []
  let updatedCount = 0

  // Derive current round from data
  let maxRound = 1

  for (const entry of players) {
    const dgId = String(entry.dg_id)
    const player = await prisma.player.findFirst({ where: { datagolfId: dgId } })
    if (!player) continue

    const currentRound = entry.current_round || entry.round || 1
    if (currentRound > maxRound) maxRound = currentRound

    const thru = entry.thru ?? entry.holes_completed ?? null
    const position = entry.current_pos ?? entry.position ?? null
    const totalToPar = entry.total != null ? entry.total : (entry.total_to_par ?? null)
    const todayToPar = entry.today != null ? entry.today : (entry.today_to_par ?? null)

    // Upsert LiveScore
    await prisma.liveScore.upsert({
      where: {
        tournamentId_playerId: { tournamentId: tournament.id, playerId: player.id },
      },
      update: {
        position: typeof position === 'number' ? position : null,
        positionTied: typeof entry.current_pos === 'string' && entry.current_pos.startsWith('T'),
        totalToPar,
        todayToPar,
        thru: typeof thru === 'number' ? thru : null,
        currentRound,
        currentHole: entry.current_hole ?? null,
        winProbability: entry.win_prob ?? entry.win ?? null,
        top5Probability: entry.top_5_prob ?? entry.top_5 ?? null,
        top10Probability: entry.top_10_prob ?? entry.top_10 ?? null,
        top20Probability: entry.top_20_prob ?? entry.top_20 ?? null,
        makeCutProbability: entry.make_cut_prob ?? entry.make_cut ?? null,
        sgTotalLive: entry.sg_total ?? null,
        lastUpdated: new Date(),
      },
      create: {
        tournamentId: tournament.id,
        playerId: player.id,
        position: typeof position === 'number' ? position : null,
        totalToPar,
        todayToPar,
        thru: typeof thru === 'number' ? thru : null,
        currentRound,
        winProbability: entry.win_prob ?? entry.win ?? null,
        top5Probability: entry.top_5_prob ?? entry.top_5 ?? null,
        top10Probability: entry.top_10_prob ?? entry.top_10 ?? null,
        top20Probability: entry.top_20_prob ?? entry.top_20 ?? null,
        makeCutProbability: entry.make_cut_prob ?? entry.make_cut ?? null,
        sgTotalLive: entry.sg_total ?? null,
        lastUpdated: new Date(),
      },
    })

    // Also update Performance record with latest position/scores
    const perfUpdate = {
      totalToPar,
      status: entry.status === 'cut' ? 'CUT' : entry.status === 'wd' ? 'WD' : 'ACTIVE',
    }
    if (typeof position === 'number') perfUpdate.position = position

    // Map round scores to performance round1-4
    for (let r = 1; r <= 4; r++) {
      const roundScore = entry[`r${r}`] ?? entry[`round_${r}`] ?? null
      if (roundScore != null) perfUpdate[`round${r}`] = roundScore
    }

    await prisma.performance.upsert({
      where: {
        tournamentId_playerId: { tournamentId: tournament.id, playerId: player.id },
      },
      update: perfUpdate,
      create: {
        tournamentId: tournament.id,
        playerId: player.id,
        ...perfUpdate,
      },
    })

    updatedCount++
  }

  // Update tournament status
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'IN_PROGRESS', currentRound: maxRound },
  })

  console.log(`[Sync] Live scoring done: ${updatedCount} players updated, round ${maxRound}`)
  return { updated: updatedCount, tournamentStatus: 'IN_PROGRESS' }
}

// ─── 2e. Sync Pre-Tournament Predictions ────────────────────────────────────

async function syncPreTournamentPredictions(tournamentDgId, prisma) {
  console.log(`[Sync] Syncing predictions for DG ID: ${tournamentDgId}`)

  const predData = await dg.getPreTournamentPredictions(tournamentDgId)

  const tournament = await prisma.tournament.findFirst({
    where: { datagolfId: String(tournamentDgId) },
  })
  if (!tournament) throw new Error(`Tournament with datagolfId ${tournamentDgId} not found in DB`)

  const baseline = predData?.baseline || predData?.data || predData || []
  let count = 0

  for (const entry of baseline) {
    const dgId = String(entry.dg_id)
    const player = await prisma.player.findFirst({ where: { datagolfId: dgId } })
    if (!player) continue

    await prisma.playerPrediction.upsert({
      where: {
        tournamentId_playerId: { tournamentId: tournament.id, playerId: player.id },
      },
      update: {
        winProbability: entry.win ?? null,
        top5Probability: entry.top_5 ?? null,
        top10Probability: entry.top_10 ?? null,
        top20Probability: entry.top_20 ?? null,
        makeCutProbability: entry.make_cut ?? null,
        source: 'datagolf',
      },
      create: {
        tournamentId: tournament.id,
        playerId: player.id,
        winProbability: entry.win ?? null,
        top5Probability: entry.top_5 ?? null,
        top10Probability: entry.top_10 ?? null,
        top20Probability: entry.top_20 ?? null,
        makeCutProbability: entry.make_cut ?? null,
        source: 'datagolf',
      },
    })
    count++
  }

  console.log(`[Sync] Predictions done: ${count} players`)
  return { predictions: count }
}

// ─── 2f. Sync Fantasy Projections ───────────────────────────────────────────

async function syncFantasyProjections(tournamentDgId, prisma) {
  console.log(`[Sync] Syncing fantasy projections for DG ID: ${tournamentDgId}`)

  const tournament = await prisma.tournament.findFirst({
    where: { datagolfId: String(tournamentDgId) },
  })
  if (!tournament) throw new Error(`Tournament with datagolfId ${tournamentDgId} not found in DB`)

  const [dkData, fdData] = await Promise.all([
    dg.getFantasyProjections(tournamentDgId, 'draftkings'),
    dg.getFantasyProjections(tournamentDgId, 'fanduel'),
  ])

  let dkCount = 0
  let fdCount = 0

  // DraftKings
  const dkProjections = dkData?.projections || dkData || []
  const dkSlate = await getOrCreateSlate(tournament.id, 'DRAFTKINGS', prisma)
  for (const entry of dkProjections) {
    const dgId = String(entry.dg_id)
    const player = await prisma.player.findFirst({ where: { datagolfId: dgId } })
    if (!player) continue

    await prisma.playerDFSEntry.upsert({
      where: { slateId_playerId: { slateId: dkSlate.id, playerId: player.id } },
      update: {
        salary: entry.salary ?? null,
        projectedPoints: entry.proj_points ?? entry.projection ?? null,
        ownership: entry.proj_ownership ?? entry.ownership ?? null,
      },
      create: {
        slateId: dkSlate.id,
        playerId: player.id,
        salary: entry.salary ?? null,
        projectedPoints: entry.proj_points ?? entry.projection ?? null,
        ownership: entry.proj_ownership ?? entry.ownership ?? null,
      },
    })
    dkCount++
  }

  // FanDuel
  const fdProjections = fdData?.projections || fdData || []
  const fdSlate = await getOrCreateSlate(tournament.id, 'FANDUEL', prisma)
  for (const entry of fdProjections) {
    const dgId = String(entry.dg_id)
    const player = await prisma.player.findFirst({ where: { datagolfId: dgId } })
    if (!player) continue

    await prisma.playerDFSEntry.upsert({
      where: { slateId_playerId: { slateId: fdSlate.id, playerId: player.id } },
      update: {
        salary: entry.salary ?? null,
        projectedPoints: entry.proj_points ?? entry.projection ?? null,
        ownership: entry.proj_ownership ?? entry.ownership ?? null,
      },
      create: {
        slateId: fdSlate.id,
        playerId: player.id,
        salary: entry.salary ?? null,
        projectedPoints: entry.proj_points ?? entry.projection ?? null,
        ownership: entry.proj_ownership ?? entry.ownership ?? null,
      },
    })
    fdCount++
  }

  console.log(`[Sync] Projections done: DK=${dkCount}, FD=${fdCount}`)
  return { draftkings: dkCount, fanduel: fdCount }
}

// ─── 2g. Sync Tournament Results (Finalize) ────────────────────────────────

async function syncTournamentResults(tournamentDgId, prisma) {
  console.log(`[Sync] Finalizing tournament DG ID: ${tournamentDgId}`)

  const tournament = await prisma.tournament.findFirst({
    where: { datagolfId: String(tournamentDgId) },
  })
  if (!tournament) throw new Error(`Tournament with datagolfId ${tournamentDgId} not found in DB`)

  // Get final SG stats
  const statsData = await dg.getLiveTournamentStats(tournamentDgId)
  const players = statsData?.live_stats || statsData?.data || statsData || []

  for (const entry of players) {
    const dgId = String(entry.dg_id)
    const player = await prisma.player.findFirst({ where: { datagolfId: dgId } })
    if (!player) continue

    const position = entry.fin_pos ?? entry.position ?? null
    const earnings = entry.earnings ?? null

    // Update Performance with final data
    const perfUpdate = {
      status: entry.status === 'cut' ? 'CUT' : entry.status === 'wd' ? 'WD' : 'ACTIVE',
      sgTotal: entry.sg_total ?? null,
      sgPutting: entry.sg_putt ?? null,
      sgApproach: entry.sg_app ?? null,
      sgOffTee: entry.sg_ott ?? null,
      sgAroundGreen: entry.sg_arg ?? null,
      sgTeeToGreen: entry.sg_t2g ?? null,
    }
    if (typeof position === 'number') perfUpdate.position = position
    if (earnings != null) perfUpdate.earnings = earnings

    await prisma.performance.upsert({
      where: {
        tournamentId_playerId: { tournamentId: tournament.id, playerId: player.id },
      },
      update: perfUpdate,
      create: {
        tournamentId: tournament.id,
        playerId: player.id,
        ...perfUpdate,
      },
    })

    // Update player season stats
    if (typeof position === 'number' && perfUpdate.status === 'ACTIVE') {
      const updateData = {}
      if (position === 1) updateData.wins = { increment: 1 }
      if (position <= 5) updateData.top5s = { increment: 1 }
      if (position <= 10) updateData.top10s = { increment: 1 }
      if (position <= 25) updateData.top25s = { increment: 1 }
      updateData.events = { increment: 1 }
      updateData.cutsMade = { increment: 1 }
      if (earnings != null) updateData.earnings = { increment: earnings }

      await prisma.player.update({ where: { id: player.id }, data: updateData })
    } else if (perfUpdate.status === 'CUT') {
      await prisma.player.update({
        where: { id: player.id },
        data: { events: { increment: 1 } },
      })
    }
  }

  // Calculate fantasy points for all performances
  const performances = await prisma.performance.findMany({
    where: { tournamentId: tournament.id },
    include: { roundScores: true },
  })

  const scoringConfig = getDefaultScoringConfig('standard')
  for (const perf of performances) {
    const { total } = calculateFantasyPoints(perf, scoringConfig)
    await prisma.performance.update({
      where: { id: perf.id },
      data: { fantasyPoints: total },
    })
  }

  // Mark tournament completed
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'COMPLETED' },
  })

  console.log(`[Sync] Tournament finalized: ${players.length} players processed`)
  return { finalized: players.length }
}

module.exports = {
  syncPlayers,
  syncSchedule,
  syncFieldAndTeeTimesForTournament,
  syncLiveScoring,
  syncPreTournamentPredictions,
  syncFantasyProjections,
  syncTournamentResults,
}
