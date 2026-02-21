import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function NflSchedule() {
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [byWeek, setByWeek] = useState({})
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState(2025)
  const [selectedWeek, setSelectedWeek] = useState(null)
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const opts = { season }
        if (selectedWeek) opts.week = selectedWeek
        const data = await api.getNflSchedule(opts)
        setGames(data.games || [])
        setByWeek(data.byWeek || {})
      } catch (err) {
        console.error('Failed to load NFL schedule:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [season, selectedWeek])

  // Show selected week games, or all weeks grouped
  const weekToShow = selectedWeek ? [selectedWeek] : Object.keys(byWeek).map(Number).sort((a, b) => a - b)

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
      <button onClick={() => navigate(-1)} className="text-text-primary/40 hover:text-text-primary/60 text-sm mb-4 inline-flex items-center gap-1">
        &larr; Back
      </button>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{'\uD83C\uDFC8'}</span>
        <h1 className="text-2xl font-display font-bold text-text-primary">NFL Schedule</h1>
        <span className="text-text-primary/30 font-mono text-sm ml-auto">{season} Season</span>
      </div>

      {/* Week selector */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedWeek(null)}
          className={`px-3 py-1.5 rounded-md text-sm font-mono font-bold whitespace-nowrap transition-colors ${
            !selectedWeek ? 'bg-gold/20 text-gold' : 'text-text-primary/40 hover:text-text-primary/60 bg-dark-tertiary/5'
          }`}
        >
          All
        </button>
        {weeks.map(w => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className={`px-3 py-1.5 rounded-md text-sm font-mono font-bold whitespace-nowrap transition-colors ${
              selectedWeek === w ? 'bg-gold/20 text-gold' : 'text-text-primary/40 hover:text-text-primary/60 bg-dark-tertiary/5'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-primary/30">Loading schedule...</div>
      ) : (
        weekToShow.map(week => {
          const weekGames = byWeek[week] || []
          if (weekGames.length === 0) return null

          return (
            <div key={week} className="mb-8">
              <h2 className="text-lg font-display font-bold text-text-primary/60 mb-3">Week {week}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {weekGames.map(game => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </div>
          )
        })
      )}

      {!loading && games.length === 0 && (
        <div className="text-center py-20 text-text-primary/30">No games found for this season</div>
      )}
    </div>
  )
}

function GameCard({ game }) {
  const isFinal = game.status === 'FINAL'
  const kickoff = game.kickoff ? new Date(game.kickoff) : null
  const homeWon = isFinal && game.homeScore > game.awayScore
  const awayWon = isFinal && game.awayScore > game.homeScore

  return (
    <div className="bg-dark-tertiary/5 backdrop-blur-sm border border-stone/30 rounded-xl p-4 hover:border-stone/50 transition-colors">
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-mono font-bold uppercase ${
          isFinal ? 'text-text-primary/30' : game.status === 'IN_PROGRESS' ? 'text-green-400' : 'text-text-primary/40'
        }`}>
          {isFinal ? 'Final' : game.status === 'IN_PROGRESS' ? 'Live' : kickoff ? kickoff.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
        </span>
        {game.venue && (
          <span className="text-text-primary/20 text-xs truncate ml-2">{game.venue}</span>
        )}
      </div>

      {/* Away team */}
      <div className={`flex items-center justify-between py-2 ${awayWon ? 'text-text-primary' : 'text-text-primary/60'}`}>
        <Link to={`/nfl/teams/${game.awayTeam?.abbreviation}`} className="flex items-center gap-2 hover:text-gold transition-colors">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-text-primary"
            style={{ backgroundColor: game.awayTeam?.primaryColor || '#333' }}
          >
            {game.awayTeam?.abbreviation?.slice(0, 2)}
          </span>
          <span className="font-medium text-sm">{game.awayTeam?.name}</span>
        </Link>
        {isFinal && (
          <span className={`font-mono font-bold text-lg ${awayWon ? 'text-text-primary' : 'text-text-primary/40'}`}>
            {game.awayScore}
          </span>
        )}
      </div>

      {/* Home team */}
      <div className={`flex items-center justify-between py-2 ${homeWon ? 'text-text-primary' : 'text-text-primary/60'}`}>
        <Link to={`/nfl/teams/${game.homeTeam?.abbreviation}`} className="flex items-center gap-2 hover:text-gold transition-colors">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-text-primary"
            style={{ backgroundColor: game.homeTeam?.primaryColor || '#333' }}
          >
            {game.homeTeam?.abbreviation?.slice(0, 2)}
          </span>
          <span className="font-medium text-sm">{game.homeTeam?.name}</span>
        </Link>
        {isFinal && (
          <span className={`font-mono font-bold text-lg ${homeWon ? 'text-text-primary' : 'text-text-primary/40'}`}>
            {game.homeScore}
          </span>
        )}
      </div>

      {/* Lines */}
      {(game.spreadLine || game.totalLine) && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-stone/20">
          {game.spreadLine != null && (
            <span className="text-text-primary/20 text-xs font-mono">
              Spread: {game.spreadLine > 0 ? '+' : ''}{game.spreadLine}
            </span>
          )}
          {game.totalLine != null && (
            <span className="text-text-primary/20 text-xs font-mono">
              O/U: {game.totalLine}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
