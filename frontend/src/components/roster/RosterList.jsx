import PlayerSlot from './PlayerSlot'
import Card from '../common/Card'

const RosterList = ({
  roster,
  activeLineup,
  isEditing,
  onTogglePlayer,
  onDropPlayer,
  onTradePlayer,
  onViewPlayer,
}) => {
  const activePlayers = roster.filter(p => activeLineup.includes(p.id))
  const benchedPlayers = roster.filter(p => !activeLineup.includes(p.id))

  return (
    <div className="space-y-6">
      {/* Active Lineup */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold font-display text-white">Active Lineup</h3>
          <span className="text-text-muted text-sm">
            {activePlayers.length} players
          </span>
        </div>
        <div className="space-y-3">
          {activePlayers.length > 0 ? (
            activePlayers.map((player) => (
              <PlayerSlot
                key={player.id}
                player={player}
                slotType="active"
                isEditing={isEditing}
                onToggle={onTogglePlayer}
                onDrop={onDropPlayer}
                onTrade={onTradePlayer}
                onView={onViewPlayer}
              />
            ))
          ) : (
            <div className="text-center py-8 text-text-muted">
              No players in active lineup
            </div>
          )}
        </div>
      </Card>

      {/* Bench */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold font-display text-white">Bench</h3>
          <span className="text-text-muted text-sm">
            {benchedPlayers.length} players
          </span>
        </div>
        <div className="space-y-3">
          {benchedPlayers.length > 0 ? (
            benchedPlayers.map((player) => (
              <PlayerSlot
                key={player.id}
                player={player}
                slotType="bench"
                isEditing={isEditing}
                onToggle={onTogglePlayer}
                onDrop={onDropPlayer}
                onTrade={onTradePlayer}
                onView={onViewPlayer}
              />
            ))
          ) : (
            <div className="text-center py-8 text-text-muted">
              No players on bench
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default RosterList
