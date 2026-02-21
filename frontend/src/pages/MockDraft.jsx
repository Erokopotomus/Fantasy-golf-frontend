import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import api from '../services/api'

const GOLF_TEAM_NAMES = [
  'Birdie Brigade', 'Eagle Eyes', 'Fairway Legends', 'The Caddies',
  'Green Machine', 'Bogey Boys', 'Par Patrol', 'Iron Giants',
  'Wedge Warriors', 'Pin Seekers', 'The Shanks', 'Albatross Army',
  'Rough Riders', 'Sand Trappers', 'The Duffers', 'Chip Masters',
  'Putter Patrol', 'Tee Time Titans', 'The Slicers', 'Hook Heroes',
]

const NFL_TEAM_NAMES = [
  'Touchdown Titans', 'Red Zone Raiders', 'Blitz Brigade', 'Gridiron Legends',
  'End Zone Elite', 'Fourth & Goal', 'Hail Mary Heroes', 'The Snap Kings',
  'Pocket Passers', 'Sack Attack', 'Goal Line Gang', 'Two Minute Drill',
  'Scramble Squad', 'The Audibles', 'Pick Six Pack', 'Turnover Chain',
  'Fantasy Franchise', 'Waiver Wire Wizards', 'The Trade Block', 'Bye Week Bandits',
]

const SPORT_DEFAULTS = {
  golf: { teamCount: 8, rosterSize: 6, teamCounts: [4, 6, 8, 10, 12], rosterSizes: [4, 5, 6, 8, 10], budget: 100 },
  nfl:  { teamCount: 10, rosterSize: 15, teamCounts: [8, 10, 12, 14], rosterSizes: [10, 12, 14, 15, 16], budget: 200 },
}

