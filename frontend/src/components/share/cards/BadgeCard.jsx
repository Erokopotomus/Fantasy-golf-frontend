import { forwardRef } from 'react'
import MomentCardBase from '../MomentCardBase'

const BADGE_DISPLAY = {
  hot_streak_5: { icon: '🔥', name: 'Hot Streak', desc: '5 correct calls in a row' },
  hot_streak_10: { icon: '🔥🔥', name: 'On Fire', desc: '10 correct calls in a row' },
  sharpshooter: { icon: '🎯', name: 'Sharpshooter', desc: '70%+ accuracy over 20+ calls' },
  clutch_caller: { icon: '⚡', name: 'Clutch Caller', desc: 'Nailed 5+ high-confidence calls' },
  iron_will: { icon: '🛡️', name: 'Iron Will', desc: 'Maintained accuracy after losing streak' },
  volume_king: { icon: '👑', name: 'Volume King', desc: '100+ total calls' },
}

const StreakCard = forwardRef(({ badgeName, tier, description, username }, ref) => {
  const display = BADGE_DISPLAY[badgeName] || { icon: '🏆', name: badgeName?.replace(/_/g, ' ') || 'Badge', desc: description || '' }

  const tierColors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  }
  const tierColor = tierColors[tier?.toLowerCase()] || '#E8B84D'

  return (
    <MomentCardBase ref={ref} username={username}>
      <div style={{ textAlign: 'center' }}>
        {/* Just unlocked label */}
        <div style={{
          fontSize: 16,
          color: tierColor,
          textTransform: 'uppercase',
          letterSpacing: 3,
          fontWeight: 700,
          marginBottom: 24,
        }}>
          Just Unlocked
        </div>

        {/* Large badge icon */}
        <div style={{ fontSize: 120, lineHeight: 1, marginBottom: 24 }}>
          {display.icon}
        </div>

        {/* Badge name */}
        <div style={{
          fontSize: 42,
          fontWeight: 800,
          color: '#FFFFFF',
          marginBottom: 12,
        }}>
          {display.name}
        </div>

        {/* Description */}
        <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>
          {display.desc}
        </div>

        {/* Tier tag */}
        {tier && (
          <div style={{ marginTop: 32 }}>
            <span style={{
              fontSize: 14,
              color: tierColor,
              padding: '8px 20px',
              borderRadius: 20,
              border: `1px solid ${tierColor}44`,
              textTransform: 'uppercase',
              letterSpacing: 2,
              fontWeight: 700,
            }}>
              {tier}
            </span>
          </div>
        )}
      </div>
    </MomentCardBase>
  )
})

StreakCard.displayName = 'BadgeCard'
export default StreakCard
