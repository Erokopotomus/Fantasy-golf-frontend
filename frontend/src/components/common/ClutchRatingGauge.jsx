/**
 * ClutchRatingGauge — SVG circular arc gauge for Clutch Rating
 *
 * Color coded: gold (90+), green (70-89), amber (50-69), gray (<50)
 * Number in center (JetBrains Mono)
 * Tier label below
 * Trend arrow (up/down/stable)
 * Size variants: sm (leaderboard rows), md (cards), lg (profile header)
 */

const SIZES = {
  sm: { width: 48, strokeWidth: 4, fontSize: 14, tierSize: 8, showTier: false },
  md: { width: 80, strokeWidth: 5, fontSize: 22, tierSize: 10, showTier: true },
  lg: { width: 120, strokeWidth: 6, fontSize: 34, tierSize: 12, showTier: true },
}

function getColor(rating) {
  if (rating == null) return { stroke: '#4B5563', text: 'text-gray-500', label: 'gray' }
  if (rating >= 90) return { stroke: '#E8B84D', text: 'text-amber-400', label: 'gold' }
  if (rating >= 70) return { stroke: '#6ABF8A', text: 'text-emerald-400', label: 'green' }
  if (rating >= 50) return { stroke: '#F59E0B', text: 'text-amber-500', label: 'amber' }
  return { stroke: '#6B7280', text: 'text-gray-400', label: 'gray' }
}

function getTierLabel(tier) {
  const labels = {
    elite: 'Elite',
    expert: 'Expert',
    sharp: 'Sharp',
    solid: 'Solid',
    average: 'Average',
    developing: 'Developing',
  }
  return labels[tier] || tier || 'Unrated'
}

const TrendArrow = ({ trend, size }) => {
  if (!trend || trend === 'stable') {
    return <span className="text-gray-500" style={{ fontSize: size }}>—</span>
  }
  if (trend === 'up') {
    return (
      <svg width={size} height={size} viewBox="0 0 12 12" className="inline-block">
        <path d="M6 2L10 7H2L6 2Z" fill="#6ABF8A" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" className="inline-block">
      <path d="M6 10L2 5H10L6 10Z" fill="#EF4444" />
    </svg>
  )
}

export default function ClutchRatingGauge({ rating, tier, trend, size = 'md', className = '' }) {
  const config = SIZES[size] || SIZES.md
  const { width, strokeWidth, fontSize, tierSize, showTier } = config
  const color = getColor(rating)

  const radius = (width - strokeWidth * 2) / 2
  const center = width / 2
  // Arc goes from 135deg to 405deg (270deg sweep)
  const circumference = 2 * Math.PI * radius
  const arcLength = (270 / 360) * circumference
  const progress = rating != null ? (Math.min(100, Math.max(0, rating)) / 100) * arcLength : 0
  const dashOffset = arcLength - progress

  // Start angle offset for the arc
  const startAngle = 135

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width, height: width }}>
        <svg width={width} height={width} viewBox={`0 0 ${width} ${width}`}>
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${startAngle} ${center} ${center})`}
          />
          {/* Progress arc */}
          {rating != null && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color.stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(${startAngle} ${center} ${center})`}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          )}
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono font-bold leading-none ${color.text}`}
            style={{ fontSize }}
          >
            {rating != null ? Math.round(rating) : '—'}
          </span>
          {trend && size !== 'sm' && (
            <TrendArrow trend={trend} size={size === 'lg' ? 14 : 10} />
          )}
        </div>
      </div>
      {/* Tier label */}
      {showTier && (
        <span
          className={`font-mono font-semibold uppercase tracking-wider mt-1 ${color.text}`}
          style={{ fontSize: tierSize }}
        >
          {getTierLabel(tier)}
        </span>
      )}
    </div>
  )
}
