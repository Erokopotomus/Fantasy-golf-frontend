import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { TEAM_COLORS, hexToRgba } from '../utils/nflTeamColors'
import PrepSectionNav from '../components/prep/PrepSectionNav'

/**
 * Lab → Prep hub (DS-13).
 *
 * Editorial bone structure + NFL emotion via team-color tile backgrounds
 * and team-identity quiz cards. No yard-line gimmicks — colors carry the
 * sport. Each quiz card is screenshot-shareable (subject-team palette +
 * CLUTCH attribution baked in).
 */

const SAMPLE_CARD = {
  category: 'Coaching',
  subjectAbbr: 'BUF',
  subjectCity: 'Buffalo',
  subjectName: 'Bills',
  question: 'Who is the Buffalo Bills’ head coach for the 2026 season?',
  answer: 'Joe Brady',
  distractors: ['Sean McDermott', 'Sean McVay', 'Mike Vrabel'],
  difficulty: 1,
}

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
      {/* Color bar on top — visible sport accent */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />
      <div className="px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="font-mono font-extrabold text-2xl tracking-tight leading-none"
            style={{ color }}
          >
            {team.abbreviation}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
            {team.division ? team.division.slice(0, 1) + team.division.slice(1).toLowerCase() : team.conference}
          </span>
        </div>
        <div className="mt-0.5 font-editorial italic text-sm text-[var(--text-1)] leading-tight">
          {teamDisplayName(team)}
        </div>
        <div className="mt-2 pt-2 border-t border-[var(--color-border)]/60 space-y-1 font-body text-[12.5px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted text-[10px] uppercase tracking-[0.14em]">Head coach</span>
            <span className="text-[var(--text-1)] truncate font-semibold">{team.hcName ?? '—'}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted text-[10px] uppercase tracking-[0.14em]">OL ’25</span>
            <span className="font-mono text-[var(--text-1)] font-bold">
              #{team.olRank ?? '—'}
              {arrow && (
                <span className={classNames('ml-1.5 text-[11px] font-bold', arrowClass)}>
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

function SampleQuizCard() {
  const [showAnswer, setShowAnswer] = useState(false)
  const subjectColor = TEAM_COLORS[SAMPLE_CARD.subjectAbbr] ?? '#1E2A3A'
  return (
    <div
      className="relative rounded-card-lg overflow-hidden shadow-card"
      style={{
        background: `linear-gradient(160deg, ${hexToRgba(subjectColor, 0.12)} 0%, ${hexToRgba(subjectColor, 0.03)} 60%, var(--surface) 100%)`,
        border: `1px solid ${hexToRgba(subjectColor, 0.32)}`,
      }}
    >
      {/* Team-color top band — owns the card's identity */}
      <div className="h-2 w-full" style={{ backgroundColor: subjectColor }} />
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span
              className="font-mono font-extrabold text-lg tracking-tight px-2 py-0.5 rounded"
              style={{ color: subjectColor, backgroundColor: hexToRgba(subjectColor, 0.1) }}
            >
              {SAMPLE_CARD.subjectAbbr}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
              · {SAMPLE_CARD.category}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
            Difficulty {SAMPLE_CARD.difficulty}/5
          </span>
        </div>
        <h3 className="font-editorial italic text-2xl md:text-3xl leading-snug text-[var(--text-1)]">
          “{SAMPLE_CARD.question}”
        </h3>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {[SAMPLE_CARD.answer, ...SAMPLE_CARD.distractors]
            .sort()
            .map((choice) => {
              const isAnswer = choice === SAMPLE_CARD.answer
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className={classNames(
                    'text-left px-4 py-3 rounded-button border font-body text-sm transition-all bg-white/60',
                    !showAnswer && 'border-[var(--color-border)] hover:bg-white',
                    showAnswer && isAnswer && 'border-field bg-field/10 text-field font-bold',
                    showAnswer && !isAnswer && 'border-[var(--color-border)] opacity-40',
                  )}
                  style={!showAnswer ? { borderColor: hexToRgba(subjectColor, 0.25) } : undefined}
                >
                  {choice}
                </button>
              )
            })}
        </div>
        {/* Footer with CLUTCH branding — screenshot attribution */}
        <div className="mt-6 pt-5 border-t border-[var(--color-border)]/60 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-1)] font-bold">⚡ CLUTCH</span>
            <span className="text-text-muted">· NFL Prep</span>
          </div>
          <Link to="/lab/prep/quiz" className="text-blaze hover:text-blaze-hot transition-colors">
            Today’s deck →
          </Link>
        </div>
      </div>
    </div>
  )
}

function MoverRow({ team, isLast }) {
  const olDelta = team.olRankDelta
  const dlDelta = team.dlRankDelta
  const showDelta = Number.isFinite(olDelta) ? olDelta : dlDelta
  const unit = Number.isFinite(olDelta) ? 'OL' : 'DL'
  const fromRank = Number.isFinite(olDelta) ? (team.olRank ?? 0) + olDelta : (team.dlRank ?? 0) + dlDelta
  const toRank = Number.isFinite(olDelta) ? team.olRank : team.dlRank
  const improved = showDelta < 0
  const color = TEAM_COLORS[team.abbreviation] ?? '#1E2A3A'
  return (
    <Link
      to="/lab/prep/changes"
      className={classNames(
        'flex items-baseline justify-between gap-3 py-3 px-4 hover:bg-white/70 transition-colors',
        !isLast && 'border-b border-[var(--color-border)]/50',
      )}
    >
      <div className="flex items-baseline gap-3 min-w-0">
        <span
          className="font-mono font-extrabold text-base w-10 shrink-0"
          style={{ color }}
        >
          {team.abbreviation}
        </span>
        <span className="font-editorial italic text-base text-[var(--text-1)] truncate">
          {teamDisplayName(team)}
        </span>
      </div>
      <div className="flex items-baseline gap-2 font-mono text-sm whitespace-nowrap">
        <span className="text-text-muted text-[10px] uppercase tracking-[0.16em]">{unit}</span>
        <span className="text-text-muted">#{fromRank}</span>
        <span className="text-text-muted">→</span>
        <span className={improved ? 'text-field font-extrabold' : 'text-live-red font-extrabold'}>
          #{toRank}
        </span>
      </div>
    </Link>
  )
}

export default function PrepHub() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('AFC')

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

  const filtered = useMemo(() => {
    if (tab === 'ALL') return teams
    return teams.filter((t) => t.conference === tab)
  }, [teams, tab])

  const featured = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const ar = Number.isFinite(a.olRank) ? a.olRank : 999
      const br = Number.isFinite(b.olRank) ? b.olRank : 999
      return ar - br
    })
    return sorted.slice(0, 8)
  }, [filtered])

  const movers = useMemo(() => {
    const withDeltas = teams
      .map((t) => {
        const best = [
          { unit: 'OL', delta: t.olRankDelta },
          { unit: 'DL', delta: t.dlRankDelta },
        ]
          .filter((x) => Number.isFinite(x.delta))
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
        return best ? { ...t, _bestUnit: best.unit, _bestDelta: best.delta } : null
      })
      .filter(Boolean)
    withDeltas.sort((a, b) => Math.abs(b._bestDelta) - Math.abs(a._bestDelta))
    return withDeltas.slice(0, 5)
  }, [teams])

  const stats = useMemo(() => ({
    teamCount: teams.length,
    headCoaches: teams.filter((t) => t.hcName).length,
    olRanked: teams.filter((t) => Number.isFinite(t.olRank)).length,
  }), [teams])

  const daysToKickoff = useMemo(() => {
    const kickoff = new Date(Date.UTC(2026, 8, 10))
    const today = new Date()
    return Math.max(0, Math.ceil((kickoff.getTime() - today.getTime()) / 86400000))
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Broadcast-style ticker bar — blaze separator above so it doesn't bleed
          into the navbar. Lighter slate-mid keeps it distinct from the nav. */}
      <div className="h-0.5 bg-blaze" aria-hidden="true" />
      <div className="bg-slate-mid text-white border-b border-black/20">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 md:gap-6 font-mono text-[11px] uppercase tracking-[0.22em] flex-wrap">
          <Link to="/lab" className="text-white/60 hover:text-white transition-colors shrink-0">
            ← The Lab
          </Link>
          <div className="hidden md:flex items-center gap-5 text-white/60">
            <span><span className="text-white font-bold">{stats.teamCount || '—'}</span> teams</span>
            <span><span className="text-white font-bold">{stats.headCoaches || '—'}</span> staffs</span>
            <span><span className="text-white font-bold">{stats.olRanked || '—'}</span> ranks</span>
            <span><span className="text-white font-bold">287</span> cards</span>
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
        {/* Compressed hero — single tight band */}
        <header className="mb-5">
          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 md:col-span-7">
              <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-3xl md:text-4xl">
                The offseason that decides
                <span className="font-editorial italic font-normal text-blaze"> your season.</span>
              </h1>
            </div>
            <div className="col-span-12 md:col-span-5 md:pb-1">
              <p className="font-body text-sm text-text-secondary leading-snug">
                Every staff change, every depth chart, every unit that moved up or fell off — so you walk into draft day knowing it cold.
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-3 font-mono text-xs text-live-red">
              Couldn’t load Prep summary: {error}
            </div>
          )}
        </header>

        {/* I. Featured Teams — prominent tabs */}
        <section className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <div className="flex items-baseline gap-3 mb-0.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">I.</span>
                <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
                  Featured teams
                </h2>
              </div>
              <p className="font-body text-sm text-text-secondary">
                Top {featured.length} {tab === 'ALL' ? 'league-wide' : `in the ${tab}`} by OL rank, 2025.
              </p>
            </div>
            {/* Beefed-up conference selector */}
            <div className="inline-flex rounded-card border border-[var(--color-border)] bg-[var(--surface)] p-1 shadow-card font-mono text-xs uppercase tracking-[0.18em]">
              {['AFC', 'NFC', 'ALL'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTab(opt)}
                  className={classNames(
                    'px-5 py-2 rounded-button transition-all font-bold',
                    tab === opt
                      ? 'bg-slate text-white shadow-button'
                      : 'text-text-secondary hover:text-[var(--text-1)] hover:bg-[var(--glass)]',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-12 text-center">
              Loading the annual…
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {featured.map((t) => (
                <TeamTile key={t.id} team={t} />
              ))}
            </div>
          )}

          <div className="mt-3 text-right">
            <Link
              to="/lab/prep/teams"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-blaze hover:text-blaze-hot transition-colors font-bold"
            >
              Browse all 32 →
            </Link>
          </div>
        </section>

        {/* II + III mirrored — both wrapped in matching containers */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
          <div className="lg:col-span-3">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">II.</span>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
                Today’s card
              </h2>
            </div>
            <p className="font-body text-sm text-text-secondary mb-4">
              Spaced repetition until it sticks. Ten cards a day.
            </p>
            <SampleQuizCard />
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">III.</span>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
                Biggest movers
              </h2>
            </div>
            <p className="font-body text-sm text-text-secondary mb-4">
              Units that shifted most year-over-year.
            </p>
            <div
              className="rounded-card-lg overflow-hidden shadow-card bg-[var(--surface)] border border-[var(--color-border)]"
            >
              <div className="h-2 w-full bg-gradient-to-r from-field via-blaze to-live-red" />
              {loading ? (
                <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-8 text-center">
                  Loading…
                </div>
              ) : movers.length === 0 ? (
                <div className="font-mono text-xs text-text-muted py-6 px-4">
                  No year-over-year data yet.
                </div>
              ) : (
                <div>
                  {movers.map((t, i) => (
                    <MoverRow key={t.id} team={t} isLast={i === movers.length - 1} />
                  ))}
                </div>
              )}
              <div className="px-4 py-3 border-t border-[var(--color-border)]/60 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em]">
                <span className="text-[var(--text-1)] font-bold">⚡ CLUTCH</span>
                <Link
                  to="/lab/prep/changes"
                  className="text-blaze hover:text-blaze-hot transition-colors font-bold"
                >
                  Read the offseason →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[var(--color-border)] pt-5 flex items-baseline justify-between gap-4 flex-wrap">
          <p className="font-body text-sm text-text-muted max-w-[52ch]">
            The annual rebuilds itself every morning. Tomorrow’s issue will be different from today’s.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-blaze font-bold">
            Kickoff · Sept 10, 2026
          </p>
        </footer>
      </div>
    </div>
  )
}
