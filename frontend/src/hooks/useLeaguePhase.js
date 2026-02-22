import { useMemo } from 'react'

/**
 * Lifecycle phases for a league.
 * Derived entirely from existing data — no API calls.
 */
export const PHASES = {
  PRE_DRAFT: 'PRE_DRAFT',
  DRAFT_PREP: 'DRAFT_PREP',
  DRAFT_IMMINENT: 'DRAFT_IMMINENT',
  DRAFTING: 'DRAFTING',
  IN_SEASON_LIVE: 'IN_SEASON_LIVE',
  IN_SEASON_IDLE: 'IN_SEASON_IDLE',
  SEASON_COMPLETE: 'SEASON_COMPLETE',
}

/**
 * Compute the current lifecycle phase for a league.
 *
 * @param {{ league: object, currentTournament?: object }} opts
 * @returns {{ phase: string, meta: object }}
 */
export function useLeaguePhase({ league, currentTournament }) {
  return useMemo(() => {
    if (!league) return { phase: null, meta: {} }

    const draft = league.drafts?.[0]
    const draftStatus = draft?.status
    const scheduledFor = draft?.scheduledFor

    // SEASON_COMPLETE — league marked as completed
    if (league.status === 'completed') {
      return { phase: PHASES.SEASON_COMPLETE, meta: {} }
    }

    // DRAFTING — draft is live or paused
    if (draftStatus === 'IN_PROGRESS' || draftStatus === 'PAUSED') {
      return { phase: PHASES.DRAFTING, meta: { draftId: draft?.id } }
    }

    // Draft is complete — we're in-season
    if (draftStatus === 'COMPLETED') {
      const tournamentLive = currentTournament?.status === 'IN_PROGRESS' || currentTournament?.status === 'ACTIVE'
      if (tournamentLive) {
        return {
          phase: PHASES.IN_SEASON_LIVE,
          meta: { tournamentName: currentTournament?.name },
        }
      }
      return {
        phase: PHASES.IN_SEASON_IDLE,
        meta: { nextTournament: currentTournament?.name },
      }
    }

    // Draft scheduled — prep vs imminent
    if (draftStatus === 'SCHEDULED' && scheduledFor) {
      const hoursUntil = (new Date(scheduledFor).getTime() - Date.now()) / (1000 * 60 * 60)
      if (hoursUntil <= 24) {
        return {
          phase: PHASES.DRAFT_IMMINENT,
          meta: { scheduledFor, hoursUntil: Math.max(0, hoursUntil) },
        }
      }
      return {
        phase: PHASES.DRAFT_PREP,
        meta: { scheduledFor, hoursUntil },
      }
    }

    // No draft record at all
    return { phase: PHASES.PRE_DRAFT, meta: {} }
  }, [league, currentTournament])
}
