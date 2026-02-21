import { useState, useEffect } from 'react'
import Card from '../common/Card'
import Button from '../common/Button'
import api from '../../services/api'

const TradeVotePanel = ({ tradeId, currentUserId, initiatorId, receiverId }) => {
  const [votes, setVotes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    if (!tradeId) return
    api.getTradeVotes(tradeId)
      .then(data => setVotes(data))
      .catch(() => setVotes(null))
      .finally(() => setLoading(false))
  }, [tradeId])

  const handleVote = async (vote) => {
    setVoting(true)
    try {
      await api.castTradeVote(tradeId, vote)
      const updated = await api.getTradeVotes(tradeId)
      setVotes(updated)
    } catch (err) {
      console.error('Vote failed:', err.message)
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-4 text-text-muted text-sm">Loading vote info...</div>
      </Card>
    )
  }

  if (!votes) return null

  const isTradeParty = currentUserId === initiatorId || currentUserId === receiverId
  const hasVoted = votes.userVote !== null
  const vetoPercent = votes.eligibleVoters > 0
    ? Math.round((votes.vetoCount / votes.eligibleVoters) * 100)
    : 0

  // Countdown timer
  const reviewEnd = votes.reviewUntil ? new Date(votes.reviewUntil) : null
  const timeLeft = reviewEnd ? Math.max(0, reviewEnd.getTime() - Date.now()) : 0
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60))
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <Card>
      <h4 className="text-sm font-semibold text-text-primary mb-3">League Vote</h4>

      {/* Countdown */}
      {timeLeft > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-text-secondary">
            {hoursLeft}h {minutesLeft}m remaining
          </span>
        </div>
      )}

      {/* Vote progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>{votes.totalVotes} of {votes.eligibleVoters} voted</span>
          <span>{vetoPercent}% veto ({votes.threshold}% needed)</span>
        </div>
        <div className="w-full bg-dark-tertiary rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              vetoPercent >= votes.threshold ? 'bg-red-500' : 'bg-gold'
            }`}
            style={{ width: `${Math.min(100, (vetoPercent / votes.threshold) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-red-400">{votes.vetoCount} veto</span>
          <span className="text-emerald-400">{votes.approveCount} approve</span>
        </div>
      </div>

      {/* Vote buttons */}
      {!isTradeParty && !hasVoted && timeLeft > 0 && (
        <div className="flex gap-2">
          <Button
            onClick={() => handleVote('approve')}
            loading={voting}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-sm"
          >
            Approve
          </Button>
          <Button
            onClick={() => handleVote('veto')}
            loading={voting}
            variant="outline"
            className="flex-1 text-red-400 border-red-500/50 hover:bg-red-500/10 text-sm"
          >
            Veto
          </Button>
        </div>
      )}

      {hasVoted && (
        <p className="text-xs text-text-muted text-center">
          You voted to <span className={votes.userVote === 'veto' ? 'text-red-400' : 'text-emerald-400'}>{votes.userVote}</span>
        </p>
      )}

      {isTradeParty && (
        <p className="text-xs text-text-muted text-center">Trade parties cannot vote</p>
      )}
    </Card>
  )
}

export default TradeVotePanel
