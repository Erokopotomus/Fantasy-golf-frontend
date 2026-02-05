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

  return (
    <Card className={isIncoming ? 'border-accent-blue/50' : ''}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isIncoming ? (
            <span className="px-2 py-1 bg-accent-blue/20 text-accent-blue text-xs rounded font-medium">
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

      {/* Trade Content */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* You Receive */}
        <div className="bg-dark-tertiary rounded-lg p-3">
          <p className="text-xs text-text-muted mb-2">You Receive</p>
          <div className="space-y-2">
            {trade.playersOffered.map(player => (
              <div key={player.id} className="flex items-center gap-2">
                <span className="text-lg">{player.countryFlag}</span>
                <span className="text-white font-medium text-sm">{player.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* You Send */}
        <div className="bg-dark-tertiary rounded-lg p-3">
          <p className="text-xs text-text-muted mb-2">You Send</p>
          <div className="space-y-2">
            {trade.playersRequested.map(player => (
              <div key={player.id} className="flex items-center gap-2">
                <span className="text-lg">{player.countryFlag}</span>
                <span className="text-white font-medium text-sm">{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isIncoming ? (
          <>
            <button
              onClick={() => onAccept(trade.id)}
              className="flex-1 py-2 bg-accent-green text-white rounded-lg font-medium hover:bg-accent-green/90 transition-colors"
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
