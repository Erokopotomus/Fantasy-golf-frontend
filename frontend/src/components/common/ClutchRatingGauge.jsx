import { useState, useEffect, useRef } from 'react'

/**
 * ClutchRatingGauge — SVG circular arc gauge for Clutch Rating
 *
 * Color coded: gold (90+), green (70-89), amber (50-69), gray (<50)
 * Number in center (JetBrains Mono)
 * Tier label below
 * Trend arrow (up/down/stable)
 * Size variants: sm (leaderboard rows), md (cards), lg (profile header), xl (landing hero)
 * animated: scroll-triggered count-up animation (for landing page)
 */

const SIZES = {
  sm: { width: 48, strokeWidth: 4, fontSize: 14, tierSize: 8, showTier: false },
  md: { width: 80, strokeWidth: 5, fontSize: 22, tierSize: 10, showTier: true },
  lg: { width: 120, strokeWidth: 6, fontSize: 34, tierSize: 12, showTier: true },
  xl: { width: 200, strokeWidth: 10, fontSize: 56, tierSize: 14, showTier: true },
}

function getColor(rating) {
  if (rating == null) return { stroke: '#4B5563', text: 'text-gray-500', label: 'gray' }
  if (rating >= 90) return { stroke: '#E8B84D', text: 'text-amber-400', label: 'gold' }
  if (rating >= 70) return { stroke: '#6ABF8A', text: 'text-emerald-400', label: 'green' }
  if (rating >= 50) return { stroke: '#F59E0B', text: 'text-amber-500', label: 'amber' }
  return { stroke: '#6B7280', text: 'text-gray-400', label: 'gray' }
}

function getTierLabel(tier, rating) {
  if (tier) {
    const labels = {
      elite: 'Elite',
      expert: 'Expert',
      sharp: 'Sharp',
      solid: 'Solid',
      average: 'Average',
      developing: 'Developing',
    }
    return labels[tier] || tier
  }
  // Derive from rating
  if (rating == null) return 'Unrated'
  if (rating >= 90) return 'Elite'
  if (rating >= 80) return 'Expert'
  if (rating >= 70) return 'Sharp'
  if (rating >= 60) return 'Solid'
  if (rating >= 50) return 'Average'
  return 'Developing'
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

export default function ClutchRatingGauge({ rating, tier, trend, size = 'md', animated = false, className = '' }) {
  const config = SIZES[size] || SIZES.md
  const { width, strokeWidth, fontSize, tierSize, showTier } = config
  const [displayRating, setDisplayRating] = useState(animated ? null : rating)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef(null)

  const color = getColor(displayRating ?? rating)

  const radius = (width - strokeWidth * 2) / 2
  const center = width / 2
  const circumference = 2 * Math.PI * radius
  const arcLength = (270 / 360) * circumference
  const effectiveRating = displayRating ?? rating
  const progress = effectiveRating != null ? (Math.min(100, Math.max(0, effectiveRating)) / 100) * arcLength : 0
  const dashOffset = arcLength - progress
  const startAngle = 135

  // Scroll-triggered animation
  useEffect(() => {
    if (!animated || hasAnimated || rating == null) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true)
          observer.disconnect()
          const duration = 1400
          const start = performance.now()
          const tick = (now) => {
            const elapsed = now - start
            const p = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setDisplayRating(Math.round(eased * rating))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [animated, rating, hasAnimated])

  // Sync for non-animated
  useEffect(() => {
    if (!animated) setDisplayRating(rating)
  }, [animated, rating])

  return (
    <div ref={ref} className={`inline-flex flex-col items-center ${className}`}>
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
          {effectiveRating != null && (
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
              style={{
                transition: animated ? 'none' : 'stroke-dashoffset 0.8s ease-out',
                filter: `drop-shadow(0 0 6px ${color.stroke}40)`,
              }}
            />
          )}
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono font-bold leading-none ${color.text}`}
            style={{ fontSize }}
          >
            {effectiveRating != null ? Math.round(effectiveRating) : '—'}
          </span>
          {trend && size !== 'sm' && (
            <TrendArrow trend={trend} size={size === 'lg' || size === 'xl' ? 14 : 10} />
          )}
        </div>
      </div>
      {/* Tier label */}
      {showTier && (
        <span
          className={`font-mono font-semibold uppercase tracking-wider mt-1 ${color.text}`}
          style={{ fontSize: tierSize }}
        >
          {getTierLabel(tier, effectiveRating)}
        </span>
      )}
    </div>
  )
}
