import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import api from '../services/api'
import PlayerDrawer from '../components/players/PlayerDrawer'

// ── Country flag helper ─────────────────────────────────────────────────────
const FLAGS = {
  'United States': '🇺🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Northern Ireland': '🇬🇧', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Ireland': '🇮🇪',
  'Australia': '🇦🇺', 'Canada': '🇨🇦', 'South Africa': '🇿🇦',
  'Japan': '🇯🇵', 'Korea': '🇰🇷', 'Korea - Republic of': '🇰🇷', 'South Korea': '🇰🇷',
  'Spain': '🇪🇸', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Italy': '🇮🇹',
  'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮',
  'Belgium': '🇧🇪', 'Netherlands': '🇳🇱', 'Austria': '🇦🇹',
  'Argentina': '🇦🇷', 'Mexico': '🇲🇽', 'Colombia': '🇨🇴', 'Chile': '🇨🇱',
  'Thailand': '🇹🇭', 'China': '🇨🇳', 'Chinese Taipei': '🇹🇼',
  'India': '🇮🇳', 'New Zealand': '🇳🇿', 'Brazil': '🇧🇷', 'Portugal': '🇵🇹',
  'Switzerland': '🇨🇭', 'Poland': '🇵🇱', 'Zimbabwe': '🇿🇼',
  'USA': '🇺🇸', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'AUS': '🇦🇺', 'CAN': '🇨🇦', 'RSA': '🇿🇦',
  'JPN': '🇯🇵', 'KOR': '🇰🇷', 'ESP': '🇪🇸', 'FRA': '🇫🇷', 'GER': '🇩🇪',
  'ITA': '🇮🇹', 'SWE': '🇸🇪', 'IRL': '🇮🇪', 'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
}
const flag = (c) => FLAGS[c] || '🏳️'

// ── Tour badge ──────────────────────────────────────────────────────────────
const TourBadge = ({ tour }) => {
  if (!tour) return null
  const colors = {
    PGA: 'bg-blue-500/15 text-blue-400 border-blue-400/20',
    LIV: 'bg-red-500/15 text-red-400 border-red-400/20',
    DP: 'bg-sky-500/15 text-sky-400 border-sky-400/20',
  }
  const key = tour.toUpperCase().startsWith('LIV') ? 'LIV' : tour.toUpperCase().startsWith('DP') ? 'DP' : 'PGA'
  return (
    <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded border ${colors[key] || colors.PGA}`}>
      {key}
    </span>
  )
}

// ── Sortable header ─────────────────────────────────────────────────────────
const SortHeader = ({ field, sortBy, sortDir, onSort, children, tip, align = 'center' }) => {
  const [showTip, setShowTip] = useState(false)
  const timerRef = useRef(null)
  return (
    <th
      className="p-2.5 relative whitespace-nowrap"
      onMouseEnter={() => { if (tip) timerRef.current = setTimeout(() => setShowTip(true), 400) }}
      onMouseLeave={() => { clearTimeout(timerRef.current); setShowTip(false) }}
    >
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 hover:text-text-primary transition-colors ${align === 'left' ? '' : 'mx-auto'} ${
          sortBy === field ? 'text-gold' : 'text-text-muted'
        }`}
      >
        <span className={tip ? 'border-b border-dotted border-current' : ''}>{children}</span>
        {sortBy === field && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        )}
      </button>
      {showTip && tip && (
        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 w-52 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--card-border)] shadow-xl text-left normal-case tracking-normal pointer-events-none">
          <p className="text-[11px] text-text-primary font-semibold mb-0.5 leading-tight">{children}</p>
          <p className="text-[10px] text-text-muted font-normal leading-snug">{tip}</p>
        </div>
      )}
    </th>
  )
}

// ── SG color helper ─────────────────────────────────────────────────────────
const sgColor = (val) => {
  if (val == null) return 'text-text-muted'
  if (val >= 1.5) return 'text-emerald-400 font-bold'
  if (val >= 0.5) return 'text-emerald-400'
  if (val >= 0) return 'text-text-primary'
  if (val >= -0.5) return 'text-orange-400'
  return 'text-red-400'
}

const sgFmt = (val) => val != null ? (val >= 0 ? '+' : '') + val.toFixed(2) : '—'

