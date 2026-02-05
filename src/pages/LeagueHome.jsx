import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLeagues } from '../hooks/useLeagues'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import ChatPanel from '../components/chat/ChatPanel'

const LeagueHome = () => {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { leagues, loading } = useLeagues()

  const league = leagues?.find(l => l.id === leagueId)

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading league...</p>
        </div>
      </div>
    )
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center py-12">
              <h2 className="text-xl font-bold text-white mb-2">League Not Found</h2>
              <p className="text-text-secondary mb-6">This league doesn't exist or you don't have access.</p>
              <Link to="/leagues" className="text-accent-green hover:underline">
                Back to Leagues
              </Link>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <Link
                to="/leagues"
                className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All Leagues
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{league.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-text-secondary capitalize">{league.type} Draft</span>
                <span className="text-text-muted">•</span>
                <span className="text-text-secondary">{league.memberCount} members</span>
                <span className="text-text-muted">•</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  league.status === 'active' ? 'bg-accent-green/20 text-accent-green' :
                  league.status === 'draft-pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-dark-tertiary text-text-muted'
                }`}>
                  {league.status === 'active' ? 'Active' :
                   league.status === 'draft-pending' ? 'Draft Pending' : league.status}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/roster`)}
              >
                My Roster
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/draft`)}
              >
                Draft Room
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/waivers`)}
              >
                Waivers
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/standings`)}
              >
                Standings
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/trades`)}
              >
                Trades
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/settings`)}
              >
                Settings
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Standings & Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Your Position */}
              <Card className="bg-gradient-to-br from-accent-green/20 to-dark-secondary border-accent-green/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Your Position</h3>
                  <span className={`text-3xl font-bold ${
                    league.userRank === 1 ? 'text-yellow-400' :
                    league.userRank <= 3 ? 'text-accent-green' : 'text-white'
                  }`}>
                    #{league.userRank}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-primary/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-accent-green">{league.userPoints?.toLocaleString()}</p>
                    <p className="text-text-muted text-xs">Total Points</p>
                  </div>
                  <div className="bg-dark-primary/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">
                      {league.leader?.points - league.userPoints > 0 ? '-' : '+'}{Math.abs(league.leader?.points - league.userPoints)}
                    </p>
                    <p className="text-text-muted text-xs">vs Leader</p>
                  </div>
                </div>
              </Card>

              {/* Standings */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Standings</h3>
                  <span className="text-text-muted text-sm">{league.standings?.length} teams</span>
                </div>
                <div className="space-y-2">
                  {league.standings?.slice(0, 8).map((team) => (
                    <div
                      key={team.userId}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        team.userId === '1' ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-dark-tertiary'
                      }`}
                    >
                      <span className={`text-lg font-bold w-6 ${
                        team.rank === 1 ? 'text-yellow-400' :
                        team.rank === 2 ? 'text-gray-300' :
                        team.rank === 3 ? 'text-amber-600' : 'text-text-muted'
                      }`}>
                        {team.rank}
                      </span>
                      <div className="w-8 h-8 bg-dark-primary rounded-full flex items-center justify-center text-sm font-semibold text-text-secondary">
                        {team.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${team.userId === '1' ? 'text-accent-green' : 'text-white'}`}>
                          {team.name}
                          {team.userId === '1' && <span className="text-xs ml-1">(You)</span>}
                        </p>
                      </div>
                      <span className="text-text-secondary font-medium">{team.points?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* League Info */}
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">League Settings</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Draft Type</span>
                    <span className="text-white capitalize">{league.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Roster Size</span>
                    <span className="text-white">{league.settings?.rosterSize || 6} players</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Scoring</span>
                    <span className="text-white capitalize">{league.settings?.scoringType || 'Standard'}</span>
                  </div>
                  {league.settings?.budget && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Budget</span>
                      <span className="text-white">${league.settings.budget}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-muted">Current Event</span>
                    <span className="text-accent-green">{league.currentRound || 'TBD'}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Chat */}
            <div className="lg:col-span-2">
              <ChatPanel
                leagueId={leagueId}
                leagueName={league.name}
                memberCount={league.memberCount}
                className="h-[700px]"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LeagueHome
