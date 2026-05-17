import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../services/api'
import CommishChopReview from '../components/chopped/CommishChopReview'
import { CHOPPED_VOCAB } from '../lib/chopped/vocabulary'

export default function ChopZone() {
  const { leagueId } = useParams()
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'preweek' ? 'preweek' : 'live'
  const [league, setLeague] = useState(null)
  const [safeData, setSafeData] = useState(null)
  const [events, setEvents] = useState([])
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const me = await api.getMe()
        if (cancelled) return
        setUser(me.user || me)

        const lg = await api.getLeague(leagueId)
        if (cancelled) return
        const leagueObj = lg.league || lg
        setLeague(leagueObj)

        const week = leagueObj.currentWeek || leagueObj.settings?.currentWeek || 1
        const [safe, ev] = await Promise.all([
          api.getChoppedSafePercents(leagueId, { week, mode }),
          api.getChoppedEvents(leagueId),
        ])
        if (cancelled) return
        setSafeData(safe)
        setEvents(ev.events || [])
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load Chop Zone')
      }
    }
    load()
    return () => { cancelled = true }
  }, [leagueId, mode])

  if (error) return <div className="max-w-3xl mx-auto p-6 text-live-red">{error}</div>
  if (!league || !safeData) return <div className="max-w-3xl mx-auto p-6 text-text-muted">Loading Chop Zone…</div>

  if (league.format !== 'CHOPPED') {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-text-secondary">This league is not in Chopped format.</p>
        <Link to={`/leagues/${leagueId}`} className="text-blaze">← Back to league</Link>
      </div>
    )
  }

  const alive = safeData.results // already sorted safest first
  const chopped = [...events].sort((a, b) => a.week - b.week)
  const median = Math.max(1, Math.floor(alive.length / 2))
  const survivors = alive.slice(0, median)
  const block = alive.slice(median)
  const isCommish = user && league.ownerId === user.id
  const week = league.currentWeek || league.settings?.currentWeek || 1

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-text-primary">{CHOPPED_VOCAB.pageTitle}</h1>
          <p className="text-text-muted text-sm font-editorial italic">{league.name} · Week {week}</p>
        </div>
        <div className="flex gap-3 font-mono text-sm">
          <button onClick={() => setParams({ mode: 'preweek' })}
            className={mode === 'preweek' ? 'text-blaze' : 'text-text-muted hover:text-text-secondary'}>
            Pre-Week
          </button>
          <button onClick={() => setParams({ mode: 'live' })}
            className={mode === 'live' ? 'text-blaze' : 'text-text-muted hover:text-text-secondary'}>
            Live
          </button>
        </div>
      </header>

      <Section title={CHOPPED_VOCAB.survivorsHeader} colorClass="text-field" teams={survivors} kind="alive" />
      <Section title={CHOPPED_VOCAB.blockHeader} colorClass="text-crown" teams={block} kind="alive" warn />
      {chopped.length > 0 && (
        <Section title={CHOPPED_VOCAB.choppedHeader} colorClass="text-text-muted" teams={chopped} kind="chopped" />
      )}

      {isCommish && block.length > 0 && (
        <CommishChopReview
          leagueId={leagueId}
          week={week}
          block={block}
          maxChops={league.settings?.chopsPerWeek || 1}
        />
      )}
    </div>
  )
}

function Section({ title, colorClass, teams, kind, warn }) {
  return (
    <section>
      <h2 className={`font-display text-xl mb-2 ${colorClass}`}>{title}</h2>
      <div className="space-y-1">
        {teams.map(t => (
          <div
            key={t.teamId || t.id}
            className={`rounded p-3 flex justify-between items-center bg-[var(--surface)] border border-[var(--card-border)] ${kind === 'chopped' ? 'opacity-50' : ''}`}
          >
            <span className="text-text-primary truncate pr-3">
              {kind === 'chopped'
                ? (t.team?.name || 'Unknown team')
                : (t.teamName || t.teamId?.slice(0, 8))}
            </span>
            {kind === 'alive' ? (
              <span className={`font-mono text-sm ${warn ? 'text-live-red' : 'text-text-secondary'}`}>
                {(t.safePct * 100).toFixed(0)}%
              </span>
            ) : (
              <span className="font-mono text-xs text-text-muted">
                Wk {t.week} · {t.triggerType === 'auto_fallback' ? 'auto' : 'commish'}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
