const dg = require('./datagolfClient')
const { calculateFantasyPoints, getDefaultScoringConfig } = require('./scoringService')
const etl = require('./etlPipeline')

// ─── Raw Staging ──────────────────────────────────────────────────────────────

/** Stage raw provider data into Layer 1 for audit/reproducibility */
async function stageRaw(prisma, provider, dataType, eventRef, payload) {
  try {
    const recordCount = Array.isArray(payload) ? payload.length
      : payload?.players?.length || payload?.rankings?.length
        || payload?.schedule?.length || payload?.field?.length
        || payload?.data?.length || payload?.baseline?.length
        || payload?.projections?.length || payload?.live_stats?.length || null
    await prisma.rawProviderData.create({
      data: {
        provider,
        dataType,
        eventRef: eventRef ? String(eventRef) : null,
        payload,
        recordCount,
      },
    })
  } catch (e) {
    console.warn(`[StageRaw] Failed to stage ${provider}/${dataType}: ${e.message}`)
  }
}

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

/** Map 3-letter country codes (DataGolf) to 2-letter ISO codes */
const COUNTRY_CODE_MAP = {
  USA: 'US', ENG: 'GB', SCO: 'GB', WAL: 'GB', NIR: 'GB', IRL: 'IE',
  CAN: 'CA', AUS: 'AU', RSA: 'ZA', JPN: 'JP', KOR: 'KR', CHN: 'CN',
  TWN: 'TW', THA: 'TH', IND: 'IN', MEX: 'MX', COL: 'CO', ARG: 'AR',
  BRA: 'BR', CHI: 'CL', VEN: 'VE', PER: 'PE', GER: 'DE', FRA: 'FR',
  ESP: 'ES', ITA: 'IT', SWE: 'SE', NOR: 'NO', DEN: 'DK', FIN: 'FI',
  BEL: 'BE', NED: 'NL', AUT: 'AT', SUI: 'CH', POR: 'PT', GRE: 'GR',
  CZE: 'CZ', POL: 'PL', HUN: 'HU', ROM: 'RO', BUL: 'BG', CRO: 'HR',
  SRB: 'RS', SVK: 'SK', SVN: 'SI', TUR: 'TR', ISR: 'IL', PHI: 'PH',
  MAS: 'MY', SIN: 'SG', IDN: 'ID', VIE: 'VN', NZL: 'NZ', FIJ: 'FJ',
  PAR: 'PY', URU: 'UY', PAN: 'PA', CRC: 'CR', GUA: 'GT', JAM: 'JM',
  TTO: 'TT', BAH: 'BS', BER: 'BM', PUR: 'PR', DOM: 'DO', ECU: 'EC',
  BOL: 'BO', ZIM: 'ZW', KEN: 'KE', NGA: 'NG', GHA: 'GH', EGY: 'EG',
  MAR: 'MA', TUN: 'TN', ALG: 'DZ', SAU: 'SA', UAE: 'AE', QAT: 'QA',
  BRN: 'BH', KUW: 'KW', PAK: 'PK', BAN: 'BD', SRI: 'LK', NEP: 'NP',
  HKG: 'HK', MAC: 'MO', RUS: 'RU', UKR: 'UA', BLR: 'BY', GEO: 'GE',
  ARM: 'AM', LUX: 'LU', MLT: 'MT', CYP: 'CY', ISL: 'IS', EST: 'EE',
  LVA: 'LV', LTU: 'LT',
}

/** Map country code to flag emoji (supports both 2-letter and 3-letter codes) */
function countryToFlag(code) {
  if (!code) return null
  // Convert 3-letter to 2-letter if needed
  let iso2 = code.length === 2 ? code.toUpperCase() : COUNTRY_CODE_MAP[code.toUpperCase()] || null
  if (!iso2) return null
  return String.fromCodePoint(...[...iso2].map((c) => c.charCodeAt(0) + 0x1F1A5))
}

