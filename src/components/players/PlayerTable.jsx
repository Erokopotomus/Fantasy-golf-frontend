import Button from '../common/Button'

const PlayerTable = ({
  players,
  sortBy,
  sortDir,
  onSort,
  onSelectPlayer,
  selectedIds,
  canSelect,
  compareMode,
}) => {
  const SortHeader = ({ field, children, className = '' }) => (
    <th className={`p-3 text-left ${className}`}>
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 hover:text-white transition-colors ${
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
    </th>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead className="bg-dark-secondary sticky top-0">
          <tr className="border-b border-dark-border text-xs">
            {compareMode && <th className="p-3 w-12"></th>}
            <SortHeader field="rank" className="w-16">Rank</SortHeader>
            <SortHeader field="name">Player</SortHeader>
            <SortHeader field="sgTotal" className="text-right">SG Total</SortHeader>
            <SortHeader field="sgOffTee" className="text-right">SG OTT</SortHeader>
            <SortHeader field="sgApproach" className="text-right">SG APP</SortHeader>
            <SortHeader field="sgPutting" className="text-right">SG Putt</SortHeader>
            <th className="p-3 text-text-muted text-right">Form</th>
            <th className="p-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const isSelected = selectedIds.includes(player.id)

            return (
              <tr
                key={player.id}
                className={`
                  border-b border-dark-border/50 transition-colors
                  ${isSelected ? 'bg-accent-green/10' : 'hover:bg-dark-tertiary/50'}
                `}
              >
                {compareMode && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectPlayer(player)}
                      disabled={!isSelected && !canSelect}
                      className="w-4 h-4 rounded border-dark-border bg-dark-tertiary text-accent-green focus:ring-accent-green"
                    />
                  </td>
                )}
                <td className="p-3 text-text-muted font-medium">
                  #{player.rank}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{player.countryFlag}</span>
                    <div>
                      <p className="text-white font-medium">{player.name}</p>
                      <p className="text-text-muted text-xs">{player.country}</p>
                    </div>
                    {player.owned && (
                      <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs rounded">
                        Owned
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <span className={`font-medium ${
                    player.stats?.sgTotal > 1 ? 'text-accent-green' :
                    player.stats?.sgTotal > 0 ? 'text-white' : 'text-red-400'
                  }`}>
                    {player.stats?.sgTotal?.toFixed(2) || '—'}
                  </span>
                </td>
                <td className="p-3 text-right text-text-secondary">
                  {player.stats?.sgOffTee?.toFixed(2) || '—'}
                </td>
                <td className="p-3 text-right text-text-secondary">
                  {player.stats?.sgApproach?.toFixed(2) || '—'}
                </td>
                <td className="p-3 text-right text-text-secondary">
                  {player.stats?.sgPutting?.toFixed(2) || '—'}
                </td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    {player.recentForm?.slice(0, 3).map((result, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          result === '1st' ? 'bg-yellow-500/20 text-yellow-400' :
                          result.startsWith('T') && parseInt(result.slice(1)) <= 10 ? 'bg-accent-green/20 text-accent-green' :
                          'bg-dark-tertiary text-text-muted'
                        }`}
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <Button size="sm" variant="ghost">
                    View
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {players.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          No players found matching your filters
        </div>
      )}
    </div>
  )
}

export default PlayerTable
