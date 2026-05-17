import { useState } from 'react'
import Card from '../../common/Card'

const ChoppedSettings = ({ settings, onChange, leagueSettings, sport }) => {
  const [localSettings, setLocalSettings] = useState({
    chopsPerWeek: settings?.chopsPerWeek || 1,
    manualChopEnabled: settings?.manualChopEnabled ?? true,
    autoChopFallback: settings?.autoChopFallback ?? true,
    minTeamsToStart: settings?.minTeamsToStart || 4,
  })

  const handleChange = (key, value) => {
    let updated = { ...localSettings, [key]: value }
    // If Manual Chop is OFF, force Auto-Chop Fallback ON (chops must still happen)
    if (key === 'manualChopEnabled' && value === false) {
      updated.autoChopFallback = true
    }
    setLocalSettings(updated)
    onChange?.(updated)
  }

  const autoChopDisabled = !localSettings.manualChopEnabled

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Chop Rules</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Chops Per Week
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleChange('chopsPerWeek', num)}
                  className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                    localSettings.chopsPerWeek === num
                      ? 'border-gold bg-gold/10 text-text-primary'
                      : 'border-[var(--card-border)] bg-[var(--bg-alt)] text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {num} Team{num > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              The {localSettings.chopsPerWeek === 1 ? 'team' : 'teams'} with the lowest score each week {localSettings.chopsPerWeek === 1 ? 'is' : 'are'} Chopped
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Commissioner Controls</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[var(--bg-alt)] rounded-lg">
            <div className="pr-4">
              <p className="text-text-primary font-medium">Manual Chop Override</p>
              <p className="text-xs text-text-muted mt-1">
                Commissioner reviews bottom team(s) at waiver close and confirms chop. Auto-fallback fires at waiver close if commish doesn't act.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('manualChopEnabled', !localSettings.manualChopEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                localSettings.manualChopEnabled ? 'bg-gold' : 'bg-[var(--card-border)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-alt)] transition-transform ${
                  localSettings.manualChopEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className={`flex items-center justify-between p-4 bg-[var(--bg-alt)] rounded-lg ${autoChopDisabled ? 'opacity-60' : ''}`}>
            <div className="pr-4">
              <p className="text-text-primary font-medium">Auto-Chop Fallback</p>
              <p className="text-xs text-text-muted mt-1">
                {autoChopDisabled
                  ? 'Required when Manual Chop is off — system must chop each week'
                  : 'System auto-chops the lowest-scoring team if commissioner doesn\'t act by waiver close'}
              </p>
            </div>
            <button
              type="button"
              disabled={autoChopDisabled}
              onClick={() => handleChange('autoChopFallback', !localSettings.autoChopFallback)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                localSettings.autoChopFallback ? 'bg-gold' : 'bg-[var(--card-border)]'
              } ${autoChopDisabled ? 'cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-alt)] transition-transform ${
                  localSettings.autoChopFallback ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      <div className="bg-[var(--bg-alt)] rounded-lg p-4 border border-[var(--card-border)]">
        <h4 className="text-sm font-medium text-text-primary mb-2">How Chopped Works</h4>
        <ul className="text-xs text-text-muted space-y-1">
          <li>- Each NFL week, the lowest-scoring team is Chopped (eliminated)</li>
          <li>- Chopped teams release their full roster instantly to the waiver pool</li>
          <li>- Survivors bid FAAB blind auction on released players</li>
          <li>- Continues until one team remains — the Champion {'🏆'}</li>
          <li>- Minimum 4 teams to start. Recommended 8+ for a full season arc.</li>
        </ul>
      </div>

      {/* Visual representation of chopped progression */}
      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Season Preview</h3>
        <div className="flex items-center justify-between text-xs">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold flex items-center justify-center mb-1">
              <span className="text-gold font-bold">14</span>
            </div>
            <span className="text-text-muted">Start</span>
          </div>
          <div className="flex-1 h-0.5 bg-[var(--card-border)] mx-2 relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-text-muted text-xs bg-[var(--surface)] px-2">
              Weekly chops
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-crown/20 border border-crown flex items-center justify-center mb-1">
              <span className="text-crown font-bold">1</span>
            </div>
            <span className="text-text-muted">Champion</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ChoppedSettings
