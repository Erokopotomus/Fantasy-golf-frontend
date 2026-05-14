import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import TierBuilder from '../components/pool/TierBuilder'
import ScoringRulesCard from '../components/pool/ScoringRulesCard'

const STATUS_STYLES = {
  DRAFT:     'bg-text-2/15 text-text-2',
  OPEN:      'bg-field/15 text-field',
  LOCKED:    'bg-blaze/15 text-blaze',
  COMPLETED: 'bg-crown/15 text-crown',
}
const STATUS_LABEL = {
  DRAFT: 'Draft',
  OPEN: 'Accepting entries',
  LOCKED: 'Locked',
  COMPLETED: 'Final',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${STATUS_STYLES[status] || ''}`}>
      {status === 'LOCKED' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blaze opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blaze"></span>
        </span>
      )}
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-text-2/25 bg-[var(--surface)] shadow-sm p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2 mb-1">{label}</div>
      <div className="font-mono font-bold text-2xl text-text-primary">{value}</div>
    </div>
  )
}

export default function PoolAdmin() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Legacy back-compat: old admin URLs may still carry ?token=. New URLs don't.
  const token = params.get('token')
  const { user } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)

  const [dqTarget, setDqTarget] = useState(null) // entry pending DQ confirmation
  const [dqing, setDqing] = useState(false)

  const [editingTiers, setEditingTiers] = useState(false)
  const [draftTiers, setDraftTiers] = useState(null) // staging state while editing
  const [tierField, setTierField] = useState([])
  const [savingTiers, setSavingTiers] = useState(false)
  const [tierError, setTierError] = useState(null)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState(null)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Scoring rules editor
  const [editingScoring, setEditingScoring] = useState(false)
  const [scoringDraft, setScoringDraft] = useState({ cutScoreToPar: 2, countPicks: null })
  const [savingScoring, setSavingScoring] = useState(false)
  const [scoringError, setScoringError] = useState(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://clutchfantasysports.com'
  const shareUrl = `${baseUrl}/pools/${slug}`

  const refresh = async () => {
    try {
      const r = await api.getPoolAdmin(slug, token)
      setData(r.pool)
    } catch (e) {
      setError(e.message || 'Failed to load')
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [slug, token])

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore — older browsers without clipboard API
    }
  }

  const publish = async () => {
    await api.publishPool(slug, token)
    refresh()
  }
  const lock = async () => {
    if (!confirm('Lock the pool now? No more entries can be submitted.')) return
    await api.lockPool(slug, token)
    refresh()
  }
  const confirmDq = async () => {
    if (!dqTarget) return
    setDqing(true)
    try {
      await api.deletePoolEntry(slug, token, dqTarget.id)
      setDqTarget(null)
      refresh()
    } catch (e) {
      alert(e.message || 'DQ failed')
    } finally {
      setDqing(false)
    }
  }

  // ─── Pool name editing ──────────────────────────────────────────────────
  const startEditName = () => {
    setNameDraft(data?.name || '')
    setNameError(null)
    setEditingName(true)
  }
  const cancelEditName = () => {
    setEditingName(false)
    setNameError(null)
  }
  const saveName = async () => {
    const trimmed = nameDraft.trim()
    if (trimmed.length < 2 || trimmed.length > 60) {
      setNameError('Name must be 2–60 characters')
      return
    }
    if (trimmed === data.name) {
      setEditingName(false)
      return
    }
    setSavingName(true); setNameError(null)
    try {
      await api.updatePoolName(slug, token, trimmed)
      setEditingName(false)
      refresh()
    } catch (e) {
      setNameError(e.message || 'Failed to update name')
    } finally {
      setSavingName(false)
    }
  }

  // ─── Scoring rules editing (tournament UPCOMING only) ──────────────────
  const startEditScoring = () => {
    setScoringDraft({
      cutScoreToPar: data?.cutScoreToPar ?? 2,
      countPicks: data?.countPicks ?? null,
    })
    setScoringError(null)
    setEditingScoring(true)
  }
  const cancelEditScoring = () => {
    setEditingScoring(false)
    setScoringError(null)
  }
  const saveScoring = async () => {
    setSavingScoring(true); setScoringError(null)
    try {
      await api.updatePoolScoring(slug, token, {
        cutScoreToPar: scoringDraft.cutScoreToPar,
        countPicks: scoringDraft.countPicks,
      })
      setEditingScoring(false)
      refresh()
    } catch (e) {
      setScoringError(e.message || 'Failed to save scoring rules')
    } finally {
      setSavingScoring(false)
    }
  }

  // ─── Pool deletion ──────────────────────────────────────────────────────
  const confirmDelete = async () => {
    setDeleting(true); setDeleteError(null)
    try {
      await api.deletePool(slug, token)
      navigate('/pools', { replace: true })
    } catch (e) {
      setDeleteError(e.message || 'Failed to delete pool')
      setDeleting(false)
    }
  }

  // ─── Tier editing (DRAFT only) ──────────────────────────────────────────
  const startEditTiers = async () => {
    if (!data || data.status !== 'DRAFT') return
    setTierError(null)
    // Seed the editor with current tier state (in TierBuilder's expected shape)
    const seeded = data.tiers.map(t => ({
      tierNumber: t.tierNumber,
      label: t.label || '',
      picksRequired: t.picksRequired,
      playerIds: t.players.map(p => p.player?.id || p.playerId).filter(Boolean),
    }))
    setDraftTiers(seeded)

    // Fetch the full tournament field so the customize editor has the whole roster
    try {
      const fields = await api.request('/tournaments/upcoming-with-fields')
      const t = (fields.tournaments || []).find(x => x.id === data.tournamentId)
      setTierField(t?.field || [])
    } catch {
      // Fall back to whatever's currently in tiers if we can't load the wider field
      const flat = []
      for (const tier of data.tiers) {
        for (const p of tier.players) {
          if (p.player) {
            flat.push({
              playerId: p.player.id,
              playerName: p.player.name,
              owgrRank: p.player.owgrRank,
              countryFlag: p.player.countryFlag,
            })
          }
        }
      }
      setTierField(flat)
    }
    setEditingTiers(true)
  }

  const cancelEditTiers = () => {
    setEditingTiers(false)
    setDraftTiers(null)
    setTierError(null)
  }

  const saveTiers = async () => {
    if (!draftTiers) return
    setSavingTiers(true); setTierError(null)
    try {
      // Strip empty playerIds tiers? No — let the server reject if invalid.
      const payload = draftTiers.map(t => ({
        tierNumber: t.tierNumber,
        label: t.label || '',
        picksRequired: t.picksRequired,
        playerIds: t.playerIds,
      }))
      await api.updatePoolTiers(slug, token, payload)
      setEditingTiers(false)
      setDraftTiers(null)
      refresh()
    } catch (e) {
      setTierError(e.message || 'Failed to save tiers')
    } finally {
      setSavingTiers(false)
    }
  }

  const sendInvites = async (e) => {
    e.preventDefault()
    setInviteSending(true)
    setInviteResult(null)
    try {
      const emails = inviteEmails
        .split(/[\n,]/)
        .map(s => s.trim())
        .filter(Boolean)
      const r = await api.sendPoolInvites(slug, token, emails)
      setInviteResult(r)
      if (r.sent > 0) setInviteEmails('')
    } catch (err) {
      setInviteResult({ error: err.message || 'Send failed' })
    } finally {
      setInviteSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-text-2 font-mono text-sm uppercase tracking-wider animate-pulse">Loading admin…</div>
      </div>
    )
  }
  if (error) {
    // Not signed in → push to login (admin requires the commissioner's account)
    if (!user && !token) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-6">
          <div className="max-w-md w-full rounded-2xl border border-text-2/15 bg-[var(--surface)] shadow-sm p-8 text-center">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-2 mb-3">Admin only</div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-3">Sign in to manage this pool</h1>
            <p className="text-text-2 mb-6">Only the commissioner who created it can access this page.</p>
            <Link
              to={`/login?redirect=${encodeURIComponent(`/pools/${slug}/admin`)}`}
              className="inline-flex items-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold rounded-xl px-5 py-3 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      )
    }
    // Signed in but not the commissioner → 403 from server
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-2xl border border-text-2/15 bg-[var(--surface)] shadow-sm p-8 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-live-red mb-3">Not your pool</div>
          <h1 className="font-display font-bold text-2xl text-text-primary mb-3">Commissioner access required</h1>
          <p className="text-text-2 mb-6">{error}</p>
          <Link to="/pools" className="font-mono text-xs uppercase tracking-wider text-blaze hover:text-blaze/80 font-bold">
            ← Back to your pools
          </Link>
        </div>
      </div>
    )
  }
  if (!data) return null

  const totalPlayers = data.tiers.reduce((sum, t) => sum + t.players.length, 0)
  const locksAtFmt = data.locksAt ? new Date(data.locksAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

      {/* Hero */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  autoFocus
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveName() }
                    if (e.key === 'Escape') { e.preventDefault(); cancelEditName() }
                  }}
                  maxLength={60}
                  disabled={savingName}
                  className="flex-1 text-2xl sm:text-3xl font-display font-bold text-text-primary tracking-tight bg-[var(--surface)] border border-blaze/40 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blaze/40 disabled:opacity-50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveName}
                    disabled={savingName}
                    className="bg-blaze hover:bg-blaze/90 disabled:bg-text-2/20 text-white px-4 py-2 rounded-lg font-display font-bold text-sm transition-colors"
                  >
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditName}
                    disabled={savingName}
                    className="border border-text-2/25 text-text-primary px-4 py-2 rounded-lg font-display font-semibold text-sm hover:border-text-2/50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {nameError && <div className="text-sm text-live-red">{nameError}</div>}
            </div>
          ) : (
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-text-primary tracking-tight">
              {data.name}
              <button
                onClick={startEditName}
                aria-label="Edit pool name"
                className="ml-2 align-middle inline-flex items-center justify-center w-7 h-7 rounded-md text-text-2 hover:text-blaze hover:bg-blaze/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <span className="ml-3 align-middle text-xs font-mono uppercase tracking-wider text-text-2 px-2 py-0.5 rounded-md bg-[var(--surface)] border border-text-2/25">admin</span>
            </h1>
          )}
          <p className="font-mono text-xs uppercase tracking-wider text-text-2 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{data.tournament.name}</span>
            <span className="text-text-2/40">·</span>
            <StatusBadge status={data.status} />
            <span className="text-text-2/40">·</span>
            <span>Locks {locksAtFmt}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {data.status === 'DRAFT' && (
            <button onClick={publish}
              className="bg-field hover:bg-field/90 text-white px-4 py-2.5 rounded-lg font-display font-bold transition-colors">
              Publish
            </button>
          )}
          {data.status === 'OPEN' && (
            <button onClick={lock}
              className="bg-white border border-live-red/40 text-live-red hover:bg-live-red/5 px-4 py-2.5 rounded-lg font-display font-bold transition-colors">
              Lock now
            </button>
          )}
        </div>
      </header>

      {/* Share link card */}
      <section className="rounded-2xl border border-text-2/25 bg-[var(--surface)] shadow-sm p-5 space-y-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2">Share link</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 rounded-lg border border-text-2/25 bg-bg px-3 py-2.5 font-mono text-sm text-text-primary truncate">
            {shareUrl}
          </div>
          <button onClick={copyShare}
            className={`px-4 py-2.5 rounded-lg font-display font-bold transition-all ${copied ? 'bg-field text-white' : 'bg-blaze text-white hover:bg-blaze/90'}`}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Link to={`/pools/${slug}`}
            className="flex-1 text-center bg-[var(--surface)] border border-text-2/25 hover:border-blaze/50 text-text-primary font-display font-bold px-4 py-2.5 rounded-lg transition-colors">
            View public page →
          </Link>
          <Link to={`/pools/${slug}`}
            className="flex-1 text-center bg-slate hover:bg-slate-mid text-white font-display font-bold px-4 py-2.5 rounded-lg transition-colors">
            Enter your picks →
          </Link>
        </div>
      </section>

      {/* Invite by email */}
      <section className="rounded-2xl border border-text-2/25 bg-[var(--surface)] shadow-sm p-5 space-y-3">
        <div>
          <h2 className="font-display font-bold text-lg text-text-primary">Invite friends by email</h2>
          <p className="text-sm text-text-2 mt-1">Drop a list of emails — we'll send each one a link to enter your pool. They'll need a free Clutch account.</p>
        </div>
        <form onSubmit={sendInvites} className="space-y-3">
          <textarea
            value={inviteEmails}
            onChange={e => setInviteEmails(e.target.value)}
            placeholder="friend1@example.com, friend2@example.com&#10;friend3@example.com"
            rows={4}
            className="w-full rounded-lg border border-text-2/25 bg-bg px-3 py-2.5 font-mono text-sm text-text-primary"
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={inviteSending || !inviteEmails.trim()}
              className="bg-blaze hover:bg-blaze/90 text-white font-display font-bold px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors">
              {inviteSending ? 'Sending…' : 'Send invites'}
            </button>
            {inviteResult && !inviteResult.error && (
              <span className="text-sm text-field font-medium">Sent {inviteResult.sent} of {inviteResult.total}{inviteResult.failed ? ` (${inviteResult.failed} failed)` : ''}</span>
            )}
            {inviteResult?.error && <span className="text-sm text-live-red">{inviteResult.error}</span>}
          </div>
        </form>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Tiers" value={data.tiers.length} />
        <Stat label="Players" value={totalPlayers} />
        <Stat label="Entries" value={data.entries.length} />
        <Stat label="Scoring" value={data.scoringPreset || 'standard'} />
      </section>

      {/* Tiers */}
      <section className="rounded-2xl border border-text-2/25 bg-[var(--surface)] shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-lg text-text-primary">Tiers</h2>
          {data.status === 'DRAFT' && !editingTiers && (
            <button
              onClick={startEditTiers}
              className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-blaze hover:text-blaze/80 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit tiers →
            </button>
          )}
          {data.status !== 'DRAFT' && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-2/70">
              Frozen after publish
            </span>
          )}
        </div>

        {editingTiers ? (
          <div className="space-y-4">
            {tierError && (
              <div className="rounded-xl bg-live-red/10 border border-live-red/30 text-live-red p-3 text-sm">
                {tierError}
              </div>
            )}
            <TierBuilder
              field={tierField}
              tiers={draftTiers || []}
              onChange={setDraftTiers}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-text-2/10">
              <button
                onClick={cancelEditTiers}
                disabled={savingTiers}
                className="px-4 py-2.5 rounded-lg border border-text-2/25 bg-[var(--surface)] hover:border-blaze/40 text-text-primary font-display font-semibold text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTiers}
                disabled={savingTiers || !draftTiers || draftTiers.some(t => t.playerIds.length < t.picksRequired)}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-lg bg-blaze hover:bg-blaze/90 disabled:bg-text-2/20 disabled:text-text-2 text-white font-display font-bold text-sm transition-colors disabled:cursor-not-allowed"
              >
                {savingTiers ? 'Saving…' : 'Save tier changes'}
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {data.tiers.map(t => (
              <li key={t.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs bg-bg border border-text-2/20 px-2 py-0.5 rounded text-text-2">T{t.tierNumber}</span>
                {t.label && <span className="font-medium text-text-primary">{t.label}</span>}
                <span className="text-text-2">— {t.players.length} player{t.players.length === 1 ? '' : 's'}, pick {t.picksRequired}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Scoring rules */}
      <ScoringRulesCard
        pool={data}
        onEdit={startEditScoring}
        editable={data.tournament?.status === 'UPCOMING'}
      />

      {/* Scoring edit modal */}
      {editingScoring && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => !savingScoring && cancelEditScoring()} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-[var(--surface)] rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto">
              <div className="p-6 border-b border-text-2/15">
                <h3 className="font-display font-bold text-xl text-text-primary mb-4">Edit scoring rules</h3>

                <div className="space-y-4">
                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-text-2">Missed cut / WD penalty</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-text-2 font-mono text-sm">+</span>
                      <input
                        type="number"
                        min={-5}
                        max={20}
                        value={scoringDraft.cutScoreToPar}
                        onChange={(e) => setScoringDraft(s => ({ ...s, cutScoreToPar: parseInt(e.target.value) || 0 }))}
                        className="w-20 rounded-lg border border-text-2/25 bg-bg px-3 py-2 font-mono font-bold text-text-primary focus:outline-none focus:border-blaze focus:ring-2 focus:ring-blaze/20"
                      />
                      <span className="text-text-2 text-sm">over par per unplayed round</span>
                    </div>
                    <p className="text-xs text-text-2 mt-1.5">Default +2. Set to 0 for no penalty. Range: -5 to 20.</p>
                  </label>

                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-text-2">Picks that count</span>
                    <select
                      value={scoringDraft.countPicks ?? 'all'}
                      onChange={(e) => setScoringDraft(s => ({
                        ...s,
                        countPicks: e.target.value === 'all' ? null : parseInt(e.target.value),
                      }))}
                      className="mt-1 w-full rounded-lg border border-text-2/25 bg-bg px-3 py-2 text-text-primary focus:outline-none focus:border-blaze focus:ring-2 focus:ring-blaze/20"
                    >
                      <option value="all">All picks count</option>
                      {(() => {
                        const total = data.tiers.reduce((s, t) => s + t.picksRequired, 0)
                        return Array.from({ length: total - 1 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>Best {n} of {total}</option>
                        ))
                      })()}
                    </select>
                    <p className="text-xs text-text-2 mt-1.5">Drop your worst N picks — useful for handling blow-up scores.</p>
                  </label>
                </div>

                {scoringError && (
                  <div className="mt-4 rounded-lg bg-live-red/10 border border-live-red/30 text-live-red p-3 text-sm">
                    {scoringError}
                  </div>
                )}
              </div>
              <div className="p-4 flex gap-2 justify-end bg-bg/50 rounded-b-2xl">
                <button
                  onClick={cancelEditScoring}
                  disabled={savingScoring}
                  className="px-4 py-2 rounded-lg border border-text-2/25 text-text-primary font-display font-bold hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveScoring}
                  disabled={savingScoring}
                  className="px-4 py-2 rounded-lg bg-blaze text-white font-display font-bold hover:bg-blaze/90 transition-colors disabled:opacity-50"
                >
                  {savingScoring ? 'Saving…' : 'Save rules'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Entries */}
      <section className="rounded-2xl border border-text-2/25 bg-[var(--surface)] shadow-sm p-5">
        <h2 className="font-display font-bold text-lg text-text-primary mb-3">Entries ({data.entries.length})</h2>
        {data.entries.length === 0 ? (
          <p className="text-sm text-text-2">No entries yet. Share the link to get rolling.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="font-mono text-text-2 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left py-2 px-2">Team</th>
                  <th className="text-left py-2 px-2">Entrant</th>
                  <th className="text-right py-2 px-2">Pts</th>
                  <th className="text-right py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map(e => (
                  <tr key={e.id} className="border-t border-text-2/15">
                    <td className="py-2.5 px-2 font-medium text-text-primary">{e.teamName}</td>
                    <td className="py-2.5 px-2 text-text-2">
                      {e.entrantName}
                      <span className="block text-xs text-text-2/70 font-mono">{e.entrantEmail}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-text-primary">{e.totalFantasyPoints?.toFixed(1) ?? '—'}</td>
                    <td className="py-2.5 px-2 text-right">
                      <button onClick={() => setDqTarget(e)} className="text-live-red text-xs font-mono uppercase tracking-wide hover:underline">DQ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Danger zone — delete pool */}
      <section className="rounded-2xl border border-live-red/25 bg-live-red/[0.03] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-live-red mb-1">Danger zone</div>
            <h2 className="font-display font-bold text-lg text-text-primary">Delete this pool</h2>
            <p className="text-sm text-text-2 mt-1">
              Permanently removes the pool, its tiers, and every entry. {data.entries.length > 0 && (
                <span className="text-text-primary font-semibold">{data.entries.length} {data.entries.length === 1 ? 'entry' : 'entries'} will be erased.</span>
              )}
            </p>
          </div>
          <button
            onClick={() => { setDeleteError(null); setDeleteConfirm(true); }}
            className="shrink-0 px-4 py-2.5 rounded-lg border border-live-red/50 text-live-red hover:bg-live-red/10 font-display font-bold transition-colors"
          >
            Delete pool
          </button>
        </div>
      </section>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => !deleting && setDeleteConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-[var(--surface)] rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto">
              <div className="p-6 border-b border-text-2/15">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-live-red/15 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-live-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                    </svg>
                  </div>
                  <h3 className="font-display font-bold text-xl text-text-primary">Delete "{data.name}"?</h3>
                </div>
                <p className="text-sm text-text-2 mb-3">
                  This permanently deletes the pool, all {data.tiers.length} tier{data.tiers.length === 1 ? '' : 's'}, and {data.entries.length === 0 ? 'every future entry' : `${data.entries.length} entry/entries (${data.entries.map(e => e.teamName).join(', ')})`}.
                </p>
                <p className="text-sm text-live-red font-medium">This cannot be undone.</p>
                {deleteError && (
                  <div className="mt-3 rounded-lg bg-live-red/10 border border-live-red/30 text-live-red p-3 text-sm">
                    {deleteError}
                  </div>
                )}
              </div>
              <div className="p-4 flex gap-2 justify-end bg-bg/50 rounded-b-2xl">
                <button
                  onClick={() => !deleting && setDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg border border-text-2/25 text-text-primary font-display font-bold hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-live-red text-white font-display font-bold hover:bg-live-red/90 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete pool'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DQ confirmation modal */}
      {dqTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => !dqing && setDqTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-[var(--surface)] rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto">
              <div className="p-6 border-b border-text-2/15">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-live-red/15 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-live-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                    </svg>
                  </div>
                  <h3 className="font-display font-bold text-xl text-text-primary">Disqualify this entry?</h3>
                </div>
                <div className="rounded-xl bg-bg border border-text-2/15 p-4 mb-3">
                  <div className="font-display font-bold text-text-primary">{dqTarget.teamName}</div>
                  <div className="text-sm text-text-2 mt-0.5">{dqTarget.entrantName}</div>
                  <div className="text-xs text-text-2/70 font-mono mt-0.5">{dqTarget.entrantEmail}</div>
                </div>
                <p className="text-sm text-text-2">
                  This permanently removes their picks from the leaderboard. They'd have to re-enter (if the pool is still open) to get back in. <span className="text-live-red font-medium">This can't be undone.</span>
                </p>
              </div>
              <div className="p-4 flex gap-2 justify-end bg-bg/50 rounded-b-2xl">
                <button
                  onClick={() => !dqing && setDqTarget(null)}
                  disabled={dqing}
                  className="px-4 py-2 rounded-lg border border-text-2/25 text-text-primary font-display font-bold hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDq}
                  disabled={dqing}
                  className="px-4 py-2 rounded-lg bg-live-red text-white font-display font-bold hover:bg-live-red/90 transition-colors disabled:opacity-50"
                >
                  {dqing ? 'Removing…' : 'Yes, DQ entry'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
