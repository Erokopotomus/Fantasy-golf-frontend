/**
 * AI Coach Service (Phase 6C-6F)
 *
 * Orchestrates AI coaching by gathering context from pattern engine
 * and decision graph, then calling Claude to narrate insights.
 *
 * CRITICAL: This service receives PRE-COMPUTED pattern data and asks
 * Claude to NARRATE and EXPAND, not to ANALYZE raw data.
 */

const claude = require('./claudeService')
const patternEngine = require('./patternEngine')
const decisionGraph = require('./decisionGraphService')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CLUTCH_COACH_SYSTEM_PROMPT = `You are the Clutch Coach — an AI coaching engine embedded in the Clutch Fantasy Sports platform.

Your role is to help fantasy sports managers improve their decision-making by analyzing their personal history of predictions, draft decisions, roster moves, and research notes.

Key principles:
- Be specific. Reference actual players, actual decisions, actual outcomes.
- Be honest. Don't sugarcoat poor decisions, but be constructive.
- Be actionable. Every insight should include a concrete "what to do differently."
- Be concise. Users are busy. Lead with the insight, not the explanation.
- Never be generic. You have access to this specific user's data. Use it.
- Acknowledge data limitations. If you only have one season of data, say so.
- Use the user's own words when possible (from their captures and notes).

You are NOT a chatbot. You produce structured coaching insights that appear inside the Clutch app at the right moment. Your output should feel like a smart friend who watches all your games and remembers everything you said.

Output format: Always return valid JSON matching the requested schema.`

// ════════════════════════════════════════════════
//  MODE 1: AMBIENT INTELLIGENCE
// ════════════════════════════════════════════════

/**
 * Generate a single ambient insight for the Feed or Lab.
 * Returns { title, body, insightType, sport, priority, metadata } or null.
 */
async function generateAmbientInsight(userId, sport, insightType, contextData) {
  const prompt = buildAmbientPrompt(insightType, contextData)
  if (!prompt) return null

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 512, feature: 'ambient' })
  if (!result) return null

  return {
    ...result.data,
    insightType,
    sport,
    tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0),
  }
}

