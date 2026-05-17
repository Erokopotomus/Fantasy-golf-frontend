import { useEffect, useState } from 'react'
import Card from '../common/Card'
import { CHOPPED_VOCAB } from '../../lib/chopped/vocabulary'
import api from '../../services/api'

/**
 * Chopped-format standings variant.
 *
 * Hides W-L (irrelevant for elimination format). Shows a Status column:
 *   - Alive teams       → green "Alive"
 *   - Eliminated teams  → muted "Chopped Wk N"
 *   - Champion          → gold "🏆 Champion" + left border highlight
 *
 * Sort order:
 *   - Alive teams first, ordered by current Safe % rank (falls back to points)
 *   - Eliminated teams after, ordered by finalRank ascending (so the
 *     runner-up sits just below the champion / last alive team chopped
 *     appears first among eliminated). Tasks spec says "finalRank
 *     descending" but finalRank=1 is the champion, so visually we want
 *     ascending so the champion is at the top.
 */
const ChoppedStandings = ({ standings = [], leagueId, currentWeek, currentUserId }) => {
  const [safePctMap, setSafePctMap] = useState({})

  useEffect(() => {
    if (!leagueId || !currentWeek) return
    let cancelled = false
    async function load() {
      try {
        const res = await api.getChoppedSafePercents(leagueId, { week: currentWeek, mode: 'live' })
        if (cancelled) return
        const map = {}
        for (const r of res?.results || []) {
          map[r.teamId] = { safePct: r.safePct, rank: r.rank }
        }
        setSafePctMap(map)
      } catch (err) {
        // Non-fatal — we'll just fall back to totalPoints sort
        console.error('[ChoppedStandings] safePct fetch failed', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [leagueId, currentWeek])

  if (!standings.length) {
    return (
      <Card>
        <div className="text-center py-8 text-text-muted">
          No standings data available
        </div>
      </Card>
    )
  }

  const alive = standings.filter(t => !t.eliminatedAt)
  const eliminated = standings.filter(t => t.eliminatedAt)
  const seasonComplete = alive.length === 0 || alive.length === 1
  // Champion = the only alive team OR an eliminated team with finalRank=1
  const champion = standings.find(t =>
    t.finalRank === 1 && (seasonComplete || !t.eliminatedAt)
  )

  // Sort alive: by Safe % rank if we have data, else by points desc
  const sortedAlive = [...alive].sort((a, b) => {
    const ra = safePctMap[a.id ?? a.teamId]?.rank
    const rb = safePctMap[b.id ?? b.teamId]?.rank
    if (ra != null && rb != null) return ra - rb
    return (b.totalPoints || 0) - (a.totalPoints || 0)
  })

  // Sort eliminated: by finalRank ascending (1 = champion at top, larger = chopped earlier)
  const sortedEliminated = [...eliminated].sort((a, b) =>
    (a.finalRank || 999) - (b.finalRank || 999)
  )

  const rows = [...sortedAlive, ...sortedEliminated]

  return (
    <Card padding="none">
      <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
        <h3 className="text-lg font-semibold font-display text-text-primary">
          {CHOPPED_VOCAB.pageTitle} Standings
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-field" />
            <span className="text-text-muted">{alive.length} {CHOPPED_VOCAB.activeTeams}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-live-red" />
            <span className="text-text-muted">{eliminated.length} {CHOPPED_VOCAB.eliminatedTeams}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--surface)]">
            <tr className="text-xs text-text-muted">
              <th className="p-3 text-center w-16">Rank</th>
              <th className="p-3 text-left">Team</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Points</th>
              <th className="p-3 text-right hidden sm:table-cell">Safe %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((team) => {
              const isCurrentUser = team.userId === currentUserId
              const isEliminated = !!team.eliminatedAt
              const isChampion = champion && team.id === champion.id && seasonComplete
              const safePct = safePctMap[team.id]?.safePct

              return (
                <tr
                  key={team.id}
                  className={`
                    border-b border-[var(--card-border)] transition-colors
                    ${isChampion ? 'border-l-4 border-l-crown bg-crown/10' : ''}
                    ${isEliminated && !isChampion ? 'opacity-60' : ''}
                    ${isCurrentUser && !isChampion ? 'bg-field/10' : ''}
                    ${!isCurrentUser && !isChampion ? 'hover:bg-[var(--surface-alt)]' : ''}
                  `}
                >
                  <td className="p-3 text-center">
                    <span className={`font-mono font-bold text-sm ${
                      isChampion ? 'text-crown' : isEliminated ? 'text-text-muted' : 'text-text-secondary'
                    }`}>
                      {isEliminated ? (team.finalRank ? `#${team.finalRank}` : '-') :
                        safePctMap[team.id]?.rank ? `#${safePctMap[team.id].rank}` : '-'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center text-lg overflow-hidden">
                        {team.avatar && (team.avatar.startsWith('http') || team.avatar.startsWith('data:')) ? (
                          <img src={team.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          team.avatar || '⛳'
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${
                          isChampion ? 'text-crown font-bold' :
                          isEliminated ? 'text-text-muted' :
                          isCurrentUser ? 'text-field' : 'text-text-primary'
                        }`}>
                          {team.name}
                        </p>
                        <p className="text-xs text-text-muted">{team.ownerName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {isChampion ? (
                      <span className="text-crown font-bold font-mono text-sm">
                        {CHOPPED_VOCAB.statusChampion}
                      </span>
                    ) : isEliminated ? (
                      <span className="text-text-muted font-mono text-xs">
                        {CHOPPED_VOCAB.statusChopped} Wk {team.eliminationWeek ?? '?'}
                      </span>
                    ) : (
                      <span className="text-field font-mono text-xs">
                        {CHOPPED_VOCAB.statusAlive}
                      </span>
                    )}
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${
                    isEliminated ? 'text-text-muted' : 'text-text-primary'
                  }`}>
                    {(team.totalPoints || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-text-secondary hidden sm:table-cell">
                    {isEliminated ? '-' : (safePct != null ? `${(safePct * 100).toFixed(0)}%` : '-')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default ChoppedStandings
