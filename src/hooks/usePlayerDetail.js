import { useState, useCallback } from 'react'

export const usePlayerDetail = () => {
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openPlayerDetail = useCallback((player) => {
    setSelectedPlayer(player)
    setIsModalOpen(true)
  }, [])

  const closePlayerDetail = useCallback(() => {
    setIsModalOpen(false)
    // Delay clearing player data to allow close animation
    setTimeout(() => setSelectedPlayer(null), 200)
  }, [])

  return {
    selectedPlayer,
    isModalOpen,
    openPlayerDetail,
    closePlayerDetail,
  }
}

export default usePlayerDetail
