import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'
import ShareButton from '../share/ShareButton'
import HeadToHeadCard from '../share/cards/HeadToHeadCard'
import { useAuth } from '../../context/AuthContext'

export default function HeadToHead({ initialTarget = 'consensus' }) {
  const { user } = useAuth()
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [targetId, setTargetId] = useState(initialTarget)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [sport, setSport] = useState('all')
  const debounceRef = useRef(null)

  const loadComparison = useCallback(async (tid, s) => {
    setLoading(true)
    try {
      const params = {}
      if (s && s !== 'all') params.sport = s
      const data = await api.comparePredictions(tid, params)
      setComparison(data)
    } catch (err) {
      console.error('Compare failed:', err)
      setComparison(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadComparison(targetId, sport)
  }, [targetId, sport, loadComparison])

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.getPredictionLeaderboard({ sport: 'all', limit: 10, include: 'profile' })
        const filtered = (res.leaderboard || []).filter(u =>
          u.userId !== user?.id &&
          ((u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()))
        )
        setSearchResults(filtered)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, user?.id])

  const selectUser = (userId) => {
    setTargetId(userId)
    setSearchQuery('')
    setSearchResults([])
  }

  const summary = comparison?.summary
  const myAccPct = summary?.myAccuracy != null ? Math.round(summary.myAccuracy * 100) : 0
  const theirAccPct = summary?.theirAccuracy != null ? Math.round(summary.theirAccuracy * 100) : 0
  const totalWidth = (summary?.myCorrect || 0) + (summary?.theirCorrect || 0)

  return (
    <div className="space-y-4">
      {/* Target selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => { setTargetId('consensus'); setSearchQuery('') }}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              targetId === 'consensus' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            vs Consensus
          </button>
          <button
            onClick={() => {}}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              targetId !== 'consensus' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            vs User
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search users to compare..."
            className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 sm:w-64 bg-[#1A1510] border border-white/10 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
              {searchResults.map(u => (
                <button
                  key={u.userId}
                  onClick={() => selectUser(u.userId)}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2"
                >
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/30">
                      {(u.name || '?').charAt(0)}
                    </div>
                  )}
                  <span className="truncate">{u.name}</span>
                  {u.username && <span className="text-white/30 text-xs font-mono">@{u.username}</span>}
                </button>
              ))}
            </div>
          )}
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border border-white/30 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Sport filter */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {['all', 'nfl', 'golf'].map(s => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                sport === s ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {s === 'all' ? 'All' : s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
        </div>
      ) : !comparison ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">&#9878;&#65039;</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Comparison Data</h3>
          <p className="text-white/50 text-sm">Make some calls first to compare records.</p>
        </div>
      ) : (
        <>
          {/* Main comparison card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            {/* Avatars + score */}
            <div className="flex items-center justify-center gap-6 sm:gap-12">
              {/* My side */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold text-white/40 mx-auto mb-2">
                  {comparison.myUser?.avatar ? (
                    <img src={comparison.myUser.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    (comparison.myUser?.name || 'Y').charAt(0)
                  )}
                </div>
                <div className="text-sm text-white font-medium truncate max-w-[100px]">{comparison.myUser?.name || 'You'}</div>
              </div>

              {/* Score */}
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-mono font-black text-white">
                  {summary?.myCorrect || 0}
                  <span className="text-white/20 mx-2">-</span>
                  {summary?.theirCorrect || 0}
                </div>
                <div className="text-xs text-white/40 mt-1">{summary?.overlapTotal || 0} shared predictions</div>
              </div>

              {/* Their side */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold text-white/40 mx-auto mb-2">
                  {comparison.targetUser?.avatar ? (
                    <img src={comparison.targetUser.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : comparison.isConsensus ? (
                    <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    (comparison.targetUser?.name || 'T').charAt(0)
                  )}
                </div>
                <div className="text-sm text-white font-medium truncate max-w-[100px]">
                  {comparison.targetUser?.name || 'Opponent'}
                </div>
              </div>
            </div>

            {/* Record bar */}
            {totalWidth > 0 && (
              <div className="mt-6 h-3 rounded-full bg-white/5 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(summary.myCorrect / totalWidth) * 100}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${(summary.theirCorrect / totalWidth) * 100}%` }}
                />
              </div>
            )}

            {/* Accuracy bars */}
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <div className="text-2xl font-mono font-bold text-emerald-400">{myAccPct}%</div>
                <div className="text-xs text-white/40">Your accuracy</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-rose-400">{theirAccPct}%</div>
                <div className="text-xs text-white/40">{comparison.isConsensus ? 'Consensus' : 'Their'} accuracy</div>
              </div>
            </div>

            {/* Clutch Rating comparison */}
            {(comparison.myClutchRating != null || comparison.theirClutchRating != null) && (
              <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-white/10">
                <div>
                  <div className="text-xl font-mono font-bold text-amber-400">
                    {comparison.myClutchRating != null ? Math.round(comparison.myClutchRating) : '—'}
                  </div>
                  <div className="text-xs text-white/40">Your Clutch Rating</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono font-bold text-amber-400">
                    {comparison.theirClutchRating != null ? Math.round(comparison.theirClutchRating) : '—'}
                  </div>
                  <div className="text-xs text-white/40">{comparison.isConsensus ? 'Consensus' : 'Their'} Clutch Rating</div>
                </div>
              </div>
            )}

            {/* By sport breakdown */}
            {comparison.bySport && Object.keys(comparison.bySport).length > 1 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">By Sport</h4>
                <div className="space-y-2">
                  {Object.entries(comparison.bySport).map(([s, data]) => (
                    <div key={s} className="flex items-center gap-3">
                      <span className="text-xs text-white/40 uppercase w-10 font-mono">{s}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden flex">
                        {(data.myCorrect + data.theirCorrect) > 0 && (
                          <>
                            <div className="h-full bg-emerald-500" style={{ width: `${(data.myCorrect / (data.myCorrect + data.theirCorrect)) * 100}%` }} />
                            <div className="h-full bg-rose-500" style={{ width: `${(data.theirCorrect / (data.myCorrect + data.theirCorrect)) * 100}%` }} />
                          </>
                        )}
                      </div>
                      <span className="text-xs font-mono text-white/60 w-12 text-right">{data.myCorrect}-{data.theirCorrect}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Share button */}
          {summary?.overlapTotal > 0 && (
            <div className="flex justify-end">
              <ShareButton
                CardComponent={HeadToHeadCard}
                cardProps={{
                  myName: comparison.myUser?.name || 'You',
                  myCorrect: summary.myCorrect,
                  theirName: comparison.targetUser?.name || 'Opponent',
                  theirCorrect: summary.theirCorrect,
                  myAvatar: comparison.myUser?.avatar,
                  theirAvatar: comparison.targetUser?.avatar,
                  username: user?.username,
                }}
                label="Share Comparison"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
