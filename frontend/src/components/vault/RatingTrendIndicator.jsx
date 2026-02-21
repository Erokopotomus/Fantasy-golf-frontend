// Small arrow/icon showing rating trend direction

const TREND_CONFIG = {
  up:     { icon: '↗', color: 'text-green-400', label: 'Rising' },
  down:   { icon: '↘', color: 'text-red-400', label: 'Falling' },
  stable: { icon: '→', color: 'text-text-primary/40', label: 'Stable' },
  new:    { icon: '✦', color: 'text-yellow-400', label: 'New' },
}

export default function RatingTrendIndicator({ trend = 'stable' }) {
  const config = TREND_CONFIG[trend] || TREND_CONFIG.stable

  return (
    <span className={`inline-flex items-center gap-0.5 ${config.color}`} title={config.label}>
      <span className="text-xs">{config.icon}</span>
    </span>
  )
}
