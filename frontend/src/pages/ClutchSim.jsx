import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Card from '../components/common/Card'

const CONFIDENCE_COLORS = {
  HIGH: 'text-emerald-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-orange-400',
}

const ClutchSim = () => {
  const [sport, setSport] = useState('nfl')
  const [searchQuery1, setSearchQuery1] = useState('')
  const [searchQuery2, setSearchQuery2] = useState('')
  const [searchResults1, setSearchResults1] = useState([])
  const [searchResults2, setSearchResults2] = useState([])
  const [player1, setPlayer1] = useState(null)
  const [player2, setPlayer2] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Player search
  const searchPlayers = useCallback(async (query, setResults) => {
    if (!query || query.length < 2) { setResults([]); return }
    try {
      const res = await api.request(`/search?q=${encodeURIComponent(query)}&type=players&limit=8`)
      setResults(res.players || [])
    } catch { setResults([]) }
  }, [sport])

  useEffect(() => {
    const t = setTimeout(() => searchPlayers(searchQuery1, setSearchResults1), 300)
    return () => clearTimeout(t)
  }, [searchQuery1, searchPlayers])

  useEffect(() => {
    const t = setTimeout(() => searchPlayers(searchQuery2, setSearchResults2), 300)
    return () => clearTimeout(t)
  }, [searchQuery2, searchPlayers])

  const selectPlayer = (player, slot) => {
    if (slot === 1) {
      setPlayer1(player)
      setSearchQuery1('')
      setSearchResults1([])
    } else {
      setPlayer2(player)
      setSearchQuery2('')
      setSearchResults2([])
    }
    setResult(null)
  }

  const simulate = async () => {
    if (!player1 || !player2) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.simulateMatchup(player1.id, player2.id, sport)
      setResult(res.result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setPlayer1(null)
    setPlayer2(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-text-primary">Clutch Sim</h1>
            <p className="text-xs text-text-primary/30">AI-powered head-to-head matchup simulator</p>
          </div>
        </div>

        {/* Sport Toggle */}
        <div className="mt-4 flex gap-2">
          {['nfl', 'golf'].map(s => (
            <button
              key={s}
              onClick={() => { setSport(s); reset() }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sport === s ? 'bg-gold text-slate' : 'bg-dark-tertiary/[0.06] text-text-primary/50 hover:text-text-primary/80'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Player Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Player 1 */}
        <Card>
          <h3 className="text-xs font-semibold text-text-primary/40 uppercase tracking-wider mb-2">Player 1</h3>
          {player1 ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary font-semibold">{player1.name}</p>
                <p className="text-xs text-text-primary/40">{player1.nflPosition || ''} {player1.nflTeam || ''}</p>
              </div>
              <button onClick={() => { setPlayer1(null); setResult(null) }} className="text-text-primary/30 hover:text-text-primary/60 text-xs">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={searchQuery1}
                onChange={e => setSearchQuery1(e.target.value)}
                placeholder="Search player..."
                className="w-full bg-dark-tertiary/[0.06] border border-stone/30 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
              />
              {searchResults1.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-dark-card border border-stone/30 rounded-lg overflow-hidden shadow-lg max-h-48 overflow-y-auto">
                  {searchResults1.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPlayer(p, 1)}
                      className="w-full text-left px-3 py-2 text-sm text-text-primary/70 hover:bg-dark-tertiary/[0.06] transition-colors"
                    >
                      {p.name} <span className="text-text-primary/30">{p.nflPosition || ''} {p.nflTeam || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Player 2 */}
        <Card>
          <h3 className="text-xs font-semibold text-text-primary/40 uppercase tracking-wider mb-2">Player 2</h3>
          {player2 ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary font-semibold">{player2.name}</p>
                <p className="text-xs text-text-primary/40">{player2.nflPosition || ''} {player2.nflTeam || ''}</p>
              </div>
              <button onClick={() => { setPlayer2(null); setResult(null) }} className="text-text-primary/30 hover:text-text-primary/60 text-xs">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={searchQuery2}
                onChange={e => setSearchQuery2(e.target.value)}
                placeholder="Search player..."
                className="w-full bg-dark-tertiary/[0.06] border border-stone/30 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
              />
              {searchResults2.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-dark-card border border-stone/30 rounded-lg overflow-hidden shadow-lg max-h-48 overflow-y-auto">
                  {searchResults2.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPlayer(p, 2)}
                      className="w-full text-left px-3 py-2 text-sm text-text-primary/70 hover:bg-dark-tertiary/[0.06] transition-colors"
                    >
                      {p.name} <span className="text-text-primary/30">{p.nflPosition || ''} {p.nflTeam || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* VS + Simulate Button */}
      {player1 && player2 && !result && (
        <div className="text-center mb-6">
          <p className="text-text-primary/30 text-lg font-display mb-3">
            {player1.name} <span className="text-gold">vs</span> {player2.name}
          </p>
          <button
            onClick={simulate}
            disabled={loading}
            className="px-8 py-3 bg-gold text-slate font-bold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Simulating...' : 'Simulate Matchup'}
          </button>
        </div>
      )}

      {error && (
        <Card className="mb-6 border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Winner Card */}
          <Card className="bg-gradient-to-r from-gold/10 to-blue-500/10 border-gold/20">
            <div className="text-center mb-4">
              <p className="text-xs text-text-primary/30 uppercase tracking-wider mb-1">Winner</p>
              <h2 className="text-2xl font-bold font-display text-gold">{result.winner}</h2>
              <p className={`text-xs font-semibold mt-1 ${CONFIDENCE_COLORS[result.confidence] || 'text-text-primary/50'}`}>
                {result.confidence} Confidence
              </p>
            </div>

            <p className="text-sm text-text-primary/60 leading-relaxed text-center mb-4">
              {result.analysis}
            </p>

            {result.edge && (
              <div className="text-center">
                <p className="text-xs text-gold/80 italic">{result.edge}</p>
              </div>
            )}
          </Card>

          {/* Key Factors */}
          {result.keyFactors?.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-text-primary/70 mb-3">Key Factors</h3>
              <div className="space-y-2">
                {result.keyFactors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-gold text-xs mt-0.5">{i + 1}.</span>
                    <p className="text-sm text-text-primary/60">{factor}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Personal Note */}
          {result.personalNote && (
            <Card className="bg-purple-500/5 border-purple-400/20">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm text-text-primary/60">{result.personalNote}</p>
              </div>
            </Card>
          )}

          {/* Simulate Again */}
          <div className="text-center pt-2">
            <button
              onClick={reset}
              className="text-gold text-sm font-semibold hover:text-gold/80"
            >
              Simulate Another Matchup &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link to="/lab" className="text-gold text-sm hover:text-gold/80">&larr; Back to The Lab</Link>
      </div>
    </div>
  )
}

export default ClutchSim
