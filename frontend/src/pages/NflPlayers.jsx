import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST']
const SCORING_TYPES = [
  { value: 'half_ppr', label: 'Half PPR' },
  { value: 'ppr', label: 'PPR' },
  { value: 'standard', label: 'Standard' },
]

export default function NflPlayers() {
  const [searchParams] = useSearchParams()
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

  // Format number with 1 decimal place for fantasy points
  const fmtPts = (val) => {
    if (val === null || val === undefined) return '0.0'
    return Number(val).toFixed(1)
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
      <div className="flex flex-wrap gap-3 mb-6">
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
      </div>

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
                players.map((p, i) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white/30 font-mono text-sm">{offset + i + 1}</td>
                    <td className="px-4 py-3">
                      <Link to={`/nfl/players/${p.id}`} className="flex items-center gap-3 group">
                        {p.headshotUrl ? (
                          <img src={p.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-xs font-bold">
                            {p.nflPosition}
                          </div>
                        )}
                        <span className="text-white font-medium group-hover:text-gold transition-colors">{p.name}</span>
                      </Link>
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
                    {statCols.map(col => (
                      <td key={col} className="px-4 py-3 text-right text-white/70 font-mono text-sm">
                        {p.season?.[col] != null ? p.season[col] : '-'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-gold">
                      {fmtPts(p.fantasyPts)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-white/50">
                      {fmtPts(p.fantasyPtsPerGame)}
                    </td>
                  </tr>
                ))
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
    </div>
  )
}
