import { forwardRef } from 'react'
import MomentCardBase from '../MomentCardBase'

const PicksResultCard = forwardRef(({ correct, total, percentile, sport, week, username }, ref) => {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const dots = []
  for (let i = 0; i < total && i < 20; i++) {
    dots.push(i < correct ? '#4ADE80' : '#F87171')
  }

  return (
    <MomentCardBase ref={ref} username={username}>
      <div style={{ textAlign: 'center' }}>
        {/* Big result */}
        <div style={{ fontSize: 96, fontWeight: 800, color: '#FFFFFF', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
          {correct} <span style={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }}>of</span> {total}
        </div>
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.6)', marginTop: 8, fontWeight: 600 }}>
          correct calls
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
          {dots.map((color, i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: color,
              }}
            />
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 32 }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#E8B84D', fontFamily: "'JetBrains Mono', monospace" }}>
              {accuracy}%
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Accuracy
            </div>
          </div>
          {percentile && (
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#E8B84D', fontFamily: "'JetBrains Mono', monospace" }}>
                Top {100 - percentile}%
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Percentile
              </div>
            </div>
          )}
        </div>

        {/* Context tag */}
        <div style={{ marginTop: 24 }}>
          <span style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.3)',
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {sport?.toUpperCase() || 'ALL'}{week ? ` Week ${week}` : ''}
          </span>
        </div>
      </div>
    </MomentCardBase>
  )
})

PicksResultCard.displayName = 'PicksResultCard'
export default PicksResultCard
