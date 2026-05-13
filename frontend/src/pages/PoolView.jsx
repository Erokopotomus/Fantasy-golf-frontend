import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import PlayerDrawer from '../components/players/PlayerDrawer'
import PoolEntryDrawer from '../components/pool/PoolEntryDrawer'
import WeatherStrip from '../components/tournament/WeatherStrip'
import TournamentPreview from '../components/tournament/TournamentPreview'
import TournamentHeader from '../components/tournament/TournamentHeader'
import { flattenEntry } from '../hooks/useTournamentScoring'

// --- Helper components ----------------------------------------------------

const STATUS_STYLES = {
  DRAFT:     'bg-text-2/15 text-text-2',
  OPEN:      'bg-field/15 text-field',
  LOCKED:    'bg-live-red/15 text-live-red',
  COMPLETED: 'bg-crown/15 text-crown',
}

const STATUS_LABEL = {
  DRAFT:     'Draft',
  OPEN:      'Accepting entries',
  LOCKED:    'Live',
  COMPLETED: 'Final',
}

function StatusPill({ status }) {
  const s = status || 'DRAFT'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider backdrop-blur ${STATUS_STYLES[s] || STATUS_STYLES.DRAFT}`}>
      {s === 'LOCKED' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live-red opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-live-red"></span>
        </span>
      )}
      {STATUS_LABEL[s] || s}
    </span>
  )
}

function formatCountdown(target) {
  const ms = new Date(target).getTime() - Date.now()
  if (isNaN(ms)) return null
  if (ms <= 0) return 'LOCKED'
  const totalMins = Math.floor(ms / 60000)
  const days = Math.floor(totalMins / 1440)
  const hours = Math.floor((totalMins % 1440) / 60)
  const mins = totalMins % 60
  if (days >= 1) return `${days}d ${hours}h`
  if (hours >= 1) return `${hours}h ${mins}m`
  return `${mins}m`
}

function CountdownPill({ date }) {
  const [label, setLabel] = useState(() => formatCountdown(date))
  useEffect(() => {
    if (!date) return
    const tick = () => setLabel(formatCountdown(date))
    tick()
    const i = setInterval(tick, 30000)
    return () => clearInterval(i)
  }, [date])
  if (!label) return null
  const locked = label === 'LOCKED'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider backdrop-blur ${locked ? 'bg-live-red/15 text-live-red' : 'bg-white/10 text-white'}`}>
      {!locked && <span className="opacity-70">Locks in</span>}
      <span className="font-bold">{label}</span>
    </span>
  )
}

function RankBadge({ rank }) {
  const base = 'inline-flex items-center justify-center w-9 h-9 rounded-full font-mono font-bold text-sm'
  if (rank === 1) return <span className={`${base} bg-blaze text-white`}>{rank}</span>
  if (rank === 2 || rank === 3) return <span className={`${base} bg-crown text-white`}>{rank}</span>
  return <span className={`${base} bg-text-2/10 text-text-primary`}>{rank}</span>
}

