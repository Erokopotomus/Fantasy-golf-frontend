import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

/**
 * Pool context strip shown above tournament content when ?pool=<slug> is on the URL.
 * Pre-lock: team name + picks + countdown.
 * Post-lock: team name + live points + rank in pool + top-3 mini standings.
 */
export default function PoolContextBanner({ poolSlug }) {
  const { user } = useAuth()
  const [pool, setPool] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)

  useEffect(() => {
    if (!poolSlug) return
    let cancelled = false
    ;(async () => {
      try {
        const [p, lb] = await Promise.all([
          api.getPool(poolSlug),
          api.getPoolLeaderboard(poolSlug).catch(() => null),
        ])
        if (cancelled) return
        setPool(p.pool)
        if (lb) setLeaderboard(lb)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [poolSlug])

  if (!poolSlug || !pool) return null

  const status = pool.status
  const isPreLock = status === 'OPEN' || status === 'DRAFT'
  const isLive = status === 'LOCKED'
  const isDone = status === 'COMPLETED'

  const myEntry = leaderboard?.leaderboard?.find(e => user && e.userId === user.id)
  const myRank = myEntry
    ? leaderboard.leaderboard.findIndex(e => e.id === myEntry.id) + 1
    : null
  const totalEntries = leaderboard?.leaderboard?.length ?? 0

  const countdown = pool.locksAt ? formatCountdown(pool.locksAt) : null

  return (
    <div className="rounded-2xl border-l-4 border-blaze border-y border-r border-y-blaze/20 border-r-blaze/20 bg-[var(--surface)] shadow-sm p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blaze/15 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blaze" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2">Your pool</div>
            <div className="font-display font-bold text-text-primary truncate">{pool.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
          {myEntry && (
            <>
              <Stat
                label={isPreLock ? 'Your team' : 'Pool rank'}
                value={isPreLock ? myEntry.teamName : (myRank ? `${myRank} / ${totalEntries}` : '—')}
              />
              {(isLive || isDone) && (
                <Stat
                  label="Your pts"
                  value={myEntry.totalFantasyPoints != null ? myEntry.totalFantasyPoints.toFixed(1) : '—'}
                  emphasized
                />
              )}
            </>
          )}

          {!myEntry && isPreLock && (
            <Link
              to={`/pools/${poolSlug}`}
              className="inline-flex items-center gap-1.5 bg-blaze text-white font-display font-bold text-sm rounded-lg px-3.5 py-2 hover:bg-blaze/90 transition-colors"
            >
              Enter the pool →
            </Link>
          )}

          {isPreLock && countdown && (
            <Stat label="Locks in" value={countdown} />
          )}
        </div>
      </div>

      {/* Picks preview (pre-lock only — once live, the main leaderboard shows them) */}
      {myEntry && isPreLock && myEntry.picks && myEntry.picks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blaze/15 flex items-center flex-wrap gap-x-3 gap-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-2 mr-1">Picks</span>
          {myEntry.picks.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs">
              {p.player?.countryFlag && <span aria-hidden="true">{p.player.countryFlag}</span>}
              <span className="font-medium text-text-primary">{lastName(p.player?.name)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Mini top-3 (live or done) */}
      {(isLive || isDone) && leaderboard?.leaderboard?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blaze/15">
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-2 mb-1.5">Pool top 3</div>
          <ol className="space-y-1">
            {leaderboard.leaderboard.slice(0, 3).map((e, i) => {
              const isYou = myEntry && e.id === myEntry.id
              return (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-text-2 w-4">{i + 1}.</span>
                    <span className={`truncate ${isYou ? 'font-bold text-blaze' : 'text-text-primary'}`}>
                      {e.teamName}{isYou && ' (you)'}
                    </span>
                  </span>
                  <span className="font-mono font-bold text-text-primary shrink-0 ml-3">
                    {e.totalFantasyPoints != null ? e.totalFantasyPoints.toFixed(1) : '—'}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, emphasized = false }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-text-2">{label}</div>
      <div className={`font-mono font-bold ${emphasized ? 'text-blaze text-xl' : 'text-text-primary text-sm'}`}>
        {value}
      </div>
    </div>
  )
}

function formatCountdown(target) {
  const ms = new Date(target).getTime() - Date.now()
  if (isNaN(ms) || ms <= 0) return null
  const totalMins = Math.floor(ms / 60000)
  const days = Math.floor(totalMins / 1440)
  const hours = Math.floor((totalMins % 1440) / 60)
  const mins = totalMins % 60
  if (days >= 1) return `${days}d ${hours}h`
  if (hours >= 1) return `${hours}h ${mins}m`
  return `${mins}m`
}

function lastName(name) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1]
}
