import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import { rememberEnteredPool } from '../utils/poolStorage'

export default function PoolView() {
  const { slug } = useParams()
  const [pool, setPool] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(null)
  const [entry, setEntry] = useState({ entrantName: '', entrantEmail: '', teamName: '', tiebreakerScore: 0, picks: {} })
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const p = await api.getPool(slug)
        setPool(p.pool)
        if (p.pool.status !== 'OPEN' && p.pool.status !== 'DRAFT') {
          const lb = await api.getPoolLeaderboard(slug)
          setLeaderboard(lb)
        }
      } finally { setLoading(false) }
    })()
  }, [slug])

  // Auto-refresh leaderboard every 60s when LOCKED/COMPLETED
  useEffect(() => {
    if (!pool || (pool.status !== 'LOCKED' && pool.status !== 'COMPLETED')) return
    const i = setInterval(() => api.getPoolLeaderboard(slug).then(setLeaderboard).catch(() => {}), 60000)
    return () => clearInterval(i)
  }, [pool, slug])

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
        entrantName: entry.entrantName,
        entrantEmail: entry.entrantEmail,
        teamName: entry.teamName,
        tiebreakerScore: parseInt(entry.tiebreakerScore),
        picks,
      })
      rememberEnteredPool({
        slug,
        teamName: entry.teamName,
        poolName: pool.name,
        tournamentName: pool.tournament?.name || '',
      })
      setSubmitted(result.entry)
    } catch (err) {
      setSubmitError(err.message || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="p-6 text-text-2">Loading…</div>
  if (!pool) return <div className="p-6 text-text-2">Pool not found.</div>

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-display font-bold text-text-primary">You're in.</h1>
        <p className="text-text-2">Team <b>{submitted.teamName}</b> submitted. Confirmation email sent to {submitted.entrantEmail}.</p>
        <a href={`/pools/${slug}`} className="inline-block text-blaze">View leaderboard →</a>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-text-primary">{pool.name}</h1>
        <p className="text-text-2 font-mono">{pool.tournament.name} · {pool.tournament.location || ''}</p>
        {pool.status === 'OPEN' && pool.locksAt && (
          <p className="text-sm text-text-2">Locks {new Date(pool.locksAt).toLocaleString()}</p>
        )}
      </header>

      {pool.status === 'DRAFT' && (
        <div className="rounded-xl border bg-surface p-6 text-center">
          <p className="text-text-2">This pool hasn't opened yet. Check back when the commissioner publishes.</p>
        </div>
      )}

      {pool.status === 'OPEN' && (
        <form onSubmit={submit} className="space-y-6">
          {submitError && <div className="rounded-md bg-live-red/10 text-live-red p-3">{submitError}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pool.tiers.map(tier => {
              const picked = entry.picks[tier.id] || []
              return (
                <div key={tier.id} className="rounded-xl border bg-surface p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-text-primary">
                      Tier {tier.tierNumber}{tier.label ? ` — ${tier.label}` : ''}
                    </h3>
                    <span className="font-mono text-sm text-text-2">{picked.length} / {tier.picksRequired}</span>
                  </div>
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {tier.players.map(tp => {
                      const isPicked = picked.includes(tp.player.id)
                      return (
                        <button type="button" key={tp.player.id}
                          onClick={() => togglePick(tier.id, tp.player.id, tier.picksRequired)}
                          className={`w-full text-left rounded-md px-2 py-1.5 flex items-center gap-2 text-sm ${isPicked ? 'bg-blaze/15 ring-1 ring-blaze' : 'hover:bg-bg'}`}>
                          <span>{tp.player.countryFlag || ''}</span>
                          <span className="flex-1 text-text-primary">{tp.player.name}</span>
                          {tp.player.owgrRank && <span className="font-mono text-xs text-text-2">#{tp.player.owgrRank}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border bg-surface p-4 space-y-3">
            <h3 className="font-display font-bold text-text-primary">Your entry</h3>
            <input className="w-full border rounded-md px-3 py-2 bg-bg text-text-primary"
              placeholder="Team name (2-30 chars)"
              value={entry.teamName}
              onChange={e => setEntry({ ...entry, teamName: e.target.value })}
              required />
            <input className="w-full border rounded-md px-3 py-2 bg-bg text-text-primary"
              placeholder="Your name"
              value={entry.entrantName}
              onChange={e => setEntry({ ...entry, entrantName: e.target.value })}
              required />
            <input type="email" className="w-full border rounded-md px-3 py-2 bg-bg text-text-primary"
              placeholder="Email"
              value={entry.entrantEmail}
              onChange={e => setEntry({ ...entry, entrantEmail: e.target.value })}
              required />
            <label className="block">
              <span className="text-sm text-text-2">Tiebreaker: predict the winner's final score relative to par (e.g. -12)</span>
              <input type="number" className="mt-1 w-full border rounded-md px-3 py-2 bg-bg text-text-primary"
                value={entry.tiebreakerScore}
                onChange={e => setEntry({ ...entry, tiebreakerScore: e.target.value })}
                required />
            </label>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-blaze text-white font-display font-bold rounded-md py-3 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Lock in my picks'}
          </button>
        </form>
      )}

      {(pool.status === 'LOCKED' || pool.status === 'COMPLETED') && leaderboard && (
        <div className="rounded-xl border bg-surface p-4">
          <h2 className="font-display font-bold mb-3 text-text-primary">Leaderboard</h2>
          <table className="w-full text-sm">
            <thead className="font-mono text-text-2 text-xs uppercase">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Team</th>
                <th className="text-right p-2">Points</th>
                <th className="text-right p-2">TB Δ</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.leaderboard.map((e, i) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2 font-mono text-text-primary">{i + 1}</td>
                  <td className="p-2">
                    <div className="font-medium text-text-primary">{e.teamName}</div>
                    <div className="text-xs text-text-2">{e.picks.map(p => p.player.name).join(', ')}</div>
                  </td>
                  <td className="p-2 text-right font-mono text-text-primary">{e.totalFantasyPoints.toFixed(1)}</td>
                  <td className="p-2 text-right font-mono text-text-2">{e.tiebreakerDiff != null ? e.tiebreakerDiff : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
