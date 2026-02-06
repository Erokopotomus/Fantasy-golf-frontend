import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeague } from '../hooks/useLeague'
import useMatchups from '../hooks/useMatchups'
import Card from '../components/common/Card'
import MatchupCard from '../components/matchups/MatchupCard'
import MatchupList from '../components/matchups/MatchupList'
import PlayoffBracket from '../components/matchups/PlayoffBracket'
import H2HStandings from '../components/standings/H2HStandings'

const Matchups = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { league, loading: leagueLoading } = useLeague(leagueId)
  const { schedule, currentWeek, playoffs, standings, loading, error } = useMatchups(leagueId)

  const [activeTab, setActiveTab] = useState('current')
  const [selectedWeek, setSelectedWeek] = useState(null)

  if (leagueLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading matchups...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <Link to={`/leagues/${leagueId}`} className="text-emerald-400 hover:underline">
            Back to League
          </Link>
        </div>
      </div>
    )
  }

  // Accept both frontend and backend format strings
  const isH2H = league?.format === 'HEAD_TO_HEAD' || league?.format === 'head-to-head'

  if (!league || !isH2H) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="text-center py-12">
          <h2 className="text-xl font-bold text-white mb-2">Not a Head-to-Head League</h2>
          <p className="text-text-secondary mb-6">
            Matchups are only available for Head-to-Head format leagues.
          </p>
          <Link to={`/leagues/${leagueId}`} className="text-emerald-400 hover:underline">
            Back to League
          </Link>
        </Card>
      </div>
    )
  }

  // Team lookup from standings (keyed by userId)
  const teamLookup = standings.reduce((acc, team) => {
    acc[team.userId] = team
    return acc
  }, {})

  // Get user's current matchup
  const userMatchup = currentWeek?.matchups?.find(
    m => m.home === user?.id || m.away === user?.id
  )

  const tabs = [
    { id: 'current', label: 'This Week' },
    { id: 'schedule', label: 'Full Schedule' },
    { id: 'standings', label: 'Standings' },
    { id: 'playoffs', label: 'Playoffs' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/leagues/${leagueId}`}
          className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {league.name}
        </Link>
        <h1 className="text-2xl font-bold text-white">Matchups</h1>
        <p className="text-text-secondary">Head-to-Head competition</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white'
                : 'bg-dark-tertiary text-text-secondary hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Current Week Tab */}
      {activeTab === 'current' && (
        <div className="space-y-6">
          {/* Your Matchup */}
          {userMatchup && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Your Matchup</h2>
              <div className="max-w-md">
                <MatchupCard
                  matchup={userMatchup}
                  homeTeam={teamLookup[userMatchup.home]}
                  awayTeam={teamLookup[userMatchup.away]}
                  currentUserId={user?.id}
                  detailed
                />
              </div>
            </div>
          )}

          {/* All Matchups This Week */}
          {currentWeek && (
            <MatchupList
              week={currentWeek}
              teams={standings}
              leagueId={leagueId}
              currentUserId={user?.id}
            />
          )}

          {!currentWeek && (
            <Card className="text-center py-8">
              <p className="text-text-muted">No matchups scheduled yet</p>
            </Card>
          )}
        </div>
      )}

      {/* Full Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Week Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {schedule.map(week => (
              <button
                key={week.week}
                onClick={() => setSelectedWeek(week.week)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedWeek === week.week || (!selectedWeek && week.week === currentWeek?.week)
                    ? 'bg-emerald-500 text-white'
                    : week.matchups?.every(m => m.completed)
                    ? 'bg-dark-tertiary text-text-secondary'
                    : 'bg-dark-tertiary text-white border border-yellow-500/50'
                }`}
              >
                Week {week.week}
              </button>
            ))}
          </div>

          {/* Selected Week Matchups */}
          {schedule.map(week => (
            (selectedWeek === week.week || (!selectedWeek && week.week === currentWeek?.week)) && (
              <MatchupList
                key={week.week}
                week={week}
                teams={standings}
                leagueId={leagueId}
                currentUserId={user?.id}
              />
            )
          ))}
        </div>
      )}

      {/* Standings Tab */}
      {activeTab === 'standings' && (
        <H2HStandings standings={standings} currentUserId={user?.id} />
      )}

      {/* Playoffs Tab */}
      {activeTab === 'playoffs' && (
        <PlayoffBracket
          bracket={playoffs}
          teams={standings}
          currentUserId={user?.id}
        />
      )}
    </div>
  )
}

export default Matchups