const MockDraft = () => {
  const navigate = useNavigate()
  const [sport, setSport] = useState(() => {
    const stored = sessionStorage.getItem('mockDraftConfig')
    if (stored) {
      try { return JSON.parse(stored).sport || 'golf' } catch { /* ignore */ }
    }
    return 'golf'
  })
  const defaults = SPORT_DEFAULTS[sport]
  const [settings, setSettings] = useState({
    teamCount: defaults.teamCount,
    rosterSize: defaults.rosterSize,
    draftType: 'snake',
    scoring: 'half_ppr',
    pickTimer: 90,
    userPosition: 1,
  })
  const [starting, setStarting] = useState(false)
  const [boards, setBoards] = useState([])
  const [selectedBoardId, setSelectedBoardId] = useState(null)

  useEffect(() => {
    setSelectedBoardId(null)
    api.getDraftBoards()
      .then(data => setBoards((data.boards || []).filter(b => b.sport === sport)))
      .catch(() => setBoards([]))
  }, [sport])

  const handleSportChange = (newSport) => {
    setSport(newSport)
    const d = SPORT_DEFAULTS[newSport]
    setSettings(s => ({
      ...s,
      teamCount: d.teamCount,
      rosterSize: d.rosterSize,
      userPosition: Math.min(s.userPosition, d.teamCount),
    }))
  }

  const handleStart = () => {
    setStarting(true)
    const teamNames = sport === 'nfl' ? NFL_TEAM_NAMES : GOLF_TEAM_NAMES
    const teams = Array.from({ length: settings.teamCount }, (_, i) => ({
      id: `team-${i + 1}`,
      name: i === settings.userPosition - 1 ? 'Your Team' : teamNames[i % teamNames.length],
      isUser: i === settings.userPosition - 1,
      budget: defaults.budget,
    }))

    const mockConfig = {
      ...settings,
      sport,
      teams,
      isMockDraft: true,
      boardId: selectedBoardId || null,
    }

    sessionStorage.setItem('mockDraftConfig', JSON.stringify(mockConfig))
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
              className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold font-display text-text-primary mb-2">Mock Draft</h1>
            <p className="text-text-secondary">
              Practice your draft strategy against AI opponents. Experiment with different picks and positions.
            </p>
          </div>

          {/* Settings */}
          <Card className="mb-6">
            <h2 className="text-lg font-semibold font-display text-text-primary mb-6">Draft Settings</h2>

            <div className="space-y-6">
              {/* Sport Selector */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">Sport</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSportChange('golf')}
                    className={`py-3 px-4 rounded-lg border-2 text-center font-semibold transition-all ${
                      sport === 'golf'
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-dark-border bg-dark-tertiary text-text-secondary hover:border-dark-border/80 hover:text-text-primary'
                    }`}
                  >
                    Golf
                  </button>
                  <button
                    onClick={() => handleSportChange('nfl')}
                    className={`py-3 px-4 rounded-lg border-2 text-center font-semibold transition-all ${
                      sport === 'nfl'
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-dark-border bg-dark-tertiary text-text-secondary hover:border-dark-border/80 hover:text-text-primary'
                    }`}
                  >
                    NFL
                  </button>
                </div>
              </div>

              {/* Draft Type */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">Draft Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSettings(s => ({ ...s, draftType: 'snake' }))}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      settings.draftType === 'snake'
                        ? 'border-gold bg-gold/10'
                        : 'border-dark-border bg-dark-tertiary hover:border-dark-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                        settings.draftType === 'snake' ? 'bg-gold/20' : 'bg-dark-primary'
                      }`}>
                        🐍
                      </div>
                      <span className={`font-semibold ${settings.draftType === 'snake' ? 'text-gold' : 'text-text-primary'}`}>
                        Snake
                      </span>
                    </div>
                    <p className="text-text-muted text-xs">Draft order reverses each round. Most common format.</p>
                  </button>
                  <button
                    onClick={() => setSettings(s => ({ ...s, draftType: 'auction' }))}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      settings.draftType === 'auction'
                        ? 'border-gold bg-gold/10'
                        : 'border-dark-border bg-dark-tertiary hover:border-dark-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                        settings.draftType === 'auction' ? 'bg-gold/20' : 'bg-dark-primary'
                      }`}>
                        💰
                      </div>
                      <span className={`font-semibold ${settings.draftType === 'auction' ? 'text-gold' : 'text-text-primary'}`}>
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
                  {defaults.teamCounts.map(count => (
                    <button
                      key={count}
                      onClick={() => setSettings(s => ({
                        ...s,
                        teamCount: count,
                        userPosition: Math.min(s.userPosition, count),
                      }))}
                      className={`py-3 rounded-lg font-semibold transition-all ${
                        settings.teamCount === count
                          ? 'bg-gold text-text-primary'
                          : 'bg-dark-tertiary text-text-secondary hover:text-text-primary'
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
                <div className={`grid gap-2 ${defaults.rosterSizes.length <= 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
                  {defaults.rosterSizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSettings(s => ({ ...s, rosterSize: size }))}
                      className={`py-3 rounded-lg font-semibold transition-all ${
                        settings.rosterSize === size
                          ? 'bg-gold text-text-primary'
                          : 'bg-dark-tertiary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scoring Format (NFL only) */}
              {sport === 'nfl' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">Scoring Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'standard', label: 'Standard' },
                      { key: 'half_ppr', label: 'Half PPR' },
                      { key: 'ppr', label: 'PPR' },
                    ].map(fmt => (
                      <button
                        key={fmt.key}
                        onClick={() => setSettings(s => ({ ...s, scoring: fmt.key }))}
                        className={`py-3 rounded-lg font-semibold transition-all ${
                          settings.scoring === fmt.key
                            ? 'bg-gold text-text-primary'
                            : 'bg-dark-tertiary text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft Board (Cheat Sheet) */}
              {boards.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">Draft Board (Cheat Sheet)</label>
                  <select
                    value={selectedBoardId || ''}
                    onChange={(e) => setSelectedBoardId(e.target.value || null)}
                    className="w-full p-3 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary focus:border-gold focus:outline-none"
                  >
                    <option value="">None — use default rankings</option>
                    {boards.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.playerCount} players)
                      </option>
                    ))}
                  </select>
                  <p className="text-text-muted text-xs mt-1.5">
                    Your board will pre-load your queue and show as a live cheat sheet
                  </p>
                </div>
              )}

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
                      className="flex-1 p-3 bg-dark-tertiary border border-dark-border rounded-lg text-text-primary focus:border-gold focus:outline-none"
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
                      className="p-3 bg-dark-tertiary border border-dark-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
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
                          ? 'bg-gold text-text-primary'
                          : 'bg-dark-tertiary text-text-secondary hover:text-text-primary'
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
          <Card className="mb-6 border-gold/30">
            <h3 className="text-sm font-medium text-text-muted mb-3">DRAFT SUMMARY</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-text-muted text-xs">Sport</p>
                <p className="text-text-primary font-medium uppercase">{sport}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Type</p>
                <p className="text-text-primary font-medium capitalize">{settings.draftType}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Teams</p>
                <p className="text-text-primary font-medium">{settings.teamCount}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Roster Size</p>
                <p className="text-text-primary font-medium">{settings.rosterSize} players</p>
              </div>
              {sport === 'nfl' && (
                <div>
                  <p className="text-text-muted text-xs">Scoring</p>
                  <p className="text-text-primary font-medium">{settings.scoring === 'half_ppr' ? 'Half PPR' : settings.scoring === 'ppr' ? 'PPR' : 'Standard'}</p>
                </div>
              )}
              <div>
                <p className="text-text-muted text-xs">Total Picks</p>
                <p className="text-text-primary font-medium">{settings.teamCount * settings.rosterSize}</p>
              </div>
              {settings.draftType === 'snake' && (
                <div>
                  <p className="text-text-muted text-xs">Your Position</p>
                  <p className="text-gold font-medium">
                    Pick #{settings.userPosition || 'Random'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-text-muted text-xs">Pick Timer</p>
                <p className="text-text-primary font-medium">{settings.pickTimer}s</p>
              </div>
              {selectedBoardId && (
                <div>
                  <p className="text-text-muted text-xs">Board</p>
                  <p className="text-gold font-medium truncate">{boards.find(b => b.id === selectedBoardId)?.name}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Start Button */}
          <Button
            fullWidth
            onClick={handleStart}
            loading={starting}
            className="py-4 text-lg font-bold font-display"
          >
            Start Mock Draft
          </Button>

          {/* Tips */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-text-muted mb-3">DRAFT TIPS</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-dark-secondary rounded-lg">
                <span className="text-gold text-lg flex-shrink-0">1</span>
                <div>
                  <p className="text-text-primary text-sm font-medium">Pre-rank your players</p>
                  <p className="text-text-muted text-xs">Add players to your queue before the draft starts to plan ahead.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-dark-secondary rounded-lg">
                <span className="text-gold text-lg flex-shrink-0">2</span>
                <div>
                  <p className="text-text-primary text-sm font-medium">Watch the board</p>
                  <p className="text-text-muted text-xs">Track which positions and tiers are being drafted to find value.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-dark-secondary rounded-lg">
                <span className="text-gold text-lg flex-shrink-0">3</span>
                <div>
                  <p className="text-text-primary text-sm font-medium">Balance your roster</p>
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
