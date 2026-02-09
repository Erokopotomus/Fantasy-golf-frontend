import { useState, useEffect } from 'react'
import api from '../../services/api'
import Card from '../common/Card'

const posColors = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-blue-500/20 text-blue-400',
  WR: 'bg-emerald-500/20 text-emerald-400',
  TE: 'bg-yellow-500/20 text-yellow-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-orange-500/20 text-orange-400',
}

const MatchupDetail = ({ leagueId, weekNumber, homeUserId, awayUserId, homeTeam, awayTeam, matchup, onClose }) => {
  const [weekScores, setWeekScores] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leagueId || !weekNumber) return
    setLoading(true)
    api.getNflWeeklyScores(leagueId, weekNumber)
      .then(data => setWeekScores(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [leagueId, weekNumber])

  const teamScoresMap = (weekScores?.teams || []).reduce((acc, t) => {
    acc[t.userId] = t
    return acc
  }, {})

  const homeScores = teamScoresMap[homeUserId]
  const awayScores = teamScoresMap[awayUserId]

  const sortPlayers = (playerScores) => {
    if (!playerScores) return []
    const starters = playerScores.filter(p => p.position === 'ACTIVE').sort((a, b) => (b.points || 0) - (a.points || 0))
    const bench = playerScores.filter(p => p.position !== 'ACTIVE').sort((a, b) => (b.points || 0) - (a.points || 0))
    return [...starters, ...bench]
  }

  const homePlayers = sortPlayers(homeScores?.playerScores)
  const awayPlayers = sortPlayers(awayScores?.playerScores)

  if (loading) {
    return (
      <Card className="mt-2">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400" />
        </div>
      </Card>
    )
  }

  const PlayerList = ({ players, teamName, totalPoints, color }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-xs font-bold uppercase tracking-wider ${color}`}>{teamName}</h4>
        <span className="text-sm font-bold font-mono text-white">
          {(totalPoints || 0).toFixed(1)}
        </span>
      </div>
      <div className="space-y-0.5">
        {players.length > 0 ? players.map((p, i) => {
          const isBench = p.position !== 'ACTIVE'
          return (
            <div
              key={p.playerId || i}
              className={`py-1.5 px-2 rounded ${
                isBench ? 'opacity-40' : 'bg-dark-tertiary/30'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {p.nflPos && (
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-6 text-center flex-shrink-0 ${posColors[p.nflPos] || 'bg-dark-tertiary text-text-muted'}`}>
                    {p.nflPos}
                  </span>
                )}
                <span className="flex-1 text-sm text-white truncate">{p.playerName}</span>
                <span className={`text-xs font-bold font-mono w-10 text-right ${
                  p.points > 15 ? 'text-emerald-400' :
                  p.points > 5 ? 'text-white' : 'text-text-muted'
                }`}>
                  {(p.points || 0).toFixed(1)}
                </span>
              </div>
            </div>
          )
        }) : (
          <p className="text-text-muted text-xs py-3 text-center">No scores</p>
        )}
      </div>
    </div>
  )

  return (
    <Card className="mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">Roster Breakdown</span>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-white text-xs"
        >
          Close
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlayerList
          players={homePlayers}
          teamName={homeTeam?.teamName || homeTeam?.name || 'Home'}
          totalPoints={homeScores?.totalPoints || matchup?.homeScore}
          color="text-emerald-400"
        />
        <PlayerList
          players={awayPlayers}
          teamName={awayTeam?.teamName || awayTeam?.name || 'Away'}
          totalPoints={awayScores?.totalPoints || matchup?.awayScore}
          color="text-red-400/80"
        />
      </div>
    </Card>
  )
}

export default MatchupDetail
