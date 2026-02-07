/**
 * Draft Grading Service
 *
 * Grades completed drafts (league + mock) using a rank-vs-ADP algorithm.
 * Produces letter grades (A+ through F) for each pick and an overall team grade.
 */

// ─── Grade Scale ────────────────────────────────────────────────────────────

function scoreToGrade(score) {
  if (score >= 97) return 'A+'
  if (score >= 90) return 'A'
  if (score >= 87) return 'A-'
  if (score >= 83) return 'B+'
  if (score >= 80) return 'B'
  if (score >= 77) return 'B-'
  if (score >= 73) return 'C+'
  if (score >= 70) return 'C'
  if (score >= 67) return 'C-'
  if (score >= 63) return 'D+'
  if (score >= 60) return 'D'
  if (score >= 57) return 'D-'
  return 'F'
}

function gradeColor(grade) {
  if (grade.startsWith('A')) return 'green'
  if (grade.startsWith('B')) return 'blue'
  if (grade.startsWith('C')) return 'yellow'
  if (grade.startsWith('D')) return 'orange'
  return 'red'
}

// ─── Per-Pick Grading ───────────────────────────────────────────────────────

/**
 * Grade a single pick based on rank vs pick position AND player quality.
 *
 * The grade blends two factors:
 *   1. Value score — did you get a player later than expected? (steal vs reach)
 *   2. Quality score — how good is the player relative to the round?
 *
 * A pick like Scottie Scheffler (#1 rank) at pick #1 is a perfect quality pick
 * even though adpDiff=0. A rank #50 player at pick #1 is a terrible quality pick.
 *
 * @param {object} pick - { pickNumber, round, playerRank }
 * @param {object} context - { totalPicks, totalRounds, totalTeams }
 * @returns {{ score: number, grade: string, adpDiff: number }}
 */
function gradePick(pick, context) {
  const { pickNumber, round, playerRank } = pick
  const { totalTeams, totalRounds } = context

  // adpDiff: positive = steal (picked later than expected), negative = reach
  const adpDiff = playerRank - pickNumber

  // ── Value score (40% weight): based on adpDiff ─────────────────────────
  // +3 per pick of value from a baseline of 80 (B grade = expected value)
  let valueScore = 80 + (adpDiff * 3)

  // Late-round steal bonus
  if (adpDiff > 0 && round >= 3) {
    valueScore += Math.min(adpDiff * 0.5, 5)
  }

  valueScore = Math.max(0, Math.min(100, valueScore))

  // ── Quality score (60% weight): how good is this player for this round? ─
  // What's the "expected" rank range for this round?
  // Round 1 expects ranks 1–totalTeams, Round 2 expects totalTeams+1 to 2*totalTeams, etc.
  const roundStart = (round - 1) * totalTeams + 1
  const roundEnd = round * totalTeams
  const roundMidpoint = (roundStart + roundEnd) / 2

  // How much better (positive) or worse (negative) is this player vs round expectation?
  const qualityDiff = roundMidpoint - playerRank

  // Quality baseline: 80 (B) + bonuses/penalties
  // Each position better than expected = +2 points, each worse = -3 points (reaching hurts more)
  let qualityScore = 80 + (qualityDiff > 0 ? qualityDiff * 2 : qualityDiff * 3)

  // Elite player bonus: top-3 in round 1 are always A+ picks
  if (playerRank <= 3 && round === 1) {
    qualityScore = Math.max(qualityScore, 98)
  }
  // Top-5 in round 1 are always A picks
  else if (playerRank <= 5 && round === 1) {
    qualityScore = Math.max(qualityScore, 95)
  }
  // Top-15 in rounds 1-2 always grade well
  if (playerRank <= 15 && round <= 2) {
    qualityScore = Math.max(qualityScore, 87)
  }

  qualityScore = Math.max(0, Math.min(100, qualityScore))

  // ── Blend: 60% quality + 40% value ─────────────────────────────────────
  let score = qualityScore * 0.6 + valueScore * 0.4

  score = Math.max(0, Math.min(100, score))

  return {
    score: Math.round(score * 10) / 10,
    grade: scoreToGrade(score),
    adpDiff,
  }
}

