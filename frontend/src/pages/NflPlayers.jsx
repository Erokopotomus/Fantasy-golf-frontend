import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST']
const SCORING_TYPES = [
  { value: 'half_ppr', label: 'Half PPR' },
  { value: 'ppr', label: 'PPR' },
  { value: 'standard', label: 'Standard' },
]

export default function NflPlayers() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const leagueId = searchParams.get('league')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('ALL')
  const [scoring, setScoring] = useState('half_ppr')
  const [season, setSeason] = useState('')
  const [availableSeasons, setAvailableSeasons] = useState([])
  const [sortBy, setSortBy] = useState('fantasyPts')
  const [sortOrder, setSortOrder] = useState('desc')
  const [pagination, setPagination] = useState({ total: 0, hasMore: false })
  const [offset, setOffset] = useState(0)
  const limit = 50

  // Compare mode
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelection, setCompareSelection] = useState([]) // max 2 player objects
  const [compareData, setCompareData] = useState([null, null]) // detailed data for each
  const [compareSeasons, setCompareSeasons] = useState(['', '']) // season per compare slot
  const [compareLoading, setCompareLoading] = useState([false, false])

  // Fetch available seasons on mount
  useEffect(() => {
    api.getNflSeasons().then(data => {
      const seasons = data.seasons || []
      setAvailableSeasons(seasons)
      if (seasons.length > 0 && !season) {
        setSeason(String(seasons[0])) // Default to most recent
      }
    }).catch(() => {})
  }, [])

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getNflPlayers({
        search: search || undefined,
        position: position !== 'ALL' ? position : undefined,
        scoring,
        season: season || undefined,
        sortBy,
        sortOrder,
        limit,
        offset,
      })
      setPlayers(data.players || [])
      setPagination(data.pagination || {})
    } catch (err) {
      console.error('Failed to fetch NFL players:', err)
    } finally {
      setLoading(false)
    }
  }, [search, position, scoring, season, sortBy, sortOrder, offset])

  useEffect(() => {
    if (season) fetchPlayers()
  }, [fetchPlayers, season])

  useEffect(() => {
    setOffset(0)
  }, [search, position, scoring, season])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder(field === 'name' ? 'asc' : 'desc')
    }
  }

  // Compare mode: fetch detailed player data when selected
  const fetchComparePlayer = async (index, playerId, targetSeason) => {
    setCompareLoading(prev => { const n = [...prev]; n[index] = true; return n })
    try {
      const data = await api.getNflPlayer(playerId, {
        season: targetSeason || undefined,
      })
      setCompareData(prev => { const n = [...prev]; n[index] = data; return n })
      // Set available seasons for this slot from the response
      if (data.availableSeasons?.length && !targetSeason) {
        setCompareSeasons(prev => {
          const n = [...prev]
          n[index] = String(data.availableSeasons[0])
          return n
        })
      }
    } catch (err) {
      console.error('Failed to fetch compare player:', err)
    } finally {
      setCompareLoading(prev => { const n = [...prev]; n[index] = false; return n })
    }
  }

  const handleRowClick = (player) => {
    if (!compareMode) {
      navigate(`/nfl/players/${player.id}`)
      return
    }

    // Toggle selection
    const existing = compareSelection.findIndex(p => p.id === player.id)
    if (existing >= 0) {
      // Deselect
      const newSel = compareSelection.filter(p => p.id !== player.id)
      setCompareSelection(newSel)
      // Clear data for removed slot
      if (existing === 0) {
        setCompareData(prev => [prev[1] || null, null])
        setCompareSeasons(prev => [prev[1] || '', ''])
      } else {
        setCompareData(prev => [prev[0], null])
        setCompareSeasons(prev => [prev[0], ''])
      }
      return
    }

    if (compareSelection.length >= 2) return // Already have 2

    const newSel = [...compareSelection, player]
    setCompareSelection(newSel)
    const slotIndex = newSel.length - 1
    fetchComparePlayer(slotIndex, player.id, season)
    setCompareSeasons(prev => { const n = [...prev]; n[slotIndex] = season; return n })
  }

  const handleCompareSeason = (index, newSeason) => {
    setCompareSeasons(prev => { const n = [...prev]; n[index] = newSeason; return n })
    if (compareSelection[index]) {
      fetchComparePlayer(index, compareSelection[index].id, newSeason)
    }
  }

  const exitCompare = () => {
    setCompareMode(false)
    setCompareSelection([])
    setCompareData([null, null])
    setCompareSeasons(['', ''])
  }

  const isSelected = (id) => compareSelection.some(p => p.id === id)

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-white/20 ml-1">{'\u25B4\u25BE'}</span>
    return <span className="text-gold ml-1">{sortOrder === 'asc' ? '\u25B4' : '\u25BE'}</span>
  }

  // Stat columns based on position filter
  const getStatColumns = () => {
    if (position === 'QB') return ['passYards', 'passTds', 'interceptions', 'rushYards', 'rushTds']
    if (position === 'RB') return ['rushYards', 'rushTds', 'receptions', 'recYards', 'recTds']
    if (position === 'WR' || position === 'TE') return ['receptions', 'recYards', 'recTds', 'targets']
    if (position === 'K') return ['fgMade', 'fgAttempts', 'xpMade', 'xpAttempts']
    if (position === 'DST') return ['sacks', 'defInterceptions', 'fumblesRecovered', 'fumblesForced', 'defTds']
    return ['passYards', 'rushYards', 'recYards'] // ALL — show summary
  }

  const statLabels = {
    passYards: 'Pass YDs', passTds: 'Pass TDs', interceptions: 'INTs',
    rushYards: 'Rush YDs', rushTds: 'Rush TDs', receptions: 'REC',
    recYards: 'Rec YDs', recTds: 'Rec TDs', targets: 'TGT',
    fgMade: 'FGM', fgAttempts: 'FGA', xpMade: 'XPM', xpAttempts: 'XPA',
    fumblesLost: 'FUM',
    sacks: 'SACK', defInterceptions: 'INT', fumblesRecovered: 'FR',
    fumblesForced: 'FF', defTds: 'TD',
  }

  const statCols = getStatColumns()

  // Format fantasy points with 2 decimal places
  const fmtPts = (val) => {
    if (val === null || val === undefined) return '0.00'
    return Number(val).toFixed(2)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-8">
      {leagueId && (
        <Link
          to={`/leagues/${leagueId}`}
          className="inline-flex items-center text-text-secondary hover:text-white transition-colors mb-3 text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to League
        </Link>
      )}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{'\uD83C\uDFC8'}</span>
        <h1 className="text-2xl font-display font-bold text-white">NFL Players</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none w-64"
        />

        {/* Position filter */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={`px-3 py-1.5 rounded-md text-sm font-mono font-bold transition-colors ${
                position === pos
                  ? 'bg-gold/20 text-gold'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Scoring type */}
        <select
          value={scoring}
          onChange={e => setScoring(e.target.value)}
          className="bg-[#1a1917] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-gold/50 focus:outline-none"
        >
          {SCORING_TYPES.map(s => (
            <option key={s.value} value={s.value} className="bg-[#1a1917] text-white">{s.label}</option>
          ))}
        </select>

        {/* Season dropdown */}
        {availableSeasons.length > 0 && (
          <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="bg-[#1a1917] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-gold/50 focus:outline-none"
          >
            {availableSeasons.map(yr => (
              <option key={yr} value={yr} className="bg-[#1a1917] text-white">{yr} Season</option>
            ))}
          </select>
        )}

        {/* Compare toggle */}
        <button
          onClick={() => compareMode ? exitCompare() : setCompareMode(true)}
          className={`px-4 py-2 rounded-lg text-sm font-mono font-bold transition-colors border ${
            compareMode
              ? 'bg-gold/20 text-gold border-gold/30'
              : 'bg-white/5 text-white/50 border-white/10 hover:text-white/70 hover:border-white/20'
          }`}
        >
          {compareMode ? `Compare (${compareSelection.length}/2)` : 'Compare'}
        </button>
      </div>

      {/* Compare hint */}
      {compareMode && compareSelection.length < 2 && (
        <div className="mb-4 px-4 py-2 bg-gold/5 border border-gold/20 rounded-lg text-gold/70 text-sm font-mono">
          Click {2 - compareSelection.length} player{compareSelection.length === 0 ? 's' : ''} to compare
        </div>
      )}

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-white/50 text-xs font-mono uppercase tracking-wider w-12">#</th>
                <th
                  className="text-left px-4 py-3 text-white/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort('name')}
                >
                  Player <SortIcon field="name" />
                </th>
                <th
                  className="text-left px-4 py-3 text-white/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort('nflPosition')}
                >
                  POS <SortIcon field="nflPosition" />
                </th>
                <th
                  className="text-left px-4 py-3 text-white/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort('nflTeamAbbr')}
                >
                  Team <SortIcon field="nflTeamAbbr" />
                </th>
                <th className="text-center px-4 py-3 text-white/50 text-xs font-mono uppercase tracking-wider">GP</th>
                {statCols.map(col => (
                  <th
                    key={col}
                    className="text-right px-4 py-3 text-white/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort(col)}
                  >
                    {statLabels[col] || col} <SortIcon field={col} />
                  </th>
                ))}
                <th
                  className="text-right px-4 py-3 text-white/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort('fantasyPts')}
                >
                  FPTS <SortIcon field="fantasyPts" />
                </th>
                <th className="text-right px-4 py-3 text-white/50 text-xs font-mono uppercase tracking-wider">AVG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7 + statCols.length} className="text-center py-12 text-white/30">Loading...</td></tr>
              ) : players.length === 0 ? (
                <tr><td colSpan={7 + statCols.length} className="text-center py-12 text-white/30">No players found</td></tr>
              ) : (
                players.map((p, i) => {
                  const selected = isSelected(p.id)
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleRowClick(p)}
                      className={`border-b border-white/5 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-gold/10 border-l-2 border-l-gold'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="px-4 py-3 text-white/30 font-mono text-sm">{offset + i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.headshotUrl ? (
                            <img src={p.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-white/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-xs font-bold">
                              {p.nflPosition}
                            </div>
                          )}
                          <span className={`font-medium transition-colors ${selected ? 'text-gold' : 'text-white group-hover:text-gold'}`}>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm font-bold ${
                          p.nflPosition === 'QB' ? 'text-red-400' :
                          p.nflPosition === 'RB' ? 'text-blue-400' :
                          p.nflPosition === 'WR' ? 'text-green-400' :
                          p.nflPosition === 'TE' ? 'text-orange-400' :
                          p.nflPosition === 'K' ? 'text-purple-400' :
                          p.nflPosition === 'DST' ? 'text-yellow-400' :
                          'text-white/50'
                        }`}>
                          {p.nflPosition}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/70 font-mono text-sm">{p.nflTeamAbbr || '-'}</td>
                      <td className="px-4 py-3 text-center text-white/50 font-mono text-sm">{p.season?.gamesPlayed || 0}</td>
                      {statCols.map(col => {
                        // In ALL view, show '-' for stats irrelevant to the player's position
                        const pos = p.nflPosition
                        const irrelevant = position === 'ALL' && (
                          (['passYards'].includes(col) && !['QB'].includes(pos)) ||
                          (['rushYards'].includes(col) && ['K', 'DST'].includes(pos)) ||
                          (['recYards'].includes(col) && ['QB', 'K', 'DST'].includes(pos))
                        )
                        return (
                          <td key={col} className="px-4 py-3 text-right text-white/70 font-mono text-sm">
                            {irrelevant ? '-' : (p.season?.[col] != null ? p.season[col] : '-')}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-gold">
                        {fmtPts(p.fantasyPts)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-white/50">
                        {fmtPts(p.fantasyPtsPerGame)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-white/30 text-sm font-mono">
              {offset + 1}-{Math.min(offset + limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 rounded bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-30 text-sm"
              >
                Prev
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={!pagination.hasMore}
                className="px-3 py-1 rounded bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-30 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compare Panel — fixed bottom */}
      {compareMode && compareSelection.length === 2 && (
        <ComparePanel
          players={compareSelection}
          data={compareData}
          seasons={compareSeasons}
          availableSeasons={availableSeasons}
          loading={compareLoading}
          scoring={scoring}
          onSeasonChange={handleCompareSeason}
          onClose={exitCompare}
        />
      )}
    </div>
  )
}

// ─── Compare Panel ────────────────────────────────────────────────────────────

function ComparePanel({ players, data, seasons, availableSeasons, loading, scoring, onSeasonChange, onClose }) {
  const scoringKey = scoring === 'ppr' ? 'fantasyPtsPpr' : scoring === 'half_ppr' ? 'fantasyPtsHalf' : 'fantasyPtsStd'

  // Determine stat rows based on both players' positions
  const getCompareStats = () => {
    const pos1 = players[0]?.nflPosition
    const pos2 = players[1]?.nflPosition

    // If same position, show position-specific stats
    if (pos1 === pos2) {
      if (pos1 === 'QB') return [
        { key: 'passYards', label: 'Pass YDs' },
        { key: 'passTds', label: 'Pass TDs' },
        { key: 'interceptions', label: 'INTs' },
        { key: 'rushYards', label: 'Rush YDs' },
        { key: 'rushTds', label: 'Rush TDs' },
      ]
      if (pos1 === 'K') return [
        { key: 'fgMade', label: 'FG Made' },
        { key: 'fgAttempts', label: 'FG Att' },
        { key: 'xpMade', label: 'XP Made' },
        { key: 'xpAttempts', label: 'XP Att' },
      ]
      if (pos1 === 'DST') return [
        { key: 'sacks', label: 'Sacks' },
        { key: 'defInterceptions', label: 'INTs' },
        { key: 'fumblesRecovered', label: 'Fum Rec' },
        { key: 'defTds', label: 'Def TDs' },
      ]
      // RB, WR, TE
      return [
        { key: 'rushYards', label: 'Rush YDs' },
        { key: 'rushTds', label: 'Rush TDs' },
        { key: 'receptions', label: 'REC' },
        { key: 'recYards', label: 'Rec YDs' },
        { key: 'recTds', label: 'Rec TDs' },
        { key: 'targets', label: 'TGT' },
      ]
    }

    // Mixed positions — show universal stats
    return [
      { key: 'passYards', label: 'Pass YDs' },
      { key: 'rushYards', label: 'Rush YDs' },
      { key: 'recYards', label: 'Rec YDs' },
      { key: 'receptions', label: 'REC' },
    ]
  }

  const stats = getCompareStats()

  const getStat = (index, key) => {
    const totals = data[index]?.seasonTotals
    if (!totals) return '-'
    return totals[key] ?? '-'
  }

  const getFpts = (index) => {
    const totals = data[index]?.seasonTotals
    if (!totals) return '-'
    const val = totals[scoringKey]
    return val != null ? Number(val).toFixed(2) : '-'
  }

  const getGP = (index) => {
    const totals = data[index]?.seasonTotals
    return totals?.gamesPlayed ?? '-'
  }

  // Highlight the better value (higher = better, except INTs)
  const lowerIsBetter = ['interceptions']
  const better = (key, v1, v2) => {
    if (v1 === '-' || v2 === '-') return 0
    const n1 = Number(v1), n2 = Number(v2)
    if (n1 === n2) return 0
    if (lowerIsBetter.includes(key)) return n1 < n2 ? 1 : 2
    return n1 > n2 ? 1 : 2
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0908]/95 backdrop-blur-md border-t border-gold/20 shadow-2xl">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-mono font-bold text-gold uppercase tracking-wider">Player Comparison</h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-sm font-mono"
          >
            Close
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
          {/* Player 1 */}
          <div className="text-center">
            <PlayerCompareHeader player={players[0]} data={data[0]} />
            <select
              value={seasons[0]}
              onChange={e => onSeasonChange(0, e.target.value)}
              className="mt-1 bg-[#1a1917] border border-white/10 rounded px-2 py-1 text-white text-xs font-mono focus:border-gold/50 focus:outline-none"
            >
              {availableSeasons.map(yr => (
                <option key={yr} value={yr} className="bg-[#1a1917] text-white">{yr}</option>
              ))}
            </select>
          </div>

          {/* Stat labels (center column) */}
          <div className="flex flex-col justify-end">
            <div className="h-8 flex items-center justify-center text-white/30 text-xs font-mono">GP</div>
            {stats.map(s => (
              <div key={s.key} className="h-7 flex items-center justify-center text-white/40 text-xs font-mono whitespace-nowrap">
                {s.label}
              </div>
            ))}
            <div className="h-8 flex items-center justify-center text-gold/50 text-xs font-mono font-bold">FPTS</div>
          </div>

          {/* Player 2 */}
          <div className="text-center">
            <PlayerCompareHeader player={players[1]} data={data[1]} />
            <select
              value={seasons[1]}
              onChange={e => onSeasonChange(1, e.target.value)}
              className="mt-1 bg-[#1a1917] border border-white/10 rounded px-2 py-1 text-white text-xs font-mono focus:border-gold/50 focus:outline-none"
            >
              {availableSeasons.map(yr => (
                <option key={yr} value={yr} className="bg-[#1a1917] text-white">{yr}</option>
              ))}
            </select>
          </div>

          {/* Player 1 stats */}
          <div className="flex flex-col items-center">
            <div className="h-8 flex items-center justify-center text-white/60 text-sm font-mono">{loading[0] ? '...' : getGP(0)}</div>
            {stats.map(s => {
              const v1 = getStat(0, s.key), v2 = getStat(1, s.key)
              const b = better(s.key, v1, v2)
              return (
                <div key={s.key} className={`h-7 flex items-center justify-center text-sm font-mono ${b === 1 ? 'text-gold font-bold' : 'text-white/60'}`}>
                  {loading[0] ? '...' : (typeof v1 === 'number' ? v1.toLocaleString() : v1)}
                </div>
              )
            })}
            <div className={`h-8 flex items-center justify-center text-sm font-mono font-bold ${
              better(scoringKey, getFpts(0), getFpts(1)) === 1 ? 'text-gold' : 'text-white/60'
            }`}>
              {loading[0] ? '...' : getFpts(0)}
            </div>
          </div>

          {/* VS divider (center) */}
          <div className="flex flex-col justify-end">
            <div className="h-8" />
            {stats.map(s => <div key={s.key} className="h-7" />)}
            <div className="h-8" />
          </div>

          {/* Player 2 stats */}
          <div className="flex flex-col items-center">
            <div className="h-8 flex items-center justify-center text-white/60 text-sm font-mono">{loading[1] ? '...' : getGP(1)}</div>
            {stats.map(s => {
              const v1 = getStat(0, s.key), v2 = getStat(1, s.key)
              const b = better(s.key, v1, v2)
              return (
                <div key={s.key} className={`h-7 flex items-center justify-center text-sm font-mono ${b === 2 ? 'text-gold font-bold' : 'text-white/60'}`}>
                  {loading[1] ? '...' : (typeof v2 === 'number' ? v2.toLocaleString() : v2)}
                </div>
              )
            })}
            <div className={`h-8 flex items-center justify-center text-sm font-mono font-bold ${
              better(scoringKey, getFpts(0), getFpts(1)) === 2 ? 'text-gold' : 'text-white/60'
            }`}>
              {loading[1] ? '...' : getFpts(1)}
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex justify-between mt-3 pt-2 border-t border-white/5">
          <Link to={`/nfl/players/${players[0]?.id}`} className="text-white/40 hover:text-gold text-xs font-mono">
            View {players[0]?.name}'s Profile
          </Link>
          <Link to={`/nfl/players/${players[1]?.id}`} className="text-white/40 hover:text-gold text-xs font-mono">
            View {players[1]?.name}'s Profile
          </Link>
        </div>
      </div>
    </div>
  )
}

function PlayerCompareHeader({ player, data }) {
  const posColor = {
    QB: 'text-red-400',
    RB: 'text-blue-400',
    WR: 'text-green-400',
    TE: 'text-orange-400',
    K: 'text-purple-400',
    DST: 'text-yellow-400',
  }[player?.nflPosition] || 'text-white/50'

  return (
    <div className="flex flex-col items-center gap-1">
      {player?.headshotUrl ? (
        <img src={player.headshotUrl} alt="" className="w-12 h-12 rounded-full object-cover bg-white/10" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-xs font-bold">
          {player?.nflPosition}
        </div>
      )}
      <span className="text-white font-medium text-sm">{player?.name}</span>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xs font-bold ${posColor}`}>{player?.nflPosition}</span>
        <span className="text-white/40 font-mono text-xs">{player?.nflTeamAbbr || ''}</span>
      </div>
    </div>
  )
}