/** Convert DG tour string to our enum-compatible string */
function mapTour(dgTour) {
  const m = { pga: 'PGA', euro: 'DP World', kft: 'Korn Ferry', liv: 'LIV', opp: 'PGA', alt: 'PGA' }
  return m[dgTour] || 'PGA'
}

/** Remove undefined keys from an object (Prisma doesn't like undefined) */
function clean(obj) {
  for (const k of Object.keys(obj)) {
    if (obj[k] === undefined) delete obj[k]
  }
  return obj
}

/** Run an array of Prisma operations in batched transactions (chunks of 50) */
async function batchTransaction(prisma, operations, chunkSize = 50) {
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize)
    await prisma.$transaction(chunk)
  }
}

/**
 * Build and execute a raw SQL bulk upsert.
 * @param {string} table - SQL table name (e.g. "players")
 * @param {string} conflictCol - Column for ON CONFLICT (e.g. '"datagolfId"')
 * @param {string[]} cols - Column names to insert/update
 * @param {Array<object>} rows - Array of row objects keyed by col names
 * @param {object} [opts] - Options: { casts: { colName: 'TypeName' } } for enum casts
 */
async function bulkUpsert(prisma, table, conflictCol, cols, rows, opts = {}) {
  if (rows.length === 0) return 0

  const casts = opts.casts || {}

  // Always include createdAt + updatedAt for new rows
  const allCols = [...cols, 'createdAt', 'updatedAt']
  const colList = allCols.map((c) => `"${c}"`).join(', ')

  // Process in chunks (Postgres parameter limit is 65535)
  const chunkSize = Math.min(500, Math.floor(65000 / allCols.length))
  let total = 0

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    const values = []
    const params = []
    let paramIdx = 1

    for (const row of chunk) {
      const placeholders = allCols.map((col) => {
        const p = `$${paramIdx++}`
        return casts[col] ? `${p}::"${casts[col]}"` : p
      })
      values.push(`(${placeholders.join(', ')})`)
      for (const col of cols) {
        params.push(row[col] ?? null)
      }
      // Add createdAt and updatedAt
      params.push(new Date())
      params.push(new Date())
    }

    // SET clause: update all cols except conflict col and id
    const conflictName = conflictCol.replace(/"/g, '')
    const updateCols = cols.filter((c) => c !== conflictName && c !== 'id')
    const setClause = updateCols
      .map((c) => {
        const exc = `EXCLUDED."${c}"`
        return casts[c] ? `"${c}" = ${exc}` : `"${c}" = ${exc}`
      })
      .join(', ')

    const sql = `
      INSERT INTO "${table}" (${colList})
      VALUES ${values.join(', ')}
      ON CONFLICT (${conflictCol}) DO UPDATE SET ${setClause}, "updatedAt" = NOW()
    `

    await prisma.$executeRawUnsafe(sql, ...params)
    total += chunk.length
  }
  return total
}

// ─── 2a. Sync Players ──────────────────────────────────────────────────────

