import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { TEAM_COLORS, hexToRgba } from '../utils/nflTeamColors'
import PrepSectionNav from '../components/prep/PrepSectionNav'

/**
 * Lab → Prep → Team Detail (DS-14, page 2 of 4).
 *
 * Identity hero (team-color band, mono abbreviation, Instrument Serif full
 * name, mono caps conference/division badge) + coaching trio + 3-year
 * OL/DL rank trend + current depth chart grouped by position. Designed
 * to feel like the team-specific spread of an offseason annual — every
 * page screenshot-shareable on its own.
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

function divisionBadge(conference, division) {
  if (!division) return conference ?? ''
  const tail = division.split('_').pop()
  return `${conference} ${tail}`
}

// Roles displayed in the coaching staff card — order matters.
const COACH_ROLES = [
  { key: 'hc', label: 'Head Coach' },
  { key: 'oc', label: 'Offensive Coordinator' },
  { key: 'dc', label: 'Defensive Coordinator' },
]

// Position order matches the backend depth-chart sort so groups read top-down
// in the order we care about for fantasy.
const POSITION_GROUPS = [
  { key: 'QB', label: 'Quarterbacks', accent: 'blaze' },
  { key: 'RB', label: 'Running Backs', accent: 'field' },
  { key: 'WR', label: 'Wide Receivers', accent: 'slate' },
  { key: 'TE', label: 'Tight Ends', accent: 'crown' },
  { key: 'K', label: 'Kicker', accent: 'text-muted' },
  { key: 'DST', label: 'Defense / ST', accent: 'text-muted' },
]

const ACCENT_TEXT_CLASS = {
  blaze: 'text-blaze',
  field: 'text-field',
  slate: 'text-slate',
  crown: 'text-crown',
  'text-muted': 'text-text-muted',
}

function rankArrow(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null
  const delta = to - from
  if (delta < 0) return { arrow: '▲', cls: 'text-field', label: `+${Math.abs(delta)}` }
  if (delta > 0) return { arrow: '▼', cls: 'text-live-red', label: `-${Math.abs(delta)}` }
  return { arrow: '—', cls: 'text-text-muted', label: '' }
}

function StatusPill({ status }) {
  if (!status || status === 'active' || status === 'ACTIVE') return null
  const upper = String(status).toUpperCase()
  // Map common roster statuses to a tight palette.
  const cls =
    upper.includes('IR')
      ? 'bg-live-red/10 text-live-red border-live-red/30'
      : upper.includes('PUP')
      ? 'bg-crown/10 text-crown border-crown/30'
      : upper.includes('SUS')
      ? 'bg-live-red/10 text-live-red border-live-red/30'
      : 'bg-[var(--glass)] text-text-secondary border-[var(--color-border)]'
  return (
    <span className={classNames(
      'inline-block ml-2 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-[0.16em] font-bold border',
      cls,
    )}>
      {upper}
    </span>
  )
}

function CoachingCard({ coaching, color }) {
  return (
    <div
      className="rounded-card-lg overflow-hidden shadow-card bg-[var(--surface)] border border-[var(--color-border)]"
    >
      <div className="px-5 py-3 flex items-baseline justify-between border-b border-[var(--color-border)]/60"
        style={{ background: hexToRgba(color, 0.06) }}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">i.</span>
          <h2 className="font-display font-extrabold text-lg tracking-tight">Coaching staff</h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">2026</span>
      </div>
      <div className="divide-y divide-[var(--color-border)]/40">
        {COACH_ROLES.map(({ key, label }) => {
          const coach = coaching?.[key]
          return (
            <div key={key} className="flex items-baseline justify-between gap-3 px-5 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted shrink-0">
                {label}
              </span>
              <div className="text-right min-w-0">
                <div className="font-editorial italic text-base text-[var(--text-1)] truncate">
                  {coach?.name ?? '—'}
                </div>
                {coach?.previousTeamAbbr || coach?.previousRole ? (
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted truncate">
                    from {coach?.previousRole ?? '—'}{coach?.previousTeamAbbr ? ` · ${coach.previousTeamAbbr}` : ''}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UnitTrendCard({ title, ranks, unitKey, color }) {
  const years = [2023, 2024, 2025]
  const r23 = ranks?.[2023]?.[unitKey] ?? null
  const r24 = ranks?.[2024]?.[unitKey] ?? null
  const r25 = ranks?.[2025]?.[unitKey] ?? null
  const delta23to25 = rankArrow(r23, r25)

  return (
    <div className="rounded-card-lg overflow-hidden shadow-card bg-[var(--surface)] border border-[var(--color-border)]">
      <div className="px-5 py-3 flex items-baseline justify-between border-b border-[var(--color-border)]/60"
        style={{ background: hexToRgba(color, 0.06) }}
      >
        <h3 className="font-display font-extrabold text-lg tracking-tight">{title}</h3>
        {delta23to25 && (
          <span className={classNames('font-mono text-[11px] font-bold tabular-nums', delta23to25.cls)}>
            {delta23to25.arrow} {delta23to25.label || '0'} (3yr)
          </span>
        )}
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          {years.map((y, i) => {
            const rank = ranks?.[y]?.[unitKey]
            const prev = i > 0 ? ranks?.[years[i - 1]]?.[unitKey] : null
            const arrow = i > 0 ? rankArrow(prev, rank) : null
            return (
              <div key={y} className="">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted mb-1">
                  {y}
                </div>
                <div className="font-mono font-extrabold text-2xl text-[var(--text-1)] tabular-nums leading-none">
                  {Number.isFinite(rank) ? `#${rank}` : '—'}
                </div>
                {arrow && arrow.label && (
                  <div className={classNames('mt-1 font-mono text-[10px] font-bold tabular-nums', arrow.cls)}>
                    {arrow.arrow} {arrow.label}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PositionGroup({ group, players, color }) {
  if (!players || players.length === 0) return null
  const accentClass = ACCENT_TEXT_CLASS[group.accent] ?? 'text-text-muted'
  return (
    <div className="rounded-card overflow-hidden bg-[var(--surface)] border border-[var(--color-border)]">
      <div
        className="px-4 py-2 flex items-baseline justify-between border-b border-[var(--color-border)]/60"
        style={{ background: hexToRgba(color, 0.04) }}
      >
        <div className="flex items-baseline gap-3">
          <span className={classNames('font-mono font-extrabold text-sm tracking-tight', accentClass)}>
            {group.key}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
            {group.label}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted tabular-nums">
          {players.length}
        </span>
      </div>
      <div className="divide-y divide-[var(--color-border)]/40">
        {players.map((p) => {
          const proj = p.projection
          return (
            <div key={p.playerId} className="px-4 py-2 flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="font-mono text-[11px] text-text-muted tabular-nums w-6 shrink-0">
                  {Number.isFinite(p.depthRank) ? p.depthRank : '—'}
                </span>
                <span className="font-body text-sm text-[var(--text-1)] font-semibold truncate">
                  {p.name ?? '—'}
                </span>
                <StatusPill status={p.status} />
              </div>
              {proj && (
                <div className="flex items-baseline gap-3 font-mono text-[11px] whitespace-nowrap">
                  {Number.isFinite(proj.projectedPoints) && (
                    <span className="text-[var(--text-1)] font-bold tabular-nums">
                      {Number(proj.projectedPoints).toFixed(1)}
                      <span className="text-text-muted text-[9px] ml-1 uppercase">pts</span>
                    </span>
                  )}
                  {Number.isFinite(proj.adp) && (
                    <span className="text-text-muted tabular-nums">
                      ADP {Number(proj.adp).toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PrepTeamDetail() {
  const { abbr } = useParams()
  const normalizedAbbr = (abbr ?? '').toUpperCase()
  const [data, setData] = useState(null)
  const [changes, setChanges] = useState(null) // { playerMoves, unitRankMovers }
  const [teamSummary, setTeamSummary] = useState(null) // for hcIsNewFor2026
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    setError(null)
    setNotFound(false)
    setData(null)
    ;(async () => {
      try {
        const [detail, changesRes, teamsRes] = await Promise.all([
          api.request(`/prep/teams/${normalizedAbbr}`),
          api.request('/prep/changes').catch(() => null),
          api.request('/prep/teams').catch(() => null),
        ])
        if (cancel) return
        if (!detail?.team) {
          setNotFound(true)
        } else {
          setData(detail)
          setChanges(changesRes)
          const t = teamsRes?.teams?.find((x) => x.abbreviation === normalizedAbbr)
          setTeamSummary(t ?? null)
        }
      } catch (e) {
        if (cancel) return
        // The backend returns 404 with a body for unknown abbrs.
        if (e?.message?.toLowerCase?.().includes('unknown team') || e?.message?.includes('404')) {
          setNotFound(true)
        } else {
          setError(e?.message ?? 'Failed to load')
        }
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [normalizedAbbr])

  const color = TEAM_COLORS[normalizedAbbr] ?? '#1E2A3A'

  // Group roster by position for the depth chart section.
  const rosterByPosition = useMemo(() => {
    const out = new Map()
    for (const p of data?.roster ?? []) {
      const pos = p.position ?? 'UNK'
      if (!out.has(pos)) out.set(pos, [])
      out.get(pos).push(p)
    }
    // Sort each group by depthRank
    for (const list of out.values()) {
      list.sort((a, b) => (a.depthRank ?? 99) - (b.depthRank ?? 99))
    }
    return out
  }, [data])

  const daysToKickoff = useMemo(() => {
    const kickoff = new Date(Date.UTC(2026, 8, 10))
    const today = new Date()
    return Math.max(0, Math.ceil((kickoff.getTime() - today.getTime()) / 86400000))
  }, [])

  // Team-scoped offseason changes: moves where this team is either source or destination.
  const teamScopedChanges = useMemo(() => {
    if (!changes?.playerMoves) return { arrivals: [], departures: [] }
    const arrivals = []
    const departures = []
    for (const m of changes.playerMoves) {
      if (m.toTeamAbbr === normalizedAbbr) arrivals.push(m)
      else if (m.fromTeamAbbr === normalizedAbbr) departures.push(m)
    }
    const posSort = (a, b) => {
      const order = { QB: 0, RB: 1, WR: 2, TE: 3, K: 4, DST: 5 }
      const ar = order[a.player?.position] ?? 99
      const br = order[b.player?.position] ?? 99
      if (ar !== br) return ar - br
      return (a.player?.name ?? '').localeCompare(b.player?.name ?? '')
    }
    arrivals.sort(posSort)
    departures.sort(posSort)
    return { arrivals, departures }
  }, [changes, normalizedAbbr])

  const teamUnitMoves = useMemo(() => {
    if (!changes?.unitRankMovers) return []
    return changes.unitRankMovers.filter((m) => m.teamAbbr === normalizedAbbr)
  }, [changes, normalizedAbbr])

  const hasOffseasonChanges =
    teamScopedChanges.arrivals.length > 0 ||
    teamScopedChanges.departures.length > 0 ||
    teamUnitMoves.length > 0 ||
    teamSummary?.hcIsNewFor2026 === true

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Masthead */}
      <div className="h-0.5 bg-blaze" aria-hidden="true" />
      <div className="bg-slate-mid text-white border-b border-black/20">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 md:gap-6 font-mono text-[11px] uppercase tracking-[0.22em] flex-wrap">
          <div className="flex items-center gap-4 shrink-0">
            <Link to="/lab/prep" className="text-white/60 hover:text-white transition-colors">
              ← Prep
            </Link>
            <span className="text-white/30">/</span>
            <Link to="/lab/prep/teams" className="text-white/60 hover:text-white transition-colors">
              The 32
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-5 text-white/60">
            <span><span className="text-white font-bold">{normalizedAbbr}</span></span>
            {data?.team?.division && (
              <span><span className="text-white font-bold">{divisionBadge(data.team.conference, data.team.division)}</span></span>
            )}
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

      <div className="mx-auto max-w-6xl px-4 md:px-6 pt-5 pb-16">
        {loading ? (
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-16 text-center">
            Loading {normalizedAbbr}…
          </div>
        ) : notFound ? (
          <div className="text-center py-20">
            <h1 className="font-display font-extrabold text-3xl mb-2">Unknown team</h1>
            <p className="font-body text-text-secondary mb-4">
              No team matches “{normalizedAbbr}”.
            </p>
            <Link
              to="/lab/prep/teams"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-blaze hover:text-blaze-hot transition-colors font-bold"
            >
              ← Back to the 32
            </Link>
          </div>
        ) : error ? (
          <div className="font-mono text-xs text-live-red py-12 text-center">
            Couldn’t load team: {error}
          </div>
        ) : (
          <>
            {/* Hero strip — team-color band wrapping mono abbr + name */}
            <section
              className="mb-6 rounded-card-lg overflow-hidden shadow-card border"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(color, 0.18)} 0%, ${hexToRgba(color, 0.04)} 100%)`,
                borderColor: hexToRgba(color, 0.32),
              }}
            >
              <div className="h-2 w-full" style={{ backgroundColor: color }} />
              <div className="px-4 md:px-8 py-4 md:py-6 flex items-end justify-between gap-4 md:gap-6 flex-wrap">
                <div className="flex items-end gap-3 md:gap-5 min-w-0">
                  <span
                    className="font-mono font-extrabold text-[44px] md:text-6xl tracking-tight leading-none"
                    style={{ color }}
                  >
                    {data.team.abbreviation}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted mb-1">
                      {divisionBadge(data.team.conference, data.team.division)}
                    </div>
                    <h1 className="font-editorial italic font-normal text-[26px] md:text-4xl leading-tight text-[var(--text-1)]">
                      {teamDisplayName(data.team)}
                    </h1>
                  </div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
                  Season Annual · 2026
                </div>
              </div>
            </section>

            {/* Coaching + 3-year unit trend */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-1">
                <CoachingCard coaching={data.coaching} color={color} />
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <UnitTrendCard title="Offensive Line" ranks={data.ranks} unitKey="olRank" color={color} />
                <UnitTrendCard title="Defensive Line" ranks={data.ranks} unitKey="dlRank" color={color} />
              </div>
            </section>

            {/* What changed for THIS team — offseason scoped to the current roster */}
            {hasOffseasonChanges && (
              <section className="mb-8">
                <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
                      i·b
                    </span>
                    <h2 className="font-display font-extrabold text-2xl tracking-tight">
                      What changed for {normalizedAbbr}
                    </h2>
                  </div>
                  <Link
                    to="/lab/prep/changes"
                    className="font-mono text-[10px] uppercase tracking-[0.24em] text-blaze hover:text-blaze-hot font-bold"
                  >
                    League view →
                  </Link>
                </div>
                <div
                  className="rounded-card-lg overflow-hidden shadow-card bg-[var(--surface)]"
                  style={{ border: `1px solid ${hexToRgba(color, 0.32)}` }}
                >
                  <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]">
                    {/* Arrivals */}
                    <div className="p-5">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="font-mono text-xs uppercase tracking-[0.24em] font-bold text-field">
                          Arrivals
                        </span>
                        <span className="font-mono text-xs uppercase tracking-[0.24em] text-text-muted">
                          {teamScopedChanges.arrivals.length}
                        </span>
                      </div>
                      {teamScopedChanges.arrivals.length === 0 ? (
                        <div className="font-body text-sm text-text-muted italic py-2">
                          No new faces this offseason.
                        </div>
                      ) : (
                        <ul className="space-y-2.5">
                          {teamScopedChanges.arrivals.slice(0, 6).map((m) => (
                            <li
                              key={m.player?.id}
                              className="flex items-baseline justify-between gap-2 font-body text-[15px]"
                            >
                              <span className="flex items-baseline gap-2 min-w-0">
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text-muted shrink-0 w-8">
                                  {m.player?.position ?? '—'}
                                </span>
                                <span className="font-editorial italic text-[var(--text-1)] truncate">
                                  {m.player?.name ?? '—'}
                                </span>
                              </span>
                              <span className="font-mono text-[12px] font-bold whitespace-nowrap shrink-0 text-text-muted">
                                from <span style={{ color: TEAM_COLORS[m.fromTeamAbbr] ?? '#1E2A3A' }}>{m.fromTeamAbbr}</span>
                              </span>
                            </li>
                          ))}
                          {teamScopedChanges.arrivals.length > 6 && (
                            <li className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted pt-1">
                              + {teamScopedChanges.arrivals.length - 6} more
                            </li>
                          )}
                        </ul>
                      )}
                    </div>

                    {/* Departures */}
                    <div className="p-5">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="font-mono text-xs uppercase tracking-[0.24em] font-bold text-live-red">
                          Departures
                        </span>
                        <span className="font-mono text-xs uppercase tracking-[0.24em] text-text-muted">
                          {teamScopedChanges.departures.length}
                        </span>
                      </div>
                      {teamScopedChanges.departures.length === 0 ? (
                        <div className="font-body text-sm text-text-muted italic py-2">
                          No tracked departures.
                        </div>
                      ) : (
                        <ul className="space-y-2.5">
                          {teamScopedChanges.departures.slice(0, 6).map((m) => (
                            <li
                              key={m.player?.id}
                              className="flex items-baseline justify-between gap-2 font-body text-[15px]"
                            >
                              <span className="flex items-baseline gap-2 min-w-0">
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text-muted shrink-0 w-8">
                                  {m.player?.position ?? '—'}
                                </span>
                                <span className="font-editorial italic text-[var(--text-1)] truncate">
                                  {m.player?.name ?? '—'}
                                </span>
                              </span>
                              <span className="font-mono text-[12px] font-bold whitespace-nowrap shrink-0 text-text-muted">
                                to <span style={{ color: TEAM_COLORS[m.toTeamAbbr] ?? '#1E2A3A' }}>{m.toTeamAbbr}</span>
                              </span>
                            </li>
                          ))}
                          {teamScopedChanges.departures.length > 6 && (
                            <li className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted pt-1">
                              + {teamScopedChanges.departures.length - 6} more
                            </li>
                          )}
                        </ul>
                      )}
                    </div>

                    {/* Coaching + unit movement */}
                    <div className="p-5">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="font-mono text-xs uppercase tracking-[0.24em] font-bold text-blaze">
                          Staff + lines
                        </span>
                      </div>
                      <ul className="space-y-2.5">
                        {teamSummary?.hcIsNewFor2026 && (
                          <li className="flex items-baseline justify-between gap-2 font-body text-[15px]">
                            <span className="flex items-baseline gap-2 min-w-0">
                              <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-blaze shrink-0 w-8">
                                HC
                              </span>
                              <span className="font-editorial italic text-[var(--text-1)] truncate">
                                {data.coaching?.hc?.name ?? '—'}
                              </span>
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded bg-blaze text-white">
                              New
                            </span>
                          </li>
                        )}
                        {teamUnitMoves.length === 0 ? (
                          !teamSummary?.hcIsNewFor2026 && (
                            <li className="font-body text-sm text-text-muted italic py-2">
                              No qualifying staff or line moves.
                            </li>
                          )
                        ) : (
                          teamUnitMoves.map((m) => {
                            const improved = m.delta < 0
                            return (
                              <li key={`${m.unit}`} className="flex items-baseline justify-between gap-2 font-body text-[15px]">
                                <span className="flex items-baseline gap-2">
                                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text-muted shrink-0 w-8">
                                    {m.unit}
                                  </span>
                                  <span className="font-mono text-text-secondary">#{m.from}</span>
                                  <span className="text-text-muted">→</span>
                                  <span className={improved ? 'font-mono font-extrabold text-field text-base' : 'font-mono font-extrabold text-live-red text-base'}>
                                    #{m.to}
                                  </span>
                                </span>
                                <span className={classNames(
                                  'font-mono text-[11px] uppercase tracking-[0.14em] font-bold',
                                  improved ? 'text-field' : 'text-live-red',
                                )}>
                                  {improved ? '▲' : '▼'} {Math.abs(m.delta)}
                                </span>
                              </li>
                            )
                          })
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Depth chart */}
            <section className="mb-8">
              <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">ii.</span>
                  <h2 className="font-display font-extrabold text-2xl tracking-tight">Depth chart</h2>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  Current snapshot · {data.roster?.length ?? 0} players
                </span>
              </div>
              {(!data.roster || data.roster.length === 0) ? (
                <div className="font-mono text-xs text-text-muted py-10 text-center bg-[var(--surface)] rounded-card border border-[var(--color-border)]">
                  No roster snapshot available.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {POSITION_GROUPS.map((g) => (
                    <PositionGroup
                      key={g.key}
                      group={g}
                      players={rosterByPosition.get(g.key)}
                      color={color}
                    />
                  ))}
                </div>
              )}
            </section>

            <footer className="border-t border-[var(--color-border)] pt-5 flex items-baseline justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em]">
                <span className="text-[var(--text-1)] font-bold">⚡ CLUTCH</span>
                <span className="text-text-muted">· NFL Prep · {data.team.abbreviation}</span>
              </div>
              <Link
                to="/lab/prep/teams"
                className="font-mono text-[10px] uppercase tracking-[0.24em] text-blaze hover:text-blaze-hot transition-colors font-bold"
              >
                Back to the 32 →
              </Link>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
