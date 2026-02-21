import Card from '../common/Card'
import Button from '../common/Button'

const TradeReview = ({
  trades,
  onAccept,
  onReject,
  onCancel,
  loading,
}) => {
  if (trades.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Pending Trades</h3>
        <div className="text-center py-8 text-text-muted">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p>No pending trades</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold font-display text-text-primary mb-4">
        Pending Trades ({trades.length})
      </h3>
      <div className="space-y-4">
        {trades.map((trade) => (
          <div
            key={trade.id}
            className={`p-4 rounded-lg border ${
              trade.isIncoming
                ? 'bg-gold/5 border-gold/30'
                : 'bg-dark-tertiary border-dark-border'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className={`text-sm ${
                  trade.isIncoming ? 'text-gold' : 'text-text-muted'
                }`}>
                  {trade.isIncoming ? 'Incoming from' : 'Sent to'}
                </span>
                <p className="text-text-primary font-medium">{trade.otherTeamName}</p>
              </div>
              <span className="text-text-muted text-xs">
                {new Date(trade.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className={`text-sm mb-2 ${
                  trade.isIncoming ? 'text-gold' : 'text-red-400'
                }`}>
                  {trade.isIncoming ? 'You receive' : 'You send'}
                </p>
                <div className="space-y-1">
                  {(trade.isIncoming ? trade.playersOffered : trade.playersRequested).map((player) => (
                    <div key={player.id} className="flex items-center gap-2 text-sm">
                      <span>{player.countryFlag}</span>
                      <span className="text-text-primary">{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className={`text-sm mb-2 ${
                  trade.isIncoming ? 'text-red-400' : 'text-gold'
                }`}>
                  {trade.isIncoming ? 'You send' : 'You receive'}
                </p>
                <div className="space-y-1">
                  {(trade.isIncoming ? trade.playersRequested : trade.playersOffered).map((player) => (
                    <div key={player.id} className="flex items-center gap-2 text-sm">
                      <span>{player.countryFlag}</span>
                      <span className="text-text-primary">{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {trade.isIncoming ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onReject(trade.id)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onAccept(trade.id)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Accept
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onCancel(trade.id)}
                  disabled={loading}
                  fullWidth
                >
                  Cancel Trade
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default TradeReview