// ── Recent form chips ───────────────────────────────────────────────────────
const FormChips = ({ form = [] }) => {
  if (!form.length) return <span className="text-text-muted/40 text-xs">—</span>
  return (
    <div className="flex gap-1 items-center justify-center">
      {form.slice(0, 5).map((f, i) => {
        const isCut = f === 'CUT' || f === 'WD'
        const isWin = f === '1' || f === '1st'
        const isTop5 = !isCut && !isWin && parseInt(f.replace('T', '')) <= 5
        const isTop10 = !isCut && !isWin && !isTop5 && parseInt(f.replace('T', '')) <= 10
        return (
          <span
            key={i}
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              isCut ? 'bg-red-500/10 text-red-400' :
              isWin ? 'bg-gold/20 text-gold font-bold' :
              isTop5 ? 'bg-emerald-500/15 text-emerald-400' :
              isTop10 ? 'bg-sky-500/10 text-sky-400' :
              'bg-[var(--stone)] text-text-muted'
            }`}
          >
            {f}
          </span>
        )
      })}
    </div>
  )
}

// ── Player cell (headshot, name, flag, tour) ────────────────────────────────
const PlayerCell = ({ player, onClick }) => (
  <td className="p-2.5">
    <button onClick={() => onClick(player)} className="flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity group">
      {player.headshotUrl ? (
        <img src={player.headshotUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-[var(--stone)]" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[var(--stone)] flex items-center justify-center text-text-muted text-xs font-mono">
          {player.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-text-primary group-hover:text-emerald-400 transition-colors truncate">
            {player.name}
          </span>
          <span className="text-xs">{player.countryFlag || flag(player.country)}</span>
          <TourBadge tour={player.primaryTour} />
        </div>
      </div>
    </button>
  </td>
)

// ── View configurations ─────────────────────────────────────────────────────
const VIEWS = {
  rankings: {
    label: 'Rankings',
    defaultSort: 'owgrRank',
    defaultDir: 'asc',
  },
  sg: {
    label: 'Strokes Gained',
    defaultSort: 'sgTotal',
    defaultDir: 'desc',
  },
  stats: {
    label: 'Season Stats',
    defaultSort: 'wins',
    defaultDir: 'desc',
  },
}

const TOUR_FILTERS = [
  { key: '', label: 'All' },
  { key: 'PGA', label: 'PGA' },
  { key: 'LIV', label: 'LIV' },
  { key: 'DP World', label: 'DP World' },
]

const PER_PAGE = 50

// ═══════════════════════════════════════════════════════════════════════════
// ── SeasonRace Component ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const SeasonRace = () => {
  // Data
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [view, setView] = useState('rankings')
  const [sortKey, setSortKey] = useState('owgrRank')
  const [sortDir, setSortDir] = useState('asc')
  const [search, setSearch] = useState('')
  const [tourFilter, setTourFilter] = useState('')
  const [page, setPage] = useState(1)
  const [drawerPlayerId, setDrawerPlayerId] = useState(null)

  // Fetch all players once
  useEffect(() => {
    setLoading(true)
    api.getPlayers({ limit: 500 })
      .then(data => {
        const list = data.players || data || []
        setAllPlayers(list.map(p => ({
          ...p,
          countryFlag: p.countryFlag || flag(p.country),
        })))
      })
      .catch(() => setAllPlayers([]))
      .finally(() => setLoading(false))
  }, [])

  // When view changes, reset sort to default for that view
  const handleViewChange = useCallback((v) => {
    setView(v)
    setSortKey(VIEWS[v].defaultSort)
    setSortDir(VIEWS[v].defaultDir)
    setPage(1)
  }, [])

  // Sort handler
  const handleSort = useCallback((field) => {
    setSortKey(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return field
      }
      // Default direction depends on field: ranks asc, stats desc
      const defaultDesc = ['sgTotal', 'sgOffTee', 'sgApproach', 'sgAroundGreen', 'sgPutting', 'sgTeeToGreen',
        'wins', 'top5s', 'top10s', 'top25s', 'events', 'cutsMade']
      setSortDir(defaultDesc.includes(field) ? 'desc' : 'asc')
      return field
    })
    setPage(1)
  }, [])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...allPlayers]

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name?.toLowerCase().includes(q))
    }

    // Tour filter
    if (tourFilter) {
      result = result.filter(p => {
        const t = (p.primaryTour || '').toUpperCase()
        const f = tourFilter.toUpperCase()
        if (f === 'LIV') return t.includes('LIV')
        if (f === 'DP WORLD') return t.includes('DP') || t.includes('EUROPEAN')
        return t.includes('PGA') || t === '' || !t.includes('LIV')
      })
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal
      switch (sortKey) {
        case 'name':
          aVal = a.name || ''; bVal = b.name || ''
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
        case 'owgrRank':
          aVal = a.owgrRank || 9999; bVal = b.owgrRank || 9999; break
        case 'sgTotal': aVal = a.sgTotal ?? -99; bVal = b.sgTotal ?? -99; break
        case 'sgOffTee': aVal = a.sgOffTee ?? -99; bVal = b.sgOffTee ?? -99; break
        case 'sgApproach': aVal = a.sgApproach ?? -99; bVal = b.sgApproach ?? -99; break
        case 'sgAroundGreen': aVal = a.sgAroundGreen ?? -99; bVal = b.sgAroundGreen ?? -99; break
        case 'sgPutting': aVal = a.sgPutting ?? -99; bVal = b.sgPutting ?? -99; break
        case 'sgTeeToGreen': aVal = a.sgTeeToGreen ?? -99; bVal = b.sgTeeToGreen ?? -99; break
        case 'wins': aVal = a.wins || 0; bVal = b.wins || 0; break
        case 'top5s': aVal = a.top5s || 0; bVal = b.top5s || 0; break
        case 'top10s': aVal = a.top10s || 0; bVal = b.top10s || 0; break
        case 'top25s': aVal = a.top25s || 0; bVal = b.top25s || 0; break
        case 'events': aVal = a.events || 0; bVal = b.events || 0; break
        case 'cutsMade': aVal = a.cutsMade || 0; bVal = b.cutsMade || 0; break
        case 'scoringAvg': aVal = a.scoringAvg || 99; bVal = b.scoringAvg || 99; break
        default: aVal = a.owgrRank || 9999; bVal = b.owgrRank || 9999
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [allPlayers, search, tourFilter, sortKey, sortDir])

  // Pagination
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const top5 = filtered.slice(0, 5)

  // Stat accessor for the top-5 card subtitle
  const topStatLabel = (player) => {
    switch (view) {
      case 'sg': return `SG Total: ${sgFmt(player.sgTotal)}`
      case 'stats': {
        const w = player.wins || 0
        const t10 = player.top10s || 0
        return `${w}W - ${t10} Top 10s`
      }
      default: return `OWGR #${player.owgrRank || '—'}`
    }
  }

  // Ball striking = SG OTT + SG APP
  const ballStriking = (p) => {
    if (p.sgOffTee == null && p.sgApproach == null) return null
    return (p.sgOffTee || 0) + (p.sgApproach || 0)
  }

  // Cut percentage
  const cutPct = (p) => {
    if (!p.events) return null
    return ((p.cutsMade || 0) / p.events * 100)
  }

  return (
    <div className="min-h-screen">
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-text-primary tracking-tight">
                2026 Season Race
              </h1>
            </div>
            <p className="text-text-secondary text-sm max-w-xl ml-[52px]">
              Season standings, form, and Strokes Gained across the PGA Tour
            </p>
          </div>

          {/* ── View Tabs ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 mb-4">
            {Object.entries(VIEWS).map(([key, v]) => (
              <button
                key={key}
                onClick={() => handleViewChange(key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  view === key
                    ? 'bg-gold/15 text-gold border border-gold/30'
                    : 'bg-[var(--surface)] text-text-muted border border-[var(--card-border)] hover:text-text-primary hover:border-[var(--card-border)]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* ── Search + Tour Filters ────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search players..."
                className="w-full pl-10 pr-4 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <div className="flex gap-1.5">
              {TOUR_FILTERS.map(tf => (
                <button
                  key={tf.key}
                  onClick={() => { setTourFilter(tf.key); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tourFilter === tf.key
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[var(--surface)] text-text-muted border border-[var(--card-border)] hover:text-text-primary'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Top 5 Highlight Cards ─────────────────────────────────── */}
              {top5.length > 0 && !search && (
                <div className="grid grid-cols-5 gap-2 mb-5">
                  {top5.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setDrawerPlayerId(p.id)}
                      className={`relative bg-[var(--surface)] border rounded-xl p-3 text-center hover:bg-[var(--surface-alt)] transition-all group ${
                        i === 0 ? 'border-gold/40 shadow-[0_0_12px_rgba(212,147,13,0.08)]' : 'border-[var(--card-border)]'
                      }`}
                    >
                      <div className={`absolute top-2 left-2 text-[10px] font-mono font-bold ${i === 0 ? 'text-gold' : 'text-text-muted'}`}>
                        #{i + 1}
                      </div>
                      {p.headshotUrl ? (
                        <img src={p.headshotUrl} alt="" className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 bg-[var(--stone)]" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[var(--stone)] flex items-center justify-center mx-auto mb-1.5 text-text-muted text-sm font-mono">
                          {p.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      )}
                      <p className="text-xs font-semibold text-text-primary group-hover:text-emerald-400 transition-colors truncate">
                        {p.name?.split(' ').pop()}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted mt-0.5">
                        {topStatLabel(p)}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Table ──────────────────────────────────────────────────── */}
              <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-xl shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-[var(--surface)] sticky top-0 z-10">
                      <tr className="border-b border-[var(--card-border)] text-xs">
                        <th className="p-2.5 w-12 text-text-muted text-center">#</th>
                        <SortHeader field="name" sortBy={sortKey} sortDir={sortDir} onSort={handleSort} align="left">
                          Player
                        </SortHeader>

                        {/* ── Rankings View Columns ── */}
                        {view === 'rankings' && (
                          <>
                            <SortHeader field="owgrRank" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Official World Golf Ranking — updated weekly based on tournament results over a rolling 2-year window.">
                              OWGR
                            </SortHeader>
                            <SortHeader field="sgTotal" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Total Strokes Gained per round vs. the PGA Tour field average.">
                              SG Total
                            </SortHeader>
                            <th className="p-2.5 text-text-muted text-center whitespace-nowrap">
                              <span className="border-b border-dotted border-text-muted" title="Season Wins - Top 10s - Events played">W-T10-Ev</span>
                            </th>
                            <th className="p-2.5 text-text-muted text-center">Form</th>
                            <SortHeader field="scoringAvg" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Season scoring average — lower is better.">
                              Avg
                            </SortHeader>
                          </>
                        )}

                        {/* ── Strokes Gained View Columns ── */}
                        {view === 'sg' && (
                          <>
                            <SortHeader field="sgTotal" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Total Strokes Gained per round vs. the PGA Tour field average. The single best measure of overall skill.">
                              SG Total
                            </SortHeader>
                            <SortHeader field="sgOffTee" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Strokes Gained Off the Tee — measures driving performance (distance + accuracy) vs. the field.">
                              OTT
                            </SortHeader>
                            <SortHeader field="sgApproach" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Strokes Gained on Approach — measures iron play and shots into the green from the fairway.">
                              APP
                            </SortHeader>
                            <SortHeader field="sgAroundGreen" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Strokes Gained Around the Green — measures chipping, pitching, and bunker play.">
                              ATG
                            </SortHeader>
                            <SortHeader field="sgPutting" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Strokes Gained Putting — measures putting performance on the greens vs. the field.">
                              Putt
                            </SortHeader>
                            <SortHeader field="sgTeeToGreen" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Strokes Gained Tee to Green — everything except putting. OTT + APP + ATG combined.">
                              T2G
                            </SortHeader>
                            <th className="p-2.5 text-text-muted text-center whitespace-nowrap">
                              <span className="border-b border-dotted border-text-muted" title="Ball Striking = OTT + APP. Measures driving + iron play combined.">Ball Striking</span>
                            </th>
                          </>
                        )}

                        {/* ── Season Stats View Columns ── */}
                        {view === 'stats' && (
                          <>
                            <SortHeader field="events" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Number of tournaments entered this season.">
                              Events
                            </SortHeader>
                            <SortHeader field="wins" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Tournament victories this season.">
                              Wins
                            </SortHeader>
                            <SortHeader field="top5s" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Top 5 finishes this season.">
                              Top 5s
                            </SortHeader>
                            <SortHeader field="top10s" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Top 10 finishes this season.">
                              Top 10s
                            </SortHeader>
                            <SortHeader field="top25s" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Top 25 finishes this season.">
                              Top 25s
                            </SortHeader>
                            <SortHeader field="cutsMade" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Number of cuts made this season.">
                              Cuts
                            </SortHeader>
                            <th className="p-2.5 text-text-muted text-center whitespace-nowrap">
                              <span className="border-b border-dotted border-text-muted" title="Cut percentage = Cuts Made / Events">Cut %</span>
                            </th>
                            <SortHeader field="scoringAvg" sortBy={sortKey} sortDir={sortDir} onSort={handleSort}
                              tip="Season scoring average — lower is better.">
                              Avg
                            </SortHeader>
                          </>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={20} className="p-8 text-center text-text-muted text-sm">
                            No players found{search ? ` matching "${search}"` : ''}
                          </td>
                        </tr>
                      ) : paginated.map((p, idx) => {
                        const rank = (page - 1) * PER_PAGE + idx + 1
                        return (
                          <tr
                            key={p.id}
                            onClick={() => setDrawerPlayerId(p.id)}
                            className="border-b border-[var(--card-border)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                          >
                            <td className="p-2.5 text-center text-text-muted font-mono text-sm">{rank}</td>
                            <PlayerCell player={p} onClick={(pl) => setDrawerPlayerId(pl.id)} />

                            {/* ── Rankings View Data ── */}
                            {view === 'rankings' && (
                              <>
                                <td className="p-2.5 text-center text-sm font-mono text-text-primary">
                                  {p.owgrRank || '—'}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${sgColor(p.sgTotal)}`}>
                                  {sgFmt(p.sgTotal)}
                                </td>
                                <td className="p-2.5 text-center text-sm font-mono text-text-primary">
                                  {p.wins || 0}-{p.top10s || 0}-{p.events || 0}
                                </td>
                                <td className="p-2.5">
                                  <FormChips form={p.recentForm} />
                                </td>
                                <td className="p-2.5 text-center text-sm font-mono text-text-muted">
                                  {p.scoringAvg ? p.scoringAvg.toFixed(1) : '—'}
                                </td>
                              </>
                            )}

                            {/* ── Strokes Gained View Data ── */}
                            {view === 'sg' && (
                              <>
                                <td className={`p-2.5 text-center text-sm font-mono ${sgColor(p.sgTotal)}`}>
                                  {sgFmt(p.sgTotal)}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${sgColor(p.sgOffTee)}`}>
                                  {sgFmt(p.sgOffTee)}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${sgColor(p.sgApproach)}`}>
                                  {sgFmt(p.sgApproach)}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${sgColor(p.sgAroundGreen)}`}>
                                  {sgFmt(p.sgAroundGreen)}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${sgColor(p.sgPutting)}`}>
                                  {sgFmt(p.sgPutting)}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${sgColor(p.sgTeeToGreen)}`}>
                                  {sgFmt(p.sgTeeToGreen)}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${sgColor(ballStriking(p))}`}>
                                  {ballStriking(p) != null ? sgFmt(ballStriking(p)) : '—'}
                                </td>
                              </>
                            )}

                            {/* ── Season Stats View Data ── */}
                            {view === 'stats' && (
                              <>
                                <td className="p-2.5 text-center text-sm font-mono text-text-primary">
                                  {p.events || 0}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${p.wins ? 'text-gold font-bold' : 'text-text-muted'}`}>
                                  {p.wins || 0}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${p.top5s ? 'text-emerald-400' : 'text-text-muted'}`}>
                                  {p.top5s || 0}
                                </td>
                                <td className={`p-2.5 text-center text-sm font-mono ${p.top10s ? 'text-sky-400' : 'text-text-muted'}`}>
                                  {p.top10s || 0}
                                </td>
                                <td className="p-2.5 text-center text-sm font-mono text-text-primary">
                                  {p.top25s || 0}
                                </td>
                                <td className="p-2.5 text-center text-sm font-mono text-text-primary">
                                  {p.cutsMade || 0}
                                </td>
                                <td className="p-2.5 text-center text-sm font-mono text-text-muted">
                                  {cutPct(p) != null ? `${cutPct(p).toFixed(0)}%` : '—'}
                                </td>
                                <td className="p-2.5 text-center text-sm font-mono text-text-muted">
                                  {p.scoringAvg ? p.scoringAvg.toFixed(1) : '—'}
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination ──────────────────────────────────────────── */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
                    <p className="text-text-muted text-xs font-mono">
                      {filtered.length} players — Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface)] border border-[var(--card-border)] text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface)] border border-[var(--card-border)] text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Player Drawer ──────────────────────────────────────────────── */}
      <PlayerDrawer
        playerId={drawerPlayerId}
        isOpen={!!drawerPlayerId}
        onClose={() => setDrawerPlayerId(null)}
      />
    </div>
  )
}

export default SeasonRace
