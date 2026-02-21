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

  // Compare mode — just track selection, navigate to /nfl/compare when 2 selected
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelection, setCompareSelection] = useState([])

  // Fetch available seasons on mount
  useEffect(() => {
    api.getNflSeasons().then(data => {
      const seasons = data.seasons || []
      setAvailableSeasons(seasons)
      if (seasons.length > 0 && !season) {
        setSeason(String(seasons[0]))
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

  const handleRowClick = (player) => {
    if (!compareMode) {
      navigate(`/nfl/players/${player.id}`)
      return
    }

    // Toggle selection
    const existing = compareSelection.findIndex(p => p.id === player.id)
    if (existing >= 0) {
      setCompareSelection(compareSelection.filter(p => p.id !== player.id))
      return
    }

    if (compareSelection.length >= 2) return

    const newSel = [...compareSelection, player]
    setCompareSelection(newSel)

    // When 2 selected, navigate to compare page
    if (newSel.length === 2) {
      navigate(`/nfl/compare?p1=${newSel[0].id}&p2=${newSel[1].id}`)
    }
  }

  const exitCompare = () => {
    setCompareMode(false)
    setCompareSelection([])
  }

  const isSelected = (id) => compareSelection.some(p => p.id === id)

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-text-primary/20 ml-1">{'\u25B4\u25BE'}</span>
    return <span className="text-gold ml-1">{sortOrder === 'asc' ? '\u25B4' : '\u25BE'}</span>
  }

  const getStatColumns = () => {
    if (position === 'QB') return ['passYards', 'passTds', 'interceptions', 'rushYards', 'rushTds']
    if (position === 'RB') return ['rushYards', 'rushTds', 'receptions', 'recYards', 'recTds']
    if (position === 'WR' || position === 'TE') return ['receptions', 'recYards', 'recTds', 'targets']
    if (position === 'K') return ['fgMade', 'fgAttempts', 'xpMade', 'xpAttempts']
    if (position === 'DST') return ['sacks', 'defInterceptions', 'fumblesRecovered', 'fumblesForced', 'defTds']
    return ['passYards', 'rushYards', 'recYards']
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

  const fmtPts = (val) => {
    if (val === null || val === undefined) return '0.00'
    return Number(val).toFixed(2)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-8">
      {leagueId && (
        <Link
          to={`/leagues/${leagueId}`}
          className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-3 text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to League
        </Link>
      )}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{'\uD83C\uDFC8'}</span>
        <h1 className="text-2xl font-display font-bold text-text-primary">NFL Players</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-dark-tertiary/5 border border-stone/30 rounded-lg px-4 py-2 text-text-primary placeholder:text-text-primary/30 focus:border-gold/50 focus:outline-none w-64"
        />

        <div className="flex gap-1 bg-dark-tertiary/5 rounded-lg p-1">
          {POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={`px-3 py-1.5 rounded-md text-sm font-mono font-bold transition-colors ${
                position === pos
                  ? 'bg-gold/20 text-gold'
                  : 'text-text-primary/50 hover:text-text-primary/70'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        <select
          value={scoring}
          onChange={e => setScoring(e.target.value)}
          className="bg-[#1a1917] border border-stone/30 rounded-lg px-3 py-2 text-text-primary text-sm focus:border-gold/50 focus:outline-none"
        >
          {SCORING_TYPES.map(s => (
            <option key={s.value} value={s.value} className="bg-[#1a1917] text-text-primary">{s.label}</option>
          ))}
        </select>

        {availableSeasons.length > 0 && (
          <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="bg-[#1a1917] border border-stone/30 rounded-lg px-3 py-2 text-text-primary text-sm focus:border-gold/50 focus:outline-none"
          >
            {availableSeasons.map(yr => (
              <option key={yr} value={yr} className="bg-[#1a1917] text-text-primary">{yr} Season</option>
            ))}
          </select>
        )}

        <button
          onClick={() => compareMode ? exitCompare() : setCompareMode(true)}
          className={`px-4 py-2 rounded-lg text-sm font-mono font-bold transition-colors border ${
            compareMode
              ? 'bg-gold/20 text-gold border-gold/30'
              : 'bg-dark-tertiary/5 text-text-primary/50 border-stone/30 hover:text-text-primary/70 hover:border-stone/50'
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
      <div className="bg-dark-tertiary/5 backdrop-blur-sm border border-stone/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone/30">
                <th className="text-left px-4 py-3 text-text-primary/50 text-xs font-mono uppercase tracking-wider w-12">#</th>
                <th
                  className="text-left px-4 py-3 text-text-primary/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('name')}
                >
                  Player <SortIcon field="name" />
                </th>
                <th
                  className="text-left px-4 py-3 text-text-primary/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('nflPosition')}
                >
                  POS <SortIcon field="nflPosition" />
                </th>
                <th
                  className="text-left px-4 py-3 text-text-primary/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('nflTeamAbbr')}
                >
                  Team <SortIcon field="nflTeamAbbr" />
                </th>
                <th className="text-center px-4 py-3 text-text-primary/50 text-xs font-mono uppercase tracking-wider">GP</th>
                {statCols.map(col => (
                  <th
                    key={col}
                    className="text-right px-4 py-3 text-text-primary/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-text-primary"
                    onClick={() => handleSort(col)}
                  >
                    {statLabels[col] || col} <SortIcon field={col} />
                  </th>
                ))}
                <th
                  className="text-right px-4 py-3 text-text-primary/50 text-xs font-mono uppercase tracking-wider cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort('fantasyPts')}
                >
                  FPTS <SortIcon field="fantasyPts" />
                </th>
                <th className="text-right px-4 py-3 text-text-primary/50 text-xs font-mono uppercase tracking-wider">AVG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7 + statCols.length} className="text-center py-12 text-text-primary/30">Loading...</td></tr>
              ) : players.length === 0 ? (
                <tr><td colSpan={7 + statCols.length} className="text-center py-12 text-text-primary/30">No players found</td></tr>
              ) : (
                players.map((p, i) => {
                  const selected = isSelected(p.id)
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleRowClick(p)}
                      className={`border-b border-stone/20 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-gold/10 border-l-2 border-l-gold'
                          : 'hover:bg-dark-tertiary/5'
                      }`}
                    >
                      <td className="px-4 py-3 text-text-primary/30 font-mono text-sm">{offset + i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.headshotUrl ? (
                            <img src={p.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-dark-tertiary/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-dark-tertiary/10 flex items-center justify-center text-text-primary/30 text-xs font-bold">
                              {p.nflPosition}
                            </div>
                          )}
                          <span className={`font-medium transition-colors ${selected ? 'text-gold' : 'text-text-primary'}`}>{p.name}</span>
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
                          'text-text-primary/50'
                        }`}>
                          {p.nflPosition}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-primary/70 font-mono text-sm">{p.nflTeamAbbr || '-'}</td>
                      <td className="px-4 py-3 text-center text-text-primary/50 font-mono text-sm">{p.season?.gamesPlayed || 0}</td>
                      {statCols.map(col => {
                        const pos = p.nflPosition
                        const irrelevant = position === 'ALL' && (
                          (['passYards'].includes(col) && !['QB'].includes(pos)) ||
                          (['rushYards'].includes(col) && ['K', 'DST'].includes(pos)) ||
                          (['recYards'].includes(col) && ['QB', 'K', 'DST'].includes(pos))
                        )
                        return (
                          <td key={col} className="px-4 py-3 text-right text-text-primary/70 font-mono text-sm">
                            {irrelevant ? '-' : (p.season?.[col] != null ? p.season[col] : '-')}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-gold">
                        {fmtPts(p.fantasyPts)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-text-primary/50">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone/30">
            <span className="text-text-primary/30 text-sm font-mono">
              {offset + 1}-{Math.min(offset + limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 rounded bg-dark-tertiary/5 text-text-primary/50 hover:bg-dark-tertiary/10 disabled:opacity-30 text-sm"
              >
                Prev
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={!pagination.hasMore}
                className="px-3 py-1 rounded bg-dark-tertiary/5 text-text-primary/50 hover:bg-dark-tertiary/10 disabled:opacity-30 text-sm"
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