function buildAmbientPrompt(insightType, ctx) {
  switch (insightType) {
    case 'POSITION_BIAS_ALERT':
      return `Analyze this user's draft position allocation and generate a coaching insight.

Data: ${JSON.stringify(ctx.draftPatterns?.positionAllocation || {})}
Draft count: ${ctx.draftPatterns?.draftCount || 0}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence coaching insight with specific recommendation", "priority": 3-7, "metadata": { "positions": ["affected positions"] } }`

    case 'PREDICTION_PATTERN':
      return `Analyze this user's prediction accuracy patterns and generate a coaching insight.

Overall accuracy: ${ctx.predictionPatterns?.overallAccuracy || 'unknown'}
By type: ${JSON.stringify(ctx.predictionPatterns?.accuracyByType || {})}
By factor: ${JSON.stringify(ctx.predictionPatterns?.accuracyByFactor || {})}
Biases: ${JSON.stringify(ctx.predictionPatterns?.biases || [])}
Streaks: ${JSON.stringify(ctx.predictionPatterns?.streaks || {})}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence coaching insight referencing specific accuracy numbers", "priority": 3-7, "metadata": {} }`

    case 'TAG_ACCURACY_UPDATE':
      return `Analyze this user's board tag (Target/Sleeper/Avoid) accuracy and generate an insight.

Tag data: ${JSON.stringify(ctx.draftPatterns?.boardTagAccuracy || {})}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence coaching insight about tag accuracy", "priority": 4-7, "metadata": {} }`

    case 'BOARD_DIVERGENCE_TREND':
      return `This user's board diverges from consensus. Analyze their divergence history.

Board adherence: ${JSON.stringify(ctx.draftPatterns?.boardAdherence || {})}
Reach frequency: ${JSON.stringify(ctx.draftPatterns?.reachFrequency || {})}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence insight about how their divergences have historically performed", "priority": 4-6, "metadata": {} }`

    case 'RESEARCH_INTENSITY':
      return `This user has been actively researching. Analyze their capture-to-action pipeline.

Capture data: ${JSON.stringify(ctx.capturePatterns?.captureVolume || {})}
Action rate: ${JSON.stringify(ctx.capturePatterns?.captureToActionRate || {})}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence insight about their research habits", "priority": 5-7, "metadata": {} }`

    case 'WAIVER_PATTERN':
      return `Analyze this user's waiver wire tendencies.

Waiver data: ${JSON.stringify(ctx.rosterPatterns?.waiverTendencies || {})}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence coaching insight about waiver strategy", "priority": 4-6, "metadata": {} }`

    case 'LINEUP_POINTS_LEFT':
      return `Analyze this user's lineup optimization.

Lineup data: ${JSON.stringify(ctx.rosterPatterns?.lineupOptimality || {})}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence coaching insight about points left on bench", "priority": 3-5, "metadata": {} }`

    case 'CAPTURE_CALLBACK':
      return `Generate a "capture callback" insight based on this user's old notes with outcomes.

Capture accuracy: ${JSON.stringify(ctx.capturePatterns?.sentimentAccuracy || {})}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence insight reflecting on their capture accuracy", "priority": 5-7, "metadata": {} }`

    case 'DRAFT_PREP_READINESS':
      return `This user is preparing for drafts. Assess their readiness.

Board data: ${JSON.stringify(ctx.draftPatterns?.boardAdherence || {})}
Capture volume: ${ctx.capturePatterns?.totalCaptures || 0}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence motivational/readiness assessment", "priority": 4-6, "metadata": {} }`

    case 'OPINION_EVOLUTION':
      return `Summarize how this user's opinions tend to evolve over time based on their tendencies.

Tendencies: ${JSON.stringify(ctx.tendencies || [])}
Biases: ${JSON.stringify(ctx.biases || [])}

Return JSON: { "title": "short title (max 60 chars)", "body": "2-3 sentence insight about their decision-making evolution", "priority": 5-7, "metadata": {} }`

    case 'SEASON_MILESTONE':
      return `Celebrate a milestone for this user.

Predictions: ${ctx.predictionPatterns?.totalPredictions || 0}
Captures: ${ctx.capturePatterns?.totalCaptures || 0}
Drafts: ${ctx.draftPatterns?.draftCount || 0}

Return JSON: { "title": "short title (max 60 chars)", "body": "1-2 sentence congratulatory milestone note", "priority": 6-8, "metadata": {} }`

    default:
      return null
  }
}

// ════════════════════════════════════════════════
//  MODE 2: CONTEXTUAL COACHING
// ════════════════════════════════════════════════

/**
 * Generate a draft room nudge.
 */
async function generateDraftNudge(userId, draftState) {
  const profile = await patternEngine.getUserProfile(userId, draftState.sport || 'nfl')
  if (!profile) return null

  const prompt = `You are coaching a fantasy manager during their draft. Generate a contextual nudge.

User's draft patterns: ${JSON.stringify({
    positionAllocation: profile.draftPatterns?.positionAllocation,
    reachFrequency: profile.draftPatterns?.reachFrequency,
    boardAdherence: profile.draftPatterns?.boardAdherence,
  })}

Current draft state:
- Picks so far: ${draftState.picksSoFar || 0}
- Positions drafted: ${JSON.stringify(draftState.positionsDrafted || {})}
- Board players still available: ${draftState.boardPlayersAvailable || 'unknown'}

Return JSON: { "nudgeText": "1-2 sentence nudge (max 120 chars)", "nudgeType": "BOARD_VALUE|POSITION_ALERT|BUDGET_WARNING|AVOID_CONFLICT|TARGET_AVAILABLE", "priority": 1-5 }

Return { "nudgeText": null } if no nudge is warranted.`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 256, feature: 'draftNudge' })
  if (!result || !result.data?.nudgeText) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0) }
}

/**
 * Generate a board editor coaching card.
 */
