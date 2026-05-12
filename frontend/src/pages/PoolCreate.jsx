import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function PoolCreate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [field, setField] = useState([])
  const [form, setForm] = useState({
    tournamentId: '', name: '',
    tiers: [{ tierNumber: 1, label: '', picksRequired: 1, playerIds: [] }],
  })
  const [created, setCreated] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    api.request('/tournaments/upcoming-with-fields')
      .then(d => setTournaments(d.tournaments || []))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!form.tournamentId) { setField([]); return }
    const t = tournaments.find(x => x.id === form.tournamentId)
    setField(t?.field || [])
  }, [form.tournamentId, tournaments])

  const updateTier = (idx, patch) =>
    setForm(f => ({ ...f, tiers: f.tiers.map((t, i) => i === idx ? { ...t, ...patch } : t) }))

  const addTier = () =>
    setForm(f => ({ ...f, tiers: [...f.tiers, { tierNumber: f.tiers.length + 1, label: '', picksRequired: 1, playerIds: [] }] }))

  const removeTier = (idx) =>
    setForm(f => ({ ...f, tiers: f.tiers.filter((_, i) => i !== idx).map((t, i) => ({ ...t, tierNumber: i + 1 })) }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const result = await api.createPool(form)
      setCreated(result)
    } catch (err) {
      setError(err.message || 'Failed to create pool')
    } finally {
      setSubmitting(false)
    }
  }

  // Gate: must be signed in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-text-2/15 bg-surface p-8 sm:p-12 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-2 mb-3">Members only</div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-text-primary mb-3">
            Sign in to <span className="font-editorial italic font-normal">create a pool</span>
          </h1>
          <p className="text-text-2 max-w-md mx-auto mb-7">
            Pools live on your Clutch account so you can manage them from any device.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/login?redirect=${encodeURIComponent('/pools/new')}`}
              className="inline-flex items-center justify-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold rounded-xl px-5 py-3 transition-all hover:-translate-y-0.5"
            >
              Sign in
            </Link>
            <Link
              to={`/signup?redirect=${encodeURIComponent('/pools/new')}`}
              className="inline-flex items-center justify-center gap-2 bg-bg border border-text-2/20 hover:border-blaze/40 text-text-primary font-display font-bold rounded-xl px-5 py-3 transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (created) {
    const base = window.location.origin
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-display font-bold text-text-primary">Pool created.</h1>
        <div className="rounded-xl border bg-surface p-4 space-y-3">
          <div>
            <div className="text-xs text-text-2 uppercase tracking-wide font-mono mb-1">Share link</div>
            <a className="text-blaze break-all" href={`/pools/${created.slug}`}>{base}/pools/{created.slug}</a>
          </div>
          <div>
            <div className="text-xs text-text-2 uppercase tracking-wide font-mono mb-1">Admin link (keep private)</div>
            <a className="text-crown break-all" href={`/pools/${created.slug}/admin?token=${created.adminToken}`}>{base}/pools/{created.slug}/admin?token={created.adminToken}</a>
          </div>
          <p className="text-sm text-text-2 pt-2">
            Both links were sent to {user.email}. Open the admin link and hit Publish when you're ready to accept entries.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-display font-bold text-text-primary">New pool</h1>
      {error && <div className="rounded-md bg-live-red/10 text-live-red p-3">{error}</div>}

      <label className="block">
        <span className="text-xs font-mono uppercase tracking-wide text-text-2">Tournament</span>
        <select className="mt-1 w-full border rounded-md px-3 py-2 bg-surface text-text-primary"
          value={form.tournamentId}
          onChange={e => setForm({ ...form, tournamentId: e.target.value })}
          required>
          <option value="">Select tournament…</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.startDate?.slice(0, 10)})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-mono uppercase tracking-wide text-text-2">Pool name</span>
        <input className="mt-1 w-full border rounded-md px-3 py-2 bg-surface text-text-primary"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required />
      </label>

      <p className="text-xs font-mono uppercase tracking-wide text-text-2">
        Admin link will be sent to <span className="text-text-primary">{user.email}</span>
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-text-primary">Tiers</h2>
          <button type="button" onClick={addTier} className="text-sm bg-blaze text-white rounded-md px-3 py-1.5">
            + Add tier
          </button>
        </div>
        {form.tiers.map((tier, idx) => (
          <div key={idx} className="rounded-xl border p-4 space-y-3 bg-surface">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-lg text-text-primary">Tier {tier.tierNumber}</span>
              <input className="flex-1 min-w-32 border rounded-md px-3 py-1 text-text-primary"
                placeholder="Label (optional, e.g. 'Stars')"
                value={tier.label}
                onChange={e => updateTier(idx, { label: e.target.value })} />
              <label className="text-sm text-text-2">
                Picks required:
                <input type="number" min="1" max="10"
                  className="ml-2 w-16 border rounded-md px-2 py-1 text-text-primary"
                  value={tier.picksRequired}
                  onChange={e => updateTier(idx, { picksRequired: parseInt(e.target.value) || 1 })} />
              </label>
              {form.tiers.length > 1 && (
                <button type="button" onClick={() => removeTier(idx)} className="text-live-red text-sm">Remove</button>
              )}
            </div>
            <select multiple className="w-full border rounded-md p-2 h-40 bg-bg font-mono text-sm text-text-primary"
              value={tier.playerIds}
              onChange={e => updateTier(idx, { playerIds: Array.from(e.target.selectedOptions).map(o => o.value) })}>
              {field.map(p => (
                <option key={p.id} value={p.id}>
                  {p.countryFlag || ''} {p.name} {p.owgrRank ? `#${p.owgrRank}` : ''}
                </option>
              ))}
            </select>
            <div className="text-xs text-text-2 font-mono">{tier.playerIds.length} player(s) selected</div>
          </div>
        ))}
      </div>

      <button type="submit" disabled={submitting}
        className="w-full bg-blaze text-white font-display font-bold rounded-md py-3 disabled:opacity-50">
        {submitting ? 'Creating…' : 'Create pool'}
      </button>
    </form>
  )
}
