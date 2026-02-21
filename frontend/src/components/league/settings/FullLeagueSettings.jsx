import { useState } from 'react'
import Card from '../../common/Card'
import SeasonRangePicker from './SeasonRangePicker'

const FullLeagueSettings = ({ settings, onChange, seasonWeeks }) => {
  const [localSettings, setLocalSettings] = useState({
    segments: settings?.segments || 4,
    segmentBonus: settings?.segmentBonus ?? 25,
    seasonRange: settings?.seasonRange || null,
    pointsPerPosition: settings?.pointsPerPosition || {
      1: 100,
      2: 75,
      3: 60,
      top5: 50,
      top10: 35,
      top20: 20,
      top30: 10,
      made_cut: 5,
    },
  })

  const handleChange = (key, value) => {
    const updated = { ...localSettings, [key]: value }
    setLocalSettings(updated)
    onChange?.(updated)
  }

  const handlePointsChange = (position, value) => {
    const updated = {
      ...localSettings,
      pointsPerPosition: {
        ...localSettings.pointsPerPosition,
        [position]: parseInt(value) || 0,
      },
    }
    setLocalSettings(updated)
    onChange?.(updated)
  }

  const handleSeasonRangeChange = (range) => {
    const hasRange = range.startFantasyWeekId || range.endFantasyWeekId
    const updated = { ...localSettings, seasonRange: hasRange ? range : null }
    setLocalSettings(updated)
    onChange?.(updated)
  }

  const positionLabels = {
    1: '1st Place',
    2: '2nd Place',
    3: '3rd Place',
    top5: 'Top 5',
    top10: 'Top 10',
    top20: 'Top 20',
    top30: 'Top 30',
    made_cut: 'Made Cut',
  }

  return (
    <div className="space-y-6">
      {/* Season Range — only show for golf when weeks are available */}
      {seasonWeeks && seasonWeeks.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold font-display text-text-primary mb-2">Season Range</h3>
          <p className="text-xs text-text-muted mb-4">
            Choose which tournaments count for your league. Leave blank for the full PGA season.
          </p>
          <SeasonRangePicker
            weeks={seasonWeeks}
            startWeekId={localSettings.seasonRange?.startFantasyWeekId || null}
            endWeekId={localSettings.seasonRange?.endFantasyWeekId || null}
            segments={localSettings.segments}
            onChange={handleSeasonRangeChange}
          />
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Season Structure</h3>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Number of Segments
          </label>
          <select
            value={localSettings.segments}
            onChange={(e) => handleChange('segments', parseInt(e.target.value))}
            className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary focus:border-gold focus:outline-none"
          >
            <option value={1}>1 Segment (Full Season)</option>
            <option value={2}>2 Segments</option>
            <option value={4}>4 Segments (Quarterly)</option>
          </select>
          <p className="text-xs text-text-muted mt-2">
            Segments divide the season into periods with bonus points for segment winners
          </p>
        </div>

        {localSettings.segments > 1 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Segment Winner Bonus Points
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={localSettings.segmentBonus}
              onChange={(e) => handleChange('segmentBonus', parseInt(e.target.value) || 0)}
              className="w-32 p-3 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary focus:border-gold focus:outline-none"
            />
            <p className="text-xs text-text-muted mt-2">
              Bonus points awarded to the winner of each segment (0-100)
            </p>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Points Per Position</h3>
        <p className="text-sm text-text-muted mb-4">
          Set the fantasy points awarded for each finishing position
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(positionLabels).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-text-muted mb-1">
                {label}
              </label>
              <input
                type="number"
                min="0"
                value={localSettings.pointsPerPosition[key] || 0}
                onChange={(e) => handlePointsChange(key, e.target.value)}
                className="w-full p-2 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary text-center focus:border-gold focus:outline-none"
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-dark-tertiary rounded-lg p-4 border border-dark-border">
        <h4 className="text-sm font-medium text-text-primary mb-2">How Full League Works</h4>
        <ul className="text-xs text-text-muted space-y-1">
          <li>- Each player on your roster earns points based on their tournament finish</li>
          <li>- Points are accumulated throughout the season</li>
          <li>- Segment winners earn bonus points if segments are enabled</li>
          <li>- Final standings determined by total points at season end</li>
        </ul>
      </div>
    </div>
  )
}

export default FullLeagueSettings