async function generateBoardCoachingCard(userId, boardId, triggerAction, context) {
  const profile = await patternEngine.getUserProfile(userId, context?.sport || 'nfl')
  if (!profile) return null

  const prompt = `Generate a coaching card for a user editing their draft board.

Trigger: ${triggerAction} (e.g., MAJOR_MOVE, TAG_CHANGE, ENTRY_ADD)
Context: ${JSON.stringify(context || {})}
User tendencies: ${JSON.stringify(profile.tendencies || [])}
User biases: ${JSON.stringify(profile.biases || [])}

Return JSON: { "cardTitle": "short title", "cardBody": "2-3 sentences of coaching advice", "cardType": "HISTORICAL_ECHO|BLIND_SPOT|DIVERGENCE_INSIGHT|POSITION_SCARCITY|CAPTURE_CONNECTION", "relatedPlayers": [], "actionSuggestion": "optional one-line CTA" }

Return { "cardTitle": null } if no coaching card is warranted.`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 384, feature: 'boardCoach' })
  if (!result || !result.data?.cardTitle) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0) }
}

/**
 * Generate prediction context (before submission).
 */
async function generatePredictionContext(userId, predictionData) {
  const predGraph = await decisionGraph.getPredictionGraph(userId, predictionData.sport)

  const prompt = `A user is about to submit a prediction. Provide brief calibration context.

Their prediction accuracy: ${predGraph.overallAccuracy != null ? Math.round(predGraph.overallAccuracy * 100) + '%' : 'unknown'}
By type: ${JSON.stringify(predGraph.accuracyByType || {})}
By factor: ${JSON.stringify(predGraph.accuracyByFactor || {})}
Total predictions: ${predGraph.totalPredictions}
This prediction type: ${predictionData.predictionType}
Player: ${predictionData.playerName || 'unknown'}

Return JSON: { "calibrationNote": "1-2 sentence note about their track record with this type", "historicalAccuracy": "percentage or null", "suggestedConfidence": 1-5 or null }

Return { "calibrationNote": null } if not enough data.`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 256, feature: 'predictionContext' })
  if (!result || !result.data?.calibrationNote) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0) }
}

/**
 * Generate prediction resolution insight.
 */
async function generateResolutionInsight(userId, prediction) {
  const predGraph = await decisionGraph.getPredictionGraph(userId, prediction.sport)

  const prompt = `A prediction just resolved. Generate a coaching reflection.

Prediction: ${prediction.predictionType} about ${prediction.playerName || 'a player'}
Thesis: "${prediction.thesis || 'no thesis provided'}"
Key factors: ${JSON.stringify(prediction.keyFactors || [])}
Confidence: ${prediction.confidenceLevel || 'not set'}
Outcome: ${prediction.outcome}
User's overall accuracy: ${predGraph.overallAccuracy != null ? Math.round(predGraph.overallAccuracy * 100) + '%' : 'unknown'}
Factor accuracy: ${JSON.stringify(predGraph.accuracyByFactor || {})}

Return JSON: { "insightText": "2-3 sentence reflection", "whatWorked": "what the user got right (or null)", "whatMissed": "what the user missed (or null)", "patternNote": "any pattern observation (or null)" }`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 384, feature: 'predictionContext' })
  if (!result) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0) }
}

/**
 * Generate mid-season check-in.
 */
async function generateMidSeasonCheckIn(userId, sport, season) {
  const profile = await patternEngine.getUserProfile(userId, sport)
  if (!profile) return null

  const prompt = `Generate a mid-season check-in for this fantasy manager.

User profile summary:
- Strengths: ${JSON.stringify(profile.strengths || [])}
- Weaknesses: ${JSON.stringify(profile.weaknesses || [])}
- Tendencies: ${JSON.stringify(profile.tendencies || [])}
- One thing to fix: ${JSON.stringify(profile.oneThingToFix || null)}
- Data confidence: ${profile.dataConfidence}

Prediction accuracy: ${profile.predictionPatterns?.overallAccuracy != null ? Math.round(profile.predictionPatterns.overallAccuracy * 100) + '%' : 'unknown'}
Roster management: ${JSON.stringify(profile.rosterPatterns?.lineupOptimality || {})}
Waiver activity: ${JSON.stringify(profile.rosterPatterns?.waiverTendencies || {})}

Return JSON: {
  "title": "Mid-Season Check-In",
  "sections": [
    { "heading": "section name", "body": "2-3 sentences" }
  ],
  "topRecommendation": "single most important action item"
}`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 1024, feature: 'deepReports' })
  if (!result) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0) }
}

// ════════════════════════════════════════════════
//  MODE 3: DEEP COACHING REPORTS
// ════════════════════════════════════════════════

/**
 * Generate a pre-draft coaching report.
 */
