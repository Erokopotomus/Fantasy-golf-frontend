import { useState, useEffect } from 'react'
import Card from '../common/Card'

const TournamentCard = ({ tournament, onSetLineup, onViewDetails }) => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 })

  const isLive = tournament?.status === 'IN_PROGRESS'
  const isCompleted = tournament?.status === 'COMPLETED'
  const isUpcoming = tournament?.status === 'UPCOMING'

  useEffect(() => {
    if (!tournament?.startDate || !isUpcoming) return

    const calculateCountdown = () => {
      const now = new Date()
      const start = new Date(tournament.startDate)
      const diff = start - now

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, mins: 0 })
        return
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      })
    }

    calculateCountdown()
    const interval = setInterval(calculateCountdown, 60000)
    return () => clearInterval(interval)
  }, [tournament?.startDate, isUpcoming])

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

  const name = tournament.name
  const venue = tournament.course || tournament.location || ''
  const purse = tournament.purse
  const currentRound = tournament.currentRound
  const cutLine = tournament.cutLine

  const formatPurse = (amount) => {
    if (!amount) return null
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
    return `$${amount}`
  }

  const formatCutLine = (cut) => {
    if (cut == null) return null
    if (cut > 0) return `+${cut}`
    if (cut === 0) return 'E'
    return `${cut}`
  }

  // Event type label: Major > Signature > Tour name
  const getEventType = () => {
    if (tournament.isMajor) return { label: 'Major', color: 'text-yellow-400' }
    if (tournament.isSignature) return { label: 'Signature', color: 'text-purple-400' }
    if (tournament.isPlayoff) return { label: 'Playoff', color: 'text-orange-400' }
    const tour = tournament.tour
    if (tour) return { label: tour === 'PGA' ? 'PGA Tour' : tour, color: 'text-white' }
    return null
  }

  const formatDateRange = () => {
    const start = new Date(tournament.startDate)
    const end = new Date(tournament.endDate)
    const opts = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
  }

  return (
    <div onClick={() => onViewDetails?.(tournament)} className="cursor-pointer">
      <Card hover>
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {isLive ? 'Live Tournament' : isCompleted ? 'Recent Tournament' : 'Next Tournament'}
          </h3>
          {isLive && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live
            </span>
          )}
          {isUpcoming && (
            <span className="px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-bold uppercase tracking-wider">
              Upcoming
            </span>
          )}
        </div>

        {/* Tournament name + venue */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isLive ? 'bg-red-500/20' : 'bg-accent-green/20'
          }`}>
            {isLive ? (
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{name}</p>
            {venue && <p className="text-text-secondary text-sm truncate">{venue}</p>}
          </div>
        </div>

        {/* Live: show round status | Upcoming: show countdown */}
        {isLive && (
          <div className="bg-dark-primary rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4].map(r => {
                const isCurrent = currentRound === r
                const isPast = currentRound > r
                return (
                  <div
                    key={r}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/50 scale-110' :
                      isPast ? 'bg-dark-tertiary text-emerald-400' :
                      'bg-dark-tertiary/50 text-text-muted'
                    }`}
                  >
                    R{r}
                  </div>
                )
              })}
            </div>
            <p className="text-center text-text-secondary text-xs mt-2 font-medium">
              Round {currentRound || 1} in progress
            </p>
          </div>
        )}

        {isUpcoming && (
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
        )}

        {/* Info chips */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          {/* Purse or event type fallback */}
          <div className="bg-dark-primary rounded-lg p-2">
            {purse ? (
              <>
                <p className="text-accent-green font-semibold text-sm">{formatPurse(purse)}</p>
                <p className="text-text-muted text-xs">Purse</p>
              </>
            ) : (() => {
              const evt = getEventType()
              return evt ? (
                <>
                  <p className={`font-semibold text-sm ${evt.color}`}>{evt.label}</p>
                  <p className="text-text-muted text-xs">Event</p>
                </>
              ) : (
                <>
                  <p className="text-text-muted font-semibold text-sm">–</p>
                  <p className="text-text-muted text-xs">Purse</p>
                </>
              )
            })()}
          </div>

          {/* Cut line (live) or event type (upcoming) */}
          <div className="bg-dark-primary rounded-lg p-2">
            {isLive && cutLine != null ? (
              <>
                <p className={`font-semibold text-sm ${cutLine > 0 ? 'text-red-400' : cutLine < 0 ? 'text-emerald-400' : 'text-white'}`}>
                  {formatCutLine(cutLine)}
                </p>
                <p className="text-text-muted text-xs">Cut Line</p>
              </>
            ) : (() => {
              const evt = getEventType()
              return evt && purse ? (
                <>
                  <p className={`font-semibold text-sm ${evt.color}`}>{evt.label}</p>
                  <p className="text-text-muted text-xs">Event</p>
                </>
              ) : (
                <>
                  <p className="text-white font-semibold text-sm">R{currentRound || 1}</p>
                  <p className="text-text-muted text-xs">Round</p>
                </>
              )
            })()}
          </div>

          <div className="bg-dark-primary rounded-lg p-2">
            <p className="text-white font-semibold text-sm">{formatDateRange()}</p>
            <p className="text-text-muted text-xs">Dates</p>
          </div>
        </div>

        {/* CTA */}
        <div className={`w-full py-2.5 rounded-lg text-center text-sm font-semibold transition-colors ${
          isLive
            ? 'bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25'
            : 'bg-dark-tertiary text-text-secondary'
        }`}>
          {isLive ? 'View Leaderboard' : 'View Details'}
        </div>
      </Card>
    </div>
  )
}

export default TournamentCard
