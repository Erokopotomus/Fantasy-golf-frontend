import { useState, useMemo } from 'react'
import Card from '../common/Card'

const PlayerPicker = ({
  players = [],
  usedPlayers = [],
  tiers = [],
  onSelectPlayer,
  loading,
  selectedPlayer = null,
}) => {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true)

  const tierColors = [
    { bg: 'bg-yellow-400/10', border: 'border-yellow-400', text: 'text-yellow-400' },
    { bg: 'bg-purple-400/10', border: 'border-purple-400', text: 'text-purple-400' },
    { bg: 'bg-blue-400/10', border: 'border-blue-400', text: 'text-blue-400' },
    { bg: 'bg-green-400/10', border: 'border-green-400', text: 'text-green-400' },
  ]

  // Get tier for a player
  const getPlayerTier = (playerRank) => {
    for (let i = 0; i < tiers.length; i++) {
      if (tiers[i].maxRank === null || playerRank <= tiers[i].maxRank) {
        return { ...tiers[i], index: i }
      }
    }
    return { ...tiers[tiers.length - 1], index: tiers.length - 1 }
  }

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    return players
      .map(p => ({ ...p, tier: getPlayerTier(p.rank) }))
      .filter(p => {
        // Search filter
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
          return false
        }

        // Availability filter
        if (showOnlyAvailable && usedPlayers.includes(p.id)) {
          return false
        }

        // Tier filter
        if (tierFilter !== 'all' && p.tier.tier !== parseInt(tierFilter)) {
          return false
        }

        return true
      })
      .sort((a, b) => a.rank - b.rank)
  }, [players, search, showOnlyAvailable, tierFilter, usedPlayers, tiers])

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white mb-4">Select Your Pick</h3>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-text-muted focus:border-accent-green focus:outline-none"
          />
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-green focus:outline-none"
        >
          <option value="all">All Tiers</option>
          {tiers.map(tier => (
            <option key={tier.tier} value={tier.tier}>
              Tier {tier.tier} ({tier.multiplier}x)
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 p-2 bg-dark-tertiary rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyAvailable}
            onChange={(e) => setShowOnlyAvailable(e.target.checked)}
            className="rounded text-accent-green"
          />
          <span className="text-sm text-text-secondary whitespace-nowrap">Available only</span>
        </label>
      </div>

      {/* Player List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            No players found matching your criteria
          </div>
        ) : (
          filteredPlayers.map(player => {
            const isUsed = usedPlayers.includes(player.id)
            const isSelected = selectedPlayer?.id === player.id
            const colors = tierColors[player.tier.index] || tierColors[tierColors.length - 1]

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => !isUsed && onSelectPlayer(player)}
                disabled={isUsed || loading}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                  isUsed
                    ? 'bg-dark-tertiary opacity-40 cursor-not-allowed'
                    : isSelected
                    ? `${colors.bg} border-2 ${colors.border}`
                    : 'bg-dark-tertiary hover:bg-dark-primary border-2 border-transparent'
                }`}
              >
                {/* Rank */}
                <div className="text-lg font-bold text-text-muted w-8 text-center">
                  {player.rank}
                </div>

                {/* Flag & Name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xl">{player.countryFlag || '🏌️'}</span>
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${isUsed ? 'text-text-muted' : 'text-white'}`}>
                      {player.name}
                    </p>
                    <p className="text-xs text-text-muted">{player.country}</p>
                  </div>
                </div>

                {/* Tier Badge */}
                <div className={`px-2 py-1 rounded ${colors.bg}`}>
                  <span className={`text-xs font-medium ${colors.text}`}>
                    {player.tier.multiplier}x
                  </span>
                </div>

                {/* Status */}
                {isUsed ? (
                  <span className="text-xs text-red-400 font-medium px-2 py-0.5 bg-red-400/10 rounded">
                    USED
                  </span>
                ) : isSelected ? (
                  <span className="text-xs text-accent-green font-medium px-2 py-0.5 bg-accent-green/10 rounded">
                    SELECTED
                  </span>
                ) : (
                  <div className="w-16" />
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Selected Player Summary */}
      {selectedPlayer && (
        <div className="mt-4 pt-4 border-t border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Selected:</p>
              <p className="text-white font-medium">{selectedPlayer.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Multiplier:</p>
              <p className={`font-bold ${tierColors[selectedPlayer.tier?.index || 0]?.text || 'text-white'}`}>
                {selectedPlayer.tier?.multiplier || 1}x
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default PlayerPicker
