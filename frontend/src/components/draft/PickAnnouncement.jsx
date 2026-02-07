import { useEffect, useState } from 'react'

const PickAnnouncement = ({ pick, isUserPick }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (pick) {
      setIsVisible(true)
      setIsExiting(false)

      const exitTimer = setTimeout(() => {
        setIsExiting(true)
      }, 2500)

      const hideTimer = setTimeout(() => {
        setIsVisible(false)
      }, 3000)

      return () => {
        clearTimeout(exitTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [pick])

  if (!pick || !isVisible) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className={`
          bg-dark-secondary border-2 rounded-2xl p-6 shadow-2xl
          transform transition-all duration-500
          ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          ${isUserPick ? 'border-gold' : 'border-orange'}
        `}
      >
        <div className="text-center">
          <p className={`text-sm font-medium mb-2 ${isUserPick ? 'text-gold' : 'text-orange'}`}>
            {pick.isAutoPick ? 'AUTO-PICK' : isUserPick ? 'YOUR PICK!' : `PICK #${pick.pickNumber}`}
          </p>
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">{pick.playerFlag}</span>
            <div>
              <p className="text-2xl font-bold font-display text-white">{pick.playerName}</p>
              <p className="text-text-muted">Rank #{pick.playerRank}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <span>Round {pick.round}</span>
            <span>•</span>
            <span>{pick.teamName}</span>
            {pick.isAutoPick && <span className="text-yellow-400 text-xs font-mono">(timer expired)</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PickAnnouncement
