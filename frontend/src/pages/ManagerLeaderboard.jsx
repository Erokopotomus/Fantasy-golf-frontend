import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Card from '../components/common/Card'
import api from '../services/api'

const SORT_OPTIONS = [
  { value: 'championships', label: 'Championships' },
  { value: 'winPct', label: 'Win Rate' },
  { value: 'totalPoints', label: 'Total Points' },
  { value: 'draftEfficiency', label: 'Draft IQ' },
  { value: 'avgFinish', label: 'Avg Finish' },
  { value: 'clutchRating', label: 'Clutch Rating' },
]

const SPORT_FILTERS = [
  { value: '', label: 'All Sports' },
  { value: 'golf', label: '⛳ Golf' },
  { value: 'nfl', label: '🏈 NFL' },
]

const TIER_COLORS = {
  ELITE: 'text-crown',
  VETERAN: 'text-purple-400',
  COMPETITOR: 'text-field',
  CONTENDER: 'text-blue-400',
  DEVELOPING: 'text-text-secondary',
  ROOKIE: 'text-text-muted',
  UNRANKED: 'text-text-muted',
}

const TIER_BG = {
  ELITE: 'bg-crown/10',
  VETERAN: 'bg-purple-400/10',
  COMPETITOR: 'bg-field/10',
  CONTENDER: 'bg-blue-400/10',
}

const RANK_COLORS = {
  1: 'border-l-4 border-l-crown bg-crown/5',
  2: 'border-l-4 border-l-gray-400 bg-gray-400/5',
  3: 'border-l-4 border-l-amber-700 bg-amber-700/5',
}

const ManagerLeaderboard = () => {
  const { user: currentUser } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('championships')
  const [sport, setSport] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = { sortBy, limit: 50 }
    if (sport) params.sport = sport
    api.getManagerLeaderboard(params)
      .then(data => setLeaderboard(data.leaderboard || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false))
  }, [sortBy, sport])

  const formatPct = v => v != null ? `${(v * 100).toFixed(1)}%` : '-'
  const formatDec = v => v != null ? v.toFixed(1) : '-'

  // Top 3 for "Hot Right Now" — just show highest-rated managers
  const hotManagers = [...leaderboard]
    .filter(m => m.clutchRating != null)
    .sort((a, b) => (b.clutchRating || 0) - (a.clutchRating || 0))
    .slice(0, 5)

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-text-primary">Manager Leaderboard</h1>
          <p className="text-text-secondary mt-1">See how you stack up against the competition.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Sport pills */}
          <div className="flex gap-1.5">
            {SPORT_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setSport(f.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  sport === f.value
                    ? 'bg-blaze text-white'
                    : 'bg-[var(--surface)] text-text-secondary hover:text-text-primary border border-[var(--card-border)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm bg-[var(--surface)] border border-[var(--card-border)] text-text-primary"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Hot Right Now */}
        {hotManagers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Hot Right Now</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {hotManagers.map(m => (
                <Link
                  key={m.user.id}
                  to={`/manager/${m.user.id}`}
                  className="shrink-0 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl p-4 w-40 hover:border-crown/50 transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-alt)] mx-auto mb-2 overflow-hidden">
                    {m.user.avatar ? (
                      <img src={m.user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted font-bold">
                        {m.user.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-text-primary truncate">{m.user.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-lg font-bold font-mono text-crown">{Math.round(m.clutchRating)}</span>
                    {m.ratingTier && (
                      <span className={`text-[10px] font-bold ${TIER_COLORS[m.ratingTier] || 'text-text-muted'}`}>
                        {m.ratingTier}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard Table — Desktop */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-crown border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-text-secondary">No managers found. Join a league to appear on the leaderboard!</p>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block">
              <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] text-text-secondary text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 text-left w-12">#</th>
                      <th className="py-3 px-4 text-left">Manager</th>
                      <th className="py-3 px-3 text-center">Rating</th>
                      <th className="py-3 px-3 text-center">🏆</th>
                      <th className="py-3 px-3 text-center">Win %</th>
                      <th className="py-3 px-3 text-center">Avg Finish</th>
                      <th className="py-3 px-3 text-center">Draft IQ</th>
                      <th className="py-3 px-3 text-center">Badges</th>
                      <th className="py-3 px-3 text-center">Leagues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map(m => {
                      const isMe = currentUser?.id === m.user.id
                      const rankClass = RANK_COLORS[m.rank] || ''
                      return (
                        <tr
                          key={m.user.id}
                          className={`border-b border-[var(--card-border)]/50 hover:bg-[var(--bg-alt)]/50 transition-colors ${rankClass} ${
                            isMe ? 'bg-blaze/5 border-l-4 border-l-blaze' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-text-muted">{m.rank}</td>
                          <td className="py-3 px-4">
                            <Link to={`/manager/${m.user.id}`} className="flex items-center gap-3 hover:opacity-80">
                              <div className="w-8 h-8 rounded-full bg-[var(--bg-alt)] overflow-hidden shrink-0">
                                {m.user.avatar ? (
                                  <img src={m.user.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-bold">
                                    {m.user.name?.[0] || '?'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="font-medium text-text-primary">{m.user.name}</span>
                                {m.user.username && (
                                  <span className="text-text-muted text-xs ml-1.5">@{m.user.username}</span>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {m.clutchRating != null ? (
                              <div className="flex flex-col items-center">
                                <span className="font-mono font-bold text-crown">{Math.round(m.clutchRating)}</span>
                                <span className={`text-[10px] font-bold ${TIER_COLORS[m.ratingTier] || ''}`}>
                                  {m.ratingTier || '-'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-crown">{m.championships || 0}</td>
                          <td className="py-3 px-3 text-center font-mono">{formatPct(m.winPct)}</td>
                          <td className="py-3 px-3 text-center font-mono">{formatDec(m.avgFinish)}</td>
                          <td className="py-3 px-3 text-center font-mono">{m.draftEfficiency != null ? formatDec(m.draftEfficiency) : '-'}</td>
                          <td className="py-3 px-3 text-center font-mono">{m.achievementCount || 0}</td>
                          <td className="py-3 px-3 text-center font-mono">{m.totalLeagues}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-2">
              {leaderboard.map(m => {
                const isMe = currentUser?.id === m.user.id
                return (
                  <Link
                    key={m.user.id}
                    to={`/manager/${m.user.id}`}
                    className={`block bg-[var(--surface)] border rounded-xl p-3 transition-colors hover:border-crown/30 ${
                      isMe ? 'border-blaze/50 bg-blaze/5' : 'border-[var(--card-border)]'
                    } ${m.rank <= 3 ? 'border-l-4' : ''} ${
                      m.rank === 1 ? 'border-l-crown' : m.rank === 2 ? 'border-l-gray-400' : m.rank === 3 ? 'border-l-amber-700' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-mono font-bold text-text-muted w-8 text-center">{m.rank}</span>
                      <div className="w-9 h-9 rounded-full bg-[var(--bg-alt)] overflow-hidden shrink-0">
                        {m.user.avatar ? (
                          <img src={m.user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-bold">
                            {m.user.name?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">{m.user.name}</p>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>🏆 {m.championships}</span>
                          <span>{formatPct(m.winPct)}</span>
                          <span>{m.totalLeagues} leagues</span>
                        </div>
                      </div>
                      {m.clutchRating != null && (
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-crown text-lg">{Math.round(m.clutchRating)}</span>
                          <p className={`text-[10px] font-bold ${TIER_COLORS[m.ratingTier] || 'text-text-muted'}`}>
                            {m.ratingTier || ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ManagerLeaderboard
