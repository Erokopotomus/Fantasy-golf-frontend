import { Link, useNavigate } from 'react-router-dom'
import { useLeagues } from '../hooks/useLeagues'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

const Leagues = () => {
  const { leagues, loading, error } = useLeagues()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading leagues...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">My Leagues</h1>
              <p className="text-text-secondary mt-1">
                Manage your fantasy leagues
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/import">
                <Button variant="secondary">Import League</Button>
              </Link>
              <Link to="/leagues/join">
                <Button variant="secondary">Join League</Button>
              </Link>
              <Link to="/leagues/create">
                <Button>Create League</Button>
              </Link>
            </div>
          </div>

          {error && (
            <Card className="mb-6 border-red-500 bg-red-500/10">
              <p className="text-red-500">{error}</p>
            </Card>
          )}

          {/* Leagues List */}
          {leagues.length === 0 ? (
            <Card className="text-center py-12">
              <div className="w-16 h-16 bg-dark-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">No Leagues Yet</h3>
              <p className="text-text-secondary mb-6">
                Create your first league or join an existing one to start competing!
              </p>
              <div className="flex gap-3 justify-center">
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
              {leagues.map((league) => (
                <Card
                  key={league.id}
                  hover
                  className="cursor-pointer"
                  onClick={() => navigate(`/leagues/${league.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* League Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold font-display text-text-primary">{league.name}</h3>
                        {league.settings?.importedFrom ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                            Imported from {league.settings.importedFrom.charAt(0).toUpperCase() + league.settings.importedFrom.slice(1)}
                          </span>
                        ) : (
                          <>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              league.status === 'active'
                                ? 'bg-gold/20 text-gold'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {league.status === 'active' ? 'Active' : 'Draft Pending'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs bg-dark-tertiary text-text-muted capitalize">
                              {league.type}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
                        {league.settings?.importedFrom ? (
                          <>
                            <span>{league.sport || 'NFL'}</span>
                            <span>League History & Vault</span>
                          </>
                        ) : (
                          <>
                            <span>{league.memberCount || league._count?.members || 0} / {league.maxMembers || league.maxTeams || 10} members</span>
                            <span>Roster: {league.settings?.rosterSize || 6} players</span>
                            {league.userRank && (
                              <span className="text-gold">
                                Rank #{league.userRank} • {league.userPoints?.toLocaleString()} pts
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {league.settings?.importedFrom ? (
                        <>
                          <Link to={`/leagues/${league.id}/vault`}>
                            <Button variant="secondary" size="sm">Vault</Button>
                          </Link>
                          <Link to={`/leagues/${league.id}`}>
                            <Button size="sm">View</Button>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link to={`/leagues/${league.id}/roster`}>
                            <Button variant="secondary" size="sm">Roster</Button>
                          </Link>
                          <Link to={`/leagues/${league.id}/draft`}>
                            <Button variant="secondary" size="sm">Draft</Button>
                          </Link>
                          <Link to={`/leagues/${league.id}`}>
                            <Button size="sm">View</Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Standings Preview */}
                  {league.standings && league.standings.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dark-border">
                      <p className="text-text-muted text-xs mb-2">Top 3 Standings</p>
                      <div className="flex gap-4">
                        {league.standings.slice(0, 3).map((standing, idx) => (
                          <div key={standing.userId} className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              idx === 0 ? 'text-yellow-400' :
                              idx === 1 ? 'text-gray-400' :
                              'text-amber-600'
                            }`}>
                              #{standing.rank}
                            </span>
                            <span className={`text-sm ${
                              standing.userId === '1' ? 'text-gold font-medium' : 'text-text-secondary'
                            }`}>
                              {standing.name}
                            </span>
                            <span className="text-xs text-text-muted">
                              {(standing.points || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Import link — subtle, at bottom */}
          <div className="mt-8 text-center">
            <Link
              to="/import"
              className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import a league from another platform
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Leagues
