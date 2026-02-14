// Circular progress ring showing Clutch Rating score
// Ring fill = score/100, dashed segments for confidence gap
// Sizes: lg (128px), md (64px), sm (40px)

import { useState, useEffect } from 'react'

const SIZES = {
  lg: { size: 128, stroke: 6, fontSize: 'text-3xl', labelSize: 'text-xs' },
  md: { size: 64, stroke: 4, fontSize: 'text-lg', labelSize: 'text-[9px]' },
  sm: { size: 40, stroke: 3, fontSize: 'text-sm', labelSize: 'text-[7px]' },
}

const TIER_COLORS = {
  ELITE: '#E8B84D',
  VETERAN: '#C0C0C0',
  COMPETITOR: '#CD7F32',
  CONTENDER: '#6ABF8A',
  DEVELOPING: '#8B8B8B',
  ROOKIE: '#666666',
  UNRANKED: '#444444',
}

export default function RatingRing({
  rating,
  confidence = 0,
  tier = 'UNRANKED',
  color,
  size = 'md',
  animate = false,
}) {
  const [animatedProgress, setAnimatedProgress] = useState(animate ? 0 : (rating || 0))

  const config = SIZES[size] || SIZES.md
  const ringColor = color || TIER_COLORS[tier] || '#E8B84D'
  const radius = (config.size - config.stroke * 2) / 2
  const circumference = 2 * Math.PI * radius
  const center = config.size / 2

  useEffect(() => {
    if (!animate || rating == null) return
    const target = rating
    let frame
    const start = performance.now()
    const duration = 1200

    function step(now) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedProgress(Math.round(eased * target))
      if (t < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [animate, rating])

  const displayValue = animate ? animatedProgress : rating
  const progress = (displayValue || 0) / 100
  const confidenceProgress = (confidence || 0) / 100

  // Solid ring = score progress, dashed ring = confidence gap
  const solidOffset = circumference * (1 - progress)
  const confidenceOffset = circumference * (1 - confidenceProgress)

  if (rating == null) {
    // Locked state — dashed ring with lock icon
    return (
      <div className="relative inline-flex items-center justify-center" style={{ width: config.size, height: config.size }}>
        <svg width={config.size} height={config.size} className="transform -rotate-90">
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="#333" strokeWidth={config.stroke}
            strokeDasharray="4 4" opacity={0.4}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/40" style={{ fontSize: config.size * 0.25 }}>🔒</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: config.size, height: config.size }}>
      <svg width={config.size} height={config.size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="#1a1a1a" strokeWidth={config.stroke}
        />
        {/* Confidence dashed ring (shows how much data backs this) */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={ringColor} strokeWidth={config.stroke}
          strokeDasharray="4 4"
          opacity={0.15}
          strokeDashoffset={confidenceOffset}
        />
        {/* Score solid ring */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={ringColor} strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={solidOffset}
          style={{ transition: animate ? 'none' : 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-mono font-bold text-white ${config.fontSize}`}>
          {displayValue}
        </span>
      </div>
    </div>
  )
}
