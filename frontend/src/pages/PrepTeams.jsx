import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { TEAM_COLORS, hexToRgba } from '../utils/nflTeamColors'
import PrepSectionNav from '../components/prep/PrepSectionNav'
import KickoffCountdown from '../components/prep/KickoffCountdown'

/**
 * Lab → Prep → Team Browser (DS-14, restructured).
 *
 * Default view: conference/division layout. Two columns (AFC / NFC), each
 * with four stacked division sections (East, North, South, West), each
 * holding a 2×2 mini-grid of team tiles. View toggle (AFC · NFC · ALL ·
 * GRID) lives in the filter row as a tab strip — letterspaced caps with
 * middle-dot separators, blaze + underline on active. GRID is an opt-in
 * flat sortable view for power users.
 */

function classNames(...c) {
  return c.filter(Boolean).join(' ')
}

function teamDisplayName(team) {
  if (!team?.name) return team?.abbreviation ?? ''
  if (team.city && team.name.toLowerCase().includes(team.city.toLowerCase())) {
    return team.name
  }
  return `${team.city ?? ''} ${team.name}`.trim()
}

function divisionLabel(division) {
  if (!division) return ''
  const parts = division.split('_')
  const tail = parts[parts.length - 1]
  return tail.slice(0, 1) + tail.slice(1).toLowerCase()
}

const SORT_OPTIONS = [
  { value: 'olRank', label: 'OL rank ↑' },
  { value: 'olDelta', label: 'OL improvers' },
  { value: 'dlRank', label: 'DL rank ↑' },
  { value: 'dlDelta', label: 'DL improvers' },
  { value: 'alpha', label: 'A → Z' },
]

const VIEW_OPTIONS = ['AFC', 'NFC', 'ALL', 'GRID']
const DIVISION_ORDER = ['EAST', 'NORTH', 'SOUTH', 'WEST']
const CONFERENCE_ORDER = ['AFC', 'NFC']

function rankCompare(a, b) {
  const av = Number.isFinite(a) ? a : 999
  const bv = Number.isFinite(b) ? b : 999
  return av - bv
}

function deltaCompare(a, b) {
  const av = Number.isFinite(a) ? a : Infinity
  const bv = Number.isFinite(b) ? b : Infinity
  return av - bv
}

function divisionTail(team) {
  if (!team?.division) return null
  return team.division.split('_').pop().toUpperCase()
}

function TeamTile({ team }) {
  const olDelta = Number.isFinite(team.olRankDelta) ? team.olRankDelta : null
  const arrow =
    olDelta == null ? null : olDelta < 0 ? '▲' : olDelta > 0 ? '▼' : '—'
  const arrowClass =
    olDelta == null
      ? 'text-text-muted'
      : olDelta < 0
      ? 'text-field'
      : olDelta > 0
      ? 'text-live-red'
      : 'text-text-muted'
  const color = TEAM_COLORS[team.abbreviation] ?? '#1E2A3A'

  return (
    <Link
      to={`/lab/prep/teams/${team.abbreviation}`}
      className="relative block rounded-card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all group"
      style={{
        background: `linear-gradient(135deg, ${hexToRgba(color, 0.14)} 0%, ${hexToRgba(color, 0.04)} 100%)`,
        border: `1px solid ${hexToRgba(color, 0.28)}`,
      }}
    >
      <div className="h-1 w-full" style={{ backgroundColor: color }} />
      <div className="px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="font-mono font-extrabold text-xl tracking-tight leading-none"
            style={{ color }}
          >
            {team.abbreviation}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-muted">
            {divisionLabel(team.division) || team.conference}
          </span>
        </div>
        <div className="mt-0.5 font-editorial italic text-[13px] text-[var(--text-1)] leading-tight truncate">
          {teamDisplayName(team)}
        </div>
        <div className="mt-2 pt-2 border-t border-[var(--color-border)]/60 space-y-1 font-body text-[11.5px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted text-[9px] uppercase tracking-[0.14em]">HC</span>
            <span className="text-[var(--text-1)] truncate font-semibold">{team.hcName ?? '—'}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted text-[9px] uppercase tracking-[0.14em]">OL '25</span>
            <span className="font-mono text-[var(--text-1)] font-bold">
              #{team.olRank ?? '—'}
              {arrow && (
                <span className={classNames('ml-1 text-[10px] font-bold', arrowClass)}>
                  {arrow}{olDelta != null && olDelta !== 0 ? ` ${Math.abs(olDelta)}` : ''}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/**
 * Editorial tab-strip selector. Renders labels in letterspaced caps with
 * middle-dot separators. Active label is blaze with a 2px underline
 * sitting ~4px below the baseline; inactive labels are muted.
 */
function ViewTabs({ value, onChange, options }) {
  return (
    <div className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.24em] font-bold">
      {options.map((opt, i) => {
        const active = value === opt
        return (
          <span key={opt} className="flex items-baseline gap-3">
            {i > 0 && <span className="text-text-muted/60 select-none" aria-hidden>·</span>}
            <button
              type="button"
              onClick={() => onChange(opt)}
              className={classNames(
                'relative pb-1 transition-colors focus:outline-none focus-visible:text-blaze',
                active
                  ? 'text-blaze'
                  : 'text-text-muted hover:text-[var(--text-1)]',
              )}
            >
              {opt}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 h-[2px] bg-blaze"
                  style={{ bottom: '-2px' }}
                />
              )}
            </button>
          </span>
        )
      })}
    </div>
  )
}

function DivisionSection({ divisionKey, teams }) {
  const sorted = useMemo(
    () => [...teams].sort((a, b) => rankCompare(a.olRank, b.olRank)),
    [teams],
  )
  const avgOl = useMemo(() => {
    const ranked = teams.filter((t) => Number.isFinite(t.olRank))
    if (ranked.length === 0) return null
    const sum = ranked.reduce((acc, t) => acc + t.olRank, 0)
    return Math.round(sum / ranked.length)
  }, [teams])
  return (
    <section className="mb-7 last:mb-0">
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <h3 className="font-mono text-xs uppercase tracking-[0.32em] font-bold text-[var(--text-1)]">
          {divisionLabel(divisionKey)}
        </h3>
        {avgOl != null && (
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
            Avg OL <span className="text-[var(--text-1)] font-bold">#{avgOl}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sorted.map((t) => (
          <TeamTile key={t.id} team={t} />
        ))}
      </div>
    </section>
  )
}

function ConferenceColumn({ conferenceKey, teams }) {
  // Group teams by division tail
  const byDivision = useMemo(() => {
    const map = {}
    for (const t of teams) {
      const div = divisionTail(t)
      if (!div) continue
      if (!map[div]) map[div] = []
      map[div].push(t)
    }
    return map
  }, [teams])

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-4 pb-3 border-b border-[var(--color-border)]">
        <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
          {conferenceKey}
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
          {teams.length} teams
        </span>
      </div>
      {DIVISION_ORDER.map((divKey) => {
        const divTeams = byDivision[divKey] ?? []
        if (divTeams.length === 0) return null
        return <DivisionSection key={divKey} divisionKey={divKey} teams={divTeams} />
      })}
    </div>
  )
}

