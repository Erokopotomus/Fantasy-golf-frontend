import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

export default function ChopZoneWidget({ leagueId, week, leagueFormat }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (leagueFormat !== 'CHOPPED' || !week) return
    let cancelled = false
    async function load() {
      try {
        const res = await api.getChoppedSafePercents(leagueId, { week, mode: 'live' })
        if (!cancelled) setData(res)
      } catch (e) {
        console.error('[chopped widget]', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(id) }
  }, [leagueId, week, leagueFormat])

  if (leagueFormat !== 'CHOPPED') return null
  if (loading) return <div className="rounded-lg bg-[var(--surface)] border border-[var(--card-border)] p-4 animate-pulse h-32" />
  if (!data?.results?.length) return null

  const safest = data.results.slice(0, 3)
  const block = data.results.slice(-3).reverse()

  return (
    <div className="rounded-lg bg-[var(--surface)] border border-[var(--card-border)] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg text-text-primary">Chop Zone — Week {week}</h3>
        <Link to={`/leagues/${leagueId}/chop`} className="text-blaze text-sm font-mono">Open →</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted mb-1">Safest</div>
          {safest.map(t => (
            <div key={t.teamId} className="flex justify-between font-mono text-text-secondary">
              <span className="truncate pr-2">{t.teamName || t.teamId.slice(0, 8)}</span>
              <span className="text-field">{(t.safePct * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted mb-1">On The Block</div>
          {block.map(t => (
            <div key={t.teamId} className="flex justify-between font-mono text-text-secondary">
              <span className="truncate pr-2">{t.teamName || t.teamId.slice(0, 8)}</span>
              <span className="text-live-red">{(t.safePct * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
