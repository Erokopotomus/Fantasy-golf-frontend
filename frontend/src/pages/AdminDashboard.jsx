import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import api from '../services/api'

const FEATURE_LABELS = {
  ambient: 'Ambient Insights',
  draftNudge: 'Draft Nudges',
  boardCoach: 'Board Coaching',
  predictionContext: 'Prediction Context',
  deepReports: 'Deep Reports',
  scoutReports: 'Scout Reports',
  sim: 'Sim',
}

const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [leagues, setLeagues] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [leagueSearch, setLeagueSearch] = useState('')
  const [tournamentSearch, setTournamentSearch] = useState('')
  const [tournamentFilter, setTournamentFilter] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [leaguePage, setLeaguePage] = useState(1)
  const [tournamentPage, setTournamentPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [leagueTotal, setLeagueTotal] = useState(0)
  const [tournamentTotal, setTournamentTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // AI Engine state
  const [aiConfig, setAiConfig] = useState(null)
  const [aiSpend, setAiSpend] = useState(null)
  const [aiSaving, setAiSaving] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard')
      return
    }
    loadStats()
  }, [user])

  useEffect(() => {
    if (user?.role === 'admin') loadUsers()
  }, [userSearch, userPage])

  useEffect(() => {
    if (user?.role === 'admin') loadLeagues()
  }, [leagueSearch, leaguePage])

  useEffect(() => {
    if (user?.role === 'admin') loadTournaments()
  }, [tournamentSearch, tournamentFilter, tournamentPage])

  useEffect(() => {
    if (user?.role === 'admin' && activeTab === 'ai') loadAiConfig()
  }, [activeTab])

  const loadStats = async () => {
    try {
      const data = await api.getAdminStats()
      setStats(data.stats)
    } catch (err) {
      console.error('Failed to load admin stats:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await api.getAdminUsers({ page: userPage, limit: 25, search: userSearch || undefined })
      setUsers(data.users)
      setUserTotal(data.total)
    } catch (err) {
      console.error('Failed to load users:', err.message)
    }
  }

  const loadLeagues = async () => {
    try {
      const data = await api.getAdminLeagues({ page: leaguePage, limit: 25, search: leagueSearch || undefined })
      setLeagues(data.leagues)
      setLeagueTotal(data.total)
    } catch (err) {
      console.error('Failed to load leagues:', err.message)
    }
  }

  const loadTournaments = async () => {
    try {
      const data = await api.getAdminTournaments({
        page: tournamentPage,
        limit: 25,
        search: tournamentSearch || undefined,
        status: tournamentFilter || undefined,
      })
      setTournaments(data.tournaments)
      setTournamentTotal(data.total)
    } catch (err) {
      console.error('Failed to load tournaments:', err.message)
    }
  }

  const loadAiConfig = async () => {
    try {
      const [configData, spendData] = await Promise.all([
        api.getAiConfig(),
        api.getAiSpend(),
      ])
      setAiConfig(configData.config)
      setAiSpend(spendData.spend)
      setBudgetInput(String(configData.config?.dailyTokenBudget || 100000))
    } catch (err) {
      console.error('Failed to load AI config:', err.message)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    if (userId === user.id) return
    try {
      await api.updateUserRole(userId, newRole)
      loadUsers()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleKillSwitch = useCallback(async () => {
    if (!aiConfig) return
    setAiSaving(true)
    try {
      const data = await api.updateAiConfig({ enabled: !aiConfig.enabled })
      setAiConfig(data.config)
    } catch (err) {
      console.error('Failed to toggle kill switch:', err.message)
    } finally {
      setAiSaving(false)
    }
  }, [aiConfig])

  const toggleFeature = useCallback(async (feature) => {
    if (!aiConfig) return
    setAiSaving(true)
    try {
      const toggles = { ...aiConfig.featureToggles, [feature]: !aiConfig.featureToggles[feature] }
      const data = await api.updateAiConfig({ featureToggles: toggles })
      setAiConfig(data.config)
    } catch (err) {
      console.error('Failed to toggle feature:', err.message)
    } finally {
      setAiSaving(false)
    }
  }, [aiConfig])

  const saveBudget = useCallback(async () => {
    const budget = parseInt(budgetInput)
    if (isNaN(budget) || budget < 0) return
    setAiSaving(true)
    try {
      const data = await api.updateAiConfig({ dailyTokenBudget: budget })
      setAiConfig(data.config)
    } catch (err) {
      console.error('Failed to update budget:', err.message)
    } finally {
      setAiSaving(false)
    }
  }, [budgetInput])

  if (user?.role !== 'admin') return null

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Users', value: stats?.users || 0, color: 'text-gold', tab: 'users' },
    { label: 'Total Leagues', value: stats?.leagues || 0, color: 'text-emerald-400', tab: 'leagues' },
    { label: 'Active Drafts', value: stats?.activeDrafts || 0, color: 'text-blue-400', tab: 'leagues' },
    { label: 'Live Tournaments', value: stats?.activeTournaments || 0, color: 'text-orange', tab: 'tournaments' },
  ]

  const userPageCount = Math.ceil(userTotal / 25)
  const leaguePageCount = Math.ceil(leagueTotal / 25)
  const tournamentPageCount = Math.ceil(tournamentTotal / 25)

  const statusColor = (status) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-emerald-500/20 text-emerald-400'
      case 'UPCOMING': return 'bg-blue-500/20 text-blue-400'
      case 'COMPLETED': return 'bg-dark-tertiary text-text-muted'
      case 'CANCELLED': return 'bg-red-500/20 text-red-400'
      default: return 'bg-dark-tertiary text-text-muted'
    }
  }

  const formatPurse = (purse) => {
    if (!purse) return '—'
    if (purse >= 1000000) return `$${(purse / 1000000).toFixed(1)}M`
    return `$${(purse / 1000).toFixed(0)}K`
  }

  const formatTokens = (n) => {
    if (!n) return '0'
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n)
  }

  const Toggle = ({ enabled, onToggle, disabled }) => (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-emerald-500' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-0'
      }`} />
    </button>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-white">Admin Dashboard</h1>
        <p className="text-text-secondary">System overview and management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <Card
            key={s.label}
            className="text-center cursor-pointer hover:border-gold/30 transition-colors"
            onClick={() => setActiveTab(s.tab)}
          >
            <p className={`text-3xl font-bold font-display ${s.color}`}>{s.value}</p>
            <p className="text-xs text-text-muted mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['users', 'leagues', 'tournaments', 'ai'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-gold text-white'
                : 'bg-dark-tertiary text-text-secondary hover:text-white'
            }`}
          >
            {tab === 'ai' ? 'AI Engine' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Users ({userTotal})</h3>
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={e => { setUserSearch(e.target.value); setUserPage(1) }}
              className="px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm w-64 focus:border-gold focus:outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted border-b border-dark-border">
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Username</th>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-left py-2 px-3">Leagues</th>
                  <th className="text-left py-2 px-3">Joined</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-dark-border/50 hover:bg-surface-hover">
                    <td className="py-2 px-3 text-white">{u.name}</td>
                    <td className="py-2 px-3 text-text-muted font-mono text-xs">{u.username ? `@${u.username}` : '—'}</td>
                    <td className="py-2 px-3 text-text-secondary">{u.email}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === 'admin' ? 'bg-gold/20 text-gold' : 'bg-dark-tertiary text-text-muted'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-text-secondary">{u._count?.ownedLeagues || 0}</td>
                    <td className="py-2 px-3 text-text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3">
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            u.role === 'admin'
                              ? 'text-red-400 hover:bg-red-500/10'
                              : 'text-gold hover:bg-gold/10'
                          }`}
                        >
                          {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {userPageCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="px-3 py-1 bg-dark-tertiary rounded text-sm text-text-secondary disabled:opacity-50">Prev</button>
              <span className="text-text-muted text-sm">Page {userPage} of {userPageCount}</span>
              <button onClick={() => setUserPage(p => Math.min(userPageCount, p + 1))} disabled={userPage === userPageCount} className="px-3 py-1 bg-dark-tertiary rounded text-sm text-text-secondary disabled:opacity-50">Next</button>
            </div>
          )}
        </Card>
      )}

      {/* Leagues Tab */}
      {activeTab === 'leagues' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Leagues ({leagueTotal})</h3>
            <input
              type="text"
              placeholder="Search leagues..."
              value={leagueSearch}
              onChange={e => { setLeagueSearch(e.target.value); setLeaguePage(1) }}
              className="px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm w-64 focus:border-gold focus:outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted border-b border-dark-border">
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Owner</th>
                  <th className="text-left py-2 px-3">Format</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Members</th>
                  <th className="text-left py-2 px-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {leagues.map(l => (
                  <tr key={l.id} className="border-b border-dark-border/50 hover:bg-surface-hover">
                    <td className="py-2 px-3 text-white">{l.name}</td>
                    <td className="py-2 px-3 text-text-secondary">{l.owner?.name || 'N/A'}</td>
                    <td className="py-2 px-3 text-text-secondary capitalize">{l.format?.replace(/_/g, ' ').toLowerCase()}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        l.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                        l.status === 'DRAFTING' ? 'bg-gold/20 text-gold' :
                        'bg-dark-tertiary text-text-muted'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-text-secondary">{l._count?.members || 0}/{l.maxTeams}</td>
                    <td className="py-2 px-3 text-text-muted">{new Date(l.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leaguePageCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setLeaguePage(p => Math.max(1, p - 1))} disabled={leaguePage === 1} className="px-3 py-1 bg-dark-tertiary rounded text-sm text-text-secondary disabled:opacity-50">Prev</button>
              <span className="text-text-muted text-sm">Page {leaguePage} of {leaguePageCount}</span>
              <button onClick={() => setLeaguePage(p => Math.min(leaguePageCount, p + 1))} disabled={leaguePage === leaguePageCount} className="px-3 py-1 bg-dark-tertiary rounded text-sm text-text-secondary disabled:opacity-50">Next</button>
            </div>
          )}
        </Card>
      )}

      {/* Tournaments Tab */}
      {activeTab === 'tournaments' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Tournaments ({tournamentTotal})</h3>
            <div className="flex gap-2">
              <select
                value={tournamentFilter}
                onChange={e => { setTournamentFilter(e.target.value); setTournamentPage(1) }}
                className="px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <input
                type="text"
                placeholder="Search tournaments..."
                value={tournamentSearch}
                onChange={e => { setTournamentSearch(e.target.value); setTournamentPage(1) }}
                className="px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm w-56 focus:border-gold focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted border-b border-dark-border">
                  <th className="text-left py-2 px-3">Tournament</th>
                  <th className="text-left py-2 px-3">Course</th>
                  <th className="text-left py-2 px-3">Tour</th>
                  <th className="text-left py-2 px-3">Dates</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Round</th>
                  <th className="text-right py-2 px-3">Purse</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map(t => (
                  <tr
                    key={t.id}
                    className="border-b border-dark-border/50 hover:bg-surface-hover cursor-pointer"
                    onClick={() => navigate(`/tournaments/${t.id}`)}
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{t.name}</span>
                        {t.isMajor && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gold/20 text-gold">MAJOR</span>}
                        {t.isSignature && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">SIG</span>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-text-secondary">{t.course?.name || t.location || '—'}</td>
                    <td className="py-2 px-3 text-text-secondary">{t.tour || '—'}</td>
                    <td className="py-2 px-3 text-text-muted whitespace-nowrap">
                      {new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(t.status)}`}>
                        {t.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-text-secondary">
                      {t.status === 'IN_PROGRESS' ? `R${t.currentRound}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-text-secondary">{formatPurse(t.purse)}</td>
                  </tr>
                ))}
                {tournaments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-muted">No tournaments found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {tournamentPageCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setTournamentPage(p => Math.max(1, p - 1))} disabled={tournamentPage === 1} className="px-3 py-1 bg-dark-tertiary rounded text-sm text-text-secondary disabled:opacity-50">Prev</button>
              <span className="text-text-muted text-sm">Page {tournamentPage} of {tournamentPageCount}</span>
              <button onClick={() => setTournamentPage(p => Math.min(tournamentPageCount, p + 1))} disabled={tournamentPage === tournamentPageCount} className="px-3 py-1 bg-dark-tertiary rounded text-sm text-text-secondary disabled:opacity-50">Next</button>
            </div>
          )}
        </Card>
      )}

      {/* AI Engine Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Kill Switch */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">AI Engine Kill Switch</h3>
                <p className="text-text-secondary text-sm mt-1">
                  {aiConfig?.enabled
                    ? 'AI Engine is ON. Claude API calls are active.'
                    : 'AI Engine is OFF. All Claude API calls are blocked platform-wide.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${aiConfig?.enabled ? 'text-emerald-400' : 'text-red-400'}`}>
                  {aiConfig?.enabled ? 'ON' : 'OFF'}
                </span>
                <Toggle enabled={!!aiConfig?.enabled} onToggle={toggleKillSwitch} disabled={aiSaving} />
              </div>
            </div>
          </Card>

          {/* Feature Toggles */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Feature Toggles</h3>
            <p className="text-text-secondary text-sm mb-4">
              Control which AI features are active. The kill switch must be ON for any feature to work.
            </p>
            <div className="space-y-1">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-3 border-t border-dark-border first:border-t-0">
                  <div>
                    <p className="text-white font-medium">{label}</p>
                    <p className="text-text-muted text-xs">{key}</p>
                  </div>
                  <Toggle
                    enabled={!!aiConfig?.featureToggles?.[key]}
                    onToggle={() => toggleFeature(key)}
                    disabled={aiSaving || !aiConfig?.enabled}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Token Budget */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Daily Token Budget</h3>
            <p className="text-text-secondary text-sm mb-4">
              When daily token usage hits this limit, all AI calls are automatically paused until midnight reset.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                className="w-48 px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white text-sm focus:border-gold focus:outline-none"
                min="0"
              />
              <span className="text-text-muted text-sm">tokens/day</span>
              <button
                onClick={saveBudget}
                disabled={aiSaving || budgetInput === String(aiConfig?.dailyTokenBudget)}
                className="px-4 py-2 bg-gold text-dark-primary text-sm font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
            {aiSpend && (
              <div className="mt-3">
                <div className="w-full bg-dark-tertiary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      aiSpend.dailyBudgetPercent >= 90 ? 'bg-red-500' :
                      aiSpend.dailyBudgetPercent >= 70 ? 'bg-yellow-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, aiSpend.dailyBudgetPercent)}%` }}
                  />
                </div>
                <p className="text-text-muted text-xs mt-1">
                  {formatTokens(aiSpend.tokensUsedToday)} / {formatTokens(aiConfig?.dailyTokenBudget)} today ({aiSpend.dailyBudgetPercent}%)
                </p>
              </div>
            )}
          </Card>

          {/* Spend Dashboard */}
          {aiSpend && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Spend Dashboard</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold font-display text-gold">{formatTokens(aiSpend.tokensUsedToday)}</p>
                  <p className="text-xs text-text-muted mt-1">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-display text-blue-400">{formatTokens(aiSpend.tokensUsedThisWeek)}</p>
                  <p className="text-xs text-text-muted mt-1">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-display text-purple-400">{formatTokens(aiSpend.tokensUsedThisMonth)}</p>
                  <p className="text-xs text-text-muted mt-1">This Month</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-display text-emerald-400">{formatTokens(aiSpend.totalTokensAllTime)}</p>
                  <p className="text-xs text-text-muted mt-1">All Time</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-dark-border text-center">
                <p className="text-text-muted text-sm">
                  Total API calls: <span className="text-white font-semibold">{aiSpend.totalCallsAllTime?.toLocaleString() || 0}</span>
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
