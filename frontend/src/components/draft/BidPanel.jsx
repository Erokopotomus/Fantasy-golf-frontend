import { useState } from 'react'
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
}) => {
  const [bidAmount, setBidAmount] = useState(currentBid?.amount + 1 || 1)
  const [nominateBid, setNominateBid] = useState(1)

  const minBid = (currentBid?.amount || 0) + 1
  const maxBid = userBudget

  const handleBid = () => {
    if (bidAmount >= minBid && bidAmount <= maxBid) {
      onBid(bidAmount)
      setBidAmount(bidAmount + 1)
    }
  }

  const incrementBid = (amount) => {
    const newBid = Math.min(bidAmount + amount, maxBid)
    setBidAmount(newBid)
  }

  if (isNominating && selectedPlayer) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Nominate Player</h3>
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-2xl">{selectedPlayer.countryFlag}</span>
            <span className="text-xl font-bold text-white">{selectedPlayer.name}</span>
          </div>
          <p className="text-text-muted text-sm">
            Rank #{selectedPlayer.rank} • SG Total: {selectedPlayer.stats?.sgTotal?.toFixed(2)}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-text-secondary text-sm mb-2">
            Starting Bid
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNominateBid(Math.max(1, nominateBid - 1))}
              className="w-10 h-10 bg-dark-tertiary rounded-lg text-white hover:bg-dark-border transition-colors"
            >
              -
            </button>
            <div className="flex-1 bg-dark-tertiary rounded-lg py-2 text-center">
              <span className="text-2xl font-bold text-accent-green">${nominateBid}</span>
            </div>
            <button
              onClick={() => setNominateBid(Math.min(maxBid, nominateBid + 1))}
              className="w-10 h-10 bg-dark-tertiary rounded-lg text-white hover:bg-dark-border transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <Button fullWidth onClick={() => onNominate(selectedPlayer.id, nominateBid)}>
          Nominate for ${nominateBid}
        </Button>
      </Card>
    )
  }

  if (!currentBid) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Auction</h3>
        <div className="text-center py-8 text-text-muted">
          <p>Waiting for nomination...</p>
          {isUserTurn && (
            <p className="text-accent-green mt-2">Your turn to nominate!</p>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Current Bid</h3>
        <div className="text-right">
          <p className="text-text-muted text-xs">Your Budget</p>
          <p className="text-accent-green font-bold">${userBudget}</p>
        </div>
      </div>

      {/* Current Bid Info */}
      <div className="bg-dark-tertiary rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{currentBid.player?.countryFlag}</span>
          <div className="flex-1">
            <p className="text-white font-bold">{currentBid.player?.name}</p>
            <p className="text-text-muted text-sm">
              Nominated by {currentBid.nominatedBy}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-xs">Current Bid</p>
            <p className="text-2xl font-bold text-yellow-400">${currentBid.amount}</p>
          </div>
          <div className="text-right">
            <p className="text-text-muted text-xs">High Bidder</p>
            <p className="text-white font-medium">{currentBid.highBidder}</p>
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
            <span className="text-2xl font-bold text-white">${bidAmount}</span>
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
          disabled={currentBid.highBidder === 'You'}
        >
          Pass
        </Button>
        <Button
          className="flex-1"
          onClick={handleBid}
          disabled={bidAmount > maxBid || bidAmount < minBid}
        >
          Bid ${bidAmount}
        </Button>
      </div>

      {bidAmount > maxBid && (
        <p className="text-red-500 text-sm text-center mt-2">
          Insufficient budget
        </p>
      )}
    </Card>
  )
}

export default BidPanel