async function syncPlayers(prisma) {
  console.log('[Sync] Starting player sync...')

  // Fetch all data from DataGolf in parallel
  const [playerList, rankings, skills] = await Promise.all([
    dg.getPlayerList(),
    dg.getRankings(),
    dg.getSkillRatings('value'),
  ])
  console.log('[Sync] API data fetched, processing...')

  // Stage raw data (Layer 1)
  await Promise.all([
    stageRaw(prisma, 'datagolf', 'player_list', null, playerList),
    stageRaw(prisma, 'datagolf', 'rankings', null, rankings),
    stageRaw(prisma, 'datagolf', 'skill_ratings', null, skills),
  ])

  // Index rankings and skills by dg_id
  const rankMap = {}
  if (rankings?.rankings) {
    for (const r of rankings.rankings) rankMap[r.dg_id] = r
  }
  const skillMap = {}
  if (skills?.players) {
    for (const s of skills.players) skillMap[s.dg_id] = s
  }

  const players = Array.isArray(playerList) ? playerList : playerList?.players || []

  // Build rows for bulk upsert
  const cols = [
    'id', 'datagolfId', 'firstName', 'lastName', 'name', 'country', 'countryFlag',
    'primaryTour', 'isAmateur', 'datagolfRank', 'datagolfSkill', 'owgrRank',
    'sgTotal', 'sgPutting', 'sgApproach', 'sgOffTee', 'sgAroundGreen', 'sgTeeToGreen',
    'draftKingsId', 'fanDuelId',
  ]

  // We need IDs for the upsert — load existing ones, generate new CUIDs for new players
  const existingPlayers = await prisma.player.findMany({
    where: { datagolfId: { not: null } },
    select: { id: true, datagolfId: true },
  })
  const existingMap = new Map(existingPlayers.map((p) => [p.datagolfId, p.id]))

  // Simple CUID-like ID generator for new players
  const { randomBytes } = require('crypto')
  const genId = () => 'c' + randomBytes(12).toString('hex').slice(0, 24)

  const rows = []
  for (const p of players) {
    const dgId = String(p.dg_id)
    const { firstName, lastName } = splitName(p.player_name)
    const rank = rankMap[p.dg_id] || {}
    const skill = skillMap[p.dg_id] || {}

    rows.push({
      id: existingMap.get(dgId) || genId(),
      datagolfId: dgId,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      country: p.country || null,
      countryFlag: countryToFlag(p.country_code || p.country),
      primaryTour: mapTour(p.primary_tour || 'pga'),
      isAmateur: p.amateur === true || p.amateur === 1,
      datagolfRank: rank.datagolf_rank ?? null,
      datagolfSkill: rank.dg_skill_estimate != null ? rank.dg_skill_estimate : null,
      owgrRank: rank.owgr_rank ?? null,
      sgTotal: skill.sg_total ?? null,
      sgPutting: skill.sg_putt ?? null,
      sgApproach: skill.sg_app ?? null,
      sgOffTee: skill.sg_ott ?? null,
      sgAroundGreen: skill.sg_arg ?? null,
      sgTeeToGreen: skill.sg_t2g ?? null,
      draftKingsId: p.dk_id ? String(p.dk_id) : null,
      fanDuelId: p.fd_id ? String(p.fd_id) : null,
    })
  }

  const count = await bulkUpsert(prisma, 'players', '"datagolfId"', cols, rows)

  const newCount = rows.filter((r) => !existingMap.has(r.datagolfId)).length
  const updatedCount = rows.length - newCount

  console.log(`[Sync] Players done: ${newCount} created, ${updatedCount} updated, ${count} total`)
  return { created: newCount, updated: updatedCount, total: count }
}

// ─── 2b. Sync Schedule ──────────────────────────────────────────────────────