// ─── Mock Draft Grading ─────────────────────────────────────────────────────

/**
 * Grade a mock draft — pure rank-based grading (no season data).
 *
 * @param {Array} userPicks - [{ pickNumber, round, playerId, playerName, playerRank }]
 * @param {object} config - { teamCount, rosterSize }
 * @returns {object} Full grade result
 */
function gradeMockDraft(userPicks, config) {
  const { teamCount, rosterSize } = config
  const totalPicks = teamCount * rosterSize
  const totalRounds = rosterSize
  const context = { totalPicks, totalRounds, totalTeams: teamCount }

  const pickGrades = userPicks.map(pick => {
    const result = gradePick(pick, context)
    return {
      pickNumber: pick.pickNumber,
      round: pick.round,
      playerId: pick.playerId,
      playerName: pick.playerName,
      playerRank: pick.playerRank,
      grade: result.grade,
      score: result.score,
      adpDiff: result.adpDiff,
    }
  })

  // Overall grade: weighted average (earlier rounds weighted more)
  let weightedSum = 0
  let weightTotal = 0
  for (const pg of pickGrades) {
    const weight = totalRounds - pg.round + 1 // Round 1 gets most weight
    weightedSum += pg.score * weight
    weightTotal += weight
  }
  const overallScore = weightTotal > 0
    ? Math.round((weightedSum / weightTotal) * 10) / 10
    : 70

  // Best and worst pick
  const sorted = [...pickGrades].sort((a, b) => b.score - a.score)
  const bestPick = sorted.length > 0
    ? { playerId: sorted[0].playerId, playerName: sorted[0].playerName, pickNumber: sorted[0].pickNumber, score: sorted[0].score, grade: sorted[0].grade }
    : null
  const worstPick = sorted.length > 0
    ? { playerId: sorted[sorted.length - 1].playerId, playerName: sorted[sorted.length - 1].playerName, pickNumber: sorted[sorted.length - 1].pickNumber, score: sorted[sorted.length - 1].score, grade: sorted[sorted.length - 1].grade }
    : null

  // Sleepers: late picks with high scores (round 3+, score >= 80)
  const sleepers = pickGrades.filter(pg => pg.round >= 3 && pg.score >= 80)
  // Reaches: picks with score < 60
  const reaches = pickGrades.filter(pg => pg.score < 60)

  return {
    overallGrade: scoreToGrade(overallScore),
    overallScore,
    pickGrades,
    positionGrades: {}, // Golf doesn't have position breakdowns
    bestPick,
    worstPick,
    sleepers,
    reaches,
  }
}

// ─── League Draft Grading ───────────────────────────────────────────────────

/**
 * Grade a real league draft. Can blend with actual fantasy production if available.
 *
 * @param {string} draftId
 * @param {object} prisma
 * @returns {Array<object>} Array of grade objects per team
 */
