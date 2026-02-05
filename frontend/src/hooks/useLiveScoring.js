import { useState, useEffect, useCallback, useRef } from 'react'
import { useNotifications } from '../context/NotificationContext'

// Simulates live score updates for tournament scoring
export const useLiveScoring = (initialLeaderboard, myPlayerIds = [], enabled = true) => {
  const { notify } = useNotifications()
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard || [])
  const [recentChanges, setRecentChanges] = useState({}) // playerId -> { type: 'birdie'|'bogey'|'eagle', timestamp }
  const [isLive, setIsLive] = useState(enabled)
  const intervalRef = useRef(null)
  const previousPositionsRef = useRef({})

  // Store previous positions for comparison
  useEffect(() => {
    const positions = {}
    leaderboard.forEach((player, idx) => {
      positions[player.id] = idx + 1
    })
    previousPositionsRef.current = positions
  }, []) // Only on mount

  const simulateScoreChange = useCallback(() => {
    setLeaderboard(prev => {
      if (!prev || prev.length === 0) return prev

      // Pick 1-3 random players to update
      const numUpdates = Math.floor(Math.random() * 3) + 1
      const updatedPlayers = new Set()
      const newChanges = {}

      const updated = [...prev]

      for (let i = 0; i < numUpdates; i++) {
        const randomIndex = Math.floor(Math.random() * updated.length)
        const player = updated[randomIndex]

        if (updatedPlayers.has(player.id)) continue
        updatedPlayers.add(player.id)

        // Determine score change (-2 to +2)
        const rand = Math.random()
        let scoreChange = 0
        let changeType = 'par'

        if (rand < 0.02) {
          scoreChange = -2
          changeType = 'eagle'
        } else if (rand < 0.20) {
          scoreChange = -1
          changeType = 'birdie'
        } else if (rand < 0.70) {
          scoreChange = 0
          changeType = 'par'
        } else if (rand < 0.92) {
          scoreChange = 1
          changeType = 'bogey'
        } else {
          scoreChange = 2
          changeType = 'double'
        }

        if (scoreChange !== 0) {
          const currentScore = parseInt(player.score) || 0
          const newScore = currentScore + scoreChange
          const currentThru = player.thru === 'F' ? 18 : (parseInt(player.thru) || 0)
          const newThru = Math.min(currentThru + 1, 18)

          updated[randomIndex] = {
            ...player,
            score: newScore,
            today: (parseInt(player.today) || 0) + scoreChange,
            thru: newThru >= 18 ? 'F' : newThru,
            lastChange: changeType,
            changeTimestamp: Date.now(),
          }

          newChanges[player.id] = { type: changeType, timestamp: Date.now() }
        }
      }

      // Re-sort by score
      updated.sort((a, b) => {
        const aScore = parseInt(a.score) || 0
        const bScore = parseInt(b.score) || 0
        return aScore - bScore
      })

      // Update positions and check for my player movements
      updated.forEach((player, idx) => {
        const newPosition = idx + 1
        const oldPosition = previousPositionsRef.current[player.id]

        if (oldPosition && oldPosition !== newPosition) {
          player.positionChange = oldPosition - newPosition // positive = moved up
        }

        // Notify if my player moved significantly
        if (myPlayerIds.includes(player.id) && player.positionChange) {
          if (player.positionChange > 0) {
            notify.success(
              `${player.name} Moving Up!`,
              `Now in ${newPosition}${getOrdinalSuffix(newPosition)} place`
            )
          } else if (player.positionChange < -3) {
            notify.warning(
              `${player.name} Dropping`,
              `Fell to ${newPosition}${getOrdinalSuffix(newPosition)} place`
            )
          }
        }

        previousPositionsRef.current[player.id] = newPosition
      })

      // Update position display
      updated.forEach((player, idx) => {
        const pos = idx + 1
        if (pos === 1) player.position = '1st'
        else if (pos === 2) player.position = '2nd'
        else if (pos === 3) player.position = '3rd'
        else player.position = `T${pos}`
      })

      setRecentChanges(prev => ({ ...prev, ...newChanges }))

      return updated
    })
  }, [myPlayerIds, notify])

  // Start/stop simulation
  useEffect(() => {
    if (isLive && enabled) {
      // Initial delay before first update
      const initialDelay = setTimeout(() => {
        simulateScoreChange()
        // Then update every 8-15 seconds
        intervalRef.current = setInterval(() => {
          simulateScoreChange()
        }, 8000 + Math.random() * 7000)
      }, 3000)

      return () => {
        clearTimeout(initialDelay)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [isLive, enabled, simulateScoreChange])

  // Clear old changes after animation
  useEffect(() => {
    const timeout = setTimeout(() => {
      setRecentChanges(prev => {
        const now = Date.now()
        const filtered = {}
        Object.entries(prev).forEach(([id, change]) => {
          if (now - change.timestamp < 3000) {
            filtered[id] = change
          }
        })
        return filtered
      })
    }, 3000)

    return () => clearTimeout(timeout)
  }, [recentChanges])

  // Update leaderboard when initial data changes
  useEffect(() => {
    if (initialLeaderboard) {
      setLeaderboard(initialLeaderboard)
    }
  }, [initialLeaderboard])

  const toggleLive = useCallback(() => {
    setIsLive(prev => !prev)
  }, [])

  return {
    leaderboard,
    recentChanges,
    isLive,
    toggleLive,
    triggerUpdate: simulateScoreChange,
  }
}

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

export default useLiveScoring
