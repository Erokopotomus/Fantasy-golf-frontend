import { forwardRef } from 'react'
import MomentCardBase from '../MomentCardBase'

const StreakCard = forwardRef(({ streakLength, type = 'correct', userName, username }, ref) => {
  const isHot = streakLength >= 10
  const streakColor = isHot ? '#F59E0B' : '#4ADE80'

  return (
    <MomentCardBase ref={ref} username={username}>
      <div style={{ textAlign: 'center' }}>
        {/* Flame row for hot streaks */}
        {isHot && (
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {'🔥'.repeat(Math.min(5, Math.floor(streakLength / 5)))}
          </div>
        )}

        {/* Giant streak number */}
        <div style={{
          fontSize: 180,
          fontWeight: 900,
          color: streakColor,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 0.85,
          textShadow: `0 0 80px ${streakColor}33`,
        }}>
          {streakLength}
        </div>

        {/* Label */}
        <div style={{ fontSize: 32, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: 16 }}>
          {type === 'correct' ? 'correct in a row' : 'win streak'}
        </div>

        {/* User name */}
        {userName && (
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)', marginTop: 24 }}>
            {userName}
          </div>
        )}
      </div>
    </MomentCardBase>
  )
})

StreakCard.displayName = 'StreakCard'
export default StreakCard
