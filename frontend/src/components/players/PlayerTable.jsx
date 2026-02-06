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
  onViewPlayer,
}) => {
  const SortHeader = ({ field, children, className = '' }) => (
    <th className={`p-3 ${className}`}>
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 hover:text-white transition-colors mx-auto ${
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
            <SortHeader field="sgTotal" className="text-center">SG Total</SortHeader>
            <SortHeader field="sgOffTee" className="text-center">SG OTT</SortHeader>
            <SortHeader field="sgApproach" className="text-center">SG APP</SortHeader>
            <SortHeader field="sgPutting" className="text-center">SG Putt</SortHeader>
            <th className="p-3 text-text-muted text-center">Form</th>
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
                  <button
                    className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                    onClick={() => onViewPlayer?.(player)}
                  >
                    {player.headshotUrl ? (
                      <img src={player.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-dark-tertiary" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline' }} />
                    ) : null}
                    <span className={`text-xl ${player.headshotUrl ? 'hidden' : ''}`}>{player.countryFlag}</span>
                    <div>
                      <p className="text-white font-medium hover:text-accent-green transition-colors">{player.name}</p>
                      <p className="text-text-muted text-xs">{player.country}</p>
                    </div>
                    {player.owned && (
                      <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs rounded">
                        Owned
                      </span>
                    )}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <span className={`font-medium ${
                    player.stats?.sgTotal > 1 ? 'text-accent-green' :
                    player.stats?.sgTotal > 0 ? 'text-white' : 'text-red-400'
                  }`}>
                    {player.stats?.sgTotal?.toFixed(2) || '—'}
                  </span>
                </td>
                <td className="p-3 text-center text-text-secondary">
                  {player.stats?.sgOffTee?.toFixed(2) || '—'}
                </td>
                <td className="p-3 text-center text-text-secondary">
                  {player.stats?.sgApproach?.toFixed(2) || '—'}
                </td>
                <td className="p-3 text-center text-text-secondary">
                  {player.stats?.sgPutting?.toFixed(2) || '—'}
                </td>
                <td className="p-3 text-center">
                  <div className="flex gap-1 justify-center">
                    {player.recentForm?.slice(0, 5).map((result, i) => {
                      const pos = parseInt(result.replace('T', ''))
                      return (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            result === '1' ? 'bg-yellow-500/20 text-yellow-400' :
                            result === 'CUT' ? 'bg-red-500/15 text-red-400' :
                            result === 'WD' ? 'bg-dark-tertiary text-text-muted' :
                            pos <= 5 ? 'bg-accent-green/20 text-accent-green' :
                            pos <= 10 ? 'bg-emerald-500/10 text-emerald-400/70' :
                            pos <= 25 ? 'bg-dark-tertiary text-text-secondary' :
                            'bg-dark-tertiary text-text-muted'
                          }`}
                        >
                          {result === 'CUT' || result === 'WD' ? result : result === '1' ? '1st' : result}
                        </span>
                      )
                    })}
                  </div>
                </td>
                <td className="p-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewPlayer?.(player)}
                  >
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
