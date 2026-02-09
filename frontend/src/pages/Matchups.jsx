import { useState, useMemo } from 'react'
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
  const { schedule, playoffs, standings, divisionStandings, loading, error } = useMatchups(leagueId)

  const [activeTab, setActiveTab] = useState('current')
  const [selectedWeek, setSelectedWeek] = useState(null)

  // Compute active/completed weeks from schedule data directly (no backend dependency)
  const { lastCompletedWeek, activeWeek, nextUpcomingWeek } = useMemo(() => {
    if (!schedule || schedule.length === 0) return {}

    // Active week = has some scores but not all complete (games in progress)
    const active = schedule.find(w => {
      const hasScores = w.matchups.some(m => m.homeScore > 0 || m.awayScore > 0)
      const hasIncomplete = w.matchups.some(m => !m.completed)
      return hasScores && hasIncomplete
    })

    // All completed weeks (all matchups done)
    const completed = schedule.filter(w => w.matchups.every(m => m.completed))
    const lastCompleted = completed.length > 0 ? completed[completed.length - 1] : null

    // Next upcoming = first week with no scores and not complete
    const upcoming = schedule.find(w => {
      const hasScores = w.matchups.some(m => m.homeScore > 0 || m.awayScore > 0)
      const allComplete = w.matchups.every(m => m.completed)
      return !hasScores && !allComplete
    })

    return { lastCompletedWeek: lastCompleted, activeWeek: active, nextUpcomingWeek: upcoming }
  }, [schedule])

  // The "primary" week for Full Schedule default selection
  const primaryWeek = activeWeek || lastCompletedWeek || nextUpcomingWeek

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
          <h2 className="text-xl font-bold font-display text-white mb-2">Not a Head-to-Head League</h2>
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

  // Show the most relevant matchup: active game week > last completed > next upcoming
  const heroWeek = activeWeek || lastCompletedWeek || nextUpcomingWeek
  const userMatchup = heroWeek?.matchups?.find(
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
        <h1 className="text-2xl font-bold font-display text-white">Matchups</h1>
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
          {/* Your Matchup - hero card */}
          {userMatchup && heroWeek && (
            <div>
              <h2 className="text-lg font-semibold font-display text-white mb-4">
                Your Matchup — Week {heroWeek.week}
              </h2>
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

          {/* Last Completed Week Results (if different from hero) */}
          {lastCompletedWeek && lastCompletedWeek !== heroWeek && (
            <MatchupList
              week={lastCompletedWeek}
              teams={standings}
              leagueId={leagueId}
              currentUserId={user?.id}
            />
          )}

          {/* Current/Hero Week - all matchups */}
          {heroWeek && (
            <MatchupList
              week={heroWeek}
              teams={standings}
              leagueId={leagueId}
              currentUserId={user?.id}
            />
          )}

          {/* Upcoming week preview (if hero is completed and there's a next week) */}
          {nextUpcomingWeek && heroWeek && heroWeek !== nextUpcomingWeek && (
            <MatchupList
              week={nextUpcomingWeek}
              teams={standings}
              leagueId={leagueId}
              currentUserId={user?.id}
            />
          )}

          {!heroWeek && (
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
                  selectedWeek === week.week || (!selectedWeek && week.week === primaryWeek?.week)
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
            (selectedWeek === week.week || (!selectedWeek && week.week === primaryWeek?.week)) && (
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
        <H2HStandings standings={standings} currentUserId={user?.id} divisionStandings={divisionStandings} />
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
