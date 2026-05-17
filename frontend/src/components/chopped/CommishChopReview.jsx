import { useState } from 'react'
import api from '../../services/api'
import { CHOPPED_VOCAB } from '../../lib/chopped/vocabulary'

export default function CommishChopReview({ leagueId, week, block, maxChops }) {
  // Pre-select the bottom team(s) up to maxChops
  const initialSelection = new Set(block.slice(-maxChops).map(t => t.teamId))
  const [selected, setSelected] = useState(initialSelection)
  const [reasoning, setReasoning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function toggle(teamId) {
    const next = new Set(selected)
    if (next.has(teamId)) next.delete(teamId)
    else next.add(teamId)
    setSelected(next)
  }

  async function submitChop() {
    setError(null)
    if (selected.size === 0) return
    if (selected.size > maxChops) {
      setError(`Max ${maxChops} chops per week`)
      return
    }
    if (!confirm(`Confirm chop of ${selected.size} team(s)? This cannot be undone.`)) return
    setSubmitting(true)
    try {
      await api.chopTeams(leagueId, {
        week,
        teamIds: [...selected],
        reasoning: reasoning.trim() || null,
      })
      window.location.reload()
    } catch (e) {
      setError(e.message || 'Chop failed')
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-lg border-2 border-blaze bg-blaze/5 p-4 space-y-3">
      <div>
        <h2 className="font-display text-lg text-text-primary">Commissioner — {CHOPPED_VOCAB.manualCut}</h2>
        <p className="text-xs text-text-muted">
          Auto-chop fires at waiver close if no action. Recommended pick pre-selected.
        </p>
      </div>
      <div className="space-y-1">
        {block.map(t => (
          <label
            key={t.teamId}
            className="flex items-center gap-3 p-2 rounded hover:bg-[var(--bg-alt)] cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(t.teamId)}
              onChange={() => toggle(t.teamId)}
              className="w-4 h-4 accent-blaze"
            />
            <span className="flex-1 text-text-primary truncate">{t.teamName || t.teamId.slice(0, 8)}</span>
            <span className="font-mono text-sm text-live-red">{(t.safePct * 100).toFixed(0)}%</span>
          </label>
        ))}
      </div>
      <textarea
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        placeholder="Optional reasoning (visible in league chat after chop)"
        className="w-full rounded p-2 bg-[var(--bg-alt)] border border-[var(--card-border)] text-text-primary text-sm focus:border-blaze focus:outline-none"
        rows={2}
      />
      {error && <div className="text-live-red text-sm">{error}</div>}
      <button
        onClick={submitChop}
        disabled={submitting || selected.size === 0}
        className="bg-blaze hover:bg-blaze/90 disabled:bg-blaze/30 text-white font-display px-4 py-2 rounded disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Chopping…' : `Confirm Chop (${selected.size})`}
      </button>
    </section>
  )
}
