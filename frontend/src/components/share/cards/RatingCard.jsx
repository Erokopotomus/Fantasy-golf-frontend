import { forwardRef } from 'react'
import MomentCardBase from '../MomentCardBase'

const RatingCard = forwardRef(({ rating, tier, trend, components, userName, username }, ref) => {
  const tierColors = {
    developing: '#9CA3AF',
    rising: '#60A5FA',
    established: '#34D399',
    elite: '#F59E0B',
    legendary: '#E8B84D',
  }
  const ratingColor = tierColors[tier] || '#E8B84D'

  const bars = [
    { label: 'Accuracy', value: components?.accuracy, weight: '40%' },
    { label: 'Consistency', value: components?.consistency, weight: '25%' },
    { label: 'Volume', value: components?.volume, weight: '20%' },
    { label: 'Breadth', value: components?.breadth, weight: '15%' },
  ]

  // Gauge arc
  const gaugeAngle = rating != null ? (rating / 100) * 180 : 0

  return (
    <MomentCardBase ref={ref} username={username}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 64 }}>
        {/* Left: Gauge */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <svg width={240} height={140} viewBox="0 0 240 140">
            {/* Background arc */}
            <path
              d="M 20 130 A 100 100 0 0 1 220 130"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={16}
              strokeLinecap="round"
            />
            {/* Rating arc */}
            {rating != null && (
              <path
                d="M 20 130 A 100 100 0 0 1 220 130"
                fill="none"
                stroke={ratingColor}
                strokeWidth={16}
                strokeLinecap="round"
                strokeDasharray={`${gaugeAngle * Math.PI * 100 / 180} 999`}
              />
            )}
          </svg>
          <div style={{ marginTop: -80, position: 'relative' }}>
            <div style={{
              fontSize: 64,
              fontWeight: 900,
              color: ratingColor,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
            }}>
              {rating != null ? Math.round(rating) : '—'}
            </div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Clutch Rating
            </div>
          </div>

          {/* Tier + trend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <span style={{
              fontSize: 14,
              color: ratingColor,
              textTransform: 'capitalize',
              fontWeight: 700,
            }}>
              {tier || 'developing'}
            </span>
            {trend === 'up' && <span style={{ color: '#4ADE80', fontSize: 18 }}>▲</span>}
            {trend === 'down' && <span style={{ color: '#EF4444', fontSize: 18 }}>▼</span>}
          </div>

          {userName && (
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>{userName}</div>
          )}
        </div>

        {/* Right: Component bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {bars.map(bar => (
            <div key={bar.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                  {bar.label} ({bar.weight})
                </span>
                <span style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {bar.value != null ? Math.round(bar.value) : '—'}
                </span>
              </div>
              <div style={{
                height: 10,
                borderRadius: 5,
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${bar.value != null ? Math.min(100, bar.value) : 0}%`,
                  background: `linear-gradient(90deg, ${ratingColor}, ${ratingColor}88)`,
                  borderRadius: 5,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MomentCardBase>
  )
})

RatingCard.displayName = 'RatingCard'
export default RatingCard
