import { Link } from 'react-router-dom'
import { PHASES } from '../../hooks/useLeaguePhase'
import { buildLabUrl } from '../../utils/labBridge'

/**
 * Contextual action cards based on league lifecycle phase.
 * Returns null for PRE_DRAFT and DRAFTING (those have dedicated UI).
 */
export default function PhaseActionRow({ phase, league }) {
  const cards = getCardsForPhase(phase, league)
  if (!cards || cards.length === 0) return null

  return (
    <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card, i) => (
        <Link
          key={i}
          to={card.to}
          className="group block p-4 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl hover:border-[var(--crown)]/40 hover:shadow-card transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--crown)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--crown)]/15 transition-colors">
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-display font-bold text-text-primary group-hover:text-[var(--crown)] transition-colors">
                {card.title}
              </h4>
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                {card.description}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end">
            <span className="text-xs font-semibold text-[var(--crown)]/60 group-hover:text-[var(--crown)] transition-colors flex items-center gap-1">
              {card.cta}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function getCardsForPhase(phase, league) {
  if (!league) return null
  const leagueId = league.id
  const sport = (league.sport || 'GOLF').toUpperCase()
  const isGolf = sport === 'GOLF'
  const teamCount = league.maxTeams || league.teams?.length || '–'
  const draftTypeLabel = league.draftType ? league.draftType.toLowerCase() : 'snake'

  const playersUrl = isGolf
    ? `/players?league=${leagueId}`
    : `/nfl/players?league=${leagueId}`

  switch (phase) {
    case PHASES.DRAFT_PREP:
      return [
        {
          icon: '\uD83E\uDDEA',
          title: 'Build Your Draft Board',
          description: `Create a custom board for this ${teamCount}-team ${draftTypeLabel} draft`,
          cta: 'Open The Lab',
          to: buildLabUrl(league),
        },
        {
          icon: '\u26A1',
          title: 'Run a Mock Draft',
          description: 'Practice your strategy against AI opponents',
          cta: 'Start Mock',
          to: '/mock-draft',
        },
        {
          icon: '\uD83D\uDCCA',
          title: 'Scout the Field',
          description: `Research stats and projections`,
          cta: 'Browse',
          to: playersUrl,
        },
      ]

    case PHASES.DRAFT_IMMINENT:
      return [
        {
          icon: '\uD83D\uDCCB',
          title: 'Review Your Board',
          description: 'Final look at your rankings before the draft',
          cta: 'Open The Lab',
          to: buildLabUrl(league),
        },
        {
          icon: '\u26A1',
          title: 'Quick Mock',
          description: 'One last practice run before you go live',
          cta: 'Start Mock',
          to: '/mock-draft',
        },
        {
          icon: '\uD83D\uDCDD',
          title: 'Generate Cheat Sheet',
          description: 'Get a printable cheat sheet from your board',
          cta: 'Open The Lab',
          to: buildLabUrl(league),
        },
      ]

    case PHASES.IN_SEASON_LIVE:
      return [
        {
          icon: '\uD83D\uDCFA',
          title: 'Live Scoring',
          description: isGolf
            ? 'Follow your team through the tournament'
            : 'Follow your team on gameday',
          cta: 'Watch Live',
          to: `/leagues/${leagueId}/scoring`,
        },
        {
          icon: '\uD83C\uDFAF',
          title: 'Make Your Calls',
          description: 'Submit your predictions before lock',
          cta: 'Prove It',
          to: '/prove-it',
        },
        {
          icon: '\uD83D\uDCCB',
          title: 'Waiver Wire',
          description: 'Browse free agents and make claims',
          cta: 'Waivers',
          to: `/leagues/${leagueId}/waivers`,
        },
      ]

    case PHASES.IN_SEASON_IDLE:
      return [
        {
          icon: '\uD83D\uDCCB',
          title: 'Check the Wire',
          description: 'Browse free agents and make waiver claims',
          cta: 'Waivers',
          to: `/leagues/${leagueId}/waivers`,
        },
        {
          icon: '\uD83C\uDFAF',
          title: 'Make Your Calls',
          description: 'Submit your predictions and build your track record',
          cta: 'Prove It',
          to: '/prove-it',
        },
        {
          icon: '\uD83D\uDD04',
          title: 'Trade Block',
          description: 'Explore trade opportunities with other managers',
          cta: 'Trades',
          to: `/leagues/${leagueId}/trades`,
        },
      ]

    case PHASES.SEASON_COMPLETE:
      return [
        {
          icon: '\uD83C\uDFC6',
          title: 'Season Recap',
          description: 'Awards, records, and final standings',
          cta: 'View Recap',
          to: `/leagues/${leagueId}/recap`,
        },
        {
          icon: '\uD83C\uDFDB\uFE0F',
          title: 'League Vault',
          description: 'Your league\'s full history preserved',
          cta: 'Open Vault',
          to: `/leagues/${leagueId}/vault`,
        },
        {
          icon: '\uD83E\uDDEA',
          title: 'Start Prepping',
          description: 'Get ahead on next season\'s draft prep',
          cta: 'Open The Lab',
          to: buildLabUrl(league),
        },
      ]

    // PRE_DRAFT and DRAFTING — existing UI handles these
    default:
      return null
  }
}