async function syncSchedule(prisma) {
  console.log('[Sync] Starting schedule sync...')

  const scheduleData = await dg.getSchedule('pga')
  await stageRaw(prisma, 'datagolf', 'schedule', null, scheduleData)
  const events = scheduleData?.schedule || scheduleData || []

  // Load existing tournaments
  const existingTournaments = await prisma.tournament.findMany({
    where: { datagolfId: { not: null } },
    select: { id: true, datagolfId: true },
  })
  const existingMap = new Map(existingTournaments.map((t) => [t.datagolfId, t.id]))

  const { randomBytes } = require('crypto')
  const genId = () => 'c' + randomBytes(12).toString('hex').slice(0, 24)

  const cols = ['id', 'datagolfId', 'name', 'shortName', 'location', 'tour', 'purse', 'isMajor', 'isSignature', 'isPlayoff', 'startDate', 'endDate', 'status']
  const rows = []

  for (const evt of events) {
    const dgId = String(evt.event_id || evt.dg_id)
    if (!dgId || dgId === 'undefined') continue

    let startDate = null, endDate = null
    if (evt.date || evt.start_date) {
      startDate = new Date(evt.date || evt.start_date)
    }
    if (evt.end_date) {
      endDate = new Date(evt.end_date)
    } else if (startDate) {
      endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000)
    }

    const now = new Date()
    // End date from API is midnight UTC on the final day, but tournaments finish
    // in the evening US time. Add 29 hours buffer (end of day ET + margin).
    const effectiveEnd = endDate ? new Date(endDate.getTime() + 29 * 60 * 60 * 1000) : null
    let status = 'UPCOMING'
    if (effectiveEnd && effectiveEnd < now) status = 'COMPLETED'
    else if (startDate && startDate <= now && (!effectiveEnd || effectiveEnd >= now)) status = 'IN_PROGRESS'

    rows.push({
      id: existingMap.get(dgId) || genId(),
      datagolfId: dgId,
      name: evt.event_name || evt.name,
      shortName: evt.event_name_short || null,
      location: evt.course || evt.location || null,
      tour: mapTour(evt.tour || 'pga'),
      purse: evt.purse != null ? parseFloat(evt.purse) : null,
      isMajor: evt.major === true || evt.major === 1,
      isSignature: evt.signature === true || evt.signature === 1,
      isPlayoff: evt.playoff === true || evt.playoff === 1,
      startDate,
      endDate,
      status,
    })
  }

  const count = await bulkUpsert(prisma, 'tournaments', '"datagolfId"', cols, rows, {
    casts: { status: 'TournamentStatus' },
  })
  const newCount = rows.filter((r) => !existingMap.has(r.datagolfId)).length

  // Populate ClutchEventIdMap (Rosetta Stone) for each tournament
  for (const row of rows) {
    try {
      await etl.upsertEventIdMap(prisma, {
        tournamentId: row.id,
        datagolfEventId: row.datagolfId,
        eventName: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
      })
    } catch (e) {
      // Non-critical — log and continue
      console.warn(`[Sync] EventIdMap upsert failed for ${row.datagolfId}: ${e.message}`)
    }
  }

  // ── Link tournaments to courses ──
  try {
    const coursesLinked = await linkTournamentsToCourses(prisma)
    console.log(`[Sync] Course linking: ${coursesLinked} tournaments linked`)
  } catch (e) {
    console.warn(`[Sync] Course linking failed: ${e.message}`)
  }

  console.log(`[Sync] Schedule done: ${newCount} created, ${rows.length - newCount} updated, ${count} total`)
  return { created: newCount, updated: rows.length - newCount, total: count }
}

/**
 * Normalize a course/location string for fuzzy matching.
 * Strips common suffixes, lowercases, removes punctuation.
 */
