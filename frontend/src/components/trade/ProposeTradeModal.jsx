import { useState } from 'react'
import Card from '../common/Card'

const ProposeTradeModal = ({ isOpen, onClose, myRoster, leagueMembers, onPropose, draftDollarSettings }) => {
  const [selectedTeam, setSelectedTeam] = useState('')
  const [myPlayersToSend, setMyPlayersToSend] = useState([])
  const [theirPlayersToReceive, setTheirPlayersToReceive] = useState([])
  const [message, setMessage] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [senderCurrentDollars, setSenderCurrentDollars] = useState(0)
  const [senderNextDollars, setSenderNextDollars] = useState(0)
  const [receiverCurrentDollars, setReceiverCurrentDollars] = useState(0)
  const [receiverNextDollars, setReceiverNextDollars] = useState(0)

  const dollarsEnabled = draftDollarSettings?.enabled || false
  const allowNextYear = draftDollarSettings?.allowNextYearTrades !== false

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
      const tradeData = {
        toUserId: selectedTeam,
        toTeamName: selectedMember?.name,
        playersOffered: myPlayersToSend,
        playersRequested: theirPlayersToReceive,
        message: message || undefined,
        reasoning: reasoning || undefined,
      }
      if (dollarsEnabled) {
        tradeData.senderDollars = { current: senderCurrentDollars || 0, next: senderNextDollars || 0 }
        tradeData.receiverDollars = { current: receiverCurrentDollars || 0, next: receiverNextDollars || 0 }
      }
      await onPropose(tradeData)
      // Reset state
      setSelectedTeam('')
      setMyPlayersToSend([])
      setTheirPlayersToReceive([])
      setMessage('')
      setReasoning('')
      setSenderCurrentDollars(0)
      setSenderNextDollars(0)
      setReceiverCurrentDollars(0)
      setReceiverNextDollars(0)
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
          <h2 className="text-xl font-bold font-display text-text-primary">Propose Trade</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary transition-colors"
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
              className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary focus:border-emerald-400 focus:outline-none"
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
              className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary placeholder-text-muted focus:border-emerald-400 focus:outline-none"
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
                      <p className="text-text-primary font-medium">{player.name}</p>
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
                        <p className="text-text-primary font-medium">{player.name}</p>
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

          {/* Draft Dollars */}
          {dollarsEnabled && selectedTeam && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-text-muted mb-3">Draft Dollars</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-dark-tertiary rounded-lg p-3">
                  <p className="text-xs text-red-400 mb-2">You Send</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted w-20">Current $</label>
                      <input
                        type="number"
                        min="0"
                        value={senderCurrentDollars || ''}
                        onChange={(e) => setSenderCurrentDollars(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="flex-1 p-2 bg-dark-primary border border-dark-border rounded text-text-primary text-sm focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                    {allowNextYear && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-text-muted w-20">Next Year $</label>
                        <input
                          type="number"
                          min="0"
                          value={senderNextDollars || ''}
                          onChange={(e) => setSenderNextDollars(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="flex-1 p-2 bg-dark-primary border border-dark-border rounded text-text-primary text-sm focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-dark-tertiary rounded-lg p-3">
                  <p className="text-xs text-emerald-400 mb-2">You Receive</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted w-20">Current $</label>
                      <input
                        type="number"
                        min="0"
                        value={receiverCurrentDollars || ''}
                        onChange={(e) => setReceiverCurrentDollars(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="flex-1 p-2 bg-dark-primary border border-dark-border rounded text-text-primary text-sm focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                    {allowNextYear && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-text-muted w-20">Next Year $</label>
                        <input
                          type="number"
                          min="0"
                          value={receiverNextDollars || ''}
                          onChange={(e) => setReceiverNextDollars(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="flex-1 p-2 bg-dark-primary border border-dark-border rounded text-text-primary text-sm focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                      <p key={id} className="text-text-primary text-sm">{player.name}</p>
                    ) : null
                  })}
                  {dollarsEnabled && senderCurrentDollars > 0 && (
                    <p className="text-gold text-sm font-mono">${senderCurrentDollars} current-year</p>
                  )}
                  {dollarsEnabled && senderNextDollars > 0 && (
                    <p className="text-purple-400 text-sm font-mono">${senderNextDollars} next-year</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-emerald-400 mb-1">You Receive:</p>
                  {theirPlayersToReceive.map(id => {
                    const player = selectedMember?.roster?.find(p => p.id === id)
                    return player ? (
                      <p key={id} className="text-text-primary text-sm">{player.name}</p>
                    ) : null
                  })}
                  {dollarsEnabled && receiverCurrentDollars > 0 && (
                    <p className="text-gold text-sm font-mono">${receiverCurrentDollars} current-year</p>
                  )}
                  {dollarsEnabled && receiverNextDollars > 0 && (
                    <p className="text-purple-400 text-sm font-mono">${receiverNextDollars} next-year</p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Optional reasoning */}
        {canSubmit && (
          <div className="px-4 pb-2">
            <label className="block text-[11px] text-text-primary/30 mb-1">Pitch / reasoning <span className="text-text-primary/15">(optional, private to you)</span></label>
            <input
              value={reasoning}
              onChange={e => setReasoning(e.target.value.substring(0, 280))}
              placeholder="e.g. Buying low after a bad week"
              className="w-full px-3 py-2 text-xs bg-dark-tertiary border border-dark-border rounded-lg text-text-primary placeholder-text-muted outline-none focus:border-gold/50"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-dark-border">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-dark-tertiary text-text-primary rounded-lg font-medium hover:bg-dark-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 py-3 bg-emerald-500 text-text-primary rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending...' : 'Propose Trade'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProposeTradeModal
