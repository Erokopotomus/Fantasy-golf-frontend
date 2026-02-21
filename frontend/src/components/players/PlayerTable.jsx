import Button from '../common/Button'

const ScheduleDots = ({ playerId, tournaments = [] }) => {
  if (!tournaments || tournaments.length === 0) return <span className="text-text-muted/30 text-xs">—</span>
  return (
    <div className="flex gap-1 justify-center items-center" title={tournaments.map(t => `${t.shortName || t.name}: ${t.field?.some(f => f.playerId === playerId) ? 'In Field' : t.fieldSize > 0 || t.field?.length > 0 ? 'Not in Field' : 'TBD'}`).join('\n')}>
      {tournaments.slice(0, 5).map((t, i) => {
        const inField = t.field?.some(f => f.playerId === playerId)
        const fieldAnnounced = t.fieldSize > 0 || t.field?.length > 0
        return (
          <div
            key={t.id || i}
            className={`w-2.5 h-2.5 rounded-full ${
              inField
                ? 'bg-emerald-500'
                : fieldAnnounced
                ? 'bg-dark-tertiary/10'
                : 'border border-stone/50 bg-transparent'
            }`}
            title={`${t.shortName || t.name}: ${inField ? 'In Field' : fieldAnnounced ? 'Not in Field' : 'TBD'}`}
          />
        )
      })}
    </div>
  )
}

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
  upcomingTournaments = [],
}) => {
  const SortHeader = ({ field, children, className = '' }) => (
    <th className={`p-3 ${className}`}>
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 hover:text-text-primary transition-colors mx-auto ${
          sortBy === field ? 'text-gold' : 'text-text-muted'
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
            <th className="p-3 text-text-muted text-center">Schedule</th>
            <th className="p-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const isSelected = selectedIds.includes(player.id)

            return (
              <tr
                key={player.id}
                onClick={() => onViewPlayer?.(player)}
                className={`
                  border-b border-dark-border/50 transition-colors cursor-pointer
                  ${isSelected ? 'bg-gold/10' : 'hover:bg-dark-tertiary/50'}
                `}
              >
                {compareMode && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectPlayer(player)}
                      disabled={!isSelected && !canSelect}
                      className="w-4 h-4 rounded border-dark-border bg-dark-tertiary text-gold focus:ring-gold"
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
                      <div className="flex items-center gap-1.5">
                        <p className="text-text-primary font-medium hover:text-gold transition-colors">{player.name}</p>
                        {player.primaryTour && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            player.primaryTour === 'PGA' ? 'bg-blue-500/20 text-blue-400' :
                            player.primaryTour === 'LIV' ? 'bg-red-500/20 text-red-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {player.primaryTour}
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-xs">{player.country}</p>
                    </div>
                    {player.owned && (
                      <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded">
                        Owned
                      </span>
                    )}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <span className={`font-medium ${
                    player.stats?.sgTotal > 1 ? 'text-gold' :
                    player.stats?.sgTotal > 0 ? 'text-text-primary' : 'text-red-400'
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
                  <ScheduleDots playerId={player.id} tournaments={upcomingTournaments} />
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
