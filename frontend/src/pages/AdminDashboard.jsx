import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import api from '../services/api'

const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [leagues, setLeagues] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [leagueSearch, setLeagueSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [leaguePage, setLeaguePage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [leagueTotal, setLeagueTotal] = useState(0)
  const [loading, setLoading] = useState(true)

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

  const handleRoleChange = async (userId, newRole) => {
    if (userId === user.id) return
    try {
      await api.updateUserRole(userId, newRole)
      loadUsers()
    } catch (err) {
      alert(err.message)
    }
  }

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
    { label: 'Total Users', value: stats?.users || 0, color: 'text-gold' },
    { label: 'Total Leagues', value: stats?.leagues || 0, color: 'text-emerald-400' },
    { label: 'Active Drafts', value: stats?.activeDrafts || 0, color: 'text-blue-400' },
    { label: 'Live Tournaments', value: stats?.activeTournaments || 0, color: 'text-orange' },
  ]

  const userPageCount = Math.ceil(userTotal / 25)
  const leaguePageCount = Math.ceil(leagueTotal / 25)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-white">Admin Dashboard</h1>
        <p className="text-text-secondary">System overview and management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <Card key={s.label} className="text-center">
            <p className={`text-3xl font-bold font-display ${s.color}`}>{s.value}</p>
            <p className="text-xs text-text-muted mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['users', 'leagues'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-gold text-white'
                : 'bg-dark-tertiary text-text-secondary hover:text-white'
            }`}
          >
            {tab}
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
    </div>
  )
}

export default AdminDashboard
