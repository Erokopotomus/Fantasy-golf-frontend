import { useState, useEffect } from 'react'
import Card from '../common/Card'
import Button from '../common/Button'

const LineupEditor = ({
  roster,
  activeLineup,
  maxActive,
  tournament,
  isLocked,
  onSave,
  loading,
  saved,
}) => {
  const [selectedIds, setSelectedIds] = useState(activeLineup)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setSelectedIds(activeLineup)
  }, [activeLineup])

  useEffect(() => {
    const changed = selectedIds.length !== activeLineup.length ||
      selectedIds.some(id => !activeLineup.includes(id))
    setHasChanges(changed)
  }, [selectedIds, activeLineup])

  const togglePlayer = (playerId) => {
    if (isLocked) return

    setSelectedIds(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId)
      }
      if (prev.length >= maxActive) {
        return prev
      }
      return [...prev, playerId]
    })
  }

  const handleSave = () => {
    onSave(selectedIds)
  }

  const handleReset = () => {
    setSelectedIds(activeLineup)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold font-display text-white">Set Lineup</h3>
          <p className="text-text-muted text-sm">
            {tournament?.name || 'Upcoming Tournament'}
          </p>
        </div>
        {isLocked && (
          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm">
            Lineup Locked
          </span>
        )}
      </div>

      {isLocked ? (
        <div className="text-center py-6 bg-dark-tertiary rounded-lg">
          <svg className="w-12 h-12 text-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-text-muted">
            Lineup is locked for this tournament
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-muted">Selected</span>
              <span className={`font-medium ${
                selectedIds.length === maxActive ? 'text-gold' : 'text-white'
              }`}>
                {selectedIds.length} / {maxActive}
              </span>
            </div>
            <div className="h-2 bg-dark-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-300"
                style={{ width: `${(selectedIds.length / maxActive) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {roster.map((player) => {
              const isSelected = selectedIds.includes(player.id)
              const isDisabled = !isSelected && selectedIds.length >= maxActive

              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  disabled={isDisabled}
                  className={`
                    p-3 rounded-lg text-left transition-all
                    ${isSelected
                      ? 'bg-gold/20 border-2 border-gold'
                      : isDisabled
                        ? 'bg-dark-tertiary opacity-50 cursor-not-allowed'
                        : 'bg-dark-tertiary border-2 border-transparent hover:border-text-muted'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{player.countryFlag}</span>
                    <span className={`text-sm font-medium truncate ${
                      isSelected ? 'text-gold' : 'text-white'
                    }`}>
                      {player.name.split(' ').pop()}
                    </span>
                  </div>
                  <p className="text-text-muted text-xs">
                    #{player.rank} • SG {player.stats?.sgTotal?.toFixed(1) || '—'}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="flex gap-3">
            {hasChanges && (
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            )}
            <Button
              fullWidth
              onClick={handleSave}
              loading={loading}
              disabled={!hasChanges || selectedIds.length !== maxActive}
            >
              {saved ? 'Saved!' : 'Save Lineup'}
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

export default LineupEditor
