import { useState } from 'react'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import Card from '../common/Card'

const LeagueForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'snake',
    rosterSize: '6',
    scoringType: 'standard',
    maxMembers: '10',
    budget: '100',
  })
  const [errors, setErrors] = useState({})

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
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
        ...formData,
        name: formData.name.trim(),
        rosterSize: parseInt(formData.rosterSize),
        maxMembers: parseInt(formData.maxMembers),
        budget: formData.type === 'auction' ? parseInt(formData.budget) : null,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="League Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Enter league name"
        error={errors.name}
        required
      />

      {/* Draft Type */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Draft Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleChange({ target: { name: 'type', value: 'snake' } })}
            className={`
              p-4 rounded-lg border-2 transition-all duration-300 text-left
              ${formData.type === 'snake'
                ? 'border-accent-green bg-accent-green/10'
                : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${formData.type === 'snake' ? 'border-accent-green' : 'border-text-muted'}`}>
                {formData.type === 'snake' && (
                  <div className="w-2 h-2 rounded-full bg-accent-green" />
                )}
              </div>
              <span className="text-white font-medium">Snake Draft</span>
            </div>
            <p className="text-text-muted text-sm">
              Draft order reverses each round
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleChange({ target: { name: 'type', value: 'auction' } })}
            className={`
              p-4 rounded-lg border-2 transition-all duration-300 text-left
              ${formData.type === 'auction'
                ? 'border-accent-green bg-accent-green/10'
                : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${formData.type === 'auction' ? 'border-accent-green' : 'border-text-muted'}`}>
                {formData.type === 'auction' && (
                  <div className="w-2 h-2 rounded-full bg-accent-green" />
                )}
              </div>
              <span className="text-white font-medium">Auction Draft</span>
            </div>
            <p className="text-text-muted text-sm">
              Bid on players with a budget
            </p>
          </button>
        </div>
      </div>

      {/* Scoring Type */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Scoring System <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleChange({ target: { name: 'scoringType', value: 'standard' } })}
            className={`
              p-4 rounded-lg border-2 transition-all duration-300 text-left
              ${formData.scoringType === 'standard'
                ? 'border-accent-green bg-accent-green/10'
                : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${formData.scoringType === 'standard' ? 'border-accent-green' : 'border-text-muted'}`}>
                {formData.scoringType === 'standard' && (
                  <div className="w-2 h-2 rounded-full bg-accent-green" />
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
                ? 'border-accent-green bg-accent-green/10'
                : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${formData.scoringType === 'strokes-gained' ? 'border-accent-green' : 'border-text-muted'}`}>
                {formData.scoringType === 'strokes-gained' && (
                  <div className="w-2 h-2 rounded-full bg-accent-green" />
                )}
              </div>
              <span className="text-white font-medium">Strokes Gained</span>
            </div>
            <p className="text-text-muted text-sm">
              Advanced stats-based scoring
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Roster Size"
          name="rosterSize"
          value={formData.rosterSize}
          onChange={handleChange}
          options={rosterSizeOptions}
          required
        />

        <Select
          label="Max Members"
          name="maxMembers"
          value={formData.maxMembers}
          onChange={handleChange}
          options={maxMembersOptions}
          required
        />
      </div>

      {formData.type === 'auction' && (
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

      {/* League Summary */}
      <Card className="bg-dark-primary">
        <h3 className="text-white font-medium mb-3">League Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-text-muted">Draft Type:</span>
            <span className="text-white ml-2 capitalize">{formData.type}</span>
          </div>
          <div>
            <span className="text-text-muted">Scoring:</span>
            <span className="text-white ml-2 capitalize">
              {formData.scoringType === 'strokes-gained' ? 'Strokes Gained' : 'Standard'}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Roster Size:</span>
            <span className="text-white ml-2">{formData.rosterSize} players</span>
          </div>
          <div>
            <span className="text-text-muted">Max Members:</span>
            <span className="text-white ml-2">{formData.maxMembers} teams</span>
          </div>
          {formData.type === 'auction' && (
            <div className="col-span-2">
              <span className="text-text-muted">Budget:</span>
              <span className="text-white ml-2">${formData.budget}</span>
            </div>
          )}
        </div>
      </Card>

      <Button type="submit" fullWidth loading={loading} size="lg">
        Create League
      </Button>
    </form>
  )
}

export default LeagueForm
