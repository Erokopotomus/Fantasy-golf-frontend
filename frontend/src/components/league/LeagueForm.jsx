import { useState, useEffect } from 'react'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import Card from '../common/Card'
import FormatSelector from './FormatSelector'
import FullLeagueSettings from './settings/FullLeagueSettings'
import HeadToHeadSettings from './settings/HeadToHeadSettings'
import RotoSettings from './settings/RotoSettings'
import SurvivorSettings from './settings/SurvivorSettings'
import OneAndDoneSettings from './settings/OneAndDoneSettings'
import { LEAGUE_FORMATS, DEFAULT_FORMAT_SETTINGS } from '../../hooks/useLeagueFormat'
import api from '../../services/api'

const NFL_SCORING_OPTIONS = [
  { key: 'half_ppr', label: 'Half PPR', desc: 'Half point per reception (most popular)' },
  { key: 'ppr', label: 'PPR', desc: 'Full point per reception' },
  { key: 'standard', label: 'Standard', desc: 'No points for receptions' },
  { key: 'custom', label: 'Custom', desc: 'Configure every stat value after creation' },
]

const SPORT_DEFAULTS = {
  golf: { format: 'full-league', rosterSize: '6', scoringType: 'standard', maxMembers: '10', formatSettings: DEFAULT_FORMAT_SETTINGS['full-league'] },
  nfl: { format: 'head-to-head', rosterSize: '17', scoringType: 'half_ppr', maxMembers: '12', formatSettings: DEFAULT_FORMAT_SETTINGS['head-to-head'] },
}