function normalizeCourseString(s) {
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove parentheticals
    .replace(/golf\s*(club|course|links)/gi, '')
    .replace(/country\s*club/gi, '')
    .replace(/resort\s*(&|and)?\s*(spa|lodge)?/gi, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Try to match a tournament location string to a Course record.
 * Returns course.id if matched, null otherwise.
 */
function matchCourseToLocation(location, courseLookup) {
  if (!location) return null
  const normLoc = normalizeCourseString(location)
  if (!normLoc) return null

  // Exact normalized match
  if (courseLookup.has(normLoc)) return courseLookup.get(normLoc)

  // Check if location contains or is contained by a course name
  for (const [normName, courseId] of courseLookup) {
    if (normLoc.includes(normName) || normName.includes(normLoc)) {
      return courseId
    }
  }

  return null
}

/**
 * Link tournaments to courses by fuzzy-matching location to course names/nicknames.
 */
async function linkTournamentsToCourses(prisma) {
  const courses = await prisma.course.findMany({
    select: { id: true, name: true, nickname: true },
  })

  // Build lookup: normalized name/nickname → courseId
  const courseLookup = new Map()
  for (const c of courses) {
    const normName = normalizeCourseString(c.name)
    if (normName) courseLookup.set(normName, c.id)
    if (c.nickname) {
      const normNick = normalizeCourseString(c.nickname)
      if (normNick) courseLookup.set(normNick, c.id)
    }
  }

  // Find tournaments without a courseId that have a location
  const unlinked = await prisma.tournament.findMany({
    where: { courseId: null, location: { not: null } },
    select: { id: true, location: true },
  })

  let linked = 0
  for (const t of unlinked) {
    const courseId = matchCourseToLocation(t.location, courseLookup)
    if (courseId) {
      await prisma.tournament.update({
        where: { id: t.id },
        data: { courseId },
      })
      linked++
    }
  }

  return linked
}

// ─── 2c. Sync Field & Tee Times ────────────────────────────────────────────

async function syncFieldAndTeeTimesForTournament(tournamentDgId, prisma) {
  console.log(`[Sync] Syncing field for tournament DG ID: ${tournamentDgId}`)

  const fieldData = await dg.getFieldUpdates(tournamentDgId)
  await stageRaw(prisma, 'datagolf', 'field_updates', tournamentDgId, fieldData)
  const field = fieldData?.field || fieldData || []

  const tournament = await prisma.tournament.findFirst({
    where: { datagolfId: String(tournamentDgId) },
  })
  if (!tournament) throw new Error(`Tournament with datagolfId ${tournamentDgId} not found in DB`)

  // Load all players indexed by datagolfId (ONE query)
  const allPlayers = await prisma.player.findMany({
    where: { datagolfId: { not: null } },
    select: { id: true, datagolfId: true },
  })
  const playerMap = new Map(allPlayers.map((p) => [p.datagolfId, p.id]))

  const perfUpserts = []
  const roundScoreUpserts = []
  const dfsEntries = { dk: [], fd: [] }
  let playersInField = 0
  let teeTimes = 0
  let dfsSalaries = 0

  for (const entry of field) {
    const dgId = String(entry.dg_id)
    const playerId = playerMap.get(dgId)
    if (!playerId) continue

    // Performance upsert
    perfUpserts.push(
      prisma.performance.upsert({
        where: { tournamentId_playerId: { tournamentId: tournament.id, playerId } },
        update: { status: 'ACTIVE' },
        create: { tournamentId: tournament.id, playerId, status: 'ACTIVE' },
      })
    )
    playersInField++

    // Tee times — store all available rounds (r1 through r4)
    const teeTimeFields = [
      { field: 'r1_teetime', round: 1 },
      { field: 'r2_teetime', round: 2 },
      { field: 'r3_teetime', round: 3 },
      { field: 'r4_teetime', round: 4 },
    ]
    // Also check legacy single tee_time field as R1 fallback
    if (!entry.r1_teetime && entry.tee_time) {
      entry.r1_teetime = entry.tee_time
    }
    for (const { field: f, round } of teeTimeFields) {
      if (entry[f]) {
        roundScoreUpserts.push(
          prisma.roundScore.upsert({
            where: {
              tournamentId_playerId_roundNumber: { tournamentId: tournament.id, playerId, roundNumber: round },
            },
            update: { teeTime: new Date(entry[f]) },
            create: { tournamentId: tournament.id, playerId, roundNumber: round, teeTime: new Date(entry[f]) },
          })
        )
        teeTimes++
      }
    }

    // DFS salaries
    if (entry.dk_salary) {
      dfsEntries.dk.push({ playerId, salary: entry.dk_salary })
      dfsSalaries++
    }
    if (entry.fd_salary) {
      dfsEntries.fd.push({ playerId, salary: entry.fd_salary })
      dfsSalaries++
    }
  }

  // Execute performance upserts in batched transactions
  await batchTransaction(prisma, perfUpserts)
  await batchTransaction(prisma, roundScoreUpserts)

  // DFS slates + entries
  for (const [platform, entries] of [['DRAFTKINGS', dfsEntries.dk], ['FANDUEL', dfsEntries.fd]]) {
    if (entries.length === 0) continue
    const slate = await getOrCreateSlate(tournament.id, platform, prisma)
    const dfsOps = entries.map((e) =>
      prisma.playerDFSEntry.upsert({
        where: { slateId_playerId: { slateId: slate.id, playerId: e.playerId } },
        update: { salary: e.salary },
        create: { slateId: slate.id, playerId: e.playerId, salary: e.salary },
      })
    )
    await batchTransaction(prisma, dfsOps)
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
  await stageRaw(prisma, 'datagolf', 'live_scoring', tournamentDgId, liveData)

  const tournament = await prisma.tournament.findFirst({
    where: { datagolfId: String(tournamentDgId) },
  })
  if (!tournament) throw new Error(`Tournament with datagolfId ${tournamentDgId} not found in DB`)

  // Load all players indexed by datagolfId (ONE query)
  const allPlayers = await prisma.player.findMany({
    where: { datagolfId: { not: null } },
    select: { id: true, datagolfId: true },
  })
  const playerMap = new Map(allPlayers.map((p) => [p.datagolfId, p.id]))

  const players = liveData?.data || liveData?.players || liveData || []
  let maxRound = 1

  const liveScoreOps = []
  const perfOps = []

  for (const entry of players) {
    const dgId = String(entry.dg_id)
    const playerId = playerMap.get(dgId)
    if (!playerId) continue

    const currentRound = entry.current_round || entry.round || 1
    if (currentRound > maxRound) maxRound = currentRound

    const thru = entry.thru ?? entry.holes_completed ?? null
    // current_pos is a string like "1", "T3" — parse to number
    const posStr = entry.current_pos ?? entry.position ?? null
    const position = posStr != null ? parseInt(String(posStr).replace(/\D/g, '')) || null : null
    const positionTied = typeof posStr === 'string' && posStr.includes('T')
    // DataGolf uses "current_score" for total to par
    const totalToPar = entry.current_score ?? entry.total ?? entry.total_to_par ?? null
    const todayToPar = entry.today ?? entry.today_to_par ?? null

    const liveData = {
      position,
      positionTied,
      totalToPar,
      todayToPar,
      thru: typeof thru === 'number' ? thru : null,
      currentRound,
      currentHole: entry.current_hole ?? entry.end_hole ?? null,
      winProbability: entry.win_prob ?? entry.win ?? null,
      top5Probability: entry.top_5_prob ?? entry.top_5 ?? null,
      top10Probability: entry.top_10_prob ?? entry.top_10 ?? null,
      top20Probability: entry.top_20_prob ?? entry.top_20 ?? null,
      makeCutProbability: entry.make_cut_prob ?? entry.make_cut ?? null,
      sgTotalLive: entry.sg_total ?? null,
      lastUpdated: new Date(),
    }

    liveScoreOps.push(
      prisma.liveScore.upsert({
        where: { tournamentId_playerId: { tournamentId: tournament.id, playerId } },
        update: liveData,
        create: { tournamentId: tournament.id, playerId, ...liveData },
      })
    )

    const perfUpdate = {
      totalToPar,
      status: entry.status === 'cut' ? 'CUT' : entry.status === 'wd' ? 'WD' : 'ACTIVE',
    }
    if (position != null) perfUpdate.position = position
    // DataGolf uses uppercase R1, R2, R3, R4 for round scores
    for (let r = 1; r <= 4; r++) {
      const roundScore = entry[`R${r}`] ?? entry[`r${r}`] ?? entry[`round_${r}`] ?? null
      if (roundScore != null) perfUpdate[`round${r}`] = roundScore
    }

    perfOps.push(
      prisma.performance.upsert({
        where: { tournamentId_playerId: { tournamentId: tournament.id, playerId } },
        update: perfUpdate,
        create: { tournamentId: tournament.id, playerId, ...perfUpdate },
      })
    )
  }

  // Execute in batched transactions
  await batchTransaction(prisma, liveScoreOps)
  await batchTransaction(prisma, perfOps)

  // Compute date-based expected round as a floor (API may lag between rounds)
  const daysSinceStart = Math.floor((Date.now() - new Date(tournament.startDate).getTime()) / 86400000)
  const dateBasedRound = Math.min(Math.max(daysSinceStart + 1, 1), 4)
  const effectiveRound = Math.max(maxRound, dateBasedRound)

  // Update tournament status
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'IN_PROGRESS', currentRound: effectiveRound },
  })

  console.log(`[Sync] Live scoring done: ${liveScoreOps.length} players updated, round ${effectiveRound} (api=${maxRound}, date=${dateBasedRound})`)
  return { updated: liveScoreOps.length, tournamentStatus: 'IN_PROGRESS' }
}

