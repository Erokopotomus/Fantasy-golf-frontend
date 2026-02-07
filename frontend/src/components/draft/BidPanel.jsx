import { useState, useEffect } from 'react'
import Card from '../common/Card'
import Button from '../common/Button'

const BidPanel = ({
  currentBid,
  userBudget,
  isUserTurn,
  isNominating,
  onBid,
  onPass,
  onNominate,
  selectedPlayer,
  teams,
  userTeamId,
}) => {
  const [bidAmount, setBidAmount] = useState(1)
  const [nominateBid, setNominateBid] = useState(1)

  const minBid = (currentBid?.amount || 0) + 1
  const maxBid = userBudget || 200

  // Update bid amount when currentBid changes
  useEffect(() => {
    if (currentBid?.amount) {
      setBidAmount(currentBid.amount + 1)
    }
  }, [currentBid?.amount])

  const getTeamName = (teamId) => {
    if (teamId === userTeamId) return 'You'
    const team = teams?.find(t => t.id === teamId)
    return team?.name || team?.userName || 'Unknown'
  }

  const handleBid = () => {
    if (bidAmount >= minBid && bidAmount <= maxBid) {
      onBid(bidAmount)
    }
  }

  const incrementBid = (amount) => {
    const newBid = Math.min(bidAmount + amount, maxBid)
    setBidAmount(newBid)
  }

  // Nomination mode
  if (isNominating && selectedPlayer) {
    return (
      <Card>
        <h3 className="text-lg font-semibold font-display text-white mb-4">Nominate Player</h3>
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            {selectedPlayer.headshotUrl ? (
              <img src={selectedPlayer.headshotUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-dark-tertiary flex items-center justify-center text-text-muted text-sm">
                {selectedPlayer.name?.charAt(0)}
              </div>
            )}
            <span className="text-xl font-bold font-display text-white">{selectedPlayer.name}</span>
          </div>
          <p className="text-text-muted text-sm">
            Rank #{selectedPlayer.owgrRank || selectedPlayer.rank}
            {selectedPlayer.sgTotal != null && ` • SG: ${Number(selectedPlayer.sgTotal).toFixed(2)}`}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-text-secondary text-sm mb-2">Starting Bid</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNominateBid(Math.max(1, nominateBid - 1))}
              className="w-10 h-10 bg-dark-tertiary rounded-lg text-white hover:bg-dark-border transition-colors"
            >
              -
            </button>
            <div className="flex-1 bg-dark-tertiary rounded-lg py-2 text-center">
              <span className="text-2xl font-bold font-display text-gold">${nominateBid}</span>
            </div>
            <button
              onClick={() => setNominateBid(Math.min(maxBid, nominateBid + 1))}
              className="w-10 h-10 bg-dark-tertiary rounded-lg text-white hover:bg-dark-border transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          {[1, 5, 10].map((inc) => (
            <button
              key={inc}
              onClick={() => setNominateBid(Math.min(maxBid, nominateBid + inc))}
              className="flex-1 py-1.5 bg-dark-tertiary rounded-lg text-text-secondary hover:text-white hover:bg-dark-border transition-colors text-sm"
            >
              +${inc}
            </button>
          ))}
        </div>

        <Button fullWidth onClick={() => onNominate(selectedPlayer.id, nominateBid)}>
          Nominate for ${nominateBid}
        </Button>
      </Card>
    )
  }

  // Waiting for nomination
  if (!currentBid) {
    return (
      <Card>
        <h3 className="text-lg font-semibold font-display text-white mb-4">Auction</h3>
        <div className="text-center py-8 text-text-muted">
          <p>Waiting for nomination...</p>
          {isUserTurn && (
            <p className="text-gold mt-2 font-medium">Your turn to nominate! Select a player.</p>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-dark-border">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-sm">Your Budget</span>
            <span className="text-gold font-bold text-lg">${userBudget}</span>
          </div>
        </div>
      </Card>
    )
  }

  // Active bidding
  const isHighBidder = currentBid.highBidderTeamId === userTeamId
  const bidDeadline = currentBid.deadline ? new Date(currentBid.deadline) : null
  const player = currentBid.player

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-display text-white">Current Bid</h3>
        <div className="text-right">
          <p className="text-text-muted text-xs">Your Budget</p>
          <p className="text-gold font-bold">${userBudget}</p>
        </div>
      </div>

      {/* Current Bid Info */}
      <div className="bg-dark-tertiary rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          {player?.headshotUrl ? (
            <img src={player.headshotUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-dark-primary flex items-center justify-center text-text-muted">
              {(currentBid.playerName || player?.name)?.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <p className="text-white font-bold">{currentBid.playerName || player?.name}</p>
            <p className="text-text-muted text-sm">
              Nominated by {getTeamName(currentBid.nominatedByTeamId)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-xs">Current Bid</p>
            <p className="text-2xl font-bold font-display text-yellow-400">${currentBid.amount}</p>
          </div>
          <div className="text-right">
            <p className="text-text-muted text-xs">High Bidder</p>
            <p className={`font-medium ${isHighBidder ? 'text-gold' : 'text-white'}`}>
              {getTeamName(currentBid.highBidderTeamId)}
              {isHighBidder && ' (You)'}
            </p>
          </div>
        </div>
      </div>

      {/* Bid Controls */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setBidAmount(Math.max(minBid, bidAmount - 1))}
            disabled={bidAmount <= minBid}
            className="w-10 h-10 bg-dark-tertiary rounded-lg text-white hover:bg-dark-border transition-colors disabled:opacity-50"
          >
            -
          </button>
          <div className="flex-1 bg-dark-tertiary rounded-lg py-2 text-center">
            <span className="text-2xl font-bold font-display text-white">${bidAmount}</span>
          </div>
          <button
            onClick={() => setBidAmount(Math.min(maxBid, bidAmount + 1))}
            disabled={bidAmount >= maxBid}
            className="w-10 h-10 bg-dark-tertiary rounded-lg text-white hover:bg-dark-border transition-colors disabled:opacity-50"
          >
            +
          </button>
        </div>

        <div className="flex gap-2">
          {[1, 5, 10].map((inc) => (
            <button
              key={inc}
              onClick={() => incrementBid(inc)}
              disabled={bidAmount + inc > maxBid}
              className="flex-1 py-2 bg-dark-tertiary rounded-lg text-text-secondary hover:text-white hover:bg-dark-border transition-colors disabled:opacity-50 text-sm"
            >
              +${inc}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={onPass}
          disabled={isHighBidder}
        >
          Pass
        </Button>
        <Button
          className="flex-1"
          onClick={handleBid}
          disabled={bidAmount > maxBid || bidAmount < minBid || isHighBidder}
        >
          Bid ${bidAmount}
        </Button>
      </div>

      {isHighBidder && (
        <p className="text-gold text-sm text-center mt-2">
          You have the highest bid!
        </p>
      )}

      {bidAmount > maxBid && (
        <p className="text-red-500 text-sm text-center mt-2">
          Insufficient budget
        </p>
      )}
    </Card>
  )
}

export default BidPanel
