import { useState, useMemo } from 'react'
import Input from '../common/Input'
import Button from '../common/Button'
import Card from '../common/Card'

const PlayerPool = ({
  players,
  onSelectPlayer,
  onAddToQueue,
  isUserTurn,
  queue,
  draftType,
  onViewPlayer,
}) => {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')

  const filteredPlayers = useMemo(() => {
    let result = players.filter(p => !p.drafted)

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.country.toLowerCase().includes(searchLower)
      )
    }

    result.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'sgTotal':
          aVal = a.stats?.sgTotal || 0
          bVal = b.stats?.sgTotal || 0
          break
        default:
          aVal = a.rank
          bVal = b.rank
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [players, search, sortBy, sortDir])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const isInQueue = (playerId) => queue.some(p => p.id === playerId)

  const SortHeader = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className={`text-left hover:text-white transition-colors flex items-center gap-1 ${
        sortBy === field ? 'text-accent-green' : 'text-text-muted'
      }`}
    >
      {children}
      {sortBy === field && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
      )}
    </button>
  )

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Available Players</h3>
        <span className="text-text-muted text-sm">
          {filteredPlayers.length} available
        </span>
      </div>

      <Input
        placeholder="Search players..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
      />

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-dark-secondary">
            <tr className="text-xs border-b border-dark-border">
              <th className="pb-2 pr-2">
                <SortHeader field="rank">Rank</SortHeader>
              </th>
              <th className="pb-2 pr-2 text-left">
                <SortHeader field="name">Player</SortHeader>
              </th>
              <th className="pb-2 pr-2 text-right">
                <SortHeader field="sgTotal">SG Total</SortHeader>
              </th>
              <th className="pb-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr
                key={player.id}
                className="border-b border-dark-border/50 hover:bg-dark-tertiary/50 transition-colors"
              >
                <td className="py-2 pr-2 text-text-muted text-sm">
                  #{player.rank}
                </td>
                <td className="py-2 pr-2">
                  <button
                    className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                    onClick={() => onViewPlayer?.(player)}
                  >
                    <span className="text-lg">{player.countryFlag}</span>
                    <div>
                      <p className="text-white font-medium text-sm hover:text-accent-green transition-colors">{player.name}</p>
                      <p className="text-text-muted text-xs">{player.country}</p>
                    </div>
                  </button>
                </td>
                <td className="py-3 pr-2 text-right">
                  <span className={`font-medium ${
                    player.stats?.sgTotal > 1 ? 'text-accent-green' : 'text-white'
                  }`}>
                    {player.stats?.sgTotal?.toFixed(2) || '—'}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex gap-1 justify-end">
                    {isUserTurn && (
                      <Button
                        size="sm"
                        onClick={() => onSelectPlayer(player)}
                      >
                        {draftType === 'auction' ? 'Nominate' : 'Draft'}
                      </Button>
                    )}
                    {!isInQueue(player.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onAddToQueue(player)}
                        title="Add to queue"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 4v16m8-8H4" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPlayers.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            No players found
          </div>
        )}
      </div>
    </Card>
  )
}

export default PlayerPool
