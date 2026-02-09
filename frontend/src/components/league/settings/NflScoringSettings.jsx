import { useState, useEffect } from 'react'
import Card from '../../common/Card'
import api from '../../../services/api'

const PRESETS = [
  { key: 'standard', name: 'Standard', desc: 'No points for receptions', color: 'green' },
  { key: 'half_ppr', name: 'Half PPR', desc: 'Half point per reception (most popular)', color: 'blue' },
  { key: 'ppr', name: 'PPR', desc: 'Full point per reception', color: 'purple' },
  { key: 'custom', name: 'Custom', desc: 'Set your own point values', color: 'gold' },
]

const CATEGORY_META = {
  passing:       { label: 'Passing', color: 'text-blue-400' },
  rushing:       { label: 'Rushing', color: 'text-green-400' },
  receiving:     { label: 'Receiving', color: 'text-purple-400' },
  fumbles:       { label: 'Fumbles', color: 'text-red-400' },
  kicking:       { label: 'Kicking', color: 'text-yellow-400' },
  defense:       { label: 'Defense / Special Teams', color: 'text-orange-400' },
  special_teams: { label: 'Special Teams Player', color: 'text-teal-400' },
  bonuses:       { label: 'Bonuses', color: 'text-pink-400' },
  idp:           { label: 'IDP (Individual Defensive Players)', color: 'text-gray-400' },
}

const CATEGORY_ORDER = ['passing', 'rushing', 'receiving', 'fumbles', 'kicking', 'defense', 'special_teams', 'bonuses', 'idp']

