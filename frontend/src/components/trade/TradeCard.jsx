import Card from '../common/Card'

const TradeCard = ({ trade, onAccept, onReject, onCancel, isIncoming }) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // For incoming trades: playersOffered = what they send you, playersRequested = what they want from you
  // For outgoing trades: playersOffered = what you send, playersRequested = what you want
  const youReceive = isIncoming ? trade.playersOffered : trade.playersRequested
  const youSend = isIncoming ? trade.playersRequested : trade.playersOffered

  // Draft dollars — parse JSON if needed
  const senderDollars = typeof trade.senderDollars === 'string' ? JSON.parse(trade.senderDollars || '{}') : (trade.senderDollars || {})
  const receiverDollars = typeof trade.receiverDollars === 'string' ? JSON.parse(trade.receiverDollars || '{}') : (trade.receiverDollars || {})
  const hasDollars = (senderDollars.current > 0 || senderDollars.next > 0 || receiverDollars.current > 0 || receiverDollars.next > 0)
  // For incoming: sender dollars = what they send you, receiver dollars = what they want from you
  const dollarsYouReceive = isIncoming ? senderDollars : receiverDollars
  const dollarsYouSend = isIncoming ? receiverDollars : senderDollars

  return (
    <Card className={isIncoming ? 'border-blue-500/50' : ''}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isIncoming ? (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">
              Incoming
            </span>
          ) : (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded font-medium">
              Sent
            </span>
          )}
          <span className="text-text-muted text-sm">{formatDate(trade.createdAt)}</span>
        </div>
        <span className="text-text-secondary text-sm">
          {isIncoming ? `From: ${trade.otherTeamName}` : `To: ${trade.otherTeamName}`}
        </span>
      </div>

      {/* Trade Message */}
      {trade.message && (
        <div className="mb-4 p-2 bg-dark-tertiary rounded-lg">
          <p className="text-text-secondary text-sm italic">"{trade.message}"</p>
        </div>
      )}

      {/* Trade Content */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* You Receive */}
        <div className="bg-dark-tertiary rounded-lg p-3">
          <p className="text-xs text-emerald-400 mb-2">You Receive</p>
          <div className="space-y-2">
            {youReceive.map(player => (
              <div key={player.id} className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{player.name}</span>
                {player.owgr && (
                  <span className="text-text-muted text-xs">#{player.owgr}</span>
                )}
              </div>
            ))}
            {hasDollars && dollarsYouReceive.current > 0 && (
              <p className="text-gold text-sm font-mono">${dollarsYouReceive.current} current-year</p>
            )}
            {hasDollars && dollarsYouReceive.next > 0 && (
              <p className="text-purple-400 text-sm font-mono">${dollarsYouReceive.next} next-year</p>
            )}
            {youReceive.length === 0 && !hasDollars && (
              <p className="text-text-muted text-sm">No players</p>
            )}
          </div>
        </div>

        {/* You Send */}
        <div className="bg-dark-tertiary rounded-lg p-3">
          <p className="text-xs text-red-400 mb-2">You Send</p>
          <div className="space-y-2">
            {youSend.map(player => (
              <div key={player.id} className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{player.name}</span>
                {player.owgr && (
                  <span className="text-text-muted text-xs">#{player.owgr}</span>
                )}
              </div>
            ))}
            {hasDollars && dollarsYouSend.current > 0 && (
              <p className="text-gold text-sm font-mono">${dollarsYouSend.current} current-year</p>
            )}
            {hasDollars && dollarsYouSend.next > 0 && (
              <p className="text-purple-400 text-sm font-mono">${dollarsYouSend.next} next-year</p>
            )}
            {youSend.length === 0 && !hasDollars && (
              <p className="text-text-muted text-sm">No players</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isIncoming ? (
          <>
            <button
              onClick={() => onAccept(trade.id)}
              className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => onReject(trade.id)}
              className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors"
            >
              Reject
            </button>
          </>
        ) : (
          <button
            onClick={() => onCancel(trade.id)}
            className="flex-1 py-2 bg-dark-tertiary text-text-secondary rounded-lg font-medium hover:bg-dark-border transition-colors"
          >
            Cancel Trade
          </button>
        )}
      </div>
    </Card>
  )
}

export default TradeCard