export default function PrepTeams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('ALL') // 'AFC' | 'NFC' | 'ALL' | 'GRID'
  const [sortBy, setSortBy] = useState('olRank')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await api.request('/prep/teams')
        if (cancel) return
        setTeams(res.teams ?? [])
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

  // Search applies in every view; sort only meaningful in GRID
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) => {
      const display = teamDisplayName(t).toLowerCase()
      const hc = (t.hcName ?? '').toLowerCase()
      const abbr = (t.abbreviation ?? '').toLowerCase()
      return display.includes(q) || hc.includes(q) || abbr.includes(q)
    })
  }, [teams, search])

  // Conference/division layout: split into AFC + NFC pools
  const byConference = useMemo(() => {
    const afc = []
    const nfc = []
    for (const t of searched) {
      if (t.conference === 'AFC') afc.push(t)
      else if (t.conference === 'NFC') nfc.push(t)
    }
    return { AFC: afc, NFC: nfc }
  }, [searched])

  // GRID layout: flat sorted pool
  const gridSorted = useMemo(() => {
    const pool = [...searched]
    switch (sortBy) {
      case 'olRank':
        pool.sort((a, b) => rankCompare(a.olRank, b.olRank))
        break
      case 'olDelta':
        pool.sort((a, b) => deltaCompare(a.olRankDelta, b.olRankDelta))
        break
      case 'dlRank':
        pool.sort((a, b) => rankCompare(a.dlRank, b.dlRank))
        break
      case 'dlDelta':
        pool.sort((a, b) => deltaCompare(a.dlRankDelta, b.dlRankDelta))
        break
      case 'alpha':
      default:
        pool.sort((a, b) => teamDisplayName(a).localeCompare(teamDisplayName(b)))
    }
    return pool
  }, [searched, sortBy])

  const stats = useMemo(() => ({
    total: teams.length,
    showing: view === 'GRID' ? gridSorted.length : searched.length,
    olRanked: teams.filter((t) => Number.isFinite(t.olRank)).length,
  }), [teams, gridSorted, searched, view])

  // Which conferences to render in the structured layout
  const conferencesToShow = useMemo(() => {
    if (view === 'AFC') return ['AFC']
    if (view === 'NFC') return ['NFC']
    return CONFERENCE_ORDER
  }, [view])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Masthead — match PrepHub exactly */}
      <div className="h-0.5 bg-blaze" aria-hidden="true" />
      <div className="bg-slate-mid text-white border-b border-black/20">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 md:gap-6 font-mono text-[11px] uppercase tracking-[0.22em] flex-wrap">
          <Link to="/lab/prep" className="text-white/60 hover:text-white transition-colors shrink-0">
            ← Prep
          </Link>
          <div className="hidden md:flex items-center gap-5 text-white/60">
            <span><span className="text-white font-bold">{stats.total || '—'}</span> teams</span>
            <span><span className="text-white font-bold">{stats.showing || '—'}</span> showing</span>
            <span><span className="text-white font-bold">{stats.olRanked || '—'}</span> ranks</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <KickoffCountdown />
            <span className="text-white/40">·</span>
            <span className="text-white/50">Vol. I</span>
          </div>
        </div>
      </div>
      <PrepSectionNav />

      <div className="mx-auto max-w-6xl px-4 md:px-6 pt-5 pb-16">
        {/* Hero — two-column lockup, baseline-aligned */}
        <header className="mb-6">
          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 md:col-span-7">
              <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-3xl md:text-4xl">
                Every team.
                <span className="font-editorial italic font-normal text-blaze"> Every shift.</span>
              </h1>
            </div>
            <div className="col-span-12 md:col-span-5 md:pb-1">
              <p className="font-body text-sm text-text-secondary leading-snug">
                Thirty-two staffs, thirty-two depth charts, thirty-two offensive lines that either held the line or didn’t.
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-3 font-mono text-xs text-live-red">
              Couldn’t load teams: {error}
            </div>
          )}
        </header>

        {/* Filter row — tabs on the left, search + (in GRID) sort on the right */}
        <section className="mb-7 border-y border-[var(--color-border)] py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <ViewTabs value={view} onChange={setView} options={VIEW_OPTIONS} />
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team or coach…"
              className="font-body text-sm bg-[var(--surface)] border border-[var(--color-border)] rounded-button px-3 py-1.5 h-9 w-60 max-w-[240px] focus:outline-none focus:border-blaze focus:ring-1 focus:ring-blaze/40 placeholder:text-text-muted"
            />
            {view === 'GRID' && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="font-mono text-xs uppercase tracking-[0.14em] font-bold bg-[var(--surface)] border border-[var(--color-border)] rounded-button px-3 h-9 focus:outline-none focus:border-blaze focus:ring-1 focus:ring-blaze/40"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>

        {/* Body */}
        {loading ? (
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-16 text-center">
            Loading the league…
          </div>
        ) : stats.showing === 0 ? (
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-12 text-center">
            No teams match the current filters.
          </div>
        ) : view === 'GRID' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {gridSorted.map((t) => (
              <TeamTile key={t.id} team={t} />
            ))}
          </div>
        ) : (
          <div className={classNames(
            'grid gap-10',
            conferencesToShow.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2',
          )}>
            {conferencesToShow.map((conf) => (
              <ConferenceColumn
                key={conf}
                conferenceKey={conf}
                teams={byConference[conf] ?? []}
              />
            ))}
          </div>
        )}

        <footer className="mt-10 border-t border-[var(--color-border)] pt-5 flex items-baseline justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em]">
            <span className="text-[var(--text-1)] font-bold">⚡ CLUTCH</span>
            <span className="text-text-muted">· NFL Prep · The 32</span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-blaze font-bold">
            Kickoff · Sept 10, 2026
          </p>
        </footer>
      </div>
    </div>
  )
}