async function generatePreDraftReport(userId, sport) {
  const profile = await patternEngine.getUserProfile(userId, sport)
  if (!profile) return null

  const prompt = `Generate a comprehensive pre-draft coaching report for this fantasy manager.

FULL USER INTELLIGENCE PROFILE:
${JSON.stringify(profile, null, 2)}

Generate a report with these sections:
1. "Draft Tendencies" — multi-year patterns (position allocation, reach rate, timing)
2. "Board vs. Draft History" — how closely they follow their board and how deviations perform
3. "Your Prediction Edge" — where their projections have been most accurate
4. "Blind Spots" — positions or situations where they consistently miss
5. "This Year's Board Review" — AI analysis of current board balance and risks
6. "Top 3 Recommendations" — specific, actionable recommendations

Return JSON: {
  "reportType": "pre_draft",
  "title": "Your Pre-Draft Coaching Report",
  "sections": [
    { "title": "section title", "body": "3-5 sentences of coaching" }
  ],
  "dataConfidence": "${profile.dataConfidence}",
  "caveat": "data confidence disclaimer if needed"
}`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, {
    maxTokens: 2048,
    premium: true,
    feature: 'deepReports',
  })
  if (!result) return null

  return {
    ...result.data,
    tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0),
    sport,
  }
}

/**
 * Generate a mid-season coaching report.
 */
async function generateMidSeasonReport(userId, sport, season) {
  const profile = await patternEngine.getUserProfile(userId, sport)
  if (!profile) return null

  const prompt = `Generate a comprehensive mid-season coaching report.

FULL USER INTELLIGENCE PROFILE:
${JSON.stringify(profile, null, 2)}

Season: ${season}

Generate a report with these sections:
1. "Draft Grade Revisited" — re-grade draft picks with current performance data
2. "Roster Management Review" — waiver hits/misses, trade analysis, lineup optimality
3. "Pre-Season vs. Reality" — how board targets are actually performing
4. "Points Left on the Table" — bench analysis, missed opportunities
5. "Second Half Strategy" — actionable recommendations for rest of season

Return JSON: {
  "reportType": "mid_season",
  "title": "Mid-Season Coaching Report",
  "sections": [
    { "title": "section title", "body": "3-5 sentences of coaching" }
  ],
  "dataConfidence": "${profile.dataConfidence}"
}`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, {
    maxTokens: 2048,
    premium: true,
    feature: 'deepReports',
  })
  if (!result) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0), sport }
}

/**
 * Generate a post-season retrospective.
 */
async function generatePostSeasonReport(userId, sport, season) {
  const profile = await patternEngine.getUserProfile(userId, sport)
  if (!profile) return null

  const multiSeason = await decisionGraph.getMultiSeasonGraph(userId, sport)

  const prompt = `Generate a comprehensive post-season retrospective.

FULL USER INTELLIGENCE PROFILE:
${JSON.stringify(profile, null, 2)}

Cross-season data: ${JSON.stringify(multiSeason?.crossSeasonPatterns || {})}
Seasons available: ${JSON.stringify(multiSeason?.seasons || [])}

Generate a report with these sections:
1. "Season Summary" — overall record, key stats
2. "Best Calls" — top 5 best decisions with evidence
3. "Worst Calls" — top 5 worst decisions with what went wrong
4. "Your Captures — What You Wrote vs What Happened" — capture accuracy review
5. "Year-Over-Year Progress" — if multi-season data, are they improving?
6. "Your One Thing to Fix" — THE single most impactful recommendation

Return JSON: {
  "reportType": "post_season",
  "title": "Season ${season} Retrospective",
  "sections": [
    { "title": "section title", "body": "3-5 sentences of coaching" }
  ],
  "dataConfidence": "${profile.dataConfidence}",
  "shareableCard": {
    "accuracy": "overall prediction accuracy percentage",
    "bestCall": "name of best decision",
    "topStrength": "top identified strength"
  }
}`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, {
    maxTokens: 2048,
    premium: true,
    feature: 'deepReports',
  })
  if (!result) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0), sport }
}

/**
 * Generate player AI brief.
 */
