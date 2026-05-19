import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

/**
 * Lab → Prep hub (DS-13).
 *
 * Aesthetic: "The Athletic × Topps offseason annual." Tight editorial header,
 * then the hub teases each room with REAL data — featured team tiles
 * (AFC/NFC tabs), a sample quiz card, recent offseason moves.
 */

const SAMPLE_CARD = {
  category: 'Coaching',
  question: 'Who is the Buffalo Bills’ head coach for the 2026 season?',
  answer: 'Joe Brady',
  distractors: ['Sean McDermott', 'Sean McVay', 'Mike Vrabel'],
  difficulty: 1,
}

function classNames(...c) {
  return c.filter(Boolean).join(' ')
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

  return (
    <Link
      to={`/lab/prep/teams/${team.abbreviation}`}
      className="block bg-[var(--surface)] border border-[var(--color-border)] rounded-card p-4 hover:border-blaze hover:shadow-card-hover transition-all group"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono font-bold text-2xl tracking-tight text-[var(--text-1)] group-hover:text-blaze transition-colors">
          {team.abbreviation}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
          {team.conference}{team.division ? ` · ${team.division.slice(0, 1) + team.division.slice(1).toLowerCase()}` : ''}
        </span>
      </div>
      <div className="mt-1 font-editorial italic text-base text-text-secondary leading-tight">
        {team.city} {team.name}
      </div>
      <div className="mt-3 space-y-1.5 font-body text-[13px]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-text-muted text-[11px] uppercase tracking-[0.12em]">HC</span>
          <span className="text-[var(--text-1)] truncate">{team.hcName ?? '—'}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-text-muted text-[11px] uppercase tracking-[0.12em]">OL ’25</span>
          <span className="font-mono text-[var(--text-1)]">
            #{team.olRank ?? '—'}
            {arrow && (
              <span className={classNames('ml-1.5 text-[11px]', arrowClass)}>
                {arrow}{olDelta != null && olDelta !== 0 ? ` ${Math.abs(olDelta)}` : ''}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  )
}

function SampleQuizCard() {
  const [showAnswer, setShowAnswer] = useState(false)
  return (
    <div className="relative bg-[var(--surface)] border border-[var(--color-border)] rounded-card-lg overflow-hidden shadow-card">
      {/* Card chrome — Topps-ish foil bar */}
      <div className="h-2 bg-gradient-to-r from-blaze via-crown to-field" />
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted mb-5">
          <span>Card · {SAMPLE_CARD.category}</span>
          <span>Difficulty {SAMPLE_CARD.difficulty}/5</span>
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
                    'text-left px-4 py-3 rounded-button border font-body text-sm transition-all',
                    !showAnswer && 'border-[var(--color-border)] hover:border-blaze hover:bg-[var(--glass-hover)]',
                    showAnswer && isAnswer && 'border-field bg-field/10 text-field font-semibold',
                    showAnswer && !isAnswer && 'border-[var(--color-border)] opacity-50',
                  )}
                >
                  {choice}
                </button>
              )
            })}
        </div>
        <div className="mt-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em]">
          <span className="text-text-muted">{showAnswer ? 'Answer revealed' : 'Tap any choice'}</span>
          <Link to="/lab/prep/quiz" className="text-blaze hover:text-blaze-hot transition-colors">
            Today’s deck →
          </Link>
        </div>
      </div>
    </div>
  )
}

