import { useState } from 'react'

/**
 * Generate a plain-text rules summary that's clean to paste into iMessage,
 * group chats, email, etc.
 */
export function buildShareableRules({ poolName, slug, totalPicks, cutScoreToPar, countPicks }) {
  const lines = []
  lines.push(`🏌️ ${poolName} — Scoring`)
  lines.push('')
  lines.push(`• Pick 1 player from each tier (${totalPicks} picks total)`)
  lines.push('• Lowest total score to par wins')
  lines.push(`• Each player's score = their actual strokes vs. par across all 4 rounds`)
  const cutSign = cutScoreToPar >= 0 ? '+' : ''
  lines.push(`• Missed cut / WD: each unplayed round counts as ${cutSign}${cutScoreToPar} over par`)
  if (countPicks) {
    lines.push(`• Only your best ${countPicks} pick scores count toward your total`)
  } else {
    lines.push('• All picks count toward your total')
  }
  lines.push('• Tiebreaker: closest guess to the winner\'s final score')
  lines.push('• Picks lock at first tee Thursday')
  lines.push('')
  lines.push(`Enter: ${typeof window !== 'undefined' ? window.location.origin : 'https://clutchfantasysports.com'}/pools/${slug}`)
  return lines.join('\n')
}

/**
 * Compact rules display + copy-to-clipboard. Read-only.
 *
 * Props:
 *   pool: { name, slug, cutScoreToPar, countPicks, tiers: [{ picksRequired }] }
 *   onEdit: optional callback — if provided, shows an "Edit" button (commissioner only)
 *   editable: boolean — false means the edit button is disabled (e.g. tournament started)
 */
export default function ScoringRulesCard({ pool, onEdit, editable = false }) {
  const [copied, setCopied] = useState(false)
  const totalPicks = (pool.tiers || []).reduce((sum, t) => sum + (t.picksRequired || 0), 0)
  const cutScoreToPar = pool.cutScoreToPar ?? 2
  const countPicks = pool.countPicks ?? null

  const shareText = buildShareableRules({
    poolName: pool.name,
    slug: pool.slug,
    totalPicks,
    cutScoreToPar,
    countPicks,
  })

  const copyRules = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const cutSign = cutScoreToPar >= 0 ? '+' : ''

  return (
    <section className="rounded-2xl border border-text-2/25 bg-[var(--surface)] shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-lg text-text-primary">Scoring rules</h2>
          <p className="font-editorial italic text-sm text-text-2 mt-0.5">
            How your picks turn into a score.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={copyRules}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-display font-semibold transition-colors ${
              copied
                ? 'bg-field text-white'
                : 'border border-text-2/25 bg-[var(--surface)] hover:border-blaze/40 hover:text-blaze text-text-primary'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Copied ✓' : 'Copy for chat'}
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              disabled={!editable}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-display font-semibold border border-text-2/25 bg-[var(--surface)] hover:border-blaze/40 hover:text-blaze text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={editable ? 'Edit scoring rules' : 'Rules are locked once the tournament starts'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        <RuleRow
          label="Format"
          value={`Pick 1 player from each tier · ${totalPicks} picks per entry`}
        />
        <RuleRow
          label="How scoring works"
          value="Lowest total score to par wins. Sum each pick's strokes vs. par across all 4 rounds."
        />
        <RuleRow
          label="Missed cut / WD"
          value={`Each unplayed round counts as ${cutSign}${cutScoreToPar} over par`}
        />
        <RuleRow
          label="Picks that count"
          value={countPicks ? `Best ${countPicks} of ${totalPicks}` : 'All picks count'}
        />
        <RuleRow
          label="Tiebreaker"
          value="Closest guess to the winner's final score, then best-vs-best scorecard playoff"
        />
        <RuleRow
          label="Lock time"
          value="Picks lock at first tee Thursday morning"
        />
      </ul>
    </section>
  )
}

function RuleRow({ label, value }) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-2 sm:min-w-[150px] shrink-0">{label}</span>
      <span className="text-text-primary">{value}</span>
    </li>
  )
}
