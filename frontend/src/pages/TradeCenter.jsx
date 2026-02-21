import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card'
import TradeCard from '../components/trade/TradeCard'
import ProposeTradeModal from '../components/trade/ProposeTradeModal'
import useTradeCenter from '../hooks/useTradeCenter'
import { useRoster } from '../hooks/useRoster'
import { useLeague } from '../hooks/useLeague'

const TradeCenter = () => {
  const { leagueId } = useParams()
  const { pendingTrades, tradeHistory, leagueMembers, loading, error, acceptTrade, rejectTrade, cancelTrade, proposeTrade } = useTradeCenter(leagueId)
  const { roster } = useRoster(leagueId)
  const { league } = useLeague(leagueId)
  const [showPropose, setShowPropose] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')

  // Trade deadline logic
  const tradeDeadline = league?.settings?.tradeDeadline && league?.settings?.tradeDeadlineDate
    ? new Date(league.settings.tradeDeadlineDate)
    : null
  const now = new Date()
  const isDeadlinePassed = tradeDeadline && now > tradeDeadline
  const isDeadlineApproaching = tradeDeadline && !isDeadlinePassed && (tradeDeadline - now) < 7 * 24 * 60 * 60 * 1000

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading trades...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Link
              to={`/leagues/${leagueId}`}
              className="text-emerald-500 hover:underline"
            >
              Back to League
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const incomingTrades = pendingTrades.filter(t => t.isIncoming)
  const outgoingTrades = pendingTrades.filter(t => !t.isIncoming)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-2"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to League
          </Link>
          <h1 className="text-2xl font-bold font-display text-text-primary">Trade Center</h1>
          <p className="text-text-secondary">Manage trades with other teams</p>
        </div>
        <button
          onClick={() => setShowPropose(true)}
          disabled={isDeadlinePassed}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isDeadlinePassed
              ? 'bg-dark-tertiary text-text-muted cursor-not-allowed'
              : 'bg-emerald-500 text-text-primary hover:bg-emerald-500/90'
          }`}
        >
          Propose Trade
        </button>
      </div>

      {/* Trade Deadline Banner */}
      {isDeadlinePassed && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <p className="text-red-400 font-semibold text-sm">Trade Deadline Passed</p>
            <p className="text-red-400/70 text-xs">
              The trade deadline was {tradeDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}. No more trades can be proposed or accepted.
            </p>
          </div>
        </div>
      )}
      {isDeadlineApproaching && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-yellow-400 font-semibold text-sm">Trade Deadline Approaching</p>
            <p className="text-yellow-400/70 text-xs">
              Deadline: {tradeDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-2xl font-bold font-display text-orange">{incomingTrades.length}</p>
          <p className="text-xs text-text-muted">Incoming</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold font-display text-yellow-400">{outgoingTrades.length}</p>
          <p className="text-xs text-text-muted">Pending</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold font-display text-text-primary">{tradeHistory.length}</p>
          <p className="text-xs text-text-muted">Completed</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-emerald-500 text-text-primary'
              : 'bg-dark-tertiary text-text-secondary hover:text-text-primary'
          }`}
        >
          Pending ({pendingTrades.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-emerald-500 text-text-primary'
              : 'bg-dark-tertiary text-text-secondary hover:text-text-primary'
          }`}
        >
          History ({tradeHistory.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pending' ? (
        <div className="space-y-4">
          {pendingTrades.length === 0 ? (
            <Card className="text-center py-12">
              <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">No Pending Trades</h3>
              <p className="text-text-secondary mb-4">Start trading with other teams to improve your roster</p>
              <button
                onClick={() => setShowPropose(true)}
                className="px-4 py-2 bg-emerald-500 text-text-primary rounded-lg font-medium hover:bg-emerald-500/90 transition-colors"
              >
                Propose a Trade
              </button>
            </Card>
          ) : (
            <>
              {incomingTrades.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-muted mb-3">Incoming Offers</h3>
                  <div className="space-y-4">
                    {incomingTrades.map(trade => (
                      <TradeCard
                        key={trade.id}
                        trade={trade}
                        isIncoming={true}
                        onAccept={acceptTrade}
                        onReject={rejectTrade}
                      />
                    ))}
                  </div>
                </div>
              )}
              {outgoingTrades.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-text-muted mb-3">Your Offers</h3>
                  <div className="space-y-4">
                    {outgoingTrades.map(trade => (
                      <TradeCard
                        key={trade.id}
                        trade={trade}
                        isIncoming={false}
                        onCancel={cancelTrade}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tradeHistory.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-text-secondary">No trade history yet</p>
            </Card>
          ) : (
            tradeHistory.map(trade => (
              <Card key={trade.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-primary font-medium">{trade.description}</p>
                    <p className="text-text-muted text-sm">{trade.date}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    trade.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {trade.status}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Propose Trade Modal */}
      <ProposeTradeModal
        isOpen={showPropose}
        onClose={() => setShowPropose(false)}
        myRoster={roster || []}
        leagueMembers={leagueMembers}
        onPropose={proposeTrade}
        draftDollarSettings={league?.settings?.draftDollarSettings}
      />
    </div>
  )
}

export default TradeCenter
