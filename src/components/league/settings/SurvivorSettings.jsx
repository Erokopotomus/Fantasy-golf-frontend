import { useState } from 'react'
import Card from '../../common/Card'

const SurvivorSettings = ({ settings, onChange }) => {
  const [localSettings, setLocalSettings] = useState({
    eliminationsPerWeek: settings?.eliminationsPerWeek || 1,
    buyBacks: settings?.buyBacks || { allowed: true, max: 1 },
  })

  const handleChange = (key, value) => {
    const updated = { ...localSettings, [key]: value }
    setLocalSettings(updated)
    onChange?.(updated)
  }

  const handleBuyBackChange = (key, value) => {
    const updated = {
      ...localSettings,
      buyBacks: { ...localSettings.buyBacks, [key]: value }
    }
    setLocalSettings(updated)
    onChange?.(updated)
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Elimination Rules</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Eliminations Per Week
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleChange('eliminationsPerWeek', num)}
                  className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                    localSettings.eliminationsPerWeek === num
                      ? 'border-accent-green bg-accent-green/10 text-white'
                      : 'border-dark-border bg-dark-tertiary text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {num} Team{num > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              The {localSettings.eliminationsPerWeek === 1 ? 'team' : 'teams'} with the lowest score each week {localSettings.eliminationsPerWeek === 1 ? 'is' : 'are'} eliminated
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Buy-Back Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dark-tertiary rounded-lg">
            <div>
              <p className="text-white font-medium">Allow Buy-Backs</p>
              <p className="text-xs text-text-muted">Eliminated teams can re-enter the competition</p>
            </div>
            <button
              type="button"
              onClick={() => handleBuyBackChange('allowed', !localSettings.buyBacks.allowed)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.buyBacks.allowed ? 'bg-accent-green' : 'bg-dark-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.buyBacks.allowed ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {localSettings.buyBacks.allowed && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Maximum Buy-Backs Per Team
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleBuyBackChange('max', num)}
                    className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                      localSettings.buyBacks.max === num
                        ? 'border-accent-green bg-accent-green/10 text-white'
                        : 'border-dark-border bg-dark-tertiary text-text-secondary hover:border-text-muted'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="bg-dark-tertiary rounded-lg p-4 border border-dark-border">
        <h4 className="text-sm font-medium text-white mb-2">How Survivor Works</h4>
        <ul className="text-xs text-text-muted space-y-1">
          <li>- After each tournament, the lowest-scoring team is eliminated</li>
          <li>- Eliminations continue weekly until one team remains</li>
          <li>- The last team standing wins the league</li>
          {localSettings.buyBacks.allowed && (
            <li className="text-accent-green">- Eliminated teams can use a buy-back to rejoin (max {localSettings.buyBacks.max})</li>
          )}
        </ul>
      </div>

      {/* Visual representation of survivor progression */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Season Preview</h3>
        <div className="flex items-center justify-between text-xs">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-accent-green/20 border border-accent-green flex items-center justify-center mb-1">
              <span className="text-accent-green font-bold">10</span>
            </div>
            <span className="text-text-muted">Start</span>
          </div>
          <div className="flex-1 h-0.5 bg-dark-border mx-2 relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-text-muted text-xs bg-dark-secondary px-2">
              Weekly eliminations
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center justify-center mb-1">
              <span className="text-yellow-500 font-bold">1</span>
            </div>
            <span className="text-text-muted">Winner</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default SurvivorSettings
