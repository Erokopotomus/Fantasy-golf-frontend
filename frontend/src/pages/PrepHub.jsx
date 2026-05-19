import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

/**
 * Lab → Prep hub (DS-13).
 *
 * Aesthetic: editorial bone structure + NFL emotion. Team-color left
 * stripes on every tile, yard-line decorative bars between sections,
 * jersey-style stat numerals. Trademarks (logos, marks) avoided — colors
 * are the design carrier.
 */

// Primary (and secondary, for delta accents when team color clashes with
// our green/red signal) colors per NFL franchise. Light-mode-safe — we
// use these as accent stripes on cream backgrounds.
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

// Decorative yard-line strip. Pure CSS, no images. Used as section separator.
function YardLine({ accent = '#0B6E4F' }) {
  return (
    <div
      className="h-3 w-full rounded-sm"
      style={{
        background:
          `repeating-linear-gradient(90deg, ${accent} 0 2px, transparent 2px 22px), linear-gradient(180deg, transparent 0 50%, rgba(0,0,0,0.04) 50% 100%)`,
      }}
      aria-hidden="true"
    />
  )
}

// Defensive name rendering — schema isn't consistent on whether name
// includes the city ("Ravens" vs "Baltimore Ravens").
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
      className="relative block bg-[var(--surface)] border border-[var(--color-border)] rounded-card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all group"
      style={{ borderLeft: `6px solid ${color}` }}
    >
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="font-mono font-extrabold text-2xl tracking-tight transition-colors"
            style={{ color }}
          >
            {team.abbreviation}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
            {team.conference}{team.division ? ` · ${team.division.slice(0, 1) + team.division.slice(1).toLowerCase()}` : ''}
          </span>
        </div>
        <div className="mt-1 font-editorial italic text-base text-text-secondary leading-tight">
          {teamDisplayName(team)}
        </div>
        <div className="mt-3 space-y-1.5 font-body text-[13px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted text-[11px] uppercase tracking-[0.12em]">Head coach</span>
            <span className="text-[var(--text-1)] truncate font-medium">{team.hcName ?? '—'}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-text-muted text-[11px] uppercase tracking-[0.12em]">OL ’25</span>
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
  return (
    <div className="relative bg-[var(--surface)] border border-[var(--color-border)] rounded-card-lg overflow-hidden shadow-card">
      {/* Topps foil bar */}
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
  const color = TEAM_COLORS[team.abbreviation] ?? '#1E2A3A'
  return (
    <Link
      to="/lab/prep/changes"
      className="flex items-baseline justify-between gap-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--glass)] transition-colors -mx-2 px-2 rounded"
    >
      <div className="flex items-baseline gap-3 min-w-0">
        <span
          className="font-mono font-extrabold text-base w-10"
          style={{ color }}
        >
          {team.abbreviation}
        </span>
        <span className="font-editorial italic text-base text-text-secondary truncate">
          {teamDisplayName(team)}
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
    return withDeltas.slice(0, 4)
  }, [teams])

  const stats = useMemo(() => ({
    teamCount: teams.length,
    headCoaches: teams.filter((t) => t.hcName).length,
    olRanked: teams.filter((t) => Number.isFinite(t.olRank)).length,
  }), [teams])

  // Days until first Thursday Night Football of the 2026 season — typical
  // kickoff is the Thursday after Labor Day (Sept 7, 2026 is Labor Day,
  // so kickoff is Sept 10, 2026).
  const daysToKickoff = useMemo(() => {
    const kickoff = new Date(Date.UTC(2026, 8, 10))
    const today = new Date()
    const diffMs = kickoff.getTime() - today.getTime()
    return Math.max(0, Math.ceil(diffMs / 86400000))
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      {/* Issue chrome */}
      <div className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
          <Link to="/lab" className="hover:text-blaze transition-colors">
            ← The Lab
          </Link>
          <span className="text-blaze">{daysToKickoff} days to kickoff</span>
          <span>Vol. I</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        {/* Tightened hero — headline + pull side by side, no orphan space */}
        <header className="mb-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-blaze mb-3">
            Section / NFL Prep
          </div>
          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 md:col-span-7">
              <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-4xl md:text-5xl">
                The offseason that decides
                <br />
                <span className="font-editorial italic font-normal text-blaze">your season.</span>
              </h1>
            </div>
            <div className="col-span-12 md:col-span-5">
              <p className="font-body text-base md:text-lg text-text-secondary leading-snug">
                Every staff change, every depth chart, every unit that moved up or fell off — built so you walk into draft day knowing it cold.
              </p>
            </div>
          </div>
          {/* Stat strip with yard-line texture */}
          <div className="mt-6">
            <YardLine accent="#0D9668" />
            <div className="mt-3 flex items-baseline gap-6 font-mono text-xs uppercase tracking-[0.16em] text-text-muted flex-wrap">
              <span><span className="text-[var(--text-1)] font-bold">{stats.teamCount || '—'}</span> teams</span>
              <span><span className="text-[var(--text-1)] font-bold">{stats.headCoaches || '—'}</span> staffs</span>
              <span><span className="text-[var(--text-1)] font-bold">{stats.olRanked || '—'}</span> OL/DL ranks</span>
              <span><span className="text-[var(--text-1)] font-bold">287</span> quiz cards</span>
              <span className="ml-auto text-blaze">Refreshed daily</span>
            </div>
          </div>
          {error && (
            <div className="mt-3 font-mono text-xs text-live-red">
              Couldn’t load Prep summary: {error}
            </div>
          )}
        </header>

        {/* I. Featured Teams */}
        <section className="mb-12">
          <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">I.</div>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight">
                Featured teams
              </h2>
              <p className="font-body text-sm text-text-secondary mt-1">
                Best lines entering 2026 in the {tab === 'ALL' ? 'league' : tab + ' '}, by OL rank.
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
            <p className="font-body text-sm text-text-secondary mb-5">
              Spaced repetition until it sticks. Ten cards a day.
            </p>
            <SampleQuizCard />
          </div>

          <div className="lg:col-span-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">III.</div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight mb-1">
              Biggest movers
            </h2>
            <p className="font-body text-sm text-text-secondary mb-3">
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

        {/* Bottom yard-line */}
        <YardLine accent="#0D9668" />

        <footer className="pt-6 flex items-baseline justify-between gap-4 flex-wrap">
          <p className="font-body text-sm text-text-muted max-w-[52ch]">
            The annual rebuilds itself every morning. Tomorrow’s issue will be different from today’s.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-blaze">
            Kickoff · Sept 10, 2026
          </p>
        </footer>
      </div>
    </div>
  )
}
