// Small pill badge showing the tier label with tier-specific color

const TIER_STYLES = {
  ELITE:      { bg: 'bg-crown/20', text: 'text-crown', border: 'border-crown/30' },
  VETERAN:    { bg: 'bg-gray-300/20', text: 'text-gray-400 dark:text-gray-300', border: 'border-gray-400/30' },
  COMPETITOR: { bg: 'bg-blaze/20', text: 'text-orange-300', border: 'border-blaze/30' },
  CONTENDER:  { bg: 'bg-field/20', text: 'text-field', border: 'border-field/30' },
  DEVELOPING: { bg: 'bg-[var(--bg-alt)]', text: 'text-text-primary/60', border: 'border-[var(--card-border)]' },
  ROOKIE:     { bg: 'bg-[var(--bg-alt)]', text: 'text-text-primary/40', border: 'border-[var(--card-border)]' },
  UNRANKED:   { bg: 'bg-[var(--bg-alt)]', text: 'text-text-primary/30', border: 'border-[var(--card-border)]' },
}

export default function RatingTierBadge({ tier = 'UNRANKED', size = 'sm' }) {
  const styles = TIER_STYLES[tier] || TIER_STYLES.UNRANKED
  const sizeClasses = size === 'md'
    ? 'px-2.5 py-0.5 text-[11px]'
    : 'px-1.5 py-px text-[9px]'

  return (
    <span className={`inline-flex items-center rounded-full font-mono font-semibold uppercase tracking-wider border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses}`}>
      {tier}
    </span>
  )
}