const colorMap = {
  green:  { border: 'border-gold', bg: 'bg-gold/10', text: 'text-gold', ring: 'ring-gold' },
  blue:   { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', ring: 'ring-purple-500' },
  gold:   { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400', ring: 'ring-amber-500' },
}

// Example stat line for preview: QB with 280 pass yds, 2 pass TD, 1 INT, 30 rush yds
const PREVIEW_STATS = {
  pass_yd: 280, pass_td: 2, pass_int: 1, pass_2pt: 0, pass_cmp: 22, pass_att: 34,
  pass_inc: 12, pass_sack: 2, pass_fd: 0, pass_td_40p: 0, pass_td_50p: 0,
  rush_yd: 30, rush_td: 0, rush_2pt: 0, rush_att: 5, rush_fd: 0, rush_td_40p: 0, rush_td_50p: 0,
  rec: 0, rec_yd: 0, rec_td: 0, rec_2pt: 0, rec_tgt: 0, rec_fd: 0, rec_td_40p: 0, rec_td_50p: 0,
  fum: 0, fum_lost: 0, fum_rec: 0, fum_rec_td: 0,
  fgm: 0, fgm_0_19: 0, fgm_20_29: 0, fgm_30_39: 0, fgm_40_49: 0, fgm_50p: 0, fgmiss: 0, xpm: 0, xpmiss: 0,
  def_td: 0, sack: 0, int: 0, ff: 0, def_fum_rec: 0, safe: 0, blk_kick: 0, def_2pt: 0,
  pts_allow_0: 0, pts_allow_1_6: 0, pts_allow_7_13: 0, pts_allow_14_20: 0,
  pts_allow_21_27: 0, pts_allow_28_34: 0, pts_allow_35p: 0,
  st_td: 0, pr_yd: 0, kr_yd: 0,
  bonus_pass_yd_300: 0, bonus_pass_yd_400: 0,
  bonus_rush_yd_100: 0, bonus_rush_yd_200: 0,
  bonus_rec_yd_100: 0, bonus_rec_yd_200: 0,
  bonus_rec_te: 0, bonus_rec_rb: 0, bonus_rec_wr: 0,
  idp_tkl_solo: 0, idp_tkl_ast: 0, idp_tkl_loss: 0, idp_sack: 0, idp_qb_hit: 0,
  idp_int: 0, idp_ff: 0, idp_fum_rec: 0, idp_def_td: 0, idp_pass_def: 0, idp_saf: 0, idp_blk_kick: 0,
}

function calcPreview(rules) {
  let total = 0
  total += 280 * (rules.pass_yd || 0)  // 280 pass yards
  total += 2 * (rules.pass_td || 0)    // 2 pass TDs
  total += 1 * (rules.pass_int || 0)   // 1 INT
  total += 2 * (rules.pass_sack || 0)  // 2 sacks taken
  total += 30 * (rules.rush_yd || 0)   // 30 rush yards
  return Math.round(total * 100) / 100
}

const NflScoringSettings = ({ leagueId, onSaved }) => {
  const [schema, setSchema] = useState(null)
  const [rules, setRules] = useState(null)
  const [preset, setPreset] = useState('standard')
  const [presetRules, setPresetRules] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    loadSchema()
  }, [leagueId])

  async function loadSchema() {
    try {
      setLoading(true)
      const data = await api.getNflScoringSchema(leagueId)
      setSchema(data.schema?.categories || data.categories || {})
      setPresetRules(data.presets || {})

      const currentRules = data.currentRules || data.rules || {}
      setRules(currentRules)

      // Detect current preset
      const currentPreset = data.currentPreset || data.preset || detectPreset(currentRules, data.presets || {})
      setPreset(currentPreset)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function detectPreset(currentRules, presets) {
    for (const [name, presetMap] of Object.entries(presets)) {
      const matches = Object.keys(presetMap).every(k =>
        Math.abs((currentRules[k] || 0) - (presetMap[k] || 0)) < 0.001
      )
      if (matches) return name
    }
    return 'custom'
  }

  function handlePresetSelect(key) {
    if (key === 'custom') {
      setPreset('custom')
      setDirty(true)
      return
    }
    const newRules = presetRules[key] || {}
    setRules({ ...newRules })
    setPreset(key)
    setDirty(true)
  }

  function handleRuleChange(key, value) {
    const numVal = parseFloat(value)
    if (isNaN(numVal)) return
    setRules(prev => ({ ...prev, [key]: numVal }))
    setPreset('custom')
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.updateNflScoring(leagueId, {
        preset: preset === 'custom' ? null : preset,
        rules: preset === 'custom' ? rules : undefined,
      })
      setDirty(false)
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function toggleCategory(cat) {
    setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
          <span className="ml-3 text-text-secondary">Loading scoring settings...</span>
        </div>
      </Card>
    )
  }

  if (error && !schema) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-400 mb-2">Failed to load scoring settings</p>
          <p className="text-text-muted text-sm">{error}</p>
          <button
            onClick={loadSchema}
            className="mt-4 px-4 py-2 bg-dark-tertiary text-white rounded-lg hover:bg-dark-border transition-colors"
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  if (!schema || !rules) return null

  const isCustom = preset === 'custom'
  const previewPoints = calcPreview(rules)

  return (
    <div className="space-y-6">
      {/* Preset Selector */}
      <Card>
        <h3 className="text-lg font-semibold font-display text-white mb-4">Scoring Preset</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESETS.map(p => {
            const active = preset === p.key
            const c = colorMap[p.color]
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePresetSelect(p.key)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  active
                    ? `${c.border} ${c.bg} ring-1 ${c.ring}`
                    : 'border-dark-border bg-dark-tertiary hover:border-dark-border/80'
                }`}
              >
                <p className={`font-semibold ${active ? c.text : 'text-white'}`}>{p.name}</p>
                <p className="text-text-muted text-xs mt-1">{p.desc}</p>
              </button>
            )
          })}
        </div>
        {!isCustom && (
          <p className="text-text-muted text-xs mt-3">
            Select "Custom" to modify individual stat values
          </p>
        )}
      </Card>

      {/* Live Preview */}
      <Card className="border-gold/30">
        <h3 className="text-lg font-semibold font-display text-white mb-1">Live Preview</h3>
        <p className="text-text-muted text-xs mb-4">
          Example QB: 280 pass yards, 2 pass TDs, 1 INT, 2 sacks taken, 30 rush yards
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-dark-primary rounded-lg p-3 text-center">
            <p className="text-text-muted text-xs mb-1">Passing</p>
            <p className="text-xl font-bold font-display text-blue-400">
              {Math.round((280 * (rules.pass_yd || 0) + 2 * (rules.pass_td || 0) + 1 * (rules.pass_int || 0) + 2 * (rules.pass_sack || 0)) * 100) / 100}
            </p>
          </div>
          <div className="bg-dark-primary rounded-lg p-3 text-center">
            <p className="text-text-muted text-xs mb-1">Rushing</p>
            <p className="text-xl font-bold font-display text-green-400">
              {Math.round(30 * (rules.rush_yd || 0) * 100) / 100}
            </p>
          </div>
          <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-center">
            <p className="text-text-muted text-xs mb-1">Total</p>
            <p className="text-2xl font-bold font-display text-gold">{previewPoints}</p>
          </div>
        </div>
      </Card>

      {/* Scoring Categories */}
      {CATEGORY_ORDER.map(cat => {
        const stats = schema[cat]
        if (!stats || stats.length === 0) return null

        const meta = CATEGORY_META[cat] || { label: cat, color: 'text-white' }
        const isExpanded = expanded[cat] !== undefined ? expanded[cat] : (cat !== 'idp')
        const isIdp = cat === 'idp'

        return (
          <Card key={cat}>
            <button
              type="button"
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between mb-0"
            >
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-semibold font-display ${meta.color}`}>
                  {meta.label}
                </h3>
                {isIdp && (
                  <span className="text-xs px-2 py-0.5 bg-dark-tertiary text-text-muted rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 ${isIdp ? 'opacity-40 pointer-events-none' : ''}`}>
                {stats.map(stat => (
                  <div key={stat.key}>
                    <label className="block text-xs font-medium text-text-muted mb-1" title={stat.key}>
                      {stat.label}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        value={rules[stat.key] ?? stat.default ?? 0}
                        onChange={(e) => handleRuleChange(stat.key, e.target.value)}
                        disabled={!isCustom || isIdp}
                        className={`w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-center text-sm focus:border-gold focus:outline-none ${
                          (!isCustom || isIdp) ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      />
                      {isCustom && !isIdp && (rules[stat.key] ?? stat.default) !== stat.default && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full" title="Modified from default" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      {/* Save Button */}
      {dirty && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gold text-white font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Scoring Settings'}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default NflScoringSettings
