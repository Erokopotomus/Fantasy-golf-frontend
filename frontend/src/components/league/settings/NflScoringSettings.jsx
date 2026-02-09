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

// Position-specific example stat lines for live preview
const POSITION_PREVIEWS = {
  QB: {
    label: 'QB',
    desc: '280 pass yds, 2 TD, 1 INT, 2 sacks, 30 rush yds',
    stats: { pass_yd: 280, pass_td: 2, pass_int: 1, pass_sack: 2, pass_cmp: 22, pass_att: 34, rush_yd: 30, rush_att: 5, fum_lost: 0 },
    breakdown: (r) => ({
      Passing: 280 * (r.pass_yd||0) + 2 * (r.pass_td||0) + 1 * (r.pass_int||0) + 2 * (r.pass_sack||0) + 22 * (r.pass_cmp||0) + 34 * (r.pass_att||0),
      Rushing: 30 * (r.rush_yd||0) + 5 * (r.rush_att||0),
      Fumbles: 0,
    }),
  },
  RB: {
    label: 'RB',
    desc: '85 rush yds, 1 rush TD, 4 rec, 32 rec yds, 18 att',
    stats: { rush_yd: 85, rush_td: 1, rush_att: 18, rec: 4, rec_yd: 32, rec_tgt: 5, fum_lost: 0 },
    breakdown: (r) => ({
      Rushing: 85 * (r.rush_yd||0) + 1 * (r.rush_td||0) + 18 * (r.rush_att||0),
      Receiving: 4 * (r.rec||0) + 32 * (r.rec_yd||0) + 5 * (r.rec_tgt||0),
      Fumbles: 0,
    }),
  },
  WR: {
    label: 'WR',
    desc: '6 rec, 95 rec yds, 1 TD, 9 targets',
    stats: { rec: 6, rec_yd: 95, rec_td: 1, rec_tgt: 9, rush_yd: 0, fum_lost: 0 },
    breakdown: (r) => ({
      Receiving: 6 * (r.rec||0) + 95 * (r.rec_yd||0) + 1 * (r.rec_td||0) + 9 * (r.rec_tgt||0),
      Fumbles: 0,
    }),
  },
  TE: {
    label: 'TE',
    desc: '4 rec, 55 rec yds, 1 TD, 6 targets',
    stats: { rec: 4, rec_yd: 55, rec_td: 1, rec_tgt: 6, fum_lost: 0 },
    breakdown: (r) => ({
      Receiving: 4 * (r.rec||0) + 55 * (r.rec_yd||0) + 1 * (r.rec_td||0) + 6 * (r.rec_tgt||0),
      Bonuses: 4 * (r.bonus_rec_te||0),
    }),
  },
  K: {
    label: 'K',
    desc: '2 FG (1x 30-39, 1x 40-49), 1 miss, 3 XP made',
    stats: { fgm_30_39: 1, fgm_40_49: 1, fgmiss: 1, xpm: 3 },
    breakdown: (r) => {
      const hasDistance = (r.fgm_0_19 || r.fgm_20_29 || r.fgm_30_39 || r.fgm_40_49 || r.fgm_50p)
      const fgPts = hasDistance
        ? 1 * (r.fgm_30_39||0) + 1 * (r.fgm_40_49||0)
        : 2 * (r.fgm||0)
      return { Kicking: fgPts + 1 * (r.fgmiss||0) + 3 * (r.xpm||0) }
    },
  },
  DEF: {
    label: 'DEF',
    desc: '3 sacks, 1 INT, 1 fumble rec, 17 pts allowed',
    stats: { sack: 3, int: 1, def_fum_rec: 1, ff: 1, pointsAllowed: 17 },
    breakdown: (r) => ({
      Defense: 3 * (r.sack||0) + 1 * (r.int||0) + 1 * (r.def_fum_rec||0) + 1 * (r.ff||0) + (r.pts_allow_14_20||0),
    }),
  },
}

function calcPreview(rules, pos) {
  const preview = POSITION_PREVIEWS[pos]
  if (!preview) return { total: 0, cats: {} }
  const cats = preview.breakdown(rules)
  const total = Math.round(Object.values(cats).reduce((s, v) => s + v, 0) * 100) / 100
  // Round each category
  for (const k of Object.keys(cats)) {
    cats[k] = Math.round(cats[k] * 100) / 100
  }
  return { total, cats }
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
  const [previewPos, setPreviewPos] = useState('QB')

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
  const preview = calcPreview(rules, previewPos)
  const previewMeta = POSITION_PREVIEWS[previewPos]

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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold font-display text-white">Live Preview</h3>
          <div className="flex gap-1">
            {Object.keys(POSITION_PREVIEWS).map(pos => (
              <button
                key={pos}
                type="button"
                onClick={() => setPreviewPos(pos)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  previewPos === pos
                    ? 'bg-gold text-white'
                    : 'bg-dark-tertiary text-text-muted hover:text-white hover:bg-dark-border'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
        <p className="text-text-muted text-xs mb-4">
          {previewMeta.desc}
        </p>
        <div className="flex gap-3">
          {Object.entries(preview.cats).map(([cat, pts]) => (
            <div key={cat} className="bg-dark-primary rounded-lg p-3 text-center flex-1">
              <p className="text-text-muted text-xs mb-1">{cat}</p>
              <p className="text-lg font-bold font-display text-text-secondary">{pts}</p>
            </div>
          ))}
          <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-center flex-1">
            <p className="text-text-muted text-xs mb-1">Total</p>
            <p className="text-2xl font-bold font-display text-gold">{preview.total}</p>
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
