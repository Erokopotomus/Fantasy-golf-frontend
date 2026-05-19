import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import PrepSectionNav from '../components/prep/PrepSectionNav'

/**
 * Lab → Prep → What Changed (DS-15).
 *
 * The editorial showpiece of the Prep section. Reads like an Athletic
 * offseason annual: coaching board up top, arrivals/departures column
 * spread, then the unit-rank closer. Matches PrepHub.jsx broadcast-ticker
 * aesthetic exactly — same masthead, same hero compression, same team-color
 * tile pattern, same fonts.
 */

const TEAM_COLORS = {
  ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D',
  CAR: '#0085CA', CHI: '#0B162A', CIN: '#FB4F14', CLE: '#311D00',
  DAL: '#003594', DEN: '#FB4F14', DET: '#0076B6', GB:  '#203731',
  HOU: '#03202F', IND: '#002C5F', JAX: '#006778', KC:  '#E31837',
  LA:  '#003594', LAC: '#0080C6', LAR: '#003594', LV:  '#000000',
  MIA: '#008E97', MIN: '#4F2683', NE:  '#002244', NO:  '#D3BC8D',
  NYG: '#0B2265', NYJ: '#125740', PHI: '#004C54', PIT: '#FFB612',
  SEA: '#002244', SF:  '#AA0000', TB:  '#D50A0A', TEN: '#0C2340',
  WAS: '#5A1414',
}

const POSITION_RANK = { QB: 0, RB: 1, WR: 2, TE: 3, K: 4, DST: 5 }

function classNames(...c) {
  return c.filter(Boolean).join(' ')
}

function hexToRgba(hex, alpha = 1) {
  if (!hex || hex[0] !== '#') return `rgba(30,42,58,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function TeamAbbr({ abbr, size = 'sm' }) {
  const color = TEAM_COLORS[abbr] ?? '#1E2A3A'
  const sizeClass = size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-sm'
  return (
    <span
      className={classNames('font-mono font-extrabold tracking-tight', sizeClass)}
      style={{ color }}
    >
      {abbr ?? '???'}
    </span>
  )
}

function PositionChip({ pos }) {
  return (
    <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded bg-[var(--glass)] border border-[var(--color-border)] text-text-secondary shrink-0">
      {pos ?? '—'}
    </span>
  )
}

function CoachTile({ team }) {
  const color = TEAM_COLORS[team.abbreviation] ?? '#1E2A3A'
  const isNew = team.hcIsNewFor2026 === true
  return (
    <Link
      to={`/lab/prep/teams/${team.abbreviation}`}
      className={classNames(
        'relative block rounded-card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all',
        isNew && 'ring-2 ring-blaze ring-offset-2 ring-offset-[var(--bg)]',
      )}
      style={{
        background: `linear-gradient(135deg, ${hexToRgba(color, 0.14)} 0%, ${hexToRgba(color, 0.04)} 100%)`,
        border: `1px solid ${hexToRgba(color, 0.28)}`,
      }}
    >
      <div className="h-1 w-full" style={{ backgroundColor: color }} />
      {isNew && (
        <span className="absolute top-1.5 right-1.5 font-mono text-[9px] uppercase tracking-[0.18em] font-extrabold px-1.5 py-0.5 rounded bg-blaze text-white shadow-sm z-10">
          New
        </span>
      )}
      <div className="px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="font-mono font-extrabold text-lg tracking-tight leading-none"
            style={{ color }}
          >
            {team.abbreviation}
          </span>
          {!isNew && (
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-muted">
              {team.division ? team.division.slice(0, 1) + team.division.slice(1).toLowerCase() : ''}
            </span>
          )}
        </div>
        <div className="mt-1.5 font-body text-[12.5px] font-semibold text-[var(--text-1)] leading-tight truncate">
          {team.hcName ?? '—'}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-muted mt-0.5">
          {isNew ? 'New head coach' : 'Head coach'}
        </div>
      </div>
    </Link>
  )
}

function MoveRow({ move, isLast }) {
  // Destination dominant: bigger, fully colored. Source small, muted.
  const toColor = TEAM_COLORS[move.toTeamAbbr] ?? '#1E2A3A'
  return (
    <div
      className={classNames(
        'flex items-center justify-between gap-3 py-2.5 px-4 hover:bg-white/70 transition-colors',
        !isLast && 'border-b border-[var(--color-border)]/50',
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <PositionChip pos={move.player?.position} />
        <span className="font-editorial italic text-[15px] text-[var(--text-1)] truncate leading-tight">
          {move.player?.name ?? 'Unknown player'}
        </span>
      </div>
      <div className="flex items-baseline gap-2 font-mono whitespace-nowrap shrink-0">
        <span className="text-text-muted text-[11px]">
          from <span style={{ color: TEAM_COLORS[move.fromTeamAbbr] ?? '#9CA3AF' }} className="font-bold opacity-70">{move.fromTeamAbbr}</span>
        </span>
        <span
          className="font-extrabold text-[15px] px-2 py-0.5 rounded"
          style={{
            color: toColor,
            backgroundColor: hexToRgba(toColor, 0.1),
          }}
        >
          {move.toTeamAbbr}
        </span>
      </div>
    </div>
  )
}

// Horizontal scale (1-32) showing a team's rank movement.
function RankSlider({ from, to, color, improved }) {
  // Rank 1 is best (left). Rank 32 is worst (right).
  // Position = (rank - 1) / 31 as a 0-100% percentage.
  const pct = (r) => `${((r - 1) / 31) * 100}%`
  const leftRank = Math.min(from, to)
  const rightRank = Math.max(from, to)
  const barColor = improved ? '#0D9668' : '#E83838'

  return (
    <div className="relative h-6 w-full">
      {/* Track */}
      <div className="absolute left-0 right-0 top-1/2 h-px bg-[var(--color-border)] -translate-y-1/2" />
      {/* Tick marks at quartiles (1, 8, 16, 24, 32) — subtle reference */}
      {[1, 8, 16, 24, 32].map((r) => (
        <div
          key={r}
          className="absolute top-1/2 w-px h-1.5 bg-[var(--color-border)] -translate-y-1/2"
          style={{ left: pct(r) }}
          aria-hidden
        />
      ))}
      {/* Movement bar */}
      <div
        className="absolute top-1/2 h-1 rounded-full -translate-y-1/2"
        style={{
          left: pct(leftRank),
          width: `calc(${pct(rightRank)} - ${pct(leftRank)})`,
          backgroundColor: barColor,
          opacity: 0.6,
        }}
      />
      {/* FROM dot — small, muted */}
      <div
        className="absolute top-1/2 w-2 h-2 rounded-full -translate-y-1/2 -translate-x-1/2 border-2 bg-[var(--bg)]"
        style={{ left: pct(from), borderColor: barColor }}
        title={`2024: #${from}`}
      />
      {/* TO dot — bigger, team-colored */}
      <div
        className="absolute top-1/2 w-3.5 h-3.5 rounded-full -translate-y-1/2 -translate-x-1/2 shadow-md"
        style={{ left: pct(to), backgroundColor: color }}
        title={`2025: #${to}`}
      />
    </div>
  )
}

