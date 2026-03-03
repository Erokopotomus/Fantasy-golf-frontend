/**
 * Coach Context Assembly Service
 *
 * Reads relevant vault documents per coaching situation.
 * Keeps AI API calls small by pulling only what's needed.
 */

const prisma = require('../lib/prisma.js')

const CONTEXT_RULES = {
  briefing: ['identity', 'coaching_log'],
  draft_prep: ['identity', 'draft_patterns', 'coaching_log'],
  waiver_decision: ['identity', 'roster_patterns', 'season_narrative'],
  prediction: ['identity', 'predictions', 'coaching_log'],
  live_scoring: ['identity', 'season_narrative'],
  deep_report: null, // pull all documents
}

async function assembleCoachContext(userId, situation) {
  const { type, sport } = situation
  const docTypes = CONTEXT_RULES[type] || CONTEXT_RULES.briefing

  const sportFilters = [null]
  if (sport) sportFilters.push(sport)

  const where = {
    userId,
    sport: { in: sportFilters },
    ...(docTypes ? { documentType: { in: docTypes } } : {}),
  }

  const memories = await prisma.coachingMemory.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })

  // Organize by document type — sport-specific overrides cross-sport
  const documents = {}
  for (const mem of memories) {
    const key = mem.documentType
    if (!documents[key] || mem.sport !== null) {
      documents[key] = mem.content
    }
  }

  // For coaching_log, also pull recent CoachingInteraction records
  let recentInteractions = []
  if (docTypes === null || docTypes.includes('coaching_log')) {
    const maxInteractions = type === 'deep_report' ? 20 : 5
    recentInteractions = await prisma.coachingInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: maxInteractions,
      select: {
        insightType: true,
        summary: true,
        context: true,
        userReaction: true,
        behaviorChanged: true,
        createdAt: true,
      },
    })
  }

  const identity = documents.identity || getDefaultIdentity()

  return {
    documents,
    identity,
    recentInteractions,
    situation,
    hasVaultData: Object.keys(documents).length > 0,
  }
}

function getDefaultIdentity() {
  return {
    coachingTone: 'encouraging',
    coachingFrequency: 'daily',
    riskAppetite: 'balanced',
    draftPhilosophy: ['best_available'],
    favoriteTeams: [],
    statedBiases: [],
    userNotes: [],
  }
}

function formatContextForPrompt(coachContext) {
  const sections = []
  const { identity, documents, recentInteractions } = coachContext

  sections.push(`## Coach Settings
- Tone: ${identity.coachingTone}
- Risk appetite: ${identity.riskAppetite}
- Draft philosophy: ${(identity.draftPhilosophy || []).join(', ') || 'not set'}`)

  if (identity.userNotes?.length > 0) {
    sections.push(`- User notes: ${identity.userNotes.map(n => n.text).join('; ')}`)
  }

  if (documents.draft_patterns) {
    const dp = documents.draft_patterns
    const patterns = dp.repeatingPatterns?.map(p => `${p.pattern} (${p.occurrences}x)`).join(', ') || 'none detected'
    const improvements = dp.improvements?.map(i => i.area).join(', ') || 'none yet'
    sections.push(`## Draft Patterns (${dp.seasonCount || 0} seasons)
- Reach frequency: ${dp.reachFrequency != null ? (dp.reachFrequency * 100).toFixed(0) + '%' : 'unknown'}
- Board adherence: ${dp.boardAdherence != null ? (dp.boardAdherence * 100).toFixed(0) + '%' : 'unknown'}
- Repeating patterns: ${patterns}
- Improvements: ${improvements}`)
  }

  if (documents.roster_patterns) {
    const rp = documents.roster_patterns
    sections.push(`## Roster Patterns
- Trade style: ${rp.tradeStyle || 'unknown'}
- Waiver timing: ${rp.waiverTiming || 'unknown'}
- Lineup optimization: ${rp.lineupOptimizationRate != null ? (rp.lineupOptimizationRate * 100).toFixed(0) + '%' : 'unknown'}`)
  }

  if (documents.predictions) {
    const pp = documents.predictions
    sections.push(`## Prediction Patterns
- Overall accuracy: ${pp.overallAccuracy != null ? (pp.overallAccuracy * 100).toFixed(0) + '%' : 'unknown'}
- Best type: ${pp.bestType || 'unknown'}
- Worst type: ${pp.worstType || 'unknown'}
- Calibration note: ${pp.calibrationNote || 'none'}`)
  }

  if (documents.season_narrative) {
    const sn = documents.season_narrative
    sections.push(`## Current Season
${sn.narrative ? Object.values(sn.narrative).filter(Boolean).join(' ') : 'No season narrative yet.'}`)
  }

  if (recentInteractions.length > 0) {
    const history = recentInteractions.slice(0, 5).map(i => {
      const reaction = i.userReaction ? ` (${i.userReaction})` : ''
      return `- ${i.summary}${reaction}`
    }).join('\n')
    sections.push(`## Recent Coaching History
${history}`)
  }

  return sections.join('\n\n')
}

module.exports = {
  assembleCoachContext,
  formatContextForPrompt,
  getDefaultIdentity,
  CONTEXT_RULES,
}
