import { useState } from 'react'
import { Link } from 'react-router-dom'
import { computeLeaguePhase } from '../../hooks/useLabPhase'
import { PHASES } from '../../hooks/useLeaguePhase'
import api from '../../services/api'

const PHASE_PILL = {
  [PHASES.PRE_DRAFT]: { label: 'PRE-DRAFT', cls: 'text-[var(--crown)]' },
  [PHASES.DRAFT_PREP]: { label: 'PREP', cls: 'text-[var(--crown)]' },
  [PHASES.DRAFT_IMMINENT]: { label: 'DRAFT SOON', cls: 'text-[var(--crown)] animate-pulse' },
  [PHASES.DRAFTING]: { label: 'DRAFTING', cls: 'text-[var(--crown)] animate-pulse' },
  [PHASES.IN_SEASON_LIVE]: { label: 'LIVE', cls: 'text-live-red animate-pulse' },
  [PHASES.IN_SEASON_IDLE]: { label: 'IN SEASON', cls: 'text-[var(--crown)]/60' },
  [PHASES.SEASON_COMPLETE]: { label: 'COMPLETE', cls: 'text-purple-400' },
}

function phaseContextLine(phase, meta) {
  switch (phase) {
    case PHASES.PRE_DRAFT:
      return 'No draft scheduled'
    case PHASES.DRAFT_PREP: {
      if (!meta.scheduledFor) return 'Draft date TBD'
      const days = Math.ceil(meta.hoursUntil / 24)
      const date = new Date(meta.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `Draft ${date} \u00b7 ${days}d away`
    }
    case PHASES.DRAFT_IMMINENT: {
      const hours = Math.max(0, Math.round(meta.hoursUntil || 0))
      return `Draft in ${hours}h`
    }
    case PHASES.DRAFTING:
      return 'Draft in progress'
    case PHASES.IN_SEASON_LIVE:
      return meta.tournamentName ? `Live: ${meta.tournamentName}` : 'Live event'
    case PHASES.IN_SEASON_IDLE:
      return meta.nextTournament ? `Next: ${meta.nextTournament}` : 'Between events'
    case PHASES.SEASON_COMPLETE:
      return 'Season complete'
    default:
      return ''
  }
}

export default function LeagueCockpit({ leagues = [], boards = [], currentTournament, onBoardLinked }) {
  const [linkingBoard, setLinkingBoard] = useState(null) // boardId currently being linked

  // Nothing to show — let DraftBoards empty state handle it
  if (leagues.length === 0 && boards.length === 0) return null

  // Split boards into linked and unlinked
  const unlinkedBoards = boards.filter(b => !b.leagueId)

  const handleLinkBoard = async (boardId, leagueId) => {
    setLinkingBoard(boardId)
    try {
      await api.updateDraftBoard(boardId, { leagueId })
      onBoardLinked?.()
    } catch (err) {
      console.error('Link board failed:', err)
    } finally {
      setLinkingBoard(null)
    }
  }

  // No leagues — only show standalone boards section if boards exist
  if (leagues.length === 0) {
    if (unlinkedBoards.length === 0) return null
    return (
      <div className="mb-6">
        <div className="mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary/30">Standalone Boards</h2>
          <p className="text-[11px] text-text-primary/30 mt-0.5">Not linked to a league.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {unlinkedBoards.map(b => (
            <Link
              key={b.id}
              to={`/lab/${b.id}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-text-primary/50 bg-[var(--surface)] border border-[var(--card-border)] rounded-md hover:text-gold hover:border-gold/30 transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                b.sport === 'nfl' ? 'bg-orange' : 'bg-emerald-400'
              }`} />
              {b.name}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* My Leagues header + subtitle */}
      <div className="mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary/30">My Leagues</h2>
        <p className="text-[11px] text-text-primary/30 mt-0.5">Link draft boards to leagues to keep your prep organized.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {leagues.map(league => {
          const sport = (league.sport || league.sportRef?.slug || 'golf').toLowerCase()
          const { phase, meta } = computeLeaguePhase(league, currentTournament)
          const pill = PHASE_PILL[phase] || PHASE_PILL[PHASES.PRE_DRAFT]
          const leagueBoards = boards.filter(b => b.leagueId === league.id)
          const contextLine = phaseContextLine(phase, meta)
          // Unlinked boards matching this league's sport (for "Link Board" button)
          const availableToLink = unlinkedBoards.filter(b => b.sport === sport)

          return (
            <div
              key={league.id}
              className="p-4 bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl hover:border-gold/20 transition-colors"
            >
              {/* Row 1: Sport badge + league name + phase pill */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                    sport === 'nfl' ? 'bg-orange-100 dark:bg-orange/20 text-orange-700 dark:text-orange' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {sport}
                  </span>
                  <span className="text-sm font-semibold text-text-primary truncate">{league.name}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ml-2 ${pill.cls}`}>
                  {pill.label}
                </span>
              </div>

              {/* Row 2: Phase context */}
              <p className="text-xs text-text-primary/40 mb-2">{contextLine}</p>

              {/* Row 3: Linked boards */}
              {leagueBoards.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {leagueBoards.map(b => (
                    <Link
                      key={b.id}
                      to={`/lab/${b.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-text-primary/60 bg-[var(--bg-alt)] rounded-md hover:text-gold hover:bg-gold/10 transition-colors"
                    >
                      <svg className="w-3 h-3 text-text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                      </svg>
                      {b.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] text-text-primary/25">No boards yet</p>
                  {availableToLink.length > 0 && (
                    <LinkBoardDropdown
                      boards={availableToLink}
                      leagueId={league.id}
                      onLink={handleLinkBoard}
                      linking={linkingBoard}
                    />
                  )}
                </div>
              )}

              {/* Row 4: League Home link */}
              <Link
                to={`/leagues/${league.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold/60 hover:text-gold transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
                League Home
              </Link>
            </div>
          )
        })}
      </div>

      {/* Standalone boards */}
      {unlinkedBoards.length > 0 && (
        <div className="mt-3">
          <div className="mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary/20">Standalone Boards</p>
            <p className="text-[10px] text-text-primary/20 mt-0.5">Not linked to a league. Use the dropdown to organize them.</p>
          </div>
          <div className="space-y-1">
            {unlinkedBoards.map(b => {
              const sportLeagues = leagues.filter(l => {
                const ls = (l.sport || l.sportRef?.slug || 'golf').toLowerCase()
                return ls === b.sport
              })
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--card-border)] rounded-md"
                >
                  <Link
                    to={`/lab/${b.id}`}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-primary/50 hover:text-gold transition-colors min-w-0"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      b.sport === 'nfl' ? 'bg-orange' : 'bg-emerald-400'
                    }`} />
                    <span className="truncate">{b.name}</span>
                  </Link>
                  {sportLeagues.length > 0 && (
                    <LinkBoardDropdown
                      boards={null}
                      boardId={b.id}
                      leagues={sportLeagues}
                      onLink={handleLinkBoard}
                      linking={linkingBoard}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Dropdown for linking a board to a league (two modes):
// Mode 1 (league card, no boards): boards prop = list of unlinked boards, leagueId = target league
// Mode 2 (standalone board row): boardId = board to link, leagues prop = list of leagues to pick from
function LinkBoardDropdown({ boards, boardId, leagueId, leagues, onLink, linking }) {
  const [open, setOpen] = useState(false)

  // Mode 1: pick a board to link to a given league
  if (boards) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="px-2 py-0.5 text-[10px] font-semibold text-gold/60 border border-gold/20 rounded hover:border-gold/40 hover:text-gold transition-colors"
        >
          Link Board
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] bg-[var(--surface)] border border-[var(--card-border)] rounded-lg shadow-lg py-1">
              {boards.map(b => (
                <button
                  key={b.id}
                  disabled={linking === b.id}
                  onClick={() => { onLink(b.id, leagueId); setOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-text-primary/60 hover:bg-gold/10 hover:text-gold transition-colors disabled:opacity-50"
                >
                  {linking === b.id ? 'Linking...' : b.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Mode 2: pick a league to link a given board to
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-0.5 text-[10px] font-semibold text-gold/60 border border-gold/20 rounded hover:border-gold/40 hover:text-gold transition-colors flex items-center gap-1"
      >
        Link to
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] bg-[var(--surface)] border border-[var(--card-border)] rounded-lg shadow-lg py-1">
            {leagues.map(l => (
              <button
                key={l.id}
                disabled={linking === boardId}
                onClick={() => { onLink(boardId, l.id); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-[11px] text-text-primary/60 hover:bg-gold/10 hover:text-gold transition-colors disabled:opacity-50"
              >
                {linking === boardId ? 'Linking...' : l.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
