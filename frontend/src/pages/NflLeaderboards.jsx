import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'

const CATEGORIES = [
  { key: 'fantasy', label: 'Fantasy', stats: [
    { value: 'fantasy_half', label: 'Half PPR' },
    { value: 'fantasy_ppr', label: 'PPR' },
    { value: 'fantasy_std', label: 'Standard' },
  ]},
  { key: 'passing', label: 'Passing', stats: [
    { value: 'pass_yards', label: 'Yards' },
    { value: 'pass_tds', label: 'TDs' },
    { value: 'completions', label: 'Completions' },
    { value: 'comp_pct', label: 'Comp %' },
    { value: 'interceptions', label: 'INTs' },
  ]},
  { key: 'rushing', label: 'Rushing', stats: [
    { value: 'rush_yards', label: 'Yards' },
    { value: 'rush_tds', label: 'TDs' },
    { value: 'rush_attempts', label: 'Attempts' },
  ]},
  { key: 'receiving', label: 'Receiving', stats: [
    { value: 'rec_yards', label: 'Yards' },
    { value: 'rec_tds', label: 'TDs' },
    { value: 'receptions', label: 'Receptions' },
    { value: 'targets', label: 'Targets' },
    { value: 'target_share', label: 'Target Share' },
  ]},
  { key: 'advanced', label: 'Advanced', stats: [
    { value: 'epa', label: 'EPA' },
    { value: 'snap_pct', label: 'Snap %' },
  ]},
  { key: 'defense', label: 'Defense', stats: [
    { value: 'def_sacks', label: 'Sacks' },
    { value: 'def_ints', label: 'INTs' },
    { value: 'tackles', label: 'Tackles' },
    { value: 'def_tds', label: 'Def TDs' },
  ]},
]

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K']

const NFL_TEAMS = [
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB',
  'HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG',
  'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'
]

// Position-relevant columns based on selected stat category
function getColumns(stat) {
  if (stat.startsWith('pass') || stat === 'completions' || stat === 'comp_pct' || stat === 'interceptions') {
    return [
      { key: 'passYards', label: 'Pass Yds' },
      { key: 'passTds', label: 'Pass TD' },
    ]
  }
  if (stat.startsWith('rush')) {
    return [
      { key: 'rushYards', label: 'Rush Yds' },
      { key: 'rushTds', label: 'Rush TD' },
    ]
  }
  if (stat.startsWith('rec') || stat === 'receptions' || stat === 'targets' || stat === 'target_share') {
    return [
      { key: 'receptions', label: 'Rec' },
      { key: 'recYards', label: 'Rec Yds' },
      { key: 'recTds', label: 'Rec TD' },
    ]
  }
  // Fantasy or default — show key stats
  return [
    { key: 'passYards', label: 'Pass Yds' },
    { key: 'rushYards', label: 'Rush Yds' },
    { key: 'receptions', label: 'Rec' },
    { key: 'recYards', label: 'Rec Yds' },
  ]
}

