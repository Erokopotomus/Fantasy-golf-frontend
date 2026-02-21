import { useState } from 'react'
import Card from '../../common/Card'

const OneAndDoneSettings = ({ settings, onChange }) => {
  const [localSettings, setLocalSettings] = useState({
    tiers: settings?.tiers || [
      { tier: 1, maxRank: 10, multiplier: 1.0 },
      { tier: 2, maxRank: 30, multiplier: 1.25 },
      { tier: 3, maxRank: 60, multiplier: 1.5 },
      { tier: 4, maxRank: null, multiplier: 2.0 },
    ],
    majorMultiplier: settings?.majorMultiplier || 1.5,
  })

  const handleTierChange = (tierIndex, field, value) => {
    const updated = {
      ...localSettings,
      tiers: localSettings.tiers.map((tier, i) =>
        i === tierIndex ? { ...tier, [field]: value } : tier
      ),
    }
    setLocalSettings(updated)
    onChange?.(updated)
  }

  const handleMajorMultiplierChange = (value) => {
    const updated = { ...localSettings, majorMultiplier: parseFloat(value) }
    setLocalSettings(updated)
    onChange?.(updated)
  }

  const tierColors = ['text-yellow-400', 'text-purple-400', 'text-blue-400', 'text-green-400']
  const tierBgColors = ['bg-yellow-400/10 border-yellow-400/30', 'bg-purple-400/10 border-purple-400/30', 'bg-blue-400/10 border-blue-400/30', 'bg-green-400/10 border-green-400/30']

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-2">Player Tiers</h3>
        <p className="text-sm text-text-muted mb-4">
          Players are grouped into tiers based on world ranking. Lower-tier players earn higher multipliers.
        </p>

        <div className="space-y-3">
          {localSettings.tiers.map((tier, index) => (
            <div
              key={tier.tier}
              className={`p-4 rounded-lg border ${tierBgColors[index]}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold ${tierColors[index]}`}>
                  Tier {tier.tier}
                </span>
                <span className={`text-sm px-2 py-1 rounded ${tierColors[index]} bg-dark-primary`}>
                  {tier.multiplier}x Points
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    {index === 0 ? 'Rank Range' : 'Max World Rank'}
                  </label>
                  {index === localSettings.tiers.length - 1 ? (
                    <div className="p-2 bg-dark-primary rounded text-sm text-text-secondary">
                      {localSettings.tiers[index - 1].maxRank + 1}+
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={index === 0 ? 1 : localSettings.tiers[index - 1].maxRank + 1}
                      value={tier.maxRank || ''}
                      onChange={(e) => handleTierChange(index, 'maxRank', parseInt(e.target.value) || null)}
                      className="w-full p-2 bg-dark-primary border border-dark-border rounded text-text-primary text-sm focus:border-gold focus:outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Multiplier</label>
                  <select
                    value={tier.multiplier}
                    onChange={(e) => handleTierChange(index, 'multiplier', parseFloat(e.target.value))}
                    className="w-full p-2 bg-dark-primary border border-dark-border rounded text-text-primary text-sm focus:border-gold focus:outline-none"
                  >
                    <option value={1.0}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={1.75}>1.75x</option>
                    <option value={2.0}>2.0x</option>
                    <option value={2.5}>2.5x</option>
                    <option value={3.0}>3.0x</option>
                  </select>
                </div>
              </div>

              <div className="mt-2 text-xs text-text-muted">
                {index === 0 && `Ranks 1-${tier.maxRank}`}
                {index > 0 && index < localSettings.tiers.length - 1 && `Ranks ${localSettings.tiers[index - 1].maxRank + 1}-${tier.maxRank}`}
                {index === localSettings.tiers.length - 1 && `Ranks ${localSettings.tiers[index - 1].maxRank + 1}+`}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Major Tournament Bonus</h3>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Major Championship Multiplier
          </label>
          <select
            value={localSettings.majorMultiplier}
            onChange={(e) => handleMajorMultiplierChange(e.target.value)}
            className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary focus:border-gold focus:outline-none"
          >
            <option value={1.0}>1.0x (No Bonus)</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2.0x</option>
          </select>
          <p className="text-xs text-text-muted mt-2">
            Points earned during The Masters, PGA Championship, US Open, and The Open are multiplied by this amount
          </p>
        </div>
      </Card>

      <div className="bg-dark-tertiary rounded-lg p-4 border border-dark-border">
        <h4 className="text-sm font-medium text-text-primary mb-2">How One & Done Works</h4>
        <ul className="text-xs text-text-muted space-y-1">
          <li>- Pick any golfer for each tournament - no draft required</li>
          <li>- Once you pick a player, you cannot use them again all season</li>
          <li>- Strategic player management is key to success</li>
          <li>- Tier multipliers reward picking lower-ranked players</li>
        </ul>

        <div className="mt-4 pt-3 border-t border-dark-border">
          <h5 className="text-xs font-medium text-text-primary mb-2">Example Points Calculation</h5>
          <div className="bg-dark-primary rounded p-3 text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-text-muted">Scottie Scheffler (Tier 1) wins tournament</span>
              <span className="text-text-primary">100 pts x 1.0x = <span className="text-gold">100 pts</span></span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Sahith Theegala (Tier 2) wins tournament</span>
              <span className="text-text-primary">100 pts x 1.25x = <span className="text-gold">125 pts</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OneAndDoneSettings
