import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { TEAM_COLORS, hexToRgba } from '../utils/nflTeamColors'
import PrepSectionNav from '../components/prep/PrepSectionNav'

/**
 * Lab → Prep → Team Browser index (DS-14, page 1 of 4).
 *
 * "Every team. Every shift." All 32 teams in a sortable, filterable,
 * searchable grid. Matches the PrepHub masthead pattern (slate-mid
 * ticker bar, blaze separator above) and tile aesthetic — but tighter:
 * up to 5 cols on xl breakpoints so the league sits in a single frame.
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
  // "AFC_EAST" -> "East" (just the half we don't already convey via conference tab)
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

const DIVISIONS = ['EAST', 'NORTH', 'SOUTH', 'WEST']

function rankCompare(a, b) {
  const av = Number.isFinite(a) ? a : 999
  const bv = Number.isFinite(b) ? b : 999
  return av - bv
}

function deltaCompare(a, b) {
  // Negative delta = improved (rank went down, which is better).
  // Sort ascending so biggest improvers (most negative) come first.
  const av = Number.isFinite(a) ? a : Infinity
  const bv = Number.isFinite(b) ? b : Infinity
  return av - bv
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

export default function PrepTeams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [conference, setConference] = useState('ALL')
  const [activeDivisions, setActiveDivisions] = useState([])
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

  // Reset division filter when conference changes to ALL (divisions only make sense within a conference)
  useEffect(() => {
    if (conference === 'ALL') setActiveDivisions([])
  }, [conference])

  const filtered = useMemo(() => {
    let pool = teams
    if (conference !== 'ALL') {
      pool = pool.filter((t) => t.conference === conference)
    }
    if (activeDivisions.length > 0) {
      pool = pool.filter((t) => {
        if (!t.division) return false
        const tail = t.division.split('_').pop()
        return activeDivisions.includes(tail)
      })
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      pool = pool.filter((t) => {
        const display = teamDisplayName(t).toLowerCase()
        const hc = (t.hcName ?? '').toLowerCase()
        return display.includes(q) || hc.includes(q) || (t.abbreviation ?? '').toLowerCase().includes(q)
      })
    }
    const sorted = [...pool]
    switch (sortBy) {
      case 'olRank':
        sorted.sort((a, b) => rankCompare(a.olRank, b.olRank))
        break
      case 'olDelta':
        sorted.sort((a, b) => deltaCompare(a.olRankDelta, b.olRankDelta))
        break
      case 'dlRank':
        sorted.sort((a, b) => rankCompare(a.dlRank, b.dlRank))
        break
      case 'dlDelta':
        sorted.sort((a, b) => deltaCompare(a.dlRankDelta, b.dlRankDelta))
        break
      case 'alpha':
      default:
        sorted.sort((a, b) => teamDisplayName(a).localeCompare(teamDisplayName(b)))
    }
    return sorted
  }, [teams, conference, activeDivisions, sortBy, search])

  const stats = useMemo(() => ({
    total: teams.length,
    showing: filtered.length,
    olRanked: teams.filter((t) => Number.isFinite(t.olRank)).length,
  }), [teams, filtered])

  const daysToKickoff = useMemo(() => {
    const kickoff = new Date(Date.UTC(2026, 8, 10))
    const today = new Date()
    return Math.max(0, Math.ceil((kickoff.getTime() - today.getTime()) / 86400000))
  }, [])

  function toggleDivision(div) {
    setActiveDivisions((prev) =>
      prev.includes(div) ? prev.filter((d) => d !== div) : [...prev, div],
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Masthead — match PrepHub exactly */}
      <div className="h-0.5 bg-blaze" aria-hidden="true" />
      <div className="bg-slate-mid text-white border-b border-black/20">
        <div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center justify-between gap-6 font-mono text-[11px] uppercase tracking-[0.22em] flex-wrap">
          <Link to="/lab/prep" className="text-white/60 hover:text-white transition-colors shrink-0">
            ← Prep
          </Link>
          <div className="hidden md:flex items-center gap-5 text-white/60">
            <span><span className="text-white font-bold">{stats.total || '—'}</span> teams</span>
            <span><span className="text-white font-bold">{stats.showing || '—'}</span> showing</span>
            <span><span className="text-white font-bold">{stats.olRanked || '—'}</span> ranks</span>
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
        {/* Hero — tight band */}
        <header className="mb-5">
          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 md:col-span-7">
              <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-3xl md:text-4xl">
                Every team.
                <span className="font-editorial italic font-normal text-blaze"> Every shift.</span>
              </h1>
            </div>
            <div className="col-span-12 md:col-span-5">
              <p className="font-body text-sm md:text-base text-text-secondary leading-snug">
                Thirty-two staffs, thirty-two depth charts, thirty-two offensive lines that either held the line or didn’t. Filter, sort, dig in.
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-3 font-mono text-xs text-live-red">
              Couldn’t load teams: {error}
            </div>
          )}
        </header>

        {/* Controls row */}
        <section className="mb-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Conference tabs */}
            <div className="inline-flex rounded-card border border-[var(--color-border)] bg-[var(--surface)] p-1 shadow-card font-mono text-xs uppercase tracking-[0.18em]">
              {['AFC', 'NFC', 'ALL'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setConference(opt)}
                  className={classNames(
                    'px-5 py-2 rounded-button transition-all font-bold',
                    conference === opt
                      ? 'bg-slate text-white shadow-button'
                      : 'text-text-secondary hover:text-[var(--text-1)] hover:bg-[var(--glass)]',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team or coach…"
                className="font-body text-sm bg-[var(--surface)] border border-[var(--color-border)] rounded-button px-3.5 py-2 w-64 focus:outline-none focus:border-blaze focus:ring-1 focus:ring-blaze/40 placeholder:text-text-muted"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Division chips — hidden when ALL */}
            {conference !== 'ALL' ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  Division
                </span>
                {DIVISIONS.map((div) => {
                  const active = activeDivisions.includes(div)
                  return (
                    <button
                      key={div}
                      type="button"
                      onClick={() => toggleDivision(div)}
                      className={classNames(
                        'px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-[0.18em] font-bold transition-all border',
                        active
                          ? 'bg-blaze text-white border-blaze shadow-button'
                          : 'bg-[var(--surface)] text-text-secondary border-[var(--color-border)] hover:border-blaze/50 hover:text-[var(--text-1)]',
                      )}
                    >
                      {div.slice(0, 1) + div.slice(1).toLowerCase()}
                    </button>
                  )
                })}
                {activeDivisions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveDivisions([])}
                    className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted hover:text-blaze transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="font-mono text-xs uppercase tracking-[0.14em] font-bold bg-[var(--surface)] border border-[var(--color-border)] rounded-button px-3 py-1.5 focus:outline-none focus:border-blaze focus:ring-1 focus:ring-blaze/40"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Grid */}
        {loading ? (
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-16 text-center">
            Loading the league…
          </div>
        ) : filtered.length === 0 ? (
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-12 text-center">
            No teams match the current filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filtered.map((t) => (
              <TeamTile key={t.id} team={t} />
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
