import { useState, useCallback, useMemo } from 'react'

export const usePlayerComparison = (maxPlayers = 5) => {
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
  // Supports both flat fields (p.sgTotal) and nested (p.stats?.sgTotal)
  const comparisonData = useMemo(() => {
    if (selectedPlayers.length < 2) return null

    const stats = ['sgTotal', 'sgOffTee', 'sgApproach', 'sgAroundGreen', 'sgPutting', 'owgrRank', 'cpi', 'drivingDistance', 'drivingAccuracy', 'gir', 'scoringAvg']
    const lowerIsBetter = new Set(['scoringAvg', 'owgrRank'])

    const getStat = (p, stat) => p[stat] ?? p.stats?.[stat] ?? 0

    const comparison = {}

    stats.forEach(stat => {
      const values = selectedPlayers.map(p => getStat(p, stat))
      // Skip stats where all values are 0 (no data)
      if (values.every(v => v === 0)) return

      const max = Math.max(...values)
      const min = Math.min(...values)
      const range = max - min || 1

      comparison[stat] = selectedPlayers.map(p => {
        const value = getStat(p, stat)
        const percentile = lowerIsBetter.has(stat)
          ? ((max - value) / range) * 100
          : ((value - min) / range) * 100
        return {
          playerId: p.id,
          value,
          percentile: range === 0 ? 50 : percentile,
          isBest: lowerIsBetter.has(stat) ? value === min : value === max,
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
