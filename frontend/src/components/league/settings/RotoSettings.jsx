import { useState } from 'react'
import Card from '../../common/Card'
import { ROTO_CATEGORIES } from '../../../hooks/useLeagueFormat'

const RotoSettings = ({ settings, onChange }) => {
  const [localSettings, setLocalSettings] = useState({
    categories: settings?.categories || ['wins', 'top10s', 'cuts_made', 'birdies', 'eagles', 'scoring_avg'],
  })

  const handleToggleCategory = (categoryId) => {
    const current = localSettings.categories
    let updated

    if (current.includes(categoryId)) {
      // Don't allow less than 4 categories
      if (current.length <= 4) return
      updated = current.filter(c => c !== categoryId)
    } else {
      // Don't allow more than 10 categories
      if (current.length >= 10) return
      updated = [...current, categoryId]
    }

    const newSettings = { ...localSettings, categories: updated }
    setLocalSettings(newSettings)
    onChange?.(newSettings)
  }

  const isSelected = (categoryId) => localSettings.categories.includes(categoryId)

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-2">Scoring Categories</h3>
        <p className="text-sm text-text-muted mb-4">
          Select 4-10 categories. Teams are ranked in each category, and those ranks are summed for final standings.
        </p>

        <div className="flex items-center justify-between mb-4 p-3 bg-dark-tertiary rounded-lg">
          <span className="text-sm text-text-secondary">Selected Categories</span>
          <span className={`font-semibold ${localSettings.categories.length >= 4 && localSettings.categories.length <= 10 ? 'text-gold' : 'text-red-400'}`}>
            {localSettings.categories.length} / 10
          </span>
        </div>

        <div className="space-y-2">
          {ROTO_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleToggleCategory(category.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                isSelected(category.id)
                  ? 'border-gold bg-gold/10'
                  : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                isSelected(category.id) ? 'border-gold bg-gold' : 'border-dark-border'
              }`}>
                {isSelected(category.id) && (
                  <svg className="w-4 h-4 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${isSelected(category.id) ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {category.name}
                </p>
                <p className="text-xs text-text-muted">{category.description}</p>
              </div>
              {isSelected(category.id) && (
                <span className="text-xs text-gold font-medium">
                  #{localSettings.categories.indexOf(category.id) + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      <div className="bg-dark-tertiary rounded-lg p-4 border border-dark-border">
        <h4 className="text-sm font-medium text-text-primary mb-2">How Roto Scoring Works</h4>
        <ul className="text-xs text-text-muted space-y-1">
          <li>- Teams are ranked 1st to last in each category</li>
          <li>- Points awarded based on rank (1st = most points)</li>
          <li>- Total roto points = sum of all category ranks</li>
          <li>- Highest total roto points wins the league</li>
        </ul>

        <div className="mt-3 pt-3 border-t border-dark-border">
          <p className="text-xs text-text-muted">
            <span className="text-gold font-medium">Example:</span> In a 6-team league, 1st place in a category gets 6 points, 2nd gets 5 points, etc.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RotoSettings
