import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import useWatchList from '../hooks/useWatchList'
import AddToBoardModal from '../components/workspace/AddToBoardModal'
import NewsCard from '../components/news/NewsCard'

const SCORING_LABELS = { standard: 'STD', ppr: 'PPR', half_ppr: 'Half' }

export default function NflPlayerDetail() {
  const { playerId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scoringView, setScoringView] = useState('half_ppr')
  const [activeTab, setActiveTab] = useState('career')
  const [gameLogSeason, setGameLogSeason] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})
  const [playerNews, setPlayerNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [showAddToBoard, setShowAddToBoard] = useState(false)
  const { isWatched, toggleWatch } = useWatchList()

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.getNflPlayerProfile(playerId)
      setData(result)
      if (result.availableSeasons?.length) {
        setGameLogSeason(result.availableSeasons[0])
      }
    } catch (err) {
      console.error('Failed to load NFL player profile:', err)
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const player = data?.player
  const seasonSummaries = data?.seasonSummaries || []
  const gameLog = data?.gameLog || []
  const careerTotals = data?.careerTotals || {}
  const availableSeasons = data?.availableSeasons || []

  // Filter game log by selected season
  const filteredGameLog = useMemo(() => {
    if (!gameLogSeason) return gameLog
    return gameLog.filter(g => g.season === gameLogSeason)
  }, [gameLog, gameLogSeason])

  // Latest season summary for the header
  const latestSeason = seasonSummaries[0] || null

  if (loading && !player) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
        <div className="text-center py-20 text-white/30">Loading player profile...</div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
        <div className="text-center py-20 text-white/30">Player not found</div>
      </div>
    )
  }

  const posColor = {
    QB: 'text-red-400 bg-red-400/10 border-red-400/20',
    RB: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    WR: 'text-green-400 bg-green-400/10 border-green-400/20',
    TE: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    K: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    DEF: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  }[player.nflPosition] || 'text-white/50 bg-white/5 border-white/10'

  const isQb = player.nflPosition === 'QB'
  const isK = player.nflPosition === 'K'
  const isDst = player.nflPosition === 'DST' || player.nflPosition === 'DEF'
  const isSkillPos = ['RB', 'WR', 'TE'].includes(player.nflPosition)

  // Lazy-load news on tab select
  useEffect(() => {
    if (activeTab !== 'news' || playerNews.length > 0) return
    setNewsLoading(true)
    api.getPlayerNews(playerId, { limit: 10 })
      .then(data => setPlayerNews(data.articles || []))
      .catch(() => setPlayerNews([]))
      .finally(() => setNewsLoading(false))
  }, [activeTab, playerId])

  const TABS = [
    { key: 'career', label: 'Career Stats' },
    { key: 'gamelog', label: 'Game Log' },
    { key: 'fantasy', label: 'Fantasy' },
    { key: 'news', label: 'News' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
      {/* Back link */}
      <Link to="/nfl/players" className="text-white/40 hover:text-white/60 text-sm mb-4 inline-block">&larr; Back to Players</Link>

      {/* ─── Player Header ─── */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {player.headshotUrl ? (
            <img src={player.headshotUrl} alt="" className="w-24 h-24 rounded-full object-cover bg-white/10 flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-2xl font-bold flex-shrink-0">
              {player.nflPosition}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-display font-bold text-white">{player.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={`px-3 py-1 rounded-full border font-mono text-sm font-bold ${posColor}`}>
                {player.nflPosition}
              </span>
              {player.nflTeamAbbr && (
                <Link to={`/nfl/teams/${player.nflTeamAbbr}`} className="text-white/60 hover:text-gold font-mono text-sm">
                  {player.nflTeamAbbr}
                </Link>
              )}
              {player.nflNumber && (
                <span className="text-white/30 font-mono text-sm">#{player.nflNumber}</span>
              )}
              {player.college && (
                <span className="text-white/30 text-sm">{player.college}</span>
              )}
              {careerTotals.seasons > 0 && (
                <span className="text-white/20 text-sm">{careerTotals.seasons} season{careerTotals.seasons !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Season fantasy points */}
          <div className="text-right flex-shrink-0">
            {latestSeason && (
              <>
                <div className="text-3xl font-mono font-bold text-gold">
                  {latestSeason.fantasyPts[scoringView]?.toFixed(1) ?? '0.0'}
                </div>
                <div className="text-white/40 text-xs font-mono uppercase">
                  {latestSeason.season} FPTS ({latestSeason.fantasyPtsPerGame[scoringView]}/g)
                </div>
                <div className="flex gap-1 mt-1 justify-end">
                  {['standard', 'half_ppr', 'ppr'].map(s => (
                    <button
                      key={s}
                      onClick={() => setScoringView(s)}
                      className={`px-2 py-0.5 rounded text-xs font-mono ${
                        scoringView === s ? 'bg-gold/20 text-gold' : 'text-white/30 hover:text-white/50'
                      }`}
                    >
                      {SCORING_LABELS[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Add to Board + Watch */}
        {user && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
            <button
              onClick={() => setShowAddToBoard(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gold/40 rounded-lg text-gold text-sm font-semibold hover:bg-gold/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Add to Board
            </button>
            <button
              onClick={() => toggleWatch(playerId, 'nfl')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm font-semibold transition-colors
                ${isWatched(playerId) ? 'border-gold/40 text-gold bg-gold/10' : 'border-white/20 text-white/40 hover:border-gold/30 hover:text-gold'}`}
            >
              <svg className="w-4 h-4" fill={isWatched(playerId) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {isWatched(playerId) ? 'Watching' : 'Watch'}
            </button>
          </div>
        )}

        {/* Quick season stats (default view for Informed Fan) */}
        {latestSeason && latestSeason.totals.gamesPlayed > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6 pt-4 border-t border-white/5">
            <QuickStat label="GP" value={latestSeason.totals.gamesPlayed} />
            {isQb ? (
              <>
                <QuickStat label="Pass YDs" value={latestSeason.totals.passYards?.toLocaleString()} />
                <QuickStat label="Pass TDs" value={latestSeason.totals.passTds} accent />
                <QuickStat label="INTs" value={latestSeason.totals.interceptions} negative />
                <QuickStat label="Rush YDs" value={latestSeason.totals.rushYards?.toLocaleString()} />
                <QuickStat label="Total TDs" value={latestSeason.totals.passTds + latestSeason.totals.rushTds} accent />
              </>
            ) : isK ? (
              <>
                <QuickStat label="FG" value={`${latestSeason.totals.fgMade}/${latestSeason.totals.fgAttempts}`} accent />
                <QuickStat label="XP" value={`${latestSeason.totals.xpMade}/${latestSeason.totals.xpAttempts}`} />
                <QuickStat label="FG%" value={latestSeason.totals.fgAttempts > 0
                  ? `${Math.round((latestSeason.totals.fgMade / latestSeason.totals.fgAttempts) * 100)}%` : '-'} />
              </>
            ) : isDst ? (
              <>
                <QuickStat label="Sacks" value={latestSeason.totals.sacks} accent />
                <QuickStat label="INTs" value={latestSeason.totals.defInterceptions} />
                <QuickStat label="FF" value={latestSeason.totals.fumblesForced} />
                <QuickStat label="FR" value={latestSeason.totals.fumblesRecovered} />
                <QuickStat label="Def TDs" value={latestSeason.totals.defTds} accent />
              </>
            ) : (
              <>
                <QuickStat label="Rush YDs" value={latestSeason.totals.rushYards?.toLocaleString()} />
                <QuickStat label="Rush TDs" value={latestSeason.totals.rushTds} accent />
                <QuickStat label="REC" value={latestSeason.totals.receptions} />
                <QuickStat label="Rec YDs" value={latestSeason.totals.recYards?.toLocaleString()} />
                <QuickStat label="Rec TDs" value={latestSeason.totals.recTds} accent />
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gold/20 text-gold'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Career Stats Tab ─── */}
      {activeTab === 'career' && (
        <div className="space-y-4">
          {/* Career Stats by Season Table */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="text-lg font-display font-bold text-white">Career Stats by Season</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-2 text-white/40 text-xs font-mono uppercase sticky left-0 bg-[#0e0d0b]">Year</th>
                    <th className="text-left px-3 py-2 text-white/40 text-xs font-mono">TM</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">GP</th>
                    {isQb ? (
                      <>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">CMP</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">ATT</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">CMP%</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">P.YDS</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">P.TD</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">INT</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.YDS</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.TD</th>
                      </>
                    ) : isK ? (
                      <>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FGM</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FGA</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FG%</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">XPM</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">XPA</th>
                      </>
                    ) : isDst ? (
                      <>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">SACK</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">INT</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FF</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FR</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">TD</th>
                      </>
                    ) : (
                      <>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">RUSH</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.YDS</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.TD</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">TGT</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">REC</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">REC.YDS</th>
                        <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">REC.TD</th>
                      </>
                    )}
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono">FPTS</th>
                    <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FPTS/G</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonSummaries.map(ss => (
                    <tr key={ss.season} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2.5 font-mono text-sm font-bold text-white sticky left-0 bg-transparent">{ss.season}</td>
                      <td className="px-3 py-2.5 font-mono text-sm text-white/60">{ss.teamAbbr || '-'}</td>
                      <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.gamesPlayed}</td>
                      {isQb ? (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.passCompletions}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.passAttempts}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">
                            {ss.totals.passAttempts > 0
                              ? `${Math.round((ss.totals.passCompletions / ss.totals.passAttempts) * 1000) / 10}%`
                              : '-'}
                          </td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{ss.totals.passYards?.toLocaleString()}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold font-bold">{ss.totals.passTds}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-red-400">{ss.totals.interceptions}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.rushYards?.toLocaleString()}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{ss.totals.rushTds}</td>
                        </>
                      ) : isK ? (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{ss.totals.fgMade}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.fgAttempts}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">
                            {ss.totals.fgAttempts > 0 ? `${Math.round((ss.totals.fgMade / ss.totals.fgAttempts) * 100)}%` : '-'}
                          </td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.xpMade}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.xpAttempts}</td>
                        </>
                      ) : isDst ? (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{ss.totals.sacks}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{ss.totals.defInterceptions}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.fumblesForced}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.fumblesRecovered}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{ss.totals.defTds}</td>
                        </>
                      ) : (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.rushAttempts}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{ss.totals.rushYards?.toLocaleString()}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{ss.totals.rushTds}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/40">{ss.totals.targets}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{ss.totals.receptions}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{ss.totals.recYards?.toLocaleString()}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{ss.totals.recTds}</td>
                        </>
                      )}
                      <td className="text-right px-4 py-2.5 font-mono text-sm font-bold text-gold">
                        {ss.fantasyPts[scoringView]?.toFixed(1)}
                      </td>
                      <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">
                        {ss.fantasyPtsPerGame[scoringView]?.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  {/* Career totals row */}
                  {seasonSummaries.length > 1 && (
                    <tr className="border-t border-white/20 bg-white/5">
                      <td className="px-4 py-2.5 font-mono text-sm font-bold text-gold sticky left-0">Career</td>
                      <td className="px-3 py-2.5 font-mono text-sm text-white/40">—</td>
                      <td className="text-right px-3 py-2.5 font-mono text-sm text-white font-bold">{careerTotals.gamesPlayed}</td>
                      {isQb ? (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{seasonSummaries.reduce((s, ss) => s + ss.totals.passCompletions, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{seasonSummaries.reduce((s, ss) => s + ss.totals.passAttempts, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">
                            {(() => {
                              const att = seasonSummaries.reduce((s, ss) => s + ss.totals.passAttempts, 0)
                              const cmp = seasonSummaries.reduce((s, ss) => s + ss.totals.passCompletions, 0)
                              return att > 0 ? `${Math.round((cmp / att) * 1000) / 10}%` : '-'
                            })()}
                          </td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white font-bold">{careerTotals.passYards?.toLocaleString()}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold font-bold">{careerTotals.passTds}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-red-400">{careerTotals.interceptions}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{careerTotals.rushYards?.toLocaleString()}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{careerTotals.rushTds}</td>
                        </>
                      ) : isK ? (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{seasonSummaries.reduce((s, ss) => s + ss.totals.fgMade, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{seasonSummaries.reduce((s, ss) => s + ss.totals.fgAttempts, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">
                            {(() => {
                              const att = seasonSummaries.reduce((s, ss) => s + ss.totals.fgAttempts, 0)
                              const made = seasonSummaries.reduce((s, ss) => s + ss.totals.fgMade, 0)
                              return att > 0 ? `${Math.round((made / att) * 100)}%` : '-'
                            })()}
                          </td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{seasonSummaries.reduce((s, ss) => s + ss.totals.xpMade, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{seasonSummaries.reduce((s, ss) => s + ss.totals.xpAttempts, 0)}</td>
                        </>
                      ) : isDst ? (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{seasonSummaries.reduce((s, ss) => s + ss.totals.sacks, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{seasonSummaries.reduce((s, ss) => s + ss.totals.defInterceptions, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{seasonSummaries.reduce((s, ss) => s + ss.totals.fumblesForced, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{seasonSummaries.reduce((s, ss) => s + ss.totals.fumblesRecovered, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{seasonSummaries.reduce((s, ss) => s + ss.totals.defTds, 0)}</td>
                        </>
                      ) : (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{seasonSummaries.reduce((s, ss) => s + ss.totals.rushAttempts, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white font-bold">{careerTotals.rushYards?.toLocaleString()}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{careerTotals.rushTds}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/40">{seasonSummaries.reduce((s, ss) => s + ss.totals.targets, 0)}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{careerTotals.receptions}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white font-bold">{careerTotals.recYards?.toLocaleString()}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{careerTotals.recTds}</td>
                        </>
                      )}
                      <td className="text-right px-4 py-2.5 font-mono text-sm font-bold text-gold">
                        {careerTotals.fantasyPts?.[scoringView]?.toFixed(1)}
                      </td>
                      <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">
                        {careerTotals.gamesPlayed > 0
                          ? (careerTotals.fantasyPts?.[scoringView] / careerTotals.gamesPlayed).toFixed(1)
                          : '-'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Advanced Stats (Expandable — for Grinders) ─── */}
          {!isDst && !isK && (
            <ExpandableSection
              title="Advanced Stats"
              subtitle="EPA, CPOE, success rate, target share"
              expanded={expandedSections.advanced}
              onToggle={() => toggleSection('advanced')}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-2 text-white/40 text-xs font-mono uppercase">Year</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">EPA Total</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">EPA/Game</th>
                      {isQb && <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">CPOE</th>}
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">Success%</th>
                      {isSkillPos && <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">Tgt Share</th>}
                      {(player.nflPosition === 'RB') && <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">Rush Share</th>}
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">Snap %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonSummaries.map(ss => {
                      const adv = ss.advanced
                      const hasAny = adv.epaTotal != null || adv.cpoe != null || adv.successRate != null
                      if (!hasAny) return null
                      return (
                        <tr key={ss.season} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2.5 font-mono text-sm font-bold text-white">{ss.season}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{adv.epaTotal ?? '-'}</td>
                          <td className={`text-right px-3 py-2.5 font-mono text-sm font-bold ${
                            adv.epaPerGame != null && adv.epaPerGame > 0 ? 'text-green-400' :
                            adv.epaPerGame != null && adv.epaPerGame < 0 ? 'text-red-400' : 'text-white/60'
                          }`}>
                            {adv.epaPerGame != null ? (adv.epaPerGame > 0 ? '+' : '') + adv.epaPerGame : '-'}
                          </td>
                          {isQb && (
                            <td className={`text-right px-3 py-2.5 font-mono text-sm ${
                              adv.cpoe != null && adv.cpoe > 0 ? 'text-green-400' :
                              adv.cpoe != null && adv.cpoe < 0 ? 'text-red-400' : 'text-white/60'
                            }`}>
                              {adv.cpoe != null ? (adv.cpoe > 0 ? '+' : '') + adv.cpoe + '%' : '-'}
                            </td>
                          )}
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">
                            {adv.successRate != null ? adv.successRate + '%' : '-'}
                          </td>
                          {isSkillPos && (
                            <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">
                              {adv.targetShare != null ? adv.targetShare + '%' : '-'}
                            </td>
                          )}
                          {(player.nflPosition === 'RB') && (
                            <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">
                              {adv.rushShare != null ? adv.rushShare + '%' : '-'}
                            </td>
                          )}
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">
                            {adv.snapPct != null ? adv.snapPct + '%' : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-white/20 text-xs px-4 pb-3 pt-1">
                EPA = Expected Points Added. CPOE = Completion % Over Expected. Success Rate = % of plays with positive EPA.
              </p>
            </ExpandableSection>
          )}
        </div>
      )}

      {/* ─── Game Log Tab ─── */}
      {activeTab === 'gamelog' && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-white">Game Log</h2>
            {availableSeasons.length > 1 && (
              <select
                value={gameLogSeason || ''}
                onChange={e => setGameLogSeason(Number(e.target.value))}
                className="bg-[#1a1917] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:border-gold/50 focus:outline-none"
              >
                {availableSeasons.map(yr => (
                  <option key={yr} value={yr} className="bg-[#1a1917] text-white">{yr}</option>
                ))}
              </select>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-2 text-white/40 text-xs font-mono uppercase">WK</th>
                  <th className="text-left px-4 py-2 text-white/40 text-xs font-mono uppercase">OPP</th>
                  <th className="text-center px-4 py-2 text-white/40 text-xs font-mono uppercase">Result</th>
                  {isQb ? (
                    <>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">CMP</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">ATT</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">YDS</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">TD</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">INT</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">RUSH</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.TD</th>
                    </>
                  ) : isK ? (
                    <>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FGM</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FGA</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">XPM</th>
                    </>
                  ) : isDst ? (
                    <>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">SACK</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">INT</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FR</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">FF</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">TD</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">RUSH</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.YDS</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">R.TD</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">TGT</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">REC</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">REC.YDS</th>
                      <th className="text-right px-3 py-2 text-white/40 text-xs font-mono">REC.TD</th>
                    </>
                  )}
                  <th className="text-right px-4 py-2 text-white/40 text-xs font-mono uppercase">FPTS</th>
                </tr>
              </thead>
              <tbody>
                {filteredGameLog.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-8 text-white/20">No game data available</td></tr>
                ) : (
                  filteredGameLog.map(g => (
                    <tr key={g.gameId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2.5 font-mono text-sm text-white/60">{g.week}</td>
                      <td className="px-4 py-2.5 font-mono text-sm text-white/70">
                        {g.isHome ? 'vs ' : '@ '}{g.opponent}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-sm text-white/40">{g.result}</td>
                      {isQb ? (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.passCompletions ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.passAttempts ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{g.stats.passYards ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold font-bold">{g.stats.passTds ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-red-400">{g.stats.interceptions ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.rushYards ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{g.stats.rushTds ?? '-'}</td>
                        </>
                      ) : isK ? (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{g.stats.fgMade ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.fgAttempts ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.xpMade ?? '-'}</td>
                        </>
                      ) : isDst ? (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{g.stats.sacks ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{g.stats.defInterceptions ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.fumblesRecovered ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.fumblesForced ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{g.stats.defTds ?? '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.rushAttempts ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{g.stats.rushYards ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{g.stats.rushTds ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/40">{g.stats.targets ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/60">{g.stats.receptions ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-white/80">{g.stats.recYards ?? '-'}</td>
                          <td className="text-right px-3 py-2.5 font-mono text-sm text-gold">{g.stats.recTds ?? '-'}</td>
                        </>
                      )}
                      <td className="text-right px-4 py-2.5 font-mono text-sm font-bold text-gold">
                        {g.fantasyPts?.[scoringView] != null ? Number(g.fantasyPts[scoringView]).toFixed(1) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Fantasy Tab ─── */}
      {activeTab === 'fantasy' && (
        <div className="space-y-4">
          {/* Fantasy Points by Format Comparison */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="text-lg font-display font-bold text-white">Fantasy Points by Scoring Format</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-2 text-white/40 text-xs font-mono uppercase">Year</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono">GP</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono">STD Total</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono">STD/G</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono">Half Total</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono">Half/G</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono">PPR Total</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-mono">PPR/G</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonSummaries.map(ss => (
                    <tr key={ss.season} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2.5 font-mono text-sm font-bold text-white">{ss.season}</td>
                      <td className="text-right px-4 py-2.5 font-mono text-sm text-white/60">{ss.totals.gamesPlayed}</td>
                      <td className="text-right px-4 py-2.5 font-mono text-sm text-white/80">{ss.fantasyPts.standard.toFixed(1)}</td>
                      <td className="text-right px-4 py-2.5 font-mono text-sm text-white/60">{ss.fantasyPtsPerGame.standard.toFixed(1)}</td>
                      <td className="text-right px-4 py-2.5 font-mono text-sm text-gold">{ss.fantasyPts.half_ppr.toFixed(1)}</td>
                      <td className="text-right px-4 py-2.5 font-mono text-sm text-gold/70">{ss.fantasyPtsPerGame.half_ppr.toFixed(1)}</td>
                      <td className="text-right px-4 py-2.5 font-mono text-sm text-white/80">{ss.fantasyPts.ppr.toFixed(1)}</td>
                      <td className="text-right px-4 py-2.5 font-mono text-sm text-white/60">{ss.fantasyPtsPerGame.ppr.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PPR vs Standard Differential (for skill positions) */}
          {isSkillPos && seasonSummaries.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-display font-bold text-white/60 mb-3">PPR Boost</h3>
              <p className="text-white/40 text-xs mb-3">How much this player benefits from PPR scoring vs Standard</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {seasonSummaries.map(ss => {
                  const boost = ss.fantasyPts.ppr - ss.fantasyPts.standard
                  const boostPg = ss.fantasyPtsPerGame.ppr - ss.fantasyPtsPerGame.standard
                  return (
                    <div key={ss.season} className="bg-white/5 rounded-lg p-3 text-center">
                      <div className="text-white/40 text-xs font-mono mb-1">{ss.season}</div>
                      <div className="text-gold font-mono font-bold text-lg">+{boost.toFixed(1)}</div>
                      <div className="text-white/30 text-xs font-mono">+{boostPg.toFixed(1)}/game</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── News Tab ─── */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          {newsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-28 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : playerNews.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <p className="text-4xl mb-3">📰</p>
              <p>No recent news for {player.name}</p>
            </div>
          ) : (
            playerNews.map(article => (
              <NewsCard key={article.id} item={article} />
            ))
          )}
        </div>
      )}

      {/* ─── Source Attribution ─── */}
      <div className="mt-8 text-center text-white/15 text-xs font-mono">
        Data via <a href="https://github.com/nflverse" target="_blank" rel="noopener noreferrer" className="hover:text-white/30 underline">nflverse</a>
      </div>

      {showAddToBoard && (
        <AddToBoardModal
          playerId={playerId}
          playerName={player.name}
          sport="nfl"
          onClose={() => setShowAddToBoard(false)}
        />
      )}
    </div>
  )
}

/* ─── Helper Components ─── */

function QuickStat({ label, value, accent, negative }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-mono font-bold ${accent ? 'text-gold' : negative ? 'text-red-400' : 'text-white'}`}>
        {value ?? '-'}
      </div>
      <div className="text-white/30 text-xs font-mono uppercase">{label}</div>
    </div>
  )
}

function ExpandableSection({ title, subtitle, expanded, onToggle, children }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 border-b border-white/10 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="text-left">
          <h2 className="text-lg font-display font-bold text-white">{title}</h2>
          {subtitle && <p className="text-white/30 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <span className={`text-white/30 text-xl transition-transform ${expanded ? 'rotate-180' : ''}`}>
          &#9662;
        </span>
      </button>
      {expanded && children}
    </div>
  )
}