const LeagueForm = ({ onSubmit, loading }) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    sport: 'golf',
    format: 'full-league',
    draftType: 'snake',
    rosterSize: '6',
    scoringType: 'standard',
    maxMembers: '10',
    budget: '200',
    formatSettings: DEFAULT_FORMAT_SETTINGS['full-league'],
  })
  const isNfl = formData.sport === 'nfl'
  const [errors, setErrors] = useState({})
  const [seasonWeeks, setSeasonWeeks] = useState([])

  // Fetch season weeks when entering step 3 for golf full-league
  useEffect(() => {
    if (step === 3 && formData.sport === 'golf' && formData.format === 'full-league') {
      api.getSeasonWeeks('golf')
        .then(data => setSeasonWeeks(data.weeks || []))
        .catch(() => setSeasonWeeks([]))
    }
  }, [step, formData.sport, formData.format])

  const rosterSizeOptions = Array.from({ length: 9 }, (_, i) => ({
    value: String(i + 4),
    label: `${i + 4} players`,
  }))

  const maxMembersOptions = Array.from({ length: 13 }, (_, i) => ({
    value: String(i + 4),
    label: `${i + 4} members`,
  }))

  const budgetOptions = [
    { value: '50', label: '$50' },
    { value: '100', label: '$100' },
    { value: '150', label: '$150' },
    { value: '200', label: '$200' },
    { value: '250', label: '$250' },
    { value: '300', label: '$300' },
    { value: '400', label: '$400' },
    { value: '500', label: '$500' },
  ]

  const handleSportChange = (sport) => {
    const defaults = SPORT_DEFAULTS[sport]
    setFormData((prev) => ({
      ...prev,
      sport,
      ...defaults,
      name: prev.name,
      draftType: 'snake',
      budget: prev.budget,
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleFormatChange = (format) => {
    setFormData((prev) => ({
      ...prev,
      format,
      formatSettings: DEFAULT_FORMAT_SETTINGS[format] || {},
      // Reset roster size for one-and-done
      rosterSize: format === 'one-and-done' ? '1' : prev.rosterSize,
    }))
  }

  const handleDraftTypeChange = (draftType) => {
    setFormData((prev) => ({ ...prev, draftType }))
  }

  const handleFormatSettingsChange = (settings) => {
    setFormData((prev) => ({ ...prev, formatSettings: settings }))
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'League name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'League name must be at least 2 characters'
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'League name must be 50 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({
        name: formData.name.trim(),
        sport: formData.sport,
        format: formData.format,
        draftType: formData.format === 'one-and-done' ? 'none' : formData.draftType,
        rosterSize: parseInt(formData.rosterSize),
        maxMembers: parseInt(formData.maxMembers),
        scoringType: formData.scoringType,
        budget: formData.draftType === 'auction' ? parseInt(formData.budget) : null,
        formatSettings: formData.formatSettings,
      })
    }
  }

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      setErrors({ name: 'League name is required' })
      return
    }
    setStep((prev) => Math.min(prev + 1, 3))
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const selectedFormat = LEAGUE_FORMATS[formData.format]

  const renderFormatSettings = () => {
    switch (formData.format) {
      case 'full-league':
        return <FullLeagueSettings settings={formData.formatSettings} onChange={handleFormatSettingsChange} seasonWeeks={formData.sport === 'golf' ? seasonWeeks : null} />
      case 'head-to-head':
        return <HeadToHeadSettings settings={formData.formatSettings} onChange={handleFormatSettingsChange} />
      case 'roto':
        return <RotoSettings settings={formData.formatSettings} onChange={handleFormatSettingsChange} />
      case 'survivor':
        return <SurvivorSettings settings={formData.formatSettings} onChange={handleFormatSettingsChange} />
      case 'one-and-done':
        return <OneAndDoneSettings settings={formData.formatSettings} onChange={handleFormatSettingsChange} />
      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <button
              type="button"
              onClick={() => s < step && setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                s === step
                  ? 'bg-gold text-white'
                  : s < step
                  ? 'bg-gold/20 text-gold cursor-pointer hover:bg-gold/30'
                  : 'bg-dark-tertiary text-text-muted'
              }`}
            >
              {s < step ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s
              )}
            </button>
            {s < 3 && (
              <div className={`w-12 h-1 mx-1 ${s < step ? 'bg-gold/50' : 'bg-dark-tertiary'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-text-muted mb-6">
        {step === 1 && 'Basic Info'}
        {step === 2 && 'League Format'}
        {step === 3 && 'Format Settings'}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Sport Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Sport <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSportChange('golf')}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-300 text-left flex items-center gap-3
                  ${formData.sport === 'golf'
                    ? 'border-gold bg-gold/10'
                    : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
                  }
                `}
              >
                <span className="text-2xl">{'\u26F3'}</span>
                <div>
                  <span className="text-white font-medium block">Golf</span>
                  <span className="text-text-muted text-xs">PGA Tour</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleSportChange('nfl')}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-300 text-left flex items-center gap-3
                  ${formData.sport === 'nfl'
                    ? 'border-gold bg-gold/10'
                    : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
                  }
                `}
              >
                <span className="text-2xl">{'\uD83C\uDFC8'}</span>
                <div>
                  <span className="text-white font-medium block">NFL</span>
                  <span className="text-text-muted text-xs">Football</span>
                </div>
              </button>
            </div>
          </div>

          <Input
            label="League Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter league name"
            error={errors.name}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Max Members"
              name="maxMembers"
              value={formData.maxMembers}
              onChange={handleChange}
              options={maxMembersOptions}
              required
            />

            {isNfl ? (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Roster Size</label>
                <div className="px-3 py-2.5 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm">
                  17 players <span className="text-text-muted">(QB, 2 RB, 3 WR, TE, FLEX, K, DEF, 6 BN, IR)</span>
                </div>
              </div>
            ) : formData.format !== 'one-and-done' ? (
              <Select
                label="Roster Size"
                name="rosterSize"
                value={formData.rosterSize}
                onChange={handleChange}
                options={rosterSizeOptions}
                required
              />
            ) : null}
          </div>

          {/* Scoring Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Scoring System <span className="text-red-500">*</span>
            </label>
            {isNfl ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {NFL_SCORING_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleChange({ target: { name: 'scoringType', value: opt.key } })}
                    className={`
                      p-4 rounded-lg border-2 transition-all duration-300 text-left
                      ${formData.scoringType === opt.key
                        ? 'border-gold bg-gold/10'
                        : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                        ${formData.scoringType === opt.key ? 'border-gold' : 'border-text-muted'}`}>
                        {formData.scoringType === opt.key && (
                          <div className="w-2 h-2 rounded-full bg-gold" />
                        )}
                      </div>
                      <span className="text-white font-medium">{opt.label}</span>
                    </div>
                    <p className="text-text-muted text-sm">{opt.desc}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'scoringType', value: 'standard' } })}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-300 text-left
                    ${formData.scoringType === 'standard'
                      ? 'border-gold bg-gold/10'
                      : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${formData.scoringType === 'standard' ? 'border-gold' : 'border-text-muted'}`}>
                      {formData.scoringType === 'standard' && (
                        <div className="w-2 h-2 rounded-full bg-gold" />
                      )}
                    </div>
                    <span className="text-white font-medium">Standard</span>
                  </div>
                  <p className="text-text-muted text-sm">
                    Points based on tournament finish
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange({ target: { name: 'scoringType', value: 'strokes-gained' } })}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-300 text-left
                    ${formData.scoringType === 'strokes-gained'
                      ? 'border-gold bg-gold/10'
                      : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${formData.scoringType === 'strokes-gained' ? 'border-gold' : 'border-text-muted'}`}>
                      {formData.scoringType === 'strokes-gained' && (
                        <div className="w-2 h-2 rounded-full bg-gold" />
                      )}
                    </div>
                    <span className="text-white font-medium">Strokes Gained</span>
                  </div>
                  <p className="text-text-muted text-sm">
                    Advanced stats-based scoring
                  </p>
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handleNext}>
              Next: Choose Format
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Format Selection */}
      {step === 2 && (
        <div className="space-y-6">
          <FormatSelector
            selectedFormat={formData.format}
            onSelectFormat={handleFormatChange}
            selectedDraftType={formData.draftType}
            onSelectDraftType={handleDraftTypeChange}
            sport={formData.sport}
          />

          {formData.draftType === 'auction' && formData.format !== 'one-and-done' && (
            <Select
              label="Auction Budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              options={budgetOptions}
              helperText="Each team starts with this budget"
              required
            />
          )}

          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button type="button" onClick={handleNext}>
              Next: Configure Settings
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Format-Specific Settings */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-dark-tertiary rounded-lg border border-dark-border mb-6">
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">{selectedFormat?.name}</p>
              <p className="text-sm text-text-muted">{selectedFormat?.description}</p>
            </div>
          </div>

          {renderFormatSettings()}

          {/* League Summary */}
          <Card className="bg-dark-primary">
            <h3 className="text-white font-medium mb-3">League Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-text-muted">League Name:</span>
                <span className="text-white ml-2">{formData.name}</span>
              </div>
              <div>
                <span className="text-text-muted">Format:</span>
                <span className="text-white ml-2">{selectedFormat?.name}</span>
              </div>
              <div>
                <span className="text-text-muted">Draft Type:</span>
                <span className="text-white ml-2 capitalize">
                  {formData.format === 'one-and-done' ? 'None' : formData.draftType}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Sport:</span>
                <span className="text-white ml-2 capitalize">{formData.sport === 'nfl' ? 'NFL' : 'Golf'}</span>
              </div>
              <div>
                <span className="text-text-muted">Scoring:</span>
                <span className="text-white ml-2">
                  {isNfl
                    ? NFL_SCORING_OPTIONS.find(o => o.key === formData.scoringType)?.label || formData.scoringType
                    : formData.scoringType === 'strokes-gained' ? 'Strokes Gained' : 'Standard'
                  }
                </span>
              </div>
              {formData.format !== 'one-and-done' && (
                <div>
                  <span className="text-text-muted">Roster Size:</span>
                  <span className="text-white ml-2">{formData.rosterSize} players</span>
                </div>
              )}
              <div>
                <span className="text-text-muted">Max Members:</span>
                <span className="text-white ml-2">{formData.maxMembers} teams</span>
              </div>
              {formData.draftType === 'auction' && formData.format !== 'one-and-done' && (
                <div className="col-span-2">
                  <span className="text-text-muted">Budget:</span>
                  <span className="text-white ml-2">${formData.budget}</span>
                </div>
              )}
            </div>
          </Card>

          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button type="submit" loading={loading}>
              Create League
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

export default LeagueForm