function MoverRow({ team }) {
  const olDelta = team.olRankDelta
  const dlDelta = team.dlRankDelta
  const showDelta = Number.isFinite(olDelta) ? olDelta : dlDelta
  const unit = Number.isFinite(olDelta) ? 'OL' : 'DL'
  const fromRank = Number.isFinite(olDelta) ? (team.olRank ?? 0) + olDelta : (team.dlRank ?? 0) + dlDelta
  const toRank = Number.isFinite(olDelta) ? team.olRank : team.dlRank
  const improved = showDelta < 0
  return (
    <Link
      to="/lab/prep/changes"
      className="flex items-baseline justify-between gap-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--glass)] transition-colors -mx-2 px-2 rounded"
    >
      <div className="flex items-baseline gap-3 min-w-0">
        <span className="font-mono font-bold text-base text-[var(--text-1)] w-10">
          {team.abbreviation}
        </span>
        <span className="font-editorial italic text-base text-text-secondary truncate">
          {team.city} {team.name}
        </span>
      </div>
      <div className="flex items-baseline gap-2 font-mono text-sm whitespace-nowrap">
        <span className="text-text-muted text-[10px] uppercase tracking-[0.16em]">{unit}</span>
        <span className="text-text-muted">#{fromRank}</span>
        <span className="text-text-muted">→</span>
        <span className={improved ? 'text-field font-bold' : 'text-live-red font-bold'}>
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
  const [tab, setTab] = useState('AFC') // 'AFC' | 'NFC' | 'ALL'

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        // api is a custom client that prepends '/api'; endpoint paths must NOT include it.
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

  // Featured tiles: top 8 by best (lowest) OL rank in the active tab,
  // teams without rank fall to the bottom.
  const featured = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const ar = Number.isFinite(a.olRank) ? a.olRank : 999
      const br = Number.isFinite(b.olRank) ? b.olRank : 999
      return ar - br
    })
    return sorted.slice(0, 8)
  }, [filtered])

  // Top movers across both units, sorted by |delta|.
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
    return withDeltas.slice(0, 4)
  }, [teams])

  const stats = useMemo(() => ({
    teamCount: teams.length,
    headCoaches: teams.filter((t) => t.hcName).length,
    olRanked: teams.filter((t) => Number.isFinite(t.olRank)).length,
  }), [teams])

  const issueLabel = useMemo(() => {
    const d = new Date()
    const m = d.toLocaleString('en-US', { month: 'long' }).toUpperCase()
    return `${m} ${d.getFullYear()} — OFFSEASON ISSUE`
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Issue chrome */}
      <div className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
          <Link to="/lab" className="hover:text-blaze transition-colors">
            ← The Lab
          </Link>
          <span>{issueLabel}</span>
          <span>Vol. I</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-10 pb-16">
        {/* Compressed hero */}
        <header className="mb-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-blaze mb-3">
            Section / Prep
          </div>
          <div className="flex items-baseline flex-wrap gap-x-4">
            <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-4xl md:text-5xl">
              The Offseason
              <span className="font-editorial italic font-normal text-blaze ml-2">annual.</span>
            </h1>
            <p className="font-editorial italic text-lg md:text-xl text-text-secondary max-w-md ml-auto">
              Every staff. Every depth chart. Every move that costs you a fantasy season.
            </p>
          </div>
          <div className="mt-6 flex items-baseline gap-6 font-mono text-xs uppercase tracking-[0.16em] text-text-muted border-t border-[var(--color-border)] pt-4">
            <span><span className="text-[var(--text-1)] font-bold">{stats.teamCount || '—'}</span> teams</span>
            <span><span className="text-[var(--text-1)] font-bold">{stats.headCoaches || '—'}</span> staffs</span>
            <span><span className="text-[var(--text-1)] font-bold">{stats.olRanked || '—'}</span> OL/DL ranks</span>
            <span className="ml-auto text-blaze">Refreshed daily</span>
          </div>
          {error && (
            <div className="mt-3 font-mono text-xs text-live-red">
              Couldn’t load Prep summary: {error}
            </div>
          )}
        </header>

        {/* I. Featured Teams */}
        <section className="mb-14">
          <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">I.</div>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
                Featured teams
              </h2>
              <p className="font-editorial italic text-sm md:text-base text-text-secondary mt-1">
                Top {featured.length} {tab === 'ALL' ? '' : tab + ' '}lines entering 2026, by OL rank.
              </p>
            </div>
            <div className="inline-flex rounded-button bg-[var(--glass)] p-1 font-mono text-[11px] uppercase tracking-[0.16em]">
              {['AFC', 'NFC', 'ALL'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTab(opt)}
                  className={classNames(
                    'px-3 py-1.5 rounded-button transition-colors',
                    tab === opt
                      ? 'bg-blaze text-white'
                      : 'text-text-secondary hover:text-[var(--text-1)]',
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featured.map((t) => (
                <TeamTile key={t.id} team={t} />
              ))}
            </div>
          )}

          <div className="mt-4 text-right">
            <Link
              to="/lab/prep/teams"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-blaze hover:text-blaze-hot transition-colors"
            >
              Browse all 32 →
            </Link>
          </div>
        </section>

        {/* II. Quiz preview + III. Movers — two-column */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">II.</div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight mb-1">
              Today’s card
            </h2>
            <p className="font-editorial italic text-sm md:text-base text-text-secondary mb-5">
              Spaced repetition until it sticks. Ten cards a day.
            </p>
            <SampleQuizCard />
          </div>

          <div className="lg:col-span-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">III.</div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight mb-1">
              Biggest movers
            </h2>
            <p className="font-editorial italic text-sm md:text-base text-text-secondary mb-3">
              Units that shifted most year-over-year.
            </p>
            {loading ? (
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted py-6">
                Loading…
              </div>
            ) : movers.length === 0 ? (
              <div className="font-mono text-xs text-text-muted py-3">
                No year-over-year data yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {movers.map((t) => (
                  <MoverRow key={t.id} team={t} />
                ))}
              </div>
            )}
            <div className="mt-4 text-right">
              <Link
                to="/lab/prep/changes"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-blaze hover:text-blaze-hot transition-colors"
              >
                Read the offseason →
              </Link>
            </div>
          </div>
        </section>

        {/* Colophon */}
        <footer className="border-t border-[var(--color-border)] pt-6">
          <p className="font-editorial italic text-sm md:text-base text-text-muted max-w-[60ch]">
            The data spine refreshes every morning before you wake up. Tomorrow’s
            annual will be different from today’s.
          </p>
        </footer>
      </div>
    </div>
  )
}