async function gradeLeagueDraft(draftId, prisma) {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: {
      picks: {
        include: {
          player: { select: { id: true, name: true, owgrRank: true, datagolfRank: true } },
          team: { select: { id: true, name: true, userId: true } },
          draftValueTracker: true,
        },
        orderBy: { pickNumber: 'asc' },
      },
      league: { select: { id: true, sportId: true, maxTeams: true, settings: true } },
      draftOrder: { orderBy: { position: 'asc' } },
    },
  })

  if (!draft || draft.picks.length === 0) return []

  const totalTeams = draft.draftOrder.length || draft.league.maxTeams
  const totalRounds = draft.totalRounds
  const totalPicks = draft.picks.length
  const context = { totalPicks, totalRounds, totalTeams }

  // Group picks by team
  const teamPicksMap = new Map()
  for (const pick of draft.picks) {
    if (!teamPicksMap.has(pick.teamId)) {
      teamPicksMap.set(pick.teamId, {
        team: pick.team,
        picks: [],
      })
    }
    teamPicksMap.get(pick.teamId).picks.push(pick)
  }

  const results = []

  for (const [teamId, { team, picks }] of teamPicksMap) {
    const pickGrades = picks.map(pick => {
      const playerRank = pick.player.datagolfRank || pick.player.owgrRank || pick.pickNumber
      const pickData = { pickNumber: pick.pickNumber, round: pick.round, playerRank }
      const result = gradePick(pickData, context)

      // If we have DraftValueTracker data (season played out), blend it in
      let blendedScore = result.score
      if (pick.draftValueTracker?.valueVsAdp != null) {
        const productionScore = 70 + (pick.draftValueTracker.valueVsAdp * 2)
        const clampedProd = Math.max(0, Math.min(100, productionScore))
        // 60% ADP-based, 40% actual production
        blendedScore = Math.round((result.score * 0.6 + clampedProd * 0.4) * 10) / 10
      }

      return {
        pickNumber: pick.pickNumber,
        round: pick.round,
        playerId: pick.playerId,
        playerName: pick.player.name,
        playerRank,
        grade: scoreToGrade(blendedScore),
        score: blendedScore,
        adpDiff: result.adpDiff,
        amount: pick.amount || null,
      }
    })

    // Overall weighted average
    let weightedSum = 0
    let weightTotal = 0
    for (const pg of pickGrades) {
      const weight = totalRounds - pg.round + 1
      weightedSum += pg.score * weight
      weightTotal += weight
    }
    const overallScore = weightTotal > 0
      ? Math.round((weightedSum / weightTotal) * 10) / 10
      : 70

    const sorted = [...pickGrades].sort((a, b) => b.score - a.score)
    const bestPick = sorted.length > 0
      ? { playerId: sorted[0].playerId, playerName: sorted[0].playerName, pickNumber: sorted[0].pickNumber, score: sorted[0].score, grade: sorted[0].grade }
      : null
    const worstPick = sorted.length > 0
      ? { playerId: sorted[sorted.length - 1].playerId, playerName: sorted[sorted.length - 1].playerName, pickNumber: sorted[sorted.length - 1].pickNumber, score: sorted[sorted.length - 1].score, grade: sorted[sorted.length - 1].grade }
      : null

    const sleepers = pickGrades.filter(pg => pg.round >= 3 && pg.score >= 80)
    const reaches = pickGrades.filter(pg => pg.score < 60)

    const totalValue = pickGrades.reduce((s, pg) => s + pg.adpDiff, 0)

    const gradeData = {
      draftId,
      teamId,
      overallGrade: scoreToGrade(overallScore),
      overallScore,
      positionGrades: {},
      pickGrades,
      totalValue,
      bestPick,
      worstPick,
      sleepers,
      reaches,
      sportId: draft.league.sportId || null,
      algorithm: 'v1',
      gradedAt: new Date(),
    }

    // Upsert to DB
    await prisma.draftGrade.upsert({
      where: { draftId_teamId: { draftId, teamId } },
      update: gradeData,
      create: gradeData,
    })

    results.push({ ...gradeData, teamName: team.name, userId: team.userId })
  }

  return results
}

/**
 * Grade all completed but ungraded drafts. Called from cron.
 */
async function gradeAllCompletedDrafts(prisma) {
  const completedDrafts = await prisma.draft.findMany({
    where: {
      status: 'COMPLETED',
      draftGrades: { none: {} },
    },
    select: { id: true },
  })

  let total = 0
  for (const draft of completedDrafts) {
    try {
      const grades = await gradeLeagueDraft(draft.id, prisma)
      total += grades.length
    } catch (e) {
      console.error(`[DraftGrader] Error grading draft ${draft.id}:`, e.message)
    }
  }

  return { draftsGraded: completedDrafts.length, teamGrades: total }
}

module.exports = {
  scoreToGrade,
  gradeColor,
  gradePick,
  gradeMockDraft,
  gradeLeagueDraft,
  gradeAllCompletedDrafts,
}
