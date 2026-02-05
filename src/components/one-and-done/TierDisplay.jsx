const TierDisplay = ({ tiers, currentPlayerRank = null }) => {
  const tierColors = [
    { bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', text: 'text-yellow-400' },
    { bg: 'bg-purple-400/10', border: 'border-purple-400/30', text: 'text-purple-400' },
    { bg: 'bg-blue-400/10', border: 'border-blue-400/30', text: 'text-blue-400' },
    { bg: 'bg-green-400/10', border: 'border-green-400/30', text: 'text-green-400' },
  ]

  // Find current player's tier
  const getCurrentTier = (rank) => {
    if (!rank) return null
    for (let i = 0; i < tiers.length; i++) {
      if (tiers[i].maxRank === null || rank <= tiers[i].maxRank) {
        return i
      }
    }
    return tiers.length - 1
  }

  const activeTier = getCurrentTier(currentPlayerRank)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiers.map((tier, index) => {
        const colors = tierColors[index] || tierColors[tierColors.length - 1]
        const isActive = activeTier === index
        const prevMax = index > 0 ? tiers[index - 1].maxRank : 0
        const rankRange = tier.maxRank
          ? `${prevMax + 1}-${tier.maxRank}`
          : `${prevMax + 1}+`

        return (
          <div
            key={tier.tier}
            className={`p-4 rounded-lg border transition-all ${colors.bg} ${colors.border} ${
              isActive ? 'ring-2 ring-white scale-105' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold ${colors.text}`}>
                Tier {tier.tier}
              </span>
              <span className={`text-lg font-bold ${colors.text}`}>
                {tier.multiplier}x
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {tier.label || `Rank ${rankRange}`}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default TierDisplay
