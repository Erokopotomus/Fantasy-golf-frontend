import { forwardRef } from 'react'
import MomentCardBase from '../MomentCardBase'

const HeadToHeadCard = forwardRef(({ myName, myCorrect, theirName, theirCorrect, myAvatar, theirAvatar, username }, ref) => {
  const myWins = myCorrect > theirCorrect
  const tie = myCorrect === theirCorrect
  const resultText = tie ? "It's a tie!" : myWins ? `${myName} wins` : `${theirName} wins`
  const resultColor = tie ? '#F59E0B' : myWins ? '#4ADE80' : '#F87171'

  return (
    <MomentCardBase ref={ref} username={username}>
      <div style={{ textAlign: 'center' }}>
        {/* VS label */}
        <div style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          letterSpacing: 3,
          marginBottom: 24,
        }}>
          Head to Head
        </div>

        {/* Avatars + score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48 }}>
          {/* My side */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: myWins ? 'linear-gradient(135deg, #4ADE80, #22C55E)' : 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 800,
              color: myWins ? '#0A0908' : 'rgba(255,255,255,0.4)',
              margin: '0 auto 12px',
            }}>
              {myAvatar ? (
                <img src={myAvatar} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} alt="" />
              ) : (
                (myName || 'Y').charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
              {myName || 'You'}
            </div>
          </div>

          {/* Score */}
          <div style={{
            fontSize: 72,
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            color: '#FFFFFF',
            lineHeight: 1,
          }}>
            {myCorrect} <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 36 }}>-</span> {theirCorrect}
          </div>

          {/* Their side */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: !myWins && !tie ? 'linear-gradient(135deg, #F87171, #EF4444)' : 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 800,
              color: !myWins && !tie ? '#0A0908' : 'rgba(255,255,255,0.4)',
              margin: '0 auto 12px',
            }}>
              {theirAvatar ? (
                <img src={theirAvatar} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} alt="" />
              ) : (
                (theirName || 'T').charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
              {theirName || 'Opponent'}
            </div>
          </div>
        </div>

        {/* Result text */}
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: resultColor,
          marginTop: 32,
        }}>
          {resultText}
        </div>

        {/* Overlap info */}
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
          Based on {myCorrect + theirCorrect > 0 ? Math.max(myCorrect, theirCorrect) : 0}+ shared predictions
        </div>
      </div>
    </MomentCardBase>
  )
})

HeadToHeadCard.displayName = 'HeadToHeadCard'
export default HeadToHeadCard
