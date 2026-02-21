import { useState, useEffect } from 'react'
import Card from '../../common/Card'
import {
  STANDARD_CONFIG,
  DRAFTKINGS_CONFIG,
  getDefaultScoringConfig,
  POSITION_LABELS,
  HOLE_SCORING_LABELS,
  BONUS_LABELS,
  calculatePreviewPoints,
} from '../../../utils/scoringPresets'

const PRESETS = [
  {
    key: 'standard',
    name: 'Standard',
    desc: 'Position-heavy scoring with birdie/eagle bonuses',
    color: 'green',
    config: STANDARD_CONFIG,
  },
  {
    key: 'draftkings',
    name: 'DraftKings',
    desc: 'Hole-scoring focused with smaller position bonus',
    color: 'blue',
    config: DRAFTKINGS_CONFIG,
  },
  {
    key: 'custom',
    name: 'Custom',
    desc: 'Set your own point values for every category',
    color: 'purple',
    config: null,
  },
]

const ScoringSettings = ({ settings, onChange }) => {
  const savedConfig = settings?.scoringConfig
  const [config, setConfig] = useState(() => {
    if (savedConfig && savedConfig.preset) {
      return JSON.parse(JSON.stringify(savedConfig))
    }
    return getDefaultScoringConfig('standard')
  })

  const [preview, setPreview] = useState(() => calculatePreviewPoints(config))

  useEffect(() => {
    setPreview(calculatePreviewPoints(config))
  }, [config])

  const isCustom = config.preset === 'custom'

  const handlePresetSelect = (presetKey) => {
    let newConfig
    if (presetKey === 'custom') {
      newConfig = { ...JSON.parse(JSON.stringify(config)), preset: 'custom' }
    } else {
      newConfig = getDefaultScoringConfig(presetKey)
    }
    setConfig(newConfig)
    onChange?.({ scoringConfig: newConfig, scoringPreset: presetKey })
  }

  const updateConfig = (path, value) => {
    const newConfig = JSON.parse(JSON.stringify(config))
    newConfig.preset = 'custom'
    const keys = path.split('.')
    let obj = newConfig
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = value
    setConfig(newConfig)
    onChange?.({ scoringConfig: newConfig, scoringPreset: 'custom' })
  }

  const colorMap = {
    green: { border: 'border-gold', bg: 'bg-gold/10', text: 'text-gold', ring: 'ring-gold' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', ring: 'ring-purple-500' },
  }

  return (
    <div className="space-y-6">
      {/* Preset Selector */}
      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Scoring Preset</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map((p) => {
            const active = config.preset === p.key
            const c = colorMap[p.color]
            return (
              <button
                key={p.key}
                onClick={() => handlePresetSelect(p.key)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  active
                    ? `${c.border} ${c.bg} ring-1 ${c.ring}`
                    : 'border-dark-border bg-dark-tertiary hover:border-dark-border/80'
                }`}
              >
                <p className={`font-semibold ${active ? c.text : 'text-text-primary'}`}>{p.name}</p>
                <p className="text-text-muted text-xs mt-1">{p.desc}</p>
              </button>
            )
          })}
        </div>
        {!isCustom && (
          <button
            onClick={() => handlePresetSelect('custom')}
            className="mt-3 w-full py-2 px-4 rounded-lg border border-dashed border-gold/40 text-gold text-sm font-mono hover:bg-gold/10 hover:border-gold/60 transition-all"
          >
            Customize from {PRESETS.find(p => p.key === config.preset)?.name || 'preset'} →
          </button>
        )}
      </Card>

      {/* Live Preview */}
      <Card className="border-gold/30">
        <h3 className="text-lg font-semibold font-display text-text-primary mb-1">Live Preview</h3>
        <p className="text-text-muted text-xs mb-4">
          Example: 5th place finish, 22 birdies, 2 eagles, 38 pars, 8 bogeys, 1 double, 1 bogey-free round, 1 birdie streak
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-dark-primary rounded-lg p-3 text-center">
            <p className="text-text-muted text-xs mb-1">Position</p>
            <p className="text-xl font-bold font-display text-gold">{preview.position}</p>
          </div>
          <div className="bg-dark-primary rounded-lg p-3 text-center">
            <p className="text-text-muted text-xs mb-1">Holes</p>
            <p className="text-xl font-bold font-display text-blue-400">{preview.holes}</p>
          </div>
          <div className="bg-dark-primary rounded-lg p-3 text-center">
            <p className="text-text-muted text-xs mb-1">Bonuses</p>
            <p className="text-xl font-bold font-display text-purple-400">{preview.bonuses}</p>
          </div>
          <div className="bg-dark-primary rounded-lg p-3 text-center">
            <p className="text-text-muted text-xs mb-1">SG</p>
            <p className="text-xl font-bold font-display text-yellow-400">{preview.strokesGained}</p>
          </div>
          <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-center">
            <p className="text-text-muted text-xs mb-1">Total</p>
            <p className="text-2xl font-bold font-display text-gold">{preview.total}</p>
          </div>
        </div>
      </Card>

      {/* Position Points */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold font-display text-text-primary">Position Points</h3>
          {!isCustom && (
            <span className="text-[10px] font-mono text-text-muted bg-dark-tertiary px-2 py-0.5 rounded">
              {config.preset?.toUpperCase()} PRESET
            </span>
          )}
        </div>
        <p className="text-text-muted text-xs mb-4">Points awarded based on final tournament placement</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {Object.entries(POSITION_LABELS).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
              <input
                type="number"
                step="0.5"
                value={config.positionPoints[key] ?? 0}
                onChange={(e) => updateConfig(`positionPoints.${key}`, parseFloat(e.target.value) || 0)}
                disabled={!isCustom}
                className={`w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary text-center text-sm focus:border-gold focus:outline-none ${
                  !isCustom ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Hole Scoring */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold font-display text-text-primary">Hole Scoring</h3>
          {!isCustom && (
            <span className="text-[10px] font-mono text-text-muted bg-dark-tertiary px-2 py-0.5 rounded">
              {config.preset?.toUpperCase()} PRESET
            </span>
          )}
        </div>
        <p className="text-text-muted text-xs mb-4">Points per individual hole result (accumulated across all rounds)</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(HOLE_SCORING_LABELS).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
              <input
                type="number"
                step="0.5"
                value={config.holeScoring[key] ?? 0}
                onChange={(e) => updateConfig(`holeScoring.${key}`, parseFloat(e.target.value) || 0)}
                disabled={!isCustom}
                className={`w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary text-center text-sm focus:border-gold focus:outline-none ${
                  !isCustom ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Bonuses */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold font-display text-text-primary">Bonuses</h3>
          {!isCustom && (
            <span className="text-[10px] font-mono text-text-muted bg-dark-tertiary px-2 py-0.5 rounded">
              {config.preset?.toUpperCase()} PRESET
            </span>
          )}
        </div>
        <p className="text-text-muted text-xs mb-4">Extra points for exceptional round performance</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(BONUS_LABELS).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
              <input
                type="number"
                step="0.5"
                value={config.bonuses[key] ?? 0}
                onChange={(e) => updateConfig(`bonuses.${key}`, parseFloat(e.target.value) || 0)}
                disabled={!isCustom}
                className={`w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary text-center text-sm focus:border-gold focus:outline-none ${
                  !isCustom ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Strokes Gained */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold font-display text-text-primary">Strokes Gained</h3>
          {!isCustom && (
            <span className="text-[10px] font-mono text-text-muted bg-dark-tertiary px-2 py-0.5 rounded">
              {config.preset?.toUpperCase()} PRESET
            </span>
          )}
        </div>
        <p className="text-text-muted text-xs mb-4">Award points based on strokes gained metrics</p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.strokesGained?.enabled || false}
              onChange={(e) => updateConfig('strokesGained.enabled', e.target.checked)}
              disabled={!isCustom}
              className="rounded border-dark-border text-gold focus:ring-gold"
            />
            <span className="text-sm text-text-primary">Enable SG scoring</span>
          </label>
          {config.strokesGained?.enabled && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted">Multiplier:</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={config.strokesGained.multiplier || 5}
                onChange={(e) => updateConfig('strokesGained.multiplier', parseFloat(e.target.value) || 0)}
                disabled={!isCustom}
                className={`w-20 p-2 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary text-center text-sm focus:border-gold focus:outline-none ${
                  !isCustom ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>
          )}
        </div>
      </Card>

    </div>
  )
}

export default ScoringSettings
