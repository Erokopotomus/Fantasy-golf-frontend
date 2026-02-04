import { Link } from 'react-router-dom'
import { useLeagues } from '../hooks/useLeagues'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

const Draft = () => {
  const { leagues, loading } = useLeagues()

  // Filter leagues that have drafts available
  const leaguesWithDrafts = leagues.filter(l => l.status === 'active' || l.status === 'draft-pending')

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading drafts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Draft Rooms</h1>
            <p className="text-text-secondary mt-1">
              Join a draft room for any of your leagues
            </p>
          </div>

          {/* Draft Rooms */}
          {leaguesWithDrafts.length === 0 ? (
            <Card className="text-center py-12">
              <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Draft Rooms Available</h3>
              <p className="text-text-secondary mb-6">
                Join or create a league to access draft rooms
              </p>
              <Link to="/leagues/create">
                <Button>Create a League</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {leaguesWithDrafts.map((league) => {
                const isDraftActive = league.status === 'draft-pending'

                return (
                  <Card key={league.id} className={isDraftActive ? 'border-accent-green/50' : ''}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{league.name}</h3>
                          {isDraftActive && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-green/20 text-accent-green animate-pulse">
                              Draft Ready
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-xs bg-dark-tertiary text-text-muted capitalize">
                            {league.type} Draft
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
                          <span>{league.memberCount} / {league.maxMembers} members</span>
                          <span>Roster Size: {league.settings?.rosterSize || 6}</span>
                          {league.type === 'auction' && league.settings?.budget && (
                            <span>Budget: ${league.settings.budget}</span>
                          )}
                        </div>
                      </div>

                      <Link to={`/leagues/${league.id}/draft`}>
                        <Button variant={isDraftActive ? 'primary' : 'secondary'}>
                          {isDraftActive ? 'Enter Draft' : 'View Draft Room'}
                        </Button>
                      </Link>
                    </div>

                    {/* Draft Info */}
                    <div className="mt-4 pt-4 border-t border-dark-border">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-text-muted text-xs">Type</p>
                          <p className="text-white font-medium capitalize">{league.type}</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs">Scoring</p>
                          <p className="text-white font-medium capitalize">
                            {league.settings?.scoringType === 'strokes-gained' ? 'Strokes Gained' : 'Standard'}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs">Rounds</p>
                          <p className="text-white font-medium">{league.settings?.rosterSize || 6}</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs">Status</p>
                          <p className={`font-medium ${isDraftActive ? 'text-accent-green' : 'text-text-secondary'}`}>
                            {isDraftActive ? 'Ready' : 'Completed'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Tips */}
          <Card className="mt-8 bg-dark-primary border-accent-blue/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-accent-blue/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">Draft Tips</h3>
                <ul className="text-text-muted text-sm space-y-1">
                  <li>• Build your draft queue before the draft starts</li>
                  <li>• Queue players auto-pick if you run out of time</li>
                  <li>• In auction drafts, save budget for later rounds</li>
                  <li>• Check player recent form before drafting</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default Draft
