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
  // Single row per player. FROM → TO, both team abbreviations colored.
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
      <div className="flex items-baseline gap-1.5 font-mono text-[12px] whitespace-nowrap shrink-0">
        <TeamAbbr abbr={move.fromTeamAbbr} />
        <span className="text-text-muted">→</span>
        <TeamAbbr abbr={move.toTeamAbbr} />
      </div>
    </div>
  )
}

function UnitMoverCard({ mover, isLast }) {
  // Lower rank number = better. delta > 0 means regressed (rank got worse).
  // delta < 0 means improved (rank got better).
  const improved = mover.delta < 0
  const color = TEAM_COLORS[mover.teamAbbr] ?? '#1E2A3A'
  const arrow = improved ? '▲' : '▼'

  return (
    <div
      className={classNames(
        'flex items-center justify-between gap-3 py-3.5 px-4 hover:bg-white/70 transition-colors',
        !isLast && 'border-b border-[var(--color-border)]/50',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="font-mono font-extrabold text-xl w-12 shrink-0 tracking-tight"
          style={{ color }}
        >
          {mover.teamAbbr}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded shrink-0"
          style={{
            color,
            backgroundColor: hexToRgba(color, 0.1),
            border: `1px solid ${hexToRgba(color, 0.28)}`,
          }}
        >
          {mover.unit}
        </span>
      </div>
      <div className="flex items-baseline gap-2 font-mono text-sm whitespace-nowrap">
        <span className="text-text-muted">#{mover.from}</span>
        <span className="text-text-muted">→</span>
        <span className={improved ? 'text-field font-extrabold text-base' : 'text-live-red font-extrabold text-base'}>
          #{mover.to}
        </span>
        <span
          className={classNames(
            'ml-2 text-[11px] font-bold uppercase tracking-[0.14em]',
            improved ? 'text-field' : 'text-live-red',
          )}
        >
          {arrow} {Math.abs(mover.delta)}
        </span>
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

  const sortedMoves = useMemo(() => {
    return [...changes.playerMoves].sort((a, b) => {
      const ar = POSITION_RANK[a.player?.position] ?? 99
      const br = POSITION_RANK[b.player?.position] ?? 99
      if (ar !== br) return ar - br
      return (a.player?.name ?? '').localeCompare(b.player?.name ?? '')
    })
  }, [changes.playerMoves])

  const displayMoves = useMemo(() => sortedMoves.slice(0, 30), [sortedMoves])

  const topMovers = useMemo(() => {
    return [...changes.unitRankMovers]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 8)
  }, [changes.unitRankMovers])

  const teamsByConference = useMemo(() => {
    const afc = []
    const nfc = []
    for (const t of teams) {
      if (t.conference === 'AFC') afc.push(t)
      else if (t.conference === 'NFC') nfc.push(t)
    }
    const sortFn = (a, b) => {
      const dv = (a.division ?? '').localeCompare(b.division ?? '')
      if (dv !== 0) return dv
      return (a.abbreviation ?? '').localeCompare(b.abbreviation ?? '')
    }
    afc.sort(sortFn)
    nfc.sort(sortFn)
    return { afc, nfc }
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
            <div className="space-y-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted mb-2">
                  AFC · {teamsByConference.afc.length} teams
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {teamsByConference.afc.map((t) => (
                    <CoachTile key={t.id} team={t} />
                  ))}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted mb-2">
                  NFC · {teamsByConference.nfc.length} teams
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {teamsByConference.nfc.map((t) => (
                    <CoachTile key={t.id} team={t} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION II — Player moves (single list, no duplicate arrivals/departures) */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">II.</span>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
              The biggest moves
            </h2>
          </div>
          <p className="font-body text-sm text-text-secondary mb-5">
            Players who changed teams this offseason. QBs first, then RB, WR, TE. One row per move — from old team to new.
          </p>

          {loading ? (
            <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-12 text-center">
              Loading the wire…
            </div>
          ) : (
            <div className="rounded-card-lg overflow-hidden shadow-card bg-[var(--surface)] border border-[var(--color-border)]">
              <div className="h-2 w-full bg-gradient-to-r from-blaze via-crown to-field" />
              <div className="px-4 pt-4 pb-2 flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-display font-extrabold text-xl tracking-tight">
                    Notable moves
                  </div>
                  <div className="font-body text-[12.5px] text-text-secondary">
                    {displayMoves.length} of {totalMoves} shown
                  </div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
                  Old team <span className="text-text-secondary">→</span> New team
                </div>
              </div>
              {displayMoves.length === 0 ? (
                <div className="font-mono text-xs text-text-muted py-6 px-4 italic">
                  No qualifying moves yet — comparing end of 2025 to the current 2026 roster.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {displayMoves.map((m, i) => (
                    <MoveRow
                      key={`${m.player?.id ?? i}-${i}`}
                      move={m}
                      isLast={false}
                    />
                  ))}
                </div>
              )}
              <div className="px-4 py-3 border-t border-[var(--color-border)]/60 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em]">
                <span className="text-[var(--text-1)] font-bold">⚡ CLUTCH</span>
                <span className="text-text-muted">2025 season end → 2026 offseason</span>
              </div>
            </div>
          )}
        </section>

        {/* SECTION III — Unit rank movers (the closer) */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">III.</span>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
              Lines that moved the most.
            </h2>
          </div>
          <p className="font-body text-sm text-text-secondary mb-5">
            Year-over-year change in offensive and defensive line rankings. Green climbed, red collapsed.
          </p>

          <div className="rounded-card-lg overflow-hidden shadow-card bg-[var(--surface)] border border-[var(--color-border)]">
            <div className="h-2 w-full bg-gradient-to-r from-field via-blaze to-live-red" />
            {loading ? (
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-10 text-center">
                Loading…
              </div>
            ) : topMovers.length === 0 ? (
              <div className="font-mono text-xs text-text-muted py-6 px-4 italic">
                No qualifying movers yet — we surface units that shifted at least five spots.
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