// ─── 2e. Sync Pre-Tournament Predictions ────────────────────────────────────

async function syncPreTournamentPredictions(tournamentDgId, prisma) {
  console.log(`[Sync] Syncing predictions for DG ID: ${tournamentDgId}`)

  const predData = await dg.getPreTournamentPredictions(tournamentDgId)
  await stageRaw(prisma, 'datagolf', 'predictions', tournamentDgId, predData)

  const tournament = await prisma.tournament.findFirst({
    where: { datagolfId: String(tournamentDgId) },
  })
  if (!tournament) throw new Error(`Tournament with datagolfId ${tournamentDgId} not found in DB`)

  // Load all players indexed by datagolfId (ONE query)
  const allPlayers = await prisma.player.findMany({
    where: { datagolfId: { not: null } },
    select: { id: true, datagolfId: true },
  })
  const playerMap = new Map(allPlayers.map((p) => [p.datagolfId, p.id]))

  const baseline = predData?.baseline || predData?.data || predData || []
  const predOps = []

  for (const entry of baseline) {
    const dgId = String(entry.dg_id)
    const playerId = playerMap.get(dgId)
    if (!playerId) continue

    const predictionData = {
      winProbability: entry.win ?? null,
      top5Probability: entry.top_5 ?? null,
      top10Probability: entry.top_10 ?? null,
      top20Probability: entry.top_20 ?? null,
      makeCutProbability: entry.make_cut ?? null,
      source: 'datagolf',
    }

    predOps.push(
      prisma.playerPrediction.upsert({
        where: { tournamentId_playerId: { tournamentId: tournament.id, playerId } },
        update: predictionData,
        create: { tournamentId: tournament.id, playerId, ...predictionData },
      })
    )
  }

  await batchTransaction(prisma, predOps)

  console.log(`[Sync] Predictions done: ${predOps.length} players`)
  return { predictions: predOps.length }
}