function PlayerAvatar({ player, size = 40 }) {
  const dim = { width: size, height: size }
  if (player?.headshotUrl) {
    return (
      <img
        src={player.headshotUrl}
        alt=""
        style={dim}
        className="rounded-full object-cover bg-text-2/10 shrink-0"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  const initials = (player?.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span
      style={dim}
      className="rounded-full bg-text-2/10 shrink-0 flex items-center justify-center text-base"
      aria-hidden="true"
    >
      {player?.countryFlag || <span className="font-mono text-xs text-text-2">{initials}</span>}
    </span>
  )
}

function lastName(fullName) {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

// --- Main component -------------------------------------------------------

export default function PoolView() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [pool, setPool] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(null)
  const [entry, setEntry] = useState({ teamName: '', tiebreakerScore: 0, picks: {} })
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [drawerPlayerId, setDrawerPlayerId] = useState(null)
  const [drawerEntryId, setDrawerEntryId] = useState(null)
  const [tournamentLeaderboard, setTournamentLeaderboard] = useState(null)
  const [weather, setWeather] = useState(null)
  const [activeTab, setActiveTab] = useState('live') // 'live' | 'teams'
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const p = await api.getPool(slug)
        setPool(p.pool)
        // Always fetch leaderboard if not DRAFT so we can detect "already entered" state for logged-in users
        if (p.pool.status !== 'DRAFT') {
          const lb = await api.getPoolLeaderboard(slug)
          setLeaderboard(lb)
        }
        // Always fetch the tournament leaderboard + weather so Live Scoring tab has data regardless of pool status
        if (p.pool.status !== 'DRAFT' && p.pool.tournamentId) {
          const [tlb, w] = await Promise.all([
            api.getTournamentLeaderboard(p.pool.tournamentId).catch(() => null),
            api.getTournamentWeather(p.pool.tournamentId).catch(() => null),
          ])
          if (tlb) {
            const raw = tlb.leaderboard || tlb
            // Flatten nested player.* → top-level so TournamentPreview / our row renderers can read p.name etc.
            setTournamentLeaderboard(Array.isArray(raw) ? raw.map(flattenEntry) : raw)
          }
          if (w) setWeather(w.weather || w)
        }
      } finally { setLoading(false) }
    })()
  }, [slug])

  // Auto-refresh pool + tournament leaderboards every 60s for any active pool
  useEffect(() => {
    if (!pool || pool.status === 'DRAFT') return
    const i = setInterval(() => {
      api.getPoolLeaderboard(slug).then(setLeaderboard).catch(() => {})
      if (pool.tournamentId) {
        api.getTournamentLeaderboard(pool.tournamentId)
          .then(tlb => {
            const raw = tlb.leaderboard || tlb
            setTournamentLeaderboard(Array.isArray(raw) ? raw.map(flattenEntry) : raw)
          })
          .catch(() => {})
      }
    }, 60000)
    return () => clearInterval(i)
  }, [pool, slug])

  // Build playerId → live performance map (totalToPar, today, thru, position, status)
  // (tournamentLeaderboard is the flattened shape from flattenEntry — fields are top-level.)
  const liveByPlayer = useMemo(() => {
    const m = new Map()
    if (!tournamentLeaderboard) return m
    for (const row of tournamentLeaderboard) {
      const pid = row.id
      if (!pid) continue
      m.set(pid, {
        position: row.position,
        totalToPar: row.score,
        today: row.today,
        thru: row.thru,
        status: row.status,
      })
    }
    return m
  }, [tournamentLeaderboard])

  const togglePick = (tierId, playerId, picksRequired) => {
    setEntry(e => {
      const current = e.picks[tierId] || []
      const has = current.includes(playerId)
      let next
      if (has) next = current.filter(id => id !== playerId)
      else if (current.length < picksRequired) next = [...current, playerId]
      else next = [...current.slice(1), playerId] // bump oldest if at max
      return { ...e, picks: { ...e.picks, [tierId]: next } }
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setSubmitError(null)
    try {
      const picks = []
      for (const tier of pool.tiers) {
        for (const pid of (entry.picks[tier.id] || [])) picks.push({ tierId: tier.id, playerId: pid })
      }
      const result = await api.submitPoolEntry(slug, {
        teamName: entry.teamName,
        tiebreakerScore: parseInt(entry.tiebreakerScore),
        picks,
      })
      if (result.updated) {
        // Edit path — refresh leaderboard so myExistingEntry reflects new picks, drop back to live view
        const lb = await api.getPoolLeaderboard(slug).catch(() => null)
        if (lb) setLeaderboard(lb)
        setEditMode(false)
      } else {
        setSubmitted(result.entry)
      }
    } catch (err) {
      setSubmitError(err.message || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  // Prefill the entry form from the user's existing picks and switch to edit mode
  const startEdit = () => {
    if (!myExistingEntry) return
    const picksByTier = {}
    for (const p of (myExistingEntry.picks || [])) {
      const tid = p.tierId
      if (!picksByTier[tid]) picksByTier[tid] = []
      picksByTier[tid].push(p.playerId)
    }
    setEntry({
      teamName: myExistingEntry.teamName || '',
      tiebreakerScore: myExistingEntry.tiebreakerScore ?? 0,
      picks: picksByTier,
    })
    setSubmitError(null)
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setSubmitError(null)
  }

  // Validation hints for the submit button
  const validation = useMemo(() => {
    if (!pool || pool.status !== 'OPEN') return { ok: true, hints: [] }
    const hints = []
    for (const tier of pool.tiers) {
      const picked = (entry.picks[tier.id] || []).length
      if (picked < tier.picksRequired) {
        const remaining = tier.picksRequired - picked
        hints.push(`Pick ${remaining} more from Tier ${tier.tierNumber}`)
      }
    }
    if (!entry.teamName?.trim()) hints.push('Add a team name')
    if (entry.tiebreakerScore === '' || entry.tiebreakerScore == null) hints.push('Set your tiebreaker')
    return { ok: hints.length === 0, hints }
  }, [pool, entry])

  // Identify "your team" rows on the leaderboard for highlighting (matched by current user's id)
  const yourEntryIds = useMemo(() => {
    if (!leaderboard?.leaderboard || !user) return new Set()
    return new Set(
      leaderboard.leaderboard.filter(e => e.userId === user.id).map(e => e.id)
    )
  }, [leaderboard, user])

  // Detect existing entry so we don't show the picker again after they've already locked in
  const myExistingEntry = useMemo(() => {
    if (!leaderboard?.leaderboard || !user) return null
    return leaderboard.leaderboard.find(e => e.userId === user.id) || null
  }, [leaderboard, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-text-2 font-mono text-sm uppercase tracking-wider animate-pulse">Loading pool…</div>
      </div>
    )
  }
  if (!pool) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="text-center">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-2 mb-2">404</div>
          <h1 className="font-display font-bold text-2xl text-text-primary mb-2">Pool not found</h1>
          <p className="text-text-2 mb-6">The link may be wrong or the pool was deleted.</p>
          <Link to="/pools" className="inline-flex items-center gap-2 text-blaze font-medium">
            Back to pools →
          </Link>
        </div>
      </div>
    )
  }

  // --- Submitted success screen -------------------------------------------
  if (submitted) {
    return (
      <div className="min-h-screen bg-bg">
        <Hero pool={pool} tournamentLeaderboard={tournamentLeaderboard} />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="rounded-2xl border border-field/30 bg-[var(--surface)] p-6 sm:p-8 text-center">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-field mb-3">You're in</div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-primary leading-tight">
              {submitted.teamName}
            </h2>
            <p className="font-editorial italic text-text-2 mt-3">
              Confirmation sent to <span className="text-text-primary not-italic">{submitted.entrantEmail}</span>
            </p>

            {submitted.picks && submitted.picks.length > 0 && (
              <div className="mt-6 pt-6 border-t border-text-2/10">
                <div className="font-mono text-[11px] uppercase tracking-wider text-text-2 mb-3">Your picks</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {submitted.picks.map((pick, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-sm">
                      <span>{pick.player?.countryFlag || ''}</span>
                      <span className="text-text-primary font-medium">{pick.player?.name || pick.playerName}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <a
                href={`/tournaments/${pool.tournamentId}?pool=${slug}`}
                className="inline-flex items-center justify-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold rounded-xl px-5 py-3 transition-all hover:-translate-y-0.5"
              >
                Watch the tournament →
              </a>
              <button
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(`${window.location.origin}/pools/${slug}`)
                  } catch {}
                }}
                className="inline-flex items-center justify-center gap-2 bg-bg border border-text-2/20 hover:border-blaze/40 text-text-primary font-display font-bold rounded-xl px-5 py-3 transition-colors"
              >
                Copy share link
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Main render --------------------------------------------------------
  return (
    <div className="min-h-screen bg-bg">
      <Hero pool={pool} tournamentLeaderboard={tournamentLeaderboard} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* DRAFT */}
        {pool.status === 'DRAFT' && (
          <div className="rounded-2xl border-2 border-dashed border-text-2/20 bg-[var(--surface)] p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-2 mb-3">Coming soon</div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-text-primary mb-2">
              This pool isn't open yet.
            </h2>
            <p className="text-text-2 max-w-md mx-auto">
              The commissioner is still setting it up. Check back when they publish — your share link will work the moment it goes live.
            </p>
          </div>
        )}

        {/* OPEN — gate to logged-in users */}
        {pool.status === 'OPEN' && !user && (
          <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-2 mb-3">Members only</div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-text-primary mb-3">
              Sign in to <span className="font-editorial italic font-normal">enter</span>
            </h2>
            <p className="text-text-2 max-w-md mx-auto mb-7">
              Pools require a free Clutch account so we can save your picks to you, not just this browser.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={`/login?redirect=${encodeURIComponent(`/pools/${slug}`)}`}
                className="inline-flex items-center justify-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold rounded-xl px-5 py-3 transition-all hover:-translate-y-0.5"
              >
                Sign in
              </Link>
              <Link
                to={`/signup?redirect=${encodeURIComponent(`/pools/${slug}`)}`}
                className="inline-flex items-center justify-center gap-2 bg-bg border border-text-2/20 hover:border-blaze/40 text-text-primary font-display font-bold rounded-xl px-5 py-3 transition-colors"
              >
                Create account
              </Link>
            </div>
          </div>
        )}

        {/* Live tracking experience — entered user, pool is active (OPEN/LOCKED/COMPLETED). Hide while editing. */}
        {user && myExistingEntry && !submitted && !editMode && (pool.status === 'OPEN' || pool.status === 'LOCKED' || pool.status === 'COMPLETED') && (
          <PoolLiveExperience
            pool={pool}
            slug={slug}
            myEntry={myExistingEntry}
            leaderboard={leaderboard}
            tournamentLeaderboard={tournamentLeaderboard}
            liveByPlayer={liveByPlayer}
            weather={weather}
            yourEntryIds={yourEntryIds}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenEntry={setDrawerEntryId}
            onOpenPlayer={setDrawerPlayerId}
            onEditPicks={pool.status === 'OPEN' ? startEdit : null}
          />
        )}

        {/* OPEN — Entry flow (signed-in: brand new entry OR editing an existing one) */}
        {pool.status === 'OPEN' && user && (!myExistingEntry || editMode) && (
          <form onSubmit={submit} className="space-y-6 sm:space-y-8">
            {editMode && (
              <div className="rounded-2xl border border-blaze/30 bg-blaze/[0.06] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-blaze mb-1">Editing your picks</div>
                  <div className="text-text-primary text-sm">
                    Changes will replace your current team. You can edit until the pool locks.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-text-2/25 bg-[var(--surface)] hover:border-blaze/40 text-text-primary font-display font-semibold text-sm px-4 py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {submitError && (
              <div className="rounded-xl bg-live-red/10 border border-live-red/30 text-live-red p-4 font-mono text-sm">
                {submitError}
              </div>
            )}

            {/* Tier columns */}
            <div className={`grid grid-cols-1 ${pool.tiers.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-4 sm:gap-5`}>
              {pool.tiers.map(tier => {
                const picked = entry.picks[tier.id] || []
                const satisfied = picked.length === tier.picksRequired
                return (
                  <div key={tier.id} className="rounded-2xl border border-text-2/15 bg-[var(--surface)] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between gap-2 p-4 border-b border-text-2/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blaze/10 text-blaze font-mono text-[11px] font-bold">
                          T{tier.tierNumber}
                        </span>
                        <h3 className="font-display font-bold text-text-primary truncate">
                          {tier.label || `Tier ${tier.tierNumber}`}
                        </h3>
                      </div>
                      <span className={`font-mono text-xs font-bold shrink-0 ${satisfied ? 'text-field' : 'text-text-2'}`}>
                        {picked.length} / {tier.picksRequired}
                      </span>
                    </div>

                    <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
                      {tier.players.map(tp => {
                        const isPicked = picked.includes(tp.player.id)
                        const togglePicks = (e) => { e.stopPropagation(); togglePick(tier.id, tp.player.id, tier.picksRequired) }
                        const openDrawer = () => setDrawerPlayerId(tp.player.id)
                        return (
                          <div
                            role="button"
                            tabIndex={0}
                            key={tp.player.id}
                            onClick={openDrawer}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer() } }}
                            aria-label={`View ${tp.player.name} stats`}
                            className={`group relative w-full text-left rounded-xl pl-3 pr-2 py-2 flex items-center gap-3 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blaze/40 ${
                              isPicked
                                ? 'bg-blaze/[0.08] ring-2 ring-blaze'
                                : 'hover:bg-bg ring-2 ring-transparent'
                            }`}
                          >
                            <PlayerAvatar player={tp.player} size={36} />
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-semibold text-text-primary text-sm truncate group-hover:text-blaze transition-colors">
                                {tp.player.name}
                              </div>
                              <div className="font-mono text-[10px] uppercase tracking-wider text-text-2 mt-0.5 flex items-center gap-1.5">
                                {tp.player.countryFlag && (
                                  <span className="text-sm leading-none" aria-hidden="true">{tp.player.countryFlag}</span>
                                )}
                                {tp.player.primaryTour && <span>{tp.player.primaryTour}</span>}
                                {tp.player.owgrRank && (
                                  <span className="text-text-2/70">· #{tp.player.owgrRank}</span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={togglePicks}
                              aria-label={isPicked ? `Remove ${tp.player.name} from your picks` : `Pick ${tp.player.name}`}
                              aria-pressed={isPicked}
                              className={`shrink-0 inline-flex items-center justify-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-blaze/60 ${
                                isPicked
                                  ? 'bg-blaze text-white hover:bg-blaze/90'
                                  : 'border border-text-2/30 text-text-2 hover:border-blaze hover:text-blaze'
                              }`}
                            >
                              {isPicked ? '✓ Picked' : '+ Pick'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Your entry */}
            <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] p-5 sm:p-6 space-y-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-2 mb-1">Step 2</div>
                <h3 className="font-display font-bold text-xl text-text-primary">Your entry</h3>
                <p className="font-editorial italic text-sm text-text-2 mt-2">
                  Entering as <span className="text-text-primary not-italic font-medium">{user.name}</span>
                  <span className="text-text-2/70"> ({user.email})</span>
                </p>
              </div>

              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-wider text-text-2">Team name</span>
                <input
                  className="mt-1 w-full rounded-xl border border-text-2/20 bg-bg px-3 py-2.5 text-text-primary font-display font-semibold focus:outline-none focus:border-blaze focus:ring-2 focus:ring-blaze/20 transition-colors"
                  placeholder="The Closers"
                  value={entry.teamName}
                  onChange={e => setEntry({ ...entry, teamName: e.target.value })}
                  minLength={2}
                  maxLength={30}
                  required
                />
              </label>

              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-wider text-text-2">Tiebreaker</span>
                <span className="block text-sm text-text-2 font-editorial italic mt-0.5">
                  Predict the winner's final score relative to par — e.g. −12
                </span>
                <input
                  type="number"
                  className="mt-1.5 w-full sm:w-40 rounded-xl border border-text-2/20 bg-bg px-3 py-2.5 text-text-primary font-mono font-bold text-lg focus:outline-none focus:border-blaze focus:ring-2 focus:ring-blaze/20 transition-colors"
                  value={entry.tiebreakerScore}
                  onChange={e => setEntry({ ...entry, tiebreakerScore: e.target.value })}
                  required
                />
              </label>
            </div>

            {/* Validation hints */}
            {!validation.ok && (
              <div className="rounded-xl bg-blaze/5 border border-blaze/20 px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-wider text-blaze font-bold mb-1">
                  Almost there
                </div>
                <ul className="text-sm text-text-primary space-y-0.5">
                  {validation.hints.slice(0, 4).map((h, i) => (
                    <li key={i} className="flex items-baseline gap-2">
                      <span className="text-blaze">·</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !validation.ok}
              className="w-full bg-blaze hover:bg-blaze/90 disabled:bg-text-2/20 disabled:text-text-2 text-white font-display font-bold rounded-2xl py-4 sm:py-5 text-lg shadow-sm transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-not-allowed"
            >
              {submitting
                ? (editMode ? 'Saving…' : 'Submitting…')
                : (editMode ? 'Save changes →' : 'Lock in my picks →')}
            </button>
          </form>
        )}

        {/* LOCKED / COMPLETED for users without an entry — show the standings only */}
        {(pool.status === 'LOCKED' || pool.status === 'COMPLETED') && leaderboard && (!user || !myExistingEntry) && (
          <PoolLiveExperience
            pool={pool}
            slug={slug}
            myEntry={null}
            leaderboard={leaderboard}
            tournamentLeaderboard={tournamentLeaderboard}
            liveByPlayer={liveByPlayer}
            weather={weather}
            yourEntryIds={yourEntryIds}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenEntry={setDrawerEntryId}
            onOpenPlayer={setDrawerPlayerId}
          />
        )}
      </div>

      <PlayerDrawer
        playerId={drawerPlayerId}
        isOpen={!!drawerPlayerId}
        onClose={() => setDrawerPlayerId(null)}
        tournamentContext={pool.tournament?.course ? {
          entry: { id: drawerPlayerId, clutchMetrics: null, courseHistory: null },
          course: pool.tournament.course,
          tournamentName: pool.tournament.name,
        } : undefined}
      />

      <PoolEntryDrawer
        entry={leaderboard?.leaderboard?.find(e => e.id === drawerEntryId) || null}
        rank={drawerEntryId ? (leaderboard?.leaderboard?.findIndex(e => e.id === drawerEntryId) ?? -1) + 1 : null}
        totalEntries={leaderboard?.leaderboard?.length || 0}
        liveByPlayer={liveByPlayer}
        isOpen={!!drawerEntryId}
        onClose={() => setDrawerEntryId(null)}
        onPlayerClick={(pid) => {
          if (!pid) return
          setDrawerEntryId(null)
          setDrawerPlayerId(pid)
        }}
        onEditPicks={
          pool?.status === 'OPEN' && myExistingEntry && drawerEntryId === myExistingEntry.id
            ? () => { setDrawerEntryId(null); startEdit(); }
            : null
        }
      />
    </div>
  )
}

// --- Hero ---------------------------------------------------------------

// Hero: a thin pool-branding strip ("← Pools / pool name / status / locks countdown")
// followed by the platform-standard TournamentHeader so we get the field-strength /
// forecast / what-wins-here widgets embedded in the dark banner for free.

function Hero({ pool, tournamentLeaderboard }) {
  return (
    <header>
      {/* Pool-branding strip */}
      <div className="bg-slate text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link to="/pools" className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors shrink-0">
              ← Pools
            </Link>
            <span className="text-white/30">/</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/80 truncate">
              {pool.name}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {pool.status === 'OPEN' && pool.locksAt && <CountdownPill date={pool.locksAt} />}
            <StatusPill status={pool.status} />
          </div>
        </div>
      </div>

      {/* Tournament header with embedded widgets (Field Strength / Forecast / What Wins Here) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <TournamentHeader tournament={pool.tournament} leaderboard={tournamentLeaderboard || []} />
      </div>
    </header>
  )
}

// --- Pool hero widget strip --------------------------------------------
// Mirrors the field-strength / forecast / what-wins-here cards from the
// tournament page hero, plus a preview link. Stacks horizontally below the
// pool hero so users get the data without leaving the page.

function PoolHeroWidgets({ tournament, leaderboard = [], weather = [] }) {
  if (!tournament) return null
  const courseDna = tournament.course?.dna || null

  // Field strength: count OWGR-tier players
  const total = leaderboard.length
  const top25 = leaderboard.filter(p => p.owgrRank && p.owgrRank <= 25).length
  const top50 = leaderboard.filter(p => p.owgrRank && p.owgrRank <= 50).length
  const top100 = leaderboard.filter(p => p.owgrRank && p.owgrRank <= 100).length

  const dnaCategories = courseDna ? [
    { label: 'Driving', value: courseDna.driving },
    { label: 'Approach', value: courseDna.approach },
    { label: 'Short Game', value: courseDna.shortGame },
    { label: 'Putting', value: courseDna.putting },
  ].filter(c => c.value != null) : []
  const dnaLabel = (val) => {
    if (val == null) return null
    if (val >= 0.32) return { text: 'Premium', color: 'text-crown' }
    if (val >= 0.27) return { text: 'High', color: 'text-field' }
    if (val >= 0.22) return { text: 'Average', color: 'text-text-2' }
    return { text: 'Low', color: 'text-text-2/70' }
  }
  const wmoIcon = (cond) => {
    const c = (cond || '').toLowerCase()
    if (c.includes('storm') || c.includes('thunder')) return '⛈'
    if (c.includes('rain') || c.includes('shower')) return '🌧'
    if (c.includes('cloud') || c.includes('overcast')) return '☁️'
    if (c.includes('clear') || c.includes('sunny')) return '☀️'
    if (c.includes('partly')) return '⛅'
    return '🌤'
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Field strength */}
      {total > 0 && (
        <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2 mb-2">Field strength</div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="font-mono font-bold text-2xl text-text-primary">{total}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-2">players</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden mb-2 bg-text-2/10">
            {top25 > 0 && <div className="bg-crown" style={{ width: `${(top25 / total) * 100}%` }} />}
            {top50 > top25 && <div className="bg-field" style={{ width: `${((top50 - top25) / total) * 100}%` }} />}
            {top100 > top50 && <div className="bg-text-2/40" style={{ width: `${((top100 - top50) / total) * 100}%` }} />}
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-crown mr-1.5 align-middle" /><span className="text-text-2">T25</span> <span className="font-bold text-text-primary">{top25}</span></span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-field mr-1.5 align-middle" /><span className="text-text-2">T50</span> <span className="font-bold text-text-primary">{top50}</span></span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-text-2/40 mr-1.5 align-middle" /><span className="text-text-2">T100</span> <span className="font-bold text-text-primary">{top100}</span></span>
          </div>
        </div>
      )}

      {/* Forecast */}
      {weather.length > 0 && (
        <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2 mb-2">Forecast</div>
          <div className="space-y-1.5">
            {weather.slice(0, 4).map(w => (
              <div key={w.round} className="flex items-center justify-between text-xs">
                <span className="font-mono text-text-2 w-7">R{w.round}</span>
                <span className="text-base leading-none">{wmoIcon(w.conditions)}</span>
                <span className="font-mono font-bold text-text-primary">
                  {w.temperature != null ? `${Math.round(w.temperature)}°` : '—'}
                </span>
                <span className="font-mono text-text-2">
                  {w.windSpeed != null ? `${Math.round(w.windSpeed)}mph` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What Wins Here */}
      {dnaCategories.length > 0 && (
        <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] p-4">
          <div className="flex items-baseline justify-between mb-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2">What wins here</div>
            {tournament.course?.id && (
              <Link to={`/courses/${tournament.course.id}`} className="font-mono text-[9px] uppercase tracking-wider text-blaze hover:text-blaze/80 font-bold">
                Profile →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {dnaCategories.map(cat => {
              const l = dnaLabel(cat.value)
              return (
                <div key={cat.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-text-2">{cat.label}</span>
                  {l && <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${l.color}`}>{l.text}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

// --- Live tracking experience ------------------------------------------
// Tabbed view for entered users (and viewers on LOCKED/COMPLETED pools).
// Tab 1: Live Scoring (tournament leaderboard). Tab 2: Teams (pool standings).

function PoolLiveExperience({
  pool, slug, myEntry, leaderboard, tournamentLeaderboard, liveByPlayer,
  weather, yourEntryIds, activeTab, setActiveTab, onOpenEntry, onOpenPlayer,
  onEditPicks,
}) {
  const [shareCopied, setShareCopied] = useState(false)
  const entries = leaderboard?.leaderboard || []
  const totalEntries = entries.length
  const myRank = myEntry
    ? (entries.findIndex(e => e.id === myEntry.id) + 1) || null
    : null

  // Only show the live leaderboard when the tournament has actually started.
  // (Pre-tournament, the backend returns thru=18 for everyone which is misleading.)
  const tournamentStatus = pool.tournament?.status
  const tournamentIsLive = tournamentStatus === 'IN_PROGRESS' || tournamentStatus === 'COMPLETED'
  const tournamentHasLiveData = tournamentIsLive && tournamentLeaderboard && tournamentLeaderboard.length > 0

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pools/${slug}`)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="space-y-5">
      {/* Pool context strip — compact, always visible */}
      <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {myEntry ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-blaze/15 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blaze" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2">Your team</div>
                <div className="font-display font-bold text-text-primary truncate">{myEntry.teamName}</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2">Pool</div>
              <div className="font-display font-bold text-text-primary truncate">{pool.name}</div>
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
            {pool.status === 'OPEN' && pool.locksAt && (
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-text-2">Locks in</div>
                <div className="font-mono font-bold text-text-primary">
                  {formatCountdown(pool.locksAt) || 'Locked'}
                </div>
              </div>
            )}
            {myEntry && (pool.status === 'LOCKED' || pool.status === 'COMPLETED') && (
              <>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-text-2">Pool rank</div>
                  <div className="font-mono font-bold text-text-primary">{myRank ?? '—'} / {totalEntries}</div>
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-text-2">Your pts</div>
                  <div className="font-mono font-bold text-blaze text-lg">
                    {myEntry.totalFantasyPoints != null ? myEntry.totalFantasyPoints.toFixed(1) : '—'}
                  </div>
                </div>
              </>
            )}
            {myEntry && onEditPicks && pool.status === 'OPEN' && (
              <button
                onClick={onEditPicks}
                className="font-display font-bold text-sm rounded-lg px-3 py-2 border border-text-2/25 bg-[var(--surface)] hover:border-blaze/40 hover:text-blaze text-text-primary transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit picks
              </button>
            )}
            <button
              onClick={copyShare}
              className={`font-display font-bold text-sm rounded-lg px-3 py-2 transition-colors ${
                shareCopied
                  ? 'bg-field text-white'
                  : 'bg-blaze text-white hover:bg-blaze/90'
              }`}
            >
              {shareCopied ? 'Copied ✓' : 'Share pool'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-text-2/15 flex items-center gap-1">
        <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')}>
          Live scoring
          {pool.status === 'LOCKED' && (
            <span className="ml-1.5 inline-flex items-center">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live-red opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-live-red"></span>
              </span>
            </span>
          )}
        </TabButton>
        <TabButton active={activeTab === 'teams'} onClick={() => setActiveTab('teams')}>
          Teams <span className="font-mono text-[11px] text-text-2 ml-1">({totalEntries})</span>
        </TabButton>
      </div>

      {/* Live Scoring tab */}
      {activeTab === 'live' && (
        <>
          {tournamentHasLiveData ? (
            // Tournament is live — main leaderboard + pool sidebar
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                <section className="rounded-2xl border border-text-2/15 bg-[var(--surface)] overflow-hidden">
                  <div className="px-5 py-3 border-b border-text-2/10 flex items-baseline justify-between">
                    <h3 className="font-display font-bold text-text-primary">Tournament leaderboard</h3>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-2">
                      {pool.status === 'LOCKED' && <span className="text-live-red">Live · </span>}
                      Top 20
                    </span>
                  </div>
                  <div className="divide-y divide-text-2/10">
                    {tournamentLeaderboard.slice(0, 20).map((row) => {
                      const pid = row.id
                      const isMyPick = myEntry?.picks?.some(p => p.player?.id === pid)
                      // flattenEntry returns score (= totalToPar) and position as "T1"/"1" string
                      const totalToPar = row.score
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => onOpenPlayer(pid)}
                          className={`w-full text-left px-5 py-2.5 flex items-center gap-3 hover:bg-bg transition-colors ${isMyPick ? 'bg-blaze/[0.04] border-l-2 border-blaze' : ''}`}
                        >
                          <span className="font-mono text-xs text-text-2 w-8 shrink-0">{row.position || '—'}</span>
                          <span className="text-sm leading-none" aria-hidden="true">{row.countryFlag || ''}</span>
                          <span className="flex-1 min-w-0 font-medium text-text-primary truncate flex items-center gap-2">
                            {row.name}
                            {isMyPick && <span className="font-mono text-[9px] uppercase tracking-wider text-blaze bg-blaze/10 px-1.5 py-0.5 rounded">yours</span>}
                          </span>
                          <span className={`font-mono font-bold text-sm shrink-0 ${
                            totalToPar == null ? 'text-text-2' :
                            totalToPar < 0 ? 'text-field' :
                            totalToPar > 0 ? 'text-live-red' : 'text-text-primary'
                          }`}>
                            {totalToPar == null ? '—' : totalToPar === 0 ? 'E' : totalToPar > 0 ? `+${totalToPar}` : `${totalToPar}`}
                          </span>
                          <span className="font-mono text-[10px] text-text-2/70 shrink-0 w-12 text-right">
                            {row.status === 'CUT' || row.thru === 'CUT' ? 'CUT' : row.thru === 'F' || row.thru === 18 ? 'F' : row.thru ? `Thru ${row.thru}` : '—'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                <PoolStandingsCard
                  entries={entries}
                  yourEntryIds={yourEntryIds}
                  onOpenEntry={onOpenEntry}
                  onSwitchToTeams={() => setActiveTab('teams')}
                />
                {weather && weather.length > 0 && (
                  <WeatherStrip weather={weather} tournamentStart={pool.tournament?.startDate} />
                )}
              </aside>
            </div>
          ) : (
            // Pre-tournament — Pool standings now slots into TournamentPreview's right rail (next to Quick Insights).
            // Hero widgets already live inside TournamentHeader at the top of the page.
            tournamentLeaderboard && tournamentLeaderboard.length > 0 ? (
              <TournamentPreview
                tournament={pool.tournament}
                leaderboard={tournamentLeaderboard}
                weather={weather || []}
                myPlayerIds={myEntry?.picks?.map(p => p.player?.id).filter(Boolean) || []}
                sidebarSlot={
                  <PoolStandingsCard
                    entries={entries}
                    yourEntryIds={yourEntryIds}
                    onOpenEntry={onOpenEntry}
                    onSwitchToTeams={() => setActiveTab('teams')}
                  />
                }
              />
            ) : (
              <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] p-12 text-center text-text-2">
                Field syncing…
              </div>
            )
          )}
        </>
      )}

      {/* Teams tab */}
      {activeTab === 'teams' && (
        <div className="space-y-2.5">
          {pool.status === 'COMPLETED' && leaderboard?.actualWinningScore != null && (
            <div className="rounded-xl border border-crown/30 bg-crown/5 px-4 py-2.5 text-sm text-text-primary font-mono">
              <span className="text-crown font-bold">Final · </span>
              Winner finished {leaderboard.actualWinningScore > 0 ? '+' : ''}{leaderboard.actualWinningScore}
            </div>
          )}

          {entries.map((e, i) => {
            const isYou = yourEntryIds.has(e.id)
            const rank = i + 1
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpenEntry(e.id)}
                className={`block w-full text-left rounded-2xl border bg-[var(--surface)] p-4 sm:p-5 transition-all hover:shadow-md hover:-translate-y-px ${
                  isYou
                    ? 'border-blaze/40 border-l-4 border-l-blaze'
                    : 'border-text-2/15 hover:border-text-2/30'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <RankBadge rank={rank} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-lg text-text-primary truncate">{e.teamName}</h3>
                      {isYou && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blaze/15 text-blaze font-mono text-[10px] uppercase tracking-wider font-bold">you</span>
                      )}
                    </div>
                    <div className="font-editorial italic text-sm text-text-2 truncate">{e.entrantName}</div>
                    {e.picks && e.picks.length > 0 && (
                      <div className="mt-2 flex items-center flex-wrap gap-x-2 gap-y-1">
                        {e.picks.map((p, pi) => (
                          <span key={pi} className="inline-flex items-center gap-1 text-xs text-text-2">
                            {p.player?.countryFlag && <span aria-hidden="true">{p.player.countryFlag}</span>}
                            <span className="font-medium text-text-primary">{lastName(p.player?.name)}</span>
                            {pi < e.picks.length - 1 && <span className="text-text-2/40 ml-1">·</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-2xl sm:text-3xl text-text-primary leading-none">
                      {e.totalFantasyPoints != null ? e.totalFantasyPoints.toFixed(1) : '—'}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-text-2 mt-1">PTS</div>
                  </div>
                </div>
              </button>
            )
          })}

          {entries.length === 0 && (
            <div className="rounded-2xl border border-dashed border-text-2/20 p-8 text-center text-text-2">
              No entries yet — share the link to get rolling.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PoolStandingsCard({ entries, yourEntryIds, onOpenEntry, onSwitchToTeams, layout = 'vertical' }) {
  if (!entries || entries.length === 0) return null

  if (layout === 'horizontal') {
    // Horizontal top-of-page strip: top 5 entries side-by-side.
    return (
      <section className="rounded-2xl border border-text-2/15 bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-text-2/10 flex items-baseline justify-between">
          <h3 className="font-display font-bold text-text-primary text-sm">Pool standings</h3>
          <button
            type="button"
            onClick={onSwitchToTeams}
            className="font-mono text-[10px] uppercase tracking-wider text-blaze hover:text-blaze/80 font-bold"
          >
            All teams →
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-text-2/10">
          {entries.slice(0, 5).map((e, i) => {
            const isYou = yourEntryIds.has(e.id)
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpenEntry(e.id)}
                className={`text-left px-4 py-3 hover:bg-bg transition-colors ${isYou ? 'bg-blaze/[0.04]' : ''} relative`}
              >
                {isYou && <span className="absolute left-0 top-0 bottom-0 w-1 bg-blaze" />}
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-mono text-xs text-text-2">{i + 1}</span>
                  {isYou && <span className="font-mono text-[9px] uppercase tracking-wider text-blaze">you</span>}
                </div>
                <div className="text-sm font-display font-bold text-text-primary truncate">{e.teamName}</div>
                <div className="font-mono font-bold text-text-primary text-lg mt-1">
                  {e.totalFantasyPoints != null ? e.totalFantasyPoints.toFixed(1) : '—'}
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-2 ml-1">pts</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  // Default vertical (sidebar) layout.
  return (
    <section className="rounded-2xl border border-text-2/15 bg-[var(--surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-text-2/10 flex items-baseline justify-between">
        <h3 className="font-display font-bold text-text-primary text-sm">Pool standings</h3>
        <button
          type="button"
          onClick={onSwitchToTeams}
          className="font-mono text-[10px] uppercase tracking-wider text-blaze hover:text-blaze/80 font-bold"
        >
          All teams →
        </button>
      </div>
      <div className="divide-y divide-text-2/10">
        {entries.slice(0, 5).map((e, i) => {
          const isYou = yourEntryIds.has(e.id)
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpenEntry(e.id)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-bg transition-colors ${isYou ? 'bg-blaze/[0.04] border-l-2 border-blaze' : ''}`}
            >
              <span className="font-mono text-xs text-text-2 w-5 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-display font-bold text-text-primary truncate flex items-center gap-1.5">
                  {e.teamName}
                  {isYou && <span className="font-mono text-[9px] uppercase tracking-wider text-blaze">you</span>}
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-text-primary shrink-0">
                {e.totalFantasyPoints != null ? e.totalFantasyPoints.toFixed(1) : '—'}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative font-display font-bold text-sm px-4 py-3 transition-colors flex items-center ${
        active
          ? 'text-text-primary border-b-2 border-blaze -mb-px'
          : 'text-text-2 hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}
