import { useState } from 'react'
import Card from '../common/Card'
import Button from '../common/Button'

const TradeProposal = ({
  roster,
  leagueMembers,
  onPropose,
  loading,
  onClose,
}) => {
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [playersToSend, setPlayersToSend] = useState([])
  const [playersToReceive, setPlayersToReceive] = useState([])

  const togglePlayerToSend = (player) => {
    setPlayersToSend(prev =>
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    )
  }

  const togglePlayerToReceive = (player) => {
    setPlayersToReceive(prev =>
      prev.find(p => p.id === player.id)
        ? prev.filter(p => p.id !== player.id)
        : [...prev, player]
    )
  }

  const handlePropose = () => {
    if (!selectedTeam || playersToSend.length === 0 || playersToReceive.length === 0) return

    onPropose({
      toTeamId: selectedTeam.id,
      toTeamName: selectedTeam.name,
      playersOffered: playersToSend.map(p => p.id),
      playersRequested: playersToReceive.map(p => p.id),
    })
  }

  const canPropose = selectedTeam && playersToSend.length > 0 && playersToReceive.length > 0

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Propose Trade</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Select Team */}
        <div className="mb-6">
          <label className="block text-text-secondary text-sm mb-2">
            Trade with
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {leagueMembers.filter(m => !m.isUser).map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  setSelectedTeam(member)
                  setPlayersToReceive([])
                }}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedTeam?.id === member.id
                    ? 'bg-accent-green/20 border border-accent-green'
                    : 'bg-dark-tertiary hover:bg-dark-border border border-transparent'
                }`}
              >
                <p className="text-white font-medium">{member.name}</p>
                <p className="text-text-muted text-sm">
                  {member.roster?.length || 0} players
                </p>
              </button>
            ))}
          </div>
        </div>

        {selectedTeam && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Your Players */}
            <div>
              <h3 className="text-white font-medium mb-3">You Send</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {roster.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerToSend(player)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      playersToSend.find(p => p.id === player.id)
                        ? 'bg-red-500/20 border border-red-500'
                        : 'bg-dark-tertiary hover:bg-dark-border border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{player.countryFlag}</span>
                      <span className="text-white text-sm">{player.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Their Players */}
            <div>
              <h3 className="text-white font-medium mb-3">You Receive</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {(selectedTeam.roster || []).map((player) => (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerToReceive(player)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      playersToReceive.find(p => p.id === player.id)
                        ? 'bg-accent-green/20 border border-accent-green'
                        : 'bg-dark-tertiary hover:bg-dark-border border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{player.countryFlag}</span>
                      <span className="text-white text-sm">{player.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trade Summary */}
        {canPropose && (
          <div className="mt-6 p-4 bg-dark-tertiary rounded-lg">
            <h4 className="text-white font-medium mb-2">Trade Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-red-400 mb-1">You send:</p>
                {playersToSend.map(p => (
                  <p key={p.id} className="text-text-secondary">{p.name}</p>
                ))}
              </div>
              <div>
                <p className="text-accent-green mb-1">You receive:</p>
                {playersToReceive.map(p => (
                  <p key={p.id} className="text-text-secondary">{p.name}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handlePropose}
            loading={loading}
            disabled={!canPropose}
            className="flex-1"
          >
            Propose Trade
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default TradeProposal