// ─── 2f. Sync Fantasy Projections ───────────────────────────────────────────

async function syncFantasyProjections(tournamentDgId, prisma) {
  console.log(`[Sync] Syncing fantasy projections for DG ID: ${tournamentDgId}`)

  const tournament = await prisma.tournament.findFirst({
    where: { datagolfId: String(tournamentDgId) },
  })
  if (!tournament) throw new Error(`Tournament with datagolfId ${tournamentDgId} not found in DB`)

  // Load all players indexed by datagolfId (ONE query)
  const allPlayers = await prisma.player.findMany({
    where: { datagolfId: { not: null } },
    select: { id: true, datagolfId: true },
  })
  const playerMap = new Map(allPlayers.map((p) => [p.datagolfId, p.id]))

  const [dkData, fdData] = await Promise.all([
    dg.getFantasyProjections(tournamentDgId, 'draftkings'),
    dg.getFantasyProjections(tournamentDgId, 'fanduel'),
  ])
  await Promise.all([
    stageRaw(prisma, 'datagolf', 'projections', tournamentDgId, { draftkings: dkData, fanduel: fdData }),
  ])

  let dkCount = 0
  let fdCount = 0

  // DraftKings
  const dkProjections = dkData?.projections || dkData || []
  const dkSlate = await getOrCreateSlate(tournament.id, 'DRAFTKINGS', prisma)
  const dkOps = []
  for (const entry of dkProjections) {
    const playerId = playerMap.get(String(entry.dg_id))
    if (!playerId) continue
    dkOps.push(
      prisma.playerDFSEntry.upsert({
        where: { slateId_playerId: { slateId: dkSlate.id, playerId } },
        update: {
          salary: entry.salary ?? null,
          projectedPoints: entry.proj_points ?? entry.projection ?? null,
          ownership: entry.proj_ownership ?? entry.ownership ?? null,
        },
        create: {
          slateId: dkSlate.id,
          playerId,
          salary: entry.salary ?? null,
          projectedPoints: entry.proj_points ?? entry.projection ?? null,
          ownership: entry.proj_ownership ?? entry.ownership ?? null,
        },
      })
    )
  }
  await batchTransaction(prisma, dkOps)
  dkCount = dkOps.length

  // FanDuel
  const fdProjections = fdData?.projections || fdData || []
  const fdSlate = await getOrCreateSlate(tournament.id, 'FANDUEL', prisma)
  const fdOps = []
  for (const entry of fdProjections) {
    const playerId = playerMap.get(String(entry.dg_id))
    if (!playerId) continue
    fdOps.push(
      prisma.playerDFSEntry.upsert({
        where: { slateId_playerId: { slateId: fdSlate.id, playerId } },
        update: {
          salary: entry.salary ?? null,
          projectedPoints: entry.proj_points ?? entry.projection ?? null,
          ownership: entry.proj_ownership ?? entry.ownership ?? null,
        },
        create: {
          slateId: fdSlate.id,
          playerId,
          salary: entry.salary ?? null,
          projectedPoints: entry.proj_points ?? entry.projection ?? null,
          ownership: entry.proj_ownership ?? entry.ownership ?? null,
        },
      })
    )
  }
  await batchTransaction(prisma, fdOps)
  fdCount = fdOps.length

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

  // Load all players indexed by datagolfId (ONE query)
  const allPlayers = await prisma.player.findMany({
    where: { datagolfId: { not: null } },
    select: { id: true, datagolfId: true },
  })
  const playerMap = new Map(allPlayers.map((p) => [p.datagolfId, p.id]))

  // Get final SG stats
  const statsData = await dg.getLiveTournamentStats(tournamentDgId)
  await stageRaw(prisma, 'datagolf', 'tournament_stats', tournamentDgId, statsData)
  const players = statsData?.live_stats || statsData?.data || statsData || []

  const perfOps = []
  const playerUpdateOps = []

  for (const entry of players) {
    const dgId = String(entry.dg_id)
    const playerId = playerMap.get(dgId)
    if (!playerId) continue

    const position = entry.fin_pos ?? entry.position ?? null
    const earnings = entry.earnings ?? null

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

    perfOps.push(
      prisma.performance.upsert({
        where: { tournamentId_playerId: { tournamentId: tournament.id, playerId } },
        update: perfUpdate,
        create: { tournamentId: tournament.id, playerId, ...perfUpdate },
      })
    )

    // Update player season stats
    if (typeof position === 'number' && perfUpdate.status === 'ACTIVE') {
      const updateData = { events: { increment: 1 }, cutsMade: { increment: 1 } }
      if (position === 1) updateData.wins = { increment: 1 }
      if (position <= 5) updateData.top5s = { increment: 1 }
      if (position <= 10) updateData.top10s = { increment: 1 }
      if (position <= 25) updateData.top25s = { increment: 1 }
      if (earnings != null) updateData.earnings = { increment: earnings }
      playerUpdateOps.push(prisma.player.update({ where: { id: playerId }, data: updateData }))
    } else if (perfUpdate.status === 'CUT') {
      playerUpdateOps.push(prisma.player.update({ where: { id: playerId }, data: { events: { increment: 1 } } }))
    }
  }

  // Execute in batched transactions
  await batchTransaction(prisma, perfOps)
  await batchTransaction(prisma, playerUpdateOps)

  // Calculate fantasy points for all performances
  const performances = await prisma.performance.findMany({
    where: { tournamentId: tournament.id },
    include: { roundScores: true },
  })

  const scoringConfig = getDefaultScoringConfig('standard')
  const fpOps = []
  for (const perf of performances) {
    const { total } = calculateFantasyPoints(perf, scoringConfig)
    fpOps.push(prisma.performance.update({ where: { id: perf.id }, data: { fantasyPoints: total } }))
  }
  await batchTransaction(prisma, fpOps)

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
