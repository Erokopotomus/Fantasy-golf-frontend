import { Link } from 'react-router-dom'
import { useLeagues } from '../hooks/useLeagues'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

const draftTypeLabels = {
  SNAKE: 'Snake',
  AUCTION: 'Auction',
  NONE: 'No Draft',
  snake: 'Snake',
  auction: 'Auction',
}

const Draft = () => {
  const { leagues, loading } = useLeagues()

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
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Draft Center</h1>
            <p className="text-text-secondary mt-1">
              Access your league drafts or practice with a mock draft
            </p>
          </div>

          {/* Draft History Link */}
          <Link to="/draft/history" className="block mb-4 group">
            <Card className="border-dark-border hover:border-accent-blue/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent-blue/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Draft History & Grades</h3>
                    <p className="text-text-secondary text-sm">Review past drafts with pick-by-pick grades</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-text-muted group-hover:text-accent-blue group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          </Link>

          {/* Mock Draft CTA */}
          <Link to="/mock-draft" className="block mb-6 group">
            <Card className="border-accent-green/30 hover:border-accent-green/60 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent-green/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Mock Draft</h3>
                    <p className="text-text-secondary text-sm">Practice your strategy against AI opponents</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-text-muted group-hover:text-accent-green group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          </Link>

          {/* League Drafts */}
          <h2 className="text-lg font-semibold text-white mb-4">League Drafts</h2>

          {leagues.length === 0 ? (
            <Card className="text-center py-12">
              <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Leagues Yet</h3>
              <p className="text-text-secondary mb-6">
                Join or create a league to access draft rooms
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/leagues/create">
                  <Button>Create a League</Button>
                </Link>
                <Link to="/leagues/join">
                  <Button variant="outline">Join a League</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {leagues.map((league) => {
                const memberCount = league.memberCount || league._count?.members || 0
                const maxMembers = league.maxMembers || league.maxTeams || 10
                const draftType = league.draftType || league.type || 'SNAKE'
                const typeLabel = draftTypeLabels[draftType] || draftType
                const hasDraft = league.drafts?.length > 0
                const draftStatus = hasDraft ? league.drafts[0].status : null
                const isDraftReady = !hasDraft || draftStatus === 'SCHEDULED'
                const isDraftInProgress = draftStatus === 'IN_PROGRESS' || draftStatus === 'PAUSED'
                const isDraftComplete = draftStatus === 'COMPLETED'

                return (
                  <Card key={league.id} className={isDraftReady ? 'border-accent-green/50' : ''}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-white">{league.name}</h3>
                          {isDraftReady && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-green/20 text-accent-green">
                              {memberCount >= maxMembers ? 'Ready to Draft' : 'Pre-Draft'}
                            </span>
                          )}
                          {isDraftInProgress && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                              {draftStatus === 'PAUSED' ? 'Paused' : 'Live'}
                            </span>
                          )}
                          {isDraftComplete && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-dark-tertiary text-text-muted">
                              Draft Complete
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-xs bg-dark-tertiary text-text-muted">
                            {typeLabel} Draft
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
                          <span>{memberCount}/{maxMembers} members</span>
                          <span>Roster: {league.settings?.rosterSize || 6} players</span>
                          {(draftType === 'AUCTION' || draftType === 'auction') && league.settings?.budget && (
                            <span>Budget: ${league.settings.budget}</span>
                          )}
                        </div>
                      </div>

                      <Link to={`/leagues/${league.id}/draft`}>
                        <Button variant={isDraftInProgress || (isDraftReady && memberCount >= maxMembers) ? 'primary' : 'secondary'}>
                          {isDraftInProgress ? 'Join Draft' : isDraftReady ? 'Enter Draft' : 'View Draft'}
                        </Button>
                      </Link>
                    </div>

                    {/* Draft Info */}
                    <div className="mt-4 pt-4 border-t border-dark-border">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-text-muted text-xs">Type</p>
                          <p className="text-white font-medium">{typeLabel}</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs">Scoring</p>
                          <p className="text-white font-medium">
                            {league.settings?.scoringType === 'strokes-gained' ? 'Strokes Gained' : 'Standard'}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs">Roster Size</p>
                          <p className="text-white font-medium">{league.settings?.rosterSize || 6}</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs">Status</p>
                          <p className={`font-medium ${
                            isDraftInProgress ? 'text-yellow-400' :
                            isDraftReady && memberCount >= maxMembers ? 'text-accent-green' :
                            isDraftReady ? 'text-yellow-400' :
                            'text-text-secondary'
                          }`}>
                            {isDraftInProgress ? (draftStatus === 'PAUSED' ? 'Paused' : 'In Progress') :
                             isDraftReady && memberCount >= maxMembers ? 'Ready' :
                             isDraftReady ? 'Waiting for Members' :
                             'Completed'}
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
                  <li>Build your draft queue before the draft starts</li>
                  <li>Queue players auto-pick if you run out of time</li>
                  <li>In auction drafts, save budget for later rounds</li>
                  <li>Check player recent form before drafting</li>
                  <li>Try a mock draft first to practice your strategy</li>
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
