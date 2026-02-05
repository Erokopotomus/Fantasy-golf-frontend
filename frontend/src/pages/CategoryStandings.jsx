import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeagues } from '../hooks/useLeagues'
import useRotoCategories from '../hooks/useRotoCategories'
import Card from '../components/common/Card'
import CategoryTable from '../components/roto/CategoryTable'
import RotoOverview from '../components/roto/RotoOverview'
import RotoStandings from '../components/standings/RotoStandings'

const CategoryStandings = () => {
  const { leagueId } = useParams()
  const { user } = useAuth()
  const { leagues, loading: leaguesLoading } = useLeagues()
  const { categories, categoryLabels, standings, loading, error } = useRotoCategories(leagueId)

  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTeam, setSelectedTeam] = useState(null)

  const league = leagues?.find(l => l.id === leagueId)

  if (leaguesLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-green mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading categories...</p>
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
          <Link to={`/leagues/${leagueId}`} className="text-accent-green hover:underline">
            Back to League
          </Link>
        </div>
      </div>
    )
  }

  if (!league || league.format !== 'roto') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="text-center py-12">
          <h2 className="text-xl font-bold text-white mb-2">Not a Roto League</h2>
          <p className="text-text-secondary mb-6">
            Category standings are only available for Rotisserie format leagues.
          </p>
          <Link to={`/leagues/${leagueId}`} className="text-accent-green hover:underline">
            Back to League
          </Link>
        </Card>
      </div>
    )
  }

  // Get user's team or selected team
  const displayTeam = selectedTeam
    ? standings.find(s => s.userId === selectedTeam)
    : standings.find(s => s.userId === user?.id)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'table', label: 'Full Table' },
    { id: 'standings', label: 'Standings' },
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
        <h1 className="text-2xl font-bold text-white">Roto Categories</h1>
        <p className="text-text-secondary">Track your performance across {categories.length} categories</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-text-muted mb-1">Your Rank</p>
          <p className="text-2xl font-bold text-white">
            #{standings.findIndex(s => s.userId === user?.id) + 1 || '-'}
          </p>
          <p className="text-xs text-text-secondary">of {standings.length} teams</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Your Points</p>
          <p className="text-2xl font-bold text-accent-green">
            {displayTeam?.totalRotoPoints || 0}
          </p>
          <p className="text-xs text-text-secondary">total roto points</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Categories</p>
          <p className="text-2xl font-bold text-white">{categories.length}</p>
          <p className="text-xs text-text-secondary">being tracked</p>
        </Card>

        <Card>
          <p className="text-xs text-text-muted mb-1">Max Points</p>
          <p className="text-2xl font-bold text-white">
            {categories.length * standings.length}
          </p>
          <p className="text-xs text-text-secondary">possible points</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-green text-white'
                : 'bg-dark-tertiary text-text-secondary hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Team Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {standings.map(team => (
              <button
                key={team.userId}
                onClick={() => setSelectedTeam(team.userId === user?.id ? null : team.userId)}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  (!selectedTeam && team.userId === user?.id) || selectedTeam === team.userId
                    ? 'bg-accent-green text-white'
                    : 'bg-dark-tertiary text-text-secondary hover:text-white'
                }`}
              >
                {team.name}
                {team.userId === user?.id && ' (You)'}
              </button>
            ))}
          </div>

          {/* Team Overview */}
          {displayTeam && (
            <RotoOverview
              team={displayTeam}
              categories={categories}
              categoryLabels={categoryLabels}
              totalTeams={standings.length}
              currentUserId={user?.id}
            />
          )}
        </div>
      )}

      {/* Full Table Tab */}
      {activeTab === 'table' && (
        <CategoryTable
          standings={standings}
          categories={categories}
          categoryLabels={categoryLabels}
          currentUserId={user?.id}
        />
      )}

      {/* Standings Tab */}
      {activeTab === 'standings' && (
        <RotoStandings standings={standings} currentUserId={user?.id} />
      )}
    </div>
  )
}

export default CategoryStandings
