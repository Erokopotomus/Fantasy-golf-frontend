import { useState, useCallback, useMemo } from 'react'

export const usePlayerComparison = (maxPlayers = 3) => {
  const [selectedPlayers, setSelectedPlayers] = useState([])

  const addPlayer = useCallback((player) => {
    setSelectedPlayers(prev => {
      if (prev.length >= maxPlayers) return prev
      if (prev.find(p => p.id === player.id)) return prev
      return [...prev, player]
    })
  }, [maxPlayers])

  const removePlayer = useCallback((playerId) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId))
  }, [])

  const clearAll = useCallback(() => {
    setSelectedPlayers([])
  }, [])

  const isSelected = useCallback((playerId) => {
    return selectedPlayers.some(p => p.id === playerId)
  }, [selectedPlayers])

  const togglePlayer = useCallback((player) => {
    if (isSelected(player.id)) {
      removePlayer(player.id)
    } else {
      addPlayer(player)
    }
  }, [isSelected, removePlayer, addPlayer])

  // Calculate comparison stats with percentiles
  const comparisonData = useMemo(() => {
    if (selectedPlayers.length < 2) return null

    const stats = ['sgTotal', 'sgOffTee', 'sgApproach', 'sgAroundGreen', 'sgPutting', 'drivingDistance', 'drivingAccuracy', 'gir', 'scoringAvg']

    const comparison = {}

    stats.forEach(stat => {
      const values = selectedPlayers.map(p => p.stats?.[stat] || 0)
      const max = Math.max(...values)
      const min = Math.min(...values)
      const range = max - min || 1

      comparison[stat] = selectedPlayers.map(p => {
        const value = p.stats?.[stat] || 0
        // For scoring avg, lower is better
        const percentile = stat === 'scoringAvg'
          ? ((max - value) / range) * 100
          : ((value - min) / range) * 100
        return {
          playerId: p.id,
          value,
          percentile: range === 0 ? 50 : percentile,
          isBest: stat === 'scoringAvg' ? value === min : value === max,
        }
      })
    })

    return comparison
  }, [selectedPlayers])

  return {
    selectedPlayers,
    addPlayer,
    removePlayer,
    clearAll,
    isSelected,
    togglePlayer,
    comparisonData,
    canAddMore: selectedPlayers.length < maxPlayers,
    canCompare: selectedPlayers.length >= 2,
  }
}

export default usePlayerComparison
