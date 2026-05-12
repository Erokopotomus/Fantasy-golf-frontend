import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { getCommishPools, getEnteredPools, forgetCommishPool, forgetEnteredPool } from '../utils/poolStorage'

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

function PoolCard({ pool, kind, onForget }) {
  // kind: 'commish' or 'entered'
  const href = kind === 'commish'
    ? `/pools/${pool.slug}/admin?token=${pool.adminToken}`
    : `/pools/${pool.slug}`
  const ctaLabel = kind === 'commish' ? 'Manage →' : 'View →'

  return (
    <div className="group relative rounded-2xl border border-text-2/15 bg-surface p-5 hover:border-blaze/40 transition-colors">
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
        <button
          onClick={() => onForget(pool)}
          className="text-text-2/60 hover:text-live-red text-xs font-mono"
          title="Remove from this list (doesn't delete the pool)"
        >
          Hide
        </button>
      </div>
    </div>
  )
}

export default function PoolsLanding() {
  const [commish, setCommish] = useState([])
  const [entered, setEntered] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const commishList = getCommishPools()
    const enteredList = getEnteredPools()
    // Fetch live status for each
    Promise.all([
      ...commishList.map(p =>
        api.getPool(p.slug).then(r => ({ ...p, _status: r.pool?.status, _tournamentName: r.pool?.tournament?.name })).catch(() => ({ ...p, _status: 'UNKNOWN' }))
      ),
      ...enteredList.map(p =>
        api.getPool(p.slug).then(r => ({ ...p, _status: r.pool?.status, _tournamentName: r.pool?.tournament?.name })).catch(() => ({ ...p, _status: 'UNKNOWN' }))
      ),
    ]).then(results => {
      const cLen = commishList.length
      setCommish(results.slice(0, cLen).map(c => ({ ...c, tournamentName: c._tournamentName || c.tournamentName })))
      setEntered(results.slice(cLen).map(e => ({ ...e, tournamentName: e._tournamentName || e.tournamentName })))
      setLoading(false)
    })
  }, [])

  const handleForgetCommish = (p) => {
    forgetCommishPool(p.slug)
    setCommish(c => c.filter(x => x.slug !== p.slug))
  }
  const handleForgetEntered = (p) => {
    forgetEnteredPool(p.slug, p.teamName)
    setEntered(e => e.filter(x => !(x.slug === p.slug && x.teamName === p.teamName)))
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
            Pick a tournament, build your tiers, share the link with friends. Anyone can enter — no signup needed.
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
              <div className="rounded-2xl border border-dashed border-text-2/20 p-6 text-sm text-text-2">
                You haven't created a pool from this browser yet. <Link to="/pools/new" className="text-blaze font-medium">Start one →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {commish.map(p => (
                  <PoolCard key={p.slug} pool={p} kind="commish" onForget={handleForgetCommish} />
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
              <div className="rounded-2xl border border-dashed border-text-2/20 p-6 text-sm text-text-2">
                No pools entered from this browser yet. When you submit picks they'll show up here.
              </div>
            ) : (
              <div className="space-y-3">
                {entered.map(p => (
                  <PoolCard key={`${p.slug}-${p.teamName}`} pool={p} kind="entered" onForget={handleForgetEntered} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Help footer */}
      <div className="text-xs text-text-2/60 font-mono uppercase tracking-wider text-center pt-8 border-t border-text-2/10">
        Pools are remembered in this browser. Clearing site data will forget them — keep your share / admin links if you switch browsers.
      </div>
    </div>
  )
}