function UnitMoverCard({ mover, isLast }) {
  const improved = mover.delta < 0
  const color = TEAM_COLORS[mover.teamAbbr] ?? '#1E2A3A'

  return (
    <div
      className={classNames(
        'py-3 px-4 hover:bg-white/60 transition-colors',
        !isLast && 'border-b border-[var(--color-border)]/50',
      )}
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span
            className="font-mono font-extrabold text-base tracking-tight"
            style={{ color }}
          >
            {mover.teamAbbr}
          </span>
          <span
            className="font-mono text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{
              color,
              backgroundColor: hexToRgba(color, 0.1),
              border: `1px solid ${hexToRgba(color, 0.28)}`,
            }}
          >
            {mover.unit}
          </span>
        </div>
        <div className="flex items-baseline gap-2 font-mono text-xs whitespace-nowrap">
          <span className="text-text-muted">#{mover.from}</span>
          <span className="text-text-muted">→</span>
          <span className={improved ? 'text-field font-extrabold text-sm' : 'text-live-red font-extrabold text-sm'}>
            #{mover.to}
          </span>
          <span
            className={classNames(
              'ml-1 text-[10px] font-bold uppercase tracking-[0.14em]',
              improved ? 'text-field' : 'text-live-red',
            )}
          >
            {improved ? '▲' : '▼'} {Math.abs(mover.delta)}
          </span>
        </div>
      </div>
      <RankSlider from={mover.from} to={mover.to} color={color} improved={improved} />
      <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-text-muted/70 select-none">
        <span>#1 best</span>
        <span>#32</span>
      </div>
    </div>
  )
}

