import Select from '../common/Select'
import Button from '../common/Button'

const PlayerFilters = ({ params, onUpdate, onReset }) => {
  const rankOptions = [
    { value: '1-10', label: 'Top 10' },
    { value: '1-25', label: 'Top 25' },
    { value: '1-50', label: 'Top 50' },
    { value: '1-100', label: 'All Ranks' },
  ]

  const availabilityOptions = [
    { value: 'all', label: 'All Players' },
    { value: 'available', label: 'Available Only' },
    { value: 'owned', label: 'My Players' },
  ]

  const sgOptions = [
    { value: '', label: 'Any SG Total' },
    { value: '0', label: 'SG > 0' },
    { value: '0.5', label: 'SG > 0.5' },
    { value: '1', label: 'SG > 1.0' },
    { value: '1.5', label: 'SG > 1.5' },
  ]

  const countryOptions = [
    { value: '', label: 'All Countries' },
    { value: 'USA', label: 'USA' },
    { value: 'ENG', label: 'England' },
    { value: 'AUS', label: 'Australia' },
    { value: 'CAN', label: 'Canada' },
    { value: 'KOR', label: 'South Korea' },
    { value: 'JPN', label: 'Japan' },
    { value: 'ESP', label: 'Spain' },
    { value: 'NIR', label: 'Northern Ireland' },
  ]

  const handleRankChange = (e) => {
    const [min, max] = e.target.value.split('-').map(Number)
    onUpdate({ minRank: min, maxRank: max })
  }

  const getRankValue = () => {
    if (params.minRank === 1 && params.maxRank === 10) return '1-10'
    if (params.minRank === 1 && params.maxRank === 25) return '1-25'
    if (params.minRank === 1 && params.maxRank === 50) return '1-50'
    return '1-100'
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-36">
        <Select
          label="Rank Range"
          value={getRankValue()}
          onChange={handleRankChange}
          options={rankOptions}
        />
      </div>

      <div className="w-36">
        <Select
          label="Availability"
          value={params.availability}
          onChange={(e) => onUpdate({ availability: e.target.value })}
          options={availabilityOptions}
        />
      </div>

      <div className="w-36">
        <Select
          label="Min SG Total"
          value={params.minSgTotal?.toString() || ''}
          onChange={(e) => onUpdate({ minSgTotal: e.target.value ? parseFloat(e.target.value) : null })}
          options={sgOptions}
        />
      </div>

      <div className="w-36">
        <Select
          label="Country"
          value={params.country}
          onChange={(e) => onUpdate({ country: e.target.value })}
          options={countryOptions}
        />
      </div>

      <Button variant="ghost" size="sm" onClick={onReset}>
        Reset Filters
      </Button>
    </div>
  )
}

export default PlayerFilters