export default function NflLeaderboards() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])

  const activeCat = searchParams.get('cat') || 'fantasy'
  const activeStat = searchParams.get('stat') || 'fantasy_half'
  const season = searchParams.get('season') || '2024'
  const position = searchParams.get('position') || ''
  const team = searchParams.get('team') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 50

  // Load teams for filter dropdown
  useEffect(() => {
    api.getNflTeams().then(d => setTeams(d.teams || [])).catch(() => {})
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const result = await api.getNflLeaderboards({
          stat: activeStat,
          season,
          position: position && position !== 'ALL' ? position : undefined,
          team: team || undefined,
          limit,
          offset: (page - 1) * limit,
        })
        setData(result)
      } catch (err) {
        console.error('Failed to load leaderboards:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeStat, season, position, team, page])

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== 'page') params.delete('page')
    setSearchParams(params)
  }

  const selectCategory = (catKey) => {
    const cat = CATEGORIES.find(c => c.key === catKey)
    const params = new URLSearchParams(searchParams)
    params.set('cat', catKey)
    params.set('stat', cat.stats[0].value)
    params.delete('page')
    setSearchParams(params)
  }

  const currentCat = CATEGORIES.find(c => c.key === activeCat) || CATEGORIES[0]
  const columns = getColumns(activeStat)
  const totalPages = data ? Math.ceil(data.total / limit) : 1

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-text-primary mb-1">NFL Stat Leaderboards</h1>
        <p className="text-text-primary/40 text-sm">Season leaders across every category</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 bg-[var(--bg-alt)] rounded-lg p-1 mb-4 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => selectCategory(cat.key)}
            className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-colors ${
              activeCat === cat.key ? 'bg-gold/20 text-gold' : 'text-text-primary/40 hover:text-text-primary/60'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sub-stat pills + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Stat pills */}
        <div className="flex gap-1 flex-wrap">
          {currentCat.stats.map(s => (
            <button
              key={s.value}
              onClick={() => updateParam('stat', s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-colors ${
                activeStat === s.value ? 'bg-gold text-slate' : 'bg-[var(--bg-alt)] text-text-primary/40 hover:text-text-primary/60'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[var(--stone)] hidden sm:block" />

        {/* Position filter */}
        <select
          value={position || 'ALL'}
          onChange={e => updateParam('position', e.target.value === 'ALL' ? '' : e.target.value)}
          className="bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-sm text-text-primary font-mono appearance-none cursor-pointer"
        >
          {POSITIONS.map(p => (
            <option key={p} value={p} className="bg-[var(--surface)]">{p === 'ALL' ? 'All Positions' : p}</option>
          ))}
        </select>

        {/* Team filter */}
        <select
          value={team}
          onChange={e => updateParam('team', e.target.value)}
          className="bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-sm text-text-primary font-mono appearance-none cursor-pointer"
        >
          <option value="" className="bg-[var(--surface)]">All Teams</option>
          {NFL_TEAMS.map(t => (
            <option key={t} value={t} className="bg-[var(--surface)]">{t}</option>
          ))}
        </select>

        {/* Season filter */}
        <select
          value={season}
          onChange={e => updateParam('season', e.target.value)}
          className="bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-sm text-text-primary font-mono appearance-none cursor-pointer"
        >
          {[2024, 2023, 2022, 2021, 2020].map(s => (
            <option key={s} value={s} className="bg-[var(--surface)]">{s}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      {data && !loading && (
        <div className="text-text-primary/30 text-xs font-mono mb-3">
          {data.total} players | {data.statLabel} | {data.season} season
        </div>
      )}

      {/* Leaderboard table */}
      <div className="bg-[var(--surface)] shadow-card border border-[var(--card-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-center px-3 py-3 text-text-primary/40 text-xs font-mono uppercase w-12">#</th>
                <th className="text-left px-3 py-3 text-text-primary/40 text-xs font-mono uppercase">Player</th>
                <th className="text-center px-3 py-3 text-text-primary/40 text-xs font-mono uppercase w-16">Pos</th>
                <th className="text-center px-3 py-3 text-text-primary/40 text-xs font-mono uppercase w-16 hidden sm:table-cell">Team</th>
                <th className="text-center px-3 py-3 text-text-primary/40 text-xs font-mono uppercase w-12">GP</th>
                {columns.map(c => (
                  <th key={c.key} className="text-right px-3 py-3 text-text-primary/40 text-xs font-mono uppercase hidden md:table-cell">{c.label}</th>
                ))}
                <th className="text-right px-3 py-3 text-gold text-xs font-mono uppercase font-bold">{data?.statLabel || 'Value'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6 + columns.length} className="text-center py-12 text-text-primary/20">Loading...</td></tr>
              ) : data?.players?.length === 0 ? (
                <tr><td colSpan={6 + columns.length} className="text-center py-12 text-text-primary/20">No data for these filters</td></tr>
              ) : data?.players?.map(p => (
                <tr key={p.id} className="border-b border-[var(--card-border)] hover:bg-[var(--surface-alt)] transition-colors">
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-mono text-sm font-bold ${
                      p.rank === 1 ? 'text-yellow-400' : p.rank === 2 ? 'text-gray-300' : p.rank === 3 ? 'text-amber-600' : 'text-text-primary/30'
                    }`}>{p.rank}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={`/nfl/players/${p.id}`} className="flex items-center gap-2 hover:text-gold group">
                      {p.headshotUrl ? (
                        <img src={p.headshotUrl} alt="" className="w-7 h-7 rounded-full object-cover bg-[var(--stone)] flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[var(--stone)] flex-shrink-0" />
                      )}
                      <span className="text-text-primary text-sm font-medium group-hover:text-gold truncate">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-center text-text-primary/40 text-xs font-mono">{p.position}</td>
                  <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                    <Link to={`/nfl/teams/${p.teamAbbr}`} className="text-text-primary/40 text-xs font-mono hover:text-gold">{p.teamAbbr}</Link>
                  </td>
                  <td className="px-3 py-2.5 text-center text-text-primary/40 text-sm font-mono">{p.games}</td>
                  {columns.map(c => (
                    <td key={c.key} className="px-3 py-2.5 text-right text-text-primary/50 text-sm font-mono hidden md:table-cell">
                      {(p[c.key] || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right text-gold font-mono font-bold text-sm">
                    {typeof p.statValue === 'number' ? p.statValue.toLocaleString() : p.statValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => updateParam('page', String(page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-sm font-mono bg-[var(--bg-alt)] text-text-primary/40 hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="text-text-primary/40 text-sm font-mono">Page {page} of {totalPages}</span>
          <button
            onClick={() => updateParam('page', String(page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-sm font-mono bg-[var(--bg-alt)] text-text-primary/40 hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      <p className="text-center text-text-primary/20 text-xs font-mono mt-6">Data via nflverse</p>
    </div>
  )
}
