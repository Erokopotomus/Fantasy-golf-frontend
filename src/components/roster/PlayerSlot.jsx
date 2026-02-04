import PlayerStatusBadge from './PlayerStatusBadge'
import Button from '../common/Button'

const PlayerSlot = ({
  player,
  slotType = 'active',
  isEditing = false,
  onToggle,
  onDrop,
  onTrade,
}) => {
  if (!player) {
    return (
      <div className="flex items-center gap-4 p-4 bg-dark-tertiary rounded-lg border-2 border-dashed border-dark-border">
        <div className="w-12 h-12 bg-dark-primary rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-text-muted">Empty Slot</p>
          <p className="text-text-muted text-sm capitalize">{slotType}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`
      flex items-center gap-4 p-4 rounded-lg transition-all
      ${slotType === 'active'
        ? 'bg-dark-secondary border border-accent-green/30'
        : 'bg-dark-tertiary border border-dark-border'
      }
    `}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 bg-dark-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{player.countryFlag}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium truncate">{player.name}</span>
            <PlayerStatusBadge status={player.status || 'active'} />
          </div>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>Rank #{player.rank}</span>
            <span>SG: {player.stats?.sgTotal?.toFixed(2) || '—'}</span>
          </div>
        </div>
      </div>

      {/* Tournament Status */}
      {player.tournamentStatus && (
        <div className="text-right hidden sm:block">
          <p className={`font-bold ${
            player.tournamentStatus.position === '1st' ? 'text-yellow-400' :
            player.tournamentStatus.score < 0 ? 'text-accent-green' : 'text-white'
          }`}>
            {player.tournamentStatus.position}
          </p>
          <p className="text-text-muted text-sm">
            {player.tournamentStatus.score > 0 ? '+' : ''}{player.tournamentStatus.score}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {isEditing && (
          <Button
            size="sm"
            variant={slotType === 'active' ? 'secondary' : 'primary'}
            onClick={() => onToggle(player)}
          >
            {slotType === 'active' ? 'Bench' : 'Start'}
          </Button>
        )}
        {onDrop && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDrop(player)}
            className="text-red-400 hover:text-red-300"
          >
            Drop
          </Button>
        )}
        {onTrade && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onTrade(player)}
          >
            Trade
          </Button>
        )}
      </div>
    </div>
  )
}

export default PlayerSlot
