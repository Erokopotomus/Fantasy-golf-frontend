import { useState, useEffect, useRef } from 'react'

/**
 * ClutchRatingGauge — SVG circular arc gauge for Clutch Rating
 *
 * 3-layer SVG: glow layer (blur) + track + gradient fill
 * Crown colors for rating context
 * Bricolage Grotesque 800 for center number
 * Size variants: sm (leaderboard rows), md (cards), lg (profile header), xl (landing hero)
 * animated: scroll-triggered count-up animation (for landing page)
 */

const SIZES = {
  sm: { width: 48, strokeWidth: 4, fontSize: 14, tierSize: 8, showTier: false },
  md: { width: 80, strokeWidth: 5, fontSize: 22, tierSize: 10, showTier: true },
  lg: { width: 120, strokeWidth: 7, fontSize: 38, tierSize: 12, showTier: true },
  xl: { width: 200, strokeWidth: 10, fontSize: 64, tierSize: 14, showTier: true },
}

function getColor(rating) {
  if (rating == null) return { c1: '#4B5563', c2: '#6B7280', c3: '#4B5563', text: '#6B7280' }
  if (rating >= 90) return { c1: '#D4930D', c2: '#F0B429', c3: '#D4930D', text: '#D4930D' }
  if (rating >= 70) return { c1: '#D4930D', c2: '#F0B429', c3: '#D4930D', text: '#D4930D' }
  if (rating >= 50) return { c1: '#D4930D', c2: '#F0B429', c3: '#D4930D', text: '#F0B429' }
  return { c1: '#6B7280', c2: '#9CA3AF', c3: '#6B7280', text: '#6B7280' }
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

export default function ClutchRatingGauge({ rating, tier, trend, size = 'md', animated = false, darkBg = false, className = '' }) {
  const config = SIZES[size] || SIZES.md
  const { width, strokeWidth, fontSize, tierSize, showTier } = config
  const [displayRating, setDisplayRating] = useState(animated ? null : rating)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef(null)

  const color = getColor(displayRating ?? rating)

  const radius = width * 0.4
  const center = width / 2
  const circumference = 2 * Math.PI * radius
  const effectiveRating = displayRating ?? rating
  const progress = effectiveRating != null ? (Math.min(100, Math.max(0, effectiveRating)) / 100) * circumference : 0
  const dashOffset = circumference - progress

  // Unique gradient ID per instance
  const gradId = `gauge-grad-${width}-${size}`
  const blurId = `gauge-blur-${width}-${size}`

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
        <svg width={width} height={width} viewBox={`0 0 ${width} ${width}`} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color.c1} />
              <stop offset="50%" stopColor={color.c2} />
              <stop offset="100%" stopColor={color.c3} />
            </linearGradient>
            <filter id={blurId}>
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Layer 1: Glow (blur behind fill) */}
          {effectiveRating != null && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color.c1}
              strokeWidth={strokeWidth + 5}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              opacity={0.08}
              filter={`url(#${blurId})`}
            />
          )}

          {/* Layer 2: Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={darkBg ? 'rgba(255,255,255,0.08)' : 'var(--gauge-bg)'}
            strokeWidth={strokeWidth}
          />

          {/* Layer 3: Fill (gradient) */}
          {effectiveRating != null && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: animated ? 'none' : 'stroke-dashoffset 0.8s ease-out',
                filter: `drop-shadow(0 0 8px ${color.c1}30)`,
              }}
            />
          )}
        </svg>

        {/* Center number — Bricolage Grotesque 800 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display font-extrabold leading-none"
            style={{
              fontSize: width * 0.32,
              color: darkBg ? '#F0EBE0' : 'var(--text-1)',
            }}
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
          className="font-mono font-semibold uppercase tracking-wider mt-1"
          style={{ fontSize: tierSize, color: color.text }}
        >
          {getTierLabel(tier, effectiveRating)}
        </span>
      )}
    </div>
  )
}
