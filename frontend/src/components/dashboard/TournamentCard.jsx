import { useState, useEffect } from 'react'
import Card from '../common/Card'
import Button from '../common/Button'

const TournamentCard = ({ tournament, onSetLineup, onViewDetails }) => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 })

  useEffect(() => {
    if (!tournament?.startDate) return

    const calculateCountdown = () => {
      const now = new Date()
      const start = new Date(tournament.startDate)
      const diff = start - now

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, mins: 0 })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      setCountdown({ days, hours, mins })
    }

    calculateCountdown()
    const interval = setInterval(calculateCountdown, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [tournament?.startDate])

  if (!tournament) {
    return (
      <Card>
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Next Tournament</h3>
        <div className="text-center py-6">
          <p className="text-text-muted text-sm">No upcoming tournaments</p>
        </div>
      </Card>
    )
  }

  const { name, course, location, purse, lineupSet, startDate, defending, fieldSize } = tournament

  const formatPurse = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    return `$${(amount / 1000).toFixed(0)}K`
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <Card hover>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-white">Next Tournament</h3>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          lineupSet
            ? 'bg-accent-green/20 text-accent-green'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {lineupSet ? 'Lineup Set' : 'Set Lineup'}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 bg-accent-green/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-7 h-7 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold truncate">{name}</p>
          <p className="text-text-secondary text-sm truncate">{course}</p>
          <p className="text-text-muted text-xs">{location}</p>
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="bg-dark-primary rounded-lg p-3 mb-4">
        <p className="text-text-muted text-xs mb-2 text-center">Starts In</p>
        <div className="flex justify-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{countdown.days}</p>
            <p className="text-text-muted text-xs">days</p>
          </div>
          <div className="text-text-muted text-2xl font-light">:</div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{countdown.hours}</p>
            <p className="text-text-muted text-xs">hrs</p>
          </div>
          <div className="text-text-muted text-2xl font-light">:</div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{countdown.mins}</p>
            <p className="text-text-muted text-xs">min</p>
          </div>
        </div>
      </div>

      {/* Tournament Info */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-dark-primary rounded-lg p-2">
          <p className="text-accent-green font-semibold text-sm">{formatPurse(purse)}</p>
          <p className="text-text-muted text-xs">Purse</p>
        </div>
        <div className="bg-dark-primary rounded-lg p-2">
          <p className="text-white font-semibold text-sm">{fieldSize}</p>
          <p className="text-text-muted text-xs">Field</p>
        </div>
        <div className="bg-dark-primary rounded-lg p-2">
          <p className="text-white font-semibold text-sm">{formatDate(startDate)}</p>
          <p className="text-text-muted text-xs">Start</p>
        </div>
      </div>

      {defending && (
        <p className="text-text-muted text-xs mb-4">
          Defending: <span className="text-text-secondary">{defending}</span>
        </p>
      )}

      <div className="flex gap-2">
        {!lineupSet && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onSetLineup?.(tournament)}
          >
            Set Lineup
          </Button>
        )}
        <Button
          size="sm"
          variant={lineupSet ? 'primary' : 'outline'}
          className={lineupSet ? 'flex-1' : ''}
          onClick={() => onViewDetails?.(tournament)}
        >
          View Details
        </Button>
      </div>
    </Card>
  )
}

export default TournamentCard
