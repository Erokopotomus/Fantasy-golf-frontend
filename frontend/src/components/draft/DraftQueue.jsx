import { useState } from 'react'
import Card from '../common/Card'
import Button from '../common/Button'

const DraftQueue = ({ queue, onRemove, onReorder, onSelect, isUserTurn }) => {
  const [draggedIndex, setDraggedIndex] = useState(null)

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newQueue = [...queue]
    const [draggedItem] = newQueue.splice(draggedIndex, 1)
    newQueue.splice(index, 0, draggedItem)
    onReorder(newQueue)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const moveItem = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= queue.length) return

    const newQueue = [...queue]
    const [item] = newQueue.splice(index, 1)
    newQueue.splice(newIndex, 0, item)
    onReorder(newQueue)
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-display text-white">My Queue</h3>
        <span className="text-text-muted text-sm">
          {queue.length} {queue.length === 1 ? 'player' : 'players'}
        </span>
      </div>

      {queue.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center py-8">
          <div>
            <div className="w-12 h-12 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </div>
            <p className="text-text-muted text-sm">
              Add players to your queue
            </p>
            <p className="text-text-muted text-xs mt-1">
              They'll auto-pick if you run out of time
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {queue.map((player, index) => (
            <div
              key={player.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 p-2 bg-dark-tertiary rounded-lg cursor-move
                transition-all duration-200
                ${draggedIndex === index ? 'opacity-50 scale-95' : 'hover:bg-dark-border'}
              `}
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="text-text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveItem(index, 1)}
                  disabled={index === queue.length - 1}
                  className="text-text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <span className="text-text-muted text-sm font-medium w-6">
                {index + 1}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span>{player.countryFlag}</span>
                  <span className="text-white font-medium truncate">{player.name}</span>
                </div>
                <p className="text-text-muted text-xs">
                  Rank #{player.rank} • SG: {player.stats?.sgTotal?.toFixed(2) || '—'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isUserTurn && (
                  <Button size="sm" onClick={() => onSelect(player)}>
                    Draft
                  </Button>
                )}
                <button
                  onClick={() => onRemove(player.id)}
                  className="text-text-muted hover:text-red-500 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default DraftQueue
