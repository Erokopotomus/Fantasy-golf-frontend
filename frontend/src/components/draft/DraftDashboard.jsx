import { useState, useMemo } from 'react'
import Card from '../common/Card'

const DraftDashboard = ({ picks, teams, players, rosterSize, draft }) => {
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('all')
  const [sortBy, setSortBy] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')

  const userTeamId = draft?.userTeamId

  // Build roster map: teamId -> array of picks (ordered by round)
  const teamRosters = useMemo(() => {
    const rosters = {}
    teams.forEach((team) => {
      rosters[team.id] = Array.from({ length: rosterSize }, (_, i) => {
        return picks.find(p => p.teamId === team.id && p.round === i + 1) || null
      })
    })
    return rosters
  }, [picks, teams, rosterSize])

  // Available (undrafted) players
  const draftedPlayerIds = useMemo(() => new Set(picks.map(p => p.playerId)), [picks])

  const availablePlayers = useMemo(() => {
    let result = players.filter(p => !p.drafted && !draftedPlayerIds.has(p.id))

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.country?.toLowerCase().includes(q)
      )
    }

    if (posFilter !== 'all') {
      result = result.filter(p => p.position === posFilter || p.tour === posFilter)
    }

    result.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'name':
          aVal = a.name; bVal = b.name
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
        case 'sgTotal':
          aVal = a.stats?.sgTotal || 0; bVal = b.stats?.sgTotal || 0
          break
        default:
          aVal = a.rank || 999; bVal = b.rank || 999
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [players, draftedPlayerIds, search, posFilter, sortBy, sortDir])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const SortBtn = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
        sortBy === field ? 'text-gold' : 'text-text-muted hover:text-white'
      }`}
    >
      {children}
      {sortBy === field && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
      )}
    </button>
  )

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      {/* Left Panel - Team Rosters */}
      <div className="xl:col-span-3">
        <Card padding="sm">
          <h3 className="text-lg font-semibold font-display text-white mb-3">Team Rosters</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-3" style={{ minWidth: teams.length > 4 ? `${teams.length * 160}px` : 'auto' }}>
              {teams.map((team) => {
                const roster = teamRosters[team.id] || []
                const pickCount = roster.filter(Boolean).length
                const isUser = team.id === userTeamId

                return (
                  <div
                    key={team.id}
                    className={`flex-shrink-0 rounded-lg border ${
                      isUser ? 'border-gold/50 bg-gold/5' : 'border-dark-border bg-dark-tertiary/50'
                    }`}
                    style={{ minWidth: '148px', maxWidth: '180px', flex: '1 1 0' }}
                  >
                    {/* Team Header */}
                    <div className={`px-3 py-2 border-b ${
                      isUser ? 'border-gold/30' : 'border-dark-border'
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold truncate ${
                          isUser ? 'text-gold' : 'text-white'
                        }`}>
                          {team.name}
                        </p>
                        {isUser && (
                          <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-medium">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-xs">{pickCount}/{rosterSize} picks</p>
                    </div>

                    {/* Roster Slots */}
                    <div className="p-2 space-y-1">
                      {roster.map((pick, idx) => (
                        <div
                          key={idx}
                          className={`rounded px-2 py-1.5 text-xs ${
                            pick
                              ? 'bg-dark-primary/60'
                              : 'border border-dashed border-dark-border/60 bg-transparent'
                          }`}
                        >
                          {pick ? (
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-white font-medium truncate">{pick.playerName}</span>
                              <span className="text-text-muted flex-shrink-0">#{pick.playerRank}</span>
                            </div>
                          ) : (
                            <span className="text-text-muted/50">Round {idx + 1}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel - Available Players */}
      <div className="xl:col-span-2">
        <Card padding="sm" className="flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold font-display text-white">Available</h3>
            <span className="text-text-muted text-xs">
              {availablePlayers.length} remaining
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <svg className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-tertiary border border-dark-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {/* Filter Row */}
          <div className="flex gap-2 mb-3">
            {['all', 'PGA', 'LIV', 'DP'].map((f) => (
              <button
                key={f}
                onClick={() => setPosFilter(f)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  posFilter === f
                    ? 'bg-gold/20 text-gold'
                    : 'bg-dark-tertiary text-text-muted hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-secondary">
                <tr className="text-xs border-b border-dark-border">
                  <th className="pb-2 pr-2 text-left"><SortBtn field="rank">Rank</SortBtn></th>
                  <th className="pb-2 pr-2 text-left"><SortBtn field="name">Player</SortBtn></th>
                  <th className="pb-2 text-right"><SortBtn field="sgTotal">SG Total</SortBtn></th>
                </tr>
              </thead>
              <tbody>
                {availablePlayers.map((player) => (
                  <tr key={player.id} className="border-b border-dark-border/30 hover:bg-dark-tertiary/50 transition-colors">
                    <td className="py-1.5 pr-2 text-text-muted text-xs">#{player.rank}</td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{player.countryFlag}</span>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate">{player.name}</p>
                          <p className="text-text-muted text-[10px]">{player.country}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 text-right">
                      <span className={`text-xs font-medium ${
                        (player.stats?.sgTotal || 0) > 1 ? 'text-gold' : 'text-white'
                      }`}>
                        {player.stats?.sgTotal?.toFixed(2) || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {availablePlayers.length === 0 && (
              <div className="text-center py-6 text-text-muted text-sm">
                No players found
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default DraftDashboard
