import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'

const TEAM_NAMES = [
  'Birdie Brigade', 'Eagle Eyes', 'Fairway Legends', 'The Caddies',
  'Green Machine', 'Bogey Boys', 'Par Patrol', 'Iron Giants',
  'Wedge Warriors', 'Pin Seekers', 'The Shanks', 'Albatross Army',
  'Rough Riders', 'Sand Trappers', 'The Duffers', 'Chip Masters',
  'Putter Patrol', 'Tee Time Titans', 'The Slicers', 'Hook Heroes',
]

const MockDraft = () => {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    teamCount: 8,
    rosterSize: 6,
    draftType: 'snake',
    pickTimer: 90,
    userPosition: 1,
  })
  const [starting, setStarting] = useState(false)

  const handleStart = () => {
    setStarting(true)
    // Store mock draft config in sessionStorage so DraftRoom can pick it up
    const teams = Array.from({ length: settings.teamCount }, (_, i) => ({
      id: `team-${i + 1}`,
      name: i === settings.userPosition - 1 ? 'Your Team' : TEAM_NAMES[i % TEAM_NAMES.length],
      isUser: i === settings.userPosition - 1,
      budget: 100,
    }))

    const mockConfig = {
      ...settings,
      teams,
      isMockDraft: true,
    }

    sessionStorage.setItem('mockDraftConfig', JSON.stringify(mockConfig))
    // Navigate to a special mock draft room
    navigate('/mock-draft/room')
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white mb-2">Mock Draft</h1>
            <p className="text-text-secondary">
              Practice your draft strategy against AI opponents. Experiment with different picks and positions.
            </p>
          </div>

          {/* Settings */}
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-6">Draft Settings</h2>

            <div className="space-y-6">
              {/* Draft Type */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">Draft Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSettings(s => ({ ...s, draftType: 'snake' }))}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      settings.draftType === 'snake'
                        ? 'border-accent-green bg-accent-green/10'
                        : 'border-dark-border bg-dark-tertiary hover:border-dark-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                        settings.draftType === 'snake' ? 'bg-accent-green/20' : 'bg-dark-primary'
                      }`}>
                        🐍
                      </div>
                      <span className={`font-semibold ${settings.draftType === 'snake' ? 'text-accent-green' : 'text-white'}`}>
                        Snake
                      </span>
                    </div>
                    <p className="text-text-muted text-xs">Draft order reverses each round. Most common format.</p>
                  </button>
                  <button
                    onClick={() => setSettings(s => ({ ...s, draftType: 'auction' }))}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      settings.draftType === 'auction'
                        ? 'border-accent-green bg-accent-green/10'
                        : 'border-dark-border bg-dark-tertiary hover:border-dark-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                        settings.draftType === 'auction' ? 'bg-accent-green/20' : 'bg-dark-primary'
                      }`}>
                        💰
                      </div>
                      <span className={`font-semibold ${settings.draftType === 'auction' ? 'text-accent-green' : 'text-white'}`}>
                        Auction
                      </span>
                    </div>
                    <p className="text-text-muted text-xs">Bid on players with a budget. More strategic control.</p>
                  </button>
                </div>
              </div>

              {/* Number of Teams */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">Number of Teams</label>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 6, 8, 10, 12].map(count => (
                    <button
                      key={count}
                      onClick={() => setSettings(s => ({
                        ...s,
                        teamCount: count,
                        userPosition: Math.min(s.userPosition, count),
                      }))}
                      className={`py-3 rounded-lg font-semibold transition-all ${
                        settings.teamCount === count
                          ? 'bg-accent-green text-white'
                          : 'bg-dark-tertiary text-text-secondary hover:text-white'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roster Size */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">Roster Size</label>
                <div className="grid grid-cols-5 gap-2">
                  {[4, 5, 6, 8, 10].map(size => (
                    <button
                      key={size}
                      onClick={() => setSettings(s => ({ ...s, rosterSize: size }))}
                      className={`py-3 rounded-lg font-semibold transition-all ${
                        settings.rosterSize === size
                          ? 'bg-accent-green text-white'
                          : 'bg-dark-tertiary text-text-secondary hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Draft Position (Snake only) */}
              {settings.draftType === 'snake' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    Your Draft Position
                  </label>
                  <div className="flex items-center gap-4">
                    <select
                      value={settings.userPosition}
                      onChange={(e) => setSettings(s => ({ ...s, userPosition: parseInt(e.target.value) }))}
                      className="flex-1 p-3 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-green focus:outline-none"
                    >
                      {Array.from({ length: settings.teamCount }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Pick #{i + 1} {i === 0 ? '(1st overall)' : ''}
                        </option>
                      ))}
                      <option value={0}>Random</option>
                    </select>
                    <button
                      onClick={() => setSettings(s => ({
                        ...s,
                        userPosition: Math.floor(Math.random() * s.teamCount) + 1
                      }))}
                      className="p-3 bg-dark-tertiary border border-dark-border rounded-lg text-text-secondary hover:text-white transition-colors"
                      title="Randomize"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Pick Timer */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">Pick Timer (seconds)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 120].map(time => (
                    <button
                      key={time}
                      onClick={() => setSettings(s => ({ ...s, pickTimer: time }))}
                      className={`py-3 rounded-lg font-semibold transition-all ${
                        settings.pickTimer === time
                          ? 'bg-accent-green text-white'
                          : 'bg-dark-tertiary text-text-secondary hover:text-white'
                      }`}
                    >
                      {time}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="mb-6 border-accent-green/30">
            <h3 className="text-sm font-medium text-text-muted mb-3">DRAFT SUMMARY</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-text-muted text-xs">Type</p>
                <p className="text-white font-medium capitalize">{settings.draftType}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Teams</p>
                <p className="text-white font-medium">{settings.teamCount}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Roster Size</p>
                <p className="text-white font-medium">{settings.rosterSize} players</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Total Picks</p>
                <p className="text-white font-medium">{settings.teamCount * settings.rosterSize}</p>
              </div>
              {settings.draftType === 'snake' && (
                <div>
                  <p className="text-text-muted text-xs">Your Position</p>
                  <p className="text-accent-green font-medium">
                    Pick #{settings.userPosition || 'Random'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-text-muted text-xs">Pick Timer</p>
                <p className="text-white font-medium">{settings.pickTimer}s</p>
              </div>
            </div>
          </Card>

          {/* Start Button */}
          <Button
            fullWidth
            onClick={handleStart}
            loading={starting}
            className="py-4 text-lg font-bold"
          >
            Start Mock Draft
          </Button>

          {/* Tips */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-text-muted mb-3">DRAFT TIPS</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-dark-secondary rounded-lg">
                <span className="text-accent-green text-lg flex-shrink-0">1</span>
                <div>
                  <p className="text-white text-sm font-medium">Pre-rank your players</p>
                  <p className="text-text-muted text-xs">Add players to your queue before the draft starts to plan ahead.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-dark-secondary rounded-lg">
                <span className="text-accent-green text-lg flex-shrink-0">2</span>
                <div>
                  <p className="text-white text-sm font-medium">Watch the board</p>
                  <p className="text-text-muted text-xs">Track which positions and tiers are being drafted to find value.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-dark-secondary rounded-lg">
                <span className="text-accent-green text-lg flex-shrink-0">3</span>
                <div>
                  <p className="text-white text-sm font-medium">Balance your roster</p>
                  <p className="text-text-muted text-xs">Mix elite players with high-upside sleepers for the best results.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MockDraft
