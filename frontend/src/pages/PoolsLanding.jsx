import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLES = {
  DRAFT:     'bg-text-2/15 text-text-2',
  OPEN:      'bg-field/15 text-field',
  LOCKED:    'bg-blaze/15 text-blaze',
  COMPLETED: 'bg-crown/15 text-crown',
  UNKNOWN:   'bg-text-2/10 text-text-2',
}

const STATUS_LABEL = {
  DRAFT: 'Draft',
  OPEN: 'Accepting entries',
  LOCKED: 'Live',
  COMPLETED: 'Final',
  UNKNOWN: 'Unknown',
}

function StatusPill({ status }) {
  const s = status || 'UNKNOWN'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider ${STATUS_STYLES[s]}`}>
      {s === 'LOCKED' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blaze opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blaze"></span>
        </span>
      )}
      {STATUS_LABEL[s]}
    </span>
  )
}

function PoolCard({ pool, kind }) {
  // kind: 'commish' or 'entered'
  const href = kind === 'commish'
    ? `/pools/${pool.slug}/admin?token=${pool.adminToken}`
    : `/pools/${pool.slug}`
  const ctaLabel = kind === 'commish' ? 'Manage →' : 'View →'

  return (
    <div className="group relative rounded-2xl border border-text-2/25 bg-white shadow-sm p-5 hover:border-blaze/40 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link to={href} className="block">
            <h3 className="font-display font-bold text-lg text-text-primary truncate">{pool.name}</h3>
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-2 mt-0.5 truncate">
              {pool.tournamentName || 'Tournament TBD'}
            </p>
          </Link>
          {kind === 'entered' && pool.teamName && (
            <p className="font-editorial italic text-sm text-text-2 mt-2">
              Team: <span className="text-text-primary not-italic font-medium">{pool.teamName}</span>
            </p>
          )}
        </div>
        <StatusPill status={pool._status} />
      </div>
      <div className="flex items-center justify-between mt-4">
        <Link to={href} className="text-blaze font-medium text-sm">
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}

export default function PoolsLanding() {
  const { user } = useAuth()
  const [commish, setCommish] = useState([])
  const [entered, setEntered] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    api.getMyPools()
      .then(({ commish, entered }) => {
        setCommish(commish.map(p => ({ ...p, _status: p.status })))
        setEntered(entered.map(p => ({ ...p, _status: p.status, name: p.poolName })))
      })
      .catch(() => { setCommish([]); setEntered([]) })
      .finally(() => setLoading(false))
  }, [user])

  // Auth gate: signed-out users see a sign-in card.
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-text-2/15 bg-surface p-8 sm:p-12 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-2 mb-3">Members only</div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-text-primary mb-3 tracking-tight">
            Sign in to <span className="font-editorial italic font-normal">manage pools</span>
          </h1>
          <p className="text-text-2 max-w-md mx-auto mb-7">
            Your pools live on your Clutch account. Sign in on any device to see them.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/login?redirect=${encodeURIComponent('/pools')}`}
              className="inline-flex items-center justify-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold rounded-xl px-5 py-3 transition-all hover:-translate-y-0.5"
            >
              Sign in
            </Link>
            <Link
              to={`/signup?redirect=${encodeURIComponent('/pools')}`}
              className="inline-flex items-center justify-center gap-2 bg-bg border border-text-2/20 hover:border-blaze/40 text-text-primary font-display font-bold rounded-xl px-5 py-3 transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isEmpty = !loading && commish.length === 0 && entered.length === 0

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
      {/* Hero */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-5xl sm:text-6xl font-display font-extrabold text-text-primary tracking-tight leading-none">
            Pools
          </h1>
          <p className="font-editorial italic text-lg text-text-2 mt-3 max-w-md">
            Quick golf pools for your group. Tier picks, share a link, run the leaderboard.
          </p>
        </div>
        <Link
          to="/pools/new"
          className="inline-flex items-center justify-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold rounded-xl px-5 py-3 text-base shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <span className="text-xl leading-none">+</span> New pool
        </Link>
      </header>

      {isEmpty ? (
        <div className="rounded-3xl border-2 border-dashed border-text-2/20 p-10 sm:p-14 text-center max-w-2xl mx-auto">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-2 mb-3">Get started</div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-text-primary mb-2">
            Run your first pool.
          </h2>
          <p className="text-text-2 mb-6 max-w-md mx-auto">
            Pick a tournament, build your tiers, share the link with friends.
          </p>
          <Link
            to="/pools/new"
            className="inline-flex items-center gap-2 bg-blaze text-white font-display font-bold rounded-xl px-5 py-3"
          >
            + New pool
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Commish */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display font-bold text-xl text-text-primary">Pools you commish</h2>
              <span className="font-mono text-xs uppercase tracking-wider text-text-2">{commish.length}</span>
            </div>
            {commish.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-text-2/30 p-6 text-sm text-text-2">
                You haven't created a pool yet. <Link to="/pools/new" className="text-blaze font-medium">Start one →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {commish.map(p => (
                  <PoolCard key={p.slug} pool={p} kind="commish" />
                ))}
              </div>
            )}
          </section>

          {/* Entered */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display font-bold text-xl text-text-primary">Pools you're in</h2>
              <span className="font-mono text-xs uppercase tracking-wider text-text-2">{entered.length}</span>
            </div>
            {entered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-text-2/30 p-6 text-sm text-text-2">
                No pool entries yet. When you submit picks they'll show up here.
              </div>
            ) : (
              <div className="space-y-3">
                {entered.map(p => (
                  <PoolCard key={`${p.slug}-${p.teamName}`} pool={p} kind="entered" />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Help footer */}
      <div className="text-xs text-text-2/60 font-mono uppercase tracking-wider text-center pt-8 border-t border-text-2/10">
        Your pools live on your Clutch account. Sign in on any device to see them.
      </div>
    </div>
  )
}
