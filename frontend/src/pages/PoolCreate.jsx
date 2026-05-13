import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import TierBuilder, { buildDefaultTiers } from '../components/pool/TierBuilder'

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

  // When tournament changes: load field, rebuild tiers, prefill name if blank.
  // Switching tournament always resets tiers (their playerIds reference a different field).
  useEffect(() => {
    if (!form.tournamentId) { setField([]); return }
    const t = tournaments.find(x => x.id === form.tournamentId)
    const f = t?.field || []
    setField(f)
    setForm(prev => {
      const next = { ...prev }
      if (!prev.name && t?.name) next.name = `${t.name} Pool`
      const defaults = buildDefaultTiers(f)
      if (defaults) next.tiers = defaults
      return next
    })
  }, [form.tournamentId, tournaments])

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
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-2">Step 3 · Tiers</span>

        {!form.tournamentId ? (
          <div className="rounded-2xl border border-dashed border-text-2/25 bg-[var(--surface)] p-6 sm:p-8 text-center">
            <p className="text-text-2 text-sm">
              Pick a tournament above and we'll auto-build tiers from the field.
            </p>
          </div>
        ) : (
          <TierBuilder
            field={field}
            tiers={form.tiers}
            onChange={(tiers) => setForm(f => ({ ...f, tiers }))}
          />
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
