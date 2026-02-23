import { useMemo } from 'react'
import { PHASES } from './useLeaguePhase'

/**
 * Priority order for multi-league phase resolution.
 * Higher index = higher priority.
 */
const PHASE_PRIORITY = {
  [PHASES.PRE_DRAFT]: 0,
  [PHASES.SEASON_COMPLETE]: 1,
  [PHASES.IN_SEASON_IDLE]: 2,
  [PHASES.DRAFT_PREP]: 3,
  [PHASES.IN_SEASON_LIVE]: 4,
  [PHASES.DRAFT_IMMINENT]: 5,
  [PHASES.DRAFTING]: 6,
}

/**
 * Map 7 phases → 4 display steps for the PhaseTimeline breadcrumb.
 */
export const DISPLAY_STEPS = [
  { key: 'prep', label: 'Prep', phases: [PHASES.PRE_DRAFT, PHASES.DRAFT_PREP, PHASES.DRAFT_IMMINENT] },
  { key: 'draft', label: 'Draft', phases: [PHASES.DRAFTING] },
  { key: 'compete', label: 'Compete', phases: [PHASES.IN_SEASON_LIVE, PHASES.IN_SEASON_IDLE] },
  { key: 'reflect', label: 'Reflect', phases: [PHASES.SEASON_COMPLETE] },
]

/**
 * Coach lines per phase — template-based, no AI call.
 */
export const COACH_LINES = {
  [PHASES.PRE_DRAFT]: 'Your boards are blank canvases. Start ranking to teach me your style.',
  [PHASES.DRAFT_PREP]: "I've been studying your board. You have some bold takes — let's review.",
  [PHASES.DRAFT_IMMINENT]: "Hours until draft. Your board is your edge — trust your research.",
  [PHASES.IN_SEASON_LIVE]: "Tournament's live. I'm watching your players.",
  [PHASES.IN_SEASON_IDLE]: 'Between events. Perfect time to sharpen your roster.',
  [PHASES.SEASON_COMPLETE]: "Season's done. Let's review what worked and what didn't.",
}

/**
 * Compute phase for a single league from its data.
 * Reuses same logic as useLeaguePhase.js but without the hook wrapper.
 */
function computeLeaguePhase(league, currentTournament) {
  if (!league) return { phase: PHASES.PRE_DRAFT, meta: {} }

  const draft = league.drafts?.[0]
  const draftStatus = draft?.status
  const scheduledFor = draft?.scheduledFor

  if (league.status === 'completed') {
    return { phase: PHASES.SEASON_COMPLETE, meta: {} }
  }

  if (draftStatus === 'IN_PROGRESS' || draftStatus === 'PAUSED') {
    return { phase: PHASES.DRAFTING, meta: { draftId: draft?.id } }
  }

  if (draftStatus === 'COMPLETED') {
    const tournamentLive = currentTournament?.status === 'IN_PROGRESS' || currentTournament?.status === 'ACTIVE'
    if (tournamentLive) {
      return { phase: PHASES.IN_SEASON_LIVE, meta: { tournamentName: currentTournament?.name } }
    }
    return { phase: PHASES.IN_SEASON_IDLE, meta: { nextTournament: currentTournament?.name } }
  }

  if (draftStatus === 'SCHEDULED' && scheduledFor) {
    const hoursUntil = (new Date(scheduledFor).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntil <= 24) {
      return { phase: PHASES.DRAFT_IMMINENT, meta: { scheduledFor, hoursUntil: Math.max(0, hoursUntil) } }
    }
    return { phase: PHASES.DRAFT_PREP, meta: { scheduledFor, hoursUntil } }
  }

  return { phase: PHASES.PRE_DRAFT, meta: {} }
}

/**
 * useLabPhase — Multi-league phase resolution for The Lab.
 *
 * @param {{ boards: Array, leagues?: Array, currentTournament?: object }} opts
 * @returns {{ primaryPhase, phaseMeta, leaguePhases, activeSport, hasBoards, hasLeagues, coachLine, displayStep }}
 */
export function useLabPhase({ boards = [], leagues = [], currentTournament } = {}) {
  return useMemo(() => {
    const hasBoards = boards.length > 0
    const hasLeagues = leagues.length > 0

    // Derive leagues from boards if not provided separately
    const leagueSources = leagues.length > 0
      ? leagues
      : boards.filter(b => b.league).map(b => b.league)

    // Compute phase per league
    const leaguePhases = leagueSources.map(league => {
      const { phase, meta } = computeLeaguePhase(league, currentTournament)
      return {
        leagueId: league.id,
        leagueName: league.name,
        sport: (league.sport || league.sportRef?.slug || 'golf').toLowerCase(),
        phase,
        meta,
      }
    })

    // Pick highest-priority phase
    let primaryPhase = PHASES.PRE_DRAFT
    let phaseMeta = {}

    for (const lp of leaguePhases) {
      const currentPriority = PHASE_PRIORITY[lp.phase] ?? 0
      const bestPriority = PHASE_PRIORITY[primaryPhase] ?? 0
      if (currentPriority > bestPriority) {
        primaryPhase = lp.phase
        phaseMeta = { leagueId: lp.leagueId, leagueName: lp.leagueName, sport: lp.sport, ...lp.meta }
      }
    }

    // Determine active sport
    const sports = new Set(leaguePhases.map(lp => lp.sport))
    const activeSport = sports.size === 0 ? 'golf'
      : sports.size === 1 ? [...sports][0]
      : 'both'

    // Determine display step
    const displayStep = DISPLAY_STEPS.find(s => s.phases.includes(primaryPhase))?.key || 'prep'

    // Coach line
    const coachLine = COACH_LINES[primaryPhase] || COACH_LINES[PHASES.PRE_DRAFT]

    return {
      primaryPhase,
      phaseMeta,
      leaguePhases,
      activeSport,
      hasBoards,
      hasLeagues,
      coachLine,
      displayStep,
    }
  }, [boards, leagues, currentTournament])
}

export default useLabPhase
