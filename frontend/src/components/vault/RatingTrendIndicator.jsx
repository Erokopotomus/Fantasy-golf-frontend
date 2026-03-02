// Small arrow/icon showing rating trend direction

const TREND_CONFIG = {
  up:     { icon: '↗', color: 'text-field', label: 'Rising' },
  down:   { icon: '↘', color: 'text-live-red', label: 'Falling' },
  stable: { icon: '→', color: 'text-text-primary/40', label: 'Stable' },
  new:    { icon: '✦', color: 'text-crown', label: 'New' },
}

export default function RatingTrendIndicator({ trend = 'stable' }) {
  const config = TREND_CONFIG[trend] || TREND_CONFIG.stable

  return (
    <span className={`inline-flex items-center gap-0.5 ${config.color}`} title={config.label}>
      <span className="text-xs">{config.icon}</span>
    </span>
  )
}
