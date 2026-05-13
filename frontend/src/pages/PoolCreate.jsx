import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

// Build a 6-tier default mirroring the original Buckeye PGA Championship
// pool (the structure the commissioner described as "looks great"):
//   T1–T5: 10 players each, sorted by OWGR
//   T6:    the rest of the field (long tail)
// Each tier requires 1 pick (6 picks total per entry).
// Unranked players sort to the back so they land in T6.
function buildDefaultTiers(field) {
  if (!field || field.length === 0) return null

  const sorted = [...field].sort((a, b) => {
    const ra = a.owgrRank ?? 9999
    const rb = b.owgrRank ?? 9999
    return ra - rb
  })

  const tiers = []
  for (let i = 0; i < 5; i++) {
    const slice = sorted.slice(i * 10, (i + 1) * 10)
    tiers.push({
      tierNumber: i + 1,
      label: '',
      picksRequired: 1,
      playerIds: slice.map(p => p.playerId),
    })
  }
  tiers.push({
    tierNumber: 6,
    label: '',
    picksRequired: 1,
    playerIds: sorted.slice(50).map(p => p.playerId),
  })

  return tiers
}

export default function PoolCreate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [field, setField] = useState([])
  const [form, setForm] = useState({
    tournamentId: '', name: '',
    tiers: [{ tierNumber: 1, label: '', picksRequired: 1, playerIds: [] }],
  })
  const [mode, setMode] = useState('auto') // 'auto' | 'custom'
  const [created, setCreated] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    api.request('/tournaments/upcoming-with-fields')
      .then(d => setTournaments(d.tournaments || []))
      .catch(() => {})
  }, [user])

  // When tournament changes: load field, rebuild tiers, prefill name if blank.
  // Switching tournament always resets tiers (their playerIds reference a different field).
  useEffect(() => {
    if (!form.tournamentId) { setField([]); return }
    const t = tournaments.find(x => x.id === form.tournamentId)
    const f = t?.field || []
    setField(f)
    setMode('auto')
    setForm(prev => {
      const next = { ...prev }
      if (!prev.name && t?.name) next.name = `${t.name} Pool`
      const defaults = buildDefaultTiers(f)
      if (defaults) next.tiers = defaults
      return next
    })
  }, [form.tournamentId, tournaments])

  const fieldById = useMemo(() => {
    const m = new Map()
    for (const p of field) m.set(p.playerId, p)
    return m
  }, [field])

  const updateTier = (idx, patch) =>
    setForm(f => ({ ...f, tiers: f.tiers.map((t, i) => i === idx ? { ...t, ...patch } : t) }))

  const addTier = () =>
    setForm(f => ({ ...f, tiers: [...f.tiers, { tierNumber: f.tiers.length + 1, label: '', picksRequired: 1, playerIds: [] }] }))

  const removeTier = (idx) =>
    setForm(f => ({ ...f, tiers: f.tiers.filter((_, i) => i !== idx).map((t, i) => ({ ...t, tierNumber: i + 1 })) }))

  const resetToDefaults = () => {
    const defaults = buildDefaultTiers(field)
    if (defaults) setForm(f => ({ ...f, tiers: defaults }))
    setMode('auto')
  }

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
        <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] p-8 sm:p-12 text-center">
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-field mb-2">You're the commissioner</div>
          <h1 className="text-4xl font-display font-extrabold text-text-primary tracking-tight">Pool created.</h1>
        </div>

        {/* Publish-first callout — most common point of confusion */}
        <div className="rounded-2xl bg-blaze/10 border border-blaze/30 p-4 sm:p-5 flex gap-3 sm:gap-4">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-blaze flex items-center justify-center text-white font-display font-bold">
            1
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-text-primary text-base sm:text-lg leading-tight">
              Publish before you (or anyone) can make picks.
            </div>
            <p className="text-sm text-text-2 mt-1 leading-relaxed">
              Pools start as a draft so you can preview them. Hit <strong className="text-text-primary">Publish</strong> on the admin page to open entries — your share link won't work until then.
            </p>
          </div>
        </div>

        {/* Primary CTA */}
        <Link
          to={`/pools/${created.slug}/admin`}
          className="w-full inline-flex items-center justify-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold rounded-2xl py-4 text-lg shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          Take me to the admin page →
        </Link>

        {/* Secondary links */}
        <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] p-4 sm:p-5 space-y-3">
          <div>
            <div className="text-[11px] text-text-2 uppercase tracking-wider font-mono mb-1">Share link (sent to entrants)</div>
            <Link className="text-blaze break-all text-sm" to={`/pools/${created.slug}`}>{base}/pools/{created.slug}</Link>
          </div>
          <div>
            <div className="text-[11px] text-text-2 uppercase tracking-wider font-mono mb-1">Admin link (only you)</div>
            <Link className="text-crown break-all text-sm" to={`/pools/${created.slug}/admin`}>{base}/pools/{created.slug}/admin</Link>
          </div>
          <p className="text-xs text-text-2 font-editorial italic pt-2 border-t border-text-2/10">
            Both links were also emailed to your account: <span className="not-italic font-mono text-text-primary">{user.email}</span>
          </p>
        </div>
      </div>
    )
  }

  const selectedTournament = tournaments.find(t => t.id === form.tournamentId)
  const totalPicks = form.tiers.reduce((sum, t) => sum + (t.picksRequired || 0), 0)
  const totalPlayers = form.tiers.reduce((sum, t) => sum + t.playerIds.length, 0)

  return (
    <form onSubmit={submit} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Hero */}
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-blaze mb-2">Start a pool</div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-text-primary tracking-tight leading-none">
          New pool
        </h1>
        <p className="font-editorial italic text-base sm:text-lg text-text-2 mt-3 max-w-xl">
          Pick a tournament — we'll auto-build the tiers and you can share the link in 30 seconds.
        </p>
      </header>

      {error && <div className="rounded-xl bg-live-red/10 border border-live-red/30 text-live-red p-4 font-mono text-sm">{error}</div>}

      {/* Step 1 — Tournament */}
      <section className="space-y-2">
        <label htmlFor="tournament-select" className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-2">
          Step 1 · Tournament
        </label>
        <select
          id="tournament-select"
          className="w-full border border-text-2/20 rounded-xl px-4 py-3 bg-[var(--surface)] text-text-primary font-display font-semibold text-base focus:outline-none focus:border-blaze focus:ring-2 focus:ring-blaze/20 transition-colors"
          value={form.tournamentId}
          onChange={e => setForm({ ...form, tournamentId: e.target.value })}
          required
        >
          <option value="">Select tournament…</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.startDate?.slice(0, 10)})
            </option>
          ))}
        </select>
        {selectedTournament && (
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-2 pt-1">
            {field.length} players in field · starts {selectedTournament.startDate?.slice(0, 10)}
          </p>
        )}
      </section>

      {/* Step 2 — Pool name */}
      <section className="space-y-2">
        <label htmlFor="pool-name" className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-2">
          Step 2 · Pool name
        </label>
        <input
          id="pool-name"
          className="w-full border border-text-2/20 rounded-xl px-4 py-3 bg-[var(--surface)] text-text-primary font-display font-semibold text-base focus:outline-none focus:border-blaze focus:ring-2 focus:ring-blaze/20 transition-colors"
          placeholder="e.g. Sunday Pickem"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        <p className="font-mono text-[11px] uppercase tracking-wider text-text-2 pt-1">
          Admin link will be sent to <span className="text-text-primary normal-case font-normal">{user.email}</span>
        </p>
      </section>

      {/* Step 3 — Tiers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-2">Step 3 · Tiers</span>
          {form.tournamentId && (
            mode === 'auto' ? (
              <button
                type="button"
                onClick={() => setMode('custom')}
                className="text-sm font-display font-semibold text-blaze hover:text-blaze/80 transition-colors"
              >
                Customize tiers →
              </button>
            ) : (
              <button
                type="button"
                onClick={resetToDefaults}
                className="text-sm font-display font-semibold text-text-2 hover:text-blaze transition-colors"
              >
                ← Reset to defaults
              </button>
            )
          )}
        </div>

        {!form.tournamentId ? (
          <div className="rounded-2xl border border-dashed border-text-2/25 bg-[var(--surface)] p-6 sm:p-8 text-center">
            <p className="text-text-2 text-sm">
              Pick a tournament above and we'll auto-build 3 tiers from the field.
            </p>
          </div>
        ) : mode === 'auto' ? (
          // Auto preview — clean summary, no scrolling
          <div className="rounded-2xl border border-text-2/15 bg-[var(--surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-text-2/10 flex items-baseline justify-between gap-3">
              <div>
                <div className="font-display font-bold text-text-primary text-lg">
                  {form.tiers.length} tiers · {totalPicks} picks per entry
                </div>
                <div className="font-editorial italic text-sm text-text-2 mt-0.5">
                  Tiers 1–5 are the top 50 by world ranking. Tier 6 is the rest of the field. Tap +/− to bump picks per tier.
                </div>
              </div>
            </div>
            <div className="divide-y divide-text-2/10">
              {form.tiers.map((tier, idx) => {
                const players = tier.playerIds.map(id => fieldById.get(id)).filter(Boolean)
                const preview = players.slice(0, 3).map(p => p.playerName).join(' · ')
                const maxPicks = Math.min(3, tier.playerIds.length)
                const bump = (delta) => {
                  const next = Math.max(1, Math.min(maxPicks, tier.picksRequired + delta))
                  if (next !== tier.picksRequired) updateTier(idx, { picksRequired: next })
                }
                return (
                  <div key={tier.tierNumber} className="px-5 py-3.5 flex items-center gap-4">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blaze/10 text-blaze font-mono text-sm font-bold shrink-0">
                      T{tier.tierNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-bold text-text-primary">
                        {tier.label || `Tier ${tier.tierNumber}`}
                      </div>
                      <div className="font-mono text-[11px] uppercase tracking-wider text-text-2 mt-0.5 truncate">
                        {tier.playerIds.length} players
                        {preview && <span className="normal-case tracking-normal text-text-2/70"> · {preview}{players.length > 3 ? '…' : ''}</span>}
                      </div>
                    </div>
                    {/* Picks-per-tier stepper (1-3) */}
                    <div className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-text-2/20 bg-bg px-1 py-1">
                      <button
                        type="button"
                        onClick={() => bump(-1)}
                        disabled={tier.picksRequired <= 1}
                        aria-label={`Decrease picks for tier ${tier.tierNumber}`}
                        className="w-7 h-7 rounded-md flex items-center justify-center font-mono text-lg font-bold text-text-2 hover:bg-blaze/10 hover:text-blaze disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-2 transition-colors"
                      >
                        −
                      </button>
                      <div className="text-center min-w-[3.5rem] leading-tight">
                        <div className="font-mono font-bold text-text-primary text-base">{tier.picksRequired}</div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-text-2">pick{tier.picksRequired !== 1 ? 's' : ''}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => bump(1)}
                        disabled={tier.picksRequired >= maxPicks}
                        aria-label={`Increase picks for tier ${tier.tierNumber}`}
                        className="w-7 h-7 rounded-md flex items-center justify-center font-mono text-lg font-bold text-text-2 hover:bg-blaze/10 hover:text-blaze disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-2 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          // Custom editor — full control
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={addTier}
                className="inline-flex items-center gap-1.5 text-sm bg-blaze hover:bg-blaze/90 text-white font-display font-semibold rounded-lg px-3 py-1.5 transition-colors"
              >
                + Add tier
              </button>
            </div>
            {form.tiers.map((tier, idx) => (
              <div key={idx} className="rounded-2xl border border-text-2/15 p-4 space-y-3 bg-[var(--surface)]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-lg font-bold text-text-primary">Tier {tier.tierNumber}</span>
                  <input
                    className="flex-1 min-w-32 border border-text-2/20 rounded-lg px-3 py-1.5 text-text-primary bg-bg"
                    placeholder="Label (e.g. 'Stars')"
                    value={tier.label}
                    onChange={e => updateTier(idx, { label: e.target.value })}
                  />
                  <label className="text-sm text-text-2 flex items-center gap-2">
                    Picks:
                    <input
                      type="number" min="1" max="10"
                      className="w-16 border border-text-2/20 rounded-lg px-2 py-1.5 text-text-primary bg-bg font-mono font-bold"
                      value={tier.picksRequired}
                      onChange={e => updateTier(idx, { picksRequired: parseInt(e.target.value) || 1 })}
                    />
                  </label>
                  {form.tiers.length > 1 && (
                    <button type="button" onClick={() => removeTier(idx)} className="text-live-red text-sm hover:underline">Remove</button>
                  )}
                </div>
                <select
                  multiple
                  className="w-full border border-text-2/20 rounded-lg p-2 h-40 bg-bg font-mono text-sm text-text-primary"
                  value={tier.playerIds}
                  onChange={e => updateTier(idx, { playerIds: Array.from(e.target.selectedOptions).map(o => o.value) })}
                >
                  {field.map(p => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.countryFlag || ''} {p.playerName} {p.owgrRank ? `#${p.owgrRank}` : ''}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-text-2 font-mono">
                  {tier.playerIds.length} player(s) selected · ⌘/Ctrl-click to multi-select
                </div>
              </div>
            ))}
          </div>
        )}

        {form.tournamentId && totalPlayers === 0 && (
          <div className="rounded-xl bg-blaze/5 border border-blaze/20 px-4 py-3 text-sm text-text-primary">
            Add at least one player to a tier before creating the pool.
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={submitting || !form.tournamentId || !form.name || totalPlayers === 0}
        className="w-full bg-blaze hover:bg-blaze/90 disabled:bg-text-2/20 disabled:text-text-2 text-white font-display font-bold rounded-2xl py-4 text-lg shadow-sm transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-not-allowed"
      >
        {submitting ? 'Creating…' : 'Create pool →'}
      </button>
    </form>
  )
}
