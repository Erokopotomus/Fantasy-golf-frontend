import { useState, useMemo } from 'react'

// ── Helpers ────────────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr.length) return null
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function sgColor(val) {
  if (val == null) return 'text-text-primary/20'
  if (val > 0.3) return 'text-emerald-400'
  if (val > 0) return 'text-emerald-400/60'
  if (val > -0.3) return 'text-red-400/60'
  return 'text-red-400'
}

function StatBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((Math.abs(value || 0) / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-primary/40 w-8 text-right shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--bg-alt)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-mono w-10 text-right ${sgColor(value)}`}>
        {value != null ? `${value > 0 ? '+' : ''}${value.toFixed(2)}` : '\u2014'}
      </span>
    </div>
  )
}

function CompareBar({ label, players, statKey, higherIsBetter = true }) {
  const values = players.map(p => p.player?.[statKey] ?? null)
  const validValues = values.filter(v => v != null)
  if (validValues.length === 0) return null

  const best = higherIsBetter ? Math.max(...validValues) : Math.min(...validValues)
  const maxAbs = Math.max(...validValues.map(Math.abs), 0.1)

  return (
    <div className="space-y-0.5">
      <span className="text-[9px] text-text-primary/30 uppercase tracking-wider">{label}</span>
      {players.map((p, i) => {
        const val = values[i]
        const isBest = val != null && val === best && validValues.length > 1
        const pct = val != null ? Math.min((Math.abs(val) / maxAbs) * 100, 100) : 0
        const isPositive = val != null && val > 0
        return (
          <div key={p.playerId} className="flex items-center gap-1.5">
            <span className={`text-[9px] w-20 truncate ${isBest ? 'text-gold font-semibold' : 'text-text-primary/40'}`}>
              {p.player?.name?.split(' ').pop() || '?'}
            </span>
            <div className="flex-1 h-1.5 bg-[var(--bg-alt)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isBest ? 'bg-gold' : isPositive ? 'bg-emerald-500/40' : 'bg-red-500/40'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-[9px] font-mono w-9 text-right ${isBest ? 'text-gold' : sgColor(val)}`}>
              {val != null ? `${val > 0 ? '+' : ''}${val.toFixed(1)}` : '\u2014'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function BoardInsightsPanel({ entries, sport, onClickPlayer }) {
  const [compareIds, setCompareIds] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const isGolf = sport === 'golf'

  // ── Board Summary Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const tags = { target: 0, sleeper: 0, avoid: 0, untagged: 0 }
    const sgFields = { sgTotal: [], sgOffTee: [], sgApproach: [], sgPutting: [], sgAroundGreen: [] }

    for (const e of entries) {
      const t = e.tags || []
      if (t.includes('target')) tags.target++
      else if (t.includes('sleeper')) tags.sleeper++
      else if (t.includes('avoid')) tags.avoid++
      else tags.untagged++

      if (isGolf) {
        for (const key of Object.keys(sgFields)) {
          if (e.player?.[key] != null) sgFields[key].push(e.player[key])
        }
      }
    }

    // Top risers/fallers
    const risers = []
    const fallers = []
    for (const e of entries) {
      if (e.baselineRank == null) continue
      const idx = entries.indexOf(e)
      const delta = e.baselineRank - (idx + 1)
      if (delta >= 3) risers.push({ name: e.player?.name, delta, rank: idx + 1 })
      if (delta <= -3) fallers.push({ name: e.player?.name, delta, rank: idx + 1 })
    }
    risers.sort((a, b) => b.delta - a.delta)
    fallers.sort((a, b) => a.delta - b.delta)

    // Tier averages
    const tierMap = {}
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      const tier = e.tier ?? 1
      if (!tierMap[tier]) tierMap[tier] = { sgTotals: [], count: 0, names: [] }
      tierMap[tier].count++
      if (e.player?.sgTotal != null) tierMap[tier].sgTotals.push(e.player.sgTotal)
      if (tierMap[tier].names.length < 3) tierMap[tier].names.push(e.player?.name?.split(' ').pop())
    }
    const tiers = Object.entries(tierMap)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([tier, data]) => ({
        tier: Number(tier),
        count: data.count,
        avgSg: avg(data.sgTotals),
        names: data.names,
      }))

    // SG averages
    const sgAvg = {}
    for (const [key, vals] of Object.entries(sgFields)) {
      sgAvg[key] = avg(vals)
    }

    // Strongest/weakest SG
    const sgLabels = { sgOffTee: 'Off Tee', sgApproach: 'Approach', sgPutting: 'Putting', sgAroundGreen: 'Around Green' }
    const sgEntries = Object.entries(sgLabels).map(([k, label]) => ({ key: k, label, avg: sgAvg[k] })).filter(e => e.avg != null)
    sgEntries.sort((a, b) => (b.avg || 0) - (a.avg || 0))

    return { tags, sgAvg, risers: risers.slice(0, 5), fallers: fallers.slice(0, 5), tiers, sgStrength: sgEntries[0], sgWeakness: sgEntries[sgEntries.length - 1] }
  }, [entries, isGolf])

  // ── Compare Selection ────────────────────────────────────────────────────
  const compareEntries = useMemo(() =>
    compareIds.map(id => entries.find(e => e.playerId === id)).filter(Boolean),
    [compareIds, entries]
  )

  const filteredForCompare = useMemo(() => {
    if (!searchTerm) return []
    const term = searchTerm.toLowerCase()
    return entries
      .filter(e => e.player?.name?.toLowerCase().includes(term) && !compareIds.includes(e.playerId))
      .slice(0, 8)
  }, [searchTerm, entries, compareIds])

  const addCompare = (id) => {
    if (compareIds.length < 3 && !compareIds.includes(id)) {
      setCompareIds(prev => [...prev, id])
    }
    setSearchTerm('')
  }

  const removeCompare = (id) => setCompareIds(prev => prev.filter(x => x !== id))

  const maxSg = useMemo(() => {
    const vals = entries.map(e => Math.abs(e.player?.sgTotal || 0)).filter(Boolean)
    return Math.max(...vals, 1)
  }, [entries])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Board Summary */}
      <div className="p-4 border-b border-[var(--card-border)]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary/50 mb-3">Board Insights</h3>

        {/* Tag Distribution */}
        <div className="mb-4">
          <p className="text-[10px] text-text-primary/30 uppercase tracking-wider mb-1.5">Tag Distribution</p>
          <div className="flex gap-1.5">
            {[
              { key: 'target', label: 'TGT', count: stats.tags.target, color: 'bg-emerald-500', text: 'text-emerald-400' },
              { key: 'sleeper', label: 'SLP', count: stats.tags.sleeper, color: 'bg-gold', text: 'text-gold' },
              { key: 'avoid', label: 'AVD', count: stats.tags.avoid, color: 'bg-red-500', text: 'text-red-400' },
              { key: 'untagged', label: 'None', count: stats.tags.untagged, color: 'bg-[var(--stone)]', text: 'text-text-primary/30' },
            ].map(t => (
              <div key={t.key} className="flex-1 text-center">
                <div className="h-1.5 rounded-full bg-[var(--bg-alt)] overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full ${t.color}`}
                    style={{ width: `${entries.length > 0 ? (t.count / entries.length) * 100 : 0}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold ${t.text}`}>{t.count}</span>
                <span className="text-[8px] text-text-primary/20 ml-0.5">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Board SG Profile */}
        {isGolf && stats.sgAvg.sgTotal != null && (
          <div className="mb-4">
            <p className="text-[10px] text-text-primary/30 uppercase tracking-wider mb-1.5">Board SG Profile (avg)</p>
            <div className="space-y-1">
              <StatBar label="OTT" value={stats.sgAvg.sgOffTee} max={maxSg} color="bg-sky-500" />
              <StatBar label="APP" value={stats.sgAvg.sgApproach} max={maxSg} color="bg-violet-500" />
              <StatBar label="ATG" value={stats.sgAvg.sgAroundGreen} max={maxSg} color="bg-amber-500" />
              <StatBar label="Putt" value={stats.sgAvg.sgPutting} max={maxSg} color="bg-emerald-500" />
            </div>
            {stats.sgStrength && stats.sgWeakness && stats.sgStrength.key !== stats.sgWeakness.key && (
              <div className="flex gap-3 mt-2">
                <div className="flex-1 px-2 py-1.5 rounded bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[8px] text-emerald-500/50 uppercase">Strongest</p>
                  <p className="text-[11px] text-emerald-400 font-semibold">{stats.sgStrength.label}</p>
                </div>
                <div className="flex-1 px-2 py-1.5 rounded bg-red-500/5 border border-red-500/10">
                  <p className="text-[8px] text-red-500/50 uppercase">Weakest</p>
                  <p className="text-[11px] text-red-400 font-semibold">{stats.sgWeakness.label}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tier Breakdown */}
        {stats.tiers.length > 1 && isGolf && (
          <div className="mb-4">
            <p className="text-[10px] text-text-primary/30 uppercase tracking-wider mb-1.5">Tier Breakdown</p>
            <div className="space-y-1">
              {stats.tiers.map(t => (
                <div key={t.tier} className="flex items-center gap-2">
                  <span className="text-[9px] text-gold/60 font-bold w-10 shrink-0">Tier {t.tier}</span>
                  <span className="text-[9px] text-text-primary/30 w-5 text-center">{t.count}</span>
                  {t.avgSg != null && (
                    <span className={`text-[9px] font-mono ${sgColor(t.avgSg)}`}>
                      SG {t.avgSg > 0 ? '+' : ''}{t.avgSg.toFixed(2)}
                    </span>
                  )}
                  <span className="text-[8px] text-text-primary/15 truncate flex-1">{t.names.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Risers & Fallers */}
        {(stats.risers.length > 0 || stats.fallers.length > 0) && (
          <div>
            <p className="text-[10px] text-text-primary/30 uppercase tracking-wider mb-1.5">Biggest Moves vs Baseline</p>
            <div className="space-y-0.5">
              {stats.risers.slice(0, 3).map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-emerald-400 font-mono font-bold w-8">{'\u2191'}{r.delta}</span>
                  <span className="text-text-primary/60 truncate">{r.name}</span>
                  <span className="text-text-primary/20 ml-auto shrink-0">#{r.rank}</span>
                </div>
              ))}
              {stats.fallers.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-red-400 font-mono font-bold w-8">{'\u2193'}{Math.abs(f.delta)}</span>
                  <span className="text-text-primary/60 truncate">{f.name}</span>
                  <span className="text-text-primary/20 ml-auto shrink-0">#{f.rank}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Player Compare Tool */}
      <div className="p-4 flex-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary/50 mb-3">Compare Players</h3>

        {/* Selected players */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {compareEntries.map(e => (
            <div key={e.playerId} className="flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 border border-gold/20">
              {e.player?.headshotUrl && (
                <img src={e.player.headshotUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
              )}
              <span className="text-[10px] text-gold font-medium">{e.player?.name?.split(' ').pop()}</span>
              <button onClick={() => removeCompare(e.playerId)} className="text-gold/40 hover:text-gold ml-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {compareIds.length < 3 && (
            <div className="relative flex-1 min-w-[120px]">
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={compareIds.length === 0 ? 'Search to add players...' : 'Add another...'}
                className="w-full px-2 py-1 text-[11px] bg-[var(--bg-alt)] border border-[var(--card-border)] rounded-lg text-text-primary placeholder-text-muted/40 outline-none focus:border-gold/40"
              />
              {filteredForCompare.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                  {filteredForCompare.map(e => (
                    <button
                      key={e.playerId}
                      onClick={() => addCompare(e.playerId)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--surface-alt)] transition-colors text-left"
                    >
                      {e.player?.headshotUrl && (
                        <img src={e.player.headshotUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                      )}
                      <span className="text-[11px] text-text-primary truncate">{e.player?.name}</span>
                      <span className="text-[9px] text-text-primary/20 ml-auto">#{entries.indexOf(e) + 1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comparison */}
        {compareEntries.length >= 2 && isGolf && (
          <div className="space-y-3 mt-3">
            <CompareBar label="SG Total" players={compareEntries} statKey="sgTotal" />
            <CompareBar label="Off the Tee" players={compareEntries} statKey="sgOffTee" />
            <CompareBar label="Approach" players={compareEntries} statKey="sgApproach" />
            <CompareBar label="Putting" players={compareEntries} statKey="sgPutting" />
            <CompareBar label="Around Green" players={compareEntries} statKey="sgAroundGreen" />

            {/* Summary */}
            <div className="pt-2 border-t border-[var(--card-border)]">
              <p className="text-[9px] text-text-primary/25 uppercase tracking-wider mb-1.5">Categories Won</p>
              <div className="flex gap-2">
                {compareEntries.map(e => {
                  const keys = ['sgTotal', 'sgOffTee', 'sgApproach', 'sgPutting', 'sgAroundGreen']
                  let wins = 0
                  for (const k of keys) {
                    const vals = compareEntries.map(c => c.player?.[k] ?? -999)
                    const best = Math.max(...vals)
                    if ((e.player?.[k] ?? -999) === best) wins++
                  }
                  return (
                    <div key={e.playerId} className="flex-1 text-center">
                      <p className="text-lg font-bold text-gold font-mono">{wins}</p>
                      <p className="text-[9px] text-text-primary/30 truncate">{e.player?.name?.split(' ').pop()}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {compareEntries.length < 2 && (
          <p className="text-[10px] text-text-primary/20 mt-2">
            Select 2-3 players from your board to compare their SG profiles side by side.
          </p>
        )}
      </div>
    </div>
  )
}
