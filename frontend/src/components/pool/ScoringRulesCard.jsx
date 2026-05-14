import { useState } from 'react'

/**
 * Generate a plain-text rules summary that's clean to paste into iMessage,
 * group chats, email, etc.
 */
export function buildShareableRules({ poolName, slug, totalPicks, cutScoreToPar, countPicks, tierBreakdown }) {
  const lines = []
  lines.push(`🏌️ ${poolName}`)
  lines.push('')
  lines.push(`Pick ${totalPicks} players total${tierBreakdown ? ` (${tierBreakdown})` : ''}.`)
  lines.push('Lowest total score to par wins.')
  lines.push('')
  lines.push('Scoring is just real golf strokes vs. par:')
  lines.push('  Eagle = -2 · Birdie = -1 · Par = 0 · Bogey = +1 · Double = +2')
  const cutSign = cutScoreToPar >= 0 ? '+' : ''
  lines.push(`  Missed cut: each unplayed round = ${cutSign}${cutScoreToPar} over par`)
  if (countPicks) lines.push(`  Best ${countPicks} of ${totalPicks} picks count`)
  lines.push('')
  lines.push("Tiebreaker: closest guess to the winner's final score.")
  lines.push('Picks lock at first tee Thursday.')
  lines.push('')
  lines.push(`Enter: ${typeof window !== 'undefined' ? window.location.origin : 'https://clutchfantasysports.com'}/pools/${slug}`)
  return lines.join('\n')
}

/**
 * Scoring rules display. Used in two contexts:
 *   - PoolAdmin (inline section, commissioner sees Copy + Edit)
 *   - PoolView modal (members see just the rules, no chrome)
 *
 * Props:
 *   pool: { name, slug, cutScoreToPar, countPicks, tiers: [{ tierNumber, picksRequired }] }
 *   onEdit: optional callback — shows "Edit" button when provided (commissioner)
 *   editable: boolean — disables Edit button when false (after tournament starts)
 *   showCopyButton: boolean — hide for member viewers (default true)
 *   hideChrome: boolean — render body only (no card wrapper, no header buttons)
 */
export default function ScoringRulesCard({ pool, onEdit, editable = false, showCopyButton = true, hideChrome = false }) {
  const [copied, setCopied] = useState(false)
  const tiers = pool.tiers || []
  const totalPicks = tiers.reduce((sum, t) => sum + (t.picksRequired || 0), 0)
  const cutScoreToPar = pool.cutScoreToPar ?? 2
  const countPicks = pool.countPicks ?? null

  const allOnePerTier = tiers.length > 0 && tiers.every(t => (t.picksRequired || 1) === 1)
  const tierBreakdown = allOnePerTier ? null : tiers.map(t => `T${t.tierNumber}: ${t.picksRequired}`).join(' · ')

  const shareText = buildShareableRules({
    poolName: pool.name,
    slug: pool.slug,
    totalPicks,
    cutScoreToPar,
    countPicks,
    tierBreakdown,
  })

  const copyRules = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const cutSign = cutScoreToPar >= 0 ? '+' : ''

  const body = (
    <>
      <p className="text-sm text-text-primary leading-relaxed mb-4">
        <strong>Lowest total score to par wins.</strong> We just add up each of your picks' real
        strokes vs. par across the tournament — same as the leaderboard you see on TV.
      </p>

      <ul className="space-y-2 text-sm mb-4">
        <RuleRow
          label="Format"
          value={
            allOnePerTier
              ? `Pick 1 from each tier · ${totalPicks} picks total`
              : `${totalPicks} picks per entry (varies by tier — see your team)`
          }
        />
        <RuleRow
          label="Missed cut / WD"
          value={`Each unplayed round counts as ${cutSign}${cutScoreToPar} over par`}
        />
        <RuleRow
          label="Picks that count"
          value={countPicks ? `Best ${countPicks} of ${totalPicks} per entry` : 'All picks count'}
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

      <div className="rounded-xl bg-bg border border-text-2/15 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-2 mb-2">How each hole counts</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm font-mono">
          <ScoreRow label="Eagle / HIO" value="−2" color="text-field" />
          <ScoreRow label="Birdie" value="−1" color="text-field" />
          <ScoreRow label="Par" value="0" color="text-text-2" />
          <ScoreRow label="Bogey" value="+1" color="text-text-primary" />
          <ScoreRow label="Double" value="+2" color="text-live-red" />
          <ScoreRow label="Triple+" value="+3+" color="text-live-red" />
        </div>
      </div>
    </>
  )

  if (hideChrome) return body

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
          {showCopyButton && (
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
              {copied ? 'Copied' : 'Copy for chat'}
            </button>
          )}
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
      {body}
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

function ScoreRow({ label, value, color }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-text-2 text-xs">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  )
}
