import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../services/api'

export default function PoolAdmin() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = async () => {
    try {
      const r = await api.getPoolAdmin(slug, token)
      setData(r.pool)
    } catch (e) {
      setError(e.message || 'Failed to load')
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [slug, token])

  const publish = async () => {
    await api.publishPool(slug, token)
    refresh()
  }
  const lock = async () => {
    if (!confirm('Lock the pool now? No more entries.')) return
    await api.lockPool(slug, token)
    refresh()
  }
  const dq = async (entryId) => {
    if (!confirm('DQ this entry?')) return
    await api.deletePoolEntry(slug, token, entryId)
    refresh()
  }

  if (loading) return <div className="p-6 text-text-2">Loading…</div>
  if (error) return <div className="p-6 text-live-red">{error}</div>
  if (!data) return null

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary">
            {data.name} <span className="text-base font-mono text-text-2">[admin]</span>
          </h1>
          <p className="text-text-2 font-mono">
            {data.tournament.name} · status: {data.status}
          </p>
        </div>
        <div className="flex gap-2">
          {data.status === 'DRAFT' && (
            <button onClick={publish}
              className="bg-field text-white px-3 py-2 rounded-md font-display font-bold">
              Publish
            </button>
          )}
          {data.status === 'OPEN' && (
            <button onClick={lock}
              className="bg-live-red text-white px-3 py-2 rounded-md font-display font-bold">
              Lock now
            </button>
          )}
        </div>
      </header>

      <div className="rounded-xl border bg-surface p-4">
        <h2 className="font-display font-bold mb-2 text-text-primary">Tiers</h2>
        <ul className="text-sm space-y-1">
          {data.tiers.map(t => (
            <li key={t.id} className="text-text-primary">
              <span className="font-mono">T{t.tierNumber}</span> {t.label || ''} — {t.players.length} players, pick {t.picksRequired}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-surface p-4">
        <h2 className="font-display font-bold mb-3 text-text-primary">Entries ({data.entries.length})</h2>
        {data.entries.length === 0 ? (
          <p className="text-text-2 text-sm">No entries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="font-mono text-text-2 text-xs uppercase">
              <tr>
                <th className="text-left p-2">Team</th>
                <th className="text-left p-2">Entrant</th>
                <th className="text-right p-2">Pts</th>
                <th className="text-right p-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map(e => (
                <tr key={e.id} className="border-t">
                  <td className="p-2 font-medium text-text-primary">{e.teamName}</td>
                  <td className="p-2 text-text-2">{e.entrantName} · {e.entrantEmail}</td>
                  <td className="p-2 text-right font-mono text-text-primary">{e.totalFantasyPoints.toFixed(1)}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => dq(e.id)} className="text-live-red text-xs">DQ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
