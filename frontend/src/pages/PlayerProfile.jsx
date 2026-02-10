import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { track, Events } from '../services/analytics'
import useWatchList from '../hooks/useWatchList'
import PlayerHeader from '../components/player/PlayerHeader'
import PlayerStats from '../components/player/PlayerStats'
import PlayerPredictions from '../components/player/PlayerPredictions'
import PlayerProjection from '../components/player/PlayerProjection'
import PlayerFormChart from '../components/player/PlayerFormChart'
import PlayerCourseHistory from '../components/player/PlayerCourseHistory'
import PlayerBenchmarkCard from '../components/predictions/PlayerBenchmarkCard'
import AddToBoardModal from '../components/workspace/AddToBoardModal'
import usePlayerProfile from '../hooks/usePlayerProfile'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const PlayerProfile = () => {
  const { playerId } = useParams()
  const { user } = useAuth()
  const [currentEventId, setCurrentEventId] = useState(null)
  const [tournamentStatus, setTournamentStatus] = useState(null)
  const [showAddToBoard, setShowAddToBoard] = useState(false)
  const { isWatched, toggleWatch } = useWatchList()
  const {
    player,
    projection,
    predictions,
    liveScore,
    clutchMetrics,
    courseHistory,
    tournamentHistory,
    loading,
    error
  } = usePlayerProfile(playerId)

  const [playerSchedule, setPlayerSchedule] = useState([])

  useEffect(() => {
    api.getCurrentTournament()
      .then(res => {
        const t = res?.tournament || res
        setCurrentEventId(t?.id)
        setTournamentStatus(t?.status)
      })
      .catch(() => {})
  }, [])

  // Fetch upcoming schedule for this player
  useEffect(() => {
    if (!playerId) return
    api.getPlayerSchedule(playerId)
      .then(data => setPlayerSchedule(data.schedule || []))
      .catch(() => setPlayerSchedule([]))
  }, [playerId])

  useEffect(() => {
    if (player) {
      track(Events.PLAYER_PROFILE_VIEWED, { playerId, playerName: player.name })
    }
  }, [playerId, player])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading player profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || 'Player not found'}</p>
            <Link
              to="/players"
              className="px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors"
            >
              Back to Players
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back Link */}
      <Link
        to="/players"
        className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-4"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Players
      </Link>

      {/* Player Header */}
      <div className="mb-6">
        <PlayerHeader
          player={player}
          clutchMetrics={clutchMetrics}
          isOwned={player.owned}
          isOnMyTeam={player.owned}
          onAddToRoster={() => {}}
          onProposeTrade={() => {}}
        />
        {user && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setShowAddToBoard(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gold/40 rounded-lg text-gold text-sm font-semibold hover:bg-gold/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Add to Board
            </button>
            <button
              onClick={() => toggleWatch(playerId, 'golf')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm font-semibold transition-colors
                ${isWatched(playerId) ? 'border-gold/40 text-gold bg-gold/10' : 'border-white/20 text-white/40 hover:border-gold/30 hover:text-gold'}`}
            >
              <svg className="w-4 h-4" fill={isWatched(playerId) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {isWatched(playerId) ? 'Watching' : 'Watch'}
            </button>
          </div>
        )}
      </div>

      {showAddToBoard && (
        <AddToBoardModal
          playerId={playerId}
          playerName={player.name}
          sport="golf"
          onClose={() => setShowAddToBoard(false)}
        />
      )}

      {/* Main Content — 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <PlayerStats player={player} clutchMetrics={clutchMetrics} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <PlayerBenchmarkCard player={player} eventId={currentEventId} tournamentStatus={tournamentStatus} />
          <PlayerPredictions predictions={predictions} liveScore={liveScore} />
          <PlayerProjection projection={projection} />
          <PlayerFormChart
            recentForm={player.recentForm}
            tournamentHistory={tournamentHistory}
          />
          <PlayerCourseHistory courseHistory={courseHistory} />

          {/* Upcoming Schedule */}
          {playerSchedule.length > 0 && (
            <div className="bg-dark-secondary border border-dark-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-border">
                <h3 className="text-sm font-display font-bold text-white">Upcoming Schedule</h3>
              </div>
              <div className="divide-y divide-dark-border/30">
                {playerSchedule.map(t => {
                  const startDate = t.startDate ? new Date(t.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
                  const endDate = t.endDate ? new Date(t.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
                  const dateRange = endDate ? `${startDate} – ${endDate}` : startDate
                  return (
                    <Link
                      key={t.id}
                      to={`/tournaments/${t.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-dark-tertiary/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{t.shortName || t.name}</span>
                          {t.isMajor && <span className="text-[9px] font-mono font-bold text-gold bg-gold/15 px-1 rounded">MAJOR</span>}
                          {t.isSignature && <span className="text-[9px] font-mono font-bold text-orange bg-orange/15 px-1 rounded">SIG</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                          {t.course && <span>{t.course.nickname || t.course.name}</span>}
                          <span className="font-mono">{dateRange}</span>
                        </div>
                      </div>
                      <div className="shrink-0 ml-3">
                        {t.status === 'IN_PROGRESS' ? (
                          <span className="text-[10px] font-mono font-semibold text-rose bg-rose/10 px-2 py-0.5 rounded">LIVE</span>
                        ) : t.inField ? (
                          <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">CONFIRMED</span>
                        ) : t.fieldAnnounced ? (
                          <span className="text-[10px] font-mono text-text-muted/60 bg-white/[0.04] px-2 py-0.5 rounded">NOT IN FIELD</span>
                        ) : (
                          <span className="text-[10px] font-mono text-text-muted bg-white/[0.06] px-2 py-0.5 rounded">TBD</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayerProfile
