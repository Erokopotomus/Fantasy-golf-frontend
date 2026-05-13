import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import api from '../services/api'

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
    <div className="rounded-2xl border border-text-2/25 bg-white shadow-sm p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-2 mb-1">{label}</div>
      <div className="font-mono font-bold text-2xl text-text-primary">{value}</div>
    </div>
  )
}

export default function PoolAdmin() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token')

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)

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
  const dq = async (entryId) => {
    if (!confirm('DQ this entry? They will be removed from the leaderboard.')) return
    await api.deletePoolEntry(slug, token, entryId)
    refresh()
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
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="text-center text-live-red font-mono text-sm">{error}</div>
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
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-text-primary tracking-tight">
            {data.name}
            <span className="ml-3 align-middle text-xs font-mono uppercase tracking-wider text-text-2 px-2 py-0.5 rounded-md bg-white border border-text-2/25">admin</span>
          </h1>
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
      <section className="rounded-2xl border border-text-2/25 bg-white shadow-sm p-5 space-y-4">
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
            className="flex-1 text-center bg-white border border-text-2/25 hover:border-blaze/50 text-text-primary font-display font-bold px-4 py-2.5 rounded-lg transition-colors">
            View public page →
          </Link>
          <Link to={`/pools/${slug}`}
            className="flex-1 text-center bg-slate hover:bg-slate-mid text-white font-display font-bold px-4 py-2.5 rounded-lg transition-colors">
            Enter your picks →
          </Link>
        </div>
      </section>

      {/* Invite by email */}
      <section className="rounded-2xl border border-text-2/25 bg-white shadow-sm p-5 space-y-3">
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
      <section className="rounded-2xl border border-text-2/25 bg-white shadow-sm p-5">
        <h2 className="font-display font-bold text-lg text-text-primary mb-3">Tiers</h2>
        <ul className="space-y-1.5">
          {data.tiers.map(t => (
            <li key={t.id} className="flex items-center gap-3 text-sm">
              <span className="font-mono text-xs bg-bg border border-text-2/20 px-2 py-0.5 rounded text-text-2">T{t.tierNumber}</span>
              {t.label && <span className="font-medium text-text-primary">{t.label}</span>}
              <span className="text-text-2">— {t.players.length} player{t.players.length === 1 ? '' : 's'}, pick {t.picksRequired}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Entries */}
      <section className="rounded-2xl border border-text-2/25 bg-white shadow-sm p-5">
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
                      <button onClick={() => dq(e.id)} className="text-live-red text-xs font-mono uppercase tracking-wide hover:underline">DQ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
