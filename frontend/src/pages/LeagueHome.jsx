import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLeagues } from '../hooks/useLeagues'
import { useLeagueFormat, LEAGUE_FORMATS } from '../hooks/useLeagueFormat'
import { useAuth } from '../context/AuthContext'
import useActivity from '../hooks/useActivity'
import api from '../services/api'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import ChatPanel from '../components/chat/ChatPanel'
import ActivityFeed from '../components/dashboard/ActivityFeed'

const LeagueHome = () => {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { leagues, loading: leaguesLoading } = useLeagues()
  const [creatingDraft, setCreatingDraft] = useState(false)
  const { activity, loading: activityLoading } = useActivity(leagueId, 10)
  const [detailedLeague, setDetailedLeague] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)

  // Fetch detailed league data (with full members, teams, rosters)
  useEffect(() => {
    if (!leagueId) return
    setDetailLoading(true)
    api.getLeague(leagueId)
      .then(data => setDetailedLeague(data.league || data))
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [leagueId])

  const loading = leaguesLoading && detailLoading
  const league = detailedLeague || leagues?.find(l => l.id === leagueId)
  const { format, hasDraft, isHeadToHead, isRoto, isSurvivor, isOneAndDone } = useLeagueFormat(league)

  const isCommissioner = league?.ownerId === user?.id || league?.owner?.id === user?.id
  const latestDraft = league?.drafts?.[0]
  const draftStatus = latestDraft?.status
  const hasDraftRecord = !!latestDraft
  const isDraftScheduledOrInProgress = draftStatus === 'SCHEDULED' || draftStatus === 'IN_PROGRESS' || draftStatus === 'PAUSED'
  const isDraftComplete = draftStatus === 'COMPLETED'

  const handleCreateDraft = async () => {
    try {
      setCreatingDraft(true)
      await api.createDraft(leagueId)
      navigate(`/leagues/${leagueId}/draft`)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingDraft(false)
    }
  }

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
                <span className="text-text-secondary">{format?.name || 'League'}</span>
                {hasDraft && (
                  <>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-secondary capitalize">{league.draftType} Draft</span>
                  </>
                )}
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
              {/* Standard buttons for leagues with rosters */}
              {!isOneAndDone && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/leagues/${leagueId}/roster`)}
                  >
                    My Roster
                  </Button>
                  {hasDraft && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/leagues/${leagueId}/draft`)}
                    >
                      Draft Room
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/leagues/${leagueId}/waivers`)}
                  >
                    Waivers
                  </Button>
                </>
              )}

              {/* Format-specific buttons */}
              {isHeadToHead && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/matchups`)}
                >
                  Matchups
                </Button>
              )}
              {isRoto && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/categories`)}
                >
                  Categories
                </Button>
              )}
              {isSurvivor && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/survivor`)}
                >
                  Survivor Board
                </Button>
              )}
              {isOneAndDone && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/picks`)}
                >
                  Pick Center
                </Button>
              )}

              {/* Common buttons */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/players`)}
              >
                Players
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/standings`)}
              >
                Standings
              </Button>
              {!isOneAndDone && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/leagues/${leagueId}/trades`)}
                >
                  Trades
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/leagues/${leagueId}/settings`)}
              >
                Settings
              </Button>
            </div>
          </div>

          {/* Draft Status Banner */}
          {hasDraft && !isOneAndDone && (
            <div className="mb-6">
              {!hasDraftRecord && isCommissioner && (
                <Card className="border-accent-green/30 bg-gradient-to-r from-accent-green/10 to-dark-secondary">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Ready to Draft?</h3>
                      <p className="text-text-secondary text-sm">Create a draft for this league to get started.</p>
                    </div>
                    <Button onClick={handleCreateDraft} disabled={creatingDraft}>
                      {creatingDraft ? 'Creating...' : 'Create Draft'}
                    </Button>
                  </div>
                </Card>
              )}
              {isDraftScheduledOrInProgress && (
                <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-dark-secondary">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {draftStatus === 'SCHEDULED' ? 'Draft Scheduled' :
                         draftStatus === 'PAUSED' ? 'Draft Paused' : 'Draft In Progress'}
                      </h3>
                      <p className="text-text-secondary text-sm">
                        {draftStatus === 'SCHEDULED'
                          ? 'The draft is set up and ready to start.'
                          : draftStatus === 'PAUSED'
                          ? 'The commissioner has paused the draft.'
                          : 'The draft is live! Join the draft room now.'}
                      </p>
                    </div>
                    <Button onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
                      Enter Draft Room
                    </Button>
                  </div>
                </Card>
              )}
              {isDraftComplete && (
                <Card className="border-dark-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-green/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Draft Complete</h3>
                      <p className="text-text-muted text-sm">The draft has finished. Manage your roster below.</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

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
                    <span className="text-text-muted">Format</span>
                    <span className="text-accent-green">{format?.name || 'League'}</span>
                  </div>
                  {hasDraft && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Draft Type</span>
                      <span className="text-white capitalize">{league.draftType}</span>
                    </div>
                  )}
                  {!isOneAndDone && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Roster Size</span>
                      <span className="text-white">{league.settings?.rosterSize || 6} players</span>
                    </div>
                  )}
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

              {/* Activity Feed */}
              <Card>
                <h3 className="text-base font-semibold text-white mb-4">Recent Activity</h3>
                <ActivityFeed activity={activity} loading={activityLoading} />
              </Card>
            </div>

            {/* Right Column - Members & Chat */}
            <div className="lg:col-span-2 space-y-6">
              {/* League Members / Teams */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Teams</h3>
                  <span className="text-text-muted text-sm">
                    {league.teams?.length || league._count?.teams || 0} / {league.maxTeams || '–'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-border text-xs text-text-muted">
                        <th className="pb-2 text-left w-10">#</th>
                        <th className="pb-2 text-left">Team</th>
                        <th className="pb-2 text-left">Owner</th>
                        <th className="pb-2 text-center">Players</th>
                        <th className="pb-2 text-center">W-L</th>
                        <th className="pb-2 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(league.standings || league.teams || []).map((team, i) => {
                        const rank = team.rank || i + 1
                        const isMe = team.userId === user?.id
                        const ownerName = team.user?.name || team.name
                        const rosterCount = team.roster?.length || 0
                        return (
                          <tr
                            key={team.id || i}
                            onClick={() => team.id && navigate(`/leagues/${leagueId}/roster/${team.id}`)}
                            className={`
                              border-b border-dark-border/30 transition-colors cursor-pointer
                              ${isMe ? 'bg-emerald-500/8' : 'hover:bg-dark-tertiary/50'}
                            `}
                          >
                            <td className={`py-3 font-bold ${
                              rank === 1 ? 'text-yellow-400' :
                              rank === 2 ? 'text-gray-300' :
                              rank === 3 ? 'text-amber-500' : 'text-text-muted'
                            }`}>
                              {rank}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-dark-tertiary rounded-full flex items-center justify-center text-xs font-semibold text-text-secondary flex-shrink-0">
                                  {(team.name || ownerName || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className={`font-medium truncate ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                                  {team.name || 'Team ' + rank}
                                  {isMe && <span className="text-xs text-emerald-400/60 ml-1">(You)</span>}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-text-secondary truncate max-w-[120px]">
                              {ownerName}
                            </td>
                            <td className="py-3 text-center text-text-secondary">
                              {rosterCount || '–'}
                            </td>
                            <td className="py-3 text-center text-text-secondary">
                              {team.wins != null ? `${team.wins}-${team.losses || 0}` : '–'}
                            </td>
                            <td className="py-3 text-right font-semibold text-white">
                              {team.totalPoints?.toLocaleString() || '0'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {(!league.standings?.length && !league.teams?.length) && (
                    <div className="text-center py-8 text-text-muted text-sm">
                      No teams yet. Invite members to join!
                    </div>
                  )}
                </div>

                {/* League members without teams */}
                {league.members && league.members.length > (league.teams?.length || 0) && (
                  <div className="mt-4 pt-4 border-t border-dark-border">
                    <p className="text-xs text-text-muted mb-2">Members without teams</p>
                    <div className="flex flex-wrap gap-2">
                      {league.members
                        .filter(m => !league.teams?.some(t => t.userId === m.userId))
                        .map(m => (
                          <span key={m.userId} className="px-2 py-1 bg-dark-tertiary rounded text-xs text-text-secondary">
                            {m.user?.name || 'Member'}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}
              </Card>

              {/* Chat - compact */}
              <ChatPanel
                leagueId={leagueId}
                leagueName={league.name}
                memberCount={league.memberCount || league._count?.members || league.members?.length}
                className="h-[400px]"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LeagueHome
