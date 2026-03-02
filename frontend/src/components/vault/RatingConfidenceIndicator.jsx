// Shows how much data backs the rating — text + visual

export default function RatingConfidenceIndicator({ confidence = 0, dataSourceSummary }) {
  const label = confidence >= 80
    ? dataSourceSummary || 'High confidence rating'
    : confidence >= 40
    ? 'Rating is calibrating'
    : 'Building your rating'

  const barColor = confidence >= 80
    ? 'bg-field/60'
    : confidence >= 40
    ? 'bg-crown/60'
    : 'bg-[var(--stone)]'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-primary/40 font-sans">{label}</span>
        <span className="text-[10px] font-mono text-text-primary/30">{confidence}%</span>
      </div>
      <div className="h-1 rounded-full bg-[var(--stone)] overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  )
}