async function generatePlayerBrief(userId, playerId, sport) {
  const playerGraph = await decisionGraph.getPlayerGraph(userId, playerId)

  // Get basic player info
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, nflPosition: true, nflTeam: true, country: true, owgr: true },
  })

  const prompt = `Generate a brief AI analysis of this player from the user's perspective.

Player: ${player?.name || 'Unknown'} (${player?.nflPosition || ''} ${player?.nflTeam || ''})
Sport: ${sport}

User's history with this player:
- Opinion events: ${playerGraph.events.length}
- On board: ${playerGraph.currentBoardPositions.length > 0 ? 'Yes, rank ' + playerGraph.currentBoardPositions[0]?.rank : 'No'}
- Watched: ${playerGraph.isWatched ? 'Yes' : 'No'}
- Captures: ${playerGraph.captures.length}
- Predictions: ${playerGraph.predictions.length}
${playerGraph.captures.length > 0 ? 'Recent capture: "' + playerGraph.captures[playerGraph.captures.length - 1]?.content?.substring(0, 200) + '"' : ''}
${playerGraph.predictions.length > 0 ? 'Latest prediction: ' + playerGraph.predictions[playerGraph.predictions.length - 1]?.predictionType + ' — ' + playerGraph.predictions[playerGraph.predictions.length - 1]?.outcome : ''}

Return JSON: { "brief": "2-3 paragraph AI analysis of this player in the context of this user's history and decisions", "keyInsight": "one-line key takeaway" }`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 512, feature: 'scoutReports' })
  if (!result) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0), playerId, sport }
}

// ════════════════════════════════════════════════
//  PHASE 6F: SCOUT REPORTS + SIM
// ════════════════════════════════════════════════

/**
 * Generate a golf scout report for a tournament.
 */
async function generateGolfScoutReport(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      course: { select: { name: true, par: true, yardage: true, location: true } },
      performances: {
        include: { player: { select: { id: true, name: true, owgr: true, country: true } } },
        take: 30,
        orderBy: { fantasyPoints: 'desc' },
      },
    },
  })
  if (!tournament) return null

  const prompt = `Generate a golf tournament scouting report.

Tournament: ${tournament.name}
Course: ${tournament.course?.name || 'TBD'} (Par ${tournament.course?.par || 72}, ${tournament.course?.yardage || 'N/A'} yards)
Location: ${tournament.course?.location || 'TBD'}
Dates: ${tournament.startDate} to ${tournament.endDate}
Field size: ${tournament.performances?.length || 0} players confirmed

Top players in field (by OWGR):
${(tournament.performances || []).slice(0, 15).map(p => `- ${p.player.name} (#${p.player.owgr || 'N/A'})`).join('\n')}

Return JSON: {
  "reportType": "scout_golf",
  "title": "${tournament.name} — Scout Report",
  "sections": [
    { "title": "Field Overview", "body": "2-3 sentences on field strength" },
    { "title": "Players to Watch", "body": "3-4 players with brief reasoning" },
    { "title": "Course Fit Analysis", "body": "what skills this course rewards" },
    { "title": "Value Plays", "body": "2-3 under-the-radar picks" },
    { "title": "Weather Impact", "body": "any weather considerations" }
  ],
  "generatedAt": "${new Date().toISOString()}"
}`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 1024, feature: 'scoutReports' })
  if (!result) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0) }
}

/**
 * Generate an NFL weekly scout report.
 */
async function generateNflScoutReport(week) {
  const prompt = `Generate an NFL fantasy football scout report for Week ${week}.

Note: I don't have the specific matchup data in this prompt, so generate a template-style report that covers general weekly fantasy advice for Week ${week} of an NFL season.

Return JSON: {
  "reportType": "scout_nfl",
  "title": "NFL Week ${week} — Scout Report",
  "sections": [
    { "title": "Matchup Overview", "body": "general weekly outlook" },
    { "title": "Start 'Em", "body": "types of players to target this week" },
    { "title": "Sit 'Em", "body": "types of players to avoid this week" },
    { "title": "Sleepers", "body": "what to look for in sleeper picks" },
    { "title": "Injury Watch", "body": "reminder to check injury reports" }
  ],
  "generatedAt": "${new Date().toISOString()}"
}`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 1024, feature: 'scoutReports' })
  if (!result) return null

  return { ...result.data, tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0) }
}

/**
 * Simulate a head-to-head matchup between two players.
 */
async function simulateMatchup(player1Id, player2Id, sport, userId) {
  const [p1, p2] = await Promise.all([
    prisma.player.findUnique({ where: { id: player1Id }, select: { id: true, name: true, nflPosition: true, nflTeam: true, owgr: true, country: true } }),
    prisma.player.findUnique({ where: { id: player2Id }, select: { id: true, name: true, nflPosition: true, nflTeam: true, owgr: true, country: true } }),
  ])
  if (!p1 || !p2) return null

  // Get user's history with both players if available
  let userContext = ''
  if (userId) {
    const [g1, g2] = await Promise.all([
      decisionGraph.getPlayerGraph(userId, player1Id),
      decisionGraph.getPlayerGraph(userId, player2Id),
    ])
    if (g1.events.length > 0 || g2.events.length > 0) {
      userContext = `\nUser's history: ${g1.events.length} events for ${p1.name}, ${g2.events.length} events for ${p2.name}.`
      if (g1.currentBoardPositions.length > 0) userContext += ` ${p1.name} is on their board at rank ${g1.currentBoardPositions[0].rank}.`
      if (g2.currentBoardPositions.length > 0) userContext += ` ${p2.name} is on their board at rank ${g2.currentBoardPositions[0].rank}.`
    }
  }

  const prompt = `Simulate a head-to-head fantasy matchup comparison.

Player 1: ${p1.name} (${p1.nflPosition || ''} ${p1.nflTeam || ''} ${p1.owgr ? 'OWGR #' + p1.owgr : ''})
Player 2: ${p2.name} (${p2.nflPosition || ''} ${p2.nflTeam || ''} ${p2.owgr ? 'OWGR #' + p2.owgr : ''})
Sport: ${sport}
${userContext}

Return JSON: {
  "winner": "${p1.name}" or "${p2.name}",
  "confidence": "HIGH|MEDIUM|LOW",
  "analysis": "3-4 sentence comparison analysis",
  "keyFactors": ["factor 1", "factor 2", "factor 3"],
  "edge": "what gives the winner the edge in 1 sentence",
  "personalNote": "note for user based on their history (or null if no history)"
}`

  const result = await claude.generateJsonCompletion(CLUTCH_COACH_SYSTEM_PROMPT, prompt, { maxTokens: 512, feature: 'sim' })
  if (!result) return null

  return {
    ...result.data,
    player1: { id: p1.id, name: p1.name, position: p1.nflPosition, team: p1.nflTeam },
    player2: { id: p2.id, name: p2.name, position: p2.nflPosition, team: p2.nflTeam },
    sport,
    tokenCount: (result.inputTokens || 0) + (result.outputTokens || 0),
  }
}

