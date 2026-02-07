import { useState } from 'react'
import Card from '../common/Card'

const ProposeTradeModal = ({ isOpen, onClose, myRoster, leagueMembers, onPropose }) => {
  const [selectedTeam, setSelectedTeam] = useState('')
  const [myPlayersToSend, setMyPlayersToSend] = useState([])
  const [theirPlayersToReceive, setTheirPlayersToReceive] = useState([])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const selectedMember = leagueMembers.find(m => m.id === selectedTeam)

  const toggleMyPlayer = (playerId) => {
    setMyPlayersToSend(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const toggleTheirPlayer = (playerId) => {
    setTheirPlayersToReceive(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const handleSubmit = async () => {
    if (!selectedTeam || myPlayersToSend.length === 0 || theirPlayersToReceive.length === 0) return

    setSubmitting(true)
    try {
      await onPropose({
        toUserId: selectedTeam,
        toTeamName: selectedMember?.name,
        playersOffered: myPlayersToSend,
        playersRequested: theirPlayersToReceive,
        message: message || undefined,
      })
      // Reset state
      setSelectedTeam('')
      setMyPlayersToSend([])
      setTheirPlayersToReceive([])
      setMessage('')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = selectedTeam && myPlayersToSend.length > 0 && theirPlayersToReceive.length > 0

  // Map roster entries — handle both shapes: { player: { id, name } } or { id, name }
  const myPlayers = (myRoster || []).map(entry => ({
    id: entry.player?.id || entry.playerId || entry.id,
    name: entry.player?.name || entry.name || 'Unknown',
    country: entry.player?.country || entry.country,
    owgr: entry.player?.owgr || entry.owgr,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-dark-secondary rounded-xl border border-dark-border w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 className="text-xl font-bold font-display text-white">Propose Trade</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Select Team */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Trade With
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value)
                setTheirPlayersToReceive([])
              }}
              className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-emerald-400 focus:outline-none"
            >
              <option value="">Select a team...</option>
              {leagueMembers.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>

          {/* Trade Message */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Message (optional)
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to your trade proposal..."
              className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-text-muted focus:border-emerald-400 focus:outline-none"
            />
          </div>

          {/* Trade Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* My Players */}
            <div>
              <h3 className="text-sm font-semibold text-text-muted mb-3">Your Players (Select to Send)</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {myPlayers.map(player => (
                  <div
                    key={player.id}
                    onClick={() => toggleMyPlayer(player.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                      ${myPlayersToSend.includes(player.id)
                        ? 'bg-red-500/20 border border-red-500/50'
                        : 'bg-dark-tertiary hover:bg-dark-border'}
                    `}
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{player.name}</p>
                      {player.owgr && (
                        <p className="text-text-muted text-xs">#{player.owgr} World Ranking</p>
                      )}
                    </div>
                    {myPlayersToSend.includes(player.id) && (
                      <span className="text-red-400 text-xs font-medium">Sending</span>
                    )}
                  </div>
                ))}
                {myPlayers.length === 0 && (
                  <p className="text-text-muted text-sm p-3">No players on your roster</p>
                )}
              </div>
            </div>

            {/* Their Players */}
            <div>
              <h3 className="text-sm font-semibold text-text-muted mb-3">
                {selectedMember ? `${selectedMember.name}'s Players` : 'Their Players'} (Select to Receive)
              </h3>
              {selectedTeam ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(selectedMember?.roster || []).map(player => (
                    <div
                      key={player.id}
                      onClick={() => toggleTheirPlayer(player.id)}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                        ${theirPlayersToReceive.includes(player.id)
                          ? 'bg-emerald-400/20 border border-emerald-400/50'
                          : 'bg-dark-tertiary hover:bg-dark-border'}
                      `}
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{player.name}</p>
                        {player.owgr && (
                          <p className="text-text-muted text-xs">#{player.owgr} World Ranking</p>
                        )}
                      </div>
                      {theirPlayersToReceive.includes(player.id) && (
                        <span className="text-emerald-400 text-xs font-medium">Receiving</span>
                      )}
                    </div>
                  ))}
                  {(selectedMember?.roster || []).length === 0 && (
                    <p className="text-text-muted text-sm p-3">This team has no players</p>
                  )}
                </div>
              ) : (
                <div className="bg-dark-tertiary rounded-lg p-8 text-center">
                  <p className="text-text-muted">Select a team to see their players</p>
                </div>
              )}
            </div>
          </div>

          {/* Trade Summary */}
          {(myPlayersToSend.length > 0 || theirPlayersToReceive.length > 0) && (
            <Card className="mt-6 bg-dark-primary">
              <h4 className="text-sm font-semibold text-text-muted mb-3">Trade Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-red-400 mb-1">You Send:</p>
                  {myPlayersToSend.map(id => {
                    const player = myPlayers.find(p => p.id === id)
                    return player ? (
                      <p key={id} className="text-white text-sm">{player.name}</p>
                    ) : null
                  })}
                </div>
                <div>
                  <p className="text-xs text-emerald-400 mb-1">You Receive:</p>
                  {theirPlayersToReceive.map(id => {
                    const player = selectedMember?.roster?.find(p => p.id === id)
                    return player ? (
                      <p key={id} className="text-white text-sm">{player.name}</p>
                    ) : null
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-dark-border">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-dark-tertiary text-white rounded-lg font-medium hover:bg-dark-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending...' : 'Propose Trade'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProposeTradeModal
