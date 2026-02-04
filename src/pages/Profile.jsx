import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

const Profile = () => {
  const { user, updateUser } = useAuth()
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

  const stats = {
    leaguesJoined: 3,
    totalWins: 2,
    totalPoints: 4277,
    memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'January 2024',
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">My Profile</h1>

          {saved && (
            <Card className="mb-6 border-accent-green bg-accent-green/10">
              <div className="flex items-center gap-3 text-accent-green">
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
              <div className="w-20 h-20 bg-accent-green rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-button">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{user?.name || 'User'}</h2>
                <p className="text-text-secondary">{user?.email}</p>
                <p className="text-text-muted text-sm mt-1">Member since {stats.memberSince}</p>
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
                <div className="bg-dark-primary rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{stats.leaguesJoined}</p>
                  <p className="text-text-muted text-sm">Leagues</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{stats.totalWins}</p>
                  <p className="text-text-muted text-sm">Wins</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-accent-green">{stats.totalPoints.toLocaleString()}</p>
                  <p className="text-text-muted text-sm">Total Points</p>
                </div>
                <div className="bg-dark-primary rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">33%</p>
                  <p className="text-text-muted text-sm">Win Rate</p>
                </div>
              </div>
            )}
          </Card>

          {/* Preferences */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-text-muted text-sm">Receive updates about your leagues</p>
                </div>
                <button className="w-12 h-6 bg-accent-green rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5" />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-dark-border">
                <div>
                  <p className="text-white font-medium">Draft Reminders</p>
                  <p className="text-text-muted text-sm">Get notified before drafts start</p>
                </div>
                <button className="w-12 h-6 bg-accent-green rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5" />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-dark-border">
                <div>
                  <p className="text-white font-medium">Trade Alerts</p>
                  <p className="text-text-muted text-sm">Notifications for trade proposals</p>
                </div>
                <button className="w-12 h-6 bg-dark-tertiary rounded-full relative">
                  <div className="w-5 h-5 bg-text-muted rounded-full absolute left-0.5 top-0.5" />
                </button>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-500/30">
            <h3 className="text-lg font-semibold text-white mb-4">Danger Zone</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Delete Account</p>
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