/**
 * Add personalization overlay to a scout report.
 */
async function personalizeScoutReport(userId, reportContent, sport) {
  // Get user's boards and captures for players mentioned in report
  const boards = await prisma.draftBoard.findMany({
    where: { userId, sport },
    include: { entries: { include: { player: { select: { id: true, name: true } } } } },
  })

  const boardPlayerNames = new Set()
  for (const board of boards) {
    for (const entry of board.entries) {
      boardPlayerNames.add(entry.player?.name?.toLowerCase())
    }
  }

  // Simple personalization: check if any players in the report are on the user's board
  const annotations = []
  const reportText = JSON.stringify(reportContent)

  for (const board of boards) {
    for (const entry of board.entries) {
      const name = entry.player?.name
      if (name && reportText.toLowerCase().includes(name.toLowerCase())) {
        annotations.push({
          playerName: name,
          boardRank: entry.rank,
          tags: entry.tags,
          note: `On your board: Rank #${entry.rank}${entry.tags?.length ? ' (' + entry.tags.join(', ') + ')' : ''}`,
        })
      }
    }
  }

  return { ...reportContent, personalAnnotations: annotations }
}

module.exports = {
  generateAmbientInsight,
  generateDraftNudge,
  generateBoardCoachingCard,
  generatePredictionContext,
  generateResolutionInsight,
  generateMidSeasonCheckIn,
  generatePreDraftReport,
  generateMidSeasonReport,
  generatePostSeasonReport,
  generatePlayerBrief,
  generateGolfScoutReport,
  generateNflScoutReport,
  simulateMatchup,
  personalizeScoutReport,
}
