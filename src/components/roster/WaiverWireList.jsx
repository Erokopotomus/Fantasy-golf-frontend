import { useState, useMemo } from 'react'
import Card from '../common/Card'
import Input from '../common/Input'
import Button from '../common/Button'

const WaiverWireList = ({
  players,
  roster,
  onClaim,
  loading,
  onViewPlayer,
}) => {
  const [search, setSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [dropPlayer, setDropPlayer] = useState(null)
  const [showClaimModal, setShowClaimModal] = useState(false)

  const filteredPlayers = useMemo(() => {
    if (!search) return players
    const searchLower = search.toLowerCase()
    return players.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.country.toLowerCase().includes(searchLower)
    )
  }, [players, search])

  const handleClaimClick = (player) => {
    setSelectedPlayer(player)
    setShowClaimModal(true)
  }

  const handleClaim = () => {
    onClaim(selectedPlayer.id, dropPlayer?.id)
    setShowClaimModal(false)
    setSelectedPlayer(null)
    setDropPlayer(null)
  }

  const handleCancel = () => {
    setShowClaimModal(false)
    setSelectedPlayer(null)
    setDropPlayer(null)
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Waiver Wire</h3>
          <span className="text-text-muted text-sm">
            {filteredPlayers.length} available
          </span>
        </div>

        <Input
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredPlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-4 p-3 bg-dark-tertiary rounded-lg hover:bg-dark-border transition-colors"
            >
              <button
                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                onClick={() => onViewPlayer?.(player)}
              >
                <div className="w-10 h-10 bg-dark-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{player.countryFlag}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate hover:text-accent-green transition-colors">{player.name}</span>
                    <span className="text-text-muted text-sm">#{player.rank}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-muted">
                    <span>SG: {player.stats?.sgTotal?.toFixed(2) || '—'}</span>
                    <span className="truncate">{player.recentForm?.slice(0, 3).join(', ') || '—'}</span>
                  </div>
                </div>
              </button>
              <Button
                size="sm"
                onClick={() => handleClaimClick(player)}
              >
                Claim
              </Button>
            </div>
          ))}

          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              No players found
            </div>
          )}
        </div>
      </Card>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Claim Player</h3>

            <div className="bg-dark-tertiary rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedPlayer?.countryFlag}</span>
                <div>
                  <p className="text-white font-medium">{selectedPlayer?.name}</p>
                  <p className="text-text-muted text-sm">
                    Rank #{selectedPlayer?.rank} • SG: {selectedPlayer?.stats?.sgTotal?.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {roster.length > 0 && (
              <div className="mb-4">
                <label className="block text-text-secondary text-sm mb-2">
                  Drop player (optional)
                </label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  <button
                    onClick={() => setDropPlayer(null)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      !dropPlayer ? 'bg-accent-green/20 border border-accent-green' : 'bg-dark-tertiary hover:bg-dark-border'
                    }`}
                  >
                    <span className="text-text-muted">No drop (add to roster)</span>
                  </button>
                  {roster.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setDropPlayer(player)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        dropPlayer?.id === player.id
                          ? 'bg-red-500/20 border border-red-500'
                          : 'bg-dark-tertiary hover:bg-dark-border'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{player.countryFlag}</span>
                        <span className="text-white">{player.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleClaim} loading={loading} className="flex-1">
                Confirm Claim
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

export default WaiverWireList
