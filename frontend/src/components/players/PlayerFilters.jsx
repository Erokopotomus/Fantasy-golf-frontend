import Select from '../common/Select'
import Button from '../common/Button'

const PlayerFilters = ({ params, onUpdate, onReset }) => {
  const rankOptions = [
    { value: '1-10', label: 'Top 10' },
    { value: '1-25', label: 'Top 25' },
    { value: '1-50', label: 'Top 50' },
    { value: '1-100', label: 'Top 100' },
    { value: '1-250', label: 'Top 250' },
    { value: '1-9999', label: 'All Ranks' },
  ]

  const availabilityOptions = [
    { value: 'all', label: 'All Players' },
    { value: 'available', label: 'Available Only' },
    { value: 'owned', label: 'My Players' },
  ]

  const tourOptions = [
    { value: '', label: 'All Tours' },
    { value: 'PGA', label: 'PGA Tour' },
    { value: 'LIV', label: 'LIV Golf' },
    { value: 'DP', label: 'DP World' },
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
    { value: 'United States', label: 'USA' },
    { value: 'England', label: 'England' },
    { value: 'South Africa', label: 'South Africa' },
    { value: 'Japan', label: 'Japan' },
    { value: 'Australia', label: 'Australia' },
    { value: 'Korea - Republic of', label: 'South Korea' },
    { value: 'Sweden', label: 'Sweden' },
    { value: 'Scotland', label: 'Scotland' },
    { value: 'Canada', label: 'Canada' },
    { value: 'France', label: 'France' },
    { value: 'Spain', label: 'Spain' },
    { value: 'Germany', label: 'Germany' },
    { value: 'Thailand', label: 'Thailand' },
    { value: 'Denmark', label: 'Denmark' },
    { value: 'Italy', label: 'Italy' },
  ]

  const handleRankChange = (e) => {
    const [min, max] = e.target.value.split('-').map(Number)
    onUpdate({ minRank: min, maxRank: max })
  }

  const getRankValue = () => {
    if (params.minRank === 1 && params.maxRank === 10) return '1-10'
    if (params.minRank === 1 && params.maxRank === 25) return '1-25'
    if (params.minRank === 1 && params.maxRank === 50) return '1-50'
    if (params.minRank === 1 && params.maxRank === 100) return '1-100'
    if (params.minRank === 1 && params.maxRank === 250) return '1-250'
    return '1-9999'
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
          label="Tour"
          value={params.tour || ''}
          onChange={(e) => onUpdate({ tour: e.target.value })}
          options={tourOptions}
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