export default function PrepChanges() {
  const [changes, setChanges] = useState({ playerMoves: [], unitRankMovers: [] })
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const [changesRes, teamsRes] = await Promise.all([
          api.request('/prep/changes'),
          api.request('/prep/teams'),
        ])
        if (cancel) return
        setChanges({
          playerMoves: changesRes.playerMoves ?? [],
          unitRankMovers: changesRes.unitRankMovers ?? [],
        })
        setTeams(teamsRes.teams ?? [])
      } catch (e) {
        if (!cancel) setError(e?.message ?? 'Failed to load')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  const [movesFilter, setMovesFilter] = useState('ALL') // 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'COACHES'

  const sortedMoves = useMemo(() => {
    return [...changes.playerMoves].sort((a, b) => {
      const ar = POSITION_RANK[a.player?.position] ?? 99
      const br = POSITION_RANK[b.player?.position] ?? 99
      if (ar !== br) return ar - br
      return (a.player?.name ?? '').localeCompare(b.player?.name ?? '')
    })
  }, [changes.playerMoves])

  // Per-position counts for pill badges.
  const movesCountByPos = useMemo(() => {
    const counts = { ALL: sortedMoves.length, QB: 0, RB: 0, WR: 0, TE: 0 }
    for (const m of sortedMoves) {
      const p = m.player?.position
      if (p && counts[p] != null) counts[p]++
    }
    return counts
  }, [sortedMoves])

  // Build coaching "moves" from the new-HC teams. Each new HC row is a
  // "coach landed on this team" entry. v1 doesn't know the previous team so
  // we surface just the destination + name; the visual register matches a
  // player move row.
  const coachMoves = useMemo(() => {
    return teams
      .filter((t) => t.hcIsNewFor2026)
      .map((t) => ({
        name: t.hcName,
        teamAbbr: t.abbreviation,
        role: 'HC',
      }))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }, [teams])

  const filteredMoves = useMemo(() => {
    if (movesFilter === 'ALL' || movesFilter === 'COACHES') return sortedMoves
    return sortedMoves.filter((m) => m.player?.position === movesFilter)
  }, [sortedMoves, movesFilter])

  const displayMoves = useMemo(() => filteredMoves.slice(0, 30), [filteredMoves])

  const topMovers = useMemo(() => {
    return [...changes.unitRankMovers]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 12)
  }, [changes.unitRankMovers])

  // Group teams by conference + division (East/North/South/West) for the
  // coaching board, mirroring the layout used on /lab/prep/teams.
  const DIVISIONS = ['EAST', 'NORTH', 'SOUTH', 'WEST']
  const teamsByDivision = useMemo(() => {
    const out = { AFC: { EAST: [], NORTH: [], SOUTH: [], WEST: [] }, NFC: { EAST: [], NORTH: [], SOUTH: [], WEST: [] } }
    for (const t of teams) {
      const conf = t.conference
      const div = (t.division ?? '').toUpperCase().split('_').pop()
      if (!conf || !out[conf] || !out[conf][div]) continue
      out[conf][div].push(t)
    }
    for (const conf of Object.keys(out)) {
      for (const div of DIVISIONS) {
        out[conf][div].sort((a, b) => (a.abbreviation ?? '').localeCompare(b.abbreviation ?? ''))
      }
    }
    return out
  }, [teams])

  const daysToKickoff = useMemo(() => {
    const kickoff = new Date(Date.UTC(2026, 8, 10))
    const today = new Date()
    return Math.max(0, Math.ceil((kickoff.getTime() - today.getTime()) / 86400000))
  }, [])

  const totalMoves = changes.playerMoves.length
  const totalNewHCs = teams.filter((t) => t.hcIsNewFor2026).length
  const totalMovers = changes.unitRankMovers.length

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Broadcast ticker — same as PrepHub */}
      <div className="h-0.5 bg-blaze" aria-hidden="true" />
      <div className="bg-slate-mid text-white border-b border-black/20">
        <div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center justify-between gap-6 font-mono text-[11px] uppercase tracking-[0.22em] flex-wrap">
          <Link to="/lab/prep" className="text-white/60 hover:text-white transition-colors shrink-0">
            ← Prep
          </Link>
          <div className="hidden md:flex items-center gap-5 text-white/60">
            <span><span className="text-white font-bold">{totalNewHCs || '—'}</span> new HCs</span>
            <span><span className="text-white font-bold">{totalMoves || '—'}</span> player moves</span>
            <span><span className="text-white font-bold">{totalMovers || '—'}</span> units moved</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-baseline gap-2">
              <span className="text-white/50 text-[10px]">Kickoff</span>
              <span className="font-display font-extrabold text-blaze text-2xl leading-none tabular-nums tracking-tight">
                {daysToKickoff}
              </span>
              <span className="text-blaze font-bold text-[11px]">days</span>
            </div>
            <span className="text-white/40">·</span>
            <span className="text-white/50">Vol. I</span>
          </div>
        </div>
      </div>
      <PrepSectionNav />

      <div className="mx-auto max-w-6xl px-6 pt-5 pb-16">
        {/* Compressed hero */}
        <header className="mb-7">
          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 md:col-span-7">
              <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-3xl md:text-4xl">
                The offseason,
                <span className="font-editorial italic font-normal text-blaze"> in one place.</span>
              </h1>
            </div>
            <div className="col-span-12 md:col-span-5 md:pb-1">
              <p className="font-body text-sm text-text-secondary leading-snug">
                Where players landed, which coordinators jumped, and which units climbed or collapsed before Week 1.
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-3 font-mono text-xs text-live-red">
              Couldn’t load offseason changes: {error}
            </div>
          )}
        </header>

        {/* SECTION I — Coaching shuffle (the field-of-coaches board) */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">I.</span>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
              The coaching board
            </h2>
          </div>
          <p className="font-body text-sm text-text-secondary mb-5">
            Head coaches entering <span className="font-editorial italic">2026</span>.
            {totalNewHCs > 0 && (
              <>
                {' '}<span className="text-blaze font-bold">{totalNewHCs} new</span> for this season — marked below. Click any tile for the full staff and roster.
              </>
            )}
            {totalNewHCs === 0 && ' Click any tile for the full staff and roster.'}
          </p>

          {loading ? (
            <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-12 text-center">
              Loading the board…
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {['AFC', 'NFC'].map((conf) => (
                <div key={conf}>
                  <div className="flex items-baseline justify-between pb-3 mb-3 border-b border-[var(--color-border)]">
                    <h3 className="font-display font-extrabold text-2xl tracking-tight">
                      {conf}
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
                      16 teams
                    </span>
                  </div>
                  <div className="space-y-5">
                    {DIVISIONS.map((div) => {
                      const divTeams = teamsByDivision[conf][div] ?? []
                      if (divTeams.length === 0) return null
                      return (
                        <div key={div}>
                          <h4 className="font-mono text-xs uppercase tracking-[0.32em] font-bold text-[var(--text-1)] mb-2">
                            {div.slice(0, 1) + div.slice(1).toLowerCase()}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {divTeams.map((t) => (
                              <CoachTile key={t.id} team={t} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION II + III — split-pane: moves on left, lines on right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
        <section className="lg:col-span-3">
          <div className="flex items-baseline gap-3 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">II.</span>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
              The biggest moves
            </h2>
          </div>
          <p className="font-body text-sm text-text-secondary mb-5">
            Players who changed teams this offseason. QBs first.
          </p>

          {loading ? (
            <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-12 text-center">
              Loading the wire…
            </div>
          ) : (
            <div className="rounded-card-lg overflow-hidden shadow-card bg-[var(--surface)] border border-[var(--color-border)]">
              <div className="h-2 w-full bg-gradient-to-r from-blaze via-crown to-field" />

              {/* Position filter pills */}
              <div className="px-4 pt-4 pb-3 flex items-center gap-2 flex-wrap border-b border-[var(--color-border)]/60">
                {[
                  { key: 'ALL', label: 'All', count: movesCountByPos.ALL },
                  { key: 'QB', label: 'QB', count: movesCountByPos.QB },
                  { key: 'RB', label: 'RB', count: movesCountByPos.RB },
                  { key: 'WR', label: 'WR', count: movesCountByPos.WR },
                  { key: 'TE', label: 'TE', count: movesCountByPos.TE },
                  { key: 'COACHES', label: 'Coaches', count: coachMoves.length },
                ].map((opt) => {
                  const active = movesFilter === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMovesFilter(opt.key)}
                      className={classNames(
                        'inline-flex items-baseline gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] uppercase tracking-[0.18em] font-bold border transition-all',
                        active
                          ? 'bg-slate text-white border-slate shadow-button'
                          : 'bg-[var(--surface)] text-text-secondary border-[var(--color-border)] hover:border-blaze/50 hover:text-[var(--text-1)]',
                      )}
                    >
                      {opt.label}
                      <span className={classNames(
                        'font-mono text-[10px]',
                        active ? 'text-white/60' : 'text-text-muted',
                      )}>
                        {opt.count}
                      </span>
                    </button>
                  )
                })}
                <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted hidden sm:block">
                  {movesFilter === 'COACHES'
                    ? 'New head coach'
                    : <>Old team <span className="text-text-secondary">→</span> New team</>}
                </div>
              </div>

              {/* Panel body — coaches vs player moves */}
              {movesFilter === 'COACHES' ? (
                coachMoves.length === 0 ? (
                  <div className="font-mono text-xs text-text-muted py-6 px-4 italic">
                    No new head coaches tagged for 2026.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {coachMoves.map((c, i) => (
                      <div
                        key={c.teamAbbr}
                        className={classNames(
                          'flex items-center justify-between gap-3 py-2.5 px-4 hover:bg-white/70 transition-colors',
                          i < coachMoves.length - 1 && 'border-b border-[var(--color-border)]/50',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PositionChip pos="HC" />
                          <span className="font-editorial italic text-[15px] text-[var(--text-1)] truncate leading-tight">
                            {c.name}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 font-mono text-[12px] whitespace-nowrap shrink-0">
                          <TeamAbbr abbr={c.teamAbbr} />
                          <span className="font-mono text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded bg-blaze text-white">
                            New
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : displayMoves.length === 0 ? (
                <div className="font-mono text-xs text-text-muted py-6 px-4 italic">
                  No qualifying moves at {movesFilter === 'ALL' ? 'any position' : movesFilter} — comparing end of 2025 to the current 2026 roster.
                </div>
              ) : (
                <div>
                  {displayMoves.map((m, i) => (
                    <MoveRow
                      key={`${m.player?.id ?? i}-${i}`}
                      move={m}
                      isLast={i === displayMoves.length - 1}
                    />
                  ))}
                </div>
              )}

              <div className="px-4 py-3 border-t border-[var(--color-border)]/60 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em]">
                <span className="text-[var(--text-1)] font-bold">⚡ CLUTCH</span>
                <span className="text-text-muted">
                  {movesFilter === 'COACHES'
                    ? `${coachMoves.length} new HCs for 2026`
                    : `${displayMoves.length} of ${movesFilter === 'ALL' ? totalMoves : movesCountByPos[movesFilter] ?? 0} shown`}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* SECTION III — Unit rank movers (companion to moves) */}
        <section className="lg:col-span-2">
          <div className="flex items-baseline gap-3 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">III.</span>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
              Lines that moved.
            </h2>
          </div>
          <p className="font-body text-sm text-text-secondary mb-5">
            Each team plotted on a 1–32 scale. Faint dot is 2024, bold dot is 2025.
          </p>

          <div className="rounded-card-lg overflow-hidden shadow-card bg-[var(--surface)] border border-[var(--color-border)]">
            <div className="h-2 w-full bg-gradient-to-r from-field via-blaze to-live-red" />
            {loading ? (
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-10 text-center">
                Loading…
              </div>
            ) : topMovers.length === 0 ? (
              <div className="font-mono text-xs text-text-muted py-6 px-4 italic">
                No qualifying movers — we surface units that shifted at least five spots.
              </div>
            ) : (
              <div>
                {topMovers.map((m, i) => (
                  <UnitMoverCard
                    key={`${m.teamAbbr}-${m.unit}`}
                    mover={m}
                    isLast={i === topMovers.length - 1}
                  />
                ))}
              </div>
            )}
            <div className="px-4 py-3 border-t border-[var(--color-border)]/60 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em]">
              <span className="text-[var(--text-1)] font-bold">⚡ CLUTCH</span>
              <Link
                to="/lab/prep/teams"
                className="text-blaze hover:text-blaze-hot transition-colors font-bold"
              >
                Browse all 32 →
              </Link>
            </div>
          </div>
        </section>
        </div>

        {/* CLUTCH attribution footer */}
        <footer className="border-t border-[var(--color-border)] pt-5 flex items-baseline justify-between gap-4 flex-wrap">
          <p className="font-body text-sm text-text-muted max-w-[56ch]">
            The offseason annual rebuilds itself every morning. Every signing, every staff hire, every line that shifted — captured for draft day.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-blaze font-bold">
            ⚡ CLUTCH · Vol. I · Kickoff Sept 10, 2026
          </p>
        </footer>
      </div>
    </div>
  )
}
