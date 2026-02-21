import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStats } from '../hooks/useStats'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

const Profile = () => {
  const { user, updateUser } = useAuth()
  const { stats, loading: statsLoading } = useStats()
  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  // Update form data when user changes
  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    })
  }, [user])

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = () => {
    updateUser(formData)
    setIsEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'January 2024'

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary mb-6">My Profile</h1>

          {saved && (
            <Card className="mb-6 border-gold bg-gold/10">
              <div className="flex items-center gap-3 text-gold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Profile updated successfully!</span>
              </div>
            </Card>
          )}

          {/* Profile Card */}
          <Card className="mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center text-text-primary text-3xl font-bold font-display shadow-button">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold font-display text-text-primary">{user?.name || 'User'}</h2>
                <p className="text-text-secondary">{user?.email}</p>
                <p className="text-text-muted text-sm mt-1">Member since {memberSince}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <Input
                  label="Display Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {statsLoading ? (
                  <>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-dark-primary rounded-lg p-4 text-center animate-pulse">
                        <div className="h-7 bg-dark-tertiary rounded w-12 mx-auto mb-1" />
                        <div className="h-4 bg-dark-tertiary rounded w-16 mx-auto" />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="bg-dark-primary rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold font-display text-text-primary">{stats?.activeLeagues ?? 0}</p>
                      <p className="text-text-muted text-sm">Leagues</p>
                    </div>
                    <div className="bg-dark-primary rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold font-display text-gold">
                        {stats?.totalPoints ? stats.totalPoints.toLocaleString() : '—'}
                      </p>
                      <p className="text-text-muted text-sm">Total Points</p>
                    </div>
                    <div className="bg-dark-primary rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold font-display text-yellow-400">
                        {stats?.bestFinish ? `#${stats.bestFinish}` : '—'}
                      </p>
                      <p className="text-text-muted text-sm">Best Finish</p>
                    </div>
                    <div className="bg-dark-primary rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold font-display text-text-primary">
                        {stats?.winRate !== undefined ? `${stats.winRate}%` : '—'}
                      </p>
                      <p className="text-text-muted text-sm">Win Rate</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* View Full Stats Link */}
            {user?.id && (
              <div className="mt-4 text-center">
                <Link
                  to={`/manager/${user.id}`}
                  className="inline-flex items-center gap-2 text-gold hover:text-gold/80 text-sm font-medium transition-colors"
                >
                  View Full Stats & Achievements
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </Card>

          {/* Preferences */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-display text-text-primary">Preferences</h3>
              <Link
                to="/settings/notifications"
                className="text-gold text-sm hover:text-gold/80 transition-colors"
              >
                Manage All
              </Link>
            </div>
            <div className="space-y-3">
              <Link
                to="/settings/notifications"
                className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-dark-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gold/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-text-primary font-medium text-sm">Notification Settings</p>
                    <p className="text-text-muted text-xs">Trades, drafts, waivers, scores & more</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/news"
                className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-dark-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-text-primary font-medium text-sm">Player News</p>
                    <p className="text-text-muted text-xs">Injuries, withdrawals & trending players</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/import"
                className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-dark-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-text-primary font-medium text-sm">Import League</p>
                    <p className="text-text-muted text-xs">Bring history from Sleeper & more</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-500/30">
            <h3 className="text-lg font-semibold font-display text-text-primary mb-4">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary font-medium">Delete Account</p>
                <p className="text-text-muted text-sm">Permanently delete your account and data</p>
              </div>
              <Button variant="outline" size="sm" className="text-red-400 border-red-400 hover:bg-red-400/10">
                Delete
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default Profile
